"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-provider';
import {
  Moon,
  Sun,
  Settings2,
  UserCircle,
  KeyRound,
  Bell,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { NotificationSettings } from '@/types';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { useSystemSettingsAnalytics } from '@/hooks/use-system-settings-analytics';
import { SystemAdminDashboard } from './components/system-admin-dashboard';
import { useData } from '@/hooks/use-data';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getSessionToken } from '@/lib/auth';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Dirección de correo electrónico inválida.' }),
  phone: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos.')
    .optional()
    .or(z.literal('')),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
    newPassword: z
      .string()
      .min(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Las nuevas contraseñas no coinciden.',
    path: ['confirmPassword'],
  })
  .refine(data => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual.',
    path: ['newPassword'],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

const notificationsSchema = z.object({
  maintenance: z.boolean().default(true),
  maintenanceThreshold: z.coerce.number().int().min(0).optional(),
  insurance: z.boolean().default(true),
  insuranceThreshold: z.coerce.number().int().min(0).optional(),
  license: z.boolean().default(true),
  licenseThreshold: z.coerce.number().int().min(0).optional(),
});
type NotificationsFormValues = z.infer<typeof notificationsSchema>;

const inputClass = 'h-[var(--fe-control-height)]';
const labelClass = 'text-xs font-medium text-[var(--fe-text-muted)]';
const sectionClass = 'rounded-[var(--fe-radius-md)] border border-[var(--fe-border)] bg-[var(--fe-surface)] p-4 shadow-[var(--fe-shadow-sm)] sm:p-5';

const SystemMaintenanceCard = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = sonnerToast.loading('Sincronizando permisos de usuario...');
    try {
      const token = await getSessionToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      const response = await fetch('/api/admin/sync-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error en sincronización');

      if (data.success) {
        sonnerToast.success('Sincronización exitosa', {
          id: toastId,
          description:
            data.message +
            ' Cierra sesión y vuelve a iniciarla para aplicar los cambios.',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error syncing claims:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
      sonnerToast.error('Error de sincronización', { id: toastId, description: errorMessage });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className={sectionClass}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
          <Settings2 className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Mantenimiento del sistema</h2>
          <p className="mt-0.5 text-xs text-white/40">
            Actualiza roles y permisos de todos los usuarios según la base de datos.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
        >
          {isSyncing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
          )}
          {isSyncing ? 'Sincronizando...' : 'Sincronizar permisos'}
        </Button>

      </div>
    </section>
  );
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, updateUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { loadingData } = useData();
  const { systemHealthMetrics } = useSystemSettingsAnalytics();

  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingNotifications, setIsSubmittingNotifications] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    };
    checkSubscription();
  }, []);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      maintenance: true,
      maintenanceThreshold: 1000,
      insurance: true,
      insuranceThreshold: 30,
      license: true,
      licenseThreshold: 30,
    },
  });

  const newPasswordValue = passwordForm.watch('newPassword');

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '',
      });
      notificationsForm.reset(
        currentUser.notificationSettings || {
          maintenance: true,
          maintenanceThreshold: 1500,
          insurance: true,
          insuranceThreshold: 30,
          license: true,
          licenseThreshold: 30,
        }
      );
    }
  }, [currentUser, profileForm, notificationsForm]);

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    setIsSubmittingProfile(true);
    try {
      await updateUserProfile({ ...data });
      toast({
        title: 'Perfil actualizado',
        description: 'Tu información de perfil ha sido actualizada.',
      });
    } catch (error) {
      toast({
        title: 'Error al actualizar perfil',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleNotificationsSubmit = async (data: NotificationsFormValues) => {
    setIsSubmittingNotifications(true);
    try {
      const payload: NotificationSettings = {
        maintenance: data.maintenance,
        maintenanceThreshold: data.maintenanceThreshold ?? 0,
        insurance: data.insurance,
        insuranceThreshold: data.insuranceThreshold ?? 0,
        license: data.license,
        licenseThreshold: data.licenseThreshold ?? 0,
      };
      await updateUserProfile({ notificationSettings: payload });
      toast({
        title: 'Preferencias guardadas',
        description: 'Tus preferencias de notificación han sido guardadas.',
      });
    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingNotifications(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    setIsSubmittingPassword(true);
    const toastId = sonnerToast.loading('Actualizando contraseña...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error('No hay un usuario autenticado para realizar esta operación.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      const token = await getSessionToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      const response = await fetch('/api/admin/users/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id, newPassword: data.newPassword }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al actualizar contraseña');

      sonnerToast.success('Contraseña actualizada', {
        id: toastId,
        description: 'Tu contraseña ha sido cambiada exitosamente.',
      });
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      let errorMessage = 'No se pudo cambiar la contraseña. Intenta de nuevo.';
      if (
        error.message.includes('incorrecta') ||
        error.message.includes('Invalid login credentials')
      ) {
        errorMessage = 'La contraseña actual que ingresaste es incorrecta.';
        passwordForm.setError('currentPassword', { type: 'manual', message: errorMessage });
      } else if (error.message.includes('weak') || error.message.includes('Weak password')) {
        errorMessage = 'La nueva contraseña es muy débil. Debe tener al menos 8 caracteres.';
        passwordForm.setError('newPassword', { type: 'manual', message: errorMessage });
      } else if (
        error.message.includes('recent login') ||
        error.message.includes('requires-recent-login')
      ) {
        errorMessage = 'Por seguridad, debes iniciar sesión de nuevo para cambiar tu contraseña.';
      } else {
        errorMessage = error.message;
      }
      sonnerToast.error('Error al cambiar contraseña', {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleNotificationSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      sonnerToast.error('Notificaciones push no soportadas', {
        description: 'Tu navegador no es compatible con esta función.',
      });
      return;
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      sonnerToast.error('Configuración incompleta', {
        description: 'La clave VAPID para notificaciones no está configurada.',
      });
      return;
    }

    const toastId = sonnerToast.loading('Gestionando suscripción...');

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (isSubscribed && existingSubscription) {
        await existingSubscription.unsubscribe();

        const token = await getSessionToken();
        if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
        const response = await fetch('/api/admin/push-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: currentUser!.uid,
            subscription: existingSubscription.toJSON(),
            action: 'unsubscribe',
          }),
        });

        if (!response.ok) throw new Error('Error al cancelar suscripción');

        setIsSubscribed(false);
        sonnerToast.success('Suscripción cancelada', { id: toastId });
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Permiso de notificación denegado.');
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });

        const token = await getSessionToken();
        if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
        const response = await fetch('/api/admin/push-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: currentUser!.uid,
            subscription: subscription.toJSON(),
            action: 'subscribe',
          }),
        });

        if (!response.ok) throw new Error('Error al activar suscripción');

        setIsSubscribed(true);
        sonnerToast.success('Notificaciones activadas', { id: toastId });
      }
    } catch (error) {
      console.error('Error subscribing/unsubscribing:', error);
      sonnerToast.error('Error en la suscripción', {
        id: toastId,
        description: (error as Error).message || 'No se pudo completar la operación.',
      });
    }
  };

  if (authLoading || (loadingData && !currentUser)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  const themeOption =
    'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white [&:has([data-state=checked])]:border-[#d7ff3f]/40 [&:has([data-state=checked])]:bg-[#d7ff3f]/[0.08] [&:has([data-state=checked])]:text-white';

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Administración
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Mi configuración
          </h1>
          <p className="mt-1 text-sm text-white/45">Perfil, apariencia y alertas personales</p>
        </header>

        {currentUser?.role === 'superAdmin' && (
          <>
            <SystemAdminDashboard systemHealthMetrics={systemHealthMetrics} />
            <SystemMaintenanceCard />
          </>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className={sectionClass}>
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                <UserCircle className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Mi perfil</h2>
                <p className="mt-0.5 text-xs text-white/40">Nombre, teléfono y contraseña</p>
              </div>
            </div>

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Nombre completo</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" className={inputClass} {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Teléfono</FormLabel>
                      <FormControl>
                        <Input type="tel" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isSubmittingProfile || authLoading}
                  className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
                >
                  {isSubmittingProfile ? 'Guardando...' : 'Guardar perfil'}
                </Button>
              </form>
            </Form>

            <div className="my-6 h-px bg-white/[0.06]" />

            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <h3 className="flex items-center text-sm font-semibold text-white">
                  <KeyRound className="mr-2 h-4 w-4 text-white/45" strokeWidth={1.75} />
                  Cambiar contraseña
                </h3>
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Contraseña actual</FormLabel>
                      <FormControl>
                        <Input type="password" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Nueva contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" className={inputClass} {...field} />
                      </FormControl>
                      {newPasswordValue && (
                        <div className="mt-2 space-y-1">
                          <div
                            className={`h-1 rounded-full ${
                              newPasswordValue.length >= 12
                                ? 'bg-emerald-400'
                                : newPasswordValue.length >= 8
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                            }`}
                          />
                          <p className="text-xs text-white/40">
                            {newPasswordValue.length >= 12
                              ? 'Contraseña fuerte'
                              : newPasswordValue.length >= 8
                                ? 'Contraseña aceptable'
                                : 'Contraseña débil'}
                          </p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Confirmar nueva contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmittingPassword || authLoading}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                >
                  {isSubmittingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
                </Button>
              </form>
            </Form>
          </section>

          <div className="space-y-4">
            <section className={sectionClass}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                  <Settings2 className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Apariencia</h2>
                  <p className="mt-0.5 text-xs text-white/40">Tema visual de la aplicación</p>
                </div>
              </div>
              <RadioGroup
                value={theme}
                onValueChange={v => setTheme(v as 'light' | 'dark' | 'system')}
                className="grid grid-cols-3 gap-2"
              >
                <Label htmlFor="light" className={themeOption}>
                  <RadioGroupItem value="light" id="light" className="sr-only" />
                  <Sun className="mb-2 h-5 w-5" strokeWidth={1.75} />
                  Claro
                </Label>
                <Label htmlFor="dark" className={themeOption}>
                  <RadioGroupItem value="dark" id="dark" className="sr-only" />
                  <Moon className="mb-2 h-5 w-5" strokeWidth={1.75} />
                  Oscuro
                </Label>
                <Label htmlFor="system" className={themeOption}>
                  <RadioGroupItem value="system" id="system" className="sr-only" />
                  <Settings2 className="mb-2 h-5 w-5" strokeWidth={1.75} />
                  Sistema
                </Label>
              </RadioGroup>
            </section>

            <section className={sectionClass}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                  <Bell className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Notificaciones</h2>
                  <p className="mt-0.5 text-xs text-white/40">Umbrales de alerta y push</p>
                </div>
              </div>
              <Form {...notificationsForm}>
                <form
                  onSubmit={notificationsForm.handleSubmit(handleNotificationsSubmit)}
                  className="space-y-3"
                >
                  <FormField
                    control={notificationsForm.control}
                    name="maintenance"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <div className="flex items-start gap-3">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="min-w-0 flex-1 space-y-2">
                            <FormLabel className="text-sm text-white/85">
                              Mantenimiento próximo
                            </FormLabel>
                            <p className="text-xs text-white/40">Alertas por kilometraje</p>
                            <FormField
                              control={notificationsForm.control}
                              name="maintenanceThreshold"
                              render={({ field: thresholdField }) => (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    className={`${inputClass} h-8 w-24`}
                                    disabled={!field.value}
                                    {...thresholdField}
                                    value={thresholdField.value ?? ''}
                                  />
                                  <span className="text-xs text-white/40">km antes</span>
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={notificationsForm.control}
                    name="insurance"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <div className="flex items-start gap-3">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="min-w-0 flex-1 space-y-2">
                            <FormLabel className="text-sm text-white/85">
                              Vencimiento de seguro
                            </FormLabel>
                            <p className="text-xs text-white/40">Pólizas por vencer</p>
                            <FormField
                              control={notificationsForm.control}
                              name="insuranceThreshold"
                              render={({ field: thresholdField }) => (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    className={`${inputClass} h-8 w-24`}
                                    disabled={!field.value}
                                    {...thresholdField}
                                    value={thresholdField.value ?? ''}
                                  />
                                  <span className="text-xs text-white/40">días antes</span>
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={notificationsForm.control}
                    name="license"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <div className="flex items-start gap-3">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="min-w-0 flex-1 space-y-2">
                            <FormLabel className="text-sm text-white/85">
                              Vencimiento de licencia
                            </FormLabel>
                            <p className="text-xs text-white/40">Licencias de conductor</p>
                            <FormField
                              control={notificationsForm.control}
                              name="licenseThreshold"
                              render={({ field: thresholdField }) => (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    className={`${inputClass} h-8 w-24`}
                                    disabled={!field.value}
                                    {...thresholdField}
                                    value={thresholdField.value ?? ''}
                                  />
                                  <span className="text-xs text-white/40">días antes</span>
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={isSubmittingNotifications}
                      className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
                    >
                      {isSubmittingNotifications ? 'Guardando...' : 'Guardar preferencias'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleNotificationSubscription}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                    >
                      {isSubscribed ? 'Desactivar push' : 'Activar push'}
                    </Button>
                  </div>
                </form>
              </Form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
