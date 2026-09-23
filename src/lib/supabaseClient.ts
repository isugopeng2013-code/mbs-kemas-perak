/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Re-export Supabase client and helpers from lib/supabaseClient.js
export {
  supabase,
  isSupabaseConfigured,
  submitReportToSupabase,
  fetchLaporanMbs,
  subscribeToLaporanMbs,
  updateReportInSupabase,
  deleteReportFromSupabase,
  uploadMasterKawasanToSupabase,
  fetchMasterKawasan,
  addMasterRecordToSupabase,
  updateMasterRecordInSupabase,
  deleteMasterRecordFromSupabase,
  subscribeToMasterKawasan,
  fetchSystemSettings,
  saveSystemSettings,
  updateUserPasswordForParlimen,
  subscribeToSystemSettings,
  recordAuditLog,
  fetchAuditLogs,
  submitPasswordResetRequest,
  fetchPasswordResetRequests
} from '../../lib/supabaseClient.js';

