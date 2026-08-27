/**
 * @fileoverview Log de auditoría con Supabase
 *
 * Registra acciones de administración en la tabla `audit_logs`.
 */

import { supabase } from '@/lib/supabase';

export const logAudit = async (
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  entityName?: string,
  changes: Record<string, any> = {}
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // No registrar si no hay usuario (ej. operaciones de sistema)
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, name')
      .eq('id', user.id)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName ?? null,
      user_id: user.id,
      user_name: profile?.name ?? null,
      timestamp: new Date().toISOString(),
      changes,
      company_id: profile?.company_id ?? null,
    });
  } catch (err) {
    console.warn('Failed to log audit:', err);
  }
};
