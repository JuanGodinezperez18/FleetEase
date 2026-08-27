
"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { UserProfile, UserRole } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { FormModal } from '@/components/common/form-modal';
import { UserForm, type UserFormValues } from './components/user-form';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { useUserAnalytics, type UserMetric } from '@/hooks/use-user-analytics';
import { UserAdminDashboard } from './components/user-admin-dashboard';
import { UserAdvancedFilters } from './components/user-advanced-filters';
import { useUserSearch } from './components/user-search';
import { toast as sonnerToast } from 'sonner';
import { getColumns } from './columns';
import type { ColumnDef } from '@tanstack/react-table';
import { canAddUser, getUserLimitMessage, type PlanType } from '@/config/plans';
import { supabase } from '@/lib/supabase';


export type UserWithMetrics = UserProfile & Partial<UserMetric>;

const roleTranslations: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador (Socio)',
  superAdmin: 'Super Admin',
  partner: 'Socio',
  client: 'Cliente'
};

const UserMobileCard = ({ user, onEdit, onDelete }: { user: UserWithMetrics, onEdit: (u: UserProfile) => void, onDelete: (u: UserProfile) => void }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h3 className="font-medium">{user.name}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>📧 {user.email}</p>
          <div><strong>Rol:</strong> <Badge variant={user.role === 'admin' || user.role === 'superAdmin' ? 'default' : 'secondary'}>{roleTranslations[user.role] || user.role}</Badge></div>
          <div><strong>Estado:</strong> {user.isDeleted ? <Badge variant="destructive">Eliminado</Badge> : <Badge variant="default" className="bg-green-500">Activo</Badge>}</div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(user)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href={`/dashboard/users/${user.uid}`}><Eye className="mr-2 h-4 w-4" />Ver Perfil</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDelete(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </Card>
);

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
    totalResults
  } = useUserSearch(usersWithMetrics);

  const handleOpenModal = useCallback((user?: UserProfile) => {
    if (user && user.uid === authCurrentUser?.uid) {
        toast({title: "Editar Perfil", description: "Para editar tu propio perfil, ve a Configuración > Mi Cuenta.", duration: 5000});
        return;
    }
    const fullUser = user ? users.find(u => u.uid === user.uid) : null;
    setEditingUser(fullUser || null);
    setIsModalOpen(true);
  }, [authCurrentUser?.uid, toast, users]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    // Primero cerrar el modal
    setIsModalOpen(false);
    // Resetear el estado DESPUÉS de que la animación de cierre termine
    setTimeout(() => {
      setEditingUser(null);
    }, 300);
  }, [isSubmitting]);
  
  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    const toastId = sonnerToast.loading(editingUser ? 'Actualizando usuario...' : 'Creando usuario...');
    
    try {
      if (editingUser) {
        const response = await fetch('/api/admin/users/update-claims', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingUser.uid,
            role: data.role,
            companyId: data.role === 'superAdmin' ? null : (data.companyId || authCurrentUser?.companyId),
            partnerAccess: data.role === 'viewer' ? data.partnerAccess || [] : [],
          }),
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al actualizar');
        
        sonnerToast.success('Usuario Actualizado', { id: toastId, description: `${data.name} ha sido actualizado.` });
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

        // Validar límite de usuarios según el plan
        if (companies && companies.length > 0) {
            const company = companies[0];
            const plan = (company.plan as PlanType) || 'starter';
            const currentUsersCount = users.filter(u => !u.isDeleted && u.role !== 'superAdmin').length;
            
            if (!canAddUser(plan, currentUsersCount)) {
                const limitMessage = getUserLimitMessage(plan, currentUsersCount);
                throw new Error(limitMessage);
            }
        }

        const response = await fetch('/api/admin/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
            phone: data.phone,
            role: data.role,
            companyId: data.role === 'superAdmin' ? null : (data.companyId || authCurrentUser?.companyId),
            partnerAccess: data.role === 'viewer' ? data.partnerAccess || [] : [],
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Falló la creación del usuario.');

        sonnerToast.success('Usuario Creado', {
            id: toastId,
            description: result.message || `${data.name} ha sido creado.`,
        });
      }
      
      handleCloseModal();
    } catch (error: unknown) {
      console.error("Error saving user:", error);
      const errorMessage = (error as any).message || 'Ocurrió un error inesperado.';
      sonnerToast.error('Error al Guardar', { id: toastId, description: errorMessage });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = useCallback((user: UserProfile) => {
    if (user.uid === authCurrentUser?.uid) {
      toast({ title: "Acción no permitida", description: "No puedes eliminar tu propia cuenta.", variant: "destructive" });
      return;
    }
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  }, [authCurrentUser?.uid, toast]);

  const handleCloseDeleteDialog = useCallback(() => {
      if (isSubmitting) return;
      setIsDeleteDialogOpen(false);
      setTimeout(() => {
          setUserToDelete(null);
      }, 300);
  }, [isSubmitting]);

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      setIsSubmitting(true);
      const toastId = sonnerToast.loading("Desactivando usuario...");
      try {
        const response = await fetch('/api/admin/users/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userToDelete.uid }),
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al desactivar');
        
        toast({ title: "Usuario Desactivado", description: `${userToDelete.name} ha sido marcado como eliminado y su acceso ha sido bloqueado.` });
        handleCloseDeleteDialog();
      } catch (error: any) {
        console.error("Error deactivating user:", error);
        toast({ title: "Error al desactivar", description: error.message || "No se pudo desactivar el usuario.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResendInvitation = async (user: UserProfile) => {
    const toastId = sonnerToast.loading('Enviando email de bienvenida...');
    try {
      const response = await fetch('/api/admin/users/resend-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al enviar email');
      
      sonnerToast.success('Email enviado', {
        id: toastId,
        description: `Se envió un email de bienvenida a ${user.email}`
      });
    } catch (error) {
      console.error('Error sending email:', error);
      sonnerToast.error('Error', {
        id: toastId,
        description: 'No se pudo enviar el email'
      });
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    const confirmed = window.confirm(`¿Enviar link de restablecimiento de contraseña a ${user.email}?`);
    if (!confirmed) return;

    const toastId = sonnerToast.loading('Enviando link...');
    try {
      const response = await fetch('/api/admin/users/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al enviar link');
      
      sonnerToast.success('Link enviado', {
        id: toastId,
        description: `Se envió un link de restablecimiento a ${user.email}`
      });
    } catch (error) {
      console.error('Error sending reset link:', error);
      sonnerToast.error('Error', {
        id: toastId,
        description: 'No se pudo enviar el link de restablecimiento'
      });
    }
  };
  
  const handleExportUsers = () => {
    const dataToExport = filteredUsers.map(u => ({
      'Nombre': u.name,
      'Email': u.email,
      'Teléfono': u.phone || 'N/A',
      'Rol': roleTranslations[u.role] || u.role,
      'Empresa': companies.find(c => c.id === u.companyId)?.name || 'N/A',
      'Nivel de Actividad': u.activityLevel || 'N/A',
      'Estado': u.isDeleted ? 'Eliminado' : 'Activo',
      'Fecha de Creación': u.createdAt ? format(new Date(u.createdAt), 'dd/MM/yyyy') : 'N/A',
    }));
  
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, `usuarios_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  
    sonnerToast.success('Usuarios exportados a Excel.');
  };
  
  const columns: ColumnDef<UserWithMetrics>[] = useMemo(() => getColumns(handleOpenModal, handleDeleteRequest, handleResendInvitation, handleResetPassword), [handleOpenModal, handleDeleteRequest]);
  
  if (loadingData && !users.length) {
    return <p>Cargando usuarios...</p>;
  }
  
  return (
    <div className="space-y-6">
      <UserAdminDashboard users={users} userMetrics={userMetrics} />
      
      <UserAdvancedFilters 
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        onSearch={debouncedSetQuery}
        totalResults={totalResults}
        companies={companies}
        isLoading={loadingData}
      />

      <Card>
        <CardHeader>
           <div className="flex justify-between items-center mb-4">
            <div>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Administra los usuarios y sus permisos en el sistema.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportUsers} disabled={filteredUsers.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
                <Button onClick={() => handleOpenModal()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Usuario
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={columns}
            data={filteredUsers}
            loading={loadingData}
            searchPlaceholder="Buscar por nombre, correo, rol..."
            noResultsText="No se encontraron usuarios."
            mobileCardRenderer={(user) => (
              <UserMobileCard 
                user={user}
                onEdit={handleOpenModal}
                onDelete={handleDeleteRequest}
              />
            )}
          />
        </CardContent>
      </Card>
      
      <FormModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={editingUser ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}
            description={editingUser ? `Actualizar detalles de ${editingUser.name}.` : 'Completa el formulario para añadir un nuevo usuario.'}
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
