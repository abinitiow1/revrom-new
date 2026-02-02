import React from 'react';

interface FloatingWhatsAppProps {
  phoneNumber: string;
  bottomOffsetPx?: number;
  rightOffsetPx?: number;
}

const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ phoneNumber, bottomOffsetPx = 20, rightOffsetPx = 20 }) => {
  // Ensure we only have numbers for the link
  const cleanNumber = (phoneNumber || '').replace(/\D/g, '');
  if (!cleanNumber) return null;
  const whatsappUrl = `https://wa.me/${cleanNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        bottom: `calc(${bottomOffsetPx}px + env(safe-area-inset-bottom))`,
        right: `calc(${rightOffsetPx}px + env(safe-area-inset-right))`,
      }}
      className="fixed z-[450] flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-110 transition-transform duration-300 group"
      aria-label="Plan on WhatsApp"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="text-white w-7 h-7 sm:w-8 sm:h-8"
        fill="currentColor"
      >
        <path d="M19.11 17.26c-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.64.14-.18.28-.73.91-.9 1.1-.16.18-.32.2-.6.07-.28-.14-1.18-.43-2.24-1.37-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.46-.48-.64-.49h-.55c-.2 0-.5.07-.76.35-.26.28-1 1-1 2.44s1.02 2.83 1.16 3.03c.14.2 2.01 3.07 4.86 4.3.68.29 1.2.46 1.61.59.68.22 1.3.19 1.79.12.55-.08 1.66-.68 1.9-1.34.23-.66.23-1.23.16-1.34-.07-.12-.26-.2-.55-.35z" />
        <path d="M26.67 5.33A14.53 14.53 0 0 0 16.01 1C8.19 1 1.86 7.33 1.86 15.14c0 2.49.65 4.92 1.89 7.07L1.75 31l8.94-1.95a14.1 14.1 0 0 0 5.31 1.01h.01c7.82 0 14.15-6.33 14.15-14.15 0-3.78-1.47-7.34-4.1-10.58zM16.01 27.9h-.01c-1.69 0-3.35-.45-4.8-1.29l-.34-.2-5.3 1.15 1.13-5.16-.22-.34a11.79 11.79 0 0 1-1.86-6.32C4.61 9 9.87 3.75 16 3.75c3.16 0 6.13 1.23 8.37 3.48a11.77 11.77 0 0 1 3.45 8.32c0 6.49-5.28 11.79-11.81 11.79z" />
      </svg>
      <span className="hidden sm:block absolute right-16 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
        Plan on WhatsApp
      </span>
    </a>
  );
};

export default FloatingWhatsApp;
