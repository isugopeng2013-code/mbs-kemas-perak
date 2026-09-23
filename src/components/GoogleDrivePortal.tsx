/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  FolderSync, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  FileCode, 
  Image as ImageIcon,
  FolderOpen,
  LogOut,
  X
} from 'lucide-react';
import { MBSReport, MasterKawasanRecord } from '../types';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken, 
  initAuth, 
  getOrCreateMBSFolder, 
  uploadFileToDrive, 
  listDriveFiles, 
  deleteDriveFile, 
  downloadDriveFileContent,
  DriveFileItem,
  auth
} from '../services/googleDriveService';
import { User } from 'firebase/auth';
import * as XLSX from 'xlsx';

interface GoogleDrivePortalProps {
  reports: MBSReport[];
  masterRecords: MasterKawasanRecord[];
  onRestoreReports?: (restoredReports: MBSReport[]) => void;
}

export function GoogleDrivePortal({
  reports,
  masterRecords,
  onRestoreReports
}: GoogleDrivePortalProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [driveFolder, setDriveFolder] = useState<{ id: string; name: string; webViewLink?: string } | null>(null);

  // Files in Google Drive
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'excel' | 'backup' | 'images'>('all');

  // Actions & Upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modal for Destructive Operations (MANDATORY per Workspace guidelines)
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DriveFileItem | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<DriveFileItem | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check initial auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
        if (token) {
          loadDriveFolderAndFiles();
        }
      },
      () => {
        setCurrentUser(null);
        setHasToken(false);
        setFiles([]);
        setDriveFolder(null);
      }
    );

    // Initial check
    getAccessToken().then(tok => {
      setHasToken(!!tok);
      if (tok && auth.currentUser) {
        setCurrentUser(auth.currentUser);
        loadDriveFolderAndFiles();
      }
    });

    return () => unsubscribe();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(prev => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        showNotification('success', `Berjaya log masuk Google sebagai ${res.user.email}`);
        await loadDriveFolderAndFiles();
      }
    } catch (err: any) {
      console.error('Ralat sign-in:', err);
      showNotification('error', err.message || 'Gagal log masuk ke Google Drive.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setHasToken(false);
      setFiles([]);
      setDriveFolder(null);
      showNotification('info', 'Anda telah log keluar dari Google Drive.');
    } catch (err: any) {
      console.error('Ralat logout:', err);
      showNotification('error', 'Gagal log keluar.');
    }
  };

  const loadDriveFolderAndFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const folder = await getOrCreateMBSFolder('Sistem Laporan MBS 2026');
      setDriveFolder(folder);
      const fileList = await listDriveFiles({ folderId: folder.id });
      setFiles(fileList);
    } catch (err: any) {
      console.error('Ralat memuat fail Google Drive:', err);
      showNotification('error', `Ralat sambungan Google Drive: ${err.message}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // 1. Backup Full Reports (JSON) to Google Drive
  const handleBackupReports = async () => {
    if (!hasToken) {
      handleSignIn();
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg('Menyediakan sandaran data MBS...');
    try {
      const folder = driveFolder || (await getOrCreateMBSFolder('Sistem Laporan MBS 2026'));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `MBS_Sandaran_Penuh_${timestamp}.json`;

      const backupData = {
        tarikhSandaran: new Date().toISOString(),
        versiSistem: 'Lampiran A Standard 2026',
        jumlahLaporan: reports.length,
        jumlahKawasanMaster: masterRecords.length,
        laporanMBS: reports,
        masterKawasan: masterRecords
      };

      setUploadProgressMsg('Memuat naik fail sandaran ke Google Drive...');
      const uploaded = await uploadFileToDrive({
        name: fileName,
        mimeType: 'application/json',
        content: JSON.stringify(backupData, null, 2),
        folderId: folder.id,
        description: `Sandaran lengkap ${reports.length} rekod MBS dan ${masterRecords.length} rekod master kawasan.`
      });

      showNotification('success', `Sandaran berjaya dimuat naik: ${uploaded.name}`);
      await loadDriveFolderAndFiles();
    } catch (err: any) {
      console.error('Ralat sandaran:', err);
      showNotification('error', `Gagal membuat sandaran ke Google Drive: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  // 2. Export Excel Format (.xls) to Google Drive
  const handleExportExcelToDrive = async () => {
    if (!hasToken) {
      handleSignIn();
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg('Menjana lembaran Excel MBS rasmi...');
    try {
      const folder = driveFolder || (await getOrCreateMBSFolder('Sistem Laporan MBS 2026'));
      const cleanKawasan = 'GOPENG';
      const now = new Date();
      const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      const fileName = `Laporan_MBS_${cleanKawasan}_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}.xls`;

      let tableRows = '';
      reports.forEach((r, idx) => {
        const cleanSyor = r.syor ? r.syor.replace(/"/g, '&quot;') : 'Belum ada syor / ulasan';
        const syorOfficer = r.syorOleh ? ` (${r.syorOleh})` : '';
        const penghantarNama = r.disediakanOleh || 'SITI ZURAIDAH BT TALKAH';
        const jawatanPenghantar = r.penghantarJawatan || 'Pendidik Masyarakat';

        tableRows += `
          <tr>
            <td style="text-align: center; font-weight: bold; border: 1px solid #000000; vertical-align: top;">${idx + 1}</td>
            <td style="font-weight: bold; border: 1px solid #000000; vertical-align: top;">${r.parlimen}</td>
            <td style="font-weight: bold; border: 1px solid #000000; vertical-align: top;">${r.dun}</td>
            <td style="border: 1px solid #000000; vertical-align: top;">${r.dm}</td>
            <td style="font-weight: bold; border: 1px solid #000000; vertical-align: top;">${r.lokaliti}</td>
            <td style="border: 1px solid #000000; vertical-align: top; white-space: normal; line-height: 1.4;">${r.pernyataanMbs}</td>
            <td style="text-align: center; border: 1px solid #000000; vertical-align: top;">${r.kategori}</td>
            <td style="font-weight: bold; border: 1px solid #000000; vertical-align: top;">${r.pelaporNama}</td>
            <td style="text-align: center; border: 1px solid #000000; vertical-align: top; mso-number-format: '\\@';">${r.pelaporTel}</td>
            <td style="border: 1px solid #000000; vertical-align: top;">${penghantarNama}</td>
            <td style="border: 1px solid #000000; vertical-align: top;">${jawatanPenghantar}</td>
            <td style="border: 1px solid #000000; vertical-align: top; line-height: 1.4;">${cleanSyor}${syorOfficer}</td>
            <td style="text-align: center; font-weight: bold; border: 1px solid #000000; vertical-align: top;">${r.status.toUpperCase()}</td>
          </tr>
        `;
      });

      const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            body, table { font-family: Arial, Helvetica, sans-serif; }
            table.mbs-excel { border-collapse: collapse; width: 100%; }
            table.mbs-excel th, table.mbs-excel td { border: 1px solid #000000 !important; padding: 6px 8px; vertical-align: top; font-size: 10pt; }
            .title-banner { background-color: #000000 !important; color: #ffffff !important; font-size: 12pt !important; font-weight: bold; text-align: center; padding: 10px; text-transform: uppercase; }
            .meta-row td { background-color: #ffffff !important; color: #000000 !important; font-size: 10pt !important; font-weight: bold; padding: 6px 8px; }
            .header-row th { background-color: #000000 !important; color: #ffffff !important; font-size: 10pt !important; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 6px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <table class="mbs-excel">
            <thead>
              <tr>
                <th colspan="13" class="title-banner">
                  LAPORAN MAKLUM BALAS SEMASA (MBS) • KAWASAN ${cleanKawasan}
                </th>
              </tr>
              <tr class="meta-row">
                <td colspan="6" style="text-align: left; font-weight: bold; border: 1px solid #000000;">
                  PARLIMEN: P.071 GOPENG
                </td>
                <td colspan="7" style="text-align: right; font-weight: bold; border: 1px solid #000000;">
                  TARIKH LAPORAN: ${formattedDate}
                </td>
              </tr>
              <tr class="header-row">
                <th style="width: 45px;">BIL.</th>
                <th style="width: 130px;">PARLIMEN</th>
                <th style="width: 140px;">DUN</th>
                <th style="width: 120px;">DM</th>
                <th style="width: 180px;">LOKALITI</th>
                <th style="width: 420px;">PERNYATAAN MBS (ADUAN)</th>
                <th style="width: 110px;">KATEGORI</th>
                <th style="width: 160px;">PELAPOR</th>
                <th style="width: 120px;">NO. TELEFON</th>
                <th style="width: 170px;">PENGHANTAR MBS</th>
                <th style="width: 150px;">JAWATAN PENGHANTAR</th>
                <th style="width: 280px;">SYOR PEGAWAI KEMAS / PKD</th>
                <th style="width: 110px;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
      `;

      setUploadProgressMsg('Menyimpan lembaran fail ke Google Drive...');
      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });

      const uploaded = await uploadFileToDrive({
        name: fileName,
        mimeType: 'application/vnd.ms-excel',
        content: blob,
        folderId: folder.id,
        description: `Lembaran rasmi Lampiran A Maklum Balas Semasa (${reports.length} rekod)`
      });

      showNotification('success', `Fail Excel berjaya disimpan ke Google Drive: ${uploaded.name}`);
      await loadDriveFolderAndFiles();
    } catch (err: any) {
      console.error('Ralat simpan ke Drive:', err);
      showNotification('error', `Gagal menyimpan ke Google Drive: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  // 3. Upload Custom File (image, PDF, doc) to Google Drive
  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgressMsg(`Memuat naik ${selectedFile.name}...`);
    try {
      const folder = driveFolder || (await getOrCreateMBSFolder('Sistem Laporan MBS 2026'));
      const uploaded = await uploadFileToDrive({
        name: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        content: selectedFile,
        folderId: folder.id,
        description: 'Fail sokongan dimuat naik pengguna ke folder MBS'
      });

      showNotification('success', `Fail berjaya dimuat naik ke Google Drive: ${uploaded.name}`);
      await loadDriveFolderAndFiles();
    } catch (err: any) {
      console.error('Ralat muat naik:', err);
      showNotification('error', `Gagal memuat naik fail: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 4. Delete File with MANDATORY User Confirmation Dialog
  const confirmDeleteFile = async () => {
    if (!pendingDeleteFile) return;

    setIsProcessingAction(true);
    try {
      await deleteDriveFile(pendingDeleteFile.id);
      showNotification('success', `Fail "${pendingDeleteFile.name}" telah berjaya dipadam dari Google Drive.`);
      setPendingDeleteFile(null);
      await loadDriveFolderAndFiles();
    } catch (err: any) {
      console.error('Ralat memadam fail:', err);
      showNotification('error', `Gagal memadam fail: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 5. Restore Backup with MANDATORY User Confirmation Dialog
  const confirmRestoreFile = async () => {
    if (!pendingRestoreFile) return;

    setIsProcessingAction(true);
    try {
      const contentStr = await downloadDriveFileContent(pendingRestoreFile.id);
      const parsed = JSON.parse(contentStr);

      if (parsed.laporanMBS && Array.isArray(parsed.laporanMBS)) {
        if (onRestoreReports) {
          onRestoreReports(parsed.laporanMBS);
        } else {
          localStorage.setItem('mbs_reports_data', JSON.stringify(parsed.laporanMBS));
          window.location.reload();
        }
        showNotification('success', `Berjaya memulihkan ${parsed.laporanMBS.length} laporan MBS dari sandaran Google Drive!`);
        setPendingRestoreFile(null);
      } else {
        throw new Error('Format fail sandaran tidak sah. Tiada senarai laporanMBS ditemui.');
      }
    } catch (err: any) {
      console.error('Ralat pemulihan fail:', err);
      showNotification('error', `Gagal memulihkan data: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Filtered files view
  const filteredFiles = files.filter(f => {
    const matchesSearch = searchTerm === '' || f.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'excel') {
      return f.mimeType.includes('excel') || f.mimeType.includes('spreadsheet') || f.name.endsWith('.xls') || f.name.endsWith('.xlsx');
    }
    if (filterType === 'backup') {
      return f.name.endsWith('.json') || f.mimeType.includes('json');
    }
    if (filterType === 'images') {
      return f.mimeType.includes('image');
    }
    return true;
  });

  const getFileIcon = (file: DriveFileItem) => {
    if (file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (file.name.endsWith('.json') || file.mimeType.includes('json')) {
      return <FileCode className="w-5 h-5 text-indigo-600" />;
    }
    if (file.mimeType.includes('image')) {
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    }
    return <FileText className="w-5 h-5 text-slate-600" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '-';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('ms-MY')} ${d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border-2 border-slate-950 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 bg-blue-50 border-2 border-slate-950 flex items-center justify-center shrink-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Cloud className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Penyelarasan Google Drive
                </h1>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5">
                  GOOGLE WORKSPACE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-mono mt-1">
                Simpan sandaran data MBS, muat naik lembaran Excel rasmi, dan simpan dokumen sokongan terus ke Google Drive anda secara automatik.
              </p>
            </div>
          </div>

          {/* User Account / Sign In Status */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {hasToken && currentUser ? (
              <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-950 p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="User" 
                    className="w-8 h-8 rounded-full border border-slate-400"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="text-left">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.displayName || 'Pengguna Google'}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-600 truncate max-w-[180px]">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-300 hover:border-rose-400 transition-colors ml-1 cursor-pointer"
                  title="Log keluar dari Google Drive"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Official "Sign in with Google" button according to Google Guidelines */
              <button
                onClick={handleSignIn}
                disabled={isLoadingAuth}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoadingAuth ? 'Menyambung...' : 'Sambung Google Drive'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert Bar */}
        {feedback && (
          <div className={`mt-4 p-3 border-2 border-slate-950 flex items-center justify-between font-mono text-xs ${
            feedback.type === 'success' 
              ? 'bg-emerald-100 text-emerald-950' 
              : feedback.type === 'error'
              ? 'bg-rose-100 text-rose-950'
              : 'bg-blue-100 text-blue-950'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span className="font-bold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-600 hover:text-slate-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Loading Indicator */}
        {isUploading && (
          <div className="mt-4 p-3 bg-amber-50 border-2 border-slate-950 flex items-center gap-3 font-mono text-xs text-amber-900 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
            <span className="font-bold">{uploadProgressMsg}</span>
          </div>
        )}
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Action 1: Sandarkan Data Penuh */}
        <div className="bg-white border-2 border-slate-950 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-indigo-50 border-2 border-slate-950 flex items-center justify-center">
              <FolderSync className="w-5 h-5 text-indigo-700" />
            </div>
            <h3 className="font-black text-sm uppercase text-slate-900 font-mono">
              Sandaran Penuh (JSON)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simpan keseluruhan {reports.length} rekod MBS dan data rujukan master kawasan ke dalam Google Drive sebagai fail sandaran selamat.
            </p>
          </div>
          <button
            onClick={handleBackupReports}
            disabled={isUploading}
            className="mt-4 w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-2 border-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4 text-indigo-700" />
            <span>Simpan Sandaran Penuh</span>
          </button>
        </div>

        {/* Action 2: Eksport Format Excel Lampiran A */}
        <div className="bg-white border-2 border-slate-950 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-emerald-50 border-2 border-slate-950 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-black text-sm uppercase text-slate-900 font-mono">
              Eksport Excel ke Drive
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Jana lembaran Excel Lampiran A dengan format rasmi dan simpan terus ke folder Google Drive tanpa perlu muat turun manual.
            </p>
          </div>
          <button
            onClick={handleExportExcelToDrive}
            disabled={isUploading}
            className="mt-4 w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-2 border-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4 text-emerald-700" />
            <span>Simpan Excel ke Drive</span>
          </button>
        </div>

        {/* Action 3: Muat Naik Fail Sokongan */}
        <div className="bg-white border-2 border-slate-950 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-blue-50 border-2 border-slate-950 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-blue-700" />
            </div>
            <h3 className="font-black text-sm uppercase text-slate-900 font-mono">
              Muat Naik Fail Sokongan
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Muat naik gambar bukti aduan, surat rasmi, dokumen PDF atau fail sokongan lain ke folder Sistem Laporan MBS di Drive.
            </p>
          </div>
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleCustomFileUpload} 
              className="hidden" 
              id="mbs-custom-drive-upload"
            />
            <label
              htmlFor="mbs-custom-drive-upload"
              className="mt-4 w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-950 border-2 border-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
            >
              <UploadCloud className="w-4 h-4 text-blue-700" />
              <span>Pilih Fail &amp; Muat Naik</span>
            </label>
          </div>
        </div>
      </div>

      {/* Drive File Explorer Section */}
      <div className="bg-white border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {/* Explorer Header */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-950 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-slate-800" />
            <h2 className="font-mono font-black text-sm sm:text-base uppercase tracking-wider text-slate-900">
              Kandungan Folder: {driveFolder?.name || 'Sistem Laporan MBS 2026'}
            </h2>
            {driveFolder?.webViewLink && (
              <a
                href={driveFolder.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-bold text-blue-700 hover:underline flex items-center gap-1 ml-2"
                title="Buka folder di drive.google.com"
              >
                <span>Buka di Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <button
            onClick={loadDriveFolderAndFiles}
            disabled={isLoadingFiles || !hasToken}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border-2 border-slate-950 text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b-2 border-slate-950 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari fail dalam Google Drive..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-950 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 border-2 border-slate-950 text-xs font-mono font-bold uppercase ${
                filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              Semua ({files.length})
            </button>
            <button
              onClick={() => setFilterType('excel')}
              className={`px-3 py-1.5 border-2 border-slate-950 text-xs font-mono font-bold uppercase ${
                filterType === 'excel' ? 'bg-emerald-700 text-white' : 'bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              Excel
            </button>
            <button
              onClick={() => setFilterType('backup')}
              className={`px-3 py-1.5 border-2 border-slate-950 text-xs font-mono font-bold uppercase ${
                filterType === 'backup' ? 'bg-indigo-700 text-white' : 'bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              Sandaran JSON
            </button>
            <button
              onClick={() => setFilterType('images')}
              className={`px-3 py-1.5 border-2 border-slate-950 text-xs font-mono font-bold uppercase ${
                filterType === 'images' ? 'bg-blue-700 text-white' : 'bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              Imej / Bukti
            </button>
          </div>
        </div>

        {/* Files Table */}
        {!hasToken ? (
          <div className="p-8 text-center space-y-4">
            <Cloud className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <p className="font-mono font-bold text-slate-800 text-sm">
                Google Drive Belum Disambungkan
              </p>
              <p className="font-mono text-xs text-slate-500 mt-1">
                Sila sambung ke akaun Google anda untuk melihat fail dan mengurus sandaran awan.
              </p>
            </div>
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-950 font-mono font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <span>Sambung Google Drive Sekarang</span>
            </button>
          </div>
        ) : isLoadingFiles ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="font-mono text-xs text-slate-600 font-bold">
              Sedang memuat senarai fail dari Google Drive...
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-mono text-xs font-bold text-slate-600">
              Tiada fail ditemui dalam folder ini.
            </p>
            <p className="text-[11px] font-mono text-slate-400">
              Klik butang &quot;Simpan Sandaran Penuh&quot; atau &quot;Simpan Excel ke Drive&quot; di atas untuk memuat naik fail pertama.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-950 font-black uppercase text-slate-900">
                  <th className="py-3 px-4 w-12 text-center">Jenis</th>
                  <th className="py-3 px-4">Nama Fail</th>
                  <th className="py-3 px-4 w-28">Saiz</th>
                  <th className="py-3 px-4 w-44">Tarikh Kemaskini</th>
                  <th className="py-3 px-4 w-48 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b-2 border-slate-950 divide-slate-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">{getFileIcon(file)}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{file.name}</span>
                        {file.name.endsWith('.json') && (
                          <span className="bg-indigo-100 text-indigo-900 border border-indigo-400 text-[9px] px-1.5 py-0.5">
                            SANDARAN
                          </span>
                        )}
                        {file.mimeType.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 text-[9px] px-1.5 py-0.5">
                            EXCEL
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(file.modifiedTime)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Open in Drive */}
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                            title="Buka dalam Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Restore button if JSON backup */}
                        {file.name.endsWith('.json') && (
                          <button
                            onClick={() => setPendingRestoreFile(file)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                            title="Pulihkan data dari fail sandaran ini"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete button (with confirmation modal) */}
                        <button
                          onClick={() => setPendingDeleteFile(file)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                          title="Padam fail dari Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG: DELETE FILE FROM GOOGLE DRIVE */}
      {pendingDeleteFile && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-slate-950 max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <div className="flex items-start gap-3 text-rose-700">
              <div className="w-10 h-10 bg-rose-100 border-2 border-slate-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-mono font-black text-base text-slate-900 uppercase">
                  Sahkan Pemadaman Fail
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Tindakan ini akan memadam fail daripada akaun Google Drive anda secara kekal.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border-2 border-slate-950 p-3 font-mono text-xs space-y-1">
              <div className="text-slate-500 uppercase text-[10px]">Fail Yang Akan Dipadam:</div>
              <div className="font-black text-slate-900 break-words">{pendingDeleteFile.name}</div>
              <div className="text-[11px] text-slate-600">Saiz: {formatFileSize(pendingDeleteFile.size)}</div>
            </div>

            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setPendingDeleteFile(null)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border-2 border-slate-950 font-black uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={isProcessingAction}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-950 font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isProcessingAction ? 'Memadam...' : 'Ya, Padam Fail'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG: RESTORE BACKUP DATA */}
      {pendingRestoreFile && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-slate-950 max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <div className="flex items-start gap-3 text-indigo-700">
              <div className="w-10 h-10 bg-indigo-100 border-2 border-slate-950 flex items-center justify-center shrink-0">
                <DownloadCloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-mono font-black text-base text-slate-900 uppercase">
                  Sahkan Pemulihan Sandaran
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Data laporan semasa akan dikemaskini mengikut rekod sandaran Google Drive.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border-2 border-slate-950 p-3 font-mono text-xs space-y-1">
              <div className="text-slate-500 uppercase text-[10px]">Fail Sandaran Dipilih:</div>
              <div className="font-black text-slate-900 break-words">{pendingRestoreFile.name}</div>
              <div className="text-[11px] text-slate-600">Tarikh Kemaskini: {formatDate(pendingRestoreFile.modifiedTime)}</div>
            </div>

            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setPendingRestoreFile(null)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border-2 border-slate-950 font-black uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmRestoreFile}
                disabled={isProcessingAction}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-slate-950 font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center gap-2"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>{isProcessingAction ? 'Memulihkan...' : 'Ya, Pulihkan Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
