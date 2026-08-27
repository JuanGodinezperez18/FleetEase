

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTheme } from "next-themes";
import { useAuth } from '@/contexts/auth-provider';
import { Moon, Sun, Settings2, UserCircle, KeyRound, Bell, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { NotificationSettings, UserProfile } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSystemSettingsAnalytics } from '@/hooks/use-system-settings-analytics';
import { SystemAdminDashboard } from './components/system-admin-dashboard';
import { useData } from '@/hooks/use-data';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos.").optional().or(z.literal('')),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es obligatoria."),
  newPassword: z.string().min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
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

const MOCK_ADMIN_PASS = "password123";

const SystemMaintenanceCard = () => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        const toastId = sonnerToast.loading("Sincronizando permisos de usuario...");
        try {
            const response = await fetch('/api/admin/sync-claims', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error en sincronización');
            
            if (data.success) {
                sonnerToast.success("Sincronización Exitosa", { id: toastId, description: data.message + " Por favor, cierra sesión y vuelve a iniciarla para aplicar los cambios." });
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("Error syncing claims:", error);
            const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
            sonnerToast.error("Error de Sincronización", { id: toastId, description: errorMessage });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5"/> Mantenimiento del Sistema</CardTitle>
                <CardDescription>Ejecuta acciones de mantenimiento para asegurar la integridad de los datos y permisos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col space-y-4">
                    <div>
                        <h4 className="font-semibold">Sincronizar Permisos de Usuario</h4>
                        <p className="text-sm text-muted-foreground">
                           Esta acción fuerza la actualización de los roles y permisos (claims) de todos los usuarios en el sistema, basándose en los datos de la base de datos de Firestore. Útil si los usuarios no pueden acceder después de un cambio de rol o si los permisos parecen incorrectos.
                        </p>
                    </div>
                    <Button onClick={handleSync} disabled={isSyncing}>
                        {isSyncing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Permisos'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// VAPID public key
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "YOUR_VAPID_PUBLIC_KEY_HERE";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, updateUserProfile,  loading: authLoading } = useAuth();
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
    }
  });
  
  const newPasswordValue = passwordForm.watch('newPassword');

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '',
      });
      notificationsForm.reset(currentUser.notificationSettings || {
        maintenance: true, maintenanceThreshold: 1500,
        insurance: true, insuranceThreshold: 30,
        license: true, licenseThreshold: 30,
      });
    }
  }, [currentUser, profileForm, notificationsForm]);

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    setIsSubmittingProfile(true);
    try {
      await updateUserProfile({ ...data });
      toast({ title: 'Perfil Actualizado', description: 'Tu información de perfil ha sido actualizada.' });
    } catch (error) {
      toast({ title: 'Error al Actualizar Perfil', description: (error as Error).message, variant: 'destructive' });
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
      toast({ title: 'Preferencias Guardadas', description: 'Tus preferencias de notificación han sido guardadas.' });
    } catch (error) {
       toast({ title: 'Error al Guardar', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmittingNotifications(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    setIsSubmittingPassword(true);
    const toastId = sonnerToast.loading('Actualizando contraseña...');
    
    try {
      // Obtener usuario actual de Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error('No hay un usuario autenticado para realizar esta operación.');
      }
      
      // Verificar contraseña actual intentando hacer login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });
      
      if (signInError) {
        throw new Error('La contraseña actual es incorrecta.');
      }
      
      // Actualizar contraseña via API admin
      const response = await fetch('/api/admin/users/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        let errorMessage = "No se pudo cambiar la contraseña. Intenta de nuevo.";
        if (error.message.includes('incorrecta') || error.message.includes('Invalid login credentials')) {
            errorMessage = "La contraseña actual que ingresaste es incorrecta.";
            passwordForm.setError("currentPassword", { type: "manual", message: errorMessage });
        } else if (error.message.includes('weak') || error.message.includes('Weak password')) {
            errorMessage = "La nueva contraseña es muy débil. Debe tener al menos 8 caracteres.";
            passwordForm.setError("newPassword", { type: "manual", message: errorMessage });
        } else if (error.message.includes('recent login') || error.message.includes('requires-recent-login')) {
            errorMessage = "Por seguridad, debes iniciar sesión de nuevo para cambiar tu contraseña.";
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
      sonnerToast.error("Notificaciones Push no soportadas", {
        description: "Tu navegador no es compatible con esta función.",
      });
      return;
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      sonnerToast.error("Configuración incompleta", {
        description: "La clave VAPID para notificaciones no está configurada.",
      });
      return;
    }

    const toastId = sonnerToast.loading("Gestionando suscripción...");

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (isSubscribed && existingSubscription) {
        // Unsubscribe
        await existingSubscription.unsubscribe();
        
        const response = await fetch('/api/admin/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: currentUser!.uid, 
            subscription: existingSubscription.toJSON(),
            action: 'unsubscribe' 
          }),
        });
        
        if (!response.ok) throw new Error('Error al cancelar suscripción');
        
        setIsSubscribed(false);
        sonnerToast.success("Suscripción cancelada", { id: toastId });
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Permiso de notificación denegado.');
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });

        const response = await fetch('/api/admin/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: currentUser!.uid, 
            subscription: subscription.toJSON(),
            action: 'subscribe' 
          }),
        });
        
        if (!response.ok) throw new Error('Error al activar suscripción');

        setIsSubscribed(true);
        sonnerToast.success("Notificaciones activadas", { id: toastId });
      }
    } catch (error) {
      console.error('Error subscribing/unsubscribing:', error);
      sonnerToast.error("Error en la suscripción", {
        id: toastId,
        description: (error as Error).message || "No se pudo completar la operación."
      });
    }
  };

  return (
    <div className="space-y-6">
        {currentUser?.role === 'superAdmin' && (
          <>
            <SystemAdminDashboard systemHealthMetrics={systemHealthMetrics} />
            <Separator />
            <SystemMaintenanceCard />
            <Separator />
          </>
        )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="lg:col-span-1 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center"><UserCircle className="mr-2 h-5 w-5" /> Mi Perfil</CardTitle>
            <CardDescription>Administra tu información personal y contraseña.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <FormField control={profileForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={profileForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={profileForm.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Número de Teléfono</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" disabled={isSubmittingProfile || authLoading}>{isSubmittingProfile ? 'Guardando...' : 'Guardar Perfil'}</Button>
                </form>
            </Form>
            <Separator />
            <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center"><KeyRound className="mr-2 h-5 w-5"/> Cambiar Contraseña</h3>
                  <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                    <FormItem><FormLabel>Contraseña Actual</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nueva Contraseña</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        {newPasswordValue && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className={`h-1 flex-1 rounded ${
                                newPasswordValue.length >= 12 ? 'bg-green-500' :
                                newPasswordValue.length >= 8 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {newPasswordValue.length >= 12 ? '✓ Contraseña fuerte' :
                               newPasswordValue.length >= 8 ? '⚠ Contraseña aceptable' :
                               '✗ Contraseña débil'}
                            </p>
                          </div>
                        )}
                        <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Confirmar Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" variant="outline" disabled={isSubmittingPassword || authLoading}>{isSubmittingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}</Button>
                </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-1 xl:col-span-1">
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5" /> Apariencia</CardTitle>
                  <CardDescription>Personaliza el tema visual de la aplicación.</CardDescription>
              </CardHeader>
              <CardContent>
                  <RadioGroup value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="light" id="light" className="sr-only" /><Sun className="mb-3 h-6 w-6" /> Claro</Label>
                      <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="dark" id="dark" className="sr-only" /><Moon className="mb-3 h-6 w-6" /> Oscuro</Label>
                      <Label htmlFor="system" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="system" id="system" className="sr-only" /><Settings2 className="mb-3 h-6 w-6" /> Sistema</Label>
                  </RadioGroup>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> Notificaciones</CardTitle>
                  <CardDescription>Gestiona tus preferencias de notificación.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationsForm}>
                    <form onSubmit={notificationsForm.handleSubmit(handleNotificationsSubmit)} className="space-y-6">
                        <FormField
                            control={notificationsForm.control}
                            name="maintenance"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Mantenimiento Próximo</FormLabel>
                                        <p className="text-sm text-muted-foreground">Alertas por kilometraje para servicios.</p>
                                        <FormField
                                          control={notificationsForm.control}
                                          name="maintenanceThreshold"
                                          render={({ field: thresholdField }) => (
                                            <div className="flex items-center pt-2">
                                              <Input 
                                                type="number" 
                                                className="h-8 w-24 mr-2"
                                                disabled={!field.value}
                                                {...thresholdField} 
                                                value={thresholdField.value ?? ''}
                                              />
                                              <span className="text-sm text-muted-foreground">km antes</span>
                                            </div>
                                          )}
                                        />
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={notificationsForm.control}
                            name="insurance"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Vencimiento de Seguro</FormLabel>
                                        <p className="text-sm text-muted-foreground">Alertas de pólizas por vencer.</p>
                                        <FormField
                                          control={notificationsForm.control}
                                          name="insuranceThreshold"
                                          render={({ field: thresholdField }) => (
                                            <div className="flex items-center pt-2">
                                              <Input 
                                                type="number" 
                                                className="h-8 w-24 mr-2"
                                                disabled={!field.value}
                                                {...thresholdField}
                                                value={thresholdField.value ?? ''}
                                              />
                                              <span className="text-sm text-muted-foreground">días antes</span>
                                            </div>
                                          )}
                                        />
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={notificationsForm.control}
                            name="license"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Vencimiento de Licencia</FormLabel>
                                        <p className="text-sm text-muted-foreground">Alertas de licencias de conductor por vencer.</p>
                                        <FormField
                                          control={notificationsForm.control}
                                          name="licenseThreshold"
                                          render={({ field: thresholdField }) => (
                                            <div className="flex items-center pt-2">
                                              <Input 
                                                type="number" 
                                                className="h-8 w-24 mr-2"
                                                disabled={!field.value}
                                                {...thresholdField} 
                                                value={thresholdField.value ?? ''}
                                              />
                                              <span className="text-sm text-muted-foreground">días antes</span>
                                            </div>
                                          )}
                                        />
                                    </div>
                                </FormItem>
                            )}
                        />
                        <div className="flex flex-col gap-4">
                            <Button type="submit" disabled={isSubmittingNotifications}>{isSubmittingNotifications ? "Guardando..." : "Guardar Preferencias"}</Button>
                            <Button type="button" variant="outline" onClick={handleNotificationSubscription}>
                                {isSubscribed ? 'Desactivar Notificaciones Push' : 'Activar Notificaciones Push'}
                            </Button>
                        </div>
                    </form>
                </Form>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
