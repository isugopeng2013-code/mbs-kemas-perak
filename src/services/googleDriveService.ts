/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase securely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// All Google Drive scopes configured for the applet
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts'
];

const provider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach(scope => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account'
});

// Strict in-memory access token cache - NEVER persisted to storage
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

/**
 * Initialize Auth state listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not yet cached; user needs interactive sign in to re-obtain OAuth access token
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Popup and obtain OAuth token with Drive scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token capaian (access token) dari pengesahan Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Ralat log masuk Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Log out and clear cached token
 */
export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Get or create dedicated MBS Folder in user's Google Drive
 */
export const getOrCreateMBSFolder = async (
  folderName: string = 'Sistem Laporan MBS'
): Promise<{ id: string; name: string; webViewLink?: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Pengesahan Google Drive diperlukan. Sila log masuk.');

  // Check if folder exists
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Ralat mencari folder: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0];
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Folder rasmi dokumen & sandaran Sistem Laporan Maklum Balas Semasa (MBS)'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal mencipta folder Google Drive: ${errText}`);
  }

  return await createRes.json();
};

/**
 * Upload a file (Blob or string) to Google Drive using multipart upload
 */
export const uploadFileToDrive = async ({
  name,
  mimeType,
  content,
  folderId,
  description
}: {
  name: string;
  mimeType: string;
  content: Blob | string;
  folderId?: string;
  description?: string;
}): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Pengesahan Google Drive diperlukan. Sila log masuk.');

  const metadata: any = {
    name,
    mimeType,
    description: description || 'Dicipta oleh Sistem Laporan MBS'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------mbs_drive_upload_boundary_' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  let bodyBlob: Blob;
  if (content instanceof Blob) {
    const metadataPart = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`
    ]);
    const closePart = new Blob([closeDelimiter]);
    bodyBlob = new Blob([metadataPart, content, closePart], {
      type: `multipart/related; boundary=${boundary}`
    });
  } else {
    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelimiter;
    bodyBlob = new Blob([multipartBody], {
      type: `multipart/related; boundary=${boundary}`
    });
  }

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,iconLink,thumbnailLink,createdTime,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: bodyBlob
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gagal memuat naik fail ke Google Drive: ${errText}`);
  }

  return await uploadRes.json();
};

/**
 * List files in Google Drive (optionally within MBS folder or query search)
 */
export const listDriveFiles = async ({
  folderId,
  searchTerm,
  pageSize = 50
}: {
  folderId?: string;
  searchTerm?: string;
  pageSize?: number;
} = {}): Promise<DriveFileItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Pengesahan Google Drive diperlukan.');

  const queries: string[] = ['trashed=false'];
  if (folderId) {
    queries.push(`'${folderId}' in parents`);
  }
  if (searchTerm && searchTerm.trim() !== '') {
    const cleanSearch = searchTerm.replace(/'/g, "\\'");
    queries.push(`name contains '${cleanSearch}'`);
  }

  const q = encodeURIComponent(queries.join(' and '));
  const fields = encodeURIComponent('files(id,name,mimeType,size,webViewLink,iconLink,thumbnailLink,createdTime,modifiedTime,parents)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=${pageSize}&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memuat senarai fail dari Google Drive: ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Download / fetch file text content from Google Drive
 */
export const downloadDriveFileContent = async (fileId: string): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Pengesahan Google Drive diperlukan.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memuat turun fail dari Google Drive: ${errText}`);
  }

  return await res.text();
};

/**
 * Delete a file from Google Drive (Mandatory user confirmation handled by UI callers)
 */
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Pengesahan Google Drive diperlukan.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Gagal memadam fail dari Google Drive: ${errText}`);
  }
};
