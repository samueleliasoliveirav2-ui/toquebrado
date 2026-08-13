import React from 'react';

type KnotfinLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type KnotfinLogoVariant = 'full' | 'icon' | 'text';
type KnotfinLogoTheme = 'dark' | 'light' | 'color';

interface KnotfinLogoProps {
  size?: KnotfinLogoSize;
  variant?: KnotfinLogoVariant;
  theme?: KnotfinLogoTheme;
  className?: string;
}

const SIZE_MAP: Record<KnotfinLogoSize, { icon: number; textClass: string; gap: string }> = {
  xs: { icon: 18, textClass: 'text-[15px]', gap: 'gap-1.5' },
  sm: { icon: 24, textClass: 'text-lg', gap: 'gap-2' },
  md: { icon: 32, textClass: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 40, textClass: 'text-2xl', gap: 'gap-3' },
  xl: { icon: 52, textClass: 'text-3xl', gap: 'gap-3.5' },
  '2xl': { icon: 68, textClass: 'text-[44px]', gap: 'gap-4' },
};

const BLUE = '#0e69b2';
const BLUE_DARK = '#094d80';
const ORANGE = '#f59e0b';
const ORANGE_DARK = '#d97706';

const getIconDefs = (variant: KnotfinLogoVariant, theme: KnotfinLogoTheme) => {
  if (theme === 'light') {
    return {
      kStroke: '#ffffff',
      kStroke2: '#ffffff',
      loopFill: '#ffffff',
      loopStroke: '#ffffff',
      dotFill: ORANGE,
    };
  }
  if (variant === 'icon' && theme === 'color') {
    return {
      kStroke: BLUE,
      kStroke2: ORANGE,
      loopFill: 'transparent',
      loopStroke: BLUE,
      dotFill: ORANGE,
    };
  }
  return {
    kStroke: BLUE,
    kStroke2: BLUE_DARK,
    loopFill: 'transparent',
    loopStroke: BLUE_DARK,
    dotFill: ORANGE,
  };
};

const getTextColors = (theme: KnotfinLogoTheme) => {
  if (theme === 'light') return { k: '#ffffff', knotFinK: '#ffffff', knotFinRest: '#ffffff', suffix: ORANGE };
  if (theme === 'color') return { k: BLUE, knotFinK: BLUE, knotFinRest: BLUE_DARK, suffix: ORANGE };
  return { k: BLUE_DARK, knotFinK: BLUE, knotFinRest: BLUE_DARK, suffix: ORANGE };
};

export const KnotfinLogo: React.FC<KnotfinLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'color',
  className = '',
}) => {
  const dims = SIZE_MAP[size];
  const icon = getIconDefs(variant, theme);
  const text = getTextColors(theme);

  const iconSvg = (
    <svg
      width={dims.icon}
      height={dims.icon}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Outer knot loop (rounded square infinity-style knot) */}
      <defs>
        <linearGradient id={`knotfin-knot-${theme}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={BLUE} />
          <stop offset="55%" stopColor={BLUE_DARK} />
          <stop offset="100%" stopColor={ORANGE_DARK} />
        </linearGradient>
        <linearGradient id={`knotfin-kstroke-${theme}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={BLUE_DARK} />
          <stop offset="100%" stopColor={ORANGE_DARK} />
        </linearGradient>
      </defs>

      {/* Knot loop frame */}
      <path
        d="M24 6 C33.941 6 42 14.059 42 24 C42 29.823 39.256 35.03 34.85 38.55 C33.08 40.072 30.472 41 27.75 41 L27.75 38 C29.883 38 31.842 37.3 33.192 36.23 C36.59 33.47 39 29.03 39 24 C39 15.716 32.284 9 24 9 C15.716 9 9 15.716 9 24 C9 29.03 11.41 33.47 14.808 36.23 C16.158 37.3 18.117 38 20.25 38 L20.25 41 C17.528 41 14.92 40.072 13.15 38.55 C8.744 35.03 6 29.823 6 24 C6 14.059 14.059 6 24 6 Z"
        fill="transparent"
        stroke={theme === 'light' ? 'rgba(255,255,255,0.9)' : `url(#knotfin-knot-${theme}-${size})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Interlaced knot weave crossing inside the loop (overlapping bars like sailor knot / celtic knot slim) */}
      <path
        d="M17 19 L31 31"
        stroke={icon.kStroke}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M31 19 L17 31"
        stroke={icon.kStroke2}
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/* Overlap accent: center diamond knot highlight in laranja */}
      <path
        d="M24 22 L26 24 L24 26 L22 24 Z"
        fill={icon.dotFill}
        stroke={theme === 'light' ? 'rgba(255,255,255,0.35)' : `${ORANGE_DARK}`}
        strokeWidth="1"
      />

      {/* Tiny accent bar underline of the knot (fio laranja slim) */}
      <path
        d="M15.5 38.5 L32.5 38.5"
        stroke={ORANGE_DARK}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={theme === 'light' ? 0.7 : 1}
      />
    </svg>
  );

  const textSvg = (
    <div
      className={[
        'font-brand font-extrabold tracking-tight leading-none select-none whitespace-nowrap',
        dims.textClass,
      ].join(' ')}
    >
      <span style={{ color: text.knotFinK, letterSpacing: '-0.01em' }}>k</span>
      <span style={{ color: text.knotFinRest, letterSpacing: '-0.01em' }}>not</span>
      <span style={{ color: text.suffix, letterSpacing: '-0.01em' }}>fin</span>
    </div>
  );

  if (variant === 'icon') {
    return <div className={['inline-flex items-center justify-center', className].filter(Boolean).join(' ')}>{iconSvg}</div>;
  }
  if (variant === 'text') {
    return <div className={['inline-flex items-center justify-center', className].filter(Boolean).join(' ')}>{textSvg}</div>;
  }

  return (
    <div className={['inline-flex items-center justify-center', dims.gap, className].filter(Boolean).join(' ')}>
      {iconSvg}
      {textSvg}
    </div>
  );
};

export default KnotfinLogo;
