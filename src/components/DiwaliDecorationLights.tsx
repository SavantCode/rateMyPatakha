"use client";

import React from "react";

/**
 * High-craft Festive Diwali Fairy String Lights, Marigold Toran & Swaying Akash Kandils.
 * Uses `preserveAspectRatio="xMidYMin slice"` so fairy bulbs remain circular on all mobile & desktop screens.
 */
export default function DiwaliDecorationLights() {
  const scallops = [0, 1, 2, 3, 4, 5, 6, 7];

  const getBezierPoint = (
    t: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
    const y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
    return { x, y };
  };

  const bulbSteps = [0.15, 0.32, 0.5, 0.68, 0.85];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Top Warm Ambient Ceiling Glow */}
      <div className="w-full h-16 bg-gradient-to-b from-[#FF9F1C]/35 via-[#FFE600]/10 to-transparent" />

      {/* Main Scalloped Fairy Lights Garland SVG */}
      <svg
        viewBox="0 0 1600 115"
        preserveAspectRatio="xMidYMin slice"
        className="-mt-16 w-full h-[76px] sm:h-[96px] md:h-[110px] drop-shadow-[0_6px_16px_rgba(255,159,28,0.55)]"
      >
        <defs>
          <radialGradient id="diwaliBulbHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="35%" stopColor="#FFE600" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#FF7B00" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FF7B00" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Top Festive Maroon & Gold Border Bar */}
        <rect x="0" y="0" width="1600" height="8" fill="#4A1238" />
        <line x1="0" y1="8" x2="1600" y2="8" stroke="#FFE600" strokeWidth="2.5" />

        {scallops.map((idx) => {
          const span = 1600 / scallops.length;
          const x0 = idx * span;
          const x2 = (idx + 1) * span;
          const x1 = (x0 + x2) / 2;
          const y0 = 8;
          const y1 = 86;
          const y2 = 8;

          return (
            <g key={idx}>
              {/* Background secondary swag wire */}
              <path
                d={`M ${x0} ${y0} Q ${x1} ${y1 + 20} ${x2} ${y2}`}
                fill="none"
                stroke="#4A1238"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeOpacity="0.65"
              />

              {/* Primary scalloped maroon wire */}
              <path
                d={`M ${x0} ${y0} Q ${x1} ${y1} ${x2} ${y2}`}
                fill="none"
                stroke="#4A1238"
                strokeWidth="3.5"
              />

              {/* Marigold flower clusters at each swag junction */}
              <circle cx={x0} cy="12" r="7" fill="#FF7B00" stroke="#4A1238" strokeWidth="1.5" />
              <circle cx={x0} cy="12" r="3.5" fill="#FFE600" />

              {/* Glowing Fairy Light Bulbs */}
              {bulbSteps.map((t, bIdx) => {
                const pt = getBezierPoint(t, x0, y0, x1, y1, x2, y2);
                const isEven = (idx + bIdx) % 2 === 0;
                return (
                  <g
                    key={bIdx}
                    className={
                      isEven ? "animate-bulb-twinkle" : "animate-bulb-twinkle-slow"
                    }
                  >
                    {/* Cord cap */}
                    <rect
                      x={pt.x - 2.5}
                      y={pt.y}
                      width="5"
                      height="5"
                      rx="1"
                      fill="#4A1238"
                    />
                    {/* Warm Glow Halo */}
                    <circle
                      cx={pt.x}
                      cy={pt.y + 8}
                      r="15"
                      fill="url(#diwaliBulbHalo)"
                    />
                    {/* Outer Tangerine Ring */}
                    <circle
                      cx={pt.x}
                      cy={pt.y + 8}
                      r="6.5"
                      fill="#FF7B00"
                      stroke="#4A1238"
                      strokeWidth="1.2"
                    />
                    {/* Inner Bright Yellow Core */}
                    <circle cx={pt.x} cy={pt.y + 8} r="3.8" fill="#FFFBEB" />
                  </g>
                );
              })}

              {/* Vertical hanging drop light between scallops */}
              <line
                x1={x2}
                y1="8"
                x2={x2}
                y2="42"
                stroke="#4A1238"
                strokeWidth="2.5"
              />
              <circle cx={x2} cy="48" r="14" fill="url(#diwaliBulbHalo)" />
              <circle
                cx={x2}
                cy="48"
                r="6.5"
                fill="#EF233C"
                stroke="#4A1238"
                strokeWidth="1.5"
              />
              <circle cx={x2} cy="48" r="3.2" fill="#FFE600" />
            </g>
          );
        })}
      </svg>

      {/* Left Hanging Akash Kandil Lantern (Scaled cleanly for mobile & desktop) */}
      <div className="absolute top-1 left-2 sm:left-6 animate-lantern-swing origin-top scale-75 sm:scale-95 md:scale-100">
        <svg width="64" height="145" viewBox="0 0 64 145" fill="none">
          <line x1="32" y1="0" x2="32" y2="24" stroke="#4A1238" strokeWidth="3" />
          <path d="M16 38 L32 22 L48 38" stroke="#4A1238" strokeWidth="2.5" fill="none" />
          <rect x="14" y="36" width="36" height="10" rx="2.5" fill="#EF233C" stroke="#4A1238" strokeWidth="2.5" />
          <rect x="10" y="46" width="44" height="32" rx="14" fill="#38BDF8" stroke="#4A1238" strokeWidth="2.5" />
          <circle cx="22" cy="62" r="9.5" fill="#FF9F1C" stroke="#4A1238" strokeWidth="2.5" />
          <circle cx="22" cy="62" r="4.5" fill="#FFE600" />
          <circle cx="42" cy="62" r="9.5" fill="#FF9F1C" stroke="#4A1238" strokeWidth="2.5" />
          <circle cx="42" cy="62" r="4.5" fill="#FFE600" />
          <rect x="14" y="78" width="36" height="10" rx="2.5" fill="#EF233C" stroke="#4A1238" strokeWidth="2.5" />
          {[17, 23, 29, 35, 41, 47].map((x) => (
            <line
              key={x}
              x1={x}
              y1="88"
              x2={x}
              y2="132"
              stroke={x % 2 === 0 ? "#EF233C" : "#FFE600"}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

      {/* Right Hanging Akash Kandil Lantern */}
      <div className="absolute top-1 right-2 sm:right-6 animate-lantern-swing origin-top scale-75 sm:scale-95 md:scale-100">
        <svg width="64" height="145" viewBox="0 0 64 145" fill="none">
          <line x1="32" y1="0" x2="32" y2="24" stroke="#4A1238" strokeWidth="3" />
          <path d="M16 38 L32 22 L48 38" stroke="#4A1238" strokeWidth="2.5" fill="none" />
          <rect x="14" y="36" width="36" height="10" rx="2.5" fill="#EF233C" stroke="#4A1238" strokeWidth="2.5" />
          <rect x="10" y="46" width="44" height="32" rx="14" fill="#38BDF8" stroke="#4A1238" strokeWidth="2.5" />
          <circle cx="22" cy="62" r="9.5" fill="#FF9F1C" stroke="#4A1238" strokeWidth="2.5" />
          <circle cx="22" cy="62" r="4.5" fill="#FFE600" />
          <circle cx="42" cy="62" r="9.5" fill="#FF9F1C" stroke="#4A1238" strokeWidth="2.5" />
          <circle cx="42" cy="62" r="4.5" fill="#FFE600" />
          <rect x="14" y="78" width="36" height="10" rx="2.5" fill="#EF233C" stroke="#4A1238" strokeWidth="2.5" />
          {[17, 23, 29, 35, 41, 47].map((x) => (
            <line
              key={x}
              x1={x}
              y1="88"
              x2={x}
              y2="132"
              stroke={x % 2 === 0 ? "#EF233C" : "#FFE600"}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}