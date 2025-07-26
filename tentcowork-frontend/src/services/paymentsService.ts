// src/services/paymentsService.ts
export interface PaymentData {
  fullName: string;
  amount: number;
  plan: string;
  studentId: string;
  studentEmail?: string;
}

export interface MercadoPagoResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export class PaymentService {
  private static readonly BASE_URL = '/api';

  /**
   * Crea una preferencia de pago en Mercado Pago
   */
  static async createMercadoPagoPreference(paymentData: PaymentData): Promise<MercadoPagoResponse> {
    try {
      console.log('🏗️ Creando preferencia de MP con datos:', paymentData);
      
      const requestData = {
        paymentData: {
          ...paymentData,
          method: "Mercado Pago Hospedado",
          date: new Date().toISOString(),
          facturado: false
        }
      };
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payments/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Preferencia creada exitosamente:', data);
      
      return data;
    } catch (error) {
      // ✅ FIX: Manejo correcto del tipo 'unknown'
      console.error('❌ Error creando preferencia:', error);
      
      if (error instanceof Error) {
        throw new Error(`No se pudo crear la preferencia de pago: ${error.message}`);
      } else {
        throw new Error('No se pudo crear la preferencia de pago: Error desconocido');
      }
    }
  }

  /**
   * Verifica la configuración del backend
   */
  static async testConfiguration(): Promise<any> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payments/test-config`); 
      return await response.json();
    } catch (error) {
      // ✅ FIX: Manejo correcto del tipo 'unknown'
      console.error('Error testing configuration:', error);
      
      if (error instanceof Error) {
        throw new Error(`Error verificando configuración: ${error.message}`);
      } else {
        throw new Error('Error verificando configuración: Error desconocido');
      }
    }
  }
}