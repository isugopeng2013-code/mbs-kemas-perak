/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MBSReport {
  id: string;
  bil: number;
  parlimen: string;
  dun: string;
  dm: string;
  lokaliti: string;
  pernyataanMbs: string;
  kategori: string;
  pelaporNama: string;
  pelaporTel: string;
  syor: string; // Diisi oleh PKD
  syorTarikh?: string;
  syorOleh?: string;
  gambarUrl?: string; // Base64 data URL or mock image
  disediakanOleh?: string; // Pendidik Masyarakat yang menyediakan
  penghantarJawatan?: string; // Jawatan Penghantar MBS
  status: 'Baru' | 'Dalam Tindakan' | 'Selesai';
  tarikhAduan: string;
  tarikhKemaskini?: string;
}

export interface ParlimenDunData {
  parlimen: string;
  dunList: string[];
}

export interface MasterKawasanRecord {
  id: string;
  parlimen: string;
  dun: string;
  dmKod: string;
  dmNama: string;
  lokalitiKod: string;
  lokalitiNama: string;
  negeri?: string;
  tarikhDaftar?: string;
}

export type UserRole = 'user' | 'pegawai' | 'master_admin';

export interface UserSession {
  role: UserRole;
  parlimen?: string;
  loginTime: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  peranan: UserRole;
  pengguna: string; // e.g. "Master Admin", "Pegawai (P.071 GOPENG)", "Pengguna Awam"
  parlimen?: string;
  tindakan: 'TUKAR_KATALALUAN' | 'KEMASKINI_DATA_MASTER' | 'TAMBAH_DATA_MASTER' | 'PADAM_DATA_MASTER' | 'IMPORT_PUKAL' | 'TETAPAN_SISTEM' | 'RESET_DATA' | 'LOG_MASUK' | 'LOG_KELUAR';
  huraian: string;
  butiran?: any;
}

export interface PasswordResetRequest {
  id: string;
  timestamp: string;
  namaPemohon: string;
  peranan: UserRole;
  parlimen?: string;
  emelAtauTelefon: string;
  catatan?: string;
  status: 'Menunggu' | 'Selesai' | 'Ditolak';
}

export interface RegionLockSettings {
  defaultParlimen: string;
  isLocked: boolean;
}

export interface SystemSettings {
  kataLaluan: string; // fallback kata laluan
  kataLaluanUser: string; // kata laluan log masuk User (Pengguna Awam)
  kataLaluanPegawai: string; // kata laluan log masuk Pegawai Parlimen
  kataLaluanMaster: string; // kata laluan log masuk Master Admin
  parlimenPasswords?: Record<string, string>; // kata laluan user mengikut Parlimen
  tajukUtama: string;
  subTajuk?: string;
  defaultParlimen: string;
  isLocked: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  kataLaluan: 'USER123',
  kataLaluanUser: 'USER123',
  kataLaluanPegawai: 'PEGAWAI123',
  kataLaluanMaster: 'ADMIN123',
  parlimenPasswords: {
    'P.071 GOPENG': 'GOPENG123',
    'P.070 KAMPAR': 'KAMPAR123',
    'P.064 IPOH TIMOR': 'IPOH123'
  },
  tajukUtama: 'Maklum Balas Semasa (MBS)',
  subTajuk: 'Sistem Pengurusan & Maklum Balas Rakyat',
  defaultParlimen: 'P.071 GOPENG',
  isLocked: false,
};

export type TabType = 'dashboard' | 'form' | 'reports' | 'admin' | 'master-admin' | 'drive';
