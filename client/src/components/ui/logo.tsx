import React from 'react';
import logoSrc from '@/assets/logo-nvs.png';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function Logo({ width = 150, height, className = '' }: LogoProps) {
  return (
    <img 
      src={logoSrc} 
      alt="NVS Licenças" 
      width={width}
      height={height} 
      className={`object-contain ${className}`}
    />
  );
}