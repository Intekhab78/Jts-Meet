export const API_BASE = 'https://meetapi.jtsmiddleeast.com';
export const SOCKET_URL = 'https://meetapi.jtsmiddleeast.com';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('jts_access_token');
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
