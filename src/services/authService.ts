import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/config';

const ADMIN_SESSION_KEY = 'talent360_super_admin_session';

export interface AdminUser {
  email: string;
  isMock?: boolean;
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
  const cleanEmail = email.trim();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Por favor ingresa tu correo electrónico y contraseña.');
  }

  const auth = getFirebaseAuth();
  if (!auth || !isFirebaseConfigured()) {
    throw new Error(
      'El servicio de Firebase Auth no está configurado. Por favor verifica las variables de entorno de Firebase en el archivo .env.'
    );
  }

  try {
    const userCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    const sessionUser: AdminUser = {
      email: userCred.user.email || cleanEmail,
      isMock: false,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  } catch (firebaseErr: any) {
    const code = firebaseErr?.code || '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('El formato del correo electrónico no es válido.');
    }
    if (code === 'auth/user-disabled') {
      throw new Error('Esta cuenta de administrador ha sido deshabilitada.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos fallidos. Por favor espera unos minutos antes de intentar de nuevo.');
    }
    if (code === 'auth/network-request-failed') {
      throw new Error('Error de red al conectar con Firebase. Revisa tu conexión a internet.');
    }
    throw new Error(firebaseErr?.message || 'Error de autenticación en Firebase.');
  }
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

