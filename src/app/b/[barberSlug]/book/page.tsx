'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import BookingStepIndicator from '@/components/BookingStepIndicator';
import ServiceCard from '@/components/ServiceCard';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import BookingCalendar from '@/components/BookingCalendar';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { ServiceGroup, TimeSlot, Barber } from '@/types';

const STEPS = ['Service', 'Date & Time', 'Your Details', 'Confirm'] as const;
type Step = 0 | 1 | 2 | 3;

const clientDetailsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
type ClientDetails = z.infer<typeof clientDetailsSchema>;

export default function BookPage() {
  const params = useParams<{ barberSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get('service');

  const [step, setStep] = useState<Step>(0);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<ServiceGroup[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceGroup | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [details, setDetails] = useState<ClientDetails>({ name: '', email: '', phone: '', notes: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ClientDetails, string>>>({});
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch barber profile and services
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/public/barbers/${params.barberSlug}`);
        if (!res.ok) throw new Error('Not found');
        const json = await res.json();
        setBarber(json.data.barber);
        setServices(json.data.services);
        if (preselectedServiceId) {
          const svc = json.data.services.find((s: ServiceGroup) => s.id === preselectedServiceId);
          if (svc) { setSelectedService(svc); setStep(1); }
        }
      } catch {
        router.push(`/b/${params.barberSlug}`);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [params.barberSlug, preselectedServiceId, router]);

  // Fetch slots when date or service changes
  const fetchSlots = useCallback(async (date: string) => {
    if (!selectedService || !barber) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/public/availability/${params.barberSlug}?date=${date}&serviceId=${selectedService.id}`
      );
      const json = await res.json();
      setSlots(json.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedService, barber, params.barberSlug]);

  useEffect(() => {
    if (selectedDate && step === 1) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots, step]);

  const brandColor = barber?.brand_color ?? '#111827';

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + (barber?.max_advance_days ?? 30) * 86400_000)
    .toISOString().split('T')[0];

  function validateDetails(): boolean {
    const result = clientDetailsSchema.safeParse(details);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ClientDetails, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof ClientDetails;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit() {
    if (!validateDetails()) return;
    if (!selectedService || !selectedSlot || !barber) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberSlug: params.barberSlug,
          serviceId: selectedService.id,
          startTime: selectedSlot.startTime,
          client: { name: details.name, email: details.email, phone: details.phone || undefined },
          notes: details.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setSubmitError(json.message ?? 'Something went wrong. Please try again.'); return; }
      if (json.status === 'deposit_required') {
        window.location.href = json.checkoutUrl;
      } else {
        router.push(`/b/${params.barberSlug}/confirmation?booking_id=${json.booking.id}`);
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner color={brandColor} />
      </div>
    );
  }

  // ── Shared glass input class ────────────────────────────────
  const inputCls = (hasError?: boolean) =>
    `w-full glass-input rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${hasError ? 'border-red-300' : ''}`;

  return (
    <div className="space-y-4">
      <BookingStepIndicator steps={STEPS} currentStep={step} brandColor={brandColor} />

      {/* ── Step 0: Service Selection ───────────────────── */}
      {step === 0 && (
        <div className="space-y-4 slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Choose a Service</h2>
            <span className="text-xs text-gray-400">{services.length} available</span>
          </div>
          <div className="space-y-3">
            {services.map((svc) => (
              <ServiceCard
                key={svc.id}
                service={svc}
                selected={selectedService?.id === svc.id}
                brandColor={brandColor}
                onClick={() => setSelectedService(svc)}
              />
            ))}
          </div>
          {services.length === 0 && (
            <div className="glass-card rounded-2xl p-12 text-center text-gray-400 text-sm">
              No services available.
            </div>
          )}
          <button
            onClick={() => selectedService && setStep(1)}
            disabled={!selectedService}
            className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-[0.99] shadow-brand"
            style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 1: Date & Time ────────────────────────── */}
      {step === 1 && selectedService && (
        <div className="space-y-4 slide-up">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(0)}
              className="w-8 h-8 rounded-xl glass-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">Pick a Date & Time</h2>
          </div>

          {/* Selected service summary */}
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: brandColor }}
              />
              <span className="font-medium text-gray-800">{selectedService.name}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{selectedService.duration_minutes} min</span>
            </div>
            <span className="font-semibold text-gray-900">${Number(selectedService.price).toFixed(0)}</span>
          </div>

          {/* Interactive Calendar */}
          <BookingCalendar
            barberSlug={params.barberSlug}
            serviceId={selectedService.id}
            minDate={today}
            maxDate={maxDate}
            selectedDate={selectedDate}
            onDateSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
            brandColor={brandColor}
            barberId={barber?.id}
          />

          {/* Time Slots */}
          {selectedDate && (
            <div className="slide-up">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
                </label>
                {slots.length > 0 && (
                  <span className="text-xs text-gray-400">{slots.length} slots available</span>
                )}
              </div>
              {slotsLoading ? (
                <div className="glass-card rounded-2xl p-8 flex justify-center">
                  <LoadingSpinner size="sm" color={brandColor} />
                </div>
              ) : (
                <TimeSlotPicker
                  slots={slots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                  brandColor={brandColor}
                />
              )}
            </div>
          )}

          <button
            onClick={() => selectedSlot && setStep(2)}
            disabled={!selectedSlot}
            className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-[0.99] shadow-brand"
            style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Customer Details ───────────────────── */}
      {step === 2 && (
        <div className="space-y-4 slide-up">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="w-8 h-8 rounded-xl glass-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">Your Details</h2>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
              <input
                type="text"
                value={details.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
                placeholder="John Smith"
                className={inputCls(!!errors.name)}
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email *</label>
              <input
                type="email"
                value={details.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                placeholder="john@example.com"
                className={inputCls(!!errors.email)}
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              <p className="mt-1 text-xs text-gray-400">Confirmation will be sent here.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone <span className="font-normal text-gray-400 normal-case">(optional)</span></label>
              <input
                type="tel"
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                placeholder="+1 (613) 555-0100"
                className={inputCls()}
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes for barber <span className="font-normal text-gray-400 normal-case">(optional)</span></label>
              <textarea
                value={details.notes}
                onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                placeholder="e.g. Fade on sides, keep length on top..."
                rows={3}
                className={`${inputCls()} resize-none`}
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
            </div>
          </div>

          <button
            onClick={() => { if (validateDetails()) setStep(3); }}
            className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] shadow-brand"
            style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
          >
            Review Booking →
          </button>
        </div>
      )}

      {/* ── Step 3: Confirm ────────────────────────────── */}
      {step === 3 && selectedService && selectedSlot && barber && (
        <div className="space-y-4 slide-up">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(2)}
              className="w-8 h-8 rounded-xl glass-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">Confirm Booking</h2>
          </div>

          {/* Appointment summary card */}
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Brand header */}
            <div
              className="px-5 py-3"
              style={{ background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}08)` }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: brandColor }}>
                Appointment Summary
              </p>
            </div>

            <div className="p-5 space-y-3 text-sm">
              {[
                { label: 'Service', value: selectedService.name },
                { label: 'Date', value: new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }) },
                { label: 'Time', value: new Date(selectedSlot.startTime).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) },
                { label: 'Duration', value: `${selectedService.duration_minutes} min` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-xl text-gray-900">${Number(selectedService.price).toFixed(2)}</span>
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50/60 border-t border-gray-100 space-y-2 text-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Info</p>
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{details.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{details.email}</span></div>
              {details.phone && (
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{details.phone}</span></div>
              )}
            </div>

            {barber.deposit_required && selectedService.deposit_value > 0 && (
              <div
                className="px-5 py-4 flex items-start gap-3 border-t border-amber-100"
                style={{ background: 'rgba(251,191,36,0.08)' }}
              >
                <span className="text-lg">💳</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Deposit required:{' '}
                    {selectedService.deposit_type === 'fixed'
                      ? `$${Number(selectedService.deposit_value).toFixed(2)}`
                      : `${selectedService.deposit_value}% of total`}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">You&apos;ll be redirected to a secure payment page.</p>
                </div>
              </div>
            )}
          </div>

          {barber.cancellation_policy && (
            <div className="glass-card rounded-xl px-4 py-3 border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
              <p className="text-xs text-amber-800">
                <strong>Cancellation Policy:</strong> {barber.cancellation_policy}
              </p>
            </div>
          )}

          {submitError && (
            <div className="glass-card rounded-xl p-4 border-l-4 border-red-400">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70 hover:opacity-90 active:scale-[0.99] shadow-brand-lg text-base"
            style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              barber.deposit_required && selectedService.deposit_value > 0
                ? '💳 Pay Deposit & Confirm'
                : '✓ Confirm Booking'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            By confirming, you agree to the cancellation policy above.
          </p>
        </div>
      )}
    </div>
  );
}
