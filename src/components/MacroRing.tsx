import React from 'react';
import { cn } from '../lib/utils';

interface MacroRingProps {
  value: number;
  max: number;
  color: string;
  label: string;
  size?: number;
  strokeWidth?: number;
  unit?: string;
  className?: string;
}

export function MacroRing({ 
  value, 
  max, 
  color, 
  label, 
  size = 100, 
  strokeWidth = 8,
  unit = 'g',
  className
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const isOver = value > max;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percent * circumference;
  
  const displayColor = isOver ? '#ff4444' : color;
  const filterId = `glow-${label.replace(/\s+/g, '-')}`;

  return (
    <div className={cn("relative flex flex-col items-center justify-center group", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={displayColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          className={cn(
            "transition-all duration-1000 ease-out",
            isOver ? "animate-pulse" : "animate-[pulse_3s_ease-in-out_infinite]"
          )}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center transition-transform duration-300 group-hover:scale-110">
        <span className={cn(
          "text-lg font-display uppercase leading-none tracking-tight",
          isOver ? "text-danger drop-shadow-[0_0_8px_rgba(255,68,68,0.8)]" : "text-white"
        )}>
          {Math.round(value)}
        </span>
        <span className="text-[8px] text-white/40 uppercase tracking-[0.2em] mt-1 font-medium">
          {label}
        </span>
      </div>
      {isOver && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full animate-ping shadow-[0_0_8px_#ff4444]" />
      )}
    </div>
  );
}
