import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/config';

const ADMIN_SESSION_KEY = 'talent360_super_admin_session';

export interface AdminUser {
  email: string;
  isMock: boolean;
  loggedInAt: string;
}

export function getAdminSession(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading admin session:', e);
  }
  return null;
}

export function isSuperAdminLoggedIn(): boolean {
  return !!getAdminSession();
}

export async function loginSuperAdmin(email: string, password: string): Promise<AdminUser> {
  const auth = getFirebaseAuth();
  const usingFirebase = isFirebaseConfigured() && !!auth;

  if (usingFirebase && auth) {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const sessionUser: AdminUser = {
        email: userCred.user.email || email.trim(),
        isMock: false,
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    } catch (firebaseErr: any) {
      console.warn('Firebase auth failed, checking fallback:', firebaseErr);
      // If the error is user not found or auth failed in live Firebase, but user specifically wants to test prototype:
      if (
        (email.trim().toLowerCase() === 'admin@talent360.com' || email.trim().toLowerCase() === 'admin@empresa.com') &&
        (password === 'admin123' || password === 'admin')
      ) {
        const sessionUser: AdminUser = {
          email: email.trim(),
          isMock: true,
          loggedInAt: new Date().toISOString(),
        };
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
        return sessionUser;
      }
      throw firebaseErr;
    }
  }

  // Prototype mode authentication
  if (!email.trim() || !password.trim()) {
    throw new Error('Por favor ingresa correo y contraseña.');
  }

  // Allow standard demo credentials or any provided credentials in prototype mode
  const sessionUser: AdminUser = {
    email: email.trim(),
    isMock: true,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export function quickDemoAdminLogin(): AdminUser {
  const sessionUser: AdminUser = {
    email: 'admin@talent360.com',
    isMock: true,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export async function logoutSuperAdmin(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout error:', e);
    }
  }
  localStorage.removeItem(ADMIN_SESSION_KEY);
}
