/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MBSReport, RegionLockSettings, ParlimenDunData, MasterKawasanRecord, TabType, SystemSettings, UserRole } from '../types';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  ArrowRight,
  TrendingUp,
  Inbox,
  Calendar,
  Award,
  Lock,
  Unlock,
  Sliders,
  Layers,
  ShieldCheck,
  Database,
  RefreshCw,
  Radio,
  Code,
  Copy,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { 
  formatParlimenCleanName, 
  isMatchingParlimen, 
  loadRegionLockSettings, 
  REGION_LOCK_STORAGE_KEY 
} from '../utils/masterDataManager';
import { 
  fetchLaporanMbs, 
  subscribeToLaporanMbs, 
  isSupabaseConfigured 
} from '../lib/supabaseClient';

interface DashboardProps {
  reports: MBSReport[];
  setActiveTab: (tab: TabType) => void;
  regionLockSettings?: RegionLockSettings;
  systemSettings?: SystemSettings;
  parlimenDunList?: ParlimenDunData[];
  masterRecords?: MasterKawasanRecord[];
  currentRole?: UserRole;
}

export function Dashboard({ 
  reports, 
  setActiveTab, 
  regionLockSettings: propLockSettings,
  systemSettings,
  parlimenDunList = [],
  masterRecords = [],
  currentRole = 'user'
}: DashboardProps) {
  // 1. STATE MANAGEMENT: Synchronize region lock settings on initial load and updates
  const [currentRegionLock, setCurrentRegionLock] = React.useState<RegionLockSettings>(() => {
    return propLockSettings || (systemSettings ? {
      defaultParlimen: systemSettings.defaultParlimen,
      isLocked: systemSettings.isLocked
    } : loadRegionLockSettings());
  });

  React.useEffect(() => {
    if (propLockSettings) {
      setCurrentRegionLock(propLockSettings);
    } else if (systemSettings) {
      setCurrentRegionLock({
        defaultParlimen: systemSettings.defaultParlimen,
        isLocked: systemSettings.isLocked
      });
    }
  }, [propLockSettings, systemSettings]);

  // Supabase Real-time state
  const [supabaseReports, setSupabaseReports] = React.useState<MBSReport[] | null>(null);
  const [isLoadingSupabase, setIsLoadingSupabase] = React.useState<boolean>(false);
  const [supabaseError, setSupabaseError] = React.useState<string | null>(null);
  const [isTableMissing, setIsTableMissing] = React.useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = React.useState<boolean>(false);
  const [copiedSql, setCopiedSql] = React.useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);

  // Function to load records from Supabase
  const loadSupabaseData = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    setIsLoadingSupabase(true);
    setSupabaseError(null);
    try {
      const { data, error } = await fetchLaporanMbs();
      if (error) {
        if ((error as any).code === 'PGRST205' || (error as any).isMissingTable) {
          setIsTableMissing(true);
          setSupabaseError(null);
        } else {
          setSupabaseError(error.message);
        }
      } else if (data) {
        setIsTableMissing(false);
        setSupabaseReports(data);
        setLastSyncTime(new Date());
      } else {
        setIsTableMissing(false);
      }
    } catch (err: any) {
      setSupabaseError(err.message || 'Ralat memuat data Supabase');
    } finally {
      setIsLoadingSupabase(false);
    }
  }, []);

  const handleCopySql = () => {
    const sql = `-- Skrip Penciptaan Jadual laporan_mbs di Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.laporan_mbs (
  id TEXT PRIMARY KEY,
  bil INT,
  parlimen TEXT NOT NULL,
  dun TEXT NOT NULL,
  dm TEXT NOT NULL,
  lokaliti TEXT NOT NULL,
  pernyataan_mbs TEXT NOT NULL,
  kategori TEXT NOT NULL,
  pelapor_nama TEXT NOT NULL,
  pelapor_tel TEXT NOT NULL,
  disediakan_oleh TEXT NOT NULL,
  penghantar_jawatan TEXT NOT NULL,
  gambar_url TEXT,
  status TEXT DEFAULT 'Baru',
  syor TEXT,
  syor_tarikh TEXT,
  syor_oleh TEXT,
  tarikh_aduan TEXT NOT NULL,
  tarikh_kemaskini TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Benarkan akses RLS (Row Level Security)
ALTER TABLE public.laporan_mbs ENABLE ROW LEVEL SECURITY;

-- Buang policy sedia ada sekiranya sudah wujud untuk elak ralat 42710
DROP POLICY IF EXISTS "Akses Terbuka Laporan MBS" ON public.laporan_mbs;

-- Cipta semula policy
CREATE POLICY "Akses Terbuka Laporan MBS" ON public.laporan_mbs FOR ALL USING (true) WITH CHECK (true);

-- Skrip Penciptaan Jadual master_kawasan di Supabase SQL Editor
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

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Fetch on mount & subscribe to Supabase PostgreSQL real-time changes
  React.useEffect(() => {
    loadSupabaseData();

    // Listen to real-time events (insert, update, delete) on laporan_mbs
    const unsubscribe = subscribeToLaporanMbs((payload) => {
      console.log('[Dashboard Supabase Real-Time Event]:', payload);
      loadSupabaseData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadSupabaseData]);

  // Read directly from Supabase reports as primary source of truth, fallback to synced reports prop
  const activeReportsDataset = (isSupabaseConfigured && supabaseReports !== null) 
    ? supabaseReports 
    : reports;
  const isUsingSupabaseData = Boolean(isSupabaseConfigured && !isTableMissing);

  // Keep state instantly in sync when prop updates from parent (without page reload)
  React.useEffect(() => {
    if (propLockSettings) {
      setCurrentRegionLock(propLockSettings);
    }
  }, [propLockSettings]);

  // Real-time synchronization across storage and window events
  React.useEffect(() => {
    const handleSync = () => {
      setCurrentRegionLock(loadRegionLockSettings());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('mbs_region_lock_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('mbs_region_lock_updated', handleSync);
    };
  }, []);

  const isLocked = Boolean(currentRegionLock.isLocked);
  const defaultParlimen = currentRegionLock.defaultParlimen || 'P.071 GOPENG';

  // Active filter state: when locked, strictly locked to defaultParlimen; when unlocked, can be toggled
  const [selectedFilter, setSelectedFilter] = React.useState<string>(defaultParlimen);

  // Automatically update selected filter when defaultParlimen changes in Admin Portal
  React.useEffect(() => {
    setSelectedFilter(defaultParlimen);
  }, [defaultParlimen, isLocked]);

  // Determine active parlimen to display
  const activeParlimen = isLocked ? defaultParlimen : selectedFilter;
  const isAllKawasan = !isLocked && activeParlimen === 'SEMUA';

  // Format clean Title Case Parlimen name (e.g. "P.071 GOPENG" -> "Gopeng", "P.078 CAMERON HIGHLANDS" -> "Cameron Highlands")
  const cleanParlimenName = React.useMemo(() => {
    if (isAllKawasan) return 'Semua Kawasan';
    return formatParlimenCleanName(activeParlimen);
  }, [activeParlimen, isAllKawasan]);

  // Extract all distinct Parlimens from master records, parlimenDunList, and reports
  const allAvailableParlimens = React.useMemo(() => {
    const set = new Set<string>();
    if (defaultParlimen) set.add(defaultParlimen);
    parlimenDunList.forEach(p => { if (p.parlimen) set.add(p.parlimen); });
    masterRecords.forEach(r => { if (r.parlimen) set.add(r.parlimen); });
    activeReportsDataset.forEach(r => { if (r.parlimen) set.add(r.parlimen); });
    return Array.from(set).sort();
  }, [defaultParlimen, parlimenDunList, masterRecords, activeReportsDataset]);

  // 2. DATA FILTERING: Strictly filter reports to active Parlimen
  const filteredReports = React.useMemo(() => {
    if (isAllKawasan) return activeReportsDataset;
    return activeReportsDataset.filter(r => isMatchingParlimen(r.parlimen, activeParlimen));
  }, [activeReportsDataset, activeParlimen, isAllKawasan]);

  // Extract unique months for submitter table
  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always include the current month
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7); // "YYYY-MM"
    monthsSet.add(currentMonthStr);

    filteredReports.forEach(r => {
      if (r.tarikhAduan) {
        const m = r.tarikhAduan.substring(0, 7);
        if (m.match(/^\d{4}-\d{2}$/)) {
          monthsSet.add(m);
        }
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [filteredReports]);

  const [selectedMonth, setSelectedMonth] = React.useState(availableMonths[0] || new Date().toISOString().substring(0, 7));

  // Reset selectedMonth if it's no longer in availableMonths
  React.useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // 3. STATISTICAL CALCULATIONS: Strictly based on filteredReports
  const total = filteredReports.length;
  const baruCount = filteredReports.filter(r => r.status === 'Baru').length;
  const dalamTindakanCount = filteredReports.filter(r => r.status === 'Dalam Tindakan').length;
  const selesaiCount = filteredReports.filter(r => r.status === 'Selesai').length;

  // Percentage calculations
  const selesaiPercent = total > 0 ? Math.round((selesaiCount / total) * 100) : 0;
  const tindakanPercent = total > 0 ? Math.round((dalamTindakanCount / total) * 100) : 0;
  const baruPercent = total > 0 ? Math.round((baruCount / total) * 100) : 0;

  // Category counts based strictly on filteredReports
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach(r => {
      const cat = r.kategori || 'Lain-lain';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [filteredReports]);

  // Submitter stats based strictly on filteredReports for selected month
  const submitterStats = React.useMemo(() => {
    const statsMap = new Map<string, { name: string; jawatan: string; count: number; activeReports: MBSReport[] }>();

    filteredReports.forEach(r => {
      const name = (r.disediakanOleh || r.pelaporNama || "Pegawai Bertugas").trim();
      const jawatan = (r.penghantarJawatan || "Pendidik Masyarakat").trim();
      const dateStr = r.tarikhAduan;
      if (!dateStr) return;
      const reportMonth = dateStr.substring(0, 7); // YYYY-MM

      if (reportMonth === selectedMonth) {
        const key = name.toUpperCase();
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            name,
            jawatan,
            count: 0,
            activeReports: []
          });
        }
        const existing = statsMap.get(key)!;
        existing.count += 1;
        existing.activeReports.push(r);
        existing.jawatan = jawatan;
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [filteredReports, selectedMonth]);

  // Dynamic list of DUNs for active Parlimen
  const activeDuns = React.useMemo(() => {
    if (isAllKawasan) {
      const set = new Set<string>();
      masterRecords.forEach(r => { if (r.dun) set.add(r.dun); });
      if (set.size === 0) {
        parlimenDunList.forEach(p => p.dunList.forEach(d => set.add(d)));
      }
      return Array.from(set).sort();
    }

    // Match from parlimenDunList
    const matched = parlimenDunList.find(p => isMatchingParlimen(p.parlimen, activeParlimen));
    if (matched && matched.dunList.length > 0) {
      return matched.dunList;
    }

    // Match from masterRecords
    const set = new Set<string>();
    masterRecords.forEach(r => {
      if (isMatchingParlimen(r.parlimen, activeParlimen) && r.dun) {
        set.add(r.dun);
      }
    });
    if (set.size > 0) {
      return Array.from(set).sort();
    }

    // Fallback: match from reports
    filteredReports.forEach(r => {
      if (r.dun) set.add(r.dun);
    });
    return Array.from(set).sort();
  }, [activeParlimen, isAllKawasan, parlimenDunList, masterRecords, filteredReports]);

  // Dynamic DUN summary text for banner
  const dunSummaryText = React.useMemo(() => {
    if (activeDuns.length === 0) return '';
    if (activeDuns.length === 1) return `merangkumi kawasan ${activeDuns[0]}`;
    if (activeDuns.length <= 3) {
      const allExceptLast = activeDuns.slice(0, -1).join(', ');
      const last = activeDuns[activeDuns.length - 1];
      return `merangkumi ${allExceptLast}, dan ${last}`;
    }
    return `merangkumi ${activeDuns.length} kawasan DUN berdaftar`;
  }, [activeDuns]);

  const formatMonthMalay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNamesMalay: { [key: string]: string } = {
      '01': 'Januari',
      '02': 'Februari',
      '03': 'Mac',
      '04': 'April',
      '05': 'Mei',
      '06': 'Jun',
      '07': 'Julai',
      '08': 'Ogos',
      '09': 'September',
      '10': 'Oktober',
      '11': 'November',
      '12': 'Disember'
    };
    return `${monthNamesMalay[month] || month} ${year}`;
  };

  return (
    <div id="dashboard-view" className="space-y-8">
      {/* 1. WELCOME BANNER - DYNAMIC TITLE ACCORDING TO ACTIVE / LOCKED PARLIMEN */}
      <div 
        id="dashboard-hero-banner"
        className="bg-blue-600 border-4 border-slate-950 rounded-none p-6 sm:p-10 text-white relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-slate-950/20 to-transparent opacity-60 pointer-events-none"></div>
        <div className="max-w-3xl relative z-10 space-y-4">
          
          {/* Status Badge: Locked vs Unlocked */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 bg-slate-950 text-white text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-none border border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Sistem Laporan Elektronik</span>
            </span>

            {isLocked ? (
              <span 
                id="dashboard-lock-badge"
                className="inline-flex items-center space-x-1.5 bg-amber-400 text-slate-950 text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded-none border border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kawasan Dikunci Pentadbir: {activeParlimen}</span>
              </span>
            ) : (
              <span 
                id="dashboard-unlock-badge"
                className="inline-flex items-center space-x-1.5 bg-blue-950/80 text-blue-100 text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded-none border border-blue-400/40"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Kawasan: {isAllKawasan ? 'Semua Kawasan' : activeParlimen}</span>
              </span>
            )}

            {/* Supabase Realtime Status Indicator */}
            <div 
              id="dashboard-supabase-badge"
              className="inline-flex items-center space-x-2 bg-slate-950/90 text-white text-[10px] font-mono px-3 py-1.5 rounded-none border border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${isUsingSupabaseData ? 'bg-emerald-400 animate-pulse' : isSupabaseConfigured ? 'bg-blue-400' : 'bg-slate-400'}`} />
                <span className="font-black uppercase tracking-wider">
                  {isUsingSupabaseData 
                    ? `Supabase Real-Time: ${activeReportsDataset.length} Rekod (laporan_mbs)` 
                    : isTableMissing
                      ? 'Supabase: Menunggu Jadual SQL'
                      : isSupabaseConfigured 
                        ? 'Supabase: Menunggu Rekod' 
                        : 'Data Tempatan (Sedia untuk Supabase)'}
                </span>
              </span>
              <button
                type="button"
                onClick={loadSupabaseData}
                disabled={isLoadingSupabase}
                className="ml-1 text-slate-300 hover:text-white p-0.5 cursor-pointer disabled:opacity-50"
                title="Muat semula rekod dari Supabase secara langsung"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingSupabase ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* DYNAMIC MAIN TITLE: "Maklum Balas Semasa (MBS) Kawasan [Nama Parlimen]" */}
          <h2 
            id="dashboard-main-heading"
            className="text-3xl sm:text-6xl font-black tracking-tighter uppercase leading-none block"
          >
            {isAllKawasan ? (
              <>{systemSettings?.tajukUtama || 'Maklum Balas Semasa (MBS)'}<br />Seluruh Kawasan</>
            ) : (
              <>{systemSettings?.tajukUtama || 'Maklum Balas Semasa (MBS)'}<br />Kawasan {cleanParlimenName}</>
            )}
          </h2>

          {/* Dynamic description matching the Parlimen and DUNs */}
          <p 
            id="dashboard-main-description"
            className="text-blue-100 text-xs sm:text-sm font-mono uppercase tracking-wider max-w-xl leading-relaxed"
          >
            {systemSettings?.subTajuk
              ? `${systemSettings.subTajuk} • ${isAllKawasan ? 'Semua Parlimen & DUN' : `Parlimen ${cleanParlimenName}`}`
              : (isAllKawasan
                ? 'Daftar aduan dan laporan semasa merangkumi semua Parlimen dan DUN yang berdaftar dalam sistem.'
                : `Daftar aduan dan laporan semasa bagi Parlimen ${cleanParlimenName} (${activeParlimen}) ${dunSummaryText} dengan pantas dan teratur.`
              )}
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('form')}
              className="px-6 py-3.5 bg-slate-950 text-white hover:bg-slate-900 font-extrabold text-xs tracking-widest uppercase rounded-none transition duration-200 flex items-center space-x-2 shadow-lg cursor-pointer border-2 border-slate-950"
            >
              <span>Hantar Laporan MBS</span>
              <PlusIcon className="w-4 h-4 text-blue-400" />
            </button>
            {currentRole !== 'user' && (
              <button
                onClick={() => setActiveTab('reports')}
                className="px-6 py-3.5 bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-xs tracking-widest uppercase rounded-none transition duration-200 border-2 border-slate-950 flex items-center space-x-2 cursor-pointer shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              >
                <span>Lihat Lampiran A</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MISSING SUPABASE TABLE NOTICE */}
      {isTableMissing && (
        <div 
          id="dashboard-supabase-missing-table-banner"
          className="bg-amber-50 border-2 border-slate-950 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase text-slate-900">
                  Klien Supabase Bersambung: Jadual `laporan_mbs` Belum Dicipta
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-300 text-amber-950 border border-slate-950">
                  MOD TEMPATAN AKTIF
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                Data laporan anda kini disimpan secara selamat dalam storan tempatan. Untuk mengaktifkan pangkalan data cloud, salin dan jalankan skrip SQL di Supabase SQL Editor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSqlGuide(true)}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-end sm:self-center"
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>Skrip SQL Supabase</span>
          </button>
        </div>
      )}

      {/* FILTER CONTROL (Displayed when region lock is not enforcing a single region) */}
      {!isLocked && (
        <div 
          id="dashboard-region-filter-bar"
          className="bg-white border-2 border-slate-950 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-mono font-black uppercase text-slate-900">
              Penapis Kawasan Papan Utama:
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              (Mod Bebas • Kawasan Lalai: {defaultParlimen})
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border-2 border-slate-950 font-mono font-bold text-xs uppercase text-slate-900 focus:outline-none cursor-pointer w-full sm:w-auto"
            >
              <option value="SEMUA">-- SEMUA KAWASAN --</option>
              {allAvailableParlimens.map((p) => (
                <option key={p} value={p}>
                  {p} {p === defaultParlimen ? '(Lalai)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 2. NUMERICAL STATS GRID (KPI CARDS) - FILTERED STRICTLY TO ACTIVE PARLIMEN */}
      <div id="dashboard-kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Case Card */}
        <div className="bg-white border-2 border-slate-950 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Jumlah Laporan</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-none border border-blue-150">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">{total}</h3>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-1.5 truncate" title={isAllKawasan ? 'Semua Kawasan' : activeParlimen}>
              {isAllKawasan ? 'Semua Kawasan' : activeParlimen}
            </p>
          </div>
        </div>

        {/* Status Baru */}
        <div className="bg-white border-2 border-slate-950 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Aduan Baru</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-none border border-rose-150">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">{baruCount}</h3>
            <div className="w-full bg-slate-100 h-2.5 rounded-none mt-2 overflow-hidden border border-slate-950">
              <div 
                className="bg-rose-500 h-full rounded-none transition-all duration-500" 
                style={{ width: `${baruPercent}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-450 mt-1.5 flex justify-between font-mono uppercase tracking-wider">
              <span>Baru</span>
              <span>{baruPercent}%</span>
            </p>
          </div>
        </div>

        {/* Status Dalam Tindakan */}
        <div className="bg-white border-2 border-slate-950 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Dalam Siasatan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-none border border-amber-150">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">{dalamTindakanCount}</h3>
            <div className="w-full bg-slate-100 h-2.5 rounded-none mt-2 overflow-hidden border border-slate-950">
              <div 
                className="bg-amber-500 h-full rounded-none transition-all duration-500" 
                style={{ width: `${tindakanPercent}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-450 mt-1.5 flex justify-between font-mono uppercase tracking-wider">
              <span>Proses</span>
              <span>{tindakanPercent}%</span>
            </p>
          </div>
        </div>

        {/* Status Selesai */}
        <div className="bg-white border-2 border-slate-950 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Selesai</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-none border border-emerald-150">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">{selesaiCount}</h3>
            <div className="w-full bg-slate-100 h-2.5 rounded-none mt-2 overflow-hidden border border-slate-950">
              <div 
                className="bg-emerald-600 h-full rounded-none transition-all duration-500" 
                style={{ width: `${selesaiPercent}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-450 mt-1.5 flex justify-between font-mono uppercase tracking-wider">
              <span>Selesai</span>
              <span>{selesaiPercent}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. VISUAL CHARTS & REGION SUMMARY BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <div className="bg-white border-2 border-slate-950 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-4">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">Pecahan Isu Mengikut Kategori</h4>
            <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
              {isAllKawasan ? 'Aduan merangkumi semua kawasan' : `Aduan bagi Parlimen ${activeParlimen}`}
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {total === 0 ? (
              <div className="text-center py-10">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
                <p className="text-slate-400 text-xs font-mono uppercase mt-2 font-bold">
                  Tiada data laporan dimasukkan bagi {isAllKawasan ? 'semua kawasan' : activeParlimen} lagi.
                </p>
              </div>
            ) : (
              (Object.entries(categoryCounts) as [string, number][]).map(([cat, count]) => {
                const percent = Math.round((count / total) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-900 font-extrabold truncate max-w-[70%]">{cat}</span>
                      <span className="text-slate-500 font-mono">{count} aduan ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-none overflow-hidden border border-slate-950">
                      <div 
                        className="bg-blue-600 h-full rounded-none" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Region stats & quick summary */}
        <div className="bg-white border-2 border-slate-950 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">Ringkasan Statistik Semasa</h4>
            <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
              {isAllKawasan ? 'Semua Kawasan Berdaftar' : `Parlimen ${activeParlimen} Sahaja`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="bg-slate-50 p-4 border border-slate-950 rounded-none space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-550">
                <MapPin className="w-4 h-4 text-slate-900" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none">Parlimen</span>
              </div>
              <p className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate" title={isAllKawasan ? 'SEMUA KAWASAN' : activeParlimen}>
                {isAllKawasan ? 'SEMUA KAWASAN' : activeParlimen}
              </p>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                {isLocked ? 'Kawasan Dikunci' : 'Kawasan Aktif'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-950 rounded-none space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-550">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none">Penyelesaian</span>
              </div>
              <p className="text-lg sm:text-xl font-black text-blue-600 leading-tight">{selesaiPercent}%</p>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Kadar Selesai</p>
            </div>
          </div>

          {/* DYNAMIC LIST OF DUNs */}
          <div className="border-t border-slate-950 pt-4 space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Dewan Undangan Negeri (DUN) Terlibat
            </h5>
            {activeDuns.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono">Tiada rekod DUN berdaftar untuk kawasan ini.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 font-mono max-h-32 overflow-y-auto">
                {activeDuns.map((dunName, idx) => (
                  <span 
                    key={dunName} 
                    className={`text-xs px-2.5 py-1.5 rounded-none uppercase tracking-wider border border-slate-950 ${
                      idx === 0 ? 'bg-slate-950 text-white' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {dunName}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. SECTION 3: REKOD & PRESTASI PENGHANTAR MBS BULANAN (FILTERED) */}
      <div className="bg-white border-2 border-slate-950 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-slate-950 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-600 text-white rounded-none border border-slate-950 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
                <Award className="w-4 h-4" />
              </div>
              <h4 className="text-base font-black uppercase tracking-wider text-slate-900">Prestasi & Rekod Penghantar MBS</h4>
            </div>
            <p className="text-[11px] text-slate-450 font-mono uppercase tracking-wider">
              Jumlah laporan dihitung dan dipantau bagi {isAllKawasan ? 'semua kawasan' : activeParlimen} mengikut bulan
            </p>
          </div>

          {/* Month selector dropdown */}
          <div className="flex items-center space-x-2 bg-slate-50 border-2 border-slate-950 px-3 py-2 self-start sm:self-center shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <Calendar className="w-4 h-4 text-slate-900 animate-pulse" />
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
              }}
              className="bg-transparent text-xs font-mono font-black uppercase text-slate-900 focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthMalay(m).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {submitterStats.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-300">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
            <p className="text-slate-500 text-xs font-mono uppercase mt-2 font-bold">
              Tiada rekod penghantaran MBS didaftarkan bagi {formatMonthMalay(selectedMonth).toUpperCase()} untuk {isAllKawasan ? 'semua kawasan' : activeParlimen}.
            </p>
          </div>
        ) : (
          <div className="border-2 border-slate-950 overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white min-w-[500px]">
              <thead>
                <tr className="bg-slate-950 text-white text-[10px] font-mono uppercase tracking-wider">
                  <th className="p-3.5 border-r border-slate-800 text-center w-16">Bil</th>
                  <th className="p-3.5 border-r border-slate-800">Nama Penghantar</th>
                  <th className="p-3.5 border-r border-slate-800">Jawatan</th>
                  <th className="p-3.5 text-center w-40">Jumlah Pelaporan</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-950 text-xs font-mono">
                {submitterStats.map((sub, idx) => (
                  <tr key={sub.name} className="hover:bg-slate-50">
                    <td className="p-3.5 border-r-2 border-slate-950 font-bold text-center bg-slate-100">{idx + 1}</td>
                    <td className="p-3.5 border-r-2 border-slate-950 font-extrabold uppercase text-slate-900 font-sans tracking-tight text-sm">
                      {sub.name}
                    </td>
                    <td className="p-3.5 border-r-2 border-slate-950">
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 text-[10px] font-bold uppercase rounded-none">
                        {sub.jawatan}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block bg-slate-950 text-white px-3 py-1 font-black text-xs min-w-[32px] text-center border border-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(29,78,216,1)]">
                        {sub.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SQL SCHEMA MODAL */}
      {showSqlGuide && (
        <div 
          id="dashboard-sql-guide-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border-4 border-slate-950 max-w-2xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-slate-950 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-mono font-black text-sm uppercase text-slate-950">
                  Skrip SQL Supabase untuk Pangkalan Data
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlGuide(false)}
                className="p-1 hover:bg-slate-100 border border-slate-950 cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            <p className="text-xs text-slate-700 font-mono leading-relaxed">
              Jadual <code className="bg-slate-100 px-1 py-0.5 border border-slate-300 font-bold">public.laporan_mbs</code> dan <code className="bg-slate-100 px-1 py-0.5 border border-slate-300 font-bold">public.master_kawasan</code> perlu diwujudkan di projek Supabase anda. Salin arahan SQL di bawah dan jalankan dalam <span className="font-bold">SQL Editor</span> di papan pemuka Supabase:
            </p>

            <div className="relative">
              <pre className="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] overflow-x-auto max-h-72 border-2 border-slate-950 leading-relaxed">
{`-- 1. JADUAL LAPORAN MBS
CREATE TABLE IF NOT EXISTS public.laporan_mbs (
  id TEXT PRIMARY KEY,
  bil INT,
  parlimen TEXT NOT NULL,
  dun TEXT NOT NULL,
  dm TEXT NOT NULL,
  lokaliti TEXT NOT NULL,
  pernyataan_mbs TEXT NOT NULL,
  kategori TEXT NOT NULL,
  pelapor_nama TEXT NOT NULL,
  pelapor_tel TEXT NOT NULL,
  disediakan_oleh TEXT NOT NULL,
  penghantar_jawatan TEXT NOT NULL,
  gambar_url TEXT,
  status TEXT DEFAULT 'Baru',
  syor TEXT,
  syor_tarikh TEXT,
  syor_oleh TEXT,
  tarikh_aduan TEXT NOT NULL,
  tarikh_kemaskini TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Benarkan akses RLS (Row Level Security)
ALTER TABLE public.laporan_mbs ENABLE ROW LEVEL SECURITY;

-- Buang policy sedia ada sekiranya sudah wujud untuk elak ralat 42710
DROP POLICY IF EXISTS "Akses Terbuka Laporan MBS" ON public.laporan_mbs;

-- Cipta semula policy
CREATE POLICY "Akses Terbuka Laporan MBS" ON public.laporan_mbs FOR ALL USING (true) WITH CHECK (true);

-- 2. JADUAL MASTER KAWASAN (PORTAL ADMIN)
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
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] font-mono text-slate-500">
                Selepas menjalankan skrip SQL di Supabase, tekan butang &quot;Muat Semula&quot; untuk menyambung secara langsung.
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Berjaya Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin SQL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlGuide(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-950 font-mono text-xs font-bold uppercase border-2 border-slate-950 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2.5} 
      stroke="currentColor" 
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
