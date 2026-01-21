import React from 'react';
import { FaWhatsapp } from "react-icons/fa";

interface FloatingWhatsAppProps {
  phoneNumber: string;
  bottomOffsetPx?: number;
  rightOffsetPx?: number;
}

const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ phoneNumber, bottomOffsetPx = 20, rightOffsetPx = 20 }) => {
  // Ensure we only have numbers for the link
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ bottom: bottomOffsetPx, right: rightOffsetPx }}
      className="fixed z-[450] flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-110 transition-transform duration-300 group"
      aria-label="Chat on WhatsApp"
    >
      <FaWhatsapp className="text-white text-3xl" />
      <span className="absolute right-16 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
        Chat with us
      </span>
    </a>
  );
};

export default FloatingWhatsApp;
