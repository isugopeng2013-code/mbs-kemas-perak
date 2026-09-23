/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ReportForm } from './components/ReportForm';
import { ReportTable } from './components/ReportTable';
import { AdminPortal } from './components/AdminPortal';
import { MasterAdminPortal } from './components/MasterAdminPortal';
import { GoogleDrivePortal } from './components/GoogleDrivePortal';
import { MBSReport, MasterKawasanRecord, TabType, RegionLockSettings, SystemSettings, DEFAULT_SYSTEM_SETTINGS, UserRole, UserSession } from './types';
import { INITIAL_REPORTS } from './data/mockData';
import { 
  loadMasterKawasanFromStorage, 
  saveMasterKawasanToStorage, 
  resetMasterKawasanToDefault,
  deriveParlimenDunList, 
  deriveDunDmMapping, 
  deriveLocalityData,
  loadRegionLockSettings,
  saveRegionLockSettings
} from './utils/masterDataManager';
import { Info, Lock, Eye, EyeOff, ShieldAlert, User, ShieldCheck, Database, KeyRound, Sparkles, HelpCircle, PhoneCall, Mail, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { 
  fetchLaporanMbs, 
  subscribeToLaporanMbs, 
  isSupabaseConfigured,
  updateReportInSupabase,
  deleteReportFromSupabase,
  fetchMasterKawasan,
  subscribeToMasterKawasan,
  addMasterRecordToSupabase,
  updateMasterRecordInSupabase,
  deleteMasterRecordFromSupabase,
  uploadMasterKawasanToSupabase,
  fetchSystemSettings,
  saveSystemSettings,
  subscribeToSystemSettings,
  recordAuditLog,
  submitPasswordResetRequest
} from './lib/supabaseClient';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [reports, setReports] = useState<MBSReport[]>([]);
  const [masterRecords, setMasterRecords] = useState<MasterKawasanRecord[]>(() => {
    return loadMasterKawasanFromStorage();
  });
  
  // Global system settings (Password, Title, Subtitle, Region Lock) persisted to Supabase
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const localLock = loadRegionLockSettings();
    return {
      ...DEFAULT_SYSTEM_SETTINGS,
      defaultParlimen: localLock.defaultParlimen || DEFAULT_SYSTEM_SETTINGS.defaultParlimen,
      isLocked: localLock.isLocked !== undefined ? localLock.isLocked : DEFAULT_SYSTEM_SETTINGS.isLocked
    };
  });

  // Region lock settings for locking MBS Form to specific Parlimen (synced with systemSettings)
  const [regionLockSettings, setRegionLockSettings] = useState<RegionLockSettings>(() => {
    return {
      defaultParlimen: systemSettings.defaultParlimen,
      isLocked: systemSettings.isLocked
    };
  });

  const handleSaveSystemSettings = async (newSettings: SystemSettings): Promise<{ success: boolean; message: string }> => {
    setSystemSettings(newSettings);
    setRegionLockSettings({
      defaultParlimen: newSettings.defaultParlimen,
      isLocked: newSettings.isLocked
    });
    
    // Save to local storage as fallback
    saveRegionLockSettings({
      defaultParlimen: newSettings.defaultParlimen,
      isLocked: newSettings.isLocked
    });

    if (isSupabaseConfigured) {
      const res = await saveSystemSettings(newSettings);
      if (res.error) {
        return { 
          success: false, 
          message: `Ralat menyimpan ke Supabase: ${res.error.message || 'Sila semak sambungan'}` 
        };
      }
      return { 
        success: true, 
        message: 'Tetapan sistem berjaya disimpan ke Supabase Cloud secara global.' 
      };
    }
    return { 
      success: true, 
      message: 'Tetapan disimpan secara tempatan (Supabase belum disambung).' 
    };
  };

  const handleSaveRegionLockSettings = (newSettings: RegionLockSettings) => {
    setRegionLockSettings(newSettings);
    saveRegionLockSettings(newSettings);
    const updated: SystemSettings = {
      ...systemSettings,
      defaultParlimen: newSettings.defaultParlimen,
      isLocked: newSettings.isLocked,
      updatedAt: new Date().toISOString()
    };
    setSystemSettings(updated);
    if (isSupabaseConfigured) {
      saveSystemSettings(updated).catch(err => console.warn('[Supabase Auto-Sync Settings Error]:', err));
    }
  };
  
  // Memoized dynamic master data mappings
  const dynamicParlimenDunList = React.useMemo(() => {
    return deriveParlimenDunList(masterRecords);
  }, [masterRecords]);

  const dynamicDunDmMapping = React.useMemo(() => {
    return deriveDunDmMapping(masterRecords);
  }, [masterRecords]);

  const dynamicLocalityData = React.useMemo(() => {
    return deriveLocalityData(masterRecords);
  }, [masterRecords]);

  // Unique Parlimen list derived dynamically from masterRecords
  const uniqueParlimens = React.useMemo(() => {
    const set = new Set<string>();
    masterRecords.forEach(r => {
      if (r.parlimen && r.parlimen.trim()) {
        set.add(r.parlimen.trim());
      }
    });
    if (set.size === 0) {
      set.add(systemSettings?.defaultParlimen || 'P.071 GOPENG');
    }
    return Array.from(set).sort();
  }, [masterRecords, systemSettings?.defaultParlimen]);

  // RBAC Authentication State
  const [currentUserSession, setCurrentUserSession] = useState<UserSession | null>(() => {
    const isAuth = sessionStorage.getItem('mbs_authenticated') === 'true';
    const savedRole = sessionStorage.getItem('mbs_role') as UserRole | null;
    const savedParlimen = sessionStorage.getItem('mbs_parlimen') || undefined;
    if (isAuth && savedRole) {
      return {
        role: savedRole,
        parlimen: savedParlimen,
        loginTime: new Date().toISOString()
      };
    }
    if (isAuth) {
      return {
        role: 'user',
        parlimen: 'P.071 GOPENG',
        loginTime: new Date().toISOString()
      };
    }
    return null;
  });

  const isAuthenticated = Boolean(currentUserSession);

  // Login Screen State
  const [loginRole, setLoginRole] = useState<UserRole>('user');
  const [selectedLoginParlimen, setSelectedLoginParlimen] = useState<string>(() => {
    return systemSettings?.defaultParlimen || 'P.071 GOPENG';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isPegawaiPasswordModalOpen, setIsPegawaiPasswordModalOpen] = useState(false);

  // 'Lupa Kata Laluan' Modal State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetName, setResetName] = useState('');
  const [resetContact, setResetContact] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Auto Logout / Session Timeout (20 minit tidak aktif)
  const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
  const lastActivityRef = useRef<number>(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Update last activity timestamp on user interaction
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (showSessionWarning) setShowSessionWarning(false);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Interval checker for inactivity
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      // Show warning at 18 minutes
      if (elapsed > 18 * 60 * 1000 && elapsed < SESSION_TIMEOUT_MS) {
        setShowSessionWarning(true);
      }
      // Timeout reached: logout
      if (elapsed >= SESSION_TIMEOUT_MS) {
        if (currentUserSession) {
          recordAuditLog({
            peranan: currentUserSession.role,
            pengguna: currentUserSession.role === 'master_admin' ? 'Master Admin' : currentUserSession.role === 'pegawai' ? `Pegawai (${currentUserSession.parlimen})` : `Pengguna Awam (${currentUserSession.parlimen})`,
            parlimen: currentUserSession.parlimen,
            tindakan: 'LOG_KELUAR',
            huraian: 'Sesi tamat tempoh secara automatik akibat tiada aktiviti selama 20 minit (Auto Logout)'
          });
        }
        handleLogout();
        setShowSessionWarning(false);
      }
    }, 15000);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserActivity));
      clearInterval(intervalId);
    };
  }, [isAuthenticated, currentUserSession]);

  // Sync selected login parlimen when list updates
  useEffect(() => {
    if (uniqueParlimens.length > 0 && !uniqueParlimens.includes(selectedLoginParlimen)) {
      setSelectedLoginParlimen(systemSettings?.defaultParlimen || uniqueParlimens[0]);
    }
  }, [uniqueParlimens, systemSettings?.defaultParlimen]);

  // Strict route protection: guard tabs according to current authenticated role
  useEffect(() => {
    if (currentUserSession) {
      if (currentUserSession.role === 'user') {
        if (currentTab !== 'dashboard' && currentTab !== 'form') {
          setCurrentTab('dashboard');
        }
      } else if (currentUserSession.role === 'pegawai') {
        if (currentTab === 'master-admin' || currentTab === 'drive') {
          setCurrentTab('dashboard');
        }
      }
    }
  }, [currentUserSession, currentTab]);

  // Load reports from Local Storage on startup
  useEffect(() => {
    const saved = localStorage.getItem('mbs_reports_data');
    if (saved) {
      try {
        const parsed: MBSReport[] = JSON.parse(saved);
        // Automatic upgrade & alignment migration for any previously cached initial reports
        const upgraded = parsed.map(item => {
          const matchedInit = INITIAL_REPORTS.find(init => init.id === item.id);
          if (matchedInit && (!item.pernyataanMbs.includes("•") || item.pernyataanMbs.startsWith("Kesesakan lalu lintas") || item.id === "mbs-official-1" || item.id === "mbs-4")) {
            return {
              ...item,
              pernyataanMbs: matchedInit.pernyataanMbs,
              tarikhAduan: matchedInit.tarikhAduan || item.tarikhAduan,
              syor: (item.syor === "Cadangan pemasangan sistem solar sandaran diserahkan kepada pihak JKR Kampar untuk kelulusan peruntukan segera.")
                || !item.syor ? matchedInit.syor : item.syor
            };
          }
          return item;
        });
        setReports(upgraded);
        localStorage.setItem('mbs_reports_data', JSON.stringify(upgraded));
      } catch (err) {
        console.error("Failed to parse saved reports:", err);
        setReports(INITIAL_REPORTS);
        localStorage.setItem('mbs_reports_data', JSON.stringify(INITIAL_REPORTS));
      }
    } else {
      setReports(INITIAL_REPORTS);
      localStorage.setItem('mbs_reports_data', JSON.stringify(INITIAL_REPORTS));
    }

    // Sync from Supabase table 'laporan_mbs' & 'master_kawasan' if configured
    if (isSupabaseConfigured) {
      // 1. Initial fetch for reports directly from Supabase (single source of truth)
      fetchLaporanMbs().then(({ data, error }) => {
        if (!error && data) {
          console.log(`[Supabase Initial Sync]: ${data.length} rekod laporan diterima.`);
          setReports(data);
          try {
            localStorage.setItem('mbs_reports_data', JSON.stringify(data));
          } catch (_) {}
        }
      });

      // 2. Realtime subscription for reports
      const unsubscribeReports = subscribeToLaporanMbs(() => {
        fetchLaporanMbs().then(({ data, error }) => {
          if (!error && data) {
            setReports(data);
            try {
              localStorage.setItem('mbs_reports_data', JSON.stringify(data));
            } catch (_) {}
          }
        });
      });

      // 3. Initial fetch for master kawasan
      fetchMasterKawasan().then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          console.log(`[Supabase Master Initial Sync]: ${data.length} rekod kawasan diterima.`);
          setMasterRecords(data);
          saveMasterKawasanToStorage(data);
        }
      });

      // 4. Realtime subscription for master kawasan
      const unsubscribeMaster = subscribeToMasterKawasan(() => {
        fetchMasterKawasan().then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setMasterRecords(data);
            saveMasterKawasanToStorage(data);
          }
        });
      });

      // 5. Initial fetch for global system settings (Password, Title, Region Lock) from Supabase
      fetchSystemSettings().then(({ data, error }) => {
        if (!error && data) {
          console.log('[Supabase Settings Initial Sync]: Tetapan global diterima:', data);
          setSystemSettings(data);
          setRegionLockSettings({
            defaultParlimen: data.defaultParlimen || 'P.071 GOPENG',
            isLocked: Boolean(data.isLocked)
          });
        }
      });

      // 6. Realtime subscription for global system settings
      const unsubscribeSettings = subscribeToSystemSettings((newSettings: SystemSettings) => {
        console.log('[Supabase Settings Realtime Sync Triggered]:', newSettings);
        if (newSettings) {
          setSystemSettings(newSettings);
          setRegionLockSettings({
            defaultParlimen: newSettings.defaultParlimen || 'P.071 GOPENG',
            isLocked: Boolean(newSettings.isLocked)
          });
        }
      });

      return () => {
        unsubscribeReports();
        unsubscribeMaster();
        unsubscribeSettings();
      };
    }
  }, []);

  // Update State & Local Storage helper
  const updateReportsList = (updatedList: MBSReport[]) => {
    setReports(updatedList);
    try {
      localStorage.setItem('mbs_reports_data', JSON.stringify(updatedList));
    } catch (_) {}
  };

  // Handler: Add New Report
  const handleAddReport = (newReportData: Omit<MBSReport, 'bil' | 'tarikhAduan' | 'status' | 'syor'> & Partial<MBSReport>) => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const newReport: MBSReport = {
      ...newReportData,
      id: newReportData.id || `mbs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      bil: reports.length + 1,
      tarikhAduan: newReportData.tarikhAduan || formattedDate,
      status: newReportData.status || 'Baru',
      syor: newReportData.syor || '',
      syorOleh: newReportData.syorOleh || '',
      syorTarikh: newReportData.syorTarikh || ''
    };

    const newList = [newReport, ...reports];
    // Recalculate BIL for proper sorting of reports
    const listWithRecalculatedBil = newList.map((item, idx) => ({
      ...item,
      bil: idx + 1
    }));

    updateReportsList(listWithRecalculatedBil);
  };

  // Handler: Update Syor & Status in PKD portal
  const handleEditSyor = (
    id: string, 
    syor: string, 
    status: 'Baru' | 'Dalam Tindakan' | 'Selesai', 
    syorOleh: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedList = reports.map(r => {
      if (r.id === id) {
        return {
          ...r,
          syor,
          status,
          syorOleh,
          syorTarikh: today,
          tarikhKemaskini: today
        };
      }
      return r;
    });

    updateReportsList(updatedList);

    // Persist directly to Supabase table laporan_mbs
    if (isSupabaseConfigured) {
      updateReportInSupabase(id, {
        syor,
        status,
        syorOleh,
        syorTarikh: today,
        tarikhKemaskini: today
      }).catch(err => console.warn('[Supabase Report Update]:', err));
    }
  };

  // Handler: Delete Report and Recalculate BIL
  const handleDeleteReport = (id: string) => {
    const newList = reports.filter(r => r.id !== id);
    const listWithRecalculatedBil = newList.map((item, idx) => ({
      ...item,
      bil: idx + 1
    }));
    updateReportsList(listWithRecalculatedBil);

    // Delete directly from Supabase table laporan_mbs
    if (isSupabaseConfigured) {
      deleteReportFromSupabase(id).catch(err => console.warn('[Supabase Report Delete]:', err));
    }
  };

  // Handler: Master Kawasan Actions
  const handleAddMasterRecord = (newRec: Omit<MasterKawasanRecord, 'id'>) => {
    const newRecord: MasterKawasanRecord = {
      ...newRec,
      id: `master-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };
    const updated = [newRecord, ...masterRecords];
    setMasterRecords(updated);
    saveMasterKawasanToStorage(updated);

    if (isSupabaseConfigured) {
      addMasterRecordToSupabase(newRecord).catch((err: any) => console.warn('[Supabase Master Add]:', err));
    }
  };

  const handleUpdateMasterRecord = (id: string, updatedFields: Partial<MasterKawasanRecord>) => {
    const updated = masterRecords.map(r => r.id === id ? { ...r, ...updatedFields } : r);
    setMasterRecords(updated);
    saveMasterKawasanToStorage(updated);

    if (isSupabaseConfigured) {
      updateMasterRecordInSupabase(id, updatedFields).catch((err: any) => console.warn('[Supabase Master Update]:', err));
    }
  };

  const handleDeleteMasterRecord = (id: string) => {
    const updated = masterRecords.filter(r => r.id !== id);
    setMasterRecords(updated);
    saveMasterKawasanToStorage(updated);

    if (isSupabaseConfigured) {
      deleteMasterRecordFromSupabase(id).catch((err: any) => console.warn('[Supabase Master Delete]:', err));
    }
  };

  const handleBulkImportMaster = (newRecords: Omit<MasterKawasanRecord, 'id'>[], mode: 'append' | 'replace') => {
    const formatted: MasterKawasanRecord[] = newRecords.map((r, idx) => ({
      ...r,
      id: `master-imp-${Date.now()}-${idx}`
    }));

    const updated = mode === 'replace' ? formatted : [...formatted, ...masterRecords];
    setMasterRecords(updated);
    saveMasterKawasanToStorage(updated);

    if (isSupabaseConfigured) {
      uploadMasterKawasanToSupabase(formatted, mode).catch((err: any) => console.warn('[Supabase Master Bulk]:', err));
    }
  };

  const handleResetDefaultMaster = async () => {
    const defaults = resetMasterKawasanToDefault();
    setMasterRecords(defaults);
    saveMasterKawasanToStorage(defaults);

    if (isSupabaseConfigured) {
      try {
        await uploadMasterKawasanToSupabase(defaults, 'replace');
      } catch (err: any) {
        console.warn('[Supabase Master Reset Warning]:', err);
      }
    }
  };

  // Upload/Sync All current Master records to Supabase
  const handleSyncAllMasterToSupabase = async (mode: 'upsert' | 'replace' = 'upsert') => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Kredensial Supabase belum dikonfigurasi.' };
    }
    const { data, error } = await uploadMasterKawasanToSupabase(masterRecords, mode);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: `Berjaya memuat naik ${data?.count || masterRecords.length} rekod ke jadual master_kawasan di Supabase.` };
  };

  // Pull latest records from Supabase
  const handlePullMasterFromSupabase = async () => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Kredensial Supabase belum dikonfigurasi.' };
    }
    const { data, error } = await fetchMasterKawasan();
    if (error) {
      return { success: false, message: error.message };
    }
    if (data && data.length > 0) {
      setMasterRecords(data);
      saveMasterKawasanToStorage(data);
      return { success: true, message: `Berjaya mengambil ${data.length} rekod dari Supabase.` };
    }
    return { success: false, message: 'Tiada rekod ditemui dalam jadual master_kawasan Supabase.' };
  };

  // Authenticate user against role-specific passwords from Supabase
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const inputPass = passwordInput.trim();

    if (!inputPass) {
      setAuthError('Sila masukkan kata laluan.');
      return;
    }

    if (loginRole === 'master_admin') {
      const masterPass = (systemSettings?.kataLaluanMaster || 'ADMIN123').trim();
      if (inputPass === masterPass) {
        const session: UserSession = {
          role: 'master_admin',
          loginTime: new Date().toISOString()
        };
        setCurrentUserSession(session);
        sessionStorage.setItem('mbs_authenticated', 'true');
        sessionStorage.setItem('mbs_role', 'master_admin');
        sessionStorage.removeItem('mbs_parlimen');
        setCurrentTab('dashboard');
        setPasswordInput('');
        recordAuditLog({
          peranan: 'master_admin',
          pengguna: 'Master Admin',
          tindakan: 'LOG_MASUK',
          huraian: 'Master Admin berjaya log masuk ke dalam sistem'
        });
        return;
      } else {
        setAuthError('KATA LALUAN MASTER ADMIN TIDAK SAH. SILA SEMAK SEMULA.');
        return;
      }
    }

    if (loginRole === 'pegawai') {
      const pegawaiPass = (systemSettings?.kataLaluanPegawai || 'PEGAWAI123').trim();
      const masterPass = (systemSettings?.kataLaluanMaster || 'ADMIN123').trim();

      if (inputPass === pegawaiPass || inputPass === masterPass) {
        const session: UserSession = {
          role: 'pegawai',
          parlimen: selectedLoginParlimen,
          loginTime: new Date().toISOString()
        };
        setCurrentUserSession(session);
        sessionStorage.setItem('mbs_authenticated', 'true');
        sessionStorage.setItem('mbs_role', 'pegawai');
        sessionStorage.setItem('mbs_parlimen', selectedLoginParlimen);
        setCurrentTab('dashboard');
        setPasswordInput('');
        recordAuditLog({
          peranan: 'pegawai',
          pengguna: `Pegawai Parlimen (${selectedLoginParlimen})`,
          parlimen: selectedLoginParlimen,
          tindakan: 'LOG_MASUK',
          huraian: `Pegawai Parlimen ${selectedLoginParlimen} berjaya log masuk`
        });
        return;
      } else {
        setAuthError('KATA LALUAN KHAS PEGAWAI PARLIMEN TIDAK SAH. SILA CUBA LAGI.');
        return;
      }
    }

    // Role: USER (Pengguna Awam Parlimen)
    const parlimenCustomPass = systemSettings?.parlimenPasswords?.[selectedLoginParlimen];
    const userGeneralPass = (systemSettings?.kataLaluanUser || systemSettings?.kataLaluan || 'USER123').trim();
    const pegawaiPass = (systemSettings?.kataLaluanPegawai || 'PEGAWAI123').trim();
    const masterPass = (systemSettings?.kataLaluanMaster || 'ADMIN123').trim();

    const isMatch = 
      (parlimenCustomPass && inputPass === parlimenCustomPass.trim()) ||
      inputPass === userGeneralPass ||
      inputPass === pegawaiPass ||
      inputPass === masterPass;

    if (isMatch) {
      const session: UserSession = {
        role: 'user',
        parlimen: selectedLoginParlimen,
        loginTime: new Date().toISOString()
      };
      setCurrentUserSession(session);
      sessionStorage.setItem('mbs_authenticated', 'true');
      sessionStorage.setItem('mbs_role', 'user');
      sessionStorage.setItem('mbs_parlimen', selectedLoginParlimen);
      setCurrentTab('dashboard');
      setPasswordInput('');
      recordAuditLog({
        peranan: 'user',
        pengguna: `Pengguna Awam (${selectedLoginParlimen})`,
        parlimen: selectedLoginParlimen,
        tindakan: 'LOG_MASUK',
        huraian: `Pengguna Awam bagi ${selectedLoginParlimen} berjaya log masuk`
      });
    } else {
      setAuthError(`KATA LALUAN BAGI KAWASAN ${selectedLoginParlimen} TIDAK TEPAT.`);
    }
  };

  const handleLogout = () => {
    if (currentUserSession) {
      recordAuditLog({
        peranan: currentUserSession.role,
        pengguna: currentUserSession.role === 'master_admin' ? 'Master Admin' : currentUserSession.role === 'pegawai' ? `Pegawai (${currentUserSession.parlimen})` : `Pengguna Awam (${currentUserSession.parlimen})`,
        parlimen: currentUserSession.parlimen,
        tindakan: 'LOG_KELUAR',
        huraian: `${currentUserSession.role.toUpperCase()} telah log keluar daripada sistem.`
      });
    }
    setCurrentUserSession(null);
    sessionStorage.removeItem('mbs_authenticated');
    sessionStorage.removeItem('mbs_role');
    sessionStorage.removeItem('mbs_parlimen');
    setCurrentTab('dashboard');
    setPasswordInput('');
    setAuthError('');
  };

  // Render proper child component based on active tab Selection and Role Restrictions
  const renderTabContent = () => {
    const role = currentUserSession?.role || 'user';

    switch (currentTab) {
      case 'dashboard':
        return (
          <div className="animate-fade-in">
            <Dashboard 
              reports={reports} 
              setActiveTab={setCurrentTab} 
              regionLockSettings={
                (role === 'user' || role === 'pegawai') && currentUserSession?.parlimen
                  ? { defaultParlimen: currentUserSession.parlimen, isLocked: true }
                  : regionLockSettings
              }
              systemSettings={systemSettings}
              parlimenDunList={dynamicParlimenDunList}
              masterRecords={masterRecords}
              currentRole={role}
            />
          </div>
        );
      case 'form':
        return (
          <div className="animate-fade-in bg-white p-4 sm:p-6 border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <ReportForm 
              onAddReport={handleAddReport} 
              setActiveTab={setCurrentTab}
              parlimenDunList={dynamicParlimenDunList}
              dunDmMapping={dynamicDunDmMapping}
              localityData={dynamicLocalityData}
              regionLockSettings={
                (role === 'user' || role === 'pegawai') && currentUserSession?.parlimen
                  ? { defaultParlimen: currentUserSession.parlimen, isLocked: true }
                  : regionLockSettings
              }
            />
          </div>
        );
      case 'reports':
        // Public USER cannot view Lampiran A
        if (role === 'user') {
          return null;
        }
        return (
          <div className="animate-fade-in">
            <div className="mb-4 text-left sm:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                LOG LAPORAN MAKLUM BALAS SEMASA (MBS)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-mono">
                PAPAR JADUAL PENUH, CETAK FORMAT LAMPIRAN A RASMI, ATAU EKSPORT FAIL KE MICROSOFT EXCEL.
              </p>
            </div>
            <ReportTable 
              reports={reports} 
              onEditSyor={handleEditSyor} 
              onDeleteReport={handleDeleteReport}
              userRole={currentUserSession?.role}
              userParlimen={currentUserSession?.parlimen}
            />
          </div>
        );
      case 'admin':
        // Public USER cannot access Portal PKD
        if (role === 'user') {
          return null;
        }
        return (
          <div className="animate-fade-in">
            <AdminPortal 
              reports={reports} 
              onEditSyor={handleEditSyor}
              systemSettings={systemSettings}
              parlimenList={uniqueParlimens}
              userParlimen={currentUserSession?.parlimen}
              isPasswordModalOpen={isPegawaiPasswordModalOpen}
              onClosePasswordModal={() => setIsPegawaiPasswordModalOpen(false)}
            />
          </div>
        );
      case 'master-admin':
        // Only MASTER ADMIN can access Master Admin Portal
        if (role !== 'master_admin') {
          return null;
        }
        return (
          <div className="animate-fade-in">
            <MasterAdminPortal
              masterRecords={masterRecords}
              regionLockSettings={regionLockSettings}
              systemSettings={systemSettings}
              onSaveRegionLockSettings={handleSaveRegionLockSettings}
              onSaveSystemSettings={handleSaveSystemSettings}
              onAddRecord={handleAddMasterRecord}
              onUpdateRecord={handleUpdateMasterRecord}
              onDeleteRecord={handleDeleteMasterRecord}
              onBulkImport={handleBulkImportMaster}
              onResetDefault={handleResetDefaultMaster}
              onSyncAllToSupabase={handleSyncAllMasterToSupabase}
              onPullFromSupabase={handlePullMasterFromSupabase}
            />
          </div>
        );
      case 'drive':
        // Only MASTER ADMIN can access Drive backup
        if (role !== 'master_admin') {
          return null;
        }
        return (
          <div className="animate-fade-in">
            <GoogleDrivePortal
              reports={reports}
              masterRecords={masterRecords}
              onRestoreReports={(restored) => updateReportsList(restored)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Render Role-Based Authentication Screen if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
        <div className="w-full max-w-lg bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 sm:p-8 space-y-6">
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-blue-50 border-4 border-slate-950 flex items-center justify-center text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <Lock className="w-7 h-7 stroke-[2.5]" />
            </div>
            
            <h1 className="font-mono font-black text-lg sm:text-xl tracking-tight text-slate-900 uppercase pt-2">
              {systemSettings?.tajukUtama || 'Sistem Maklum Balas Semasa (MBS)'}
            </h1>
            <p className="text-xs text-slate-600 font-mono uppercase tracking-wider">
              {systemSettings?.subTajuk || 'Kemudahan Kawalan & Pendaftaran Lampiran A'}
            </p>
          </div>

          {/* ROLE SELECTOR TABS */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-mono font-black uppercase text-slate-700">
              Pilih Peranan Akses:
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 border-2 border-slate-950">
              <button
                type="button"
                onClick={() => {
                  setLoginRole('user');
                  setAuthError('');
                  setPasswordInput('');
                }}
                className={`py-2 px-1 text-center font-mono text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  loginRole === 'user'
                    ? 'bg-blue-600 text-white border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Pengguna Awam</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginRole('pegawai');
                  setAuthError('');
                  setPasswordInput('');
                }}
                className={`py-2 px-1 text-center font-mono text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  loginRole === 'pegawai'
                    ? 'bg-emerald-600 text-white border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Pegawai Parlimen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginRole('master_admin');
                  setAuthError('');
                  setPasswordInput('');
                }}
                className={`py-2 px-1 text-center font-mono text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  loginRole === 'master_admin'
                    ? 'bg-amber-600 text-white border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Master Admin</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
            {/* PARLIMEN SELECTOR FOR USER & PEGAWAI */}
            {loginRole !== 'master_admin' && (
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-mono font-black uppercase text-slate-800">
                  {loginRole === 'user' ? 'Kawasan Parlimen Anda:' : 'Kawasan Parlimen Bertugas:'}
                </label>
                <select
                  value={selectedLoginParlimen}
                  onChange={(e) => {
                    setSelectedLoginParlimen(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-950 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none cursor-pointer"
                >
                  {uniqueParlimens.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* PASSWORD INPUT */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-mono font-black uppercase text-slate-800">
                {loginRole === 'user' && `Kata Laluan Parlimen (${selectedLoginParlimen}):`}
                {loginRole === 'pegawai' && 'Kata Laluan Khas Pegawai Parlimen:'}
                {loginRole === 'master_admin' && 'Kata Laluan Master Admin:'}
              </label>
              
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder={
                    loginRole === 'user' 
                      ? "Masukkan kata laluan Parlimen..." 
                      : loginRole === 'pegawai'
                      ? "Masukkan kata laluan Pegawai..."
                      : "Masukkan kata laluan Master Admin..."
                  }
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-950 text-sm font-mono tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:bg-white focus:outline-none transition-all pr-12"
                  autoFocus
                />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] font-mono text-slate-500">
                {loginRole === 'user' && `Kata laluan boleh ditetapkan oleh Pegawai Parlimen ${selectedLoginParlimen}. (Lalai: USER123)`}
                {loginRole === 'pegawai' && 'Akses penuh ke Papan Pemuka, Borang, Lampiran A, dan Portal PKD. (Lalai: PEGAWAI123)'}
                {loginRole === 'master_admin' && 'Akses ke Pusat Kawalan Master Kawasan & pengurusan sistem. (Lalai: ADMIN123)'}
              </p>
            </div>

            {authError && (
              <div className="border-2 border-rose-950 bg-rose-50 text-rose-800 p-3 flex items-start gap-2 animate-pulse">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-700" />
                <span className="text-[10px] sm:text-xs font-mono font-black tracking-wide leading-normal">
                  {authError}
                </span>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3.5 text-white font-mono font-black text-xs uppercase tracking-widest border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2.5px] hover:translate-y-[2.5px] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                loginRole === 'user' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : loginRole === 'pegawai'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Log Masuk Sebagai {loginRole === 'user' ? 'Pengguna Awam' : loginRole === 'pegawai' ? 'Pegawai Parlimen' : 'Master Admin'}</span>
            </button>

            {/* BUTTON LUPA KATA LALUAN / HUBUNGI MASTER ADMIN */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(true);
                  setResetSuccessMessage('');
                }}
                className="text-xs font-mono font-bold text-slate-700 hover:text-blue-600 underline cursor-pointer inline-flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Lupa Kata Laluan? / Hubungi Master Admin</span>
              </button>
            </div>
          </form>

          <div className="border-2 border-slate-950 bg-slate-50 p-3 text-[10px] sm:text-xs font-mono text-slate-700 text-left leading-relaxed">
            <b>Nota Keselamatan RBAC:</b> Sistem ini mengasingkan peranan Pengguna Awam, Pegawai Parlimen, dan Master Admin. Sesi log masuk akan tamat secara automatik selepas 20 minit tanpa sebarang aktiviti bagi menjamin keselamatan peranti.
          </div>

        </div>

        {/* MODAL LUPA KATA LALUAN & MAKLUMAT HUBUNGAN MASTER ADMIN */}
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border-4 border-slate-950 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              
              <div className="flex items-center justify-between border-b-2 border-slate-950 pb-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                  <h3 className="font-mono font-black text-sm uppercase tracking-wider">
                    Bantuan &amp; Penetapan Semula Kata Laluan
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-950 border border-slate-950 cursor-pointer"
                >
                  <EyeOff className="w-4 h-4 hidden" />
                  <span className="font-mono font-black text-xs px-1">X</span>
                </button>
              </div>

              {/* MAKLUMAT HUBUNGAN MASTER ADMIN */}
              <div className="bg-blue-50 border-2 border-blue-900 p-3.5 space-y-2 text-left">
                <div className="text-xs font-mono font-black uppercase text-blue-950 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-700" />
                  <span>Pusat Kawalan &amp; Master Admin Sistem</span>
                </div>
                <div className="text-xs font-mono text-blue-900 space-y-1">
                  <div><b>Emel Pentadbir:</b> isugopeng2013@gmail.com</div>
                  <div><b>Status Sokongan:</b> Aktif (Diselaraskan Melalui Supabase Cloud)</div>
                  <div><b>Peranan Semasa:</b> {loginRole === 'pegawai' ? 'Pegawai Parlimen' : loginRole === 'master_admin' ? 'Master Admin' : 'Pengguna Awam'}</div>
                </div>
              </div>

              {/* FORM HANTAR PERMOHONAN PENETAPAN SEMULA */}
              {resetSuccessMessage ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-950 text-emerald-900 text-xs font-mono space-y-2 text-left">
                  <div className="flex items-center gap-2 font-black text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>PERMOHONAN BERJAYA DIHANTAR</span>
                  </div>
                  <p className="leading-relaxed">
                    {resetSuccessMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase border border-emerald-950 cursor-pointer"
                  >
                    Tutup Tetingkap
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!resetName.trim() || !resetContact.trim()) {
                      alert('Sila lengkapkan nama dan emel/nombor telefon.');
                      return;
                    }
                    setIsSubmittingReset(true);
                    try {
                      const res = await submitPasswordResetRequest({
                        namaPemohon: resetName.trim(),
                        peranan: loginRole,
                        parlimen: loginRole !== 'master_admin' ? selectedLoginParlimen : undefined,
                        emelAtauTelefon: resetContact.trim(),
                        catatan: resetNote.trim()
                      });
                      setResetSuccessMessage(res.message);
                      setResetName('');
                      setResetContact('');
                      setResetNote('');
                    } catch (err: any) {
                      alert(err.message || 'Ralat menghantar permohonan.');
                    } finally {
                      setIsSubmittingReset(false);
                    }
                  }}
                  className="space-y-3.5 text-left"
                >
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-black uppercase text-slate-800">
                      Nama Penuh Pemohon <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={resetName}
                      onChange={(e) => setResetName(e.target.value)}
                      placeholder="Contoh: Encik Ahmad Bin Razali"
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-950 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-black uppercase text-slate-800">
                      Nombor Telefon / Emel Untuk Dihubungi <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={resetContact}
                      onChange={(e) => setResetContact(e.target.value)}
                      placeholder="Contoh: 012-3456789 atau nama@emel.com"
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-950 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-black uppercase text-slate-800">
                      Catatan Masalah (Pilihan)
                    </label>
                    <textarea
                      value={resetNote}
                      onChange={(e) => setResetNote(e.target.value)}
                      rows={2}
                      placeholder="Contoh: Terlupa kata laluan bagi kawasan Parlimen Gopeng..."
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-950 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReset}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isSubmittingReset ? 'Merekodkan...' : 'Hantar Permohonan ke Pusat Kawalan'}</span>
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="text-xs font-mono text-slate-600 hover:text-slate-950 underline cursor-pointer"
                >
                  Kembali ke Halaman Log Masuk
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Header Navigation with Dynamic Title, Role badges, and Logout from Supabase */}
      <Header 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        lang="ms" 
        title={systemSettings?.tajukUtama}
        subTitle={systemSettings?.subTajuk}
        currentRole={currentUserSession?.role}
        userParlimen={currentUserSession?.parlimen}
        onLogout={handleLogout}
        onOpenUserPasswordModal={() => {
          setCurrentTab('admin');
          setIsPegawaiPasswordModalOpen(true);
        }}
      />

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {renderTabContent()}
      </main>

      {/* Footer Info Area */}
      <footer className="bg-white border-t-2 border-slate-950 py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono uppercase font-bold text-slate-600">
          <p>© 2026 {systemSettings?.tajukUtama || 'Laporan Maklum Balas Semasa (MBS)'}. Hak Cipta Terpelihara.</p>
          <div className="flex items-center space-x-1.5 justify-center sm:justify-start">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Format Rasmi disediakan mengikut susun atur Lampiran A Mac 2026</span>
          </div>
        </div>
      </footer>

      {/* AMARAN SESI TAMAT TEMPOH (SESSION TIMEOUT WARNING) */}
      {showSessionWarning && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-amber-500 text-slate-950 border-4 border-slate-950 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1 font-mono text-left">
              <div className="text-xs font-black uppercase tracking-wider">
                Amaran Sesi Tidak Aktif
              </div>
              <p className="text-[11px] leading-tight font-bold">
                Tiada aktiviti dikesan. Sistem akan melog keluar secara automatik dalam masa kurang 2 minit demi keselamatan.
              </p>
              <button
                type="button"
                onClick={() => {
                  lastActivityRef.current = Date.now();
                  setShowSessionWarning(false);
                }}
                className="mt-2 px-3 py-1 bg-slate-950 hover:bg-slate-800 text-white font-mono font-bold text-[10px] uppercase border border-white cursor-pointer"
              >
                Kekal Log Masuk
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

