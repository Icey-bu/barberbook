'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import BookingStepIndicator from '@/components/BookingStepIndicator';
import ServiceCard from '@/components/ServiceCard';
import TimeSlotPicker from '@/components/TimeSlotPicker';
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
          if (svc) {
            setSelectedService(svc);
            setStep(1);
          }
        }
      } catch {
        router.push(`/b/${params.barberSlug}`);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [params.barberSlug, preselectedServiceId, router]);

  // Fetch slots when date changes
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
    if (selectedDate && step === 1) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots, step]);

  const brandColor = barber?.brand_color ?? '#111827';

  // Min and max date for date picker
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
          client: {
            name: details.name,
            email: details.email,
            phone: details.phone || undefined,
          },
          notes: details.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.message ?? 'Something went wrong. Please try again.');
        return;
      }
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

  return (
    <div className="space-y-6">
      <BookingStepIndicator steps={STEPS} currentStep={step} brandColor={brandColor} />

      {/* Step 0: Service Selection */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Choose a Service</h2>
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
            <p className="text-gray-500 text-sm text-center py-8">No services available.</p>
          )}
          <button
            onClick={() => selectedService && setStep(1)}
            disabled={!selectedService}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: brandColor }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 1: Date & Time Selection */}
      {step === 1 && selectedService && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(0)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">Pick a Date & Time</h2>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 text-sm">
            <span className="text-gray-500">Service: </span>
            <span className="font-medium">{selectedService.name}</span>
            <span className="text-gray-500"> · {selectedService.duration_minutes} min</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              min={today}
              max={maxDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
            />
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Available Times</label>
              {slotsLoading ? (
                <LoadingSpinner size="sm" color={brandColor} />
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
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: brandColor }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Customer Details */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">Your Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={details.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
                placeholder="John Smith"
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={details.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                placeholder="john@example.com"
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ${errors.email ? 'border-red-300' : 'border-gray-200'}`}
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              <p className="mt-1 text-xs text-gray-400">Your confirmation will be sent here.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                placeholder="+1 (613) 555-0100"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes for barber (optional)</label>
              <textarea
                value={details.notes}
                onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                placeholder="e.g. Fade on sides, keep length on top..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 resize-none"
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
            </div>
          </div>

          <button
            onClick={() => {
              if (validateDetails()) setStep(3);
            }}
            className="w-full py-3.5 rounded-xl font-semibold text-white"
            style={{ backgroundColor: brandColor }}
          >
            Review Booking
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && selectedService && selectedSlot && barber && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(2)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">Confirm Booking</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-xs text-gray-500 mb-3">Appointment Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-gray-900">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedDate).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedSlot.startTime).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium text-gray-900">{selectedService.duration_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total price</span>
                  <span className="font-bold text-gray-900">${Number(selectedService.price).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Your Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{details.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{details.email}</span>
                </div>
                {details.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium">{details.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {barber.deposit_required && selectedService.deposit_value > 0 && (
              <div className="p-4 bg-amber-50">
                <p className="text-sm text-amber-800">
                  <strong>Deposit required: </strong>
                  {selectedService.deposit_type === 'fixed'
                    ? `$${Number(selectedService.deposit_value).toFixed(2)}`
                    : `${selectedService.deposit_value}% of total`}
                </p>
                <p className="text-xs text-amber-600 mt-1">You&apos;ll be redirected to a secure payment page.</p>
              </div>
            )}
          </div>

          {barber.cancellation_policy && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
              <strong>Cancellation Policy:</strong> {barber.cancellation_policy}
            </p>
          )}

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ backgroundColor: brandColor }}
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              barber.deposit_required && selectedService.deposit_value > 0
                ? 'Pay Deposit & Confirm'
                : 'Confirm Booking'
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
