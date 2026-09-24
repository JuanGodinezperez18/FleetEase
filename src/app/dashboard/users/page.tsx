"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useData } from '@/hooks/use-data';
import type { UserProfile, UserRole } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { FormModal } from '@/components/common/form-modal';
import { UserForm, type UserFormValues } from './components/user-form';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserAnalytics, type UserMetric } from '@/hooks/use-user-analytics';
import { UserAdminDashboard } from './components/user-admin-dashboard';
import { useUserSearch } from './components/user-search';
import { toast as sonnerToast } from 'sonner';
import { getColumns } from './columns';
import type { ColumnDef } from '@tanstack/react-table';
import { canAddUser, getUserLimitMessage, type PlanType } from '@/config/plans';
import { getSessionToken } from '@/lib/auth';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  PlusCircle,
  Loader2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export type UserWithMetrics = UserProfile & Partial<UserMetric>;

const roleTranslations: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador (Socio)',
  superAdmin: 'Super Admin',
  partner: 'Socio',
  client: 'Cliente',
};

const ROLE_STYLES: Record<string, string> = {
  superAdmin: 'border-[#d7ff3f]/25 bg-[#d7ff3f]/10 text-[#d7ff3f]',
  admin: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  editor: 'border-white/10 bg-white/[0.06] text-white/70',
  viewer: 'border-white/10 bg-white/[0.06] text-white/55',
  partner: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  client: 'border-white/10 bg-white/[0.06] text-white/50',
};

function UserMobileCard({
  user,
  onEdit,
  onDelete,
}: {
  user: UserWithMetrics;
  onEdit: (u: UserProfile) => void;
  onDelete: (u: UserProfile) => void;
}) {
  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.viewer;

  return (
    <article className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.2)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
          <Users className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-base font-semibold text-white">{user.name}</h3>
              <p className="mt-0.5 truncate text-xs text-white/45">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleStyle}`}>
                  {roleTranslations[user.role] || user.role}
                </span>
                {user.isDeleted ? (
                  <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    Eliminado
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Activo
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem onSelect={() => onEdit(user)}>
                  <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/users/${user.uid}`}>
                    <Eye className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                    Ver perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(user)}
                  className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300"
                >
                  <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function UsersPage() {
  const { users, companies, partners, loadingData, financialRecords, clients, vehicles } = useData();
  const { currentUser: authCurrentUser } = useAuth();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { userMetrics } = useUserAnalytics(users, financialRecords, clients, vehicles);

  const usersWithMetrics: UserWithMetrics[] = useMemo(() => {
    const metricsMap = new Map(userMetrics.map(m => [m.userId, m]));
    return users.map(user => ({
      ...user,
      ...metricsMap.get(user.uid),
    }));
  }, [users, userMetrics]);

  const {
    filters,
    filteredUsers,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults,
  } = useUserSearch(usersWithMetrics);

  const handleOpenModal = useCallback(
    (user?: UserProfile) => {
      if (user && user.uid === authCurrentUser?.uid) {
        toast({
          title: 'Editar perfil',
          description: 'Para editar tu propio perfil, ve a Configuración.',
          duration: 5000,
        });
        return;
      }
      const fullUser = user ? users.find(u => u.uid === user.uid) : null;
      setEditingUser(fullUser || null);
      setIsModalOpen(true);
    },
    [authCurrentUser?.uid, toast, users]
  );

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setTimeout(() => setEditingUser(null), 300);
  }, [isSubmitting]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    const toastId = sonnerToast.loading(editingUser ? 'Actualizando usuario...' : 'Creando usuario...');

    try {
      if (editingUser) {
        const token = await getSessionToken();
        if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
        const response = await fetch('/api/admin/users/update-claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: editingUser.uid,
            role: data.role,
            companyId: data.role === 'superAdmin' ? null : data.companyId || authCurrentUser?.companyId,
            partnerAccess: data.role === 'viewer' ? data.partnerAccess || [] : [],
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al actualizar');

        sonnerToast.success('Usuario actualizado', {
          id: toastId,
          description: `${data.name} ha sido actualizado.`,
        });
      } else {
        const emailExists = users.some(
          u => u.email.toLowerCase() === data.email.toLowerCase() && !u.isDeleted
        );

        if (emailExists) {
          throw new Error('Ya existe un usuario con este correo electrónico.');
        }

        if (authCurrentUser?.role !== 'superAdmin' && data.role === 'superAdmin') {
          throw new Error('No tienes permisos para crear usuarios SuperAdmin.');
        }

        if (authCurrentUser?.role === 'editor' && ['admin', 'superAdmin'].includes(data.role)) {
          throw new Error('No tienes permisos para crear usuarios con este rol.');
        }

        if (companies && companies.length > 0) {
          const company = companies[0];
          const plan = (company.plan as PlanType) || 'starter';
          const currentUsersCount = users.filter(u => !u.isDeleted && u.role !== 'superAdmin').length;

          if (!canAddUser(plan, currentUsersCount)) {
            throw new Error(getUserLimitMessage(plan, currentUsersCount));
          }
        }

        const token = await getSessionToken();
        if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
        const response = await fetch('/api/admin/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
            phone: data.phone,
            role: data.role,
            companyId: data.role === 'superAdmin' ? null : data.companyId || authCurrentUser?.companyId,
            partnerAccess: data.role === 'viewer' ? data.partnerAccess || [] : [],
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Falló la creación del usuario.');

        sonnerToast.success('Usuario creado', {
          id: toastId,
          description: result.message || `${data.name} ha sido creado.`,
        });
      }

      handleCloseModal();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      const errorMessage = (error as Error).message || 'Ocurrió un error inesperado.';
      sonnerToast.error('Error al guardar', { id: toastId, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = useCallback(
    (user: UserProfile) => {
      if (user.uid === authCurrentUser?.uid) {
        toast({
          title: 'Acción no permitida',
          description: 'No puedes eliminar tu propia cuenta.',
          variant: 'destructive',
        });
        return;
      }
      setUserToDelete(user);
      setIsDeleteDialogOpen(true);
    },
    [authCurrentUser?.uid, toast]
  );

  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setTimeout(() => setUserToDelete(null), 300);
  }, [isSubmitting]);

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    const toastId = sonnerToast.loading('Desactivando usuario...');
    try {
      const token = await getSessionToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: userToDelete.uid }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al desactivar');

      toast({
        title: 'Usuario desactivado',
        description: `${userToDelete.name} ha sido marcado como eliminado y su acceso bloqueado.`,
      });
      handleCloseDeleteDialog();
      sonnerToast.dismiss(toastId);
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      toast({
        title: 'Error al desactivar',
        description: error.message || 'No se pudo desactivar el usuario.',
        variant: 'destructive',
      });
      sonnerToast.dismiss(toastId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (user: UserProfile) => {
    const toastId = sonnerToast.loading('Enviando email de bienvenida...');
    try {
      const token = await getSessionToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      const response = await fetch('/api/admin/users/resend-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al enviar email');

      sonnerToast.success('Email enviado', {
        id: toastId,
        description: `Se envió un email de bienvenida a ${user.email}`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      sonnerToast.error('Error', {
        id: toastId,
        description: 'No se pudo enviar el email',
      });
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    const confirmed = window.confirm(
      `¿Enviar link de restablecimiento de contraseña a ${user.email}?`
    );
    if (!confirmed) return;

    const toastId = sonnerToast.loading('Enviando link...');
    try {
      const token = await getSessionToken();
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      const response = await fetch('/api/admin/users/send-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: user.email }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al enviar link');

      sonnerToast.success('Link enviado', {
        id: toastId,
        description: `Se envió un link de restablecimiento a ${user.email}`,
      });
    } catch (error) {
      console.error('Error sending reset link:', error);
      sonnerToast.error('Error', {
        id: toastId,
        description: 'No se pudo enviar el link de restablecimiento',
      });
    }
  };

  const handleExportUsers = () => {
    const dataToExport = filteredUsers.map(u => ({
      Nombre: u.name,
      Email: u.email,
      Teléfono: u.phone || 'N/A',
      Rol: roleTranslations[u.role] || u.role,
      Empresa: companies.find(c => c.id === u.companyId)?.name || 'N/A',
      'Nivel de Actividad': u.activityLevel || 'N/A',
      Estado: u.isDeleted ? 'Eliminado' : 'Activo',
      'Fecha de Creación': u.createdAt ? format(new Date(u.createdAt), 'dd/MM/yyyy') : 'N/A',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, `usuarios_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    sonnerToast.success('Usuarios exportados a Excel.');
  };

  const columns: ColumnDef<UserWithMetrics>[] = useMemo(
    () =>
      getColumns(handleOpenModal, handleDeleteRequest, handleResendInvitation, handleResetPassword),
    [handleOpenModal, handleDeleteRequest]
  );

  if (loadingData && !users.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Administración
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Usuarios
            </h1>
            <p className="mt-1 text-sm text-white/45">Gestiona cuentas, roles y permisos del sistema</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExportUsers}
              disabled={filteredUsers.length === 0}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Download className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Exportar
            </Button>
            <Button
              onClick={() => handleOpenModal()}
              className="h-10 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Agregar usuario
            </Button>
          </div>
        </header>

        <UserAdminDashboard users={users} userMetrics={userMetrics} />

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-3 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5">
          <ResponsiveTable
            columns={columns}
            data={filteredUsers}
            loading={loadingData}
            searchPlaceholder="Buscar por nombre, correo, rol..."
            noResultsText="No se encontraron usuarios."
            mobileCardRenderer={user => (
              <UserMobileCard user={user} onEdit={handleOpenModal} onDelete={handleDeleteRequest} />
            )}
          />
        </section>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Editar usuario' : 'Agregar usuario'}
        description={
          editingUser
            ? `Actualizar detalles de ${editingUser.name}.`
            : 'Completa el formulario para añadir un nuevo usuario.'
        }
      >
        <UserForm
          key={editingUser?.uid || 'new-user'}
          onSubmit={handleSubmit}
          initialData={editingUser}
          currentUserRole={authCurrentUser?.role || 'viewer'}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
        />
      </FormModal>

      {userToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDeleteConfirm}
          itemName={`${userToDelete.name}`}
          titleText="¿Confirmar desactivación de usuario?"
          descriptionText={`Esta acción marcará al usuario ${userToDelete.name} como eliminado y deshabilitará su acceso. ¿Continuar?`}
          confirmText="Desactivar"
          isDeleting={isSubmitting}
        />
      )}
    </div>
  );
}
