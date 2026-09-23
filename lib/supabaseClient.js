/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// Access Supabase credentials via Vite defines (__SUPABASE_URL__), process.env, or import.meta.env
const resolveCredentials = () => {
  let url = '';
  let key = '';

  // 1. Direct Vite define replacement
  try {
    if (typeof __SUPABASE_URL__ !== 'undefined' && __SUPABASE_URL__) {
      url = __SUPABASE_URL__;
    }
    if (typeof __SUPABASE_ANON_KEY__ !== 'undefined' && __SUPABASE_ANON_KEY__) {
      key = __SUPABASE_ANON_KEY__;
    }
  } catch (_) {}

  // 2. import.meta.env (standard Vite)
  try {
    if (!url && typeof import.meta !== 'undefined' && import.meta.env) {
      url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
    }
    if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
      key = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch (_) {}

  // 3. process.env replacement
  try {
    if (!url && typeof process !== 'undefined' && process.env) {
      url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    }
    if (!key && typeof process !== 'undefined' && process.env) {
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch (_) {}

  return {
    url: (url || '').trim(),
    key: (key || '').trim(),
  };
};

const creds = resolveCredentials();
export const supabaseUrl = creds.url;
export const supabaseAnonKey = creds.key;

// Check if credentials are valid
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project')
);

// Fallback dummy URL and key to prevent createClient from crashing if env vars are pending
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://placeholder-project.supabase.co';
const validKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper to submit report directly to Supabase table 'laporan_mbs'
 */
export async function submitReportToSupabase(reportData) {
  if (!isSupabaseConfigured) {
    console.warn('[Supabase] Kredensial belum dikonfigurasi dalam persekitaran (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
    return { data: null, error: new Error('Kredensial Supabase belum disediakan dalam .env.') };
  }

  try {
    // Standardize database payload with strictly snake_case matching PostgreSQL table schema
    const payload = {
      parlimen: reportData.parlimen || '',
      dun: reportData.dun || '',
      dm: reportData.dm || '',
      lokaliti: reportData.lokaliti || '',
      pernyataan_mbs: reportData.pernyataanMbs || reportData.pernyataan_mbs || '',
      kategori: reportData.kategori || 'Infrastruktur',
      pelapor_nama: reportData.pelaporNama || reportData.pelapor_nama || '',
      pelapor_tel: reportData.pelaporTel || reportData.pelapor_tel || '',
      disediakan_oleh: reportData.disediakanOleh || reportData.disediakan_oleh || '',
      penghantar_jawatan: reportData.penghantarJawatan || reportData.penghantar_jawatan || '',
      gambar_url: reportData.gambarUrl || reportData.gambar_url || null,
      status: reportData.status || 'Baru',
      syor: reportData.syor || '',
      tarikh_aduan: reportData.tarikhAduan || reportData.tarikh_aduan || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    payload.id = reportData.id || `mbs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (reportData.bil !== undefined && reportData.bil !== null) payload.bil = reportData.bil;
    if (reportData.syorTarikh || reportData.syor_tarikh) payload.syor_tarikh = reportData.syorTarikh || reportData.syor_tarikh;
    if (reportData.syorOleh || reportData.syor_oleh) payload.syor_oleh = reportData.syorOleh || reportData.syor_oleh;
    if (reportData.tarikhKemaskini || reportData.tarikh_kemaskini) payload.tarikh_kemaskini = reportData.tarikhKemaskini || reportData.tarikh_kemaskini;

    const { data, error } = await supabase
      .from('laporan_mbs')
      .insert([payload])
      .select();

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn("[Supabase Notice]: Jadual 'public.laporan_mbs' belum wujud di Supabase (PGRST205).");
        return { 
          data: null, 
          error: { 
            code: 'PGRST205', 
            message: "Jadual 'public.laporan_mbs' belum wujud di Supabase. Sila jalankan skrip SQL di Supabase SQL Editor.",
            isMissingTable: true 
          } 
        };
      }
      console.error('[Supabase Insert Error]:', error.message || error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Supabase Unexpected Error]:', err);
    return { data: null, error: err };
  }
}

/**
 * Helper to fetch all reports from Supabase 'laporan_mbs' table
 */
export async function fetchLaporanMbs() {
  if (!isSupabaseConfigured) {
    return { data: [], error: new Error('Supabase belum dikonfigurasi') };
  }

  try {
    const { data, error } = await supabase
      .from('laporan_mbs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn("[Supabase Notice]: Jadual 'public.laporan_mbs' belum wujud dalam skema Supabase. Menggunakan data tempatan.");
        return { 
          data: [], 
          error: { 
            code: 'PGRST205', 
            message: "Jadual 'public.laporan_mbs' belum wujud di Supabase. Sila jalankan skrip SQL di Supabase SQL Editor.",
            isMissingTable: true 
          } 
        };
      }
      console.warn('[Supabase Fetch Error]:', error.message || error);
      return { data: [], error };
    }

    // Map database fields to application MBSReport model
    const mapped = (data || []).map((row, index) => ({
      id: row.id?.toString() || `supabase-${row.created_at || Date.now()}-${index}`,
      bil: row.bil || index + 1,
      parlimen: row.parlimen || 'P.071 GOPENG',
      dun: row.dun || 'N.44 SUNGAI RAPAT',
      dm: row.dm || '',
      lokaliti: row.lokaliti || '',
      pernyataanMbs: row.pernyataan_mbs || row.pernyataanMbs || '',
      kategori: row.kategori || 'Infrastruktur',
      pelaporNama: row.pelapor_nama || row.pelaporNama || '',
      pelaporTel: row.pelapor_tel || row.pelaporTel || '',
      syor: row.syor || '',
      syorTarikh: row.syor_tarikh || row.syorTarikh || '',
      syorOleh: row.syor_oleh || row.syorOleh || '',
      gambarUrl: row.gambar_url || row.gambarUrl || '',
      disediakanOleh: row.disediakan_oleh || row.disediakanOleh || '',
      penghantarJawatan: row.penghantar_jawatan || row.penghantarJawatan || 'Pendidik Masyarakat',
      status: row.status || 'Baru',
      tarikhAduan: row.tarikh_aduan || row.tarikhAduan || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      tarikhKemaskini: row.tarikh_kemaskini || row.tarikhKemaskini || ''
    }));

    return { data: mapped, error: null };
  } catch (err) {
    console.warn('[Supabase Fetch Exception]:', err.message || err);
    return { data: [], error: err };
  }
}

/**
 * Subscribe to real-time changes on 'laporan_mbs' table
 */
export function subscribeToLaporanMbs(onUpdate) {
  if (!isSupabaseConfigured) return () => {};

  // Unique channel topic name to prevent collision across components/mounts
  const channelId = `laporan_mbs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'laporan_mbs'
      },
      (payload) => {
        console.log('[Supabase Realtime Event]:', payload);
        if (onUpdate) onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    try {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[Supabase Channel Cleanup Warning]:', err);
    }
  };
}

/**
 * Helper to update a report in Supabase 'laporan_mbs' table
 */
export async function updateReportInSupabase(id, updates) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Kredensial Supabase belum dikonfigurasi') };
  }

  try {
    const payload = {};
    if (updates.syor !== undefined) payload.syor = updates.syor;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.syorOleh !== undefined || updates.syor_oleh !== undefined) {
      payload.syor_oleh = updates.syorOleh ?? updates.syor_oleh;
    }
    if (updates.syorTarikh !== undefined || updates.syor_tarikh !== undefined) {
      payload.syor_tarikh = updates.syorTarikh ?? updates.syor_tarikh;
    }
    if (updates.tarikhKemaskini !== undefined || updates.tarikh_kemaskini !== undefined) {
      payload.tarikh_kemaskini = updates.tarikhKemaskini ?? updates.tarikh_kemaskini;
    }
    if (updates.kategori !== undefined) payload.kategori = updates.kategori;
    if (updates.pernyataanMbs !== undefined || updates.pernyataan_mbs !== undefined) {
      payload.pernyataan_mbs = updates.pernyataanMbs ?? updates.pernyataan_mbs;
    }

    const { data, error } = await supabase
      .from('laporan_mbs')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Supabase Report Update Error]:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[Supabase Report Update Exception]:', err);
    return { data: null, error: err };
  }
}

/**
 * Helper to delete a report from Supabase 'laporan_mbs' table
 */
export async function deleteReportFromSupabase(id) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Kredensial Supabase belum dikonfigurasi') };
  }

  try {
    const { data, error } = await supabase
      .from('laporan_mbs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase Report Delete Error]:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.error('[Supabase Report Delete Exception]:', err);
    return { data: null, error: err };
  }
}

/**
 * Helper to upload/sync a list of master kawasan records to Supabase 'master_kawasan' table
 */
export async function uploadMasterKawasanToSupabase(records, mode = 'upsert') {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Kredensial Supabase belum dikonfigurasi dalam persekitaran.') };
  }

  try {
    // Guarantee that every record in the upsert array has a unique primary key `id`
    // to prevent PostgreSQL Error 21000 ("ON CONFLICT DO UPDATE command cannot affect row a second time")
    const seenIds = new Set();
    const formattedRecords = [];

    for (let idx = 0; idx < records.length; idx++) {
      const rec = records[idx];
      let recId = rec.id ? String(rec.id).trim() : '';

      // If id is empty or has already been seen in this batch collection, generate a distinct unique key
      if (!recId || seenIds.has(recId)) {
        const base = `mk_${(rec.parlimen || '').toLowerCase()}_${(rec.dun || '').toLowerCase()}_${(rec.dmKod || rec.dm_kod || '').toLowerCase()}_${(rec.lokalitiKod || rec.lokaliti_kod || '').toLowerCase()}`
          .replace(/[^a-z0-9]/g, '_');
        let uniqueKey = `${base}_${idx}`;
        while (seenIds.has(uniqueKey)) {
          uniqueKey = `${uniqueKey}_${Math.random().toString(36).substring(2, 6)}`;
        }
        recId = uniqueKey;
      }
      seenIds.add(recId);

      formattedRecords.push({
        id: recId,
        parlimen: (rec.parlimen || '').trim(),
        dun: (rec.dun || '').trim(),
        dm_kod: (rec.dmKod || rec.dm_kod || '').trim(),
        dm_nama: (rec.dmNama || rec.dm_nama || '').trim(),
        lokaliti_kod: (rec.lokalitiKod || rec.lokaliti_kod || '').trim(),
        lokaliti_nama: (rec.lokalitiNama || rec.lokaliti_nama || '').trim(),
        negeri: (rec.negeri || 'PERAK').trim(),
        tarikh_daftar: rec.tarikhDaftar || rec.tarikh_daftar || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      });
    }

    if (mode === 'replace') {
      const { error: delError } = await supabase
        .from('master_kawasan')
        .delete()
        .neq('id', '___non_existent___');
      if (delError) {
        console.warn('[Supabase Master Delete Notice]:', delError.message);
      }
    }

    // Insert in batches of 100 to avoid payload limit
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < formattedRecords.length; i += batchSize) {
      const batch = formattedRecords.slice(i, i + batchSize);
      const { error } = await supabase
        .from('master_kawasan')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        if (error.code === '21000') {
          console.warn('[Supabase Master Error 21000]: Mengendalikan duplikasi baris melalui pemprosesan rekod individu secara anjal...');
          for (const singleRec of batch) {
            const { error: singleErr } = await supabase
              .from('master_kawasan')
              .upsert([singleRec], { onConflict: 'id' });
            if (!singleErr) {
              insertedCount++;
            }
          }
          continue;
        }

        if (error.code === 'PGRST205') {
          console.warn("[Supabase Master Notice]: Jadual 'public.master_kawasan' belum wujud di Supabase.");
          return { 
            data: null, 
            error: { 
              code: 'PGRST205', 
              message: "Jadual 'public.master_kawasan' belum diwujudkan di Supabase. Sila cipta jadual menggunakan skrip SQL terlebih dahulu.",
              isMissingTable: true 
            }, 
            insertedCount 
          };
        }
        if (error.code === 'PGRST204') {
          console.error('[Supabase Master Schema Error PGRST204]:', error.message);
          return {
            data: null,
            error: {
              code: 'PGRST204',
              message: `Ralat skema lajur Supabase: ${error.message}. Pastikan jadual master_kawasan mempunyai lajur yang tepat.`,
              details: error
            },
            insertedCount
          };
        }
        console.error('[Supabase Master Upsert Error]:', error);
        return { data: null, error, insertedCount };
      }
      insertedCount += batch.length;
    }

    return { data: { count: insertedCount }, error: null };
  } catch (err) {
    console.warn('[Supabase Master Exception]:', err.message || err);
    return { data: null, error: err };
  }
}

/**
 * Helper to fetch all master kawasan records from Supabase 'master_kawasan' table
 */
export async function fetchMasterKawasan() {
  if (!isSupabaseConfigured) {
    return { data: [], error: new Error('Supabase belum dikonfigurasi') };
  }

  try {
    const { data, error } = await supabase
      .from('master_kawasan')
      .select('*')
      .order('parlimen', { ascending: true })
      .order('dun', { ascending: true })
      .order('dm_nama', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn("[Supabase Master Notice]: Jadual 'public.master_kawasan' belum wujud dalam skema Supabase. Menggunakan data tempatan.");
        return { 
          data: [], 
          error: { 
            code: 'PGRST205', 
            message: "Jadual 'public.master_kawasan' belum wujud di Supabase. Sila jalankan skrip SQL di Supabase SQL Editor.",
            isMissingTable: true 
          } 
        };
      }
      console.warn('[Supabase Master Fetch Error]:', error.message || error);
      return { data: [], error };
    }

    const filteredRows = (data || []).filter(row => row.id !== '__SYSTEM_SETTINGS__' && row.negeri !== 'SYSTEM');
    const mapped = filteredRows.map((row) => ({
      id: row.id?.toString() || `master-${Date.now()}`,
      parlimen: row.parlimen || 'P.071 GOPENG',
      dun: row.dun || '',
      dmKod: row.dm_kod || row.dmKod || '',
      dmNama: row.dm_nama || row.dmNama || '',
      lokalitiKod: row.lokaliti_kod || row.lokalitiKod || '',
      lokalitiNama: row.lokaliti_nama || row.lokalitiNama || '',
      negeri: row.negeri || 'PERAK',
      tarikhDaftar: row.tarikh_daftar || row.tarikhDaftar || ''
    }));

    return { data: mapped, error: null };
  } catch (err) {
    console.warn('[Supabase Master Fetch Exception]:', err.message || err);
    return { data: [], error: err };
  }
}

/**
 * Helper to add or upsert a single master record in Supabase
 */
export async function addMasterRecordToSupabase(record) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase belum dikonfigurasi') };
  try {
    const payload = {
      id: record.id?.toString() || `master-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      parlimen: (record.parlimen || '').trim(),
      dun: (record.dun || '').trim(),
      dm_kod: (record.dmKod || record.dm_kod || '').trim(),
      dm_nama: (record.dmNama || record.dm_nama || '').trim(),
      lokaliti_kod: (record.lokalitiKod || record.lokaliti_kod || '').trim(),
      lokaliti_nama: (record.lokalitiNama || record.lokaliti_nama || '').trim(),
      negeri: (record.negeri || 'PERAK').trim(),
      tarikh_daftar: record.tarikhDaftar || record.tarikh_daftar || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('master_kawasan')
      .upsert([payload], { onConflict: 'id' });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Helper to update a master record in Supabase
 */
export async function updateMasterRecordInSupabase(id, updates) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase belum dikonfigurasi') };
  try {
    const payload = {
      updated_at: new Date().toISOString()
    };
    if (updates.parlimen !== undefined) payload.parlimen = updates.parlimen.trim();
    if (updates.dun !== undefined) payload.dun = updates.dun.trim();
    if (updates.dmKod !== undefined || updates.dm_kod !== undefined) {
      payload.dm_kod = (updates.dmKod ?? updates.dm_kod ?? '').trim();
    }
    if (updates.dmNama !== undefined || updates.dm_nama !== undefined) {
      payload.dm_nama = (updates.dmNama ?? updates.dm_nama ?? '').trim();
    }
    if (updates.lokalitiKod !== undefined || updates.lokaliti_kod !== undefined) {
      payload.lokaliti_kod = (updates.lokalitiKod ?? updates.lokaliti_kod ?? '').trim();
    }
    if (updates.lokalitiNama !== undefined || updates.lokaliti_nama !== undefined) {
      payload.lokaliti_nama = (updates.lokalitiNama ?? updates.lokaliti_nama ?? '').trim();
    }
    if (updates.negeri !== undefined) payload.negeri = updates.negeri.trim();
    if (updates.tarikhDaftar !== undefined || updates.tarikh_daftar !== undefined) {
      payload.tarikh_daftar = updates.tarikhDaftar ?? updates.tarikh_daftar;
    }

    const { data, error } = await supabase
      .from('master_kawasan')
      .update(payload)
      .eq('id', id);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Helper to delete a master record in Supabase
 */
export async function deleteMasterRecordFromSupabase(id) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase belum dikonfigurasi') };
  try {
    const { data, error } = await supabase
      .from('master_kawasan')
      .delete()
      .eq('id', id);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Helper to subscribe to real-time changes on 'master_kawasan' table
 */
export function subscribeToMasterKawasan(onUpdate) {
  if (!isSupabaseConfigured) return () => {};

  // Unique channel topic name to prevent collision across components/mounts
  const channelId = `master_kawasan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'master_kawasan'
      },
      (payload) => {
        console.log('[Supabase Master Kawasan Realtime Event]:', payload);
        if (onUpdate) onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    try {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[Supabase Master Channel Cleanup Warning]:', err);
    }
  };
}

/**
 * Helper to fetch system settings (Password, Title, Region Lock) from Supabase
 */
export async function fetchSystemSettings() {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase belum dikonfigurasi') };
  }

  try {
    // 1. Try dedicated table 'tetapan_sistem' first if user created it
    const { data: dedicatedData, error: dedicatedErr } = await supabase
      .from('tetapan_sistem')
      .select('*')
      .eq('kunci', 'tetapan_global')
      .maybeSingle();

    if (!dedicatedErr && dedicatedData && dedicatedData.nilai) {
      console.log('[Supabase Settings Fetch]: Rekod tetapan global ditemui dalam tetapan_sistem.');
      const val = dedicatedData.nilai;
      const settings = {
        kataLaluan: val.kataLaluan || val.kataLaluanUser || 'USER123',
        kataLaluanUser: val.kataLaluanUser || val.kataLaluan || 'USER123',
        kataLaluanPegawai: val.kataLaluanPegawai || 'PEGAWAI123',
        kataLaluanMaster: val.kataLaluanMaster || 'ADMIN123',
        parlimenPasswords: val.parlimenPasswords || { 'P.071 GOPENG': 'GOPENG123' },
        tajukUtama: val.tajukUtama || 'Maklum Balas Semasa (MBS)',
        subTajuk: val.subTajuk || 'Sistem Pengurusan & Maklum Balas Rakyat',
        defaultParlimen: val.defaultParlimen || 'P.071 GOPENG',
        isLocked: val.isLocked !== undefined ? Boolean(val.isLocked) : false,
        updatedAt: val.updatedAt || new Date().toISOString()
      };
      return { data: settings, error: null };
    }

    // 2. Primary cloud storage: record '__SYSTEM_SETTINGS__' in master_kawasan
    const { data: masterData, error: masterErr } = await supabase
      .from('master_kawasan')
      .select('*')
      .eq('id', '__SYSTEM_SETTINGS__')
      .maybeSingle();

    if (!masterErr && masterData) {
      let parsed = null;
      if (masterData.lokaliti_nama) {
        try {
          parsed = JSON.parse(masterData.lokaliti_nama);
        } catch (e) {}
      }
      const settings = {
        kataLaluan: parsed?.kataLaluan || parsed?.kataLaluanUser || masterData.dun || 'USER123',
        kataLaluanUser: parsed?.kataLaluanUser || parsed?.kataLaluan || masterData.dun || 'USER123',
        kataLaluanPegawai: parsed?.kataLaluanPegawai || 'PEGAWAI123',
        kataLaluanMaster: parsed?.kataLaluanMaster || 'ADMIN123',
        parlimenPasswords: parsed?.parlimenPasswords || { 'P.071 GOPENG': 'GOPENG123' },
        tajukUtama: parsed?.tajukUtama || masterData.parlimen || 'Maklum Balas Semasa (MBS)',
        subTajuk: parsed?.subTajuk || 'Sistem Pengurusan & Maklum Balas Rakyat',
        defaultParlimen: parsed?.defaultParlimen || masterData.dm_kod || 'P.071 GOPENG',
        isLocked: parsed?.isLocked !== undefined ? Boolean(parsed.isLocked) : (masterData.dm_nama === 'true'),
        updatedAt: masterData.updated_at || new Date().toISOString()
      };
      console.log('[Supabase Settings Fetch]: Rekod tetapan dimuatkan dari Supabase master_kawasan:', settings);
      return { data: settings, error: null };
    }

    return { data: null, error: dedicatedErr || masterErr };
  } catch (err) {
    console.warn('[Supabase Settings Fetch Exception]:', err);
    return { data: null, error: err };
  }
}

/**
 * Helper to save system settings (Password, Title, Region Lock) to Supabase
 */
export async function saveSystemSettings(settings) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase belum dikonfigurasi') };
  }

  try {
    const payload = {
      kataLaluan: settings.kataLaluanUser || settings.kataLaluan || 'USER123',
      kataLaluanUser: settings.kataLaluanUser || settings.kataLaluan || 'USER123',
      kataLaluanPegawai: settings.kataLaluanPegawai || 'PEGAWAI123',
      kataLaluanMaster: settings.kataLaluanMaster || 'ADMIN123',
      parlimenPasswords: settings.parlimenPasswords || {},
      tajukUtama: settings.tajukUtama || 'Maklum Balas Semasa (MBS)',
      subTajuk: settings.subTajuk || 'Sistem Pengurusan & Maklum Balas Rakyat',
      defaultParlimen: settings.defaultParlimen || 'P.071 GOPENG',
      isLocked: Boolean(settings.isLocked),
      updatedAt: new Date().toISOString()
    };

    // 1. Also attempt to save to dedicated table 'tetapan_sistem' if it exists
    supabase
      .from('tetapan_sistem')
      .upsert([
        {
          kunci: 'tetapan_global',
          nilai: payload,
          kemaskini_pada: new Date().toISOString()
        }
      ], { onConflict: 'kunci' })
      .then(() => {})
      .catch(() => {});

    // 2. Persist to 'master_kawasan' table under id '__SYSTEM_SETTINGS__'
    const masterRecord = {
      id: '__SYSTEM_SETTINGS__',
      parlimen: payload.tajukUtama,
      dun: payload.kataLaluanUser,
      dm_kod: payload.defaultParlimen,
      dm_nama: payload.isLocked ? 'true' : 'false',
      lokaliti_kod: 'v2',
      lokaliti_nama: JSON.stringify(payload),
      negeri: 'SYSTEM',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('master_kawasan')
      .upsert([masterRecord], { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('[Supabase Settings Save Error]:', error);
      return { data: null, error };
    }

    console.log('[Supabase Settings Saved Successfully]:', payload);
    return { data: payload, error: null };
  } catch (err) {
    console.error('[Supabase Settings Save Exception]:', err);
    return { data: null, error: err };
  }
}

/**
 * Helper to update User Password for a specific Parlimen or globally
 */
export async function updateUserPasswordForParlimen(parlimen, newPassword) {
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase belum dikonfigurasi.' };
  }
  try {
    const { data: currentSettings } = await fetchSystemSettings();
    const updatedPasswords = {
      ...(currentSettings?.parlimenPasswords || {}),
      [parlimen]: newPassword
    };
    const updated = {
      ...(currentSettings || {}),
      kataLaluan: newPassword,
      kataLaluanUser: newPassword,
      parlimenPasswords: updatedPasswords,
      updatedAt: new Date().toISOString()
    };
    const res = await saveSystemSettings(updated);
    if (res.error) {
      return { success: false, message: res.error.message || 'Gagal menyimpan kata laluan.' };
    }
    return { success: true, message: `Kata laluan User untuk kawasan ${parlimen} berjaya dikemaskini!` };
  } catch (err) {
    return { success: false, message: err.message || 'Ralat berlaku.' };
  }
}

/**
 * Helper to subscribe to real-time changes on system settings
 */
export function subscribeToSystemSettings(onUpdate) {
  if (!isSupabaseConfigured) return () => {};

  const channelId = `system_settings_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'master_kawasan',
        filter: 'id=eq.__SYSTEM_SETTINGS__'
      },
      (payload) => {
        console.log('[Supabase Settings Realtime Event]:', payload);
        if (payload.new) {
          try {
            let parsed = null;
            if (payload.new.lokaliti_nama) {
              parsed = JSON.parse(payload.new.lokaliti_nama);
            }
            const settings = {
              kataLaluan: parsed?.kataLaluan || parsed?.kataLaluanUser || payload.new.dun || 'USER123',
              kataLaluanUser: parsed?.kataLaluanUser || parsed?.kataLaluan || payload.new.dun || 'USER123',
              kataLaluanPegawai: parsed?.kataLaluanPegawai || 'PEGAWAI123',
              kataLaluanMaster: parsed?.kataLaluanMaster || 'ADMIN123',
              parlimenPasswords: parsed?.parlimenPasswords || { 'P.071 GOPENG': 'GOPENG123' },
              tajukUtama: parsed?.tajukUtama || payload.new.parlimen || 'Maklum Balas Semasa (MBS)',
              subTajuk: parsed?.subTajuk || 'Sistem Pengurusan & Maklum Balas Rakyat',
              defaultParlimen: parsed?.defaultParlimen || payload.new.dm_kod || 'P.071 GOPENG',
              isLocked: parsed?.isLocked !== undefined ? Boolean(parsed.isLocked) : (payload.new.dm_nama === 'true'),
              updatedAt: payload.new.updated_at
            };
            if (onUpdate) onUpdate(settings);
          } catch (e) {
            if (onUpdate) onUpdate(payload.new);
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tetapan_sistem',
        filter: 'kunci=eq.tetapan_global'
      },
      (payload) => {
        console.log('[Supabase Dedicated Settings Realtime Event]:', payload);
        if (payload.new && payload.new.nilai && onUpdate) {
          const val = payload.new.nilai;
          const settings = {
            kataLaluan: val.kataLaluan || val.kataLaluanUser || 'USER123',
            kataLaluanUser: val.kataLaluanUser || val.kataLaluan || 'USER123',
            kataLaluanPegawai: val.kataLaluanPegawai || 'PEGAWAI123',
            kataLaluanMaster: val.kataLaluanMaster || 'ADMIN123',
            parlimenPasswords: val.parlimenPasswords || { 'P.071 GOPENG': 'GOPENG123' },
            tajukUtama: val.tajukUtama || 'Maklum Balas Semasa (MBS)',
            subTajuk: val.subTajuk || 'Sistem Pengurusan & Maklum Balas Rakyat',
            defaultParlimen: val.defaultParlimen || 'P.071 GOPENG',
            isLocked: val.isLocked !== undefined ? Boolean(val.isLocked) : false,
            updatedAt: val.updatedAt || new Date().toISOString()
          };
          onUpdate(settings);
        }
      }
    )
    .subscribe();

  return () => {
    try {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[Supabase Settings Channel Cleanup Warning]:', err);
    }
  };
}

// ==========================================
// 8. LOG AKTIVITI / AUDIT TRAIL PERSISTENCE
// ==========================================
const LOCAL_STORAGE_AUDIT_LOGS_KEY = 'mbs_audit_logs';
const LOCAL_STORAGE_RESET_REQS_KEY = 'mbs_password_reset_requests';

/**
 * Log action to Audit Trail (saved to Supabase & local storage backup)
 */
export async function recordAuditLog(entry) {
  const logItem = {
    id: entry.id || `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    peranan: entry.peranan || 'user',
    pengguna: entry.pengguna || 'Pengguna Awam',
    parlimen: entry.parlimen || null,
    tindakan: entry.tindakan || 'TETAPAN_SISTEM',
    huraian: entry.huraian || '',
    butiran: entry.butiran || null
  };

  // 1. Always update local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [logItem, ...existing].slice(0, 300); // keep recent 300
    localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Audit Log LocalStorage Error]:', err);
  }

  // 2. Push to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      // Try dedicated table 'audit_logs'
      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          id: logItem.id,
          timestamp: logItem.timestamp,
          peranan: logItem.peranan,
          pengguna: logItem.pengguna,
          parlimen: logItem.parlimen,
          tindakan: logItem.tindakan,
          huraian: logItem.huraian,
          butiran: logItem.butiran
        }]);

      if (error) {
        // Fallback: store latest batch summary in master_kawasan '__AUDIT_LOGS__'
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
          const recs = raw ? JSON.parse(raw).slice(0, 40) : [logItem];
          await supabase.from('master_kawasan').upsert({
            id: '__AUDIT_LOGS__',
            parlimen: 'LOG_AUDIT_MASTER',
            dun: 'AUDIT',
            dm_kod: 'LOG',
            dm_nama: 'Audit Trail',
            lokaliti_kod: String(recs.length),
            lokaliti_nama: JSON.stringify(recs),
            negeri: 'PERAK',
            tarikh_daftar: logItem.timestamp
          });
        } catch (inner) {}
      }
    } catch (e) {
      console.warn('[Supabase Record Audit Log Error]:', e);
    }
  }

  return logItem;
}

/**
 * Fetch all audit logs (from Supabase or local storage)
 */
export async function fetchAuditLogs() {
  let logs = [];

  // Try Supabase first
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        return data;
      }

      // Check fallback '__AUDIT_LOGS__' in master_kawasan
      const { data: fallbackData } = await supabase
        .from('master_kawasan')
        .select('lokaliti_nama')
        .eq('id', '__AUDIT_LOGS__')
        .maybeSingle();

      if (fallbackData && fallbackData.lokaliti_nama) {
        try {
          const parsed = JSON.parse(fallbackData.lokaliti_nama);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[Supabase Fetch Audit Logs Error]:', err);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
    if (raw) logs = JSON.parse(raw);
  } catch (e) {}

  return logs;
}

/**
 * Submit a 'Lupa Kata Laluan' request
 */
export async function submitPasswordResetRequest(request) {
  const reqItem = {
    id: `RST-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    namaPemohon: request.namaPemohon,
    peranan: request.peranan,
    parlimen: request.parlimen || '',
    emelAtauTelefon: request.emelAtauTelefon,
    catatan: request.catatan || '',
    status: 'Menunggu'
  };

  // Local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESET_REQS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOCAL_STORAGE_RESET_REQS_KEY, JSON.stringify([reqItem, ...existing]));
  } catch (err) {}

  // Also log into Audit
  await recordAuditLog({
    peranan: request.peranan,
    pengguna: request.namaPemohon,
    parlimen: request.parlimen,
    tindakan: 'TUKAR_KATALALUAN',
    huraian: `Permohonan set semula kata laluan diterima daripada ${request.namaPemohon} (${request.emelAtauTelefon})`
  });

  return { success: true, message: 'Permohonan anda telah direkodkan. Sila maklumkan kepada Master Admin untuk pengesahan segera.', data: reqItem };
}

/**
 * Fetch password reset requests
 */
export async function fetchPasswordResetRequests() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESET_REQS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}


