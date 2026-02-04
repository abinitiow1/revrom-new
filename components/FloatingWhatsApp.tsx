import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

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
      <FaWhatsapp className="text-white w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" focusable="false" />
      <span className="hidden sm:block absolute right-16 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
        Plan on WhatsApp
      </span>
    </a>
  );
};

export default FloatingWhatsApp;
