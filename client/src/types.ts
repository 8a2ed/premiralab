// ─── Public Data ──────────────────────────────────────────────────────────────

export interface SiteSettings {
  brand:                string;
  phone:                string;
  email:                string;
  currency:             string;
  whatsapp:             string;
  telegram:             string;
  telegram_bot_token?:  string;
  telegram_chat_id?:    string;
  instapay_username?:   string;
  vodafone_cash?:       string;
  bank_details?:        string;
  payment_instructions?: string;
  google_analytics_id?: string;
  meta_pixel_id?:       string;
  smtp_host?:           string;
  smtp_port?:           string;
  smtp_user?:           string;
  smtp_pass?:           string;
  smtp_from_name?:      string;
  smtp_from_email?:     string;
  // --- Paymob Gateway Settings ---
  paymob_enabled?:             boolean;
  paymob_api_key?:             string;
  paymob_public_key?:          string;
  paymob_secret_key?:          string;
  paymob_integration_id_card?: string;
  paymob_integration_id_wallet?: string;
  paymob_integration_id_fawry?: string;
  paymob_iframe_id?:           string;
  paymob_hmac_secret?:         string;
  paymob_currency?:            string;
  paymob_test_mode?:           boolean;
  // --- Appearance & Hero Settings ---
  logo_url?:            string;
  favicon_url?:         string;
  primary_color?:       string;
  accent_color?:        string;
  hero_badge?:          string;
  hero_title?:          string;
  hero_subtitle?:       string;
  hero_primary_btn?:    string;
  hero_secondary_btn?:  string;
  hero_trust_1?:        string;
  hero_trust_2?:        string;
  // --- Live Metrics / Stats ---
  stat_1_num?:          string;
  stat_1_label?:        string;
  stat_2_num?:          string;
  stat_2_label?:        string;
  stat_3_num?:          string;
  stat_3_label?:        string;
  stat_4_num?:          string;
  stat_4_label?:        string;
  // --- Section Headings & Subtitles ---
  testimonials_eyebrow?: string;
  testimonials_title?:   string;
  testimonials_subtitle?: string;
  services_eyebrow?:    string;
  services_title?:      string;
  services_subtitle?:   string;
  packages_eyebrow?:    string;
  packages_title?:      string;
  packages_subtitle?:   string;
  portfolio_eyebrow?:   string;
  portfolio_title?:     string;
  portfolio_subtitle?:  string;
  faqs_eyebrow?:        string;
  faqs_title?:          string;
  faqs_subtitle?:       string;
  // --- Bottom CTA Banner ---
  cta_badge?:           string;
  cta_title?:           string;
  cta_desc?:            string;
  cta_btn_primary?:     string;
  cta_btn_wa?:          string;
  about_text?:          string;
  footer_text?:         string;
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

export interface FAQ { id: number; question: string; answer: string; sort_order?: number; }

export interface PublicData {
  faqs?: FAQ[];
  site:         SiteSettings;
  packages:     Package[];
  services:     Service[];
  portfolio:    PortfolioItem[];
  testimonials: Testimonial[];
}

// ─── Admin Data ───────────────────────────────────────────────────────────────

export interface Client {
  id:            number;
  name:          string;
  phone:         string;
  email:         string;
  orders_count?: number;
  has_password?: number | boolean;
  total_spent?:  number;
  active_orders?: number;
  created_at:    string;
  updated_at:    string;
}

export interface Order {
  id:                     number;
  order_no:               string;
  client_id:              number;
  package_id:             number | null;
  service_id:             number | null;
  project_type:           string;
  notes:                  string;
  status:                 OrderStatus;
  payment_status?:        'pending_approval' | 'approved_for_payment' | 'paid' | 'waitlist' | 'rejected';
  payment_amount?:        number;
  payment_approved_at?:   string;
  review_notes?:          string;
  budget:                 number | null;
  paid_amount?:           number;
  payment_receipt?:       string;
  payment_method?:        string;
  payment_transaction_id?: string;
  deadline:               string | null;
  promo_code?:            string;
  promo_discount?:        string;
  created_at:             string;
  updated_at:             string;
  // joined fields
  client_name:            string;
  client_phone:           string;
  client_email:           string;
  package_title:          string | null;
  package_price?:         number;
  service_title:          string | null;
}

export type OrderRow = Order;

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
  totalCollected?: number;
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

export interface PromoCode {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface TrackerData {
  orderNo:         string;
  status:          OrderStatus;
  clientName?:     string;
  clientPhone?:    string;
  clientEmail?:    string;
  notes?:          string;
  paymentStatus?:  'pending_approval' | 'approved_for_payment' | 'paid' | 'waitlist' | 'rejected';
  paymentAmount?:  number;
  paymentApprovedAt?: string;
  paymentTransactionId?: string;
  reviewNotes?:    string;
  projectType:     string;
  packageTitle:    string | null;
  packagePrice?:   number;
  serviceTitle:    string | null;
  budget?:         number | null;
  paidAmount?:     number;
  promoCode?:      string | null;
  promoDiscount?:  string | null;
  paymentReceipt?: string | null;
  paymentMethod?:  string;
  deadline:        string | null;
  createdAt:       string;
  companyInfo?: {
    brand?:       string;
    email?:       string;
    phone?:       string;
    whatsapp?:    string;
    address?:     string;
    taxNumber?:   string;
    currency?:    string;
  };
  paymentInfo?: {
    paymobEnabled?:       boolean;
    instapayUsername?:    string;
    vodafoneCash?:        string;
    bankDetails?:         string;
    paymentInstructions?: string;
    currency?:            string;
  };
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

export interface ClientData {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export interface ClientOrder {
  id: number;
  order_no: string;
  status: string;
  created_at: string;
  budget: number | null;
  package_title: string | null;
  service_title: string | null;
  project_id: number | null;
  progress: number | null;
}
