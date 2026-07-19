/**
 * Centralized API service.
 * Uses relative paths (/api/...) so the same code works from any device
 * on the LAN — no hardcoded localhost or IP addresses.
 */

// Token is stored here in module scope so all functions share it.
let _token = null;

export function setToken(token) {
  _token = token;
  if (token) {
    localStorage.setItem('cmc_token', token);
  } else {
    localStorage.removeItem('cmc_token');
  }
}

export function getToken() {
  if (!_token) {
    _token = localStorage.getItem('cmc_token');
  }
  return _token;
}

export function clearToken() {
  setToken(null);
}

function authHeaders() {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || 'Unknown error' };
  }
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────
export async function register(email, code, username, password) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, username, password }),
  });
  return handleResponse(res);
}

export async function checkEmail(email, code) {
  const res = await fetch('/api/check-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse(res);
}

export async function login(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse(res);
  setToken(data.token);
  return data;
}

export async function logout() {
  await fetch('/api/logout', {
    method: 'POST',
    headers: { ...authHeaders() },
  }).catch(() => {});
  clearToken();
}

// ── User ──────────────────────────────────────────────
export async function getMe() {
  const res = await fetch('/api/user/me', {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Files ─────────────────────────────────────────────
export async function listFiles() {
  const res = await fetch('/api/files', {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  // Use XMLHttpRequest for upload progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || `HTTP ${xhr.status}`));
        }
      } catch {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export function downloadFileUrl(fileId) {
  // Return a URL that can be used in an <a> tag for download.
  // We can't set headers on a simple anchor, so we trigger a fetch-based download.
  return `/api/files/${fileId}`;
}

export async function downloadFile(fileId, filename) {
  const res = await fetch(`/api/files/${fileId}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function deleteFile(fileId) {
  const res = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Admin ──────────────────────────────────────────────
export async function adminGetFiles() {
  const res = await fetch('/api/admin/files', {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function adminGetUsers() {
  const res = await fetch('/api/admin/users', {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function adminGetAllowedEmails() {
  const res = await fetch('/api/admin/allowed-emails', {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function adminAddAllowedEmail(email) {
  const res = await fetch('/api/admin/allowed-emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function adminDeleteAllowedEmail(id) {
  const res = await fetch(`/api/admin/allowed-emails/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}
