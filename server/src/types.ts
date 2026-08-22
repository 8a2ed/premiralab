import type { Request } from 'express';

// ─── DB Row Types ──────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export interface SiteSettings {
  brand: string;
  phone: string;
  email: string;
  currency: string;
  whatsapp: string;
  telegram: string;
}

export interface Package {
  id: number;
  title: string;
  price: number;
  description: string;
  features: string; // JSON string stored in DB
  popular: number;  // 0 | 1
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  title: string;
  description: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  description: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  order_no: string;
  client_id: number;
  package_id: number | null;
  service_id: number | null;
  project_type: string;
  notes: string;
  status: string;
  budget: number | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow extends Order {
  client_name: string;
  client_phone: string;
  client_email: string;
  package_title: string | null;
  service_title: string | null;
}

export interface Project {
  id: number;
  order_id: number;
  title: string;
  progress: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow extends Project {
  order_no: string;
  client_name: string;
}

export interface Revision {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: string; // pending | approved | rejected
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: number;
  project_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  read: number; // 0 | 1
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  metadata: string; // JSON string
  created_at: string;
}

// ─── Express Extensions ────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// ─── JWT Payload ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}
