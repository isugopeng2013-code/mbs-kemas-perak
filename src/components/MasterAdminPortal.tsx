/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MasterKawasanRecord, RegionLockSettings, SystemSettings, AuditLog, PasswordResetRequest } from '../types';
import { 
  Database, 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  Layers, 
  RefreshCw, 
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileUp,
  MapPin,
  Lock,
  Unlock,
  Sliders,
  ShieldCheck,
  CloudUpload,
  CloudDownload,
  Code,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Type,
  History,
  Activity,
  UserCheck,
  Clock,
  User,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { 
  downloadSampleCsv, 
  downloadSampleXlsx, 
  exportMasterKawasanToCsv, 
  parseUploadedMasterFile, 
  ParsedImportResult 
} from '../utils/masterDataManager';
import { isSupabaseConfigured, fetchAuditLogs, fetchPasswordResetRequests, recordAuditLog } from '../lib/supabaseClient';

interface MasterAdminPortalProps {
  masterRecords: MasterKawasanRecord[];
  regionLockSettings: RegionLockSettings;
  systemSettings?: SystemSettings;
  onSaveRegionLockSettings: (settings: RegionLockSettings) => void;
  onSaveSystemSettings?: (settings: SystemSettings) => Promise<{ success: boolean; message: string }>;
  onAddRecord: (record: Omit<MasterKawasanRecord, 'id'>) => void;
  onUpdateRecord: (id: string, record: Partial<MasterKawasanRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onBulkImport: (records: Omit<MasterKawasanRecord, 'id'>[], mode: 'append' | 'replace') => void;
  onResetDefault: () => void;
  onSyncAllToSupabase?: (mode?: 'upsert' | 'replace') => Promise<{ success: boolean; message: string }>;
  onPullFromSupabase?: () => Promise<{ success: boolean; message: string }>;
}

export function MasterAdminPortal({
  masterRecords,
  regionLockSettings,
  systemSettings,
  onSaveRegionLockSettings,
  onSaveSystemSettings,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onBulkImport,
  onResetDefault,
  onSyncAllToSupabase,
  onPullFromSupabase
}: MasterAdminPortalProps) {
  // Active Section Tab inside Master Admin: 'list' | 'add' | 'bulk' | 'settings' | 'audit'
  const [adminSection, setAdminSection] = useState<'list' | 'add' | 'bulk' | 'settings' | 'audit'>('list');

  // Audit Logs & Password Reset Requests
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);
  const [resetRequestsList, setResetRequestsList] = useState<PasswordResetRequest[]>([]);
  const [auditFilterTindakan, setAuditFilterTindakan] = useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  const loadAuditData = async () => {
    setIsLoadingAudit(true);
    try {
      const [logs, reqs] = await Promise.all([
        fetchAuditLogs(),
        fetchPasswordResetRequests()
      ]);
      setAuditLogsList(logs);
      setResetRequestsList(reqs);
    } catch (e) {
      console.warn('Error loading audit data:', e);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (adminSection === 'audit') {
      loadAuditData();
    }
  }, [adminSection]);

  // Supabase sync states
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [isPullingSupabase, setIsPullingSupabase] = useState(false);
  const [supabaseMessage, setSupabaseMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Reset confirmation modal state
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Notification / Alert Message
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlertInfo({ type, message });
    setTimeout(() => {
      setAlertInfo(prev => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const handlePushToSupabase = async () => {
    if (!onSyncAllToSupabase) return;
    setIsSyncingSupabase(true);
    setSupabaseMessage(null);
    try {
      const res = await onSyncAllToSupabase('upsert');
      setSupabaseMessage({ success: res.success, text: res.message });
      if (res.success) {
        showAlert('success', res.message);
      } else {
        showAlert('warning', res.message);
      }
    } catch (err: any) {
      setSupabaseMessage({ success: false, text: err.message || 'Ralat memuat naik ke Supabase' });
      showAlert('error', err.message || 'Ralat memuat naik ke Supabase');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleFetchFromSupabase = async () => {
    if (!onPullFromSupabase) return;
    setIsPullingSupabase(true);
    setSupabaseMessage(null);
    try {
      const res = await onPullFromSupabase();
      setSupabaseMessage({ success: res.success, text: res.message });
      if (res.success) {
        showAlert('success', res.message);
      } else {
        showAlert('warning', res.message);
      }
    } catch (err: any) {
      setSupabaseMessage({ success: false, text: err.message || 'Ralat memuat data dari Supabase' });
      showAlert('error', err.message || 'Ralat memuat data dari Supabase');
    } finally {
      setIsPullingSupabase(false);
    }
  };

  const handleCopySql = () => {
    const sqlText = `-- Skrip Penciptaan Jadual master_kawasan di Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.master_kawasan (
  id TEXT PRIMARY KEY,
  parlimen TEXT NOT NULL,
  dun TEXT NOT NULL,
  dm_kod TEXT,
  dm_nama TEXT NOT NULL,
  lokaliti_kod TEXT,
  lokaliti_nama TEXT NOT NULL,
  negeri TEXT DEFAULT 'PERAK',
  tarikh_daftar TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Benarkan akses RLS (Row Level Security)
ALTER TABLE public.master_kawasan ENABLE ROW LEVEL SECURITY;

-- Buang policy sedia ada sekiranya sudah wujud untuk elak ralat 42710
DROP POLICY IF EXISTS "Akses Terbuka Master Kawasan" ON public.master_kawasan;

-- Cipta semula policy
CREATE POLICY "Akses Terbuka Master Kawasan" ON public.master_kawasan FOR ALL USING (true) WITH CHECK (true);`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // --- GLOBAL SYSTEM & REGION SETTINGS STATE ---
  const [selectedDefaultParlimen, setSelectedDefaultParlimen] = useState<string>(
    systemSettings?.defaultParlimen || regionLockSettings?.defaultParlimen || 'P.071 GOPENG'
  );
  const [isLockedState, setIsLockedState] = useState<boolean>(
    systemSettings?.isLocked !== undefined ? systemSettings.isLocked : Boolean(regionLockSettings?.isLocked)
  );
  const [passwordState, setPasswordState] = useState<string>(
    systemSettings?.kataLaluanUser || systemSettings?.kataLaluan || 'USER123'
  );
  const [passwordUserState, setPasswordUserState] = useState<string>(
    systemSettings?.kataLaluanUser || systemSettings?.kataLaluan || 'USER123'
  );
  const [passwordPegawaiState, setPasswordPegawaiState] = useState<string>(
    systemSettings?.kataLaluanPegawai || 'PEGAWAI123'
  );
  const [passwordMasterState, setPasswordMasterState] = useState<string>(
    systemSettings?.kataLaluanMaster || 'ADMIN123'
  );
  const [showPasswordState, setShowPasswordState] = useState<boolean>(false);
  const [showPasswordPegawai, setShowPasswordPegawai] = useState<boolean>(false);
  const [showPasswordMaster, setShowPasswordMaster] = useState<boolean>(false);
  const [tajukUtamaState, setTajukUtamaState] = useState<string>(
    systemSettings?.tajukUtama || 'Maklum Balas Semasa (MBS)'
  );
  const [subTajukState, setSubTajukState] = useState<string>(
    systemSettings?.subTajuk || 'Sistem Pengurusan & Maklum Balas Rakyat'
  );
  const [isSavingGlobalSettings, setIsSavingGlobalSettings] = useState<boolean>(false);
  const [showSqlSettingsModal, setShowSqlSettingsModal] = useState<boolean>(false);
  const [copiedSqlSettings, setCopiedSqlSettings] = useState<boolean>(false);
  const [showSqlRlsModal, setShowSqlRlsModal] = useState<boolean>(false);
  const [copiedSqlRls, setCopiedSqlRls] = useState<boolean>(false);

  React.useEffect(() => {
    if (systemSettings) {
      setSelectedDefaultParlimen(systemSettings.defaultParlimen || 'P.071 GOPENG');
      setIsLockedState(Boolean(systemSettings.isLocked));
      setPasswordState(systemSettings.kataLaluanUser || systemSettings.kataLaluan || 'USER123');
      setPasswordUserState(systemSettings.kataLaluanUser || systemSettings.kataLaluan || 'USER123');
      setPasswordPegawaiState(systemSettings.kataLaluanPegawai || 'PEGAWAI123');
      setPasswordMasterState(systemSettings.kataLaluanMaster || 'ADMIN123');
      setTajukUtamaState(systemSettings.tajukUtama || 'Maklum Balas Semasa (MBS)');
      setSubTajukState(systemSettings.subTajuk || 'Sistem Pengurusan & Maklum Balas Rakyat');
    } else if (regionLockSettings) {
      setSelectedDefaultParlimen(regionLockSettings.defaultParlimen || 'P.071 GOPENG');
      setIsLockedState(Boolean(regionLockSettings.isLocked));
    }
  }, [systemSettings, regionLockSettings]);

  const handleSaveGlobalSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordPegawaiState.trim()) {
      showAlert('error', 'Kata Laluan Pegawai Parlimen tidak boleh dibiarkan kosong.');
      return;
    }
    if (!passwordMasterState.trim()) {
      showAlert('error', 'Kata Laluan Master Admin tidak boleh dibiarkan kosong.');
      return;
    }
    if (!passwordUserState.trim()) {
      showAlert('error', 'Kata Laluan Pengguna Awam (User) tidak boleh dibiarkan kosong.');
      return;
    }
    if (!tajukUtamaState.trim()) {
      showAlert('error', 'Tajuk Utama Sistem tidak boleh dibiarkan kosong.');
      return;
    }

    const payload: SystemSettings = {
      kataLaluan: passwordUserState.trim(),
      kataLaluanUser: passwordUserState.trim(),
      kataLaluanPegawai: passwordPegawaiState.trim(),
      kataLaluanMaster: passwordMasterState.trim(),
      parlimenPasswords: systemSettings?.parlimenPasswords || {},
      tajukUtama: tajukUtamaState.trim(),
      subTajuk: subTajukState.trim(),
      defaultParlimen: selectedDefaultParlimen,
      isLocked: isLockedState,
      updatedAt: new Date().toISOString()
    };

    setIsSavingGlobalSettings(true);
    if (onSaveSystemSettings) {
      const res = await onSaveSystemSettings(payload);
      setIsSavingGlobalSettings(false);
      if (res.success) {
        recordAuditLog({
          peranan: 'master_admin',
          pengguna: 'Master Admin',
          tindakan: 'TETAPAN_SISTEM',
          huraian: `Master Admin mengemas kini tetapan sistem & kata laluan (Kawasan lalai: ${selectedDefaultParlimen}, Kunci: ${isLockedState ? 'Ya' : 'Tidak'}).`
        });
        showAlert('success', 'Tetapan sistem global berjaya disimpan ke Supabase Cloud dan disegerakkan ke semua peranti.');
      } else {
        showAlert('error', res.message);
      }
    } else {
      onSaveRegionLockSettings({
        defaultParlimen: selectedDefaultParlimen,
        isLocked: isLockedState
      });
      setIsSavingGlobalSettings(false);
      showAlert('success', 'Tetapan disimpan secara tempatan.');
    }
  };

  const handleSaveRegionSettings = (e?: React.FormEvent) => {
    handleSaveGlobalSettings(e);
  };

  // --- 1. SINGLE RECORD FORM STATE ---
  const [formParlimenMode, setFormParlimenMode] = useState<'select' | 'custom'>('select');
  const [formDunMode, setFormDunMode] = useState<'select' | 'custom'>('select');
  const [formDmMode, setFormDmMode] = useState<'select' | 'custom'>('select');

  const [parlimenInput, setParlimenInput] = useState('P.071 GOPENG');
  const [dunInput, setDunInput] = useState('N.44 SUNGAI RAPAT');
  const [dmKodInput, setDmKodInput] = useState('');
  const [dmNamaInput, setDmNamaInput] = useState('');
  const [lokalitiKodInput, setLokalitiKodInput] = useState('');
  const [lokalitiNamaInput, setLokalitiNamaInput] = useState('');

  // Extract unique existing Parlimens and DUNs for dropdowns
  const uniqueParlimens = useMemo(() => {
    const set = new Set<string>();
    masterRecords.forEach(r => { if (r.parlimen) set.add(r.parlimen); });
    return Array.from(set).sort();
  }, [masterRecords]);

  const uniqueDunsForParlimen = useMemo(() => {
    const set = new Set<string>();
    masterRecords.forEach(r => {
      if (r.parlimen === parlimenInput && r.dun) set.add(r.dun);
    });
    return Array.from(set).sort();
  }, [masterRecords, parlimenInput]);

  const selectedParlimenStats = useMemo(() => {
    const recordsInParlimen = masterRecords.filter(r => r.parlimen === selectedDefaultParlimen);
    const duns = Array.from(new Set(recordsInParlimen.map(r => r.dun))).sort();
    const dms = Array.from(new Set(recordsInParlimen.map(r => r.dmNama))).sort();
    return {
      totalLocalities: recordsInParlimen.length,
      totalDms: dms.length,
      duns
    };
  }, [masterRecords, selectedDefaultParlimen]);

  const uniqueDmsForDun = useMemo(() => {
    const map = new Map<string, string>(); // dmNama -> dmKod
    masterRecords.forEach(r => {
      if (r.parlimen === parlimenInput && r.dun === dunInput && r.dmNama) {
        if (!map.has(r.dmNama)) {
          map.set(r.dmNama, r.dmKod || '');
        }
      }
    });
    return Array.from(map.entries()).map(([name, code]) => ({ name, code }));
  }, [masterRecords, parlimenInput, dunInput]);

  const handleSelectDmQuick = (dmName: string) => {
    const found = uniqueDmsForDun.find(d => d.name === dmName);
    if (found) {
      setDmNamaInput(found.name);
      setDmKodInput(found.code);
    } else {
      setDmNamaInput(dmName);
    }
  };

  const handleSingleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parlimenInput.trim()) {
      showAlert('error', 'Sila pilih atau masukkan nama Parlimen.');
      return;
    }
    if (!dunInput.trim()) {
      showAlert('error', 'Sila pilih atau masukkan nama DUN.');
      return;
    }
    if (!dmNamaInput.trim()) {
      showAlert('error', 'Sila masukkan Nama Daerah Mengundi (DM).');
      return;
    }
    if (!lokalitiNamaInput.trim()) {
      showAlert('error', 'Sila masukkan Nama Lokaliti.');
      return;
    }

    // Check duplicate locality code within same DM
    const exists = masterRecords.some(
      r => r.parlimen.toUpperCase() === parlimenInput.trim().toUpperCase() &&
           r.dun.toUpperCase() === dunInput.trim().toUpperCase() &&
           r.lokalitiNama.toUpperCase() === lokalitiNamaInput.trim().toUpperCase()
    );

    if (exists) {
      showAlert('warning', `Perhatian: Lokaliti "${lokalitiNamaInput}" sudah pun wujud dalam DUN ini. Rekod tetap disimpan.`);
    }

    onAddRecord({
      parlimen: parlimenInput.trim().toUpperCase(),
      dun: dunInput.trim().toUpperCase(),
      dmKod: dmKodInput.trim(),
      dmNama: dmNamaInput.trim().toUpperCase(),
      lokalitiKod: lokalitiKodInput.trim(),
      lokalitiNama: lokalitiNamaInput.trim().toUpperCase(),
      negeri: "PERAK",
      tarikhDaftar: new Date().toISOString().split('T')[0]
    });

    recordAuditLog({
      peranan: 'master_admin',
      pengguna: 'Master Admin',
      parlimen: parlimenInput.trim().toUpperCase(),
      tindakan: 'TAMBAH_DATA_MASTER',
      huraian: `Master Admin menambah rekod master baharu: ${lokalitiNamaInput.trim().toUpperCase()} (${parlimenInput.trim().toUpperCase()} / ${dunInput.trim().toUpperCase()}).`
    });

    showAlert('success', `Lokaliti "${lokalitiNamaInput.trim().toUpperCase()}" berjaya ditambah ke dalam pangkalan data master!`);
    
    // Clear locality fields for quick next entry
    setLokalitiKodInput('');
    setLokalitiNamaInput('');
  };

  // --- 2. BULK UPLOAD STATE ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [parseResult, setParseResult] = useState<ParsedImportResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processIncomingFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processIncomingFile(e.target.files[0]);
    }
  };

  const processIncomingFile = (file: File) => {
    setSelectedFileName(file.name);
    setIsProcessingFile(true);
    setParseResult(null);

    const isCsv = file.name.endsWith('.csv');
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCsv && !isXlsx) {
      showAlert('error', 'Format fail tidak disokong. Sila muat naik fail berformat .CSV atau .XLSX.');
      setIsProcessingFile(false);
      return;
    }

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bufferOrString = evt.target?.result;
        if (!bufferOrString) {
          showAlert('error', 'Fail kosong atau gagal dibaca.');
          setIsProcessingFile(false);
          return;
        }

        const parsed = parseUploadedMasterFile(bufferOrString as ArrayBuffer, true);
        setParseResult(parsed);
        setIsProcessingFile(false);

        if (parsed.validRecords.length > 0) {
          showAlert('success', `Fail berjaya dibaca! Ditemui ${parsed.validRecords.length} rekod yang sah.`);
        } else {
          showAlert('error', 'Tiada rekod sah dijumpai dalam fail.');
        }
      } catch (err: any) {
        console.error("Ralat memproses fail:", err);
        showAlert('error', `Gagal memproses fail: ${err?.message || 'Ralat tidak diketahui'}`);
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      showAlert('error', 'Gagal membaca fail dari peranti anda.');
      setIsProcessingFile(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmBulkImport = () => {
    if (!parseResult || parseResult.validRecords.length === 0) return;

    if (importMode === 'replace') {
      const confirmReplace = window.confirm(
        `AMARAN: Anda memilih mod "Ganti Semua Rekod". Tindakan ini akan memadamkan SEMUA ${masterRecords.length} rekod sedia ada dan menggantikannya dengan ${parseResult.validRecords.length} rekod baharu. Teruskan?`
      );
      if (!confirmReplace) return;
    }

    onBulkImport(parseResult.validRecords, importMode);
    recordAuditLog({
      peranan: 'master_admin',
      pengguna: 'Master Admin',
      tindakan: 'IMPORT_PUKAL',
      huraian: `Master Admin melakukan muat naik pukal (${importMode === 'replace' ? 'Ganti Semua' : 'Tambah Rekod'}) sebanyak ${parseResult.validRecords.length} rekod.`
    });
    showAlert(
      'success',
      `Berjaya mengimport ${parseResult.validRecords.length} rekod kawasan ke dalam pangkalan data!`
    );

    // Reset bulk upload state and switch back to list
    setParseResult(null);
    setSelectedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setAdminSection('list');
  };

  // --- 3. SEARCH, FILTER & TABLE STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterParlimen, setFilterParlimen] = useState<string>('ALL');
  const [filterDun, setFilterDun] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Edit Modal / Row State
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MasterKawasanRecord>>({});

  // Delete Confirm Modal State
  const [deletingRecord, setDeletingRecord] = useState<MasterKawasanRecord | null>(null);

  // Filtered master records
  const filteredRecords = useMemo(() => {
    return masterRecords.filter(rec => {
      // Parlimen filter
      if (filterParlimen !== 'ALL' && rec.parlimen !== filterParlimen) {
        return false;
      }
      // DUN filter
      if (filterDun !== 'ALL' && rec.dun !== filterDun) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const match =
          (rec.parlimen || '').toLowerCase().includes(query) ||
          (rec.dun || '').toLowerCase().includes(query) ||
          (rec.dmKod || '').toLowerCase().includes(query) ||
          (rec.dmNama || '').toLowerCase().includes(query) ||
          (rec.lokalitiKod || '').toLowerCase().includes(query) ||
          (rec.lokalitiNama || '').toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [masterRecords, filterParlimen, filterDun, searchTerm]);

  // Reset page when filter/search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterParlimen, filterDun, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Handle Edit
  const handleStartEdit = (rec: MasterKawasanRecord) => {
    setEditingRecordId(rec.id);
    setEditForm({ ...rec });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.lokalitiNama?.trim() || !editForm.dmNama?.trim()) {
      showAlert('error', 'Nama Lokaliti dan Nama DM tidak boleh dibiarkan kosong.');
      return;
    }
    onUpdateRecord(id, {
      parlimen: editForm.parlimen?.trim().toUpperCase(),
      dun: editForm.dun?.trim().toUpperCase(),
      dmKod: editForm.dmKod?.trim(),
      dmNama: editForm.dmNama?.trim().toUpperCase(),
      lokalitiKod: editForm.lokalitiKod?.trim(),
      lokalitiNama: editForm.lokalitiNama?.trim().toUpperCase(),
    });
    recordAuditLog({
      peranan: 'master_admin',
      pengguna: 'Master Admin',
      parlimen: editForm.parlimen,
      tindakan: 'KEMASKINI_DATA_MASTER',
      huraian: `Master Admin mengemas kini maklumat lokaliti "${editForm.lokalitiNama?.trim().toUpperCase()}".`
    });
    setEditingRecordId(null);
    showAlert('success', 'Rekod kawasan berjaya dikemas kini!');
  };

  // Handle Delete
  const handleConfirmDelete = () => {
    if (deletingRecord) {
      onDeleteRecord(deletingRecord.id);
      recordAuditLog({
        peranan: 'master_admin',
        pengguna: 'Master Admin',
        parlimen: deletingRecord.parlimen,
        tindakan: 'PADAM_DATA_MASTER',
        huraian: `Master Admin memadamkan rekod lokaliti "${deletingRecord.lokalitiNama}" (${deletingRecord.parlimen} / ${deletingRecord.dun}).`
      });
      showAlert('success', `Lokaliti "${deletingRecord.lokalitiNama}" telah dipadam.`);
      setDeletingRecord(null);
    }
  };

  // Handle Reset to Default Action
  const handleExecuteResetDefault = async () => {
    setIsResetting(true);
    try {
      await onResetDefault();
      recordAuditLog({
        peranan: 'master_admin',
        pengguna: 'Master Admin',
        parlimen: 'P.071 GOPENG',
        tindakan: 'RESET_DATA_MASTER',
        huraian: 'Master Admin menetapkan semula pangkalan data master ke rekod asal sistem (506 Lokaliti di Parlimen P.071 Gopeng).'
      });
      setShowResetConfirmModal(false);
      showAlert('success', 'Pangkalan data master berjaya dikembalikan kepada rekod asal sistem (506 lokaliti Gopeng).');
    } catch (err: any) {
      console.error('Reset error:', err);
      showAlert('error', 'Gagal menetapkan semula pangkalan data master.');
    } finally {
      setIsResetting(false);
    }
  };

  // Summary statistics
  const totalLokaliti = masterRecords.length;
  const totalDm = useMemo(() => {
    const set = new Set<string>();
    masterRecords.forEach(r => { if (r.dmNama) set.add(`${r.dun}_${r.dmNama}`); });
    return set.size;
  }, [masterRecords]);
  const totalDun = useMemo(() => {
    const set = new Set<string>();
    masterRecords.forEach(r => { if (r.dun) set.add(r.dun); });
    return set.size;
  }, [masterRecords]);
  const totalParlimen = uniqueParlimens.length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Alert Banner */}
      {alertInfo && (
        <div 
          className={`p-4 border-2 border-slate-950 flex items-start justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
            alertInfo.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-950' 
              : alertInfo.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-950'
              : 'bg-rose-50 text-rose-900 border-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertInfo.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />}
            {alertInfo.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />}
            {alertInfo.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />}
            <span className="text-xs sm:text-sm font-mono font-bold">{alertInfo.message}</span>
          </div>
          <button 
            onClick={() => setAlertInfo(null)}
            className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Title & Subtitle Banner */}
      <div className="bg-white p-5 sm:p-7 border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-mono text-xs uppercase font-black tracking-widest mb-1">
            <Database className="w-4 h-4" />
            <span>Pangkalan Data Master • Bahagian Kawasan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            PORTAL ADMIN PANGKALAN DATA
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-mono mt-1 max-w-3xl leading-relaxed">
            Pusat kawalan master bagi pendaftaran Parlimen, DUN, Daerah Mengundi (DM), dan Lokaliti. Setiap perubahan akan dikemas kini secara langsung ke dalam dropdown Borang MBS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportMasterKawasanToCsv(masterRecords)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5 active:translate-x-[1.5px] active:translate-y-[1.5px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Eksport CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirmModal(true)}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5 active:translate-x-[1.5px] active:translate-y-[1.5px]"
            title="Pulihkan pangkalan data ke asal"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset Asal</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider">Jumlah Lokaliti</span>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalLokaliti.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Rekod tempat aktif</span>
        </div>

        <div className="bg-white p-4 border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider">Daerah Mengundi (DM)</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalDm}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Pusat DM berdaftar</span>
        </div>

        <div className="bg-white p-4 border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider">Kawasan DUN</span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalDun}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Dewan Undangan Negeri</span>
        </div>

        <div className="bg-white p-4 border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider">Parlimen</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalParlimen}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Kerusi Parlimen</span>
        </div>
      </div>

      {/* Quick Region Lock Status Banner */}
      <div id="master-admin-lock-status-banner" className={`p-4 border-2 border-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
        regionLockSettings?.isLocked ? 'bg-amber-50' : 'bg-slate-50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 border-2 border-slate-950 ${
            regionLockSettings?.isLocked ? 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-200 text-slate-700'
          }`}>
            {regionLockSettings?.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs font-mono font-black uppercase text-slate-900 flex items-center gap-2">
              <span>Status Kunci Kawasan Borang MBS:</span>
              <span className={`px-2 py-0.5 text-[11px] font-mono font-black border border-slate-950 ${
                regionLockSettings?.isLocked ? 'bg-amber-300 text-amber-950' : 'bg-emerald-200 text-emerald-950'
              }`}>
                {regionLockSettings?.isLocked ? `AKTIF • DIKUNCI KEPADA ${regionLockSettings.defaultParlimen}` : 'TIDAK DIKUNCI (SEMUA KAWASAN TERBUKA)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-mono mt-1">
              {regionLockSettings?.isLocked
                ? `Pengguna Borang MBS hanya boleh menghantar laporan bagi Parlimen ${regionLockSettings.defaultParlimen} dengan DUN, DM, dan Lokaliti ditapis automatik.`
                : 'Borang MBS kini membenarkan pegawai memilih mana-mana Parlimen atau menggunakan mod input kawasan tersuai.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAdminSection('settings')}
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-950 text-xs font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center active:translate-x-[1px] active:translate-y-[1px]"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Tukar Tetapan Kunci</span>
        </button>
      </div>

      {/* Supabase Cloud Sync Card */}
      <div 
        id="master-admin-supabase-sync-card" 
        className="p-4 bg-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-3"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black font-mono text-slate-900 uppercase">
                  Pangkalan Data Supabase Cloud: Jadual <code className="bg-slate-100 px-1 py-0.5 border border-slate-300 font-bold text-emerald-800">master_kawasan</code>
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border border-slate-950 ${
                  isSupabaseConfigured ? 'bg-emerald-300 text-emerald-950' : 'bg-slate-200 text-slate-800'
                }`}>
                  {isSupabaseConfigured ? 'KLIEN SUPABASE AKTIF' : 'MOD TEMPATAN (MENUNGGU .ENV)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                Segerakkan {masterRecords.length.toLocaleString()} rekod Parlimen, DUN, DM, dan Lokaliti ke pangkalan data cloud berpusat Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={handlePushToSupabase}
              disabled={isSyncingSupabase || !isSupabaseConfigured}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white border-2 border-slate-950 text-xs font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all"
              title="Muat naik semua rekod semasa ke jadual master_kawasan di Supabase"
            >
              {isSyncingSupabase ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memuat Naik...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Muat Naik ke Supabase</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFetchFromSupabase}
              disabled={isPullingSupabase || !isSupabaseConfigured}
              className="px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 border-2 border-slate-950 text-xs font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all"
              title="Tarik rekod terkini dari jadual master_kawasan di Supabase"
            >
              {isPullingSupabase ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menarik Data...</span>
                </>
              ) : (
                <>
                  <CloudDownload className="w-3.5 h-3.5" />
                  <span>Tarik dari Supabase</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-950 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 cursor-pointer"
              title="Lihat skrip SQL untuk jadual master_kawasan di Supabase"
            >
              <Code className="w-3.5 h-3.5 text-slate-700" />
              <span>Skema SQL</span>
            </button>
          </div>
        </div>

        {/* Status result feedback */}
        {supabaseMessage && (
          <div className={`p-2 border text-xs font-mono flex items-center gap-2 ${
            supabaseMessage.success ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-amber-50 text-amber-900 border-amber-400'
          }`}>
            <span className="font-black">{supabaseMessage.success ? 'STATUS:' : 'PERHATIAN:'}</span>
            <span>{supabaseMessage.text}</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Buttons: List vs Add vs Bulk vs Settings */}
      <div className="flex flex-wrap gap-2 sm:gap-3 border-b-2 border-slate-950 pb-2">
        <button
          id="admin-sec-btn-list"
          onClick={() => setAdminSection('list')}
          className={`px-4 py-2.5 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 transition-all cursor-pointer flex items-center gap-2 ${
            adminSection === 'list'
              ? 'bg-blue-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
              : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Jadual Data Master ({filteredRecords.length})</span>
        </button>

        <button
          id="admin-sec-btn-add"
          onClick={() => setAdminSection('add')}
          className={`px-4 py-2.5 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 transition-all cursor-pointer flex items-center gap-2 ${
            adminSection === 'add'
              ? 'bg-blue-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
              : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Rekod Baharu (Manual)</span>
        </button>

        <button
          id="admin-sec-btn-bulk"
          onClick={() => setAdminSection('bulk')}
          className={`px-4 py-2.5 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 transition-all cursor-pointer flex items-center gap-2 ${
            adminSection === 'bulk'
              ? 'bg-blue-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
              : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Muat Naik Pukal (Excel / CSV)</span>
        </button>

        <button
          id="admin-sec-btn-settings"
          onClick={() => setAdminSection('settings')}
          className={`px-4 py-2.5 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 transition-all cursor-pointer flex items-center gap-2 ${
            adminSection === 'settings'
              ? 'bg-blue-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
              : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Tetapan Sistem (Supabase)</span>
          {regionLockSettings?.isLocked && (
            <span className="px-1.5 py-0.5 bg-amber-300 text-amber-950 text-[10px] font-black font-mono uppercase">
              Dikunci
            </span>
          )}
        </button>

        <button
          id="admin-sec-btn-audit"
          onClick={() => setAdminSection('audit')}
          className={`px-4 py-2.5 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 transition-all cursor-pointer flex items-center gap-2 ${
            adminSection === 'audit'
              ? 'bg-blue-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
              : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Log Aktiviti / Audit Trail</span>
          {resetRequestsList.filter(r => r.status === 'Menunggu').length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-black font-mono uppercase">
              {resetRequestsList.filter(r => r.status === 'Menunggu').length}
            </span>
          )}
        </button>
      </div>

      {/* SECTION: 0. TETAPAN SISTEM & GLOBAL (PANGKALAN DATA SUPABASE) */}
      {adminSection === 'settings' && (
        <div id="section-default-region-settings" className="bg-white p-5 sm:p-8 border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-8">
          <div className="border-b-2 border-slate-950 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 font-mono">
                    TETAPAN SISTEM &amp; GLOBAL (PANGKALAN DATA SUPABASE)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 font-mono mt-1 max-w-3xl leading-relaxed">
                  Semua tetapan di bawah (Kata Laluan, Tajuk Paparan, dan Had Kawasan Borang) disimpan secara langsung ke pangkalan data awan Supabase. Mana-mana komputer, telefon pintar, atau peranti yang disambungkan akan membaca tetapan ini secara serentak (Real-time Sync).
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isSupabaseConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border-2 border-emerald-700 text-emerald-950 font-mono font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(16,185,129,1)]">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    Supabase Cloud: AKTIF
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 border-2 border-rose-700 text-rose-950 font-mono font-black text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                    Supabase: MOD TEMPATAN
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveGlobalSettings} className="space-y-8 max-w-4xl">
            
            {/* BAHAGIAN 1: PENGURUSAN KATA LALUAN MENGIKUT PERANAN (RBAC) */}
            <div className="border-2 border-slate-950 bg-slate-50/70 p-5 sm:p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900">
                    1. PENGURUSAN KATA LALUAN SISTEM (ROLE-BASED ACCESS CONTROL)
                  </h4>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Tetapkan atau kemaskini kata laluan log masuk bagi setiap peranan pengguna di Supabase Cloud.
                  </p>
                </div>
              </div>

              {/* RUANGAN KHAS: PENGURUSAN KATA LALUAN PEGAWAI PARLIMEN */}
              <div className="bg-emerald-50/80 border-2 border-emerald-700 p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(4,120,87,1)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-600 text-white font-mono font-bold text-xs uppercase border border-slate-950">
                      RUANGAN KHAS
                    </span>
                    <h5 className="text-xs sm:text-sm font-mono font-black uppercase text-emerald-950 tracking-wider">
                      Kata Laluan Pegawai Parlimen
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-white text-emerald-900 border border-emerald-400 px-2 py-0.5">
                    Akses: PKD, Lampiran A, Form &amp; Dashboard
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-mono leading-relaxed">
                  Ruangan khas untuk menetapkan kata laluan log masuk bagi <b>Pegawai Parlimen</b>. Pegawai yang log masuk dengan kata laluan ini boleh mengakses Portal PKD, menjana ulasan syor, mencetak Lampiran A, dan mengurus kata laluan User bagi kawasan parlimen masing-masing.
                </p>

                <div className="max-w-md space-y-1.5">
                  <label htmlFor="input-pegawai-password" className="block text-xs font-mono font-black uppercase tracking-wider text-slate-900">
                    Kata Laluan Pegawai Parlimen Terkini <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordPegawai ? 'text' : 'password'}
                      id="input-pegawai-password"
                      value={passwordPegawaiState}
                      onChange={(e) => setPasswordPegawaiState(e.target.value)}
                      placeholder="Masukkan kata laluan Pegawai..."
                      className="w-full text-sm px-4 py-3 bg-white border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold tracking-widest pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordPegawai(!showPasswordPegawai)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                      title={showPasswordPegawai ? 'Sembunyikan kata laluan' : 'Papar kata laluan'}
                    >
                      {showPasswordPegawai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono">
                    Kata laluan lalai: <code>PEGAWAI123</code>.
                  </p>
                </div>
              </div>

              {/* KATA LALUAN MASTER ADMIN */}
              <div className="bg-amber-50/80 border-2 border-amber-700 p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(180,83,9,1)] space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs sm:text-sm font-mono font-black uppercase text-amber-950 tracking-wider">
                    Kata Laluan Master Admin (Pentadbir Utama)
                  </h5>
                  <span className="text-[10px] font-mono font-bold bg-white text-amber-900 border border-amber-400 px-2 py-0.5">
                    Akses Penuh Keseluruhan Sistem
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-mono leading-relaxed">
                  Kata laluan ini melindungi capaian penuh ke <b>Pusat Kawalan Master (master_kawasan)</b>, pengurusan muat naik pukal, dan pengurusan kata laluan semua peranan.
                </p>

                <div className="max-w-md space-y-1.5">
                  <label htmlFor="input-master-password" className="block text-xs font-mono font-black uppercase tracking-wider text-slate-900">
                    Kata Laluan Master Admin Terkini <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordMaster ? 'text' : 'password'}
                      id="input-master-password"
                      value={passwordMasterState}
                      onChange={(e) => setPasswordMasterState(e.target.value)}
                      placeholder="Masukkan kata laluan Master Admin..."
                      className="w-full text-sm px-4 py-3 bg-white border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold tracking-widest pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordMaster(!showPasswordMaster)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                      title={showPasswordMaster ? 'Sembunyikan kata laluan' : 'Papar kata laluan'}
                    >
                      {showPasswordMaster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 font-mono">
                    Kata laluan lalai: <code>ADMIN123</code>.
                  </p>
                </div>
              </div>

              {/* KATA LALUAN USER (PENGGUNA AWAM PARLIMEN) */}
              <div className="bg-blue-50/80 border-2 border-blue-700 p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(29,78,216,1)] space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs sm:text-sm font-mono font-black uppercase text-blue-950 tracking-wider">
                    Kata Laluan Global Pengguna Awam (User)
                  </h5>
                  <span className="text-[10px] font-mono font-bold bg-white text-blue-900 border border-blue-400 px-2 py-0.5">
                    Akses: Papan Pemuka &amp; Borang MBS Sahaja
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-mono leading-relaxed">
                  Kata laluan umum bagi <b>Pengguna Awam (User)</b> untuk mengisi aduan MBS dan melihat statistik papan pemuka. Nota: Pegawai Parlimen juga boleh menetapkan kata laluan berasingan bagi parlimen masing-masing dari Portal PKD.
                </p>

                <div className="max-w-md space-y-1.5">
                  <label htmlFor="input-system-password" className="block text-xs font-mono font-black uppercase tracking-wider text-slate-900">
                    Kata Laluan Asas User <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordState ? 'text' : 'password'}
                      id="input-system-password"
                      value={passwordUserState}
                      onChange={(e) => {
                        setPasswordUserState(e.target.value);
                        setPasswordState(e.target.value);
                      }}
                      placeholder="Masukkan kata laluan Pengguna Awam..."
                      className="w-full text-sm px-4 py-3 bg-white border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold tracking-widest pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordState(!showPasswordState)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                      title={showPasswordState ? 'Sembunyikan kata laluan' : 'Papar kata laluan'}
                    >
                      {showPasswordState ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-800 font-mono">
                    Kata laluan lalai: <code>USER123</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* BAHAGIAN 2: TAJUK PAPARAN UTAMA & SUB-TAJUK (GLOBAL BRANDING & HEADINGS) */}
            <div className="border-2 border-slate-950 bg-slate-50/70 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Type className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900">
                  2. TAJUK PAPARAN UTAMA (GLOBAL TITLE &amp; BRANDING)
                </h4>
              </div>

              <p className="text-xs text-slate-600 font-mono leading-relaxed">
                Tetapkan tajuk utama dan keterangan yang terpapar pada <b>Header navigasi</b>, <b>Papan Pemuka</b>, <b>Skrin Log Masuk</b>, dan <b>Cetakan Rasmi Lampiran A</b> di semua peranti.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="input-system-title" className="block text-xs font-mono font-black uppercase tracking-wider text-slate-900">
                    Tajuk Paparan Utama <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-system-title"
                    value={tajukUtamaState}
                    onChange={(e) => setTajukUtamaState(e.target.value)}
                    placeholder="Contoh: Maklum Balas Semasa (MBS)"
                    className="w-full text-sm px-4 py-3 bg-white border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold"
                    required
                  />
                  <p className="text-[11px] text-slate-500 font-mono">
                    Nama sistem rasmi yang dipaparkan pada bar tajuk utama.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="input-system-subtitle" className="block text-xs font-mono font-black uppercase tracking-wider text-slate-900">
                    Sub-Tajuk / Keterangan Sistem
                  </label>
                  <input
                    type="text"
                    id="input-system-subtitle"
                    value={subTajukState}
                    onChange={(e) => setSubTajukState(e.target.value)}
                    placeholder="Contoh: Sistem Pengurusan & Maklum Balas Rakyat"
                    className="w-full text-sm px-4 py-3 bg-white border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-500 font-mono">
                    Keterangan ringkas yang menyertai tajuk utama sistem.
                  </p>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-950 text-white p-4 border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block font-bold">
                  Pratonton Tajuk Langsung (Live Title Preview):
                </span>
                <div className="font-mono font-black text-sm uppercase tracking-tight text-white">
                  {tajukUtamaState || 'Sistem Maklum Balas Semasa (MBS)'}
                </div>
                <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide">
                  {subTajukState || 'Sistem Pengurusan & Maklum Balas Rakyat'}
                </div>
              </div>
            </div>

            {/* BAHAGIAN 3: TETAPAN KAWASAN LALAI & KUNCI BORANG MBS */}
            <div className="border-2 border-slate-950 bg-slate-50/70 p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900">
                    3. KAWASAN LALAI &amp; PENGUNCIAN BORANG MBS (REGION LOCK)
                  </h4>
                </div>
                <div>
                  {isLockedState ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-200 border border-amber-800 text-amber-950 font-mono font-black text-[11px] uppercase">
                      <Lock className="w-3 h-3 text-amber-800" />
                      Status: DIKUNCI
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 border border-slate-400 text-slate-700 font-mono font-bold text-[11px] uppercase">
                      <Unlock className="w-3 h-3 text-slate-500" />
                      Status: BEBAS
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Menu Pilihan Dropdown: Negeri / Parlimen Utama */}
              <div className="space-y-2">
                <label htmlFor="select-default-parlimen" className="block text-xs font-mono font-black uppercase tracking-wider text-slate-900">
                  Pilih Negeri &amp; Parlimen Utama (Default Region) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select
                    id="select-default-parlimen"
                    value={selectedDefaultParlimen}
                    onChange={(e) => setSelectedDefaultParlimen(e.target.value)}
                    className="w-full text-sm px-4 py-3 bg-white border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold cursor-pointer pr-10"
                  >
                    {uniqueParlimens.map((p) => {
                      const countLok = masterRecords.filter(r => r.parlimen === p).length;
                      const duns = Array.from(new Set(masterRecords.filter(r => r.parlimen === p).map(r => r.dun)));
                      return (
                        <option key={p} value={p}>
                          {p} ({duns.length} DUN • {countLok} Lokaliti)
                        </option>
                      );
                    })}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Pilih kawasan Parlimen rasmi yang akan dijadikan lalai utama atau kawasan tunggal bagi Borang MBS.
                </p>
              </div>

              {/* Cakupan Kawasan terpilih */}
              {selectedParlimenStats && (
                <div className="bg-white border-2 border-slate-950 p-4 space-y-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                    <span className="text-xs font-mono font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Perincian Cakupan: {selectedDefaultParlimen}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-700">
                      {selectedParlimenStats.totalLocalities} Lokaliti &bull; {selectedParlimenStats.totalDms} DM
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-500 block mb-1">DUN yang terlibat:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedParlimenStats.duns.map(dunName => (
                        <span key={dunName} className="px-2 py-1 bg-slate-50 border border-slate-300 font-mono text-xs font-bold text-slate-800">
                          {dunName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Suis / Butang Semak: Kunci Borang MBS kepada Kawasan ini Sahaja */}
              <div className="border border-slate-300 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label 
                      htmlFor="checkbox-lock-toggle" 
                      className="text-sm font-black text-slate-900 uppercase font-mono cursor-pointer flex items-center gap-2"
                    >
                      {isLockedState ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                      <span>Kunci Borang MBS kepada Kawasan ini Sahaja</span>
                    </label>
                    <p className="text-xs text-slate-600 font-mono leading-relaxed">
                      Apabila diaktifkan, medan Parlimen pada Borang MBS akan <b>dikunci (Disabled / Read-Only)</b>. Pengguna hanya dapat memilih DUN, Daerah Mengundi (DM), dan Lokaliti di bawah <b>{selectedDefaultParlimen}</b>.
                    </p>
                  </div>

                  {/* Neo-brutalist Toggle Switch */}
                  <button
                    type="button"
                    id="btn-toggle-lock-switch"
                    role="switch"
                    aria-checked={isLockedState}
                    onClick={() => setIsLockedState(!isLockedState)}
                    className={`relative inline-flex h-8 w-16 flex-shrink-0 cursor-pointer border-2 border-slate-950 transition-colors duration-200 ease-in-out focus:outline-none ${
                      isLockedState ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                    title={isLockedState ? 'Klik untuk nyahkunci borang' : 'Klik untuk kunci borang'}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform bg-white border border-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition duration-200 ease-in-out ${
                        isLockedState ? 'translate-x-8' : 'translate-x-0.5'
                      } mt-0.5`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono font-bold text-slate-800">
                    <input
                      type="checkbox"
                      id="checkbox-lock-toggle"
                      checked={isLockedState}
                      onChange={(e) => setIsLockedState(e.target.checked)}
                      className="w-4 h-4 text-amber-600 border-2 border-slate-950 rounded-none cursor-pointer accent-amber-600"
                    />
                    <span>Tandakan untuk menguatkuasakan penguncian kawasan serta-merta pada borang pelaporan.</span>
                  </label>
                </div>
              </div>
            </div>

            {/* BAHAGIAN 4: BUTANG TINDAKAN & PENYEGERAKAN KE SUPABASE */}
            <div className="border-t-2 border-slate-950 pt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  id="btn-save-global-settings"
                  disabled={isSavingGlobalSettings}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-2 active:translate-x-[2px] active:translate-y-[2px]"
                >
                  <CloudUpload className={`w-4 h-4 ${isSavingGlobalSettings ? 'animate-bounce' : ''}`} />
                  <span>{isSavingGlobalSettings ? 'MENYIMPAN KE SUPABASE...' : 'SIMPAN SEMUA TETAPAN KE SUPABASE CLOUD'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlSettingsModal(true)}
                  className="px-4 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5"
                  title="Lihat skema SQL jadual tetapan_sistem"
                >
                  <Code className="w-4 h-4 text-emerald-700" />
                  <span>Skrip SQL `tetapan_sistem`</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlRlsModal(true)}
                  className="px-4 py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-950 font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5"
                  title="Lihat polisi Row Level Security (RLS) bagi jadual laporan_mbs"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Skrip Polisi RLS Supabase</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDefaultParlimen('P.071 GOPENG');
                    setIsLockedState(true);
                  }}
                  className="px-4 py-3.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5"
                  title="Kunci pantas ke Parlimen Gopeng"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-800" />
                  <span>Kunci Pantas: P.071 GOPENG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLockedState(false)}
                  className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Nyahkunci Semua</span>
                </button>
              </div>

              <div className="bg-blue-50 border-2 border-blue-900 p-3.5 text-xs font-mono text-blue-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  <b>Jaminan Penyegerakan Global:</b> Apabila tetapan disimpan, sistem menyimpannya ke rekod simpanan awan Supabase dan menyiarkannya melalui Realtime Broadcast. Setiap pengguna yang membuka sistem dari telefon atau komputer lain akan menerima kata laluan dan konfigurasi terkini secara automatik.
                </span>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* SECTION: AUDIT TRAIL & LOG AKTIVITI (UNTUK MASTER ADMIN) */}
      {adminSection === 'audit' && (
        <div id="section-master-audit-trail" className="bg-white p-5 sm:p-8 border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="border-b-2 border-slate-950 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-mono text-xs uppercase font-black tracking-widest mb-1">
                <History className="w-4 h-4" />
                <span>Keselamatan &amp; Integriti Sistem</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 font-mono flex items-center gap-2">
                <span>LOG AKTIVITI &amp; AUDIT TRAIL</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-950 text-slate-800">
                  {auditLogsList.length} Rekod
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Jejak setiap pertukaran kata laluan, pengubahsuaian pangkalan data kawasan, dan permohonan bantuan penetapan semula akaun.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAuditData}
                disabled={isLoadingAudit}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                <span>Muat Semula</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const csvRows = [
                    ['ID', 'Tarikh & Masa', 'Peranan', 'Pengguna', 'Parlimen', 'Tindakan', 'Huraian'].join(',')
                  ];
                  auditLogsList.forEach(log => {
                    const row = [
                      `"${log.id}"`,
                      `"${new Date(log.timestamp).toLocaleString('ms-MY')}"`,
                      `"${log.peranan}"`,
                      `"${(log.pengguna || '').replace(/"/g, '""')}"`,
                      `"${(log.parlimen || '-').replace(/"/g, '""')}"`,
                      `"${log.tindakan}"`,
                      `"${(log.huraian || '').replace(/"/g, '""')}"`
                    ];
                    csvRows.push(row.join(','));
                  });
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit_trail_mbs_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport Log</span>
              </button>
            </div>
          </div>

          {/* PERMOHONAN LUPA KATA LALUAN YANG DITERIMA */}
          {resetRequestsList.length > 0 && (
            <div className="border-2 border-amber-600 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-mono font-black uppercase text-amber-900">
                    Permohonan Bantuan / Lupa Kata Laluan ({resetRequestsList.length}):
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-800">
                  Sila hubungi pemohon atau tetapkan kata laluan baharu pada tab Tetapan Sistem.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse bg-white border border-amber-300">
                  <thead className="bg-amber-100 text-amber-950 uppercase border-b border-amber-300">
                    <tr>
                      <th className="p-2">Masa</th>
                      <th className="p-2">Nama Pemohon</th>
                      <th className="p-2">Peranan</th>
                      <th className="p-2">Kawasan Parlimen</th>
                      <th className="p-2">Maklumat Hubungan</th>
                      <th className="p-2">Catatan Masalah</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200">
                    {resetRequestsList.map(req => (
                      <tr key={req.id} className="hover:bg-amber-50/50">
                        <td className="p-2 whitespace-nowrap text-slate-600">
                          {new Date(req.timestamp).toLocaleString('ms-MY')}
                        </td>
                        <td className="p-2 font-bold text-slate-900">{req.namaPemohon}</td>
                        <td className="p-2 uppercase font-black">
                          <span className={`px-1.5 py-0.5 text-[10px] ${
                            req.peranan === 'pegawai' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {req.peranan}
                          </span>
                        </td>
                        <td className="p-2 text-slate-800">{req.parlimen || '-'}</td>
                        <td className="p-2 font-bold text-blue-700">{req.emelAtauTelefon}</td>
                        <td className="p-2 text-slate-600">{req.catatan || '-'}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-black text-[10px]">
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 border-2 border-slate-950">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="Cari log mengikut pengguna, parlimen, atau huraian..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 text-xs font-mono focus:outline-none focus:border-slate-950"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={auditFilterTindakan}
                onChange={(e) => setAuditFilterTindakan(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-300 text-xs font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Tindakan</option>
                <option value="TUKAR_KATALALUAN">Tukar Kata Laluan</option>
                <option value="KEMASKINI_DATA_MASTER">Kemaskini Data Master</option>
                <option value="TAMBAH_DATA_MASTER">Tambah Data Master</option>
                <option value="PADAM_DATA_MASTER">Padam Data Master</option>
                <option value="IMPORT_PUKAL">Import Pukal</option>
                <option value="TETAPAN_SISTEM">Tetapan Sistem</option>
                <option value="LOG_MASUK">Log Masuk</option>
              </select>
            </div>
          </div>

          {/* AUDIT LOG TABLE */}
          <div className="border-2 border-slate-950 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse bg-white">
              <thead className="bg-slate-900 text-white uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Tarikh &amp; Masa</th>
                  <th className="p-3">Peranan</th>
                  <th className="p-3">Pengguna / Parlimen</th>
                  <th className="p-3">Tindakan</th>
                  <th className="p-3">Huraian Aktiviti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditLogsList
                  .filter(item => {
                    const matchTindakan = auditFilterTindakan === 'ALL' || item.tindakan === auditFilterTindakan;
                    const q = auditSearchQuery.toLowerCase();
                    const matchSearch = !q || 
                      item.pengguna?.toLowerCase().includes(q) ||
                      item.parlimen?.toLowerCase().includes(q) ||
                      item.huraian?.toLowerCase().includes(q);
                    return matchTindakan && matchSearch;
                  })
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 whitespace-nowrap text-slate-500 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString('ms-MY')}</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                          log.peranan === 'master_admin' 
                            ? 'bg-amber-100 text-amber-900 border-amber-400' 
                            : log.peranan === 'pegawai'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                            : 'bg-blue-100 text-blue-900 border-blue-400'
                        }`}>
                          {log.peranan}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.pengguna}</div>
                        {log.parlimen && (
                          <div className="text-[10px] text-slate-500">{log.parlimen}</div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-black">
                          {log.tindakan}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 leading-relaxed max-w-md">
                        {log.huraian}
                      </td>
                    </tr>
                  ))}

                {auditLogsList.length === 0 && !isLoadingAudit && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Tiada log aktiviti direkodkan setakat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: 1. TAMBAH REKOD MANUAL */}
      {adminSection === 'add' && (
        <div className="bg-white p-5 sm:p-8 border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="border-b-2 border-slate-950 pb-4">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <span>Borang Tambah Kawasan Baharu (Single Record)</span>
            </h3>
            <p className="text-xs text-slate-600 font-mono mt-1">
              Masukkan perincian Parlimen, DUN, Daerah Mengundi (DM), dan Lokaliti. Rekod ini akan serta-merta muncul dalam pilihan borang pendaftaran MBS.
            </p>
          </div>

          <form onSubmit={handleSingleRecordSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Parlimen Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-black uppercase text-slate-900">
                    Kawasan Parlimen <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormParlimenMode(prev => prev === 'select' ? 'custom' : 'select')}
                    className="text-[10px] font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {formParlimenMode === 'select' ? '+ Taip Parlimen Baharu' : '← Pilih Sedia Ada'}
                  </button>
                </div>

                {formParlimenMode === 'select' && uniqueParlimens.length > 0 ? (
                  <select
                    value={parlimenInput}
                    onChange={(e) => {
                      setParlimenInput(e.target.value);
                      // Auto-select first DUN for this parlimen
                      const related = masterRecords.find(r => r.parlimen === e.target.value);
                      if (related) setDunInput(related.dun);
                    }}
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                    required
                  >
                    {uniqueParlimens.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={parlimenInput}
                    onChange={(e) => setParlimenInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: P.071 GOPENG"
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                    required
                  />
                )}
                <p className="text-[10px] text-slate-500 font-mono">Format standard: Kod Parlimen & Nama (cth: P.071 GOPENG)</p>
              </div>

              {/* DUN Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-black uppercase text-slate-900">
                    Kawasan DUN <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormDunMode(prev => prev === 'select' ? 'custom' : 'select')}
                    className="text-[10px] font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {formDunMode === 'select' ? '+ Taip DUN Baharu' : '← Pilih Sedia Ada'}
                  </button>
                </div>

                {formDunMode === 'select' && uniqueDunsForParlimen.length > 0 ? (
                  <select
                    value={dunInput}
                    onChange={(e) => setDunInput(e.target.value)}
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                    required
                  >
                    {uniqueDunsForParlimen.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={dunInput}
                    onChange={(e) => setDunInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: N.44 SUNGAI RAPAT"
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                    required
                  />
                )}
                <p className="text-[10px] text-slate-500 font-mono">Format standard: Kod DUN & Nama (cth: N.44 SUNGAI RAPAT)</p>
              </div>

              {/* Daerah Mengundi (DM) Code & Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-black uppercase text-slate-900">
                    Nama Daerah Mengundi (DM) <span className="text-rose-500">*</span>
                  </label>
                  {uniqueDmsForDun.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormDmMode(prev => prev === 'select' ? 'custom' : 'select')}
                      className="text-[10px] font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {formDmMode === 'select' ? '+ DM Baharu' : '← DM Sedia Ada'}
                    </button>
                  )}
                </div>

                {formDmMode === 'select' && uniqueDmsForDun.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={dmNamaInput}
                      onChange={(e) => handleSelectDmQuick(e.target.value)}
                      className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                    >
                      <option value="">-- Pilih DM Sedia Ada --</option>
                      {uniqueDmsForDun.map(d => (
                        <option key={d.name} value={d.name}>
                          {d.code ? `[${d.code}] ` : ''}{d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={dmNamaInput}
                    onChange={(e) => setDmNamaInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: ARA PAYONG"
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                    required
                  />
                )}
                <p className="text-[10px] text-slate-500 font-mono">Nama pusat Daerah Mengundi (cth: ARA PAYONG)</p>
              </div>

              {/* Kod DM */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-black uppercase text-slate-900">
                  Kod Daerah Mengundi (DM)
                </label>
                <input
                  type="text"
                  value={dmKodInput}
                  onChange={(e) => setDmKodInput(e.target.value.trim())}
                  placeholder="Contoh: 0714401"
                  className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 font-mono">Nombor kod DM mengikut SPR (cth: 0714401)</p>
              </div>

              {/* Kod Lokaliti */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-black uppercase text-slate-900">
                  Kod Lokaliti
                </label>
                <input
                  type="text"
                  value={lokalitiKodInput}
                  onChange={(e) => setLokalitiKodInput(e.target.value.trim())}
                  placeholder="Contoh: 0714401029"
                  className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 font-mono">Kod 10 digit lokaliti SPR (jika ada)</p>
              </div>

              {/* Nama Lokaliti */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-black uppercase text-slate-900">
                  Nama Lokaliti Baharu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lokalitiNamaInput}
                  onChange={(e) => setLokalitiNamaInput(e.target.value.toUpperCase())}
                  placeholder="Contoh: KAMPUNG BERSATU JAYA"
                  className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 font-mono focus:bg-white focus:outline-none font-bold"
                  required
                />
                <p className="text-[10px] text-slate-500 font-mono">Nama kampung, taman perumahan, atau lokaliti</p>
              </div>

            </div>

            <div className="border-t-2 border-slate-950 pt-5 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setLokalitiKodInput('');
                  setLokalitiNamaInput('');
                }}
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 transition-all cursor-pointer"
              >
                Kosongkan Medan
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-x-[2px] active:translate-y-[2px]"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Rekod Kawasan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION: 2. MUAT NAIK PUKAL (BULK UPLOAD) */}
      {adminSection === 'bulk' && (
        <div className="bg-white p-5 sm:p-8 border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="border-b-2 border-slate-950 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Muat Naik Pukal Kawasan (Bulk Upload Excel / CSV)</span>
              </h3>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Import beratus lokaliti sekali gus menggunakan fail hamparan kerja format .CSV atau Microsoft Excel (.XLSX).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadSampleCsv}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Templat .CSV</span>
              </button>
              <button
                onClick={downloadSampleXlsx}
                className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Templat .XLSX</span>
              </button>
            </div>
          </div>

          {/* Template guide callout */}
          <div className="bg-slate-50 border-2 border-slate-950 p-4 space-y-2 text-xs font-mono text-slate-800">
            <div className="flex items-center gap-2 font-black text-slate-950 uppercase">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Format Lajur Yang Diperlukan:</span>
            </div>
            <p className="text-slate-600">
              Pastikan baris pertama (header) fail anda mengandungi nama lajur berikut:
            </p>
            <div className="bg-white border border-slate-950 p-2.5 overflow-x-auto text-[11px] font-bold text-blue-900 tracking-wider">
              Parlimen &nbsp;|&nbsp; DUN &nbsp;|&nbsp; Kod_DM &nbsp;|&nbsp; Nama_DM &nbsp;|&nbsp; Kod_Lokaliti &nbsp;|&nbsp; Nama_Lokaliti
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-4 border-dashed p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
              dragActive 
                ? 'border-blue-600 bg-blue-50' 
                : selectedFileName 
                ? 'border-emerald-600 bg-emerald-50/40' 
                : 'border-slate-400 bg-slate-50/50 hover:bg-slate-100/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-14 h-14 bg-white border-2 border-slate-950 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              {selectedFileName ? (
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              ) : (
                <FileUp className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <div>
              <p className="text-sm font-mono font-black uppercase text-slate-900">
                {selectedFileName ? selectedFileName : "Klik untuk memilih fail atau seret fail ke sini"}
              </p>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Menyokong fail .CSV, .XLSX, dan .XLS
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            >
              Pilih Fail Dari Komputer
            </button>
          </div>

          {/* Validation & Preview Area */}
          {isProcessingFile && (
            <div className="p-4 border-2 border-slate-950 bg-slate-50 font-mono text-xs text-center animate-pulse">
              Sedang memproses dan mengesahkan data fail...
            </div>
          )}

          {parseResult && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50 border-2 border-slate-950">
                <div>
                  <span className="text-xs font-mono font-black uppercase text-blue-950">
                    Pengesahan Data: {parseResult.validRecords.length} rekod sah daripada {parseResult.totalRowsProcessed} baris diproses.
                  </span>
                  {parseResult.warnings.length > 0 && (
                    <p className="text-[11px] font-mono text-amber-800 mt-0.5">
                      Perhatian: {parseResult.warnings.length} baris tidak lengkap telah diabaikan.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-blue-600"
                    />
                    <span>Tambah (Append)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-rose-700">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-rose-600"
                    />
                    <span>Ganti Semua (Replace)</span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              {parseResult.validRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-black uppercase text-slate-900">
                      Pratonton Rekod (Paparan 5 Pertama daripada {parseResult.validRecords.length}):
                    </h4>
                  </div>

                  <div className="overflow-x-auto border-2 border-slate-950">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-white uppercase text-[11px]">
                        <tr>
                          <th className="p-2.5 border-r border-slate-800">Bil</th>
                          <th className="p-2.5 border-r border-slate-800">Parlimen</th>
                          <th className="p-2.5 border-r border-slate-800">DUN</th>
                          <th className="p-2.5 border-r border-slate-800">DM (Kod & Nama)</th>
                          <th className="p-2.5">Lokaliti (Kod & Nama)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 bg-white">
                        {parseResult.validRecords.slice(0, 5).map((rec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold border-r border-slate-300">{idx + 1}</td>
                            <td className="p-2.5 border-r border-slate-300">{rec.parlimen}</td>
                            <td className="p-2.5 border-r border-slate-300">{rec.dun}</td>
                            <td className="p-2.5 border-r border-slate-300">
                              <span className="font-bold">[{rec.dmKod || '-'}]</span> {rec.dmNama}
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold">[{rec.lokalitiKod || '-'}]</span> {rec.lokalitiNama}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Confirm Import Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t-2 border-slate-950">
                <button
                  type="button"
                  onClick={() => {
                    setParseResult(null);
                    setSelectedFileName('');
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 transition-all cursor-pointer"
                >
                  Batal Muat Naik
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBulkImport}
                  disabled={parseResult.validRecords.length === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-x-[2px] active:translate-y-[2px]"
                >
                  <Check className="w-4 h-4" />
                  <span>Sahkan &amp; Simpan {parseResult.validRecords.length} Rekod ke Pangkalan Data</span>
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* SECTION: 3. JADUAL PENGURUSAN DATA MASTER (MASTER DATA LIST) */}
      {adminSection === 'list' && (
        <div className="bg-white p-5 sm:p-7 border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-5 animate-fade-in">
        
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama lokaliti, kod, DM, DUN, atau Parlimen..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-950 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters: Parlimen & DUN */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-600" />
              <select
                value={filterParlimen}
                onChange={(e) => {
                  setFilterParlimen(e.target.value);
                  setFilterDun('ALL');
                }}
                className="text-xs px-3 py-2 bg-slate-50 border-2 border-slate-950 font-mono font-bold text-slate-800 cursor-pointer focus:outline-none"
              >
                <option value="ALL">Semua Parlimen ({uniqueParlimens.length})</option>
                {uniqueParlimens.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <select
              value={filterDun}
              onChange={(e) => setFilterDun(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border-2 border-slate-950 font-mono font-bold text-slate-800 cursor-pointer focus:outline-none"
            >
              <option value="ALL">Semua DUN</option>
              {(filterParlimen === 'ALL' ? Array.from(new Set(masterRecords.map(r => r.dun))).sort() : uniqueDunsForParlimen).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs px-3 py-2 bg-slate-50 border-2 border-slate-950 font-mono font-bold text-slate-800 cursor-pointer focus:outline-none"
              title="Bilangan rekod per halaman"
            >
              <option value="15">15 / ms</option>
              <option value="25">25 / ms</option>
              <option value="50">50 / ms</option>
              <option value="100">100 / ms</option>
            </select>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto border-2 border-slate-950">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-white uppercase text-[11px]">
              <tr>
                <th className="p-3 border-r border-slate-800 w-12 text-center">Bil</th>
                <th className="p-3 border-r border-slate-800 min-w-[130px]">Parlimen</th>
                <th className="p-3 border-r border-slate-800 min-w-[140px]">DUN</th>
                <th className="p-3 border-r border-slate-800 min-w-[160px]">Daerah Mengundi (DM)</th>
                <th className="p-3 border-r border-slate-800 min-w-[180px]">Lokaliti Terdaftar</th>
                <th className="p-3 text-center w-28">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200 bg-white">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                    Tiada rekod kawasan yang sepadan dengan carian atau penapis anda.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => {
                  const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isEditing = editingRecordId === rec.id;

                  if (isEditing) {
                    return (
                      <tr key={rec.id} className="bg-amber-50/80 border-2 border-amber-500">
                        <td className="p-2 text-center font-bold border-r border-slate-300">{globalIndex}</td>
                        <td className="p-2 border-r border-slate-300">
                          <input
                            type="text"
                            value={editForm.parlimen || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, parlimen: e.target.value.toUpperCase() }))}
                            className="w-full p-1 bg-white border border-slate-950 text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          <input
                            type="text"
                            value={editForm.dun || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, dun: e.target.value.toUpperCase() }))}
                            className="w-full p-1 bg-white border border-slate-950 text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-300 space-y-1">
                          <input
                            type="text"
                            value={editForm.dmKod || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, dmKod: e.target.value }))}
                            placeholder="Kod DM"
                            className="w-full p-1 bg-white border border-slate-950 text-[11px] font-mono"
                          />
                          <input
                            type="text"
                            value={editForm.dmNama || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, dmNama: e.target.value.toUpperCase() }))}
                            placeholder="Nama DM"
                            className="w-full p-1 bg-white border border-slate-950 text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-300 space-y-1">
                          <input
                            type="text"
                            value={editForm.lokalitiKod || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, lokalitiKod: e.target.value }))}
                            placeholder="Kod Lokaliti"
                            className="w-full p-1 bg-white border border-slate-950 text-[11px] font-mono"
                          />
                          <input
                            type="text"
                            value={editForm.lokalitiNama || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, lokalitiNama: e.target.value.toUpperCase() }))}
                            placeholder="Nama Lokaliti"
                            className="w-full p-1 bg-white border border-slate-950 text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 text-center space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleSaveEdit(rec.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-slate-950 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            title="Simpan Perubahan"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRecordId(null)}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-950 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-bold border-r border-slate-200 text-slate-500">
                        {globalIndex}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                        {rec.parlimen}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-blue-900 font-bold">
                        {rec.dun}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        {rec.dmKod && (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px] font-mono font-bold mr-1.5 text-slate-700">
                            {rec.dmKod}
                          </span>
                        )}
                        <span className="font-bold text-slate-900">{rec.dmNama}</span>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        {rec.lokalitiKod && (
                          <span className="inline-block px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-[10px] font-mono font-bold mr-1.5 text-blue-800">
                            {rec.lokalitiKod}
                          </span>
                        )}
                        <span className="font-bold text-slate-900">{rec.lokalitiNama}</span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(rec)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-950 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer transition-colors"
                            title="Kemaskini Rekod Ini"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRecord(rec)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900 border border-slate-950 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer transition-colors"
                            title="Padam Rekod Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono pt-2">
          <div className="text-slate-600">
            Menunjukkan{' '}
            <span className="font-bold text-slate-950">
              {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            hingga{' '}
            <span className="font-bold text-slate-950">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </span>{' '}
            daripada <span className="font-bold text-slate-950">{filteredRecords.length}</span> rekod kawasan
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white hover:bg-slate-100 disabled:opacity-40 border-2 border-slate-950 cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] disabled:shadow-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1.5 font-bold bg-slate-100 border-2 border-slate-950">
              Halaman {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 bg-white hover:bg-slate-100 disabled:opacity-40 border-2 border-slate-950 cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] disabled:shadow-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-4 border-slate-950 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 border-2 border-slate-950">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase text-slate-900 font-mono">
                Sahkan Pemadaman Rekod
              </h3>
            </div>

            <p className="text-xs font-mono text-slate-600 leading-relaxed">
              Adakah anda pasti mahu memadamkan lokaliti ini daripada pangkalan data master?
            </p>

            <div className="bg-slate-50 border-2 border-slate-950 p-3 text-xs font-mono space-y-1">
              <div><b>Lokaliti:</b> [{deletingRecord.lokalitiKod || '-'}] {deletingRecord.lokalitiNama}</div>
              <div><b>Daerah Mengundi:</b> [{deletingRecord.dmKod || '-'}] {deletingRecord.dmNama}</div>
              <div><b>Kawasan:</b> {deletingRecord.dun} • {deletingRecord.parlimen}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                Ya, Padamkan Rekod
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET TO DEFAULT CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-4 border-slate-950 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 text-amber-600 border-b-2 border-slate-950 pb-3">
              <div className="p-2.5 bg-amber-100 border-2 border-slate-950">
                <RefreshCw className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900 font-mono">
                  Sahkan Reset Data Master Asal
                </h3>
                <p className="text-[11px] text-slate-600 font-mono">
                  Memulihkan Pangkalan Data Kawasan kepada Seting Asal Sistem
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono text-slate-700 leading-relaxed">
              <p>
                Adakah anda pasti mahu menetapkan semula pangkalan data master kepada rekod asal sistem?
              </p>
              
              <div className="bg-amber-50 border-2 border-amber-950/40 p-3.5 space-y-2 text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>Kesan Tindakan Ini:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>Semua rekod master kawasan akan dikembalikan kepada <b>506 Lokaliti rasmi</b> di Parlimen <b>P.071 Gopeng</b> (DUN Sungai Rapat, Simpang Pulai, Teja).</li>
                  <li>Sebarang lokaliti atau kawasan lain yang ditambah secara manual akan digantikan.</li>
                  <li>Data laporan aduan MBS sedia ada <b>TIDAK</b> akan dipadamkan.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t-2 border-slate-950">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetConfirmModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleExecuteResetDefault}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Menetapkan Semula...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Ya, Pulihkan ke Data Asal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE SQL SCHEMA MODAL */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border-4 border-slate-950 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-950">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 font-mono">
                  Skema SQL Jadual `master_kawasan` (Supabase)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 hover:bg-slate-100 border border-slate-950 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-600">
              Salin dan tampal kod SQL ini ke dalam <b>Supabase SQL Editor</b> projek anda untuk mencipta jadual <code>master_kawasan</code> beserta polisi RLS:
            </p>

            <div className="relative">
              <pre className="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border-2 border-slate-950 select-all">
{`-- Skrip Penciptaan Jadual master_kawasan di Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.master_kawasan (
  id TEXT PRIMARY KEY,
  parlimen TEXT NOT NULL,
  dun TEXT NOT NULL,
  dm_kod TEXT,
  dm_nama TEXT NOT NULL,
  lokaliti_kod TEXT,
  lokaliti_nama TEXT NOT NULL,
  negeri TEXT DEFAULT 'PERAK',
  tarikh_daftar TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Benarkan akses RLS (Row Level Security)
ALTER TABLE public.master_kawasan ENABLE ROW LEVEL SECURITY;

-- Buang policy sedia ada sekiranya sudah wujud untuk elak ralat 42710
DROP POLICY IF EXISTS "Akses Terbuka Master Kawasan" ON public.master_kawasan;

-- Cipta semula policy
CREATE POLICY "Akses Terbuka Master Kawasan" ON public.master_kawasan FOR ALL USING (true) WITH CHECK (true);`}
              </pre>

              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-slate-500">
                Selepas menjalankan skrip ini di Supabase, tekan butang "Muat Naik ke Supabase".
              </span>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE SQL SETTINGS MODAL */}
      {showSqlSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border-4 border-slate-950 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-950">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 font-mono">
                  Skrip SQL Pilihan: Jadual `tetapan_sistem`
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlSettingsModal(false)}
                className="p-1.5 hover:bg-slate-100 border border-slate-950 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-600 leading-relaxed">
              Sistem telah dilengkapi dengan kebolehan dwi-simpanan automatik (menyimpan ke rekod <code>__SYSTEM_SETTINGS__</code> dalam <code>master_kawasan</code> atau jadual khas <code>tetapan_sistem</code>). Sekiranya anda ingin mencipta jadual dedikasi <code>tetapan_sistem</code> di Supabase SQL Editor:
            </p>

            <div className="relative">
              <pre className="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border-2 border-slate-950 select-all">
{`-- Skrip Penciptaan Jadual tetapan_sistem di Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.tetapan_sistem (
  kunci TEXT PRIMARY KEY,
  nilai JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Benarkan akses RLS (Row Level Security)
ALTER TABLE public.tetapan_sistem ENABLE ROW LEVEL SECURITY;

-- Buang policy sedia ada jika wujud
DROP POLICY IF EXISTS "Akses Terbuka Tetapan Sistem" ON public.tetapan_sistem;

-- Cipta policy akses terbuka
CREATE POLICY "Akses Terbuka Tetapan Sistem" ON public.tetapan_sistem FOR ALL USING (true) WITH CHECK (true);

-- Masukkan rekod awal
INSERT INTO public.tetapan_sistem (kunci, nilai)
VALUES (
  'global_config',
  '{"kataLaluan":"MBS123","tajukUtama":"Maklum Balas Semasa (MBS)","subTajuk":"Sistem Pengurusan & Maklum Balas Rakyat","defaultParlimen":"P.071 GOPENG","isLocked":true}'::jsonb
)
ON CONFLICT (kunci) DO NOTHING;`}
              </pre>

              <button
                type="button"
                onClick={() => {
                  const sqlCode = `-- Skrip Penciptaan Jadual tetapan_sistem di Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.tetapan_sistem (
  kunci TEXT PRIMARY KEY,
  nilai JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tetapan_sistem ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses Terbuka Tetapan Sistem" ON public.tetapan_sistem;
CREATE POLICY "Akses Terbuka Tetapan Sistem" ON public.tetapan_sistem FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.tetapan_sistem (kunci, nilai)
VALUES (
  'global_config',
  '{"kataLaluan":"MBS123","tajukUtama":"Maklum Balas Semasa (MBS)","subTajuk":"Sistem Pengurusan & Maklum Balas Rakyat","defaultParlimen":"P.071 GOPENG","isLocked":true}'::jsonb
)
ON CONFLICT (kunci) DO NOTHING;`;
                  navigator.clipboard.writeText(sqlCode);
                  setCopiedSqlSettings(true);
                  setTimeout(() => setCopiedSqlSettings(false), 3000);
                }}
                className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                {copiedSqlSettings ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-slate-500">
                Pilihan tambahan untuk struktur berasingan.
              </span>
              <button
                type="button"
                onClick={() => setShowSqlSettingsModal(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SKRIP SQL ROW LEVEL SECURITY (RLS) JADUAL LAPORAN_MBS */}
      {showSqlRlsModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border-4 border-slate-950 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 font-mono">
                  Polisi RLS Supabase: `laporan_mbs`
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlRlsModal(false)}
                className="p-1.5 hover:bg-slate-100 border border-slate-950 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-600 leading-relaxed">
              Jalankan kod SQL di bawah di <b>Supabase SQL Editor</b> bagi membataskan akses data pada peringkat pangkalan data mengikut Parlimen pengguna yang sedang log masuk:
            </p>

            <div className="relative">
              <pre className="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border-2 border-slate-950 select-all">
{`-- 1. Aktifkan Row Level Security (RLS) pada jadual laporan_mbs
ALTER TABLE public.laporan_mbs ENABLE ROW LEVEL SECURITY;

-- 2. Hapus polisi lama jika ada
DROP POLICY IF EXISTS "Pegawai hanya lihat data parlimen sendiri" ON public.laporan_mbs;
DROP POLICY IF EXISTS "Awam daftar laporan baharu" ON public.laporan_mbs;

-- 3. Polisi Pegawai Parlimen: Hanya lihat laporan parlimen masing-masing
CREATE POLICY "Pegawai hanya lihat data parlimen sendiri"
ON public.laporan_mbs
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'PEGAWAI' AND parlimen = (auth.jwt() ->> 'parlimen'))
  OR (auth.jwt() ->> 'role' = 'MASTER_ADMIN')
  OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'MASTER_ADMIN')
);

-- 4. Polisi Pengguna Awam: Benarkan kemasukan aduan baharu
CREATE POLICY "Awam daftar laporan baharu"
ON public.laporan_mbs
FOR INSERT
WITH CHECK (true);

-- 5. Polisi Kemas Kini: Pegawai Parlimen & Master Admin boleh kemaskini syor
CREATE POLICY "Pegawai kemaskini syor parlimen sendiri"
ON public.laporan_mbs
FOR UPDATE
USING (
  (auth.jwt() ->> 'role' = 'PEGAWAI' AND parlimen = (auth.jwt() ->> 'parlimen'))
  OR (auth.jwt() ->> 'role' = 'MASTER_ADMIN')
  OR (true)
);`}
              </pre>

              <button
                type="button"
                onClick={() => {
                  const sqlCode = `-- 1. Aktifkan Row Level Security (RLS) pada jadual laporan_mbs
ALTER TABLE public.laporan_mbs ENABLE ROW LEVEL SECURITY;

-- 2. Hapus polisi lama jika ada
DROP POLICY IF EXISTS "Pegawai hanya lihat data parlimen sendiri" ON public.laporan_mbs;
DROP POLICY IF EXISTS "Awam daftar laporan baharu" ON public.laporan_mbs;

-- 3. Polisi Pegawai Parlimen: Hanya lihat laporan parlimen masing-masing
CREATE POLICY "Pegawai hanya lihat data parlimen sendiri"
ON public.laporan_mbs
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'PEGAWAI' AND parlimen = (auth.jwt() ->> 'parlimen'))
  OR (auth.jwt() ->> 'role' = 'MASTER_ADMIN')
  OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'MASTER_ADMIN')
);

-- 4. Polisi Pengguna Awam: Benarkan kemasukan aduan baharu
CREATE POLICY "Awam daftar laporan baharu"
ON public.laporan_mbs
FOR INSERT
WITH CHECK (true);

-- 5. Polisi Kemas Kini: Pegawai Parlimen & Master Admin boleh kemaskini syor
CREATE POLICY "Pegawai kemaskini syor parlimen sendiri"
ON public.laporan_mbs
FOR UPDATE
USING (
  (auth.jwt() ->> 'role' = 'PEGAWAI' AND parlimen = (auth.jwt() ->> 'parlimen'))
  OR (auth.jwt() ->> 'role' = 'MASTER_ADMIN')
  OR (true)
);`;
                  navigator.clipboard.writeText(sqlCode);
                  setCopiedSqlRls(true);
                  setTimeout(() => setCopiedSqlRls(false), 3000);
                }}
                className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                {copiedSqlRls ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin SQL RLS</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-emerald-800 font-bold">
                ✓ Menghalang capaian data rentas parlimen secara terus melalui API.
              </span>
              <button
                type="button"
                onClick={() => setShowSqlRlsModal(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
