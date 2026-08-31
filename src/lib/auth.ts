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

export async function signUp(params:SignUpParams):Promise<AuthResponse>{try{const {data:authData,error:authError}=await supabase.auth.signUp({email:params.email,password:params.password,options:{data:{name:params.name,phone:params.phone}}});if(authError)return{user:null,error:authError};if(!authData.user)return{user:null,error:new Error('No se pudo crear el usuario')};const userProfile=await userService.add({id:authData.user.id,email:params.email,name:params.name,phone:params.phone,role:params.role||'viewer',company_id:params.company_id,is_deleted:false});return{user:userProfile,error:null};}catch(error){return{user:null,error:error instanceof Error?error:new Error('Error desconocido')}}}

export async function signIn(params:SignInParams):Promise<AuthResponse>{try{const {data:authData,error:authError}=await supabase.auth.signInWithPassword({email:params.email,password:params.password});if(authError)return{user:null,error:authError};if(!authData.user)return{user:null,error:new Error('Credenciales inválidas')};const userProfile=await userService.get(authData.user.id);if(!userProfile)return{user:null,error:new Error('Perfil de usuario no encontrado')};if(userProfile.is_deleted)return{user:null,error:new Error('Usuario eliminado')};return{user:userProfile,error:null};}catch(error){return{user:null,error:error instanceof Error?error:new Error('Error desconocido')}}}

export async function signOut():Promise<void>{const {error}=await supabase.auth.signOut();if(error)throw error;}

export async function getCurrentUser():Promise<User|null>{try{const {data:{user:authUser},error:authError}=await supabase.auth.getUser();if(authError||!authUser)return null;const userProfile=await userService.get(authUser.id);if(!userProfile||userProfile.is_deleted)return null;return userProfile;}catch{return null;}}

export function onAuthStateChange(callback:(user:User|null)=>void):{subscription:{unsubscribe:()=>void}}{getCurrentUser().then(callback);const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,session)=>{if(session?.user){const userProfile=await userService.get(session.user.id);callback(userProfile||null);}else callback(null);});return{subscription};}

export async function resetPassword(params:PasswordResetParams):Promise<Error|null>{try{const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||(typeof window!=='undefined'?window.location.origin:'https://fleetease.com.mx')).replace(/\/$/,'');const {error}=await supabase.auth.resetPasswordForEmail(params.email,{redirectTo:`${siteUrl}/reset-password`});if(error)return error;return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}

export async function updatePassword(params:UpdatePasswordParams):Promise<Error|null>{try{const {error}=await supabase.auth.updateUser({password:params.newPassword});if(error)return error;return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}

export async function updateUserProfile(userId:string,updates:Partial<User>):Promise<Error|null>{try{await userService.update(userId,updates);return null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}

export async function signInWithOAuth(provider:'google'|'facebook'|'github'|'discord',redirectTo?:string):Promise<{url?:string;error:Error|null}>{try{const {data,error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:redirectTo||`${window.location.origin}/dashboard`}});if(error)return{url:undefined,error};return{url:data.url,error:null};}catch(error){return{url:undefined,error:error instanceof Error?error:new Error('Error desconocido')}}}

export async function isAuthenticated():Promise<boolean>{return(await getCurrentUser())!==null;}

export async function getSessionToken():Promise<string|null>{try{const {data:{session},error}=await supabase.auth.getSession();if(error||!session)return null;return session.access_token;}catch{return null;}}

export async function refreshSession():Promise<Error|null>{try{const {error}=await supabase.auth.refreshSession();return error||null;}catch(error){return error instanceof Error?error:new Error('Error desconocido');}}

export function formatAuthError(error:Error):string{const message=error.message;if(message.includes('Invalid login credentials'))return'Email o contraseña inválidos';if(message.includes('User already registered'))return'Este email ya está registrado';if(message.includes('Weak password'))return'La contraseña es muy débil. Debe tener al menos 6 caracteres';if(message.includes('Email not confirmed'))return'Por favor verifica tu email antes de iniciar sesión';if(message.includes('Provider not found'))return'Proveedor de autenticación no encontrado';return message;}

export function validatePassword(password:string):{valid:boolean;error?:string}{if(password.length<6)return{valid:false,error:'La contraseña debe tener al menos 6 caracteres'};return{valid:true};}
export function validateEmail(email:string):{valid:boolean;error?:string}{if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return{valid:false,error:'Email inválido'};return{valid:true};}
