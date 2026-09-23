/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClipboardList, PlusCircle, BarChart3, LayoutGrid, Database, Cloud, LogOut, KeyRound, User, ShieldCheck } from 'lucide-react';
import { TabType, UserRole } from '../types';
import { initAuth, getAccessToken } from '../services/googleDriveService';

interface HeaderProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  lang: 'ms';
  title?: string;
  subTitle?: string;
  currentRole?: UserRole;
  userParlimen?: string;
  onLogout?: () => void;
  onOpenUserPasswordModal?: () => void;
}

export function Header({ 
  currentTab, 
  setCurrentTab, 
  title, 
  subTitle,
  currentRole = 'user',
  userParlimen,
  onLogout,
  onOpenUserPasswordModal
}: HeaderProps) {
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);

  useEffect(() => {
    const unsub = initAuth(
      (_user, token) => setIsDriveConnected(!!token),
      () => setIsDriveConnected(false)
    );
    getAccessToken().then(tok => setIsDriveConnected(!!tok));
    return () => unsub();
  }, []);

  // Determine which tabs are allowed based on Role:
  // - USER: ONLY 'dashboard' and 'form'
  // - PEGAWAI: 'dashboard', 'form', 'reports', 'admin'
  // - MASTER ADMIN: 'dashboard', 'form', 'reports', 'admin', 'master-admin', 'drive'
  const isUser = currentRole === 'user';
  const isPegawai = currentRole === 'pegawai';
  const isMasterAdmin = currentRole === 'master_admin';

  return (
    <header id="header-container" className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-center py-4 space-y-4 lg:space-y-0">
          
          {/* Logo & Info */}
          <div className="flex items-center space-x-3.5 self-start lg:self-auto">
            <div className="h-11 w-11 rounded-none bg-blue-600 flex items-center justify-center text-white font-black text-xl tracking-tighter shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              MBS
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="app-title-main" className="text-xl font-black text-white tracking-widest uppercase leading-none">
                  {title || 'Sistem Laporan MBS'}
                </h1>
                
                {/* Role Badge */}
                {isUser && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-950 border border-blue-400 text-blue-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <User className="w-3 h-3 text-blue-400" />
                    <span>USER{userParlimen ? ` • ${userParlimen}` : ''}</span>
                  </span>
                )}
                {isPegawai && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 border border-emerald-400 text-emerald-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>PEGAWAI PARLIMEN{userParlimen ? ` • ${userParlimen}` : ''}</span>
                  </span>
                )}
                {isMasterAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950 border border-amber-400 text-amber-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <Database className="w-3 h-3 text-amber-400" />
                    <span>MASTER ADMIN</span>
                  </span>
                )}
              </div>

              <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest mt-1">
                {subTitle || 'Laporan Maklum Balas Semasa • Mac 2026'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs and Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <nav className="flex bg-slate-950 p-1 rounded-none border border-slate-800 w-full sm:w-auto overflow-x-auto scrollbar-none">
              {/* Tab 1: Papan Pemuka (Semua peranan) */}
              <button
                id="tab-btn-dashboard"
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-none transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${
                  currentTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Papan Pemuka</span>
              </button>
              
              {/* Tab 2: Borang MBS (Semua peranan) */}
              <button
                id="tab-btn-form"
                onClick={() => setCurrentTab('form')}
                className={`flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-none transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${
                  currentTab === 'form'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Borang MBS</span>
              </button>

              {/* Tab 3: Lampiran A (Pegawai Parlimen & Master Admin Sahaja) */}
              {!isUser && (
                <button
                  id="tab-btn-reports"
                  onClick={() => setCurrentTab('reports')}
                  className={`flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-none transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${
                    currentTab === 'reports'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Lampiran A</span>
                </button>
              )}

              {/* Tab 4: Portal PKD (Pegawai Parlimen & Master Admin Sahaja) */}
              {!isUser && (
                <button
                  id="tab-btn-admin"
                  onClick={() => setCurrentTab('admin')}
                  className={`flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-none transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${
                    currentTab === 'admin'
                      ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Portal PKD</span>
                </button>
              )}

              {/* Tab 5: Portal Admin (Master Admin Sahaja) */}
              {isMasterAdmin && (
                <button
                  id="tab-btn-master-admin"
                  onClick={() => setCurrentTab('master-admin')}
                  className={`flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-none transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none ${
                    currentTab === 'master-admin'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Portal Admin</span>
                </button>
              )}

              {/* Tab 6: Google Drive (Master Admin Sahaja) */}
              {isMasterAdmin && (
                <button
                  id="tab-btn-drive"
                  onClick={() => setCurrentTab('drive')}
                  className={`flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-none transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none relative ${
                    currentTab === 'drive'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Penyelarasan & Sandaran Google Drive"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Drive</span>
                  {isDriveConnected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5 inline-block" title="Google Drive Tersambung" />
                  )}
                </button>
              )}
            </nav>

            {/* Quick Action for Pegawai: Manage User Password */}
            {isPegawai && onOpenUserPasswordModal && (
              <button
                type="button"
                onClick={onOpenUserPasswordModal}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider border border-emerald-400 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Tetapkan atau tukar kata laluan log masuk untuk USER bagi Parlimen anda di Supabase Cloud"
              >
                <KeyRound className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Kata Laluan User</span>
              </button>
            )}

            {/* Log Keluar Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold uppercase tracking-wider border border-rose-800 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Log Keluar daripada peranan ini"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Keluar</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
