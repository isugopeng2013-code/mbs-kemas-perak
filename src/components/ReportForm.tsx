/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { PERAK_PARLIMEN_DUN, DUN_DM_MAPPING, KATEGORI_SENARAI } from '../data/mockData';
import { LOCALITY_DATA, DMInfo } from '../data/localities';
import { MBSReport, ParlimenDunData, TabType, RegionLockSettings } from '../types';
import { 
  MapPin, 
  FileText, 
  User, 
  Camera, 
  Upload, 
  Check, 
  Trash2, 
  AlertCircle,
  Sparkles,
  FileSpreadsheet,
  Share2,
  Send,
  Mail,
  Lock,
  Unlock,
  Database,
  CheckCircle2
} from 'lucide-react';
import { standardizePernyataanAndGenerateTitle } from '../utils/syorGenerator';
import { submitReportToSupabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface ReportFormProps {
  onAddReport: (report: Omit<MBSReport, 'id' | 'bil' | 'tarikhAduan' | 'status' | 'syor'>) => void;
  setActiveTab: (tab: TabType) => void;
  parlimenDunList?: ParlimenDunData[];
  dunDmMapping?: Record<string, string[]>;
  localityData?: Record<string, DMInfo[]>;
  regionLockSettings?: RegionLockSettings;
}

export function ReportForm({ 
  onAddReport, 
  setActiveTab,
  parlimenDunList,
  dunDmMapping,
  localityData,
  regionLockSettings 
}: ReportFormProps) {
  const isLocked = Boolean(regionLockSettings?.isLocked);
  const lockedParlimen = regionLockSettings?.defaultParlimen || "P.071 GOPENG";

  const activeParlimenList = parlimenDunList && parlimenDunList.length > 0 ? parlimenDunList : PERAK_PARLIMEN_DUN;
  const activeDunDmMapping = dunDmMapping || DUN_DM_MAPPING;
  const activeLocalityData = localityData || LOCALITY_DATA;

  // Form State
  const [parlimen, setParlimen] = useState(() => isLocked ? lockedParlimen : (activeParlimenList[0]?.parlimen || "P.071 GOPENG"));
  const [dun, setDun] = useState(() => {
    if (isLocked) {
      const match = activeParlimenList.find(p => p.parlimen === lockedParlimen);
      return match?.dunList[0] || "N.44 SUNGAI RAPAT";
    }
    return activeParlimenList[0]?.dunList[0] || "N.44 SUNGAI RAPAT";
  });
  const [customParlimen, setCustomParlimen] = useState('');
  const [customDun, setCustomDun] = useState('');
  const [isCustomKawasan, setIsCustomKawasan] = useState(false);

  // Sync state when region lock settings or activeParlimenList update
  useEffect(() => {
    if (isLocked && lockedParlimen) {
      setParlimen(lockedParlimen);
      setIsCustomKawasan(false);
      const related = activeParlimenList.find(p => p.parlimen === lockedParlimen);
      if (related && related.dunList.length > 0) {
        if (!related.dunList.includes(dun)) {
          setDun(related.dunList[0]);
        }
      }
    } else if (!isLocked) {
      // If current parlimen is not in activeParlimenList, sync to first available
      const exists = activeParlimenList.some(p => p.parlimen === parlimen);
      if (!exists && activeParlimenList.length > 0) {
        setParlimen(activeParlimenList[0].parlimen);
        if (activeParlimenList[0].dunList.length > 0) {
          setDun(activeParlimenList[0].dunList[0]);
        }
      } else {
        const related = activeParlimenList.find(p => p.parlimen === parlimen);
        if (related && related.dunList.length > 0 && !related.dunList.includes(dun)) {
          setDun(related.dunList[0]);
        }
      }
    }
  }, [isLocked, lockedParlimen, activeParlimenList, parlimen, dun]);

  const [dm, setDm] = useState('');
  const [lokaliti, setLokaliti] = useState('');
  const [kategori, setKategori] = useState(KATEGORI_SENARAI[0]);
  const [pernyataanMbs, setPernyataanMbs] = useState('');

  const [pelaporNama, setPelaporNama] = useState('');
  const [pelaporTel, setPelaporTel] = useState('');
  const [disediakanOleh, setDisediakanOleh] = useState('');
  const [penghantarJawatan, setPenghantarJawatan] = useState('Pendidik Masyarakat');
  const [gambarUrl, setGambarUrl] = useState<string>('');
  
  // Camera & Upload state
  const [showCamera, setShowCamera] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmittingToSupabase, setIsSubmittingToSupabase] = useState(false);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Gemini AI Suggestion States
  const [cadanganAyat, setCadanganAyat] = useState<string[]>([]);
  const [sedangLoading, setSedangLoading] = useState(false);
  const [geminiError, setGeminiError] = useState('');

  // Function to request Gemini suggestions from Express server API
  const kendaliJanaCadangan = async () => {
    if (!pernyataanMbs.trim()) return;
    setSedangLoading(true);
    setGeminiError('');
    try {
      const response = await fetch('/api/gemini/variasi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teksAsal: pernyataanMbs }),
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal menghubungi server.');
      }
      
      const data = await response.json();
      if (Array.isArray(data.variations) && data.variations.length > 0) {
        setCadanganAyat(data.variations);
      } else {
        throw new Error('Hasil penjanaan tidak mengikut format yang betul.');
      }
    } catch (error: any) {
      console.error("Gagal menjana ayat:", error);
      setGeminiError(error.message || 'Ralat berlaku semasa menjana cadangan.');
    } finally {
      setSedangLoading(false);
    }
  };

  const pilihAyatCadangan = (ayatDipilih: string) => {
    setPernyataanMbs(ayatDipilih);
    setCadanganAyat([]);
  };
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Filter DUNs based on effective Parlimen (locked or selected)
  const effectiveParlimen = isLocked ? lockedParlimen : parlimen;
  const activeParlimenObj = activeParlimenList.find(p => p.parlimen === effectiveParlimen) || activeParlimenList[0];
  const availableDUNs = activeParlimenObj ? activeParlimenObj.dunList : [];

  // Update DUN when Parlimen changes
  const handleParlimenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isLocked) return;
    const chosen = e.target.value;
    setParlimen(chosen);
    const related = activeParlimenList.find(p => p.parlimen === chosen);
    if (related && related.dunList.length > 0) {
      setDun(related.dunList[0]);
    }
  };

  // Sync DM when DUN changes in non-custom mode
  React.useEffect(() => {
    if (!isCustomKawasan && dun) {
      const dmList = activeDunDmMapping[dun] || [];
      if (dmList.length > 0) {
        if (!dmList.includes(dm)) {
          setDm(dmList[0]);
        }
      }
    }
  }, [dun, isCustomKawasan, dm, activeDunDmMapping]);

  // Get localities for current DUN & DM
  const currentDMObj = React.useMemo(() => {
    if (isCustomKawasan || !dun || !dm) return null;
    const dunDMList = activeLocalityData[dun] || [];
    return dunDMList.find(d => d.name.toUpperCase() === dm.toUpperCase()) || null;
  }, [dun, dm, isCustomKawasan, activeLocalityData]);

  const activeLocalities = currentDMObj ? currentDMObj.localities : [];

  React.useEffect(() => {
    if (activeLocalities.length > 0) {
      // Check if current lokaliti is still among the active localities
      const stillValid = activeLocalities.some(loc => `[${loc.code}] ${loc.name}` === lokaliti);
      if (!stillValid) {
        const firstLoc = activeLocalities[0];
        setLokaliti(`[${firstLoc.code}] ${firstLoc.name}`);
      }
    } else {
      setLokaliti('');
    }
  }, [activeLocalities, lokaliti]);

  // Image upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Saiz fail melebihi 5MB. Sila pilih gambar yang lebih kecil.");
        return;
      }
      setErrorMsg('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setGambarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setErrorMsg('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Gagal mengakses kamera peranti. Pastikan anda memberi kebenaran kamera atau muat naik fail secara manual.");
    }
  };

  // Capture Image from Video Stream
  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setGambarUrl(dataUrl);
        stopCamera();
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Form submission validation & handling
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    const parlimenValue = isLocked ? lockedParlimen : (isCustomKawasan ? customParlimen.trim() : parlimen);
    const dunValue = (isCustomKawasan && !isLocked) ? customDun.trim() : dun;

    if (!parlimenValue) {
      setErrorMsg("Sila nyatakan kawasan Parlimen.");
      return;
    }
    if (!dunValue) {
      setErrorMsg("Sila nyatakan kawasan DUN.");
      return;
    }
    if (!dm.trim()) {
      setErrorMsg("Sila isi Daerah Mengundi (DM).");
      return;
    }
    if (!lokaliti.trim()) {
      setErrorMsg("Sila isi lokasi / lokaliti terperinci.");
      return;
    }
    if (!pernyataanMbs.trim()) {
      setErrorMsg("Sila tulis kenyataan atau penjelasan isu maklum balas.");
      return;
    }
    if (!pelaporNama.trim()) {
      setErrorMsg("Sila isi Nama Pelapor.");
      return;
    }
    if (!pelaporTel.trim()) {
      setErrorMsg("Sila isi No Telefon Pelapor.");
      return;
    }
    if (!disediakanOleh.trim()) {
      setErrorMsg("Sila isi Nama Penghantar MBS.");
      return;
    }
    if (!penghantarJawatan.trim()) {
      setErrorMsg("Sila isi Jawatan Penghantar MBS.");
      return;
    }

    let finalDm = dm.trim();
    if (!isCustomKawasan && dunValue) {
      const dunDMList = activeLocalityData[dunValue] || [];
      const matchedDMObj = dunDMList.find(d => d.name.toUpperCase() === dm.toUpperCase());
      if (matchedDMObj && matchedDMObj.code) {
        finalDm = `[${matchedDMObj.code}] ${dm.trim()}`;
      }
    }

    const generatedId = `mbs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newReportData = {
      id: generatedId,
      parlimen: parlimenValue,
      dun: dunValue,
      dm: finalDm,
      lokaliti: lokaliti.trim(),
      kategori,
      pernyataanMbs: pernyataanMbs.trim(),
      pelaporNama: pelaporNama.trim(),
      pelaporTel: pelaporTel.trim(),
      disediakanOleh: disediakanOleh.trim(),
      penghantarJawatan: penghantarJawatan.trim(),
      gambarUrl: gambarUrl || undefined,
      status: 'Baru' as const,
      syor: '',
      tarikhAduan: new Date().toISOString().split('T')[0]
    };

    // Update state in app immediately
    onAddReport(newReportData);

    // Hantar terus ke jadual laporan_mbs di Supabase (Cloud database)
    setIsSubmittingToSupabase(true);
    submitReportToSupabase(newReportData)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[Supabase Submit Notice]:', error.message);
          setSupabaseSyncStatus({
            success: false,
            message: `Ralat simpan ke Supabase: ${error.message || 'Sila semak rangkaian'}`
          });
        } else {
          console.log('[Supabase Submit Success]:', data);
          setSupabaseSyncStatus({
            success: true,
            message: 'Data borang berjaya disimpan terus ke jadual laporan_mbs di Supabase secara awan (Cloud).'
          });
        }
      })
      .catch((err) => {
        console.error('[Supabase Submit Exception]:', err);
        setSupabaseSyncStatus({
          success: false,
          message: 'Gagal menghubungi pelayan Supabase.'
        });
      })
      .finally(() => {
        setIsSubmittingToSupabase(false);
      });

    setDm(finalDm);
    setIsSubmitted(true);
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset form to add another one
  const handleResetForm = () => {
    setDm('');
    setLokaliti('');
    setPernyataanMbs('');
    setPelaporNama('');
    setPelaporTel('');
    setDisediakanOleh('');
    setPenghantarJawatan('Pendidik Masyarakat');
    setGambarUrl('');
    setSupabaseSyncStatus(null);
    setIsSubmitted(false);
  };

  // Export Single Report to Official Lampiran A Excel layout
  const exportSingleToExcel = () => {
    const sheetName = "Lampiran A - MBS";
    const parlimenValue = isCustomKawasan ? customParlimen : parlimen;
    const dunValue = isCustomKawasan ? customDun : dun;
    const tarikhSelesai = new Date().toLocaleDateString('ms-MY');

    const styleBlock = `
      <style>
        .mbs-table {
          border-collapse: collapse;
          width: 100%;
          font-family: Arial, sans-serif;
        }
        .mbs-table th, .mbs-table td {
          border: 1px solid #000000 !important;
          padding: 10px;
          vertical-align: top;
          font-size: 11px;
        }
        .main-title {
          background-color: #1e293b !important;
          color: #ffffff !important;
          font-size: 13px !important;
          font-weight: bold;
          text-align: center;
          padding: 12px;
          text-transform: uppercase;
        }
        .section-header {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          font-weight: bold;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
        }
        .label-cell {
          background-color: #f8fafc !important;
          font-weight: bold;
          width: 25%;
        }
        .value-cell {
          text-align: left;
        }
      </style>
    `;

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
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        ${styleBlock}
      </head>
      <body>
        <table class="mbs-table">
          <thead>
            <tr>
              <th colspan="4" class="main-title">
                LAMPIRAN A<br/>BORANG PENDAFTARAN MAKLUM BALAS SEMASA (MBS)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="4" class="section-header"><b>1. MAKLUMAT KAWASAN LAPORAN</b></td>
            </tr>
            <tr>
              <td class="label-cell">Kawasan Parlimen:</td>
              <td class="value-cell" colspan="3">${parlimenValue}</td>
            </tr>
            <tr>
              <td class="label-cell">Kawasan DUN:</td>
              <td class="value-cell" colspan="3">${dunValue}</td>
            </tr>
            <tr>
              <td class="label-cell">Daerah Mengundi (DM):</td>
              <td class="value-cell">${dm}</td>
              <td class="label-cell">Lokasi / Lokaliti:</td>
              <td class="value-cell">${lokaliti}</td>
            </tr>

            <tr>
              <td colspan="4" class="section-header"><b>2. KATEGORI & PERNYATAAN MASALAH (MBS)</b></td>
            </tr>
            <tr>
              <td class="label-cell">Kategori Isu:</td>
              <td class="value-cell" colspan="3"><b>${kategori}</b></td>
            </tr>
            <tr>
              <td class="label-cell">Pernyataan MBS:</td>
              <td class="value-cell" colspan="3" style="white-space: pre-wrap; font-family: 'Courier New', Courier, monospace;">${pernyataanMbs}</td>
            </tr>

            <tr>
              <td colspan="4" class="section-header"><b>3. MAKLUMAT PELAPOR ASAL</b></td>
            </tr>
            <tr>
              <td class="label-cell">Nama Pengadu / Pelapor:</td>
              <td class="value-cell" colspan="3">${pelaporNama}</td>
            </tr>
            <tr>
              <td class="label-cell">No. Telefon Bimbit:</td>
              <td class="value-cell" colspan="3">${pelaporTel}</td>
            </tr>

            <tr>
              <td colspan="4" class="section-header"><b>4. PEGAWAI PENYEDIA / PENGHANTAR LAPORAN</b></td>
            </tr>
            <tr>
              <td class="label-cell">Nama Pegawai:</td>
              <td class="value-cell" colspan="3">${disediakanOleh}</td>
            </tr>
            <tr>
              <td class="label-cell">Jawatan Pegawai:</td>
              <td class="value-cell" colspan="3">${penghantarJawatan}</td>
            </tr>
            <tr>
              <td class="label-cell">Tarikh Rekod:</td>
              <td class="value-cell"><b>${tarikhSelesai}</b></td>
              <td class="label-cell">Status Rekod:</td>
              <td class="value-cell" style="color: #be123c; font-weight: bold;">BARU</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Lampiran_A_MBS_${parlimenValue.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Share summary via WhatsApp
  const shareToWhatsApp = () => {
    const parlimenValue = isCustomKawasan ? customParlimen : parlimen;
    const dunValue = isCustomKawasan ? customDun : dun;
    const text = `*LAPORAN MAKLUM BALAS SEMASA (MBS) - LAMPIRAN A*

*Kawasan:* Parlimen ${parlimenValue}, DUN ${dunValue}
*DM / Lokaliti:* ${dm} / ${lokaliti}
*Kategori:* ${kategori}

*Pernyataan MBS:*
"${pernyataanMbs}"

*Pelapor:* ${pelaporNama} (${pelaporTel})
*Disediakan Oleh:* ${disediakanOleh} (${penghantarJawatan})
*Tarikh:* ${new Date().toLocaleDateString('ms-MY')}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Share summary via Email
  const shareToEmail = () => {
    const parlimenValue = isCustomKawasan ? customParlimen : parlimen;
    const dunValue = isCustomKawasan ? customDun : dun;
    const subject = `Laporan MBS Lampiran A: ${parlimenValue} (${dunValue})`;
    const body = `LAMPIRAN A - BORANG PENDAFTARAN MAKLUM BALAS SEMASA (MBS)

Butiran Laporan:
------------------------------------------
Kawasan Parlimen : ${parlimenValue}
Kawasan DUN       : ${dunValue}
Daerah Mengundi  : ${dm}
Lokasi / Lokaliti : ${lokaliti}
Kategori Isu      : ${kategori}

Pernyataan MBS (Huraian):
"${pernyataanMbs}"

Maklumat Pelapor:
Nama Pelapor      : ${pelaporNama}
No. Telefon       : ${pelaporTel}

Disediakan Oleh:
Nama Pegawai      : ${disediakanOleh}
Jawatan           : ${penghantarJawatan}
Tarikh Rekod      : ${new Date().toLocaleDateString('ms-MY')}
------------------------------------------
Sila rujuk sistem utama untuk ulasan syor atau lampiran foto.`;

    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  if (isSubmitted) {
    return (
      <div id="form-success-container" className="max-w-xl mx-auto bg-white border-4 border-slate-950 p-6 sm:p-8 text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] mt-4 md:mt-8 rounded-none animate-fade-in">
        <div className="h-16 w-16 bg-blue-50 rounded-none flex items-center justify-center text-blue-600 mx-auto border-2 border-slate-950 shadow-sm">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900">Laporan Dihantar!</h3>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-wider max-w-sm mx-auto">
            Maklum Balas Semasa (MBS) anda telah didaftarkan ke dalam fail Lampiran A secara masa-nyata.
          </p>
        </div>

        <div className="bg-slate-50 p-5 rounded-none border-2 border-slate-950 text-left text-xs space-y-2.5 text-slate-800">
          <div className="flex justify-between border-b-2 border-slate-950 pb-2 font-black text-[10px] uppercase tracking-wider text-slate-900">
            <span>Klip Ringkasan</span>
            <span className="text-blue-600">SELESAI</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Kawasan:</span>
            <span className="font-mono text-slate-900 font-extrabold">{isCustomKawasan ? customParlimen : parlimen} ({isCustomKawasan ? customDun : dun})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Lokaliti:</span>
            <span className="font-mono text-slate-900 font-extrabold truncate max-w-[200px]">{lokaliti}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Pelapor:</span>
            <span className="font-mono text-slate-900 font-extrabold">{pelaporNama}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Penghantar:</span>
            <span className="font-mono text-slate-900 font-extrabold">{disediakanOleh} ({penghantarJawatan})</span>
          </div>

          {/* Supabase Realtime Status */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Pangkalan Data Supabase:</span>
            </span>
            <span className="font-mono font-bold text-slate-700">
              {isSubmittingToSupabase ? (
                <span className="text-blue-600 animate-pulse">Menghantar ke laporan_mbs...</span>
              ) : supabaseSyncStatus ? (
                <span className={supabaseSyncStatus.success ? "text-emerald-700 font-black" : "text-amber-700"}>
                  {supabaseSyncStatus.message}
                </span>
              ) : isSupabaseConfigured ? (
                <span className="text-emerald-700">Dihantar ke laporan_mbs</span>
              ) : (
                <span className="text-slate-500">Mod Simpan Tempatan</span>
              )}
            </span>
          </div>
        </div>

        {/* Dynamic Excel Export and Sharing Actions */}
        <div className="border-4 border-slate-950 bg-amber-50/50 p-5 space-y-4 text-left">
          <div className="border-b-2 border-slate-950 pb-2 flex items-center space-x-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <h4 className="font-mono font-black text-[11px] uppercase tracking-wider text-slate-900">
              Pilihan Eksport &amp; Perkongsian Laporan (Lampiran A)
            </h4>
          </div>

          <p className="text-[10px] font-mono leading-relaxed text-slate-600">
            Pilih butang eksport di bawah untuk memuat turun salinan fail Microsoft Excel berformat rasmi Lampiran A atau kongsi secara pantas kepada rakan sekerja.
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={exportSingleToExcel}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black font-mono text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-x-[1.5px] active:translate-y-[1.5px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Muat Turun Excel Rasmi (Lampiran A)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={shareToWhatsApp}
                className="px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white font-black font-mono text-[10px] uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kongsi WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={shareToEmail}
                className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black font-mono text-[10px] uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Kongsi Emel</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleResetForm}
            className="flex-1 py-3.5 bg-white hover:bg-slate-50 text-slate-950 font-black text-xs tracking-widest uppercase border-2 border-slate-950 rounded-none transition duration-150 cursor-pointer shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
          >
            Daftar Laporan Lain
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs tracking-widest uppercase border-2 border-slate-950 rounded-none transition duration-150 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
          >
            Lihat Senarai Jadual
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Title block with sharp border underlay */}
      <div className="text-left border-b-4 border-slate-950 pb-5 space-y-2">
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">
          Pendaftaran Maklum Balas Semasa
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-500 font-mono uppercase tracking-widest">
          Sila lengkapkan laporan parlimen untuk tindakan rujukan Lampiran A.
        </p>
      </div>

      <form id="mbs-registration-form" onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1: KAWASAN LAPORAN */}
        <div className="bg-white p-5 sm:p-8 rounded-none border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="flex items-center space-x-3 border-b-2 border-slate-950 pb-4">
            <div className="p-2 bg-blue-600 text-white rounded-none border border-slate-950 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">1. Negeri / Kawasan Parlimen</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Padanan lokaliti sasar mengikut pengelasan pilihanraya</p>
            </div>
          </div>

          {/* Locked Region Indicator Banner */}
          {isLocked && (
            <div id="mbs-lock-indicator-banner" className="bg-amber-50 border-2 border-amber-600 p-4 flex items-start gap-3.5 text-amber-950 shadow-[3px_3px_0px_0px_rgba(217,119,6,1)]">
              <div className="p-2 bg-amber-400 border border-slate-950 text-slate-950 shrink-0 mt-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 border border-amber-600">
                    Kawasan Dikunci oleh Pentadbir
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-950">{lockedParlimen}</span>
                </div>
                <p className="text-xs font-mono text-amber-900 leading-relaxed">
                  Borang MBS ini telah dikunci kepada kawasan Parlimen <b>{lockedParlimen}</b>. Pilihan DUN, Daerah Mengundi (DM), dan Lokaliti di bawah telah ditapis secara automatik untuk kawasan pentadbiran ini sahaja.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Toggle custom kawasan */}
            {isLocked ? (
              <div className="sm:col-span-2 flex items-center justify-between bg-slate-100 p-4 rounded-none border-2 border-slate-300 text-slate-600">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Kawasan Dikunci Pentadbir: Mod Input Bebas Dinyahaktifkan
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Pilihan kawasan telah dikunci secara rasmi kepada {lockedParlimen}. Sila pilih DUN, DM, dan Lokaliti daripada senarai sah di bawah.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-black px-2 py-1 bg-amber-200 text-amber-950 uppercase border border-amber-400">
                  Terkunci
                </span>
              </div>
            ) : (
              <div className="sm:col-span-2 flex items-center justify-between bg-slate-50 p-4 rounded-none border-2 border-slate-950">
                <div className="space-y-0.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">Tulis Kawasan Secara Manual?</span>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Aktifkan sekiranya DUN / Parlimen tiada dalam senarai pilihan</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isCustomKawasan} 
                    onChange={(e) => setIsCustomKawasan(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-950 after:border after:rounded-none after:h-5 after:width-5 after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 border border-slate-950"></div>
                </label>
              </div>
            )}

            {isCustomKawasan && !isLocked ? (
              <>
                {/* Custom Parlimen */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Parlimen <span className="text-rose-500 font-sans">*</span></label>
                  <input
                    type="text"
                    required
                    value={customParlimen}
                    onChange={(e) => setCustomParlimen(e.target.value.toUpperCase())}
                    placeholder="CONTOH: P.094 HULU SELANGOR"
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
                  />
                </div>

                {/* Custom DUN */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">DUN <span className="text-rose-500 font-sans">*</span></label>
                  <input
                    type="text"
                    required
                    value={customDun}
                    onChange={(e) => setCustomDun(e.target.value.toUpperCase())}
                    placeholder="CONTOH: N.05 HULU BERNAM"
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Select Parlimen */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">
                      Parlimen <span className="text-rose-500 font-sans">*</span>
                    </label>
                    {isLocked && (
                      <span className="text-[10px] font-mono font-black uppercase text-amber-900 bg-amber-200 px-2 py-0.5 border border-amber-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-800" />
                        Dikunci
                      </span>
                    )}
                  </div>
                  <select
                    id="input-parlimen"
                    value={effectiveParlimen}
                    onChange={handleParlimenChange}
                    disabled={isLocked}
                    className={`w-full text-sm px-4 py-3 border-2 border-slate-950 rounded-none font-mono ${
                      isLocked 
                        ? 'bg-slate-200 text-slate-700 cursor-not-allowed border-slate-400 font-bold select-none opacity-90' 
                        : 'bg-slate-50 focus:bg-white text-slate-800 font-medium cursor-pointer'
                    }`}
                  >
                    {isLocked ? (
                      <option value={lockedParlimen}>{lockedParlimen} (DIKUNCI OLEH PENTADBIR)</option>
                    ) : (
                      activeParlimenList.map((p) => (
                        <option key={p.parlimen} value={p.parlimen}>{p.parlimen}</option>
                      ))
                    )}
                  </select>
                  {isLocked && (
                    <p className="text-[10px] text-amber-800 font-mono">
                      Kawasan Parlimen ini telah dikunci oleh Pentadbir Sistem.
                    </p>
                  )}
                </div>

                {/* Select DUN */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">DUN <span className="text-rose-500 font-sans">*</span></label>
                  <select
                    id="input-dun"
                    value={dun}
                    onChange={(e) => setDun(e.target.value)}
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono font-medium cursor-pointer"
                  >
                    {availableDUNs.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Daerah Mengundi (DM) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">DM (Daerah Mengundi) <span className="text-rose-500 font-sans">*</span></label>
              {isCustomKawasan ? (
                <input
                  type="text"
                  required
                  value={dm}
                  onChange={(e) => setDm(e.target.value)}
                  placeholder="cth: Ara Payong, Pekan Razaki, Pos Raya"
                  className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
                />
              ) : (
                <select
                  value={dm}
                  onChange={(e) => setDm(e.target.value)}
                  className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono font-medium cursor-pointer"
                >
                  {(activeDunDmMapping[dun] || []).map((dmName) => {
                    const dunDMList = activeLocalityData[dun] || [];
                    const dmObj = dunDMList.find(d => d.name.toUpperCase() === dmName.toUpperCase());
                    const displayLabel = dmObj ? `[${dmObj.code}] ${dmName}` : dmName;
                    return (
                      <option key={dmName} value={dmName}>{displayLabel}</option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Lokaliti */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">
                Lokaliti Spesifik <span className="text-rose-500 font-sans">*</span>
              </label>
              {activeLocalities.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={activeLocalities.some(loc => `[${loc.code}] ${loc.name}` === lokaliti) ? lokaliti : "KUSTOM_LAIN_LAIN"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "KUSTOM_LAIN_LAIN") {
                        setLokaliti("");
                      } else {
                        setLokaliti(val);
                      }
                    }}
                    className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono font-medium cursor-pointer"
                  >
                    {activeLocalities.map((loc) => {
                      const valStr = `[${loc.code}] ${loc.name}`;
                      return (
                        <option key={loc.code} value={valStr}>
                          [{loc.code}] {loc.name}
                        </option>
                      );
                    })}
                    <option value="KUSTOM_LAIN_LAIN">💡 LAIN-LAIN / KUSTOM...</option>
                  </select>
                  
                  {(!activeLocalities.some(loc => `[${loc.code}] ${loc.name}` === lokaliti) || lokaliti === "") && (
                    <input
                      type="text"
                      required
                      value={lokaliti}
                      onChange={(e) => setLokaliti(e.target.value)}
                      placeholder="Sila nyatakan kustom lokaliti di bawah DM ini"
                      className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={lokaliti}
                  onChange={(e) => setLokaliti(e.target.value)}
                  placeholder="cth: Lorong 4 Blok C, Hadapan Masjid Al-Falah"
                  className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800"
                />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: ADUAN / MAKLUMBALAS SEMASA */}
        <div className="bg-white p-5 sm:p-8 rounded-none border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="flex items-center space-x-3 border-b-2 border-slate-950 pb-4">
            <div className="p-2 bg-blue-600 text-white rounded-none border border-slate-950 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">2. Butiran Maklum Bas (MBS)</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Perincian insiden, kategori isu, serta penyertaan gambar bukti</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Kategori Isu <span className="text-rose-500 font-sans">*</span></label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-850 font-mono font-medium cursor-pointer"
              >
                {KATEGORI_SENARAI.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Pernyataan MBS */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Pernyataan MBS <span className="text-rose-500 font-sans">*</span></label>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">{pernyataanMbs.length} aksara dimasukkan</span>
                </div>
              </div>
              <textarea
                required
                rows={4}
                value={pernyataanMbs}
                onChange={(e) => setPernyataanMbs(e.target.value)}
                placeholder="Tulis secara jelas: Perihal kerosakan, rintangan penduduk, lokasi terperinci, atau tindakan segera yang diperlukan."
                className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono leading-relaxed"
              ></textarea>

              <div className="flex flex-col space-y-3 mt-2">
                <button
                  type="button"
                  onClick={kendaliJanaCadangan}
                  disabled={sedangLoading || !pernyataanMbs.trim()}
                  className="w-full sm:w-auto self-start px-4 py-2.5 bg-blue-600 text-white font-bold font-mono text-xs uppercase tracking-wider border-2 border-slate-950 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                >
                  {sedangLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Sedang menjana cadangan AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>💡 Cadangkan 3 Ayat Alternatif (AI)</span>
                    </>
                  )}
                </button>

                {geminiError && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-950 font-mono text-xs text-rose-800 flex items-center gap-2">
                    <span className="font-bold">Ralat:</span> {geminiError}
                  </div>
                )}

                {/* Display 3 AI Sentence Options */}
                {cadanganAyat.length > 0 && (
                  <div className="p-4 bg-amber-50/70 border-2 border-dashed border-slate-950 space-y-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                    <p className="font-bold text-xs text-amber-950 uppercase tracking-wide font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      <span>Sila pilih salah satu ayat di bawah jika setuju untuk menggantikan ayat anda, atau abaikan sekiranya mahu kekalkan ayat asal:</span>
                    </p>
                    
                    <div className="space-y-2.5">
                      {cadanganAyat.map((ayat, indeks) => (
                        <div 
                          key={indeks}
                          onClick={() => pilihAyatCadangan(ayat)}
                          className="p-3.5 bg-white border-2 border-slate-950 hover:bg-blue-50 cursor-pointer transition-all duration-150 text-xs font-mono leading-relaxed relative group active:translate-x-[1px] active:translate-y-[1px]"
                        >
                          <div className="font-bold text-[10px] text-blue-700 uppercase tracking-widest mb-1 font-mono">
                            Pilihan {indeks + 1}
                          </div>
                          <p className="text-slate-800 group-hover:text-slate-950">{ayat}</p>
                        </div>
                      ))}
                    </div>

                    <button 
                      type="button"
                      onClick={() => setCadanganAyat([])}
                      className="text-xs text-red-600 font-bold uppercase tracking-wider font-mono hover:text-red-800 flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <span>❌ Kekalkan ayat asal saya (Abaikan cadangan)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Gambar Upload / Ambil Foto */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Gambar / Dokumentasi Visual (Sangat Digalakkan)</label>
              
              {!gambarUrl ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: File Browser */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-950 hover:bg-slate-50 p-6 rounded-none flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition bg-slate-50/50"
                  >
                    <Upload className="w-8 h-8 text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Muat Naik Gambar</span>
                    <span className="text-[10px] text-slate-400 font-mono">Pilih dari galeri (maks 5MB)</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Option 2: Live Camera Capture */}
                  <div 
                    onClick={startCamera}
                    className="border-2 border-dashed border-slate-950 hover:bg-slate-50 p-6 rounded-none flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition bg-slate-50/50"
                  >
                    <Camera className="w-8 h-8 text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Gunakan Kamera Peranti</span>
                    <span className="text-[10px] text-slate-400 font-mono">Tangkap gambar isu secara langsung</span>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-none overflow-hidden border-2 border-slate-950 bg-slate-100 max-w-sm">
                  <img 
                    src={gambarUrl} 
                    alt="Preview Isu" 
                    className="w-full h-48 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setGambarUrl('')}
                      className="p-2 bg-slate-950 text-white rounded-none border border-slate-900 shadow cursor-pointer"
                      title="Padam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2.5 bg-white border-t border-slate-100 text-[10px] font-mono uppercase tracking-wider text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    Lampiran sedia dihantar
                  </div>
                </div>
              )}

              {/* Camera Interface if active */}
              {showCamera && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center p-4">
                  <div className="bg-slate-950 rounded-none border-4 border-slate-950 overflow-hidden shadow-2xl max-w-lg w-full flex flex-col">
                    <div className="p-4 bg-slate-900 border-b-2 border-slate-950 flex justify-between items-center text-white">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-blue-400" />
                        <span>Kamera Aktif</span>
                      </span>
                      <button 
                        type="button" 
                        onClick={stopCamera}
                        className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="relative bg-black aspect-video flex items-center justify-center">
                      <video 
                        ref={videoRef} 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-5 bg-slate-900 border-t-2 border-slate-950 flex justify-center space-x-4">
                      <button
                        type="button"
                        onClick={captureImage}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-wider uppercase rounded-none border-2 border-slate-950 cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Camera className="w-4 h-4 mr-1.5 inline" />
                        <span>Tangkap Gambar</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wider uppercase rounded-none border border-slate-700 cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: PELAPOR */}
        <div className="bg-white p-5 sm:p-8 rounded-none border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="flex items-center space-x-3 border-b-2 border-slate-950 pb-4">
            <div className="p-2 bg-blue-600 text-white rounded-none border border-slate-950 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">3. Butiran Pelapor / Pengadu</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Lengkapkan identiti pengadu rasmi untuk tindak susul dan rujukan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Pelapor */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Nama Pelapor <span className="text-rose-500 font-sans">*</span></label>
              <input
                type="text"
                required
                value={pelaporNama}
                onChange={(e) => setPelaporNama(e.target.value)}
                placeholder="Contoh: Ahmad Razali Bin Yusof"
                className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
              />
            </div>

            {/* No Tel Pelapor */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">No Telefon Bimbit <span className="text-rose-500 font-sans">*</span></label>
              <input
                type="tel"
                required
                value={pelaporTel}
                onChange={(e) => setPelaporTel(e.target.value)}
                placeholder="Contoh: 012-3456789"
                className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PENGHANTAR MBS */}
        <div className="bg-white p-5 sm:p-8 rounded-none border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="flex items-center space-x-3 border-b-2 border-slate-950 pb-4">
            <div className="p-2 bg-blue-600 text-white rounded-none border border-slate-950 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">4. Butiran Penghantar MBS &amp; Jawatan</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Lengkapkan identiti pegawai penyedia atau penghantar laporan MBS ini</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Penghantar MBS */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Nama Penghantar MBS <span className="text-rose-500 font-sans">*</span></label>
              <input
                type="text"
                required
                value={disediakanOleh}
                onChange={(e) => setDisediakanOleh(e.target.value)}
                placeholder="Contoh: SITI ZURAIDAH BT TALKAH"
                className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
              />
            </div>

            {/* Jawatan */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Jawatan <span className="text-rose-500 font-sans">*</span></label>
              <input
                type="text"
                required
                value={penghantarJawatan}
                onChange={(e) => setPenghantarJawatan(e.target.value)}
                placeholder="Contoh: Pendidik Masyarakat"
                className="w-full text-sm px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Errors & Buttons */}
        {errorMsg && (
          <div id="form-error-alert" className="p-4 bg-rose-50 border-2 border-rose-950 text-rose-800 text-xs sm:text-sm rounded-none flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-950 font-black text-xs tracking-widest uppercase border-2 border-slate-950 rounded-none transition duration-150 cursor-pointer text-center"
          >
            Kembali
          </button>
          
          <button
            type="submit"
            disabled={!pernyataanMbs.trim()}
            className={`flex-1 px-6 py-4 font-black text-xs tracking-widest uppercase border-2 border-slate-950 rounded-none transition duration-150 flex items-center justify-center space-x-2 cursor-pointer ${
              pernyataanMbs.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
                : 'bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed border-dashed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Hantar Pendaftaran MBS Ini</span>
          </button>
        </div>

      </form>
    </div>
  );
}
