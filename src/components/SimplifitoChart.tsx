import React from 'react';

interface SimplifitoChartProps {
  totalEntradas: number;
  totalSaidas: number;
}

export const SimplifitoChart: React.FC<SimplifitoChartProps> = ({
  totalEntradas,
  totalSaidas
}) => {
  // Calculate expenses to income ratio (default to 0 if no entries)
  const ratio = totalEntradas > 0 
    ? Math.min(100, Math.round((totalSaidas / totalEntradas) * 100)) 
    : 0;

  const remaining = 100 - ratio;

  // Calculate needle rotation angle:
  // 0% ratio points left (-180deg)
  // 100% ratio points right (0deg)
  const needleAngle = -180 + (ratio / 100) * 180;

  return (
    <div className="w-full glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-2xs select-none">
      
      {/* Widget Layout */}
      <div className="flex items-center justify-between gap-2">
        
        {/* Left Side: Spent stats */}
        <div className="text-left flex-1 min-w-[70px]">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Comprometido
          </p>
          <span className="text-xl font-black text-rose-500 block mt-0.5">
            {ratio}%
          </span>
          <p className="text-[8px] text-slate-400 font-semibold leading-tight mt-0.5">
            das receitas
          </p>
        </div>

        {/* Center: SVG Gauge Speedometer */}
        <div className="w-32 h-20 shrink-0 relative flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 60">
            <defs>
              {/* Premium Gradient representing safe-to-danger color arcs */}
              <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f08622" />  {/* Orange */}
                <stop offset="25%" stopColor="#facc15" /> {/* Yellow */}
                <stop offset="50%" stopColor="#38bdf8" /> {/* Cyan */}
                <stop offset="75%" stopColor="#34d399" /> {/* Emerald */}
                <stop offset="100%" stopColor="#a855f7" />{/* Purple */}
              </linearGradient>
            </defs>

            {/* Gauge Background Track Arc */}
            <path
              d="M 15,50 A 35,35 0 0,1 85,50"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Gauge Colored Gradient Arc */}
            <path
              d="M 15,50 A 35,35 0 0,1 85,50"
              fill="none"
              stroke="url(#gauge-gradient)"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Gauge Divider ticks overlays (draw mock white gaps between blocks) */}
            <path d="M 31,23 L 36,28" stroke="white" strokeWidth="2.5" />
            <path d="M 50,15 L 50,21" stroke="white" strokeWidth="2.5" />
            <path d="M 69,23 L 64,28" stroke="white" strokeWidth="2.5" />

            {/* Center Pin Indicator */}
            <circle cx="50" cy="50" r="4.5" fill="#1e293b" />
            <circle cx="50" cy="50" r="2" fill="white" />

            {/* Gauge Needle Pointer */}
            <polygon
              points="49,50 51,50 50,17"
              fill="#1e293b"
              className="origin-[50px_50px] transition-transform duration-700 ease-out"
              style={{ transform: `rotate(${needleAngle}deg)` }}
            />
          </svg>
        </div>

        {/* Right Side: Remaining stats */}
        <div className="text-right flex-1 min-w-[70px]">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Livre / Sobra
          </p>
          <span className="text-xl font-black text-emerald-500 block mt-0.5">
            {remaining}%
          </span>
          <p className="text-[8px] text-slate-400 font-semibold leading-tight mt-0.5">
            para poupar
          </p>
        </div>

      </div>

    </div>
  );
};
