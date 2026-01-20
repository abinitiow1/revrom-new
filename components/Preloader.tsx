
import React from 'react';

const Preloader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      <div className="relative w-64 h-48 flex items-center justify-center">
        {/* Speed lines */}
        <div className="absolute w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-0 w-8 h-1 bg-brand-primary/20 rounded-full animate-speed-line-1"></div>
          <div className="absolute top-[60%] left-4 w-12 h-1 bg-brand-primary/10 rounded-full animate-speed-line-2"></div>
          <div className="absolute top-[40%] left-8 w-6 h-1 bg-brand-primary/30 rounded-full animate-speed-line-3"></div>
        </div>

        {/* Motorcycle SVG */}
        <div className="animate-motorcycle-ride flex flex-col items-center">
          <svg 
            width="160" 
            height="100" 
            viewBox="0 0 160 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-2xl"
          >
            {/* Rear Wheel */}
            <g className="animate-spin-wheel origin-[35px_75px]">
              <circle cx="35" cy="75" r="20" stroke="#333" strokeWidth="4" />
              <circle cx="35" cy="75" r="16" stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <path d="M35 55L35 95M15 75L55 75" stroke="#333" strokeWidth="2" />
            </g>
            
            {/* Front Wheel */}
            <g className="animate-spin-wheel origin-[125px_75px]">
              <circle cx="125" cy="75" r="20" stroke="#333" strokeWidth="4" />
              <circle cx="125" cy="75" r="16" stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <path d="M125 55L125 95M105 75L145 75" stroke="#333" strokeWidth="2" />
            </g>

            {/* Frame */}
            <path d="M35 75L60 75L80 50L110 50L125 75" stroke="#FF9100" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M80 50L100 25L120 25" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round" />
            <path d="M60 75L75 40H95L85 60" fill="#1A1A1A" />
            
            {/* Engine block */}
            <rect x="65" y="55" width="30" height="20" rx="4" fill="#333" />
            <path d="M70 55V75M80 55V75M90 55V75" stroke="#444" strokeWidth="2" />
            
            {/* Tank */}
            <path d="M75 40C75 30 105 30 105 40L95 50H75L75 40Z" fill="#FF9100" />
            
            {/* Seat */}
            <path d="M40 50H70C70 50 65 60 45 60L40 50Z" fill="#222" />
            
            {/* Handlebars */}
            <path d="M110 40L125 25M125 25H140" stroke="#333" strokeWidth="3" strokeLinecap="round" />
          </svg>
          
          {/* Ground shadow */}
          <div className="w-24 h-1.5 bg-black/40 rounded-full blur-sm mt-1 animate-shadow-pulse"></div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <h2 className="text-white font-black italic tracking-tighter text-2xl uppercase">Getting things ready...</h2>
        <div className="flex gap-1 mt-2">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
        </div>
        <p className="text-brand-primary text-[10px] font-black uppercase tracking-[0.4em] mt-4 opacity-50">Revrom Adventures • Explore With Locals</p>
      </div>

      <style>{`
        @keyframes spin-wheel {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes motorcycle-ride {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-1deg); }
          75% { transform: translateY(1px) rotate(1deg); }
        }
        @keyframes shadow-pulse {
          0%, 100% { transform: scaleX(1); opacity: 0.4; }
          50% { transform: scaleX(1.2); opacity: 0.2; }
        }
        @keyframes speed-line {
          0% { transform: translateX(200px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(-100px); opacity: 0; }
        }
        .animate-spin-wheel { animation: spin-wheel 0.4s linear infinite; }
        .animate-motorcycle-ride { animation: motorcycle-ride 0.3s ease-in-out infinite; }
        .animate-shadow-pulse { animation: shadow-pulse 0.3s ease-in-out infinite; }
        .animate-speed-line-1 { animation: speed-line 0.5s linear infinite; }
        .animate-speed-line-2 { animation: speed-line 0.7s linear infinite [animation-delay:0.2s]; }
        .animate-speed-line-3 { animation: speed-line 0.4s linear infinite [animation-delay:0.1s]; }
      `}</style>
    </div>
  );
};

export default Preloader;
