import React from 'react';

interface LogoProps {
  className?: string;
  animateStar?: boolean;
}

// همان طرح assets/logo.svg به‌صورت کامپوننت تا داخل اپ هم تیز و بدون فایل جانبی نمایش داده شود
export const Logo: React.FC<LogoProps> = ({ className = 'w-10 h-10', animateStar = false }) => (
  <svg viewBox="0 0 512 512" className={className} role="img" aria-label="StudyOS">
    <rect x="44" y="44" width="452" height="452" rx="108" fill="#000000" />
    <rect x="16" y="16" width="452" height="452" rx="108" fill="#FFFDF5" stroke="#000000" strokeWidth="16" />
    <path
      fill="#312E81"
      stroke="#000000"
      strokeWidth="14"
      strokeLinejoin="round"
      d="M136 112 H348 A64 64 0 0 1 412 176 V302 A64 64 0 0 1 348 366 H214 L112 440 L156 366 H136 A64 64 0 0 1 72 302 V176 A64 64 0 0 1 136 112 Z"
    />
    <text
      x="242"
      y="300"
      textAnchor="middle"
      fontFamily="'Arial Black', 'Segoe UI Black', 'Space Grotesk', sans-serif"
      fontWeight="900"
      fontSize="168"
      fill="#FFFDF5"
    >
      Aa
    </text>
    <path
      className={animateStar ? 'anim-twinkle' : undefined}
      fill="#FACC15"
      stroke="#000000"
      strokeWidth="12"
      strokeLinejoin="round"
      d="M392 66 Q401 115 450 124 Q401 133 392 182 Q383 133 334 124 Q383 115 392 66 Z"
    />
  </svg>
);

export default Logo;
