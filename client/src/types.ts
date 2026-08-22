// ─── Public Data ──────────────────────────────────────────────────────────────

export interface SiteSettings {
  brand:    string;
  phone:    string;
  email:    string;
  currency: string;
  whatsapp: string;
  telegram: string;
}

export interface Package {
  id:          number;
  title:       string;
  price:       number;
  description: string;
  features:    string[];  // parsed from JSON
  popular:     boolean;
  created_at:  string;
  updated_at:  string;
}

export interface Service {
  id:          number;
  title:       string;
  description: string;
  icon:        string;
  created_at:  string;
  updated_at:  string;
}

export interface PortfolioItem {
  id:          number;
  title:       string;
  category:    string;
  description: string;
  image_url:   string;
  created_at:  string;
  updated_at:  string;
}

export interface Testimonial {
  id:         number;
  name:       string;
  role:       string;
  content:    string;
  rating:     number;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface PublicData {
  site:         SiteSettings;
  packages:     Package[];
  services:     Service[];
  portfolio:    PortfolioItem[];
  testimonials: Testimonial[];
}

// ─── Admin Data ───────────────────────────────────────────────────────────────

export interface Client {
  id:           number;
  name:         string;
  phone:        string;
  email:        string;
  orders_count: number;
  created_at:   string;
  updated_at:   string;
}

export interface Order {
  id:            number;
  order_no:      string;
  client_id:     number;
  package_id:    number | null;
  service_id:    number | null;
  project_type:  string;
  notes:         string;
  status:        OrderStatus;
  budget:        number | null;
  deadline:      string | null;
  created_at:    string;
  updated_at:    string;
  // joined fields
  client_name:   string;
  client_phone:  string;
  client_email:  string;
  package_title: string | null;
  service_title: string | null;
}

export type OrderStatus =
  | 'new' | 'contacted' | 'approved' | 'payment_pending' | 'paid'
  | 'in_progress' | 'review' | 'revisions' | 'completed' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new:             'جديد',
  contacted:       'تم التواصل',
  approved:        'تم اعتماد العرض',
  payment_pending: 'بانتظار الدفع',
  paid:            'مدفوع',
  in_progress:     'قيد التنفيذ',
  review:          'مراجعة العميل',
  revisions:       'تعديلات',
  completed:       'مكتمل',
  cancelled:       'ملغى',
};

export interface Project {
  id:          number;
  order_id:    number;
  title:       string;
  progress:    number;
  status:      string;
  created_at:  string;
  updated_at:  string;
  // joined
  order_no:    string;
  client_name: string;
}

export interface Revision {
  id:          number;
  project_id:  number;
  title:       string;
  description: string;
  status:      'pending' | 'approved' | 'rejected';
  created_at:  string;
  updated_at:  string;
}

export interface UploadedFile {
  id:           number;
  originalName: string;
  storedName:   string;
  mimeType:     string;
  size:         number;
  url:          string;
}

export interface Notification {
  id:         number;
  title:      string;
  body:       string;
  type:       string;
  read:       number;
  created_at: string;
}

export interface ActivityLogEntry {
  id:         number;
  user_id:    number | null;
  username:   string | null;
  action:     string;
  entity:     string;
  entity_id:  number | null;
  metadata:   string;
  created_at: string;
}

export interface Analytics {
  total:    number;
  clients:  number;
  active:   number;
  revenue:  number;
  byStatus: Array<{ status: OrderStatus; count: number }>;
  recent:   Array<{ order_no: string; status: OrderStatus; created_at: string; client_name: string }>;
}

// ─── Paginated response ───────────────────────────────────────────────────────

export interface Paginated<T> {
  rows:  T[];
  total: number;
  page:  number;
  limit: number;
}

// ─── Tracker ──────────────────────────────────────────────────────────────────

export interface TrackerData {
  orderNo:      string;
  status:       OrderStatus;
  projectType:  string;
  packageTitle: string | null;
  serviceTitle: string | null;
  budget:       number | null;
  deadline:     string | null;
  createdAt:    string;
  project: {
    id:       number;
    title:    string;
    progress: number;
    status:   string;
  } | null;
  files: Array<{
    id:        number;
    name:      string;
    url:       string;
    mime:      string;
    size:      number;
    createdAt: string;
  }>;
  revisions: Array<{
    id:          number;
    title:       string;
    description: string;
    status:      string;
    created_at:  string;
  }>;
}
