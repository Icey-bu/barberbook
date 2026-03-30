// ─── Enums ───────────────────────────────────────────────────────────────────

export enum BookingStatus {
  BOOKED = 'booked',
  DEPOSIT_PENDING = 'deposit_pending',
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  NONE = 'none',
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum DepositType {
  NONE = 'none',
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export enum MessageType {
  CONFIRMATION = 'confirmation',
  REMINDER_24H = 'reminder_24h',
  REMINDER_1H = 'reminder_1h',
  CANCELLATION = 'cancellation',
  FOLLOW_UP = 'follow_up',
  CUSTOM = 'custom',
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Barber {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  bio: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  brand_color: string;
  brand_logo_url: string | null;
  location: string | null;
  social_links: Record<string, string>;
  branding_settings: Record<string, unknown>;
  timezone: string;
  is_active: boolean;
  is_published: boolean;
  deposit_required: boolean;
  deposit_type: DepositType;
  deposit_value: number;
  cancellation_policy: string | null;
  min_advance_hours: number;
  max_advance_days: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceGroup {
  id: string;
  barber_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  deposit_type: DepositType;
  deposit_value: number;
  material_cost: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: string;
  barber_id: string;
  day_of_week: DayOfWeek;
  start_time: string;   // "HH:MM:SS"
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockedTime {
  id: string;
  barber_id: string;
  date: string;         // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  barber_id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  total_visits: number;
  no_show_count: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  barber_id: string;
  client_id: string;
  service_group_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  deposit_amount: number;
  customer_token: string | null;
  confirmation_code: string | null;
  notes: string | null;
  barber_notes: string | null;
  cancellation_note: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  provider: string;
  provider_payment_id: string | null;
  provider_session_id: string | null;
  amount: number;
  currency: string;
  payment_type: string;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MessageLog {
  id: string;
  barber_id: string;
  client_id: string;
  booking_id: string | null;
  message_type: MessageType;
  channel: 'email' | 'sms';
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  recipient_email: string | null;
  subject: string | null;
  provider_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface TimeSlot {
  startTime: string;  // ISO datetime
  endTime: string;
  available: boolean;
}

export interface BookingWithRelations extends Booking {
  service?: ServiceGroup;
  client?: Client;
  barber?: Barber;
}

export interface PublicBarberProfile {
  barber: Pick<Barber, 'id' | 'slug' | 'name' | 'bio' | 'phone' | 'avatar_url' | 'brand_color' | 'location' | 'cancellation_policy' | 'min_advance_hours' | 'max_advance_days' | 'deposit_required' | 'deposit_type' | 'deposit_value'>;
  services: ServiceGroup[];
}

// ─── Form / Request Types ─────────────────────────────────────────────────────

export interface CreateBookingRequest {
  barberSlug: string;
  serviceId: string;
  startTime: string;
  client: {
    name: string;
    email: string;
    phone?: string;
  };
  notes?: string;
}

export interface CreateBookingResponseDirect {
  status: 'confirmed';
  booking: {
    id: string;
    confirmationCode: string;
    startTime: string;
    endTime: string;
    service: { name: string; durationMinutes: number; price: number };
    barber: { displayName: string; avatarUrl: string | null };
  };
}

export interface CreateBookingResponseDeposit {
  status: 'deposit_required';
  checkoutUrl: string;
  bookingId: string;
  expiresAt: string;
}

export type CreateBookingResponse = CreateBookingResponseDirect | CreateBookingResponseDeposit;
