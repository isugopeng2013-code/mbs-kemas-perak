/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MBSReport, SystemSettings } from '../types';
import { 
  Building2, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Save, 
  Check, 
  MapPin,
  X,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Database,
  RefreshCw
} from 'lucide-react';
import { updateUserPasswordForParlimen, recordAuditLog } from '../lib/supabaseClient';

interface AdminPortalProps {
  reports: MBSReport[];
  onEditSyor: (id: string, syor: string, status: 'Baru' | 'Dalam Tindakan' | 'Selesai', syorOleh: string) => void;
  systemSettings?: SystemSettings;
  parlimenList?: string[];
  userParlimen?: string;
  isPasswordModalOpen?: boolean;
  onClosePasswordModal?: () => void;
}

export function AdminPortal({ 
  reports, 
  onEditSyor,
  systemSettings,
  parlimenList = [],
  userParlimen,
  isPasswordModalOpen = false,
  onClosePasswordModal
}: AdminPortalProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // Edit Form Fields
  const [editSyor, setEditSyor] = useState('');
  const [editStatus, setEditStatus] = useState<MBSReport['status']>('Baru');
  const [editSyorOleh, setEditSyorOleh] = useState('PKD Kampar');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // User Password Management State
  const [showPasswordModal, setShowPasswordModal] = useState(isPasswordModalOpen);
  const activeParlimen = userParlimen || systemSettings?.defaultParlimen || parlimenList[0] || 'P.071 GOPENG';
  const [targetParlimen, setTargetParlimen] = useState(activeParlimen);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmUserPassword, setConfirmUserPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Current password for target parlimen
  const currentParlimenPassword = systemSettings?.parlimenPasswords?.[targetParlimen] || systemSettings?.kataLaluanUser || systemSettings?.kataLaluan || 'USER123';

  // Synchronize modal open state from props
  React.useEffect(() => {
    if (isPasswordModalOpen !== undefined) {
      setShowPasswordModal(isPasswordModalOpen);
    }
  }, [isPasswordModalOpen]);

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    if (onClosePasswordModal) onClosePasswordModal();
    setPasswordFeedback(null);
  };

  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!newUserPassword.trim()) {
      setPasswordFeedback({ type: 'error', message: 'Sila masukkan kata laluan baharu.' });
      return;
    }
    if (newUserPassword.length < 4) {
      setPasswordFeedback({ type: 'error', message: 'Kata laluan sekurang-kurangnya 4 aksara.' });
      return;
    }
    if (newUserPassword !== confirmUserPassword) {
      setPasswordFeedback({ type: 'error', message: 'Kata laluan baharu dan pengesahan tidak sepadan.' });
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await updateUserPasswordForParlimen(targetParlimen, newUserPassword.trim());
      if (res.success) {
        recordAuditLog({
          peranan: 'pegawai',
          pengguna: `Pegawai Parlimen (${targetParlimen})`,
          parlimen: targetParlimen,
          tindakan: 'TUKAR_KATALALUAN',
          huraian: `Kata laluan Pengguna Awam bagi Parlimen ${targetParlimen} telah ditukar oleh Pegawai Parlimen.`
        });
        setPasswordFeedback({ 
          type: 'success', 
          message: `Kata laluan User bagi ${targetParlimen} berjaya dikemas kini di Supabase Cloud! Pengguna Awam kini boleh log masuk menggunakan kata laluan ini.` 
        });
        setNewUserPassword('');
        setConfirmUserPassword('');
      } else {
        setPasswordFeedback({ type: 'error', message: res.message || 'Gagal menyimpan ke Supabase.' });
      }
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', message: err.message || 'Ralat berlaku semasa kemaskini.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Filter reports specifically for assigned parlimen if userParlimen is present
  const accessibleReports = useMemo(() => {
    if (userParlimen) {
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
  }, [reports, userParlimen]);

  // Filter out statistics
  const pendingSyorCount = accessibleReports.filter(r => !r.syor).length;
  const completedSyorCount = accessibleReports.filter(r => r.syor).length;

  const currentSelectedReport = accessibleReports.find(r => r.id === selectedReportId);

  // When clicking to edit a report
  const handleSelectReport = (r: MBSReport) => {
    setSelectedReportId(r.id);
    setEditSyor(r.syor || '');
    setEditStatus(r.status);
    setEditSyorOleh(r.syorOleh || 'PKD Kampar');
    setSaveSuccess(false);
  };

  // Submit report recommendation (syor) update
  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) return;

    if (!editSyor.trim()) {
      alert("Sila masukkan syor pembaikan/ulasan.");
      return;
    }
    if (!editSyorOleh.trim()) {
      alert("Sila nyatakan pihak yang meluluskan syor.");
      return;
    }

    onEditSyor(selectedReportId, editSyor.trim(), editStatus, editSyorOleh.trim());
    setSaveSuccess(true);
    
    // Auto clear success indicator after 2.5s
    setTimeout(() => {
      setSaveSuccess(false);
      setSelectedReportId(null);
    }, 2000);
  };

  return (
    <div id="admin-portal-view" className="space-y-6">
      
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              PORTAL PEGAWAI KEMAS DAERAH (PKD) / PEGAWAI PARLIMEN
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
            SISTEM PENILAIAN, PENGISIAN SYOR, DAN PENGURUSAN KATA LALUAN PENGGUNA AWAM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pegawai Manage User Password Trigger Button */}
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
          >
            <KeyRound className="w-4 h-4 text-white" />
            <span>Urus Kata Laluan User</span>
          </button>

          {/* Mini stats pill */}
          <div className="flex gap-1.5 text-[10px] font-mono">
            <span className="bg-rose-50 border-2 border-slate-950 text-rose-800 px-2.5 py-2 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {pendingSyorCount} MENUNGGU SYOR
            </span>
            <span className="bg-emerald-50 border-2 border-slate-950 text-emerald-800 px-2.5 py-2 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {completedSyorCount} SELESAI SYOR
            </span>
          </div>
        </div>
      </div>

      {/* PEGAWAI PARLIMEN: MODAL PENGURUSAN KATA LALUAN USER */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-4 border-slate-950 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 border-2 border-slate-950 text-emerald-800">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 font-mono">
                    Pengurusan Kata Laluan User
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    Khas untuk Pegawai Parlimen menetapkan kata laluan Pengguna Awam di Supabase Cloud.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-slate-100 border border-slate-950 text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordFeedback && (
              <div className={`p-3 border-2 border-slate-950 text-xs font-mono font-bold flex items-start gap-2 ${
                passwordFeedback.type === 'success' 
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-950' 
                  : 'bg-rose-100 text-rose-950 border-rose-950'
              }`}>
                {passwordFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveUserPassword} className="space-y-4">
              {/* Kawasan Parlimen */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-black uppercase text-slate-900">
                  Kawasan Parlimen Terlibat:
                </label>
                {parlimenList.length > 0 ? (
                  <select
                    value={targetParlimen}
                    onChange={(e) => {
                      setTargetParlimen(e.target.value);
                      setPasswordFeedback(null);
                    }}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border-2 border-slate-950 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {parlimenList.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={targetParlimen}
                    onChange={(e) => setTargetParlimen(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border-2 border-slate-950 font-mono font-bold text-slate-900"
                  />
                )}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 bg-slate-50 p-2 border border-slate-300">
                  <span>Kata Laluan User Semasa:</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-300">
                    {currentParlimenPassword}
                  </span>
                </div>
              </div>

              {/* Kata Laluan Baharu */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-black uppercase text-slate-900">
                  Kata Laluan Baharu User (Pengguna Awam): <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Contoh: GOPENG2026"
                    className="w-full text-xs px-3 py-2.5 bg-white border-2 border-slate-950 font-mono font-bold pr-10 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Pengesahan Kata Laluan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-black uppercase text-slate-900">
                  Sahkan Kata Laluan Baharu: <span className="text-rose-600">*</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmUserPassword}
                  onChange={(e) => setConfirmUserPassword(e.target.value)}
                  placeholder="Ulang semula kata laluan baharu..."
                  className="w-full text-xs px-3 py-2.5 bg-white border-2 border-slate-950 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-mono font-bold text-xs uppercase border-2 border-slate-950 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 cursor-pointer"
                >
                  {isSavingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan ke Supabase Cloud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: List of reports */}
        <div className="lg:col-span-7 bg-white p-5 border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <h3 className="text-xs font-black text-slate-100 bg-slate-900 border-2 border-slate-950 px-3 py-2 uppercase tracking-widest font-mono">
            Senarai Laporan Semasa (MBS)
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {accessibleReports.map((r, index) => {
              const isSelected = r.id === selectedReportId;
              return (
                <div 
                  key={r.id}
                  onClick={() => handleSelectReport(r)}
                  className={`p-4 rounded-none border-2 transition-all cursor-pointer text-left space-y-2.5 relative overflow-hidden ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-600 shadow-[3px_3px_0px_0px_rgba(37,99,235,1)]' 
                      : 'border-slate-950 hover:bg-slate-50 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-black text-blue-600 font-mono">Bil. {index + 1} • {r.kategori}</span>
                      <h4 className="text-xs font-black text-slate-950 leading-snug uppercase tracking-tight">{r.lokaliti}</h4>
                    </div>
                    {/* Status marker */}
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border-2 border-slate-950 ${
                      r.status === 'Selesai' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : r.status === 'Dalam Tindakan'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-mono line-clamp-2 leading-relaxed">
                    "{r.pernyataanMbs}"
                  </p>

                  <div className="flex justify-between items-center pt-2 border-t-2 border-slate-950 text-[10px] font-bold text-slate-600 font-mono uppercase">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-900" />
                      <span>{r.parlimen} • {r.dun}</span>
                    </span>
                    <span>
                      {r.syor ? (
                        <span className="text-emerald-700 font-black flex items-center space-x-0.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Syor Tersedia</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 font-black">Harap Isi Syor</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Interactive Editing panel */}
        <div className="lg:col-span-5">
          {currentSelectedReport ? (
            <div className="bg-white p-5 sm:p-6 rounded-none border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5 sticky top-24 animate-fade-in">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b-2 border-slate-950 pb-3">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase">Ulas / Kemaskini Rekod</span>
                </div>
                <button 
                  onClick={() => setSelectedReportId(null)}
                  className="text-slate-900 hover:bg-slate-100 p-1 border-2 border-slate-950 rounded-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {saveSuccess ? (
                <div className="py-12 text-center space-y-3">
                  <div className="h-14 w-14 bg-emerald-50 rounded-none border-2 border-slate-950 flex items-center justify-center text-emerald-800 mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-black uppercase text-slate-900 tracking-wide">Kemaskini Berjaya Disimpan!</h4>
                  <p className="text-xs text-slate-600 font-mono">KOLOM SYOR (DIISI OLEH PKD) TELAH DIKEMASKINI DALAM LAMPIRAN A.</p>
                </div>
              ) : (
                <form onSubmit={handleSaveUpdate} className="space-y-4">
                  {/* Summary of Report */}
                  <div className="bg-slate-50 p-3.5 border-2 border-slate-950 space-y-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 font-black block text-[10px] uppercase">Aduan Asal</span>
                      <p className="font-bold text-slate-800 leading-snug">"{currentSelectedReport.pernyataanMbs}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-300 text-[10px] text-slate-600 uppercase font-bold">
                      <span>Lokaliti: <b>{currentSelectedReport.lokaliti}</b></span>
                      <span>Pelapor: <b>{currentSelectedReport.pelaporNama} ({currentSelectedReport.pelaporTel})</b></span>
                      {currentSelectedReport.disediakanOleh && (
                        <span className="col-span-2">Penghantar: <b>{currentSelectedReport.disediakanOleh} ({currentSelectedReport.penghantarJawatan || 'Pendidik Masyarakat'})</b></span>
                      )}
                    </div>
                  </div>

                  {/* Input Syor */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                        SYOR (Diisi oleh PKD) <span className="text-rose-600">*</span>
                      </label>

                    </div>
                    <textarea
                      required
                      rows={4}
                      value={editSyor}
                      onChange={(e) => setEditSyor(e.target.value)}
                      placeholder="Sila nyatakan syor penyelesaian, ulasan penyiasatan lapangan atau keputusan tindakan susulan di sini."
                      className="w-full text-xs px-3 py-2 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-900 leading-relaxed font-mono"
                    ></textarea>
                  </div>

                  {/* Input syorOleh */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                      Pihak Berkuasa Penilai <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editSyorOleh}
                      onChange={(e) => setEditSyorOleh(e.target.value)}
                      placeholder="cth: PKD Kampar, KEMAS Kampar"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border-2 border-slate-950 rounded-none focus:outline-none focus:bg-white text-slate-950 font-mono font-bold"
                    />
                  </div>

                  {/* Status Options */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                      Kemaskini Status Kes <span className="text-rose-600">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Baru', 'Dalam Tindakan', 'Selesai'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEditStatus(st)}
                          className={`py-2 px-1 text-center rounded-none border-2 border-slate-950 text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            editStatus === st
                              ? st === 'Selesai'
                                ? 'bg-emerald-55 text-emerald-950 ring-2 ring-emerald-500'
                                : st === 'Dalam Tindakan'
                                ? 'bg-amber-100 text-amber-950 ring-2 ring-amber-500'
                                : 'bg-rose-100 text-rose-950 ring-2 ring-rose-500'
                              : 'bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {st[0] === 'D' ? 'Tindakan' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-slate-300">
                    <button
                      type="button"
                      onClick={() => setSelectedReportId(null)}
                      className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-950 font-black text-xs rounded-none transition cursor-pointer text-center uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1.5 py-3 bg-blue-600 hover:bg-blue-500 text-white border-2 border-slate-950 font-black text-xs rounded-none transition flex items-center justify-center space-x-1.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] cursor-pointer uppercase tracking-wider"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Ulasan</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-slate-950 border-dashed rounded-none p-8 text-center space-y-4 text-slate-600 sticky top-24">
              <Building2 className="w-10 h-10 text-slate-900 mx-auto stroke-1" />
              <div className="space-y-1.5">
                <h4 className="text-sm font-black text-slate-900 uppercase font-mono">Tiada item dipilih</h4>
                <p className="text-xs text-slate-400 font-mono max-w-xs mx-auto">
                  SILA PILIH SALAH SATU ADUAN DI SENARAI SEBELAH KIRI UNTUK MENGISI SYOR PENILAIAN ATAU ULASAN PIHAK PKD.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
