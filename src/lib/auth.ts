/**
 * @fileoverview Servicio de autenticación con Supabase Auth
 */
import { supabase } from '@/lib/supabase';
import { supabase as cookieSupabase } from '@/lib/supabase-browser';
import type { User, UserRole } from '@/types/supabase';
import { userService } from '@/lib/supabase-services';
import { clearSupabaseAuthStorage, setAuthPersistencePreference } from '@/lib/auth-persistence';

export interface SignUpParams { email:string; password:string; name:string; phone?:string; role?:UserRole; company_id?:string; }
export interface SignInParams { email:string; password:string; }
export interface PasswordResetParams { email:string; }
export interface UpdatePasswordParams { newPassword:string; }
export interface AuthResponse { user:User|null; error:Error|null; }

const AUTH_PROFILE_CACHE_KEY = 'fleetease.auth.profile.v1';

export function setAuthPersistence(rememberMe: boolean): void {
  setAuthPersistencePreference(rememberMe);
}

export function clearAuthPersistence(): void {
  if (typeof window === 'undefined') return;
  clearSupabaseAuthStorage();
  try {
    window.localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
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
export async function signIn(paramsOrEmail: SignInParams | string, password?: string): Promise<AuthResponse> {
  try {
    const params = typeof paramsOrEmail === "string" ? { email: paramsOrEmail, password: password ?? "" } : paramsOrEmail;
    const rememberMe = typeof window === "undefined" || window.localStorage.getItem("fleetease.auth.persistence.v1") !== "session";
    const response = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      cache: "no-store", body: JSON.stringify({ ...params, rememberMe }),
    });
    const result = await response.json();
    if (!response.ok) return { user: null, error: new Error(result.error || "No se pudo iniciar sesión") };
    if (!result.session?.access_token || !result.session?.refresh_token || !result.profile) {
      return { user: null, error: new Error("Sesión de autenticación no disponible") };
    }
    const { error } = await supabase.auth.setSession(result.session);
    if (error) return { user: null, error };
    return { user: result.profile, error: null };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error : new Error("Error desconocido") };
  }
}

export async function signOut():Promise<void>{
  // FleetEase has used both supabase-js localStorage and @supabase/ssr cookie
  // storage. Sign out both stores so neither can restore a previous account.
  let serverLogoutFailed = false;
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      serverLogoutFailed = !response.ok;
    } catch (error) {
      serverLogoutFailed = true;
      console.warn('[Auth] No se pudo confirmar el cierre de sesión SSR.', error);
    }
  }

  const [localResult, cookieResult] = await Promise.allSettled([
    supabase.auth.signOut({ scope: 'local' }),
    cookieSupabase.auth.signOut({ scope: 'local' }),
  ]);

  // Always remove app-owned caches, even if one of the SDK sign-outs fails.
  clearAuthPersistence();

  const localError = localResult.status === 'rejected'
    ? localResult.reason
    : localResult.value.error;
  const cookieError = cookieResult.status === 'rejected'
    ? cookieResult.reason
    : cookieResult.value.error;

  if (localError && cookieError) {
    throw new Error('No se pudieron limpiar las sesiones del navegador. Recarga la página e inténtalo de nuevo.');
  }
  if (serverLogoutFailed) {
    console.warn('[Auth] El endpoint SSR no confirmó el cierre; las sesiones de ambos clientes fueron limpiadas localmente.');
  }
}
export async function getCurrentUser():Promise<User|null>{try{const {data:{session},error}=await supabase.auth.getSession();if(error||!session?.access_token)return null;return await fetchProfileFromApp(session.access_token);}catch{return null;}}
export function onAuthStateChange(callback:(user:User|null)=>void):{subscription:{unsubscribe:()=>void}}{getCurrentUser().then(callback);const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,session)=>{if(session?.access_token){callback(await fetchProfileFromApp(session.access_token));}else callback(null);});return{subscription};}

export async function resetPassword(params:PasswordResetParams):Promise<Error|null>{try{const browserOrigin=typeof window!=='undefined'?window.location.origin.replace(/\/$/,''):'';const siteUrl=typeof window!=='undefined'&&window.location.hostname==='fleetease.com.mx'?'https://fleetease.com.mx':(process.env.NEXT_PUBLIC_SITE_URL||browserOrigin||'https://fleetease.com.mx').replace(/\/$/,'');const {error}=await supabase.auth.resetPasswordForEmail(params.email,{redirectTo:`${siteUrl}/reset-password`});if(error)return error;return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export async function updatePassword(params:UpdatePasswordParams):Promise<Error|null>{try{const {error}=await supabase.auth.updateUser({password:params.newPassword});if(error)return error;return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export async function updateUserProfile(userId:string,updates:Partial<User>):Promise<Error|null>{try{await userService.update(userId,updates);return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export function signInWithOAuth(provider:'google'|'facebook'|'github'|'discord',redirectTo?:string):Promise<{url?:string;error:Error|null}>{return(async()=>{try{const {data,error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:redirectTo||`${window.location.origin}/dashboard`}});if(error)return{url:undefined,error};return{url:data.url,error:null};}catch(error){return{url:undefined,error:error instanceof Error?error:new Error('Error desconocido')}}})();}
export async function isAuthenticated():Promise<boolean>{return(await getCurrentUser())!==null;}
export async function getSessionToken():Promise<string|null>{try{const {data:{session},error}=await supabase.auth.getSession();if(error||!session)return null;return session.access_token;}catch{return null;}}
export async function refreshSession():Promise<Error|null>{try{const {error}=await supabase.auth.refreshSession();return error||null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}
export function formatAuthError(error:Error):string{const message=error.message;if(message.includes('Invalid login credentials'))return'Email o contraseña inválidos';if(message.includes('User already registered'))return'Este email ya está registrado';if(message.includes('Weak password'))return'La contraseña es muy débil. Debe tener al menos 8 caracteres';if(message.includes('Email not confirmed'))return'Por favor verifica tu email antes de iniciar sesión';if(message.includes('Provider not found'))return'Proveedor de autenticación no encontrado';return message;}
export function validatePassword(password:string):{valid:boolean;error?:string}{if(password.length<8)return{valid:false,error:'La contraseña debe tener al menos 8 caracteres'};return{valid:true};}
export function validateEmail(email:string):{valid:boolean;error?:string}{if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return{valid:false,error:'Email inválido'};return{valid:true};}
