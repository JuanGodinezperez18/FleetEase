"use client";

import { useActionState, useOptimistic, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// React 19 Server Action type
type LoginState = {
  error?: string;
  success?: boolean;
  message?: string;
};

// Simulación de acción del servidor (en producción, esto sería una Server Action)
async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Validación básica
  if (!email || !password) {
    return {
      error: 'Por favor completa todos los campos',
      success: false,
    };
  }

  if (!email.includes('@')) {
    return {
      error: 'Por favor ingresa un correo válido',
      success: false,
    };
  }

  if (password.length < 6) {
    return {
      error: 'La contraseña debe tener al menos 6 caracteres',
      success: false,
    };
  }

  // Simulación de credenciales correctas
  if (email === 'demo@fleetease.com' && password === 'demo123') {
    return {
      success: true,
      message: '¡Inicio de sesión exitoso! Redirigiendo...',
    };
  }

  return {
    error: 'Credenciales incorrectas',
    success: false,
  };
}

/**
 * ModernLoginForm - Ejemplo de formulario con React 19 Actions
 *
 * Características nuevas de React 19:
 * - useActionState: Manejo de estado de acciones asíncronas
 * - useOptimistic: Updates optimistas para mejor UX
 * - form action: Soporte nativo para acciones en formularios
 * - Transiciones automáticas para estados de carga
 */
export function ModernLoginForm() {
  // React 19: useActionState reemplaza el patrón useState + async/await
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    { success: false }
  );

  // React 19: useOptimistic para updates optimistas
  const [optimisticState, addOptimistic] = useOptimistic(
    state,
    (currentState, optimisticValue: LoginState) => {
      return { ...currentState, ...optimisticValue };
    }
  );

  // Handler mejorado con transiciones
  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      addOptimistic({ success: false, message: 'Validando credenciales...' });
      formAction(formData);
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-8 border border-slate-200 dark:border-slate-800"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            React 19 Login Demo
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Con useActionState y useOptimistic
          </p>
        </div>

        {/* React 19: form con action nativo */}
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="demo@fleetease.com"
                defaultValue="demo@fleetease.com"
                disabled={isPending}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="demo123"
                defaultValue="demo123"
                disabled={isPending}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Estado optimista con animación */}
          <AnimatePresence mode="wait">
            {(optimisticState.error || optimisticState.message) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  optimisticState.error
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                    : 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900'
                }`}
              >
                {optimisticState.error ? (
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{optimisticState.error || optimisticState.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botón con estado de pending automático */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </Button>
        </form>

        {/* Información de demo */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
            💡 Credenciales de demo:
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Email: demo@fleetease.com
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Password: demo123
          </p>
        </div>

        {/* Características de React 19 */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            ✨ Características de React 19:
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li>✓ useActionState para manejo de estado de formularios</li>
            <li>✓ useOptimistic para updates optimistas</li>
            <li>✓ form action nativo sin JavaScript extra</li>
            <li>✓ isPending automático sin necesidad de useState</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
