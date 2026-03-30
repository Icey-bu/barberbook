-- ============================================================
-- BARBERBOOK MVP — Complete Database Schema
-- PostgreSQL 15+ / Supabase
-- ============================================================

-- ============================================================
-- ENUM TYPE DEFINITIONS
-- ============================================================

-- Lifecycle state of a booking appointment
CREATE TYPE booking_status AS ENUM (
  'booked',           -- Initial state: slot reserved, not yet confirmed
  'deposit_pending',  -- Waiting for Stripe deposit
  'confirmed',        -- Barber has confirmed / deposit paid
  'rescheduled',      -- Appointment was moved to a new date/time
  'cancelled',        -- Appointment was cancelled by barber or client
  'completed',        -- Service was rendered; appointment finished
  'no_show'           -- Client did not appear for the appointment
);

-- Financial state of payment associated with a booking
CREATE TYPE payment_status AS ENUM (
  'none',             -- No payment required or initiated
  'pending',          -- Payment initiated but not yet settled
  'paid',             -- Payment successfully captured
  'refunded',         -- Payment was reversed/refunded
  'failed'            -- Payment attempt failed
);

-- How a deposit is calculated for a service
CREATE TYPE deposit_type AS ENUM (
  'fixed',            -- Deposit is a fixed currency amount
  'percentage',       -- Deposit is a percentage of the service price
  'none'              -- No deposit required
);

-- Communication channel for outbound messages
CREATE TYPE message_channel AS ENUM (
  'email',
  'sms'
);

-- Category/purpose of an outbound message
CREATE TYPE message_type AS ENUM (
  'confirmation',     -- Sent immediately on booking
  'reminder_24h',     -- Sent 24 hours before appointment
  'reminder_1h',      -- Sent 1 hour before appointment
  'cancellation',     -- Sent when booking is cancelled
  'follow_up',        -- Sent after appointment completion
  'custom'            -- Ad hoc message sent by barber
);

-- Access role for system users
CREATE TYPE user_role AS ENUM (
  'admin',            -- Platform administrator with full access
  'barber'            -- Individual barber with access to their own data only
);

-- Delivery status for a sent message
CREATE TYPE message_delivery_status AS ENUM (
  'queued',           -- Message queued for sending
  'sent',             -- Message dispatched to provider
  'delivered',        -- Provider confirmed delivery
  'failed'            -- Delivery failed
);

-- ============================================================
-- TABLE: barbers
-- Public profile and configuration for a barber practitioner.
-- Uses Supabase Auth user_id as the link to auth.users
-- ============================================================
CREATE TABLE barbers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  bio                 TEXT,
  phone               TEXT,
  email               TEXT,
  avatar_url          TEXT,
  brand_color         TEXT NOT NULL DEFAULT '#111827',
  brand_logo_url      TEXT,
  location            TEXT,
  social_links        JSONB NOT NULL DEFAULT '{}',
  branding_settings   JSONB NOT NULL DEFAULT '{}',
  timezone            TEXT NOT NULL DEFAULT 'America/Toronto',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  is_published        BOOLEAN NOT NULL DEFAULT false,
  deposit_required    BOOLEAN NOT NULL DEFAULT true,
  deposit_type        deposit_type NOT NULL DEFAULT 'fixed',
  deposit_value       NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  cancellation_policy TEXT,
  min_advance_hours   INTEGER NOT NULL DEFAULT 2,
  max_advance_days    INTEGER NOT NULL DEFAULT 30,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT barbers_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_barbers_user_id ON barbers (user_id);
CREATE INDEX idx_barbers_slug ON barbers (slug);
CREATE INDEX idx_barbers_is_active ON barbers (is_active);
CREATE INDEX idx_barbers_is_published ON barbers (is_published);

-- ============================================================
-- TABLE: service_groups
-- Bookable service offerings that a barber provides
-- ============================================================
CREATE TABLE service_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id       UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price           NUMERIC(10,2) NOT NULL,
  deposit_type    deposit_type NOT NULL DEFAULT 'none',
  deposit_value   NUMERIC(10,2) NOT NULL DEFAULT 0,
  material_cost   NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url       TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_groups_barber_id ON service_groups (barber_id);
CREATE INDEX idx_service_groups_is_active ON service_groups (is_active);
CREATE INDEX idx_service_groups_display_order ON service_groups (display_order);

-- ============================================================
-- TABLE: availability_rules
-- Recurring weekly schedule for a barber
-- ============================================================
CREATE TABLE availability_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_rules_time_check CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_rules_barber_id ON availability_rules (barber_id);
CREATE INDEX idx_availability_rules_day ON availability_rules (day_of_week);

-- ============================================================
-- TABLE: blocked_times
-- Ad hoc unavailability on specific dates
-- ============================================================
CREATE TABLE blocked_times (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  start_time  TIME,         -- NULL means entire day blocked
  end_time    TIME,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocked_times_barber_id ON blocked_times (barber_id);
CREATE INDEX idx_blocked_times_date ON blocked_times (date);

-- ============================================================
-- TABLE: clients
-- Customers who have booked with a specific barber
-- ============================================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id       UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  notes           TEXT,
  total_visits    INTEGER NOT NULL DEFAULT 0,
  no_show_count   INTEGER NOT NULL DEFAULT 0,
  last_visit_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(barber_id, email)
);

CREATE INDEX idx_clients_barber_id ON clients (barber_id);
CREATE INDEX idx_clients_email ON clients (email);
CREATE INDEX idx_clients_barber_email ON clients (barber_id, email);

-- ============================================================
-- TABLE: bookings
-- Central transactional entity connecting barber + client + service
-- ============================================================
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id           UUID NOT NULL REFERENCES barbers(id) ON DELETE RESTRICT,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_group_id    UUID NOT NULL REFERENCES service_groups(id) ON DELETE RESTRICT,
  booking_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  status              booking_status NOT NULL DEFAULT 'booked',
  payment_status      payment_status NOT NULL DEFAULT 'none',
  deposit_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  customer_token      TEXT UNIQUE,           -- for unauthenticated access
  confirmation_code   TEXT UNIQUE,           -- human-readable e.g. BBK-7X4Q
  notes               TEXT,                  -- customer-supplied notes
  barber_notes        TEXT,                  -- internal barber notes
  cancellation_note   TEXT,
  stripe_session_id   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_check CHECK (start_time < end_time)
);

CREATE INDEX idx_bookings_barber_id ON bookings (barber_id);
CREATE INDEX idx_bookings_client_id ON bookings (client_id);
CREATE INDEX idx_bookings_service_group_id ON bookings (service_group_id);
CREATE INDEX idx_bookings_booking_date ON bookings (booking_date);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_barber_date ON bookings (barber_id, booking_date);
CREATE INDEX idx_bookings_stripe_session ON bookings (stripe_session_id);
CREATE INDEX idx_bookings_customer_token ON bookings (customer_token);
CREATE INDEX idx_bookings_confirmation_code ON bookings (confirmation_code);

-- ============================================================
-- TABLE: payment_records
-- Financial transaction detail for a booking
-- ============================================================
CREATE TABLE payment_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'stripe',
  provider_payment_id TEXT,     -- Stripe Payment Intent ID
  provider_session_id TEXT,     -- Stripe Checkout Session ID
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'cad',
  payment_type        TEXT NOT NULL DEFAULT 'deposit',  -- 'deposit' | 'full'
  status              payment_status NOT NULL DEFAULT 'pending',
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_records_booking_id ON payment_records (booking_id);
CREATE INDEX idx_payment_records_provider_session ON payment_records (provider_session_id);

-- ============================================================
-- TABLE: message_logs
-- Outbound communication log
-- ============================================================
CREATE TABLE message_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id       UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  message_type    message_type NOT NULL,
  channel         message_channel NOT NULL DEFAULT 'email',
  status          message_delivery_status NOT NULL DEFAULT 'queued',
  recipient_email TEXT,
  subject         TEXT,
  provider_id     TEXT,   -- Resend message ID
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_logs_barber_id ON message_logs (barber_id);
CREATE INDEX idx_message_logs_client_id ON message_logs (client_id);
CREATE INDEX idx_message_logs_booking_id ON message_logs (booking_id);
CREATE INDEX idx_message_logs_status ON message_logs (status);

-- ============================================================
-- TABLE: platform_config
-- Global platform configuration key-value store
-- ============================================================
CREATE TABLE platform_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;

CREATE OR REPLACE FUNCTION own_barber_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM barbers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- RLS POLICIES: barbers
-- ============================================================
-- Anyone can read active/published barber profiles (for public booking page)
CREATE POLICY "public_read_active_barbers" ON barbers
  FOR SELECT USING (is_active = true);

-- Barbers can update their own profile
CREATE POLICY "barber_update_own_profile" ON barbers
  FOR UPDATE USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "admin_full_barbers" ON barbers
  FOR ALL USING (is_admin());

-- ============================================================
-- RLS POLICIES: service_groups
-- ============================================================
-- Anyone can read active services
CREATE POLICY "public_read_active_services" ON service_groups
  FOR SELECT USING (is_active = true);

-- Barbers manage own services
CREATE POLICY "barber_manage_own_services" ON service_groups
  FOR ALL USING (barber_id = own_barber_id());

-- Admins have full access
CREATE POLICY "admin_full_services" ON service_groups
  FOR ALL USING (is_admin());

-- ============================================================
-- RLS POLICIES: availability_rules
-- ============================================================
CREATE POLICY "public_read_availability_rules" ON availability_rules
  FOR SELECT USING (true);

CREATE POLICY "barber_manage_own_availability" ON availability_rules
  FOR ALL USING (barber_id = own_barber_id());

CREATE POLICY "admin_full_availability" ON availability_rules
  FOR ALL USING (is_admin());

-- ============================================================
-- RLS POLICIES: blocked_times
-- ============================================================
CREATE POLICY "public_read_blocked_times" ON blocked_times
  FOR SELECT USING (true);

CREATE POLICY "barber_manage_own_blocked_times" ON blocked_times
  FOR ALL USING (barber_id = own_barber_id());

CREATE POLICY "admin_full_blocked_times" ON blocked_times
  FOR ALL USING (is_admin());

-- ============================================================
-- RLS POLICIES: clients
-- ============================================================
-- Barbers can only see their own clients
CREATE POLICY "barber_own_clients" ON clients
  FOR ALL USING (barber_id = own_barber_id());

-- Admins have full access
CREATE POLICY "admin_full_clients" ON clients
  FOR ALL USING (is_admin());

-- ============================================================
-- RLS POLICIES: bookings
-- ============================================================
-- Allow public INSERT (booking creation by anonymous customers)
CREATE POLICY "public_create_bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- Customers can read a booking only by its token
CREATE POLICY "customer_booking_by_token" ON bookings
  FOR SELECT USING (
    customer_token = current_setting('app.booking_token', true)
  );

-- Barbers can read/update their own bookings
CREATE POLICY "barber_own_bookings" ON bookings
  FOR SELECT USING (barber_id = own_barber_id());

CREATE POLICY "barber_update_own_bookings" ON bookings
  FOR UPDATE USING (barber_id = own_barber_id());

-- Admins have full access
CREATE POLICY "admin_full_bookings" ON bookings
  FOR ALL USING (is_admin());

-- ============================================================
-- RLS POLICIES: payment_records
-- ============================================================
CREATE POLICY "barber_read_own_payment_records" ON payment_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payment_records.booking_id
      AND bookings.barber_id = own_barber_id())
  );

CREATE POLICY "admin_full_payment_records" ON payment_records
  FOR ALL USING (is_admin());

-- Service role can insert payment records (from webhook)
CREATE POLICY "service_role_insert_payment_records" ON payment_records
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- RLS POLICIES: message_logs
-- ============================================================
CREATE POLICY "barber_read_own_message_logs" ON message_logs
  FOR SELECT USING (barber_id = own_barber_id());

CREATE POLICY "admin_full_message_logs" ON message_logs
  FOR ALL USING (is_admin());

CREATE POLICY "service_role_insert_message_logs" ON message_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- RLS POLICIES: platform_config
-- ============================================================
CREATE POLICY "anyone_read_platform_config" ON platform_config
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_platform_config" ON platform_config
  FOR ALL USING (is_admin());

-- ============================================================
-- TRIGGER FUNCTION: set_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_barbers_updated_at
  BEFORE UPDATE ON barbers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_groups_updated_at
  BEFORE UPDATE ON service_groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_availability_rules_updated_at
  BEFORE UPDATE ON availability_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blocked_times_updated_at
  BEFORE UPDATE ON blocked_times FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payment_records_updated_at
  BEFORE UPDATE ON payment_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER FUNCTION: sync_client_visit_stats
-- Updates total_visits and last_visit_at on client when booking completes
-- ============================================================
CREATE OR REPLACE FUNCTION sync_client_visit_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE clients
    SET total_visits = total_visits + 1,
        last_visit_at = now(),
        updated_at = now()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_sync_client_visits
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_client_visit_stats();

-- ============================================================
-- TRIGGER FUNCTION: increment_client_no_show
-- ============================================================
CREATE OR REPLACE FUNCTION increment_client_no_show()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'no_show' AND OLD.status IS DISTINCT FROM 'no_show' THEN
    UPDATE clients
    SET no_show_count = no_show_count + 1,
        updated_at = now()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_increment_no_show
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION increment_client_no_show();

-- ============================================================
-- TRIGGER FUNCTION: check_booking_conflict
-- Prevents double-booking same barber at same time
-- ============================================================
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE barber_id = NEW.barber_id
    AND booking_date = NEW.booking_date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status NOT IN ('cancelled', 'no_show')
    AND NEW.start_time < end_time
    AND NEW.end_time > start_time;
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: barber already has an active booking at that time.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_conflict_check
  BEFORE INSERT OR UPDATE OF barber_id, booking_date, start_time, end_time, status ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_conflict();

-- ============================================================
-- SEED DATA — Development baseline
-- ============================================================

-- Platform config defaults
INSERT INTO platform_config (key, value) VALUES
  ('default_deposit_amount', '20.00'),
  ('platform_name', '"BarberBook"'),
  ('support_email', '"support@barberbook.app"'),
  ('reminder_hours_before', '24');
