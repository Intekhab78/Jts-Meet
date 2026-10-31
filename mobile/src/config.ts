export const API_BASE = 'https://meetapi.jtsmiddleeast.com';
export const SOCKET_URL = 'https://meetapi.jtsmiddleeast.com';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('jts_access_token') || localStorage.getItem('jts_token') || sessionStorage.getItem('jts_token') || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('jts_access_token', token);
    } else {
      localStorage.removeItem('jts_access_token');
    }
  } catch {}
}

export function getStoredUser(): any {
  try {
    const raw = localStorage.getItem('jts_user_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  try {
    if (user) {
      localStorage.setItem('jts_user_profile', JSON.stringify(user));
    } else {
      localStorage.removeItem('jts_user_profile');
    }
  } catch {}
}

export function clearAllSessionStorageAndData(): void {
  try {
    const keysToRemove = [
      'jts_access_token',
      'jts_token',
      'jts_user_profile',
      'jts_user_name',
      'jts_display_name',
      'jts_user_title',
      'jts_user_dept',
      'jts_user_phone',
      'jts_current_org_id',
      'jts_active_team_id',
      'jts_scheduled_meetings',
      'jts_recent_meetings',
      'jts_active_mobile_meeting',
      'jts_last_meeting_id',
    ];
    keysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });

    // Remove any dynamic chat or org cache keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('jts_chat_') || key.startsWith('jts_org_') || key.startsWith('jts_team_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
}

export function resolveAvatarUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean) return '';
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.startsWith('/')) {
    return `${API_BASE}${clean}`;
  }
  return `${API_BASE}/${clean}`;
}


