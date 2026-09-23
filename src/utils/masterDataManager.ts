/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { MasterKawasanRecord, ParlimenDunData, RegionLockSettings } from '../types';
import { LOCALITY_DATA, DMInfo } from '../data/localities';
import { PERAK_PARLIMEN_DUN } from '../data/mockData';

export const MASTER_STORAGE_KEY = 'mbs_master_kawasan_data';

/**
 * Generate initial baseline master records from LOCALITY_DATA and PERAK_PARLIMEN_DUN
 */
export function generateInitialMasterRecords(): MasterKawasanRecord[] {
  const records: MasterKawasanRecord[] = [];
  const defaultParlimen = PERAK_PARLIMEN_DUN[0]?.parlimen || "P.071 GOPENG";
  const seenIds = new Set<string>();

  for (const dunName of Object.keys(LOCALITY_DATA)) {
    const dmList = LOCALITY_DATA[dunName] || [];
    for (const dm of dmList) {
      for (const loc of dm.localities) {
        let baseId = `master-${loc.code || loc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        let uniqueId = baseId;
        let counter = 1;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${baseId}-${counter}`;
          counter++;
        }
        seenIds.add(uniqueId);

        records.push({
          id: uniqueId,
          parlimen: defaultParlimen,
          dun: dunName,
          dmKod: dm.code,
          dmNama: dm.name,
          lokalitiKod: loc.code,
          lokalitiNama: loc.name,
          negeri: "PERAK",
          tarikhDaftar: "2026-03-01"
        });
      }
    }
  }

  return records;
}

/**
 * Load master kawasan data from localStorage with fallback to default
 */
export function loadMasterKawasanFromStorage(): MasterKawasanRecord[] {
  try {
    const raw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sanitize to ensure every record has a unique ID (fixing any previous duplicate IDs in storage)
        const seenIds = new Set<string>();
        let hasDuplicates = false;
        const cleaned: MasterKawasanRecord[] = parsed.map((rec: any, idx: number) => {
          let recId = rec.id ? String(rec.id).trim() : `master-rec-${idx}`;
          if (seenIds.has(recId)) {
            hasDuplicates = true;
            let counter = 1;
            let newId = `${recId}-${counter}`;
            while (seenIds.has(newId)) {
              counter++;
              newId = `${recId}-${counter}`;
            }
            recId = newId;
          }
          seenIds.add(recId);
          return { ...rec, id: recId };
        });

        if (hasDuplicates) {
          saveMasterKawasanToStorage(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error("Gagal membaca pangkalan data master dari storan tempatan:", err);
  }

  const initial = generateInitialMasterRecords();
  saveMasterKawasanToStorage(initial);
  return initial;
}

/**
 * Save master kawasan data to localStorage
 */
export function saveMasterKawasanToStorage(records: MasterKawasanRecord[]): void {
  try {
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Gagal menyimpan pangkalan data master:", err);
  }
}

/**
 * Reset master kawasan data to system defaults
 */
export function resetMasterKawasanToDefault(): MasterKawasanRecord[] {
  const defaults = generateInitialMasterRecords();
  saveMasterKawasanToStorage(defaults);
  return defaults;
}

/**
 * Derive Parlimen & DUN list from current master records
 */
export function deriveParlimenDunList(records: MasterKawasanRecord[]): ParlimenDunData[] {
  const parlimenMap: Record<string, Set<string>> = {};

  for (const rec of records) {
    const p = rec.parlimen.trim();
    const d = rec.dun.trim();
    if (!p) continue;
    if (!parlimenMap[p]) {
      parlimenMap[p] = new Set<string>();
    }
    if (d) {
      parlimenMap[p].add(d);
    }
  }

  const result: ParlimenDunData[] = [];
  for (const [parlimen, dunSet] of Object.entries(parlimenMap)) {
    result.push({
      parlimen,
      dunList: Array.from(dunSet).sort()
    });
  }

  // Ensure default GOPENG is present if empty
  if (result.length === 0) {
    return PERAK_PARLIMEN_DUN;
  }

  return result;
}

/**
 * Derive DUN to DM name list mapping from current master records
 */
export function deriveDunDmMapping(records: MasterKawasanRecord[]): Record<string, string[]> {
  const mapping: Record<string, Set<string>> = {};

  for (const rec of records) {
    const dun = rec.dun.trim();
    const dmName = rec.dmNama.trim();
    if (!dun || !dmName) continue;

    if (!mapping[dun]) {
      mapping[dun] = new Set<string>();
    }
    mapping[dun].add(dmName);
  }

  const result: Record<string, string[]> = {};
  for (const [dun, dmSet] of Object.entries(mapping)) {
    result[dun] = Array.from(dmSet).sort();
  }

  return result;
}

/**
 * Derive LOCALITY_DATA structure (DUN -> DMInfo[]) from current master records
 */
export function deriveLocalityData(records: MasterKawasanRecord[]): Record<string, DMInfo[]> {
  const dunMap: Record<string, Record<string, { code: string; name: string; localities: { code: string; name: string }[] }>> = {};

  for (const rec of records) {
    const dun = rec.dun.trim();
    const dmCode = rec.dmKod.trim();
    const dmName = rec.dmNama.trim();
    const locCode = rec.lokalitiKod.trim();
    const locName = rec.lokalitiNama.trim();

    if (!dun || !dmName) continue;

    if (!dunMap[dun]) {
      dunMap[dun] = {};
    }

    const dmKey = dmCode ? `${dmCode}_${dmName}` : dmName;
    if (!dunMap[dun][dmKey]) {
      dunMap[dun][dmKey] = {
        code: dmCode,
        name: dmName,
        localities: []
      };
    }

    if (locName) {
      const exists = dunMap[dun][dmKey].localities.some(l => l.code === locCode && l.name === locName);
      if (!exists) {
        dunMap[dun][dmKey].localities.push({
          code: locCode,
          name: locName
        });
      }
    }
  }

  const result: Record<string, DMInfo[]> = {};
  for (const [dun, dmObjMap] of Object.entries(dunMap)) {
    result[dun] = Object.values(dmObjMap).map(dm => ({
      code: dm.code,
      name: dm.name,
      localities: dm.localities.sort((a, b) => a.name.localeCompare(b.name))
    }));
  }

  return result;
}

/**
 * Generate Sample CSV Template file string
 */
export function generateSampleCsvString(): string {
  const headers = "Parlimen,DUN,Kod_DM,Nama_DM,Kod_Lokaliti,Nama_Lokaliti";
  const rows = [
    "P.071 GOPENG,N.44 SUNGAI RAPAT,0714401,ARA PAYONG,0714401029,KAMPUNG BERSATU JAYA",
    "P.071 GOPENG,N.44 SUNGAI RAPAT,0714401,ARA PAYONG,0714401030,TAMAN MAWAR PERDANA",
    "P.071 GOPENG,N.45 SIMPANG PULAI,0714502,AMPANG BAHARU,0714502015,DESA PINJI BESTARI",
    "P.071 GOPENG,N.46 TEJA,0714603,LAWAN KUDA SELATAN,0714603010,KAMPUNG BARU INDAH"
  ];
  return [headers, ...rows].join("\r\n");
}

/**
 * Download sample CSV Template directly in browser
 */
export function downloadSampleCsv(): void {
  const csvContent = "\uFEFF" + generateSampleCsvString();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Templat_Master_Kawasan_MBS.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download sample XLSX Template directly in browser
 */
export function downloadSampleXlsx(): void {
  const headers = ["Parlimen", "DUN", "Kod_DM", "Nama_DM", "Kod_Lokaliti", "Nama_Lokaliti"];
  const rows = [
    ["P.071 GOPENG", "N.44 SUNGAI RAPAT", "0714401", "ARA PAYONG", "0714401029", "KAMPUNG BERSATU JAYA"],
    ["P.071 GOPENG", "N.44 SUNGAI RAPAT", "0714401", "ARA PAYONG", "0714401030", "TAMAN MAWAR PERDANA"],
    ["P.071 GOPENG", "N.45 SIMPANG PULAI", "0714502", "AMPANG BAHARU", "0714502015", "DESA PINJI BESTARI"],
    ["P.071 GOPENG", "N.46 TEJA", "0714603", "LAWAN KUDA SELATAN", "0714603010", "KAMPUNG BARU INDAH"]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Master_Kawasan");
  XLSX.writeFile(wb, "Templat_Master_Kawasan_MBS.xlsx");
}

export interface ParsedImportResult {
  validRecords: Omit<MasterKawasanRecord, 'id'>[];
  warnings: string[];
  errors: string[];
  totalRowsProcessed: number;
}

/**
 * Parse uploaded file (CSV or XLSX ArrayBuffer)
 */
export function parseUploadedMasterFile(data: ArrayBuffer | string, isBinary: boolean): ParsedImportResult {
  const result: ParsedImportResult = {
    validRecords: [],
    warnings: [],
    errors: [],
    totalRowsProcessed: 0
  };

  try {
    const workbook = XLSX.read(data, { 
      type: isBinary ? 'array' : 'string',
      cellDates: false
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      result.errors.push("Tiada lembaran kerja (sheet) dijumpai di dalam fail.");
      return result;
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawJson.length === 0) {
      result.errors.push("Fail tidak mengandungi sebarang data rekod.");
      return result;
    }

    result.totalRowsProcessed = rawJson.length;

    // Helper to find key case-insensitively
    const findField = (row: Record<string, any>, candidates: string[]): string => {
      const keys = Object.keys(row);
      for (const cand of candidates) {
        const foundKey = keys.find(k => k.trim().toLowerCase().replace(/[\s_-]+/g, '') === cand.toLowerCase().replace(/[\s_-]+/g, ''));
        if (foundKey !== undefined) {
          return String(row[foundKey] || '').trim();
        }
      }
      return '';
    };

    rawJson.forEach((row, idx) => {
      const rowNum = idx + 2; // considering 1-based index + header row

      const parlimen = findField(row, ['parlimen', 'kawasan_parlimen', 'parliament']);
      const dun = findField(row, ['dun', 'kawasan_dun', 'dewanundangannegeri']);
      const dmKod = findField(row, ['kod_dm', 'koddm', 'dm_code', 'koddaerahmengundi']);
      const dmNama = findField(row, ['nama_dm', 'namadm', 'dm_name', 'daerahmengundi', 'dm']);
      const lokalitiKod = findField(row, ['kod_lokaliti', 'kodlokaliti', 'locality_code', 'kod']);
      const lokalitiNama = findField(row, ['nama_lokaliti', 'namalokaliti', 'lokaliti', 'locality_name', 'lokasi']);

      // Check required fields
      if (!parlimen && !dun && !dmNama && !lokalitiNama) {
        // blank row, skip
        return;
      }

      if (!parlimen) {
        result.warnings.push(`Baris ${rowNum}: Lajur Parlimen tiada. Rekod diabaikan.`);
        return;
      }
      if (!dun) {
        result.warnings.push(`Baris ${rowNum}: Lajur DUN tiada. Rekod diabaikan.`);
        return;
      }
      if (!dmNama) {
        result.warnings.push(`Baris ${rowNum}: Nama DM tiada. Rekod diabaikan.`);
        return;
      }
      if (!lokalitiNama) {
        result.warnings.push(`Baris ${rowNum}: Nama Lokaliti tiada. Rekod diabaikan.`);
        return;
      }

      result.validRecords.push({
        parlimen: parlimen.toUpperCase(),
        dun: dun.toUpperCase(),
        dmKod: dmKod || '',
        dmNama: dmNama.toUpperCase(),
        lokalitiKod: lokalitiKod || '',
        lokalitiNama: lokalitiNama.toUpperCase(),
        negeri: "PERAK",
        tarikhDaftar: new Date().toISOString().split('T')[0]
      });
    });

    if (result.validRecords.length === 0 && result.errors.length === 0) {
      result.errors.push("Tiada rekod sah yang dapat dibaca. Sila pastikan nama lajur menepati templat: Parlimen, DUN, Kod_DM, Nama_DM, Kod_Lokaliti, Nama_Lokaliti");
    }

  } catch (err: any) {
    result.errors.push(`Ralat semasa membaca fail: ${err?.message || 'Format tidak sah'}`);
  }

  return result;
}

/**
 * Export full master kawasan list to CSV file
 */
export function exportMasterKawasanToCsv(records: MasterKawasanRecord[]): void {
  const headers = ["Parlimen", "DUN", "Kod_DM", "Nama_DM", "Kod_Lokaliti", "Nama_Lokaliti", "Tarikh_Daftar"];
  const rows = records.map(r => [
    `"${(r.parlimen || '').replace(/"/g, '""')}"`,
    `"${(r.dun || '').replace(/"/g, '""')}"`,
    `"${(r.dmKod || '').replace(/"/g, '""')}"`,
    `"${(r.dmNama || '').replace(/"/g, '""')}"`,
    `"${(r.lokalitiKod || '').replace(/"/g, '""')}"`,
    `"${(r.lokalitiNama || '').replace(/"/g, '""')}"`,
    `"${(r.tarikhDaftar || '').replace(/"/g, '""')}"`
  ].join(","));

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Pangkalan_Data_Master_Kawasan_MBS_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const REGION_LOCK_STORAGE_KEY = 'mbs_region_lock_settings';

export const DEFAULT_REGION_LOCK_SETTINGS: RegionLockSettings = {
  defaultParlimen: 'P.071 GOPENG',
  isLocked: true,
};

/**
 * Format raw Parlimen string into clean title-cased name
 * e.g. "P.071 GOPENG" -> "Gopeng"
 * e.g. "P.078 CAMERON HIGHLANDS" -> "Cameron Highlands"
 */
export function formatParlimenCleanName(parlimenRaw?: string): string {
  if (!parlimenRaw) return 'Semua Kawasan';
  // Remove code prefix like "P.071 ", "P.078 ", "P-071 ", "P071 "
  const withoutCode = parlimenRaw.replace(/^[Pp][.\-_]?\s*\d+\s*/i, '').trim();
  const nameToUse = withoutCode || parlimenRaw.trim();

  // Convert to Title Case
  return nameToUse
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a report's Parlimen matches target Parlimen
 */
export function isMatchingParlimen(reportParlimen?: string, targetParlimen?: string): boolean {
  if (!targetParlimen || targetParlimen === 'SEMUA') return true;
  if (!reportParlimen) return false;
  const p1 = reportParlimen.trim().toUpperCase();
  const p2 = targetParlimen.trim().toUpperCase();
  if (p1 === p2) return true;

  // Compare without code prefix
  const name1 = p1.replace(/^[Pp][.\-_]?\s*\d+\s*/i, '').trim();
  const name2 = p2.replace(/^[Pp][.\-_]?\s*\d+\s*/i, '').trim();
  if (name1 && name2 && name1 === name2) return true;

  // Compare code if both have code
  const code1 = p1.match(/^[Pp][.\-_]?\s*(\d+)/i)?.[1];
  const code2 = p2.match(/^[Pp][.\-_]?\s*(\d+)/i)?.[1];
  if (code1 && code2 && code1 === code2) return true;

  return false;
}

export function loadRegionLockSettings(): RegionLockSettings {
  if (typeof window === 'undefined') return DEFAULT_REGION_LOCK_SETTINGS;
  try {
    const raw = localStorage.getItem(REGION_LOCK_STORAGE_KEY);
    if (!raw) return DEFAULT_REGION_LOCK_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      defaultParlimen: parsed.defaultParlimen || 'P.071 GOPENG',
      isLocked: parsed.isLocked !== undefined ? Boolean(parsed.isLocked) : true
    };
  } catch (e) {
    console.error('Failed to load region lock settings:', e);
    return DEFAULT_REGION_LOCK_SETTINGS;
  }
}

export function saveRegionLockSettings(settings: RegionLockSettings): void {
  try {
    localStorage.setItem(REGION_LOCK_STORAGE_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbs_region_lock_updated', { detail: settings }));
    }
  } catch (e) {
    console.error('Failed to save region lock settings:', e);
  }
}


