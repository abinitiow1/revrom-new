import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

interface FloatingWhatsAppProps {
  // If provided, clicking opens WhatsApp directly (external).
  // NOTE: In production we prefer gating via the Contact/Booking pages.
  phoneNumber?: string;
  // If provided, clicking navigates to this link instead (e.g. "#view=contact").
  href?: string;
  label?: string;
  bottomOffsetPx?: number;
  rightOffsetPx?: number;
}

const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber,
  href,
  label = 'Plan on WhatsApp',
  bottomOffsetPx = 20,
  rightOffsetPx = 20,
}) => {
  const cleanNumber = (phoneNumber || '').replace(/\D/g, '');
  const targetHref = href || (cleanNumber ? `https://wa.me/${cleanNumber}` : '');
  if (!targetHref) return null;
  const isExternal = !href && !!cleanNumber;

  return (
    <a
      href={targetHref}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={{
        bottom: `calc(${bottomOffsetPx}px + env(safe-area-inset-bottom))`,
        right: `calc(${rightOffsetPx}px + env(safe-area-inset-right))`,
      }}
      className="fixed z-[450] flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-110 transition-transform duration-300 group"
      aria-label={label}
      title={label}
    >
      <FaWhatsapp className="text-white w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" focusable="false" />
      <span className="hidden sm:block absolute right-16 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
        {label}
      </span>
    </a>
  );
};

export default FloatingWhatsApp;
