import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  withBg?: boolean;
}

export default function Logo({ className = "w-8 h-8", showText = false, withBg = false }: LogoProps) {
  const svgContent = (
    <svg
      viewBox="0 0 400 400"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background container if requested */}
      {withBg && (
        <rect width="400" height="400" rx="95" fill="#1BC2A4" />
      )}
      
      {/* Group centered */}
      <g transform={withBg ? "translate(35, 40) scale(0.82)" : "translate(0, 0)"}>
        {/* Top Left Green Segment */}
        <path
          d="M 120 200 A 80 80 0 0 1 200 120 L 200 60 A 140 140 0 0 0 60 200 Z"
          fill="#86EFAC"
          stroke="#059669"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        {/* Top Right Orange Segment */}
        <path
          d="M 200 120 A 80 80 0 0 1 280 200 L 340 200 A 140 140 0 0 0 200 60 Z"
          fill="#FED7AA"
          stroke="#EA580C"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        {/* Bottom Right Red/Pink Segment */}
        <path
          d="M 280 200 A 80 80 0 0 1 200 280 L 200 340 A 140 140 0 0 0 340 200 Z"
          fill="#FECACA"
          stroke="#DC2626"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        {/* Bottom Left Blue Segment */}
        <path
          d="M 200 280 A 80 80 0 0 1 120 200 L 60 200 A 140 140 0 0 0 200 340 Z"
          fill="#93C5FD"
          stroke="#2563EB"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        
        {/* Wrench in Center */}
        {/* Centered at 200, 200, rotated towards top-right */}
        <g transform="translate(200, 200) rotate(135) translate(-200, -200)">
          {/* Handle */}
          <rect
            x="185"
            y="200"
            width="30"
            height="100"
            rx="15"
            fill="#C084FC"
            stroke="#7E22CE"
            strokeWidth="10"
          />
          {/* Wrench Head */}
          <path
            d="M 160 200 C 160 160 240 160 240 200 C 240 215 220 220 200 220 C 180 220 160 215 160 200 Z"
            fill="#C084FC"
            stroke="#7E22CE"
            strokeWidth="10"
          />
          {/* Inner jaw cut */}
          <rect
            x="188"
            y="160"
            width="24"
            height="32"
            rx="4"
            fill="#1BC2A4"
            stroke="#7E22CE"
            strokeWidth="10"
          />
        </g>
        
        {/* Small orange dots from the logo design */}
        <circle cx="288" cy="112" r="14" fill="#EA580C" />
      </g>
    </svg>
  );

  if (showText) {
    return (
      <div className="flex items-center gap-3">
        {withBg ? (
          <div className="bg-[#1BC2A4] p-1.5 rounded-xl flex items-center justify-center shadow-xs">
            {svgContent}
          </div>
        ) : (
          svgContent
        )}
        <div className="flex flex-col">
          <span className="text-base font-extrabold text-gray-900 tracking-tight leading-none flex items-center gap-0.5">
            Swot<span className="text-[#1BC2A4] font-semibold">.works</span>
          </span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 sm:block hidden">Inventory Portal</span>
        </div>
      </div>
    );
  }

  return svgContent;
}
