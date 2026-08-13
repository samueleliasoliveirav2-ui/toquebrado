import React from 'react';

type KnotfinLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type KnotfinLogoVariant = 'text';
type KnotfinLogoTheme = 'dark' | 'light' | 'color';

interface KnotfinLogoProps {
  size?: KnotfinLogoSize;
  variant?: KnotfinLogoVariant;
  theme?: KnotfinLogoTheme;
  className?: string;
}

const SIZE_MAP: Record<KnotfinLogoSize, { textClass: string }> = {
  xs: { textClass: 'text-[15px]' },
  sm: { textClass: 'text-lg' },
  md: { textClass: 'text-xl' },
  lg: { textClass: 'text-2xl' },
  xl: { textClass: 'text-3xl' },
  '2xl': { textClass: 'text-[44px]' },
};

const BLUE_DARK = '#094d80';
const BLUE_DARKEST = '#041e33';
const ORANGE = '#f59e0b';

const getTextColors = (theme: KnotfinLogoTheme) => {
  if (theme === 'light') {
    return { knot: '#ffffff', suffix: ORANGE };
  }
  if (theme === 'color') {
    return { knot: '#0e69b2', suffix: ORANGE };
  }
  // dark default: texto na cor dark (azul profundo, quase navy)
  return { knot: BLUE_DARKEST, suffix: BLUE_DARK };
};

export const KnotfinLogo: React.FC<KnotfinLogoProps> = ({
  size = 'md',
  theme = 'dark',
  className = '',
}) => {
  const dims = SIZE_MAP[size];
  const text = getTextColors(theme);

  return (
    <div
      className={[
        'inline-flex items-center justify-center font-brand font-extrabold tracking-tight leading-none select-none whitespace-nowrap',
        dims.textClass,
        className,
      ].filter(Boolean).join(' ')}
    >
      <span style={{ color: text.knot, letterSpacing: '-0.015em' }}>knot</span>
      <span style={{ color: text.suffix, letterSpacing: '-0.015em' }}>fin</span>
    </div>
  );
};

export default KnotfinLogo;
