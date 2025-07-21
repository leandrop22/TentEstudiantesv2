// src/types/mercadoPago.ts

export interface MercadoPagoWebhookData {
  id: string;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: string;
  user_id: string;
  version: string;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

// 🔧 TIPOS ACTUALIZADOS PARA MP API v2
export interface MercadoPagoPaymentStatus {
  id: number; // ← MP devuelve number, no string
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  status_detail?: string;
  currency_id?: string;
  transaction_amount?: number;
  external_reference?: string;
  date_created?: string;
  date_approved?: string;
  payer?: {
    id?: string;
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
  payment_method_id?: string;
  payment_type_id?: string;
  installments?: number;
}

export interface PaymentRecord {
  id: string;
  fullName: string;
  amount: number;
  method: string;
  date: string;
  facturado: boolean;
  plan: string;
  studentId: string;
  mercadoPagoId?: string; // Guardamos como string en nuestra BD
  status?: string;
}

export interface CreatePreferenceRequest {
  paymentData: {
    fullName: string;
    amount: number;
    method: string;
    date: string;
    facturado: boolean;
    plan: string;
    studentId: string;
    studentEmail?: string;
  };
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}