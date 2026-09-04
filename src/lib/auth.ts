/**
 * @fileoverview Servicio de autenticación con Supabase Auth
 */
import { supabase, type User } from '@/lib/supabase';
import type { UserRole } from '@/types/supabase';
import { userService } from '@/lib/supabase-services';

export interface SignUpParams { email:string; password:string; name:string; phone?:string; role?:UserRole; company_id?:string; }
export interface SignInParams { email:string; password:string; }
export interface PasswordResetParams { email:string; }
export interface UpdatePasswordParams { newPassword:string; }
export interface AuthResponse { user:User|null; error:Error|null; }

const AUTH_PERSISTENCE_KEY = 'fleetease.auth.persistence.v1';
const SESSION_STORAGE_KEY = 'fleetease.auth.session.v1';
const SUPABASE_AUTH_STORAGE_KEY = 'sb-qettktslcbjjuyejcpqy-auth-token';

type AuthPersistence = 'persistent' | 'session';

function isBrowser(): boolean { return typeof window !== 'undefined'; }

export function getAuthPersistence(): AuthPersistence {
  if (!isBrowser()) return 'persistent';
  return window.localStorage.getItem(AUTH_PERSISTENCE_KEY) === 'session' ? 'session' : 'persistent';
}

export function setAuthPersistence(rememberMe: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(AUTH_PERSISTENCE_KEY, rememberMe ? 'persistent' : 'session');
    if (rememberMe) window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

function clearSupabasePersistentSession(): void {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY); } catch {}
}

function saveSessionForCurrentTab(session: unknown): void {
  if (!isBrowser() || !session) return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    clearSupabasePersistentSession();
  } catch {}
}

export function enforceSessionOnlyPersistence(session: unknown): void {
  if (!isBrowser() || getAuthPersistence() !== 'session' || !session) return;
  saveSessionForCurrentTab(session);
}

export async function restoreSessionOnly(): Promise<void> {
  if (!isBrowser() || getAuthPersistence() !== 'session') return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as { access_token?: string; refresh_token?: string };
    if (!stored?.access_token || !stored?.refresh_token) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    const { error } = await supabase.auth.setSession({ access_token: stored.access_token, refresh_token: stored.refresh_token });
    if (error) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      clearSupabasePersistentSession();
      return;
    }
    clearSupabasePersistentSession();
  } catch {
    try { window.sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
    clearSupabasePersistentSession();
  }
}

export function clearAuthPersistence(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_PERSISTENCE_KEY);
    clearSupabasePersistentSession();
  } catch {}
}

async function fetchProfileFromApp(accessToken:string):Promise<User|null>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetch('/api/auth/profile',{method:'GET',headers:{Authorization:`Bearer ${accessToken}`},cache:'no-store',signal:controller.signal});
    if(!response.ok)return null;
    const data=await response.json();
    const profile=data?.profile as User|undefined;
    if(!profile||profile.is_deleted)return null;
    return profile;
  }catch{return null;}finally{clearTimeout(timeout);}
}

export async function signUp(params:SignUpParams):Promise<AuthResponse>{try{const {data:authData,error:authError}=await supabase.auth.signUp({email:params.email,password:params.password,options:{data:{name:params.name,phone:params.phone}}});if(authError)return{user:null,error:authError};if(!authData.user)return{user:null,error:new Error('No se pudo crear el usuario')};const userProfile=await userService.add({id:authData.user.id,email:params.email,name:params.name,phone:params.phone,role:params.role||'viewer',company_id:params.company_id,is_deleted:false});return{user:userProfile,error:null};}catch(error){return{user:null,error:error instanceof Error?error:new Error('Error desconocido')}}}

export async function signIn(params:SignInParams):Promise<AuthResponse>;
export async function signIn(email:string,password:string):Promise<AuthResponse>;
export async function signIn(paramsOrEmail:SignInParams|string,password?:string):Promise<AuthResponse>{try{const params=typeof paramsOrEmail==='string'?{email:paramsOrEmail,password:password??''}:paramsOrEmail;const {data:authData,error:authError}=await supabase.auth.signInWithPassword({email:params.email,password:params.password});if(authError)return{user:null,error:authError};if(!authData.user||!authData.session?.access_token)return{user:null,error:new Error('Sesión de autenticación no disponible')};if(getAuthPersistence()==='session')enforceSessionOnlyPersistence(authData.session);const userProfile=await fetchProfileFromApp(authData.session.access_token);if(!userProfile)return{user:null,error:new Error('Perfil de usuario no encontrado')};return{user:userProfile,error:null};}catch(error){return{user:null,error:error instanceof Error?error:new Error('Error desconocido')}}}

export async function signOut():Promise<void>{const {error}=await supabase.auth.signOut();if(error)throw error;clearAuthPersistence();}
export async function getCurrentUser():Promise<User|null>{try{const {data:{session},error}=await supabase.auth.getSession();if(error||!session?.access_token)return null;return await fetchProfileFromApp(session.access_token);}catch{return null;}}
export function onAuthStateChange(callback:(user:User|null)=>void):{subscription:{unsubscribe:()=>void}}{getCurrentUser().then(callback);const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,session)=>{if(session?.access_token){enforceSessionOnlyPersistence(session);callback(await fetchProfileFromApp(session.access_token));}else callback(null);});return{subscription};}

export async function resetPassword(params:PasswordResetParams):Promise<Error|null>{try{const browserOrigin=typeof window!=='undefined'?window.location.origin.replace(/\/$/,''):'';const siteUrl=typeof window!=='undefined'&&window.location.hostname==='fleetease.com.mx'?'https://fleetease.com.mx':(process.env.NEXT_PUBLIC_SITE_URL||browserOrigin||'https://fleetease.com.mx').replace(/\/$/,'');const {error}=await supabase.auth.resetPasswordForEmail(params.email,{redirectTo:`${siteUrl}/reset-password`});if(error)return error;return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export async function updatePassword(params:UpdatePasswordParams):Promise<Error|null>{try{const {error}=await supabase.auth.updateUser({password:params.newPassword});if(error)return error;return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export async function updateUserProfile(userId:string,updates:Partial<User>):Promise<Error|null>{try{await userService.update(userId,updates);return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export function signInWithOAuth(provider:'google'|'facebook'|'github'|'discord',redirectTo?:string):Promise<{url?:string;error:Error|null}>{return(async()=>{try{const {data,error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:redirectTo||`${window.location.origin}/dashboard`}});if(error)return{url:undefined,error};return{url:data.url,error:null};}catch(error){return{url:undefined,error:error instanceof Error?error:new Error('Error desconocido')}}})();}
export async function isAuthenticated():Promise<boolean>{return(await getCurrentUser())!==null;}
export async function getSessionToken():Promise<string|null>{try{const {data:{session},error}=await supabase.auth.getSession();if(error||!session)return null;return session.access_token;}catch{return null;}}
export async function refreshSession():Promise<Error|null>{try{const {error}=await supabase.auth.refreshSession();return error||null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export function formatAuthError(error:Error):string{const message=error.message;if(message.includes('Invalid login credentials'))return'Email o contraseña inválidos';if(message.includes('User already registered'))return'Este email ya está registrado';if(message.includes('Weak password'))return'La contraseña es muy débil. Debe tener al menos 6 caracteres';if(message.includes('Email not confirmed'))return'Por favor verifica tu email antes de iniciar sesión';if(message.includes('Provider not found'))return'Proveedor de autenticación no encontrado';return message;}
export function validatePassword(password:string):{valid:boolean;error?:string}{if(password.length<6)return{valid:false,error:'La contraseña debe tener al menos 6 caracteres'};return{valid:true};}
export function validateEmail(email:string):{valid:boolean;error?:string}{if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return{valid:false,error:'Email inválido'};return{valid:true};}
