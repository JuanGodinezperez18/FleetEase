/**
 * @fileoverview Cliente y tipos generados de Supabase.
 *
 * Los tipos de Database se generan directamente desde el esquema real de
 * Supabase. No agregar tablas, columnas o RPC manualmente aquí.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ [Supabase] Variables de entorno no configuradas.');
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          original_amount: number
          party_id: string
          party_type: string
          source_financial_record_id: string | null
          status: string
          supplier_purchase_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          original_amount: number
          party_id: string
          party_type: string
          source_financial_record_id?: string | null
          status?: string
          supplier_purchase_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          original_amount?: number
          party_id?: string
          party_type?: string
          source_financial_record_id?: string | null
          status?: string
          supplier_purchase_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_source_financial_record_id_fkey"
            columns: ["source_financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_purchase_id_fkey"
            columns: ["supplier_purchase_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          changes: Json | null
          company_id: string | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          timestamp: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          changes?: Json | null
          company_id?: string | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          timestamp?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          changes?: Json | null
          company_id?: string | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          timestamp?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          brand: string | null
          category_id: string | null
          company_id: string
          compatibility: string | null
          created_at: string
          default_cost: number | null
          default_supplier_id: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          notes: string | null
          part_number: string | null
          unit: string
          updated_at: string
          warranty_days: number | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          company_id: string
          compatibility?: string | null
          created_at?: string
          default_cost?: number | null
          default_supplier_id?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          notes?: string | null
          part_number?: string | null
          unit?: string
          updated_at?: string
          warranty_days?: number | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          company_id?: string
          compatibility?: string | null
          created_at?: string
          default_cost?: number | null
          default_supplier_id?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          notes?: string | null
          part_number?: string | null
          unit?: string
          updated_at?: string
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_change_logs: {
        Row: {
          change_type: Database["public"]["Enums"]["client_change_type"]
          changed_at: string
          changed_by: string
          changed_by_name: string
          client_id: string
          description: string
          field_changed: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          change_type: Database["public"]["Enums"]["client_change_type"]
          changed_at?: string
          changed_by: string
          changed_by_name: string
          client_id: string
          description: string
          field_changed?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          change_type?: Database["public"]["Enums"]["client_change_type"]
          changed_at?: string
          changed_by?: string
          changed_by_name?: string
          client_id?: string
          description?: string
          field_changed?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "client_change_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_write_offs: {
        Row: {
          amount: number
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          financial_record_id: string
          id: string
          reason: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
        }
        Insert: {
          amount: number
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          financial_record_id: string
          id?: string
          reason: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          financial_record_id?: string
          id?: string
          reason?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_write_offs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_write_offs_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active_credit_id: string | null
          assigned_vehicle_id: string | null
          balance: number
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          email: string | null
          firstname: string
          has_active_credit: boolean | null
          id: string
          ine_url: string | null
          initial_balance: number
          is_deleted: boolean
          lastname: string
          license_expiry: string
          license_image_url: string | null
          license_number: string
          license_status: Database["public"]["Enums"]["license_status"]
          payment_behavior: string | null
          phone: string
          photo_url: string | null
          reference_code: string | null
          security_deposit: number
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          street: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_assigned_at: string | null
          write_off_reason: string | null
          written_off_amount: number
          written_off_at: string | null
          written_off_by: string | null
          zip_code: string | null
        }
        Insert: {
          active_credit_id?: string | null
          assigned_vehicle_id?: string | null
          balance?: number
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          firstname: string
          has_active_credit?: boolean | null
          id?: string
          ine_url?: string | null
          initial_balance?: number
          is_deleted?: boolean
          lastname: string
          license_expiry: string
          license_image_url?: string | null
          license_number: string
          license_status?: Database["public"]["Enums"]["license_status"]
          payment_behavior?: string | null
          phone: string
          photo_url?: string | null
          reference_code?: string | null
          security_deposit?: number
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_assigned_at?: string | null
          write_off_reason?: string | null
          written_off_amount?: number
          written_off_at?: string | null
          written_off_by?: string | null
          zip_code?: string | null
        }
        Update: {
          active_credit_id?: string | null
          assigned_vehicle_id?: string | null
          balance?: number
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          firstname?: string
          has_active_credit?: boolean | null
          id?: string
          ine_url?: string | null
          initial_balance?: number
          is_deleted?: boolean
          lastname?: string
          license_expiry?: string
          license_image_url?: string | null
          license_number?: string
          license_status?: Database["public"]["Enums"]["license_status"]
          payment_behavior?: string | null
          phone?: string
          photo_url?: string | null
          reference_code?: string | null
          security_deposit?: number
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_assigned_at?: string | null
          write_off_reason?: string | null
          written_off_amount?: number
          written_off_at?: string | null
          written_off_by?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_active_credit"
            columns: ["active_credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          contract_template_url: string | null
          country: string | null
          created_at: string
          default_rental_days: number | null
          email: string | null
          email_notifications: boolean | null
          grace_period_days: number | null
          id: string
          is_deleted: boolean
          late_payment_fee: number | null
          logo_url: string | null
          maintenance_interval: number | null
          max_users: number | null
          max_vehicles: number | null
          name: string
          phone: string | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          state: string | null
          street: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          vehicle_limit: number | null
          whatsapp_notifications: boolean | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          contract_template_url?: string | null
          country?: string | null
          created_at?: string
          default_rental_days?: number | null
          email?: string | null
          email_notifications?: boolean | null
          grace_period_days?: number | null
          id?: string
          is_deleted?: boolean
          late_payment_fee?: number | null
          logo_url?: string | null
          maintenance_interval?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          name: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          state?: string | null
          street?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vehicle_limit?: number | null
          whatsapp_notifications?: boolean | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          contract_template_url?: string | null
          country?: string | null
          created_at?: string
          default_rental_days?: number | null
          email?: string | null
          email_notifications?: boolean | null
          grace_period_days?: number | null
          id?: string
          is_deleted?: boolean
          late_payment_fee?: number | null
          logo_url?: string | null
          maintenance_interval?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          name?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          state?: string | null
          street?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vehicle_limit?: number | null
          whatsapp_notifications?: boolean | null
          zip_code?: string | null
        }
        Relationships: []
      }
      company_change_logs: {
        Row: {
          change_type: Database["public"]["Enums"]["company_change_type"]
          changed_at: string
          changed_by: string
          changed_by_name: string
          company_id: string
          description: string
          field_changed: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          change_type: Database["public"]["Enums"]["company_change_type"]
          changed_at?: string
          changed_by: string
          changed_by_name: string
          company_id: string
          description: string
          field_changed?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          change_type?: Database["public"]["Enums"]["company_change_type"]
          changed_at?: string
          changed_by?: string
          changed_by_name?: string
          company_id?: string
          description?: string
          field_changed?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_change_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payment_schedules: {
        Row: {
          amount: number
          cancelled_at: string | null
          company_id: string | null
          created_at: string
          credit_id: string
          deleted_at: string | null
          due_date: string
          id: string
          is_deleted: boolean | null
          paid_amount: number | null
          paid_date: string | null
          payment_number: number
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          company_id?: string | null
          created_at?: string
          credit_id: string
          deleted_at?: string | null
          due_date: string
          id?: string
          is_deleted?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_number: number
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          company_id?: string | null
          created_at?: string
          credit_id?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          is_deleted?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_number?: number
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_payment_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payment_schedules_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string
          id: string
          is_deleted: boolean
          last_payment_amount: number | null
          last_payment_date: string | null
          last_payment_status:
            | Database["public"]["Enums"]["last_payment_status"]
            | null
          number_of_payments: number
          paid_amount: number
          payments_made: number
          reference_code: string | null
          remaining_balance: number
          start_date: string
          status: Database["public"]["Enums"]["credit_status"]
          total_amount: number
          uid: string | null
          updated_at: string | null
          vehicle_id: string
          weekly_payment: number
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_payment_status?:
            | Database["public"]["Enums"]["last_payment_status"]
            | null
          number_of_payments: number
          paid_amount?: number
          payments_made?: number
          reference_code?: string | null
          remaining_balance: number
          start_date: string
          status?: Database["public"]["Enums"]["credit_status"]
          total_amount: number
          uid?: string | null
          updated_at?: string | null
          vehicle_id: string
          weekly_payment: number
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_payment_status?:
            | Database["public"]["Enums"]["last_payment_status"]
            | null
          number_of_payments?: number
          paid_amount?: number
          payments_made?: number
          reference_code?: string | null
          remaining_balance?: number
          start_date?: string
          status?: Database["public"]["Enums"]["credit_status"]
          total_amount?: number
          uid?: string | null
          updated_at?: string | null
          vehicle_id?: string
          weekly_payment?: number
        }
        Relationships: [
          {
            foreignKeyName: "credits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string | null
          document_type: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["document_entity_type"]
          file_name: string
          file_url: string
          id: string
          is_deleted: boolean | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          company_id?: string | null
          document_type: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["document_entity_type"]
          file_name: string
          file_url: string
          id?: string
          is_deleted?: boolean | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          company_id?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["document_entity_type"]
          file_name?: string
          file_url?: string
          id?: string
          is_deleted?: boolean | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fcm_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          affects: Database["public"]["Enums"]["balance_affects"]
          category: string | null
          company_id: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          type: Database["public"]["Enums"]["financial_record_type"]
        }
        Insert: {
          affects?: Database["public"]["Enums"]["balance_affects"]
          category?: string | null
          company_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: Database["public"]["Enums"]["financial_record_type"]
        }
        Update: {
          affects?: Database["public"]["Enums"]["balance_affects"]
          category?: string | null
          company_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["financial_record_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payment_credit_allocations: {
        Row: {
          amount_applied: number
          company_id: string
          created_at: string
          credit_id: string
          credit_payment_schedule_id: string
          id: string
          is_deleted: boolean
          payment_financial_record_id: string
        }
        Insert: {
          amount_applied: number
          company_id: string
          created_at?: string
          credit_id: string
          credit_payment_schedule_id: string
          id?: string
          is_deleted?: boolean
          payment_financial_record_id: string
        }
        Update: {
          amount_applied?: number
          company_id?: string
          created_at?: string
          credit_id?: string
          credit_payment_schedule_id?: string
          id?: string
          is_deleted?: boolean
          payment_financial_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_payment_credit_alloc_payment_financial_record_id_fkey"
            columns: ["payment_financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_credit_alloca_credit_payment_schedule_id_fkey"
            columns: ["credit_payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "credit_payment_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_credit_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_credit_allocations_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_record_links: {
        Row: {
          amount_applied: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          relationship_type: string
          source_financial_record_id: string
          target_financial_record_id: string
        }
        Insert: {
          amount_applied?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_type: string
          source_financial_record_id: string
          target_financial_record_id: string
        }
        Update: {
          amount_applied?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_type?: string
          source_financial_record_id?: string
          target_financial_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_record_links_source_financial_record_id_fkey"
            columns: ["source_financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_record_links_target_financial_record_id_fkey"
            columns: ["target_financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          category: string
          category_id: string
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          credit_granted: boolean | null
          credit_id: string | null
          credit_payment: boolean | null
          credit_payment_number: number | null
          credit_payment_schedule_id: string | null
          date: string
          description: string
          evidence_urls: string[] | null
          id: string
          is_deleted: boolean
          is_pending: boolean | null
          items: Json | null
          mileage_at_expense: number | null
          notes: string | null
          partner_id: string | null
          payment_method: string | null
          record_origin: string | null
          reference_code: string | null
          related_record_id: string | null
          related_record_type: string | null
          source_record_id: string | null
          source_record_type: string | null
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category: string
          category_id: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_granted?: boolean | null
          credit_id?: string | null
          credit_payment?: boolean | null
          credit_payment_number?: number | null
          credit_payment_schedule_id?: string | null
          date: string
          description: string
          evidence_urls?: string[] | null
          id?: string
          is_deleted?: boolean
          is_pending?: boolean | null
          items?: Json | null
          mileage_at_expense?: number | null
          notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          record_origin?: string | null
          reference_code?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          source_record_id?: string | null
          source_record_type?: string | null
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          category_id?: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_granted?: boolean | null
          credit_id?: string | null
          credit_payment?: boolean | null
          credit_payment_number?: number | null
          credit_payment_schedule_id?: string | null
          date?: string
          description?: string
          evidence_urls?: string[] | null
          id?: string
          is_deleted?: boolean
          is_pending?: boolean | null
          items?: Json | null
          mileage_at_expense?: number | null
          notes?: string | null
          partner_id?: string | null
          payment_method?: string | null
          record_origin?: string | null
          reference_code?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          source_record_id?: string | null
          source_record_type?: string | null
          type?: Database["public"]["Enums"]["financial_record_type"]
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_credit_payment_schedule_id_fkey"
            columns: ["credit_payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "credit_payment_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_configs: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          company_id: string | null
          created_at: string
          device_imei: string | null
          device_type: string | null
          id: string
          is_active: boolean
          refresh_interval: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          company_id?: string | null
          created_at?: string
          device_imei?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean
          refresh_interval?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          company_id?: string | null
          created_at?: string
          device_imei?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean
          refresh_interval?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_configs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          company_id: string
          content: string
          id: string
          recipient_id: string
          recipient_name: string
          recipient_type: Database["public"]["Enums"]["message_type"]
          sent_at: string
          sent_by: string
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          company_id: string
          content: string
          id?: string
          recipient_id: string
          recipient_name: string
          recipient_type: Database["public"]["Enums"]["message_type"]
          sent_at?: string
          sent_by: string
          status: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          company_id?: string
          content?: string
          id?: string
          recipient_id?: string
          recipient_name?: string
          recipient_type?: Database["public"]["Enums"]["message_type"]
          sent_at?: string
          sent_by?: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          name: string
          type: Database["public"]["Enums"]["message_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          name: string
          type: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          name?: string
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_logs: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          date: string
          financial_record_id: string | null
          id: string
          is_deleted: boolean | null
          kind: Database["public"]["Enums"]["mileage_kind"] | null
          mileage: number
          notes: string | null
          source: Database["public"]["Enums"]["mileage_source"] | null
          uid: string | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          financial_record_id?: string | null
          id?: string
          is_deleted?: boolean | null
          kind?: Database["public"]["Enums"]["mileage_kind"] | null
          mileage: number
          notes?: string | null
          source?: Database["public"]["Enums"]["mileage_source"] | null
          uid?: string | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          financial_record_id?: string | null
          id?: string
          is_deleted?: boolean | null
          kind?: Database["public"]["Enums"]["mileage_kind"] | null
          mileage?: number
          notes?: string | null
          source?: Database["public"]["Enums"]["mileage_source"] | null
          uid?: string | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      multas: {
        Row: {
          asignado_automaticamente: boolean
          assignment_date: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string
          descripcion: string
          direccion: string
          evidencia_urls: string[] | null
          fecha_infraccion: string
          fecha_pago: string | null
          folio: string | null
          id: string
          importe: number
          is_deleted: boolean
          notas: string | null
          recargos: number | null
          status: Database["public"]["Enums"]["multa_status"]
          total: number
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          asignado_automaticamente?: boolean
          assignment_date?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          descripcion: string
          direccion: string
          evidencia_urls?: string[] | null
          fecha_infraccion: string
          fecha_pago?: string | null
          folio?: string | null
          id?: string
          importe: number
          is_deleted?: boolean
          notas?: string | null
          recargos?: number | null
          status?: Database["public"]["Enums"]["multa_status"]
          total: number
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          asignado_automaticamente?: boolean
          assignment_date?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          descripcion?: string
          direccion?: string
          evidencia_urls?: string[] | null
          fecha_infraccion?: string
          fecha_pago?: string | null
          folio?: string | null
          id?: string
          importe?: number
          is_deleted?: boolean
          notas?: string | null
          recargos?: number | null
          status?: Database["public"]["Enums"]["multa_status"]
          total?: number
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_read_states: {
        Row: {
          created_at: string
          notification_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notification_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notification_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          company_id: string | null
          date: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          related_id: string | null
          type: string
          uid: string | null
        }
        Insert: {
          company_id?: string | null
          date?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          related_id?: string | null
          type: string
          uid?: string | null
        }
        Update: {
          company_id?: string | null
          date?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          related_id?: string | null
          type?: string
          uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          balance: number
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          email: string | null
          firstname: string
          id: string
          initial_balance: number | null
          is_deleted: boolean
          lastname: string
          name: string
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_limit: number | null
          zip_code: string | null
        }
        Insert: {
          balance?: number
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          firstname: string
          id?: string
          initial_balance?: number | null
          is_deleted?: boolean
          lastname: string
          name: string
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_limit?: number | null
          zip_code?: string | null
        }
        Update: {
          balance?: number
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          firstname?: string
          id?: string
          initial_balance?: number | null
          is_deleted?: boolean
          lastname?: string
          name?: string
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_limit?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          current_value: number | null
          id: string
          limit_type: string
          limit_value: number | null
          message: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          current_value?: number | null
          id?: string
          limit_type: string
          limit_value?: number | null
          message?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          current_value?: number | null
          id?: string
          limit_type?: string
          limit_value?: number | null
          message?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_limit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_limit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          features: string[] | null
          id: string
          is_active: boolean | null
          max_companies: number | null
          max_users: number | null
          max_vehicles: number | null
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          max_companies?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          max_companies?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      record_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          company_id: string | null
          entity_id: string
          entity_reference_code: string | null
          entity_type: string
          id: string
          metadata: Json
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          company_id?: string | null
          entity_id: string
          entity_reference_code?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          company_id?: string | null
          entity_id?: string
          entity_reference_code?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
        }
        Relationships: []
      }
      seguimientos: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_by: string
          heading: number | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          photo_url: string | null
          speed: number | null
          timestamp: string
          vehicle_id: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_by: string
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          speed?: number | null
          timestamp?: string
          vehicle_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_by?: string
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          speed?: number | null
          timestamp?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimientos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimientos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimientos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimientos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_purchase_allocations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          expense_item_id: string | null
          financial_record_id: string
          id: string
          notes: string | null
          purchase_id: string
          supplier_purchase_item_id: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          expense_item_id?: string | null
          financial_record_id: string
          id?: string
          notes?: string | null
          purchase_id: string
          supplier_purchase_item_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          expense_item_id?: string | null
          financial_record_id?: string
          id?: string
          notes?: string | null
          purchase_id?: string
          supplier_purchase_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_purchase_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_allocations_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_allocations_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_allocations_supplier_purchase_item_id_fkey"
            columns: ["supplier_purchase_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_purchase_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          description: string
          id: string
          purchase_id: string
          quantity: number
          total: number | null
          unit_price: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          description: string
          id?: string
          purchase_id: string
          quantity?: number
          total?: number | null
          unit_price: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          id?: string
          purchase_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_purchase_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_purchases: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          evidence_urls: string[] | null
          financial_record_id: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          payment_method: string
          purchase_date: string
          reference: string | null
          status: string
          supplier_id: string
          total: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          evidence_urls?: string[] | null
          financial_record_id?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          payment_method?: string
          purchase_date?: string
          reference?: string | null
          status?: string
          supplier_id: string
          total: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          evidence_urls?: string[] | null
          financial_record_id?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          payment_method?: string
          purchase_date?: string
          reference?: string | null
          status?: string
          supplier_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchases_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: true
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          legal_name: string | null
          name: string
          notes: string | null
          phone: string | null
          rfc: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          legal_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rfc?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          legal_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rfc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_by_name: string
          role: string
          status: string
          token: string
          token_hash: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          invited_by_name: string
          role?: string
          status?: string
          token: string
          token_hash?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_by_name?: string
          role?: string
          status?: string
          token?: string
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          is_deleted: boolean
          name: string
          notification_settings: Json | null
          partner_access: string[] | null
          phone: string | null
          push_subscriptions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
          street: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          email: string
          id: string
          is_deleted?: boolean
          name: string
          notification_settings?: Json | null
          partner_access?: string[] | null
          phone?: string | null
          push_subscriptions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          is_deleted?: boolean
          name?: string
          notification_settings?: Json | null
          partner_access?: string[] | null
          phone?: string | null
          push_subscriptions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_assignment_logs: {
        Row: {
          assigned_at: string
          assigned_by: string
          client_id: string | null
          company_id: string | null
          condition_notes: string | null
          created_at: string
          end_date: string | null
          fuel_level: string | null
          id: string
          odometer_reading: number | null
          partner_id: string | null
          photos: Json | null
          reason: string | null
          start_date: string | null
          unassigned_at: string | null
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          client_id?: string | null
          company_id?: string | null
          condition_notes?: string | null
          created_at?: string
          end_date?: string | null
          fuel_level?: string | null
          id?: string
          odometer_reading?: number | null
          partner_id?: string | null
          photos?: Json | null
          reason?: string | null
          start_date?: string | null
          unassigned_at?: string | null
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          client_id?: string | null
          company_id?: string | null
          condition_notes?: string | null
          created_at?: string
          end_date?: string | null
          fuel_level?: string | null
          id?: string
          odometer_reading?: number | null
          partner_id?: string | null
          photos?: Json | null
          reason?: string | null
          start_date?: string | null
          unassigned_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignment_logs_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignment_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignment_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignment_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_deleted: boolean
          photos: Json
          timestamp: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          is_deleted?: boolean
          photos?: Json
          timestamp?: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_deleted?: boolean
          photos?: Json
          timestamp?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          acquisition_date: string
          admin_commission: number | null
          alias: string
          associated_credit_id: string | null
          circulation_card_url: string | null
          client_id: string | null
          color: string
          company_id: string | null
          cost: number | null
          created_at: string
          current_mileage: number
          gps_phone_company: string | null
          gps_phone_number: string | null
          id: string
          image_url: string | null
          insurance_company: string | null
          insurance_expiry_date: string | null
          insurance_policy_document_url: string | null
          insurance_policy_number: string | null
          is_deleted: boolean
          last_maintenance_mileage: number | null
          locked_by_credit: boolean | null
          maintenance_interval: number | null
          make: string
          model: string
          partner_id: string | null
          plate: string
          serial_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string | null
          weekly_rental_value: number | null
          year: number
        }
        Insert: {
          acquisition_date: string
          admin_commission?: number | null
          alias: string
          associated_credit_id?: string | null
          circulation_card_url?: string | null
          client_id?: string | null
          color: string
          company_id?: string | null
          cost?: number | null
          created_at?: string
          current_mileage?: number
          gps_phone_company?: string | null
          gps_phone_number?: string | null
          id?: string
          image_url?: string | null
          insurance_company?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_document_url?: string | null
          insurance_policy_number?: string | null
          is_deleted?: boolean
          last_maintenance_mileage?: number | null
          locked_by_credit?: boolean | null
          maintenance_interval?: number | null
          make: string
          model: string
          partner_id?: string | null
          plate: string
          serial_number: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string | null
          weekly_rental_value?: number | null
          year: number
        }
        Update: {
          acquisition_date?: string
          admin_commission?: number | null
          alias?: string
          associated_credit_id?: string | null
          circulation_card_url?: string | null
          client_id?: string | null
          color?: string
          company_id?: string | null
          cost?: number | null
          created_at?: string
          current_mileage?: number
          gps_phone_company?: string | null
          gps_phone_number?: string | null
          id?: string
          image_url?: string | null
          insurance_company?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_document_url?: string | null
          insurance_policy_number?: string | null
          is_deleted?: boolean
          last_maintenance_mileage?: number | null
          locked_by_credit?: boolean | null
          maintenance_interval?: number | null
          make?: string
          model?: string
          partner_id?: string | null
          plate?: string
          serial_number?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string | null
          weekly_rental_value?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_associated_credit_id_fkey"
            columns: ["associated_credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_supplier_purchase: {
        Args: {
          p_allocations: Json
          p_company_id: string
          p_created_by?: string
          p_purchase_id: string
        }
        Returns: Json
      }
      apply_security_deposit_payment: {
        Args: {
          p_amount: number
          p_client_id: string
          p_company_id: string
          p_created_by?: string
          p_payment_date?: string
          p_payment_method?: string
          p_reference?: string
          p_target_financial_record_id: string
        }
        Returns: {
          amount: number
          category: string
          category_id: string
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          credit_granted: boolean | null
          credit_id: string | null
          credit_payment: boolean | null
          credit_payment_number: number | null
          credit_payment_schedule_id: string | null
          date: string
          description: string
          evidence_urls: string[] | null
          id: string
          is_deleted: boolean
          is_pending: boolean | null
          items: Json | null
          mileage_at_expense: number | null
          notes: string | null
          partner_id: string | null
          payment_method: string | null
          record_origin: string | null
          reference_code: string | null
          related_record_id: string | null
          related_record_type: string | null
          source_record_id: string | null
          source_record_type: string | null
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at: string | null
          vehicle_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_user_company_id: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      cancel_credit_atomic: {
        Args: { p_company_id: string; p_credit_id: string; p_reason?: string }
        Returns: Json
      }
      cancel_multa_atomic: {
        Args: {
          p_cancel_reason?: string
          p_company_id: string
          p_created_by?: string
          p_multa_id: string
        }
        Returns: Json
      }
      create_credit_atomic: { Args: { p_credit: Json }; Returns: Json }
      create_expense_atomic: { Args: { p_record: Json }; Returns: Json }
      create_financial_payment: {
        Args: {
          p_amount: number
          p_client_id?: string
          p_company_id: string
          p_created_by?: string
          p_credit_id?: string
          p_credit_payment_schedule_id?: string
          p_partner_id?: string
          p_payment_date: string
          p_payment_kind: string
          p_payment_method?: string
          p_reference?: string
          p_supplier_id?: string
          p_target_financial_record_id?: string
        }
        Returns: {
          amount: number
          category: string
          category_id: string
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          credit_granted: boolean | null
          credit_id: string | null
          credit_payment: boolean | null
          credit_payment_number: number | null
          credit_payment_schedule_id: string | null
          date: string
          description: string
          evidence_urls: string[] | null
          id: string
          is_deleted: boolean
          is_pending: boolean | null
          items: Json | null
          mileage_at_expense: number | null
          notes: string | null
          partner_id: string | null
          payment_method: string | null
          record_origin: string | null
          reference_code: string | null
          related_record_id: string | null
          related_record_type: string | null
          source_record_id: string | null
          source_record_type: string | null
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at: string | null
          vehicle_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_financial_record: { Args: { p_record: Json }; Returns: Json }
      create_multa_atomic: { Args: { p_record: Json }; Returns: Json }
      create_supplier_purchase: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_due_date?: string
          p_items?: Json
          p_notes?: string
          p_payment_method: string
          p_purchase_date: string
          p_reference?: string
          p_supplier_id: string
          p_total: number
        }
        Returns: {
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          evidence_urls: string[] | null
          financial_record_id: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          payment_method: string
          purchase_date: string
          reference: string | null
          status: string
          supplier_id: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "supplier_purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_financial_payment_atomic: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      delete_supplier_purchase: {
        Args: { p_company_id: string; p_purchase_id: string }
        Returns: Json
      }
      get_superadmin_dashboard_summary: { Args: never; Returns: Json }
      get_user_company_id: { Args: never; Returns: string }
      is_user_admin: { Args: never; Returns: boolean }
      link_financial_records: {
        Args: {
          p_relationship_type: string
          p_source_financial_record_id: string
          p_target_financial_record_id: string
        }
        Returns: Json
      }
      next_fleetease_reference_code: {
        Args: { p_company_id: string; p_prefix: string }
        Returns: string
      }
      offboard_client_with_writeoff: {
        Args: { p_client_id: string; p_reason: string }
        Returns: Json
      }
      process_credit_payment_atomic: {
        Args: {
          p_amount: number
          p_client_id: string
          p_company_id: string
          p_created_by?: string
          p_credit_id: string
          p_payment_date?: string
          p_payment_method?: string
          p_reference?: string
        }
        Returns: Json
      }
      process_multa_payment_atomic: {
        Args: {
          p_amount: number
          p_client_id: string
          p_company_id: string
          p_created_by: string
          p_date: string
          p_description: string
          p_multa_id: string
          p_payment_method: string
          p_vehicle_id: string
        }
        Returns: Json
      }
      recalculate_credit_after_payment_change: {
        Args: { p_credit_id: string }
        Returns: undefined
      }
      reconcile_supplier_payable_status: {
        Args: { p_target_financial_record_id: string }
        Returns: undefined
      }
      refund_security_deposit: {
        Args: {
          p_amount: number
          p_client_id: string
          p_company_id: string
          p_created_by?: string
          p_payment_date?: string
          p_payment_method?: string
          p_reference?: string
        }
        Returns: {
          amount: number
          category: string
          category_id: string
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          credit_granted: boolean | null
          credit_id: string | null
          credit_payment: boolean | null
          credit_payment_number: number | null
          credit_payment_schedule_id: string | null
          date: string
          description: string
          evidence_urls: string[] | null
          id: string
          is_deleted: boolean
          is_pending: boolean | null
          items: Json | null
          mileage_at_expense: number | null
          notes: string | null
          partner_id: string | null
          payment_method: string | null
          record_origin: string | null
          reference_code: string | null
          related_record_id: string | null
          related_record_type: string | null
          source_record_id: string | null
          source_record_type: string | null
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at: string | null
          vehicle_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      table_exists: { Args: { tname: string }; Returns: boolean }
      update_financial_payment_atomic: {
        Args: {
          p_amount: number
          p_payment_date: string
          p_payment_id: string
          p_payment_method?: string
          p_reference?: string
          p_target_financial_record_id?: string
        }
        Returns: {
          amount: number
          category: string
          category_id: string
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          credit_granted: boolean | null
          credit_id: string | null
          credit_payment: boolean | null
          credit_payment_number: number | null
          credit_payment_schedule_id: string | null
          date: string
          description: string
          evidence_urls: string[] | null
          id: string
          is_deleted: boolean
          is_pending: boolean | null
          items: Json | null
          mileage_at_expense: number | null
          notes: string | null
          partner_id: string | null
          payment_method: string | null
          record_origin: string | null
          reference_code: string | null
          related_record_id: string | null
          related_record_type: string | null
          source_record_id: string | null
          source_record_type: string | null
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at: string | null
          vehicle_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_financial_record_metadata: {
        Args: { p_id: string; p_patch: Json }
        Returns: Json
      }
      update_supplier_purchase: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_due_date?: string
          p_items?: Json
          p_notes?: string
          p_payment_method: string
          p_purchase_date: string
          p_purchase_id: string
          p_reference?: string
          p_supplier_id: string
          p_total: number
        }
        Returns: {
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          evidence_urls: string[] | null
          financial_record_id: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          payment_method: string
          purchase_date: string
          reference: string | null
          status: string
          supplier_id: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "supplier_purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      audit_action: "create" | "update" | "delete" | "login" | "logout"
      balance_affects:
        | "client_balance"
        | "partner_balance"
        | "none"
        | "security_deposit"
        | "credit_payment"
        | "credit_granted"
        | "driver_payment"
      client_change_type:
        | "created"
        | "updated"
        | "deleted"
        | "vehicle_assigned"
        | "vehicle_unassigned"
        | "balance_updated"
        | "deposit_updated"
        | "document_uploaded"
        | "credit_approved"
      client_status: "active" | "inactive"
      company_change_type:
        | "created"
        | "updated"
        | "deleted"
        | "limit_changed"
        | "contract_uploaded"
        | "contract_deleted"
      credit_status:
        | "active"
        | "completed"
        | "defaulted"
        | "inactive"
        | "cancelled"
      document_entity_type: "vehicle" | "client" | "partner" | "company"
      financial_record_type: "income" | "expense" | "payment"
      last_payment_status: "paid" | "overdue" | "pending"
      license_status: "active" | "expired"
      message_status: "sent" | "delivered" | "failed"
      message_type: "cliente" | "socio" | "usuario"
      mileage_kind: "odometer" | "maintenance"
      mileage_source: "expense" | "manual"
      multa_status: "pendiente" | "pagada" | "en_proceso" | "cancelada"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      subscription_plan: "starter" | "pro" | "enterprise" | "free"
      user_role:
        | "admin"
        | "editor"
        | "viewer"
        | "super_admin"
        | "partner"
        | "client"
      vehicle_status: "active" | "inactive" | "maintenance" | "sold" | "rented"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: ["create", "update", "delete", "login", "logout"],
      balance_affects: [
        "client_balance",
        "partner_balance",
        "none",
        "security_deposit",
        "credit_payment",
        "credit_granted",
        "driver_payment",
      ],
      client_change_type: [
        "created",
        "updated",
        "deleted",
        "vehicle_assigned",
        "vehicle_unassigned",
        "balance_updated",
        "deposit_updated",
        "document_uploaded",
        "credit_approved",
      ],
      client_status: ["active", "inactive"],
      company_change_type: [
        "created",
        "updated",
        "deleted",
        "limit_changed",
        "contract_uploaded",
        "contract_deleted",
      ],
      credit_status: [
        "active",
        "completed",
        "defaulted",
        "inactive",
        "cancelled",
      ],
      document_entity_type: ["vehicle", "client", "partner", "company"],
      financial_record_type: ["income", "expense", "payment"],
      last_payment_status: ["paid", "overdue", "pending"],
      license_status: ["active", "expired"],
      message_status: ["sent", "delivered", "failed"],
      message_type: ["cliente", "socio", "usuario"],
      mileage_kind: ["odometer", "maintenance"],
      mileage_source: ["expense", "manual"],
      multa_status: ["pendiente", "pagada", "en_proceso", "cancelada"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      subscription_plan: ["starter", "pro", "enterprise", "free"],
      user_role: [
        "admin",
        "editor",
        "viewer",
        "super_admin",
        "partner",
        "client",
      ],
      vehicle_status: ["active", "inactive", "maintenance", "sold", "rented"],
    },
  },
} as const

// Cliente de Supabase
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: { schema: 'public' },
    global: { headers: { 'Content-Type': 'application/json' } },
  }
);

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('is_deleted', false)
    .single();
  if (error || !data) return null;
  return data;
};

// Aliases de dominio usados por el código existente.
export type User = Database['public']['Tables']['users']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type Partner = Database['public']['Tables']['partners']['Row'];
export type MileageLog = Database['public']['Tables']['mileage_logs']['Row'];
export type FinancialRecord = Database['public']['Tables']['financial_records']['Row'];
export type Credit = Database['public']['Tables']['credits']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type VehicleAssignmentLog = Database['public']['Tables']['vehicle_assignment_logs']['Row'];
export type FinancialCategory = Database['public']['Tables']['financial_categories']['Row'];
export type CompanyChangeLog = Database['public']['Tables']['company_change_logs']['Row'];
export type ClientChangeLog = Database['public']['Tables']['client_change_logs']['Row'];
export type MessageTemplate = Database['public']['Tables']['message_templates']['Row'];
export type MessageLog = Database['public']['Tables']['message_logs']['Row'];
export type CreditPaymentSchedule = Database['public']['Tables']['credit_payment_schedules']['Row'];
export type Multa = Database['public']['Tables']['multas']['Row'];
export type FcmToken = Database['public']['Tables']['fcm_tokens']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type GpsConfig = Database['public']['Tables']['gps_configs']['Row'];
export type Seguimiento = Database['public']['Tables']['seguimientos']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type UserInvitation = Database['public']['Tables']['user_invitations']['Row'];
export type PlanLimitLog = Database['public']['Tables']['plan_limit_logs']['Row'];
export type VehicleInspection = Database['public']['Tables']['vehicle_inspections']['Row'];
export type GeneratedReport = Database['public']['Tables']['generated_reports']['Row'];
export type UserDashboard = Database['public']['Tables']['user_dashboards']['Row'];
