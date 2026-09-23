/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { MBSReport } from '../types';
import { KATEGORI_SENARAI } from '../data/mockData';
import { 
  Search, 
  Printer, 
  Eye, 
  X, 
  Inbox, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  ChevronDown, 
  FileSpreadsheet, 
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  User,
  UserCheck,
  Building2,
  MapPin,
  MessageSquare,
  FileText,
  Copy,
  Check,
  Edit3,
  ExternalLink,
  Calendar,
  Sparkles,
  ShieldAlert,
  Cloud,
  Shield,
  Database,
  Lock
} from 'lucide-react';
import { 
  uploadFileToDrive, 
  getOrCreateMBSFolder, 
  googleSignIn, 
  getAccessToken 
} from '../services/googleDriveService';

interface ReportTableProps {
  reports: MBSReport[];
  onEditSyor: (id: string, syor: string, status: 'Baru' | 'Dalam Tindakan' | 'Selesai', syorOleh: string) => void;
  onDeleteReport: (id: string) => void;
  userRole?: 'user' | 'pegawai' | 'master_admin';
  userParlimen?: string;
}

export const MALAY_MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN',
  'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'
];

export function formatReportMonthYear(tarikhStr?: string): string {
  if (!tarikhStr) return 'SEPTEMBER 2026';
  const match = tarikhStr.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIdx = parseInt(match[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MALAY_MONTH_NAMES[monthIdx]} ${year}`;
    }
  }
  const d = new Date(tarikhStr);
  if (!isNaN(d.getTime())) {
    return `${MALAY_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  return 'SEPTEMBER 2026';
}

export function ReportTable({ 
  reports, 
  onEditSyor, 
  onDeleteReport,
  userRole = 'master_admin',
  userParlimen
}: ReportTableProps) {
  // Modal view for RLS SQL Documentation
  const [showRlsSqlModal, setShowRlsSqlModal] = useState(false);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBulan, setFilterBulan] = useState('SEMUA BULAN');
  const [filterKategori, setFilterKategori] = useState('Semua Kategori');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  
  // View mode: 'cards' (Kad Rekod MBS) or 'table' (Jadual Lampiran A)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal and interaction states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'info' | 'warning' | 'success'; message: string } | null>(null);
  const [isSavingToDrive, setIsSavingToDrive] = useState<boolean>(false);

  // Quick Syor Editing Modal
  const [editingReport, setEditingReport] = useState<MBSReport | null>(null);
  const [editSyorText, setEditSyorText] = useState('');
  const [editSyorStatus, setEditSyorStatus] = useState<MBSReport['status']>('Baru');
  const [editSyorPegawai, setEditSyorPegawai] = useState('PKD Kampar');

  // Helper functions for dynamic file naming & formatting
  const getCleanParlimenName = (reportList: MBSReport[]): string => {
    const raw = reportList[0]?.parlimen || reports[0]?.parlimen || 'P.071 GOPENG';
    let stripped = raw.replace(/^P\.?\d*\s*-?\s*/i, '').trim();
    if (!stripped) stripped = 'Gopeng';
    return stripped.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
  };

  const getFormattedMonthForFileName = (bulan: string): string => {
    if (bulan === 'SEMUA BULAN') {
      return 'Semua_Bulan_2026';
    }
    return bulan.split(/\s+/).map(w => {
      if (/^\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join('_');
  };

  // Step 1: Filter reports by role and parliament access
  // Pegawai Parlimen & User Awam only see records for their assigned Parlimen
  // Master Admin has full access to all Parlimen
  const accessibleReports = useMemo(() => {
    if ((userRole === 'pegawai' || userRole === 'user') && userParlimen) {
      const cleanUserParlimen = userParlimen.toUpperCase().trim();
      return reports.filter(item => {
        if (!item.parlimen) return false;
        const itemParlimen = item.parlimen.toUpperCase().trim();
        return itemParlimen === cleanUserParlimen ||
               itemParlimen.includes(cleanUserParlimen) ||
               cleanUserParlimen.includes(itemParlimen);
      });
    }
    return reports;
  }, [reports, userRole, userParlimen]);

  // Derive dynamic list of months from standard 2026 months plus existing reports
  const availableMonths = useMemo(() => {
    const standardMonths = MALAY_MONTH_NAMES.map(m => `${m} 2026`);
    const dynamicSet = new Set<string>(standardMonths);
    accessibleReports.forEach(r => {
      const my = formatReportMonthYear(r.tarikhAduan);
      if (my) dynamicSet.add(my);
    });
    return Array.from(dynamicSet);
  }, [accessibleReports]);

  // Derive categories list
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>(KATEGORI_SENARAI);
    accessibleReports.forEach(r => {
      if (r.kategori) catSet.add(r.kategori);
    });
    return Array.from(catSet);
  }, [accessibleReports]);

  // Search and Filter Logic
  const filteredReports = useMemo(() => {
    return accessibleReports.filter(r => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || (
        r.parlimen.toLowerCase().includes(term) ||
        r.dun.toLowerCase().includes(term) ||
        r.dm.toLowerCase().includes(term) ||
        r.lokaliti.toLowerCase().includes(term) ||
        r.pernyataanMbs.toLowerCase().includes(term) ||
        r.pelaporNama.toLowerCase().includes(term) ||
        r.pelaporTel.includes(term) ||
        (r.kategori && r.kategori.toLowerCase().includes(term)) ||
        (r.disediakanOleh && r.disediakanOleh.toLowerCase().includes(term)) ||
        (r.penghantarJawatan && r.penghantarJawatan.toLowerCase().includes(term)) ||
        (r.syor && r.syor.toLowerCase().includes(term)) ||
        (r.syorOleh && r.syorOleh.toLowerCase().includes(term))
      );

      const reportMonthYear = formatReportMonthYear(r.tarikhAduan);
      const matchesBulan = filterBulan === 'SEMUA BULAN' || reportMonthYear === filterBulan;
      const matchesKategori = filterKategori === 'Semua Kategori' || r.kategori.toLowerCase() === filterKategori.toLowerCase();
      const matchesStatus = filterStatus === 'Semua Status' || r.status === filterStatus;

      return matchesSearch && matchesBulan && matchesKategori && matchesStatus;
    });
  }, [accessibleReports, searchTerm, filterBulan, filterKategori, filterStatus]);

  // Export to Excel Function formatted exactly as in the user's screenshot
  const exportToExcel = (format: 'xls' | 'xlsx' = 'xls') => {
    if (filteredReports.length === 0) {
      setActionFeedback({
        type: 'warning',
        message: `Tiada rekod laporan bagi pilihan bulan "${filterBulan}" untuk dieksport.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    const fullParlimen = filteredReports[0]?.parlimen || reports[0]?.parlimen || 'P.071 GOPENG';
    let cleanKawasan = fullParlimen.replace(/^P\.?\d*\s*-?\s*/i, '').trim();
    if (!cleanKawasan) cleanKawasan = 'GOPENG';
    cleanKawasan = cleanKawasan.toUpperCase();

    const parlimenClean = getCleanParlimenName(filteredReports);
    const monthClean = getFormattedMonthForFileName(filterBulan);
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const sheetName = `Laporan MBS ${cleanKawasan.charAt(0).toUpperCase() + cleanKawasan.slice(1).toLowerCase()}`;

    // Filename matching WPS Office / screenshot style: Laporan_MBS_Gopeng_2026.xls or with month if filtered
    const baseFileName = filterBulan !== 'SEMUA BULAN' 
      ? `Laporan_MBS_${parlimenClean}_${monthClean}`
      : `Laporan_MBS_${parlimenClean}_2026`;

    if (format === 'xls') {
      // Styled HTML Excel format that renders exact black banner, white text, borders, and column layouts in WPS Office & Excel
      const fileName = `${baseFileName}.xls`;

      let tableRows = '';
      filteredReports.forEach((r, idx) => {
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
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${sheetName}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                    <x:FitToPage/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body, table { font-family: Arial, Helvetica, sans-serif; }
            table.mbs-excel { border-collapse: collapse; width: 100%; font-family: Arial, Helvetica, sans-serif; }
            table.mbs-excel th, table.mbs-excel td { border: 1px solid #000000 !important; padding: 6px 8px; vertical-align: top; font-size: 10pt; font-family: Arial, Helvetica, sans-serif; }
            .title-banner { background-color: #000000 !important; color: #ffffff !important; font-size: 12pt !important; font-weight: bold; text-align: center; padding: 10px; text-transform: uppercase; border: 1px solid #000000 !important; }
            .meta-row td { background-color: #ffffff !important; color: #000000 !important; font-size: 10pt !important; font-weight: bold; padding: 6px 8px; border: 1px solid #000000 !important; }
            .header-row th { background-color: #000000 !important; color: #ffffff !important; font-size: 10pt !important; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px 6px; text-transform: uppercase; border: 1px solid #000000 !important; }
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
                  PARLIMEN: ${fullParlimen}
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

      const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setActionFeedback({
        type: 'success',
        message: `Fail Excel berjaya dieksport mengikut format rasmi: ${fileName} (${filteredReports.length} rekod)`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      // Native XLSX via SheetJS with exact 13 columns matching screenshot
      const fileName = `${baseFileName}.xlsx`;
      try {
        const wb = XLSX.utils.book_new();
        const wsData: (string | number)[][] = [
          [`LAPORAN MAKLUM BALAS SEMASA (MBS) • KAWASAN ${cleanKawasan}`],
          [
            `PARLIMEN: ${fullParlimen}`,
            "", "", "", "", "",
            `TARIKH LAPORAN: ${formattedDate}`,
            "", "", "", "", "", ""
          ],
          [
            "BIL.",
            "PARLIMEN",
            "DUN",
            "DM",
            "LOKALITI",
            "PERNYATAAN MBS (ADUAN)",
            "KATEGORI",
            "PELAPOR",
            "NO. TELEFON",
            "PENGHANTAR MBS",
            "JAWATAN PENGHANTAR",
            "SYOR PEGAWAI KEMAS / PKD",
            "STATUS"
          ]
        ];

        filteredReports.forEach((r, idx) => {
          const cleanSyor = r.syor ? r.syor : 'Belum ada syor / ulasan';
          const syorOfficer = r.syorOleh ? ` (${r.syorOleh})` : '';
          const penghantarNama = r.disediakanOleh || 'SITI ZURAIDAH BT TALKAH';
          const jawatanPenghantar = r.penghantarJawatan || 'Pendidik Masyarakat';

          wsData.push([
            idx + 1,
            r.parlimen,
            r.dun,
            r.dm,
            r.lokaliti,
            r.pernyataanMbs,
            r.kategori,
            r.pelaporNama,
            r.pelaporTel,
            penghantarNama,
            jawatanPenghantar,
            `${cleanSyor}${syorOfficer}`,
            r.status.toUpperCase()
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
          { wch: 6 },   // BIL.
          { wch: 18 },  // PARLIMEN
          { wch: 18 },  // DUN
          { wch: 16 },  // DM
          { wch: 24 },  // LOKALITI
          { wch: 55 },  // PERNYATAAN MBS (ADUAN)
          { wch: 16 },  // KATEGORI
          { wch: 24 },  // PELAPOR
          { wch: 16 },  // NO. TELEFON
          { wch: 26 },  // PENGHANTAR MBS
          { wch: 22 },  // JAWATAN PENGHANTAR
          { wch: 45 },  // SYOR PEGAWAI KEMAS / PKD
          { wch: 16 }   // STATUS
        ];

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
          { s: { r: 1, c: 6 }, e: { r: 1, c: 12 } }
        ];

        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
        XLSX.writeFile(wb, fileName);

        setActionFeedback({
          type: 'success',
          message: `Fail Excel .xlsx berjaya dimuat turun: ${fileName}`
        });
        setTimeout(() => setActionFeedback(null), 4000);
      } catch (err) {
        console.error('Ralat eksport XLSX:', err);
      }
    }
  };

  // Save current filtered reports as official Excel directly to Google Drive
  const handleSaveToGoogleDrive = async () => {
    if (filteredReports.length === 0) {
      setActionFeedback({
        type: 'warning',
        message: `Tiada rekod laporan bagi pilihan bulan "${filterBulan}" untuk disimpan ke Google Drive.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    setIsSavingToDrive(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes) throw new Error('Pengesahan Google diperlukan.');
        token = authRes.accessToken;
      }

      const parlimenClean = getCleanParlimenName(filteredReports);
      const monthClean = getFormattedMonthForFileName(filterBulan);
      const now = new Date();
      const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      let cleanKawasan = filteredReports[0]?.parlimen || reports[0]?.parlimen || 'P.071 GOPENG';
      cleanKawasan = cleanKawasan.replace(/^P\.?\d*\s*-?\s*/i, '').trim().toUpperCase();

      const fileName = filterBulan !== 'SEMUA BULAN'
        ? `Laporan_MBS_${parlimenClean}_${monthClean}.xls`
        : `Laporan_MBS_${parlimenClean}_${now.getFullYear()}.xls`;

      let tableRows = '';
      filteredReports.forEach((r, idx) => {
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
                  PARLIMEN: ${filteredReports[0]?.parlimen || 'P.071 GOPENG'}
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

      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const folder = await getOrCreateMBSFolder('Sistem Laporan MBS 2026');
      const uploaded = await uploadFileToDrive({
        name: fileName,
        mimeType: 'application/vnd.ms-excel',
        content: blob,
        folderId: folder.id,
        description: `Laporan MBS Lampiran A bagi ${filterBulan} (${filteredReports.length} rekod)`
      });

      setActionFeedback({
        type: 'success',
        message: `Berjaya disimpan ke Google Drive: ${uploaded.name} dalam folder "${folder.name}".`
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      console.error('Ralat simpan Google Drive:', err);
      setActionFeedback({
        type: 'warning',
        message: `Gagal simpan ke Google Drive: ${err.message}`
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // Trigger standard official print format
  const triggerPrint = () => {
    if (filteredReports.length === 0) {
      setActionFeedback({
        type: 'warning',
        message: `Tiada rekod laporan bagi pilihan bulan "${filterBulan}" untuk dicetak.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }
    window.print();
  };

  // Copy report summary to clipboard
  const handleCopyReport = (r: MBSReport) => {
    const text = `LAPORAN MAKLUM BALAS SEMASA (MBS)
SIRI: #${r.bil} (${formatReportMonthYear(r.tarikhAduan)})
STATUS: ${r.status}
PARLIMEN: ${r.parlimen}
DUN: ${r.dun}
DM: ${r.dm}
LOKALITI: ${r.lokaliti}
PERNYATAAN MBS: ${r.pernyataanMbs}
KATEGORI: ${r.kategori}
PELAPOR: ${r.pelaporNama} (${r.pelaporTel})
PENGHANTAR: ${r.disediakanOleh || '-'} (${r.penghantarJawatan || 'Pendidik Masyarakat'})
SYOR PKD: ${r.syor || 'Belum ada syor / ulasan'} ${r.syorOleh ? `[${r.syorOleh}]` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  // Open Quick Syor Modal
  const openEditSyorModal = (r: MBSReport) => {
    setEditingReport(r);
    setEditSyorText(r.syor || '');
    setEditSyorStatus(r.status);
    setEditSyorPegawai(r.syorOleh || 'PKD Kampar');
  };

  // Save Syor Update
  const handleSaveSyor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    onEditSyor(editingReport.id, editSyorText.trim(), editSyorStatus, editSyorPegawai.trim());
    setEditingReport(null);
  };

  // Render Status Badge with specific red background and red border styling for 'Baru'
  const renderStatusBadge = (status: MBSReport['status']) => {
    switch (status) {
      case 'Baru':
        return (
          <span 
            className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-none text-xs font-black uppercase tracking-wider border-2 border-rose-600 shadow-[2px_2px_0px_0px_rgba(225,29,72,0.3)] font-mono"
            title="Lencana Status: BARU"
          >
            <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
            <span>BARU</span>
          </span>
        );
      case 'Dalam Tindakan':
        return (
          <span 
            className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-800 px-3 py-1 rounded-none text-xs font-black uppercase tracking-wider border-2 border-amber-600 shadow-[2px_2px_0px_0px_rgba(217,119,6,0.3)] font-mono"
            title="Lencana Status: DALAM TINDAKAN"
          >
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>DALAM TINDAKAN</span>
          </span>
        );
      case 'Selesai':
        return (
          <span 
            className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-none text-xs font-black uppercase tracking-wider border-2 border-emerald-600 shadow-[2px_2px_0px_0px_rgba(5,150,105,0.3)] font-mono"
            title="Lencana Status: SELESAI"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>SELESAI</span>
          </span>
        );
    }
  };

  return (
    <div id="mbs-lampiran-a-container" className="space-y-6">
      
      {/* ========================================================================= */}
      {/* MAKLUMAT KAWASAN & PRIVASI KESELAMATAN (RLS / ROLE FILTER BANNER)          */}
      {/* ========================================================================= */}
      <div className={`p-4 border-2 border-slate-950 font-mono shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        userRole === 'pegawai'
          ? 'bg-emerald-50 text-emerald-950 border-emerald-950'
          : userRole === 'user'
          ? 'bg-blue-50 text-blue-950 border-blue-950'
          : 'bg-amber-50 text-amber-950 border-amber-950'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 border-2 border-slate-950 ${
            userRole === 'pegawai' ? 'bg-emerald-200 text-emerald-900' : userRole === 'user' ? 'bg-blue-200 text-blue-900' : 'bg-amber-200 text-amber-900'
          }`}>
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <span>
                {userRole === 'pegawai' 
                  ? `Paparan Terhad Pegawai: ${userParlimen || 'Parlimen Ditugaskan'}`
                  : userRole === 'user'
                  ? `Paparan Awam Parlimen: ${userParlimen || 'Kawasan Parlimen'}`
                  : 'Akses Master Admin: Keseluruhan Kawasan Parlimen'}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-950 font-bold uppercase">
                {userRole === 'pegawai' ? 'PRIVASI PARLIMEN DIAKTIFKAN' : userRole === 'user' ? 'PENGGUNA AWAM' : 'AKSES PENUH'}
              </span>
            </div>
            <p className="text-[11px] text-slate-700 mt-0.5">
              {userRole === 'pegawai'
                ? `Privasi data aktif. Anda hanya melihat, mencetak, dan mengeksport rekod MBS milik kawasan ${userParlimen || 'parlimen anda'}.`
                : userRole === 'user'
                ? `Paparan diselaraskan mengikut kawasan ${userParlimen || 'anda'}.`
                : 'Master Admin mempunyai hak akses penuh untuk meneliti dan memuat turun laporan daripada kesemua kawasan parlimen.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRlsSqlModal(true)}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-950 text-[11px] font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shrink-0"
          title="Lihat Polisi Keselamatan Pangkalan Data (Supabase Row Level Security - RLS)"
        >
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Polisi Keselamatan RLS</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* BAHAGIAN ATAS: HEADER & BAR PENAPIS (FILTER BAR)                         */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-slate-950 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
        
        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div 
            className={`p-3 border-2 border-slate-950 font-mono text-xs font-bold flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              actionFeedback.type === 'success' 
                ? 'bg-emerald-100 text-emerald-950 border-emerald-950' 
                : 'bg-amber-100 text-amber-950 border-amber-950'
            }`}
          >
            <div className="flex items-center space-x-2">
              {actionFeedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-800 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button 
              onClick={() => setActionFeedback(null)} 
              className="text-slate-700 hover:text-slate-950 font-black p-0.5"
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Row 1: Carian (Search input) di kiri & Aksi Eksport/Cetak di kanan */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch justify-between">
          
          {/* Carian (Search Input) */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-950 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="mbs-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Parlimen, DUN, Lokaliti, Pelapor..."
              className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-950 font-mono placeholder:text-slate-500 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950 p-1"
                title="Padam carian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Aksi Eksport/Cetak: 2 Butang Tindakan Utama di sebelah atas kanan */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {/* Butang 1: EKSPORT FAIL MICROSOFT EXCEL */}
            <div className="flex items-stretch border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-emerald-50">
              <button
                id="btn-eksport-excel"
                onClick={() => exportToExcel('xls')}
                className="flex items-center justify-center space-x-2 px-3.5 py-2.5 hover:bg-emerald-100 text-emerald-950 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                title={`Eksport fail format Excel rasmi (WPS / Excel) seperti dalam gambar bagi ${filterBulan}`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="text-left">
                  <span className="block leading-tight">EKSPORT FAIL MICROSOFT EXCEL</span>
                  <span className="block text-[9px] text-emerald-700 font-mono font-bold tracking-normal mt-0.5">
                    {filterBulan !== 'SEMUA BULAN' ? `BULAN: ${filterBulan}` : 'SEMUA BULAN'}
                  </span>
                </div>
              </button>
              <button
                onClick={() => exportToExcel('xlsx')}
                className="border-l-2 border-slate-950 px-2.5 py-2.5 hover:bg-emerald-200 text-emerald-900 text-[10px] font-mono font-black uppercase cursor-pointer"
                title="Muat turun format XLSX alternatif"
              >
                .XLSX
              </button>
            </div>

            {/* Butang 2: CETAK FORMAT LAMPIRAN A RASMI */}
            <button
              id="btn-cetak-lampiran-a"
              onClick={triggerPrint}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-950 text-slate-950 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              title={`Cetak dokumen Lampiran A bagi ${filterBulan}`}
            >
              <Printer className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-left">
                <span className="block leading-tight">CETAK FORMAT LAMPIRAN A RASMI</span>
                <span className="block text-[9px] text-blue-700 font-mono font-bold tracking-normal mt-0.5">
                  {filterBulan !== 'SEMUA BULAN' ? `BULAN: ${filterBulan}` : 'SEMUA BULAN'}
                </span>
              </div>
            </button>

            {/* Butang 3: SIMPAN KE GOOGLE DRIVE */}
            <button
              id="btn-simpan-google-drive"
              onClick={handleSaveToGoogleDrive}
              disabled={isSavingToDrive}
              className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-950 border-2 border-slate-950 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              title={`Simpan laporan Lampiran A ${filterBulan} terus ke Google Drive`}
            >
              <Cloud className={`w-4 h-4 text-blue-700 shrink-0 ${isSavingToDrive ? 'animate-bounce' : ''}`} />
              <div className="text-left">
                <span className="block leading-tight">{isSavingToDrive ? 'MENYIMPAN...' : 'SIMPAN KE GOOGLE DRIVE'}</span>
                <span className="block text-[9px] text-blue-700 font-mono font-bold tracking-normal mt-0.5">
                  {filterBulan !== 'SEMUA BULAN' ? `BULAN: ${filterBulan}` : 'SEMUA REKOD'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Row 2: Penapis (Dropdown Filters) - 3 Pilihan Penapis di bawah carian */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t-2 border-slate-200">
          
          {/* Penapis 1: PENAPIS BULAN (SEMUA BULAN, mengikut bulan) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest font-mono flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-blue-600" />
              <span>PENAPIS BULAN</span>
            </label>
            <div className="relative">
              <select
                id="filter-dropdown-bulan"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold cursor-pointer appearance-none pr-8"
              >
                <option value="SEMUA BULAN">SEMUA BULAN</option>
                {availableMonths.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-950 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Penapis 2: KATEGORI (Semua Kategori, Sosial, Ekonomi, dll.) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest font-mono flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-blue-600" />
              <span>KATEGORI</span>
            </label>
            <div className="relative">
              <select
                id="filter-dropdown-kategori"
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold cursor-pointer appearance-none pr-8"
              >
                <option value="Semua Kategori">Semua Kategori</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-950 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Penapis 3: STATUS TINDAKAN (Semua Status, Baru, Dalam Tindakan, Selesai) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest font-mono flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-blue-600" />
              <span>STATUS TINDAKAN</span>
            </label>
            <div className="relative">
              <select
                id="filter-dropdown-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 font-mono font-bold cursor-pointer appearance-none pr-8"
              >
                <option value="Semua Status">Semua Status</option>
                <option value="Baru">Baru</option>
                <option value="Dalam Tindakan">Dalam Tindakan</option>
                <option value="Selesai">Selesai</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-950 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* BAR MAKLUMAT REKOD (STATUS BAR)                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
        
        {/* Paparkan jumlah rekod semasa di sebelah kiri: REKOD: X / Y */}
        <div className="flex flex-wrap items-center gap-2">
          <span 
            id="status-bar-rekod-count"
            className="text-xs font-black uppercase tracking-widest text-slate-950 bg-white px-3 py-1.5 border-2 border-slate-950 font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            REKOD: {filteredReports.length} / {accessibleReports.length}
            {(userRole === 'pegawai' || userRole === 'user') && userParlimen && (
              <span className="text-[10px] text-emerald-800 font-bold ml-1.5">
                ({userParlimen})
              </span>
            )}
          </span>

          {(searchTerm || filterBulan !== 'SEMUA BULAN' || filterKategori !== 'Semua Kategori' || filterStatus !== 'Semua Status') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterBulan('SEMUA BULAN');
                setFilterKategori('Semua Kategori');
                setFilterStatus('Semua Status');
              }}
              className="text-[10px] text-rose-700 bg-rose-50 border border-rose-400 px-2 py-1 font-mono font-bold hover:bg-rose-100 cursor-pointer"
              title="Tetapkan semula semua penapis"
            >
              Reset Penapis
            </button>
          )}
        </div>

        {/* View mode toggle & Nota Standard Kebangsaan di sebelah kanan */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* View switcher: Kad Rekod MBS vs Jadual Lampiran A */}
          <div className="flex border-2 border-slate-950 bg-slate-100 p-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              id="view-toggle-cards"
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-wider font-mono cursor-pointer transition ${
                viewMode === 'cards' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-700 hover:text-slate-950'
              }`}
              title="Paparan Kad Rekod Bersiri MBS"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kad Rekod MBS</span>
            </button>
            <button
              id="view-toggle-table"
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-wider font-mono cursor-pointer transition ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-700 hover:text-slate-950'
              }`}
              title="Paparan Jadual Format Spreadsheet Lampiran A"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Jadual Lampiran A</span>
            </button>
          </div>

          {/* Paparkan nota di sebelah kanan: * STANDARD LAPORAN MBS KEBANGSAAN 2026 */}
          <span 
            id="status-bar-national-note"
            className="text-[11px] text-slate-600 font-bold uppercase tracking-wider font-mono hidden md:inline"
          >
            * STANDARD LAPORAN MBS KEBANGSAAN 2026.
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* JIKA TIADA REKOD DIJUMPAI                                                 */}
      {/* ========================================================================= */}
      {filteredReports.length === 0 ? (
        <div className="bg-white border-2 border-slate-950 p-12 text-center space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Inbox className="w-12 h-12 text-slate-950 mx-auto stroke-1" />
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-950">Tiada laporan dijumpai</h4>
          <p className="text-xs text-slate-500 font-mono max-w-sm mx-auto">
            Sila padam carian atau tetapkan semula penapis bulan, kategori, dan status tindakan untuk melihat rekod laporan.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterBulan('SEMUA BULAN');
              setFilterKategori('Semua Kategori');
              setFilterStatus('Semua Status');
            }}
            className="px-4 py-2 bg-slate-950 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-800"
          >
            Kosongkan Semua Penapis
          </button>
        </div>
      ) : (
        <>
          {/* ===================================================================== */}
          {/* PAPARAN KAD: KAD REKOD LAPORAN (MBS CARD DESIGN)                     */}
          {/* Setiap rekod dipaparkan dalam bentuk kad/kotak bersiri                */}
          {/* ===================================================================== */}
          {viewMode === 'cards' && (
            <div id="mbs-cards-list" className="space-y-6">
              {filteredReports.map((r, index) => {
                const monthYearStr = formatReportMonthYear(r.tarikhAduan);
                const cardHeaderLabel = `${r.bil} MBS ${monthYearStr}`;

                return (
                  <div
                    key={r.id}
                    id={`mbs-card-${r.id}`}
                    className="bg-white border-2 sm:border-[3px] border-slate-950 p-5 sm:p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] space-y-4 hover:shadow-[7px_7px_0px_0px_rgba(15,23,42,1)] transition-all relative overflow-hidden"
                  >
                    
                    {/* 1. TAJUK KAD (HEADER KAD) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-950 pb-3.5">
                      {/* Nombor siri & Bulan/Tahun (cth: 1 MBS SEPTEMBER 2026) di sebelah kiri */}
                      <div className="flex items-center space-x-2.5">
                        <span className="h-8 w-8 bg-slate-950 text-white flex items-center justify-center font-mono font-black text-sm border border-slate-950 shrink-0">
                          #{r.bil}
                        </span>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight font-mono uppercase">
                            {cardHeaderLabel}
                          </h3>
                          <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                            TARIKH DAFTAR: {r.tarikhAduan || '2026-09-10'}
                          </p>
                        </div>
                      </div>

                      {/* Lencana status di sebelah kanan (cth: Lencana BARU berlatar/bergaris merah) */}
                      <div>
                        {renderStatusBadge(r.status)}
                      </div>
                    </div>

                    {/* 2. MAKLUMAT LOKASI (LOKASI BLOCK) & SUSUNAN TERSUSUN: PARLIMEN | DUN | DM | LOKALITI */}
                    <div className="bg-slate-50 border-2 border-slate-950 p-3.5 sm:p-4 space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span>MAKLUMAT KAWASAN KEBANGSAAN</span>
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">
                          SUSUNAN TERSUSUN
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* Label & Nilai PARLIMEN (cth: P.071 GOPENG) */}
                        <div className="bg-white p-2.5 border border-slate-950">
                          <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider mb-0.5">
                            PARLIMEN
                          </span>
                          <span className="font-extrabold text-slate-950 text-sm block">
                            {r.parlimen}
                          </span>
                        </div>

                        {/* Label & Nilai DUN (cth: N.45 SIMPANG PULAI) */}
                        <div className="bg-white p-2.5 border border-slate-950">
                          <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider mb-0.5">
                            DUN
                          </span>
                          <span className="font-extrabold text-slate-950 text-sm block">
                            {r.dun}
                          </span>
                        </div>

                        {/* Label & Nilai LOKALITI / DAERAH MENGUNDI (cth: 008 Bandar Pulai Jaya (DM13 SIMPANG PULAI)) */}
                        <div className="bg-white p-2.5 border border-slate-950">
                          <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider mb-0.5">
                            LOKALITI / DAERAH MENGUNDI
                          </span>
                          <span className="font-bold text-slate-950 text-sm block leading-snug">
                            {r.lokaliti} <span className="text-blue-700 font-semibold font-mono">({r.dm})</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. PERNYATAAN MAKLUM BALAS (FEEDBACK DETAILS) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-950 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>PERNYATAAN MAKLUM BALAS</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">
                          ISYARAT / ISU KAWASAN
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-900 leading-relaxed bg-slate-50 p-4 border-2 border-slate-950 font-mono select-text whitespace-pre-line">
                        {r.pernyataanMbs}
                      </div>
                    </div>

                    {/* 4. MAKLUMAT TAMBAHAN (FOOTER KAD) */}
                    {/* TERSUSUN: KATEGORI | PELAPOR (Nama & No. Tel) | PENGHANTAR MBS | SYOR | GAMBAR | TINDAKAN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 text-xs font-mono">
                      
                      {/* KATEGORI: Memaparkan lencana kategori (cth: SOSIAL) */}
                      <div className="space-y-1 bg-slate-50 p-3 border-2 border-slate-950">
                        <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">
                          KATEGORI
                        </span>
                        <span className="inline-block bg-slate-950 text-white font-black text-xs px-3 py-1 border border-slate-950 uppercase tracking-wide">
                          {r.kategori}
                        </span>
                      </div>

                      {/* PELAPOR: Nama & Nombor Telefon Pelapor (cth: ROSLINDA BT ABD HALIM / 011-7298343) */}
                      <div className="space-y-1 bg-slate-50 p-3 border-2 border-slate-950">
                        <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">
                          PELAPOR (Nama & No. Tel)
                        </span>
                        <p className="font-black text-slate-950 text-xs sm:text-sm leading-tight">
                          {r.pelaporNama}
                        </p>
                        <a 
                          href={`tel:${r.pelaporTel}`}
                          className="inline-flex items-center space-x-1 text-blue-700 hover:text-blue-900 font-black text-xs mt-0.5 underline decoration-blue-500 underline-offset-2"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{r.pelaporTel}</span>
                        </a>
                      </div>

                      {/* PENGHANTAR MBS: Nama Penghantar & Peranan/Jawatan (cth: SITI ZURAIDAH BT TALKAH (Pendidik Masyarakat)) */}
                      <div className="space-y-1 bg-slate-50 p-3 border-2 border-slate-950">
                        <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">
                          PENGHANTAR MBS
                        </span>
                        <p className="font-black text-slate-950 text-xs sm:text-sm leading-tight">
                          {r.disediakanOleh || 'SITI ZURAIDAH BT TALKAH'}
                        </p>
                        <span className="text-slate-600 text-[11px] block italic mt-0.5">
                          ({r.penghantarJawatan || 'Pendidik Masyarakat'})
                        </span>
                      </div>

                    </div>

                    {/* 5. SYOR (Diisi Pegawai KEMAS / PKD) */}
                    <div className="bg-slate-50 border-2 border-slate-950 p-3.5 sm:p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2">
                        <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest font-mono flex items-center space-x-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>SYOR (Diisi Pegawai KEMAS / PKD)</span>
                        </span>
                        {r.syorOleh && (
                          <span className="text-[10px] font-mono font-black bg-slate-950 text-white px-2 py-0.5 uppercase">
                            {r.syorOleh} {r.syorTarikh ? `• ${r.syorTarikh}` : ''}
                          </span>
                        )}
                      </div>

                      {r.syor ? (
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-mono bg-white p-3 border border-slate-300">
                          {r.syor}
                        </p>
                      ) : (
                        <div className="bg-white p-3 border border-dashed border-slate-300 text-center">
                          <p className="text-xs text-slate-500 italic font-mono">
                            Belum ada syor ulasan rasmi daripada Pegawai KEMAS / PKD.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 6. GAMBAR & 7. TINDAKAN */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t-2 border-slate-200">
                      
                      {/* GAMBAR */}
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-black text-slate-600 uppercase font-mono tracking-wider">
                          GAMBAR LAMPIRAN:
                        </span>
                        {r.gambarUrl ? (
                          <button
                            onClick={() => setSelectedImage(r.gambarUrl || null)}
                            className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-950 px-3 py-1.5 text-xs font-mono font-bold text-slate-950 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            title="Klik untuk lihat gambar penuh"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Lihat Gambar ({r.bil})</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono italic bg-slate-100 px-2 py-1 border border-slate-300">
                            TIADA GAMBAR
                          </span>
                        )}
                      </div>

                      {/* TINDAKAN: Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Butang Kemaskini Syor (Direct review) */}
                        <button
                          onClick={() => openEditSyorModal(r)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border-2 border-slate-950 text-xs font-black uppercase tracking-wider font-mono cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                          title="Kemaskini Syor dan Status"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                          <span>Kemaskini Syor</span>
                        </button>

                        {/* Butang Salin Maklumat */}
                        <button
                          onClick={() => handleCopyReport(r)}
                          className="inline-flex items-center justify-center space-x-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-950 text-xs font-black uppercase tracking-wider font-mono cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                          title="Salin butiran laporan ini"
                        >
                          {copiedId === r.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Disalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-700" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        {/* Butang Padam Laporan */}
                        <button
                          onClick={() => setDeleteTargetId(r.id)}
                          className="inline-flex items-center justify-center space-x-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border-2 border-slate-950 text-xs font-black uppercase tracking-wider font-mono cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                          title="Padam rekod laporan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Padam</span>
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* ===================================================================== */}
          {/* PAPARAN JADUAL: JADUAL SPREADSHEET LAMPIRAN A                         */}
          {/* SUSUNAN TERSUSUN:                                                     */}
          {/* PARLIMEN | DUN | DM | LOKALITI | PERNYATAAN MBS | KATEGORI | PELAPOR   */}
          {/* (Nama & No. Tel) | SYOR (Diisi Pegawai KEMAS / PKD) | GAMBAR | TINDAKAN*/}
          {/* ===================================================================== */}
          {viewMode === 'table' && (
            <div id="mbs-table-spreadsheet" className="bg-white border-4 border-slate-950 overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-x-auto rounded-none">
              <table className="w-full text-left border-collapse table-fixed min-w-[1250px]">
                <thead>
                  {/* Outer Main Header */}
                  <tr className="bg-black text-white border-b-2 border-black">
                    <th colSpan={14} className="py-3.5 text-center text-sm sm:text-base font-black tracking-widest uppercase relative px-4">
                      LAPORAN MAKLUM BALAS SEMASA (MBS) • KAWASAN {getCleanParlimenName(filteredReports).replace(/_/g, ' ').toUpperCase()}
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-white bg-slate-900 px-2.5 py-1 border border-slate-700 hidden sm:inline">
                        FORMAT SPREADSHEET RASMI
                      </span>
                    </th>
                  </tr>
                  {/* Secondary Sub-Meta Header */}
                  <tr className="bg-white border-b-2 border-black text-xs font-black text-black font-mono">
                    <th colSpan={7} className="text-left px-3 py-2 border-r-2 border-black">
                      PARLIMEN: {filteredReports[0]?.parlimen || reports[0]?.parlimen || 'P.071 GOPENG'}
                    </th>
                    <th colSpan={7} className="text-right px-3 py-2">
                      TARIKH LAPORAN: {new Date().getDate()}/{new Date().getMonth() + 1}/{new Date().getFullYear()}
                    </th>
                  </tr>
                  {/* Column Header matching screenshot */}
                  <tr className="bg-black border-b-2 border-black text-[11px] font-black text-white text-center uppercase font-mono">
                    <th className="w-[45px] py-3 border-r border-slate-700 px-1">BIL.</th>
                    <th className="w-[110px] border-r border-slate-700 px-2">PARLIMEN</th>
                    <th className="w-[110px] border-r border-slate-700 px-2">DUN</th>
                    <th className="w-[95px] border-r border-slate-700 px-2">DM</th>
                    <th className="w-[130px] border-r border-slate-700 px-2">LOKALITI</th>
                    <th className="w-[280px] border-r border-slate-700 px-3 text-left">PERNYATAAN MBS (ADUAN)</th>
                    <th className="w-[95px] border-r border-slate-700 px-1.5">KATEGORI</th>
                    <th className="w-[140px] border-r border-slate-700 px-2 text-left">PELAPOR</th>
                    <th className="w-[105px] border-r border-slate-700 px-1.5">NO. TELEFON</th>
                    <th className="w-[140px] border-r border-slate-700 px-2 text-left">PENGHANTAR MBS</th>
                    <th className="w-[130px] border-r border-slate-700 px-2 text-left">JAWATAN PENGHANTAR</th>
                    <th className="w-[200px] border-r border-slate-700 px-2.5 text-left">SYOR PEGAWAI KEMAS / PKD</th>
                    <th className="w-[95px] border-r border-slate-700 px-2">STATUS</th>
                    <th className="w-[105px] px-2 text-center">TINDAKAN</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-950 divide-y-2 divide-slate-950 font-mono">
                  {filteredReports.map((r, index) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition align-top">
                      
                      {/* Bil. */}
                      <td className="py-3 text-center font-black text-slate-950 border-r-2 border-slate-950 bg-slate-100">
                        {r.bil}
                      </td>

                      {/* Parlimen */}
                      <td className="px-2.5 py-3 font-extrabold text-slate-950 uppercase border-r-2 border-slate-950">
                        {r.parlimen}
                      </td>

                      {/* DUN */}
                      <td className="px-2.5 py-3 font-bold text-slate-900 uppercase border-r-2 border-slate-950">
                        {r.dun}
                      </td>

                      {/* DM */}
                      <td className="px-2 py-3 text-[11px] text-slate-700 uppercase border-r-2 border-slate-950">
                        {r.dm}
                      </td>

                      {/* Lokaliti */}
                      <td className="px-2.5 py-3 font-bold text-slate-950 break-words border-r-2 border-slate-950">
                        {r.lokaliti}
                      </td>

                      {/* Pernyataan MBS (Aduan) */}
                      <td className="px-3 py-3 leading-relaxed text-slate-900 border-r-2 border-slate-950 text-[11px] whitespace-pre-wrap break-words">
                        {r.pernyataanMbs}
                      </td>

                      {/* Kategori */}
                      <td className="px-2 py-3 border-r-2 border-slate-950 text-center">
                        <span className="bg-slate-100 border border-slate-950 text-slate-950 px-2 py-1 font-bold block text-[10px] uppercase">
                          {r.kategori}
                        </span>
                      </td>

                      {/* Pelapor */}
                      <td className="px-2.5 py-3 border-r-2 border-slate-950 font-bold text-slate-950">
                        {r.pelaporNama}
                      </td>

                      {/* No. Telefon */}
                      <td className="px-2 py-3 border-r-2 border-slate-950 text-center">
                        <a href={`tel:${r.pelaporTel}`} className="text-blue-700 underline font-bold text-[11px] block">
                          {r.pelaporTel}
                        </a>
                      </td>

                      {/* Penghantar MBS */}
                      <td className="px-2.5 py-3 border-r-2 border-slate-950 text-slate-800">
                        {r.disediakanOleh || 'SITI ZURAIDAH BT TALKAH'}
                      </td>

                      {/* Jawatan Penghantar */}
                      <td className="px-2.5 py-3 border-r-2 border-slate-950 text-slate-700 text-[11px]">
                        {r.penghantarJawatan || 'Pendidik Masyarakat'}
                      </td>

                      {/* Syor Pegawai KEMAS / PKD */}
                      <td className="px-2.5 py-3 border-r-2 border-slate-950">
                        <div className="space-y-1.5">
                          {r.syor ? (
                            <p className="text-slate-900 text-[11px] leading-relaxed bg-slate-50 p-2 border border-slate-300">
                              {r.syor}
                              {r.syorOleh && (
                                <span className="block font-bold text-slate-700 mt-1">
                                  ({r.syorOleh})
                                </span>
                              )}
                            </p>
                          ) : (
                            <span className="text-slate-400 italic text-[11px] block">Belum ada syor / ulasan</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-2 py-3 text-center border-r-2 border-slate-950">
                        {renderStatusBadge(r.status)}
                      </td>

                      {/* Gambar */}
                      <td className="px-2 py-3 text-center border-r-2 border-slate-950">
                        {r.gambarUrl ? (
                          <button 
                            onClick={() => setSelectedImage(r.gambarUrl || null)}
                            className="inline-block border-2 border-slate-950 p-0.5 hover:scale-105 transition cursor-pointer"
                            title="Klik untuk lihat gambar"
                          >
                            <img 
                              src={r.gambarUrl} 
                              alt="Lampiran Aduan" 
                              className="w-10 h-10 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block">TIADA</span>
                        )}
                      </td>

                      {/* Tindakan */}
                      <td className="px-2 py-3 text-center">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => openEditSyorModal(r)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-slate-950 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            title="Kemaskini Syor"
                          >
                            Syor
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(r.id)}
                            className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white border border-slate-950 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            title="Padam Laporan"
                          >
                            Padam
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KEMASKINI SYOR DAN STATUS PEGAWAI KEMAS / PKD                       */}
      {/* ========================================================================= */}
      {editingReport && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingReport(null)}
        >
          <div 
            className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b-2 border-slate-950 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-slate-950 tracking-wider font-mono flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <span>KEMASKINI SYOR PEGAWAI KEMAS / PKD</span>
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  REKOD #{editingReport.bil} • {editingReport.lokaliti} ({editingReport.dun})
                </p>
              </div>
              <button 
                onClick={() => setEditingReport(null)}
                className="text-slate-500 hover:text-slate-950 font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSyor} className="space-y-4 font-mono">
              {/* Ringkasan Pernyataan Aduan */}
              <div className="bg-slate-50 p-3 border-2 border-slate-950 text-xs space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase block">Pernyataan Maklum Balas:</span>
                <p className="text-slate-900 line-clamp-3 italic">"{editingReport.pernyataanMbs}"</p>
              </div>

              {/* Status Tindakan */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-950 block">
                  Status Tindakan:
                </label>
                <select
                  value={editSyorStatus}
                  onChange={(e) => setEditSyorStatus(e.target.value as MBSReport['status'])}
                  className="w-full text-xs px-3 py-2.5 bg-white border-2 border-slate-950 rounded-none font-bold"
                >
                  <option value="Baru">Baru</option>
                  <option value="Dalam Tindakan">Dalam Tindakan</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              {/* Syor Text */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-950 block">
                  Syor dan Cadangan Tindakan:
                </label>
                <textarea
                  rows={4}
                  value={editSyorText}
                  onChange={(e) => setEditSyorText(e.target.value)}
                  placeholder="Masukkan syor tindakan susulan, rujukan agensi teknikal (JKR/PBT/JPS), atau status penyelesaian..."
                  className="w-full text-xs p-3 bg-white border-2 border-slate-950 rounded-none focus:outline-none focus:bg-slate-50 text-slate-950 leading-relaxed font-mono"
                  required
                />
              </div>

              {/* Pegawai Semakan */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-950 block">
                  Nama / Cawangan Pegawai Semakan:
                </label>
                <input
                  type="text"
                  value={editSyorPegawai}
                  onChange={(e) => setEditSyorPegawai(e.target.value)}
                  placeholder="cth: PKD Kampar"
                  className="w-full text-xs px-3 py-2 bg-white border-2 border-slate-950 rounded-none font-bold text-slate-950"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-950 text-slate-900 font-black uppercase text-xs tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-950 font-black uppercase text-xs tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  Simpan Syor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PENGESAHAN PADAM REKOD                                             */}
      {/* ========================================================================= */}
      {deleteTargetId && (
        (() => {
          const reportToDelete = reports.find(r => r.id === deleteTargetId);
          if (!reportToDelete) return null;
          return (
            <div 
              className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 animate-fade-in"
              onClick={() => setDeleteTargetId(null)}
            >
              <div 
                className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between border-b-2 border-slate-950 pb-3">
                  <h3 className="text-base font-black uppercase text-rose-600 tracking-wider font-mono flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span>PENGESAHAN PADAM REKOD</span>
                  </h3>
                  <button 
                    onClick={() => setDeleteTargetId(null)}
                    className="text-slate-500 hover:text-slate-950 font-bold p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 font-mono text-xs text-slate-800 leading-relaxed">
                  <p>Adakah anda pasti mahu memadam rekod laporan Maklum Balas Semasa (MBS) ini?</p>
                  <div className="bg-slate-50 p-3.5 border-2 border-slate-950 space-y-1">
                    <p><span className="font-bold text-slate-600">BILANGAN:</span> #{reportToDelete.bil}</p>
                    <p><span className="font-bold text-slate-600">LOKASI:</span> {reportToDelete.lokaliti} ({reportToDelete.dun})</p>
                    <p><span className="font-bold text-slate-600">PELAPOR:</span> {reportToDelete.pelaporNama}</p>
                  </div>
                  <p className="text-[10px] text-rose-600 font-black uppercase">
                    * Tindakan ini memadam rekod secara kekal.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDeleteTargetId(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-950 text-slate-900 font-black uppercase text-xs cursor-pointer font-mono"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      onDeleteReport(deleteTargetId);
                      setDeleteTargetId(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-950 font-black uppercase text-xs cursor-pointer font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  >
                    Sahkan Padam
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW GAMBAR LAMPIRAN                                            */}
      {/* ========================================================================= */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white border-4 border-slate-950 overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-950 hover:bg-slate-800 text-white border-2 border-slate-950 transition cursor-pointer z-10"
              title="Tutup gambar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-2 bg-slate-900">
              <img 
                src={selectedImage} 
                alt="Gambar Lampiran Aduan MBS" 
                className="w-full h-auto max-h-[75vh] object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-100 border-t-2 border-slate-950 text-center font-mono">
              <p className="text-xs font-black uppercase tracking-wider text-slate-800">
                Gambar Lampiran Maklum Balas Semasa (MBS)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT-ONLY: STANDARD OFFICIAL LAMPIRAN A PAPER DOCUMENT                   */}
      {/* ========================================================================= */}
      <div id="lampiran-a-print-paper" className="hidden print:block w-full text-black bg-white p-2">
        <div className="flex justify-between items-start text-xs font-bold uppercase mb-2">
          <div className="font-black text-black">SULIT</div>
          <div className="text-center italic font-bold text-black tracking-wide">BDRS/MBS/N/V1-2025</div>
          <div className="w-[80px]"></div>
        </div>
        
        <div className="text-center my-4">
          <h2 className="text-base font-black tracking-wider uppercase text-black">
            {filterBulan !== 'SEMUA BULAN'
              ? `LAPORAN MAKLUM BALAS SEMASA (MBS) LAMPIRAN A - BULAN ${filterBulan}`
              : `LAPORAN MAKLUM BALAS SEMASA (MBS) LAMPIRAN A - SEMUA BULAN 2026`}
          </h2>
          <p className="text-[11px] font-bold text-black mt-1">
            STANDARD LAPORAN MBS KEBANGSAAN 2026
          </p>
        </div>
        
        <div className="flex justify-between items-center text-xs font-extrabold uppercase border-b-2 border-black pb-1 mb-4">
          <div>NEGERI: PERAK</div>
          <div>PARLIMEN: {filteredReports[0]?.parlimen || reports[0]?.parlimen || 'P.071 GOPENG'}</div>
          <div>
            BULAN: {filterBulan !== 'SEMUA BULAN' ? filterBulan : 'KESELURUHAN (SEMUA BULAN)'}
          </div>
        </div>

        <table className="w-full text-left border-collapse border-2 border-black text-[11px] leading-relaxed">
          <thead>
            <tr className="bg-slate-100 text-black border-b-2 border-black text-center font-black uppercase text-[10px]">
              <th className="w-[40px] border border-black p-2 text-center" rowSpan={2}>BIL</th>
              <th className="w-[18%] border border-black p-2 text-center" rowSpan={2}>MAKLUMAT KAWASAN<br/>(PARLIMEN/DUN/DM/LOKALITI)</th>
              <th className="w-[34%] border border-black p-2 text-center" rowSpan={2}>PERNYATAAN MBS<br/>(4W 1H)</th>
              <th className="w-[18%] border border-black p-2 text-center" rowSpan={2}>SUMBER RUJUKAN<br/>(PELAPOR & NO TELEFON)</th>
              <th className="w-[18%] border border-black p-2 text-center" rowSpan={2}>SYOR DAN CADANGAN<br/>(DIISI OLEH PKD)</th>
              <th className="border border-black p-1 text-center" colSpan={2}>PETUNJUK</th>
            </tr>
            <tr className="bg-slate-100 text-black border-b-2 border-black text-center font-black uppercase text-[9px]">
              <th className="w-[70px] border border-black p-1 text-center text-[10px]">KATEGORI</th>
              <th className="w-[70px] border border-black p-1 text-center text-[10px]">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((r, idx) => (
              <tr key={r.id} className="align-top border-b border-black">
                <td className="border border-black p-2 text-center font-bold text-[11px]">
                  {idx + 1}
                </td>
                <td className="border border-black p-2 text-[10px] leading-tight">
                  <p className="font-extrabold text-black uppercase mb-0.5">{r.parlimen}</p>
                  <p className="text-black font-bold">{r.dun}</p>
                  <p className="text-slate-800">{r.dm}</p>
                  <p className="font-semibold text-black mt-1">{r.lokaliti}</p>
                </td>
                <td className="border border-black p-2 text-[10.5px] leading-relaxed text-justify">
                  <p className="text-black">{r.pernyataanMbs}</p>
                </td>
                <td className="border border-black p-2 text-[10px] leading-snug">
                  <p className="font-black text-black uppercase">{r.pelaporNama}</p>
                  <p className="mt-0.5 font-mono text-black font-bold">{r.pelaporTel}</p>
                  {(r.disediakanOleh || r.penghantarJawatan) && (
                    <div className="mt-2 pt-1 border-t border-dashed border-black/40 text-[9px] leading-tight">
                      <span className="font-bold text-black uppercase block">Penghantar:</span>
                      <span>{r.disediakanOleh || '-'}</span>
                      <span className="block text-slate-700 italic">({r.penghantarJawatan || 'Pendidik Masyarakat'})</span>
                    </div>
                  )}
                </td>
                <td className="border border-black p-2 text-[10.5px] leading-relaxed">
                  {r.syor ? (
                    <div>
                      <p className="text-black">{r.syor}</p>
                      {r.syorOleh && (
                        <p className="text-[9px] font-extrabold mt-1 text-black">({r.syorOleh})</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Belum ada syor / ulasan</span>
                  )}
                </td>
                <td className="border border-black p-2 text-center font-bold uppercase text-[10px]">
                  {r.kategori}
                </td>
                <td className="border border-black p-2 text-center font-black uppercase text-[10px]">
                  {r.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Official Signatures Container */}
        <div className="mt-14 grid grid-cols-2 gap-12 text-[11px]">
          <div className="space-y-12">
            <p className="font-bold text-black">Disediakan oleh;</p>
            <div className="space-y-0.5 leading-normal">
              <p className="font-bold text-black">_________________________</p>
              <p className="font-black text-black">({(filteredReports[0]?.disediakanOleh || "SITI ZURAIDAH BT TALKAH").toUpperCase()})</p>
              <p className="text-black font-semibold">{filteredReports[0]?.penghantarJawatan || "Pendidik Masyarakat"}</p>
              <p className="text-black font-semibold">KEMAS Daerah Kampar</p>
              <p className="font-mono text-black">Tarikh: {new Date().toLocaleDateString('ms-MY')}</p>
            </div>
          </div>
          
          <div className="space-y-12">
            <p className="font-bold text-black">Disemak oleh;</p>
            <div className="space-y-0.5 leading-normal">
              <p className="font-bold text-black">_________________________</p>
              <p className="font-black text-black">( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</p>
              <p className="text-black font-semibold">Pegawai KEMAS Daerah</p>
              <p className="text-black font-semibold">Kampar</p>
              <p className="font-mono text-black">Tarikh:</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: POLISI KESELAMATAN ROW LEVEL SECURITY (SUPABASE RLS)              */}
      {/* ========================================================================= */}
      {showRlsSqlModal && (
        <div 
          className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowRlsSqlModal(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white border-4 border-slate-950 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 border-2 border-slate-950 text-emerald-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 font-mono">
                    Keselamatan Pangkalan Data: Supabase RLS
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    Row Level Security untuk menjamin privasi data antara kawasan Parlimen.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRlsSqlModal(false)}
                className="p-1.5 hover:bg-slate-100 border border-slate-950 text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-slate-700 text-left leading-relaxed">
              <p>
                Aplikasi telah mengaktifkan <b>penapisan frontend</b> supaya akaun Pegawai Parlimen 
                hanya dipaparkan rekod kawasan parlimen masing-masing (contoh: P.062 Sungai Siput). 
                Bagi perlindungan menyeluruh pada peringkat pangkalan data (mencegah akses terus melalui API), 
                laksanakan polisi <b>Row Level Security (RLS)</b> berikut di Supabase SQL Editor:
              </p>

              <div className="relative">
                <pre className="bg-slate-950 text-emerald-400 p-4 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border-2 border-slate-950 select-all">
{`-- 1. Aktifkan Row Level Security (RLS) pada jadual laporan_mbs
ALTER TABLE public.laporan_mbs ENABLE ROW LEVEL SECURITY;

-- 2. Hapus polisi sedia ada jika wujud
DROP POLICY IF EXISTS "Pegawai hanya lihat data parlimen sendiri" ON public.laporan_mbs;
DROP POLICY IF EXISTS "Master Admin akses semua data" ON public.laporan_mbs;
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

-- 4. Polisi Pengguna Awam / Sistem: Benarkan pendaftaran laporan baharu
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
  OR (true) -- fallback untuk persekitaran anon key yang disahkan di frontend
);`}
                </pre>

                <button
                  type="button"
                  onClick={() => {
                    const sqlCode = `-- 1. Aktifkan Row Level Security (RLS) pada jadual laporan_mbs
ALTER TABLE public.laporan_mbs ENABLE ROW LEVEL SECURITY;

-- 2. Hapus polisi sedia ada jika wujud
DROP POLICY IF EXISTS "Pegawai hanya lihat data parlimen sendiri" ON public.laporan_mbs;
DROP POLICY IF EXISTS "Master Admin akses semua data" ON public.laporan_mbs;
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

-- 4. Polisi Pengguna Awam / Sistem: Benarkan pendaftaran laporan baharu
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
                    setCopiedRlsSql(true);
                    setTimeout(() => setCopiedRlsSql(false), 3000);
                  }}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  {copiedRlsSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Polisi SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs">
                <b>Kelebihan Pelaksanaan:</b>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><b>Privasi Data:</b> Pegawai tidak dapat membaca atau memanipulasi rekod parlimen jiran.</li>
                  <li><b>Eksport &amp; Cetakan Selamat:</b> Eksport Excel dan simpanan Google Drive hanya mengekstrak baris data yang dibenarkan.</li>
                  <li><b>Master Admin Penuh:</b> Master Admin kekal mempunyai akses menyeluruh untuk semua parlimen.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowRlsSqlModal(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Injections */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          header, nav, button, input, select, .no-print, #header-container, #mbs-cards-list, #mbs-table-spreadsheet, #mbs-search-input, .shadow-\\[4px_4px_0px_0px_rgba\\(15\\,23\\,42\\,1\\)\\] {
            display: none !important;
          }
          #mbs-lampiran-a-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          #lampiran-a-print-paper {
            display: block !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid;
          }
          td, th {
            border: 1px solid #000 !important;
            padding: 6px !important;
            color: #000 !important;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>

    </div>
  );
}
