import { useAuthStore } from '../store/authStore';

const BASE_URL = 'http://localhost:8080/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or invalid token
    useAuthStore.getState().logout();
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

  if (!response.ok) {
    let errorMessage = `Erro na requisição: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  // Handle 204 or empty response
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return null as unknown as T;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      return request<{
        token: string;
        id: string;
        name: string;
        email: string;
        role: 'MASTER' | 'ADMIN' | 'USER';
        pictureUrl?: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    forgotPassword: async (email: string) => {
      return request<void>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    resetPassword: async (token: string, newPassword: string) => {
      return request<void>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },
  },
  
  tickets: {
    list: async (filters: { status?: string[]; sectorId?: string; assignedAgentId?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.sectorId) {
        params.append('sectorId', filters.sectorId);
      }
      if (filters.assignedAgentId) {
        params.append('assignedAgentId', filters.assignedAgentId);
      }
      
      const queryString = params.toString();
      return request<any[]>(`/tickets${queryString ? `?${queryString}` : ''}`);
    },
    
    create: async (whatsappNumber: string, clientName: string, sectorId: string) => {
      return request<any>('/tickets', {
        method: 'POST',
        body: JSON.stringify({ whatsappNumber, clientName, sectorId }),
      });
    },

    history: async (filters: {
      status?: string[];
      sectorId?: string;
      assignedAgentId?: string;
      clientQuery?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      size?: number;
    } = {}) => {
      const params = new URLSearchParams();
      if (filters.status) {
        filters.status.forEach((s) => params.append('status', s));
      }
      if (filters.sectorId) {
        params.append('sectorId', filters.sectorId);
      }
      if (filters.assignedAgentId) {
        params.append('assignedAgentId', filters.assignedAgentId);
      }
      if (filters.clientQuery) {
        params.append('clientQuery', filters.clientQuery);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.page !== undefined) {
        params.append('page', String(filters.page));
      }
      if (filters.size !== undefined) {
        params.append('size', String(filters.size));
      }
      
      const queryString = params.toString();
      return request<any>(`/tickets/history${queryString ? `?${queryString}` : ''}`);
    },
    
    claim: async (id: string) => {
      return request<any>(`/tickets/${id}/claim`, {
        method: 'POST',
      });
    },
    
    resolve: async (id: string) => {
      return request<any>(`/tickets/${id}/resolve`, {
        method: 'POST',
      });
    },
    
    transfer: async (id: string, targetSectorId?: string, targetAgentId?: string) => {
      return request<any>(`/tickets/${id}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ targetSectorId, targetAgentId }),
      });
    },
    
    getMessages: async (id: string) => {
      return request<any[]>(`/tickets/${id}/messages`);
    },
    
    sendMessage: async (id: string, content: string) => {
      return request<any>(`/tickets/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    
    sendMediaMessage: async (id: string, file: File, caption?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) {
        formData.append('caption', caption);
      }
      return request<any>(`/tickets/${id}/messages/media`, {
        method: 'POST',
        body: formData,
      });
    },

    getSlaMetrics: async () => {
      return request<any>('/tickets/sla-metrics');
    },
  },
  
  sectors: {
    list: async () => {
      return request<any[]>('/sectors');
    },
    create: async (sector: { 
      name: string; 
      friendlyName: string; 
      active: boolean; 
      slaLimitMinutes: number;
      autoCloseEnabled?: boolean;
      autoCloseTimeoutMinutes?: number;
      autoCloseWarningMinutes?: number;
      autoCloseWarningMessage?: string;
    }) => {
      return request<any>('/sectors', {
        method: 'POST',
        body: JSON.stringify(sector),
      });
    },
    update: async (id: string, sector: { 
      name: string; 
      friendlyName: string; 
      active: boolean; 
      slaLimitMinutes: number;
      autoCloseEnabled?: boolean;
      autoCloseTimeoutMinutes?: number;
      autoCloseWarningMinutes?: number;
      autoCloseWarningMessage?: string;
    }) => {
      return request<any>(`/sectors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(sector),
      });
    },
    delete: async (id: string) => {
      return request<void>(`/sectors/${id}`, {
        method: 'DELETE',
      });
    },
  },

  users: {
    list: async () => {
      return request<any[]>('/users');
    },
    create: async (user: { name: string; email: string; password?: string; role: string; sectors: string }) => {
      return request<any>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    },
    update: async (id: string, user: { name: string; role: string; sectors: string }) => {
      return request<any>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      });
    },
  },
  
  clients: {
    listContacts: async () => {
      return request<any[]>('/clients/contacts');
    },
    list: async () => {
      return request<any[]>('/clients');
    },
    create: async (client: { companyName: string; cnpj: string }) => {
      return request<any>('/clients', {
        method: 'POST',
        body: JSON.stringify(client),
      });
    },
    update: async (id: string, client: { companyName: string; cnpj: string }) => {
      return request<any>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(client),
      });
    },
    delete: async (id: string) => {
      return request<void>(`/clients/${id}`, {
        method: 'DELETE',
      });
    },
    addContact: async (clientId: string, contact: { whatsappNumber: string; contactName: string }) => {
      return request<any>(`/clients/${clientId}/contacts`, {
        method: 'POST',
        body: JSON.stringify(contact),
      });
    },
    deleteContact: async (clientId: string, contactId: string) => {
      return request<void>(`/clients/${clientId}/contacts/${contactId}`, {
        method: 'DELETE',
      });
    },
  },

  integration: {
    getStatus: async () => {
      return request<any>('/tickets/integration/status');
    },
    createInstance: async () => {
      return request<any>('/tickets/integration/instance', {
        method: 'POST',
      });
    },
    getQrCode: async () => {
      return request<any>('/tickets/integration/qrcode');
    },
    logout: async () => {
      return request<void>('/tickets/integration/logout', {
        method: 'POST',
      });
    },
    configureWebhook: async (serverUrl: string) => {
      return request<any>('/tickets/integration/webhook', {
        method: 'POST',
        body: JSON.stringify({ serverUrl }),
      });
    },
  },
};
