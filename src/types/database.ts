export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: { // Osbic Public Schema
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          role: 'admin' | 'employee' | 'client'
          avatar_url: string | null
          language_preference: 'en' | 'ar' | null
          is_active: boolean | null
          employee_code: string | null
          client_code: string | null
          is_manager: boolean | null
          department: 'sales' | 'operations' | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          whatsapp: string | null
          nationality: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          role?: 'admin' | 'employee' | 'client'
          avatar_url?: string | null
          language_preference?: 'en' | 'ar' | null
          is_active?: boolean | null
          employee_code?: string | null
          client_code?: string | null
          is_manager?: boolean | null
          department?: 'sales' | 'operations' | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          nationality?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          role?: 'admin' | 'employee' | 'client'
          avatar_url?: string | null
          language_preference?: 'en' | 'ar' | null
          is_active?: boolean | null
          employee_code?: string | null
          client_code?: string | null
          is_manager?: boolean | null
          department?: 'sales' | 'operations' | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          nationality?: string | null
        }
      }

      services: {
        Row: {
          id: string
          name_en: string
          name_ar: string
          description_en: string | null
          description_ar: string | null
          category: 'company_formation' | 'visa' | 'cr_renewal' | 'labor' | 'other'
          estimated_days: number | null
          is_active: boolean
          icon: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          work_fee: number
          ministry_fee: number
        }
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      workflow_steps: {
        Row: {
          id: string
          service_id: string
          step_order: number
          name_en: string
          name_ar: string
          description_en: string | null
          description_ar: string | null
          required_documents: string[] | null
          is_client_visible: boolean
          is_blocking: boolean
          estimated_hours: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['workflow_steps']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['workflow_steps']['Insert']>
      }
      jobs: {
        Row: {
          id: string
          job_code: string
          client_id: string
          employee_id: string
          assigned_by: string | null
          service_id: string
          current_step_id: string | null
          status: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          total_fee: number
          work_fee: number
          ministry_fee: number
          ministry_fee_type: 'fixed' | 'percentage'
          ministry_fee_percentage: number | null
          advance_percentage: number
          advance_amount: number | null
          advance_paid: boolean
          advance_paid_at: string | null
          remaining_amount: number | null
          remaining_paid: boolean
          remaining_paid_at: string | null
          service_expiry_date: string | null
          expiry_reminder_60_sent: boolean
          expiry_reminder_30_sent: boolean
          notes: string | null
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      job_payments: {
        Row: {
          id: string
          job_id: string
          amount: number
          payment_method: 'cash' | 'bank_transfer' | 'pos' | 'online'
          reference_number: string | null
          notes: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['job_payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['job_payments']['Insert']>
      }
      job_steps: {
        Row: {
          id: string
          job_id: string
          workflow_step_id: string | null
          custom_name: string | null
          assigned_to: string | null
          assigned_by: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped'
          started_at: string | null
          completed_at: string | null
          completed_by: string | null
          notes: string | null
          rejection_reason: string | null
          is_client_visible: boolean
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['job_steps']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['job_steps']['Insert']>
      }
      job_sub_tasks: {
        Row: {
          id: string
          job_step_id: string
          name: string
          status: 'pending' | 'applied' | 'approved' | 'rejected' | 'expired'
          notes: string | null
          ministry_fee: number | null
          issued_date: string | null
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['job_sub_tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['job_sub_tasks']['Insert']>
      }
      job_additional_charges: {
        Row: {
          id: string
          job_id: string
          description: string
          amount: number
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['job_additional_charges']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['job_additional_charges']['Insert']>
      }
      documents: {
        Row: {
          id: string
          job_id: string
          job_step_id: string | null
          job_sub_task_id: string | null
          uploaded_by: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          document_type: string
          version: number
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          expiry_date: string | null
          is_client_visible: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          sender_id: string | null
          job_id: string | null
          type: string
          title_en: string
          title_ar: string
          body_en: string | null
          body_ar: string | null
          is_read: boolean
          action_required: boolean
          action_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      messages: {
        Row: {
          id: string
          job_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      chat_rooms: {
        Row: {
          id: string
          type: 'direct' | 'group'
          name: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_rooms']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['chat_rooms']['Insert']>
      }
      chat_participants: {
        Row: {
          chat_id: string
          user_id: string
          role: 'member' | 'admin'
          joined_at: string
          last_read_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_participants']['Row'], 'joined_at' | 'last_read_at'>
        Update: Partial<Database['public']['Tables']['chat_participants']['Insert']>
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string | null
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
      }
      employee_requests: {
        Row: {
          id: string
          employee_id: string
          job_id: string | null
          type: 'price_adjustment' | 'step_skip' | 'deadline_extension' | 'other'
          description: string
          status: 'pending' | 'approved' | 'rejected'
          admin_response: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          job_id?: string | null
          type: 'price_adjustment' | 'step_skip' | 'deadline_extension' | 'other'
          description: string
          status?: 'pending' | 'approved' | 'rejected'
          admin_response?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['employee_requests']['Insert']>
      }
      service_interests: {
        Row: {
          id: string
          client_id: string | null
          service_id: string | null
          notes: string | null
          status: 'new' | 'contacted' | 'converted' | 'ignored'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          service_id?: string | null
          notes?: string | null
          status?: 'new' | 'contacted' | 'converted' | 'ignored'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          service_id?: string | null
          notes?: string | null
          status?: 'new' | 'contacted' | 'converted' | 'ignored'
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
    Functions: {
      create_quick_task: {
        Args: {
          p_employee_id: string | undefined
          p_task_description: string
          p_amount: number
          p_payment_method: string
          p_customer_name: string | null
          p_customer_phone?: string | null
          p_status?: string
        }
        Returns: any
      }
    }
  }
}
