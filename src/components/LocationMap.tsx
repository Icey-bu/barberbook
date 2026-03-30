'use client';

interface Props {
  address: string;
  barberName: string;
  brandColor?: string;
}

export default function LocationMap({ address, barberName, brandColor = '#111827' }: Props) {
  const encodedAddress = encodeURIComponent(address);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  // Embed URL — works without an API key for basic display
  const embedUrl = `https://maps.google.com/maps?q=${encodedAddress}&output=embed&z=15`;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        Location
      </h3>

      {/* Embedded map */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <iframe
          src={embedUrl}
          width="100%"
          height="200"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map showing location of ${barberName}`}
        />
      </div>

      {/* Address + directions link */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <p className="text-sm text-gray-600">{address}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold ml-3 flex-shrink-0 flex items-center gap-1"
          style={{ color: brandColor }}
        >
          Directions
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
