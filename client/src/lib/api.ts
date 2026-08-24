import type {
  PublicData, Order, Client, Project, Revision, Notification,
  ActivityLogEntry, Analytics, SiteSettings, Package, Service,
  PortfolioItem, Testimonial, TrackerData, Paginated, PromoCode,
} from '../types.js';

const BASE = '';  // Vite proxy handles /api → http://localhost:4000

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(url: string, options: RequestInit = {}, retries = 3): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(BASE + url, {
        credentials: 'include',
        cache: 'no-store', // Prevent browser caching issues for admin endpoints
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });

      if (!res.ok) {
        let errBody: { error?: string; details?: unknown } = {};
        try { errBody = await res.json(); } catch { /* non-JSON error body */ }
        const errMsg = errBody.error ?? `HTTP ${res.status}`;
        
        // Only retry on 5xx server errors, not on 4xx client errors
        if (res.status >= 500 && res.status < 600) {
          throw new Error(errMsg);
        }
        
        // Throw immediately for 4xx errors
        throw new Error(errMsg);
      }

      if (res.status === 204) return undefined as T;
      return await res.json() as T;
    } catch (err: any) {
      lastError = err;
      
      // If it's a 4xx error we explicitly threw above, abort retries immediately
      if (err.message && err.message.startsWith('HTTP 4')) {
        throw err;
      }

      console.warn(`[Network] API request to ${url} failed (attempt ${attempt + 1}/${retries}). Retrying in ${1000 * (attempt + 1)}ms...`);
      await delay(1000 * (attempt + 1));
    }
  }
  
  console.error(`[Network] API request to ${url} completely failed after ${retries} retries.`);
  throw lastError;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const api = {
  public: () => request<PublicData>('/api/public'),
  me:     () => request<{ user: { id: number; username: string; role: string } }>('/api/auth/me'),

  login: (username: string, password: string) =>
    request<{ user: { id: number; username: string; role: string } }>(
      '/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) },
    ),

  logout: () => request('/api/auth/logout', { method: 'POST' }),

  order: (data: {
    name: string; phone: string; email?: string;
    packageId?: number; serviceId?: number; projectType?: string;
    notes?: string; budget?: number; deadline?: string; promoCode?: string;
  }) => request<{ ok: boolean; id: number; orderNo: string }>(
    '/api/orders', { method: 'POST', body: JSON.stringify(data) },
  ),

  track: (orderNo: string) => request<TrackerData>(`/api/track/${encodeURIComponent(orderNo)}`),

  checkPromo: (code: string) => request<{ code: string; discount_type: string; discount_value: number }>(`/api/public/promo/${encodeURIComponent(code)}`),

  submitRevision: (orderNo: string, data: { title: string; description?: string }) =>
    request<{ ok: boolean; revision: Revision }>(`/api/track/${encodeURIComponent(orderNo)}/revisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadReceipt: async (orderNo: string, file: File) => {
    const fd = new FormData();
    fd.append('receipt', file);
    const res = await fetch(`/api/track/${encodeURIComponent(orderNo)}/receipt`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'فشل في رفع الإيصال');
    }
    return res.json() as Promise<{ ok: boolean; receiptUrl: string; status: string }>;
  },

  payment: {
    applyPromo: (orderNo: string, promoCode: string) =>
      request<{
        ok: boolean;
        promoCode: string;
        discountInfo: string;
        originalPrice: number;
        discountAmount: number;
        newTotal: number;
        message: string;
      }>('/api/payment/apply-promo', {
        method: 'POST',
        body: JSON.stringify({ orderNo, promoCode }),
      }),

    initiate: (orderNo: string, method: 'card' | 'wallet' | 'fawry' = 'card', walletPhone?: string) =>
      request<{
        ok: boolean;
        amount: number;
        currency: string;
        paymentUrl?: string;
        redirectionUrl?: string;
        fawryCode?: string;
        paymentKey?: string;
      }>('/api/payment/paymob/initiate', {
        method: 'POST',
        body: JSON.stringify({ orderNo, method, walletPhone }),
      }),
  },

  // ─── Client Portal ────────────────────────────────────────────────────────────

  client: {
    me:       () => request<{ client: { id: number; name: string; email: string; phone: string } }>('/api/client/auth/me'),
    login:    (data: any) => request<{ id: number; name: string; email: string }>('/api/client/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: any) => request<{ id: number; name: string; email: string }>('/api/client/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    logout:   () => request('/api/client/auth/logout', { method: 'POST' }),
    forgotPassword: (email: string) => request<{ ok: boolean }>('/api/client/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword:  (data: any) => request<{ ok: boolean }>('/api/client/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
    
    orders:   () => request<{ orders: any[] }>('/api/client/dashboard/orders'),
    project:  (id: number) => request<any>(`/api/client/dashboard/projects/${id}`),
  },

  // ─── Admin ────────────────────────────────────────────────────────────────────

  admin: {
    analytics: () => request<Analytics>('/api/admin/analytics'),

    orders: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page)   q.set('page',   String(params.page));
      if (params?.limit)  q.set('limit',  String(params.limit));
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      return request<Paginated<Order>>(`/api/admin/orders?${q}`);
    },

    updateOrder: (id: number, data: Partial<Order>) =>
      request<Order>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteOrder: (id: number) =>
      request<void>(`/api/admin/orders/${id}`, { method: 'DELETE' }),

    approvePayment: (id: number, data: { amount: number; notes?: string }) =>
      request<{ ok: boolean; message: string; order: Order }>(`/api/admin/orders/${id}/approve-payment`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateQueueStatus: (id: number, data: { status: 'pending_approval' | 'waitlist' | 'rejected'; notes?: string }) =>
      request<{ ok: boolean; status: string; notes?: string }>(`/api/admin/orders/${id}/queue-status`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    invoiceUrl: (id: number) => `/api/admin/orders/${id}/invoice`,

    clients: (params?: { page?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page)   q.set('page',   String(params.page));
      if (params?.search) q.set('search', params.search);
      return request<Paginated<Client>>(`/api/admin/clients?${q}`);
    },

    client: (id: number) =>
      request<{
        client: Client;
        orders: any[];
        stats: {
          totalOrders: number;
          totalBudget: number;
          totalPaid: number;
          outstanding: number;
        };
      }>(`/api/admin/clients/${id}`),

    updateClient: (id: number, data: { name?: string; phone?: string; email?: string }) =>
      request<{ ok: boolean; message: string; client: Client }>(`/api/admin/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    setClientPassword: (id: number, password: string) =>
      request<{ ok: boolean; message: string }>(`/api/admin/clients/${id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),

    resetClientPassword: (id: number) =>
      request<{
        ok: boolean;
        tempPassword: string;
        clientName: string;
        clientPhone: string;
        clientEmail: string;
        message: string;
      }>(`/api/admin/clients/${id}/reset-password`, {
        method: 'POST',
      }),

    deleteClient: (id: number) =>
      request<{ ok: boolean; message: string }>(`/api/admin/clients/${id}`, {
        method: 'DELETE',
      }),

    projects: () => request<Project[]>('/api/admin/projects'),
    createProject: (data: { orderId: number; title: string }) =>
      request<Project>('/api/admin/projects', { method: 'POST', body: JSON.stringify(data) }),
    updateProject: (id: number, data: { progress?: number; status?: string; title?: string }) =>
      request<Project>(`/api/admin/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    revisions: (projectId: number) =>
      request<Revision[]>(`/api/admin/projects/${projectId}/revisions`),
    createRevision: (data: { projectId: number; title: string; description?: string }) =>
      request<Revision>('/api/admin/projects/revisions', { method: 'POST', body: JSON.stringify(data) }),
    updateRevision: (id: number, status: 'pending' | 'approved' | 'rejected') =>
      request<Revision>(`/api/admin/projects/revisions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

    projectFiles: (projectId: number) =>
      request<Array<{ id: number; originalName: string; storedName: string; mimeType: string; size: number; url: string }>>(
        `/api/admin/projects/${projectId}/files`,
      ),

    upload: (projectId: number, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return fetch(`/api/admin/projects/${projectId}/files`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      }).then(async r => {
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? `HTTP ${r.status}`); }
        return r.json();
      });
    },

    notifications: () => request<{ rows: Notification[]; unreadCount: number }>('/api/admin/notifications'),
    markRead:    (id: number) => request(`/api/admin/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: ()           => request('/api/admin/notifications/read-all',   { method: 'POST' }),

    activity: (params?: { page?: number }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      return request<Paginated<ActivityLogEntry>>(`/api/admin/activity?${q}`);
    },

    settings: () => request<{ site: SiteSettings }>('/api/admin/settings'),
    saveSettings: (key: string, data: SiteSettings) =>
      request<SiteSettings>(`/api/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
    testTelegram: () =>
      request<{ ok: boolean; message: string }>('/api/admin/settings/test-telegram', { method: 'POST' }),
    testEmail: () =>
      request<{ message: string }>('/api/admin/settings/test-email', { method: 'POST' }),

    // Promo Codes
    promo: {
      list:   () => request<PromoCode[]>('/api/admin/promo'),
      create: (data: Partial<PromoCode>) => request<PromoCode>('/api/admin/promo', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: Partial<PromoCode>) => request<PromoCode>(`/api/admin/promo/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id: number) => request<{ success: boolean }>(`/api/admin/promo/${id}`, { method: 'DELETE' }),
    },

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ ok: boolean }>('/api/admin/security/password', { method: 'PATCH', body: JSON.stringify(data) }),

    // Generic CRUD for packages/services/portfolio/testimonials
    crud: (resource: string) => ({
      list:   ()                      => request<unknown[]>(`/api/admin/${resource}`),
      create: (data: unknown)         => request<unknown>(`/api/admin/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: unknown) => request<unknown>(`/api/admin/${resource}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id: number)            => request(`/api/admin/${resource}/${id}`, { method: 'DELETE' }),
      reorder: (items: { id: number; sort_order: number }[]) => request<{ success: boolean }>(`/api/admin/${resource}/reorder`, { method: 'PATCH', body: JSON.stringify({ items }) }),
    }),

    exportOrdersUrl:  () => '/api/admin/export/orders',
    exportClientsUrl: () => '/api/admin/export/clients',
  },
} as const;
