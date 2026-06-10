import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export interface RingData {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}

interface ConcentricMacroRingsProps {
  rings: RingData[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  className?: string;
  centerContent?: React.ReactNode;
}

export function ConcentricMacroRings({
  rings,
  size = 300,
  strokeWidth = 14,
  gap = 4,
  className,
  centerContent
}: ConcentricMacroRingsProps) {
  const center = size / 2;

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
        <defs>
          {rings.map((ring, index) => {
            const filterId = `glow-${ring.label.replace(/\s+/g, '-')}`;
            return (
              <filter key={`filter-${index}`} id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            );
          })}
        </defs>
        
        {rings.map((ring, index) => {
          // Inner-most ring has radius, then they grow outwards
          const radius = (size / 2) - (strokeWidth / 2) - (index * (strokeWidth + gap));
          if (radius <= 0) return null;

          const circumference = radius * 2 * Math.PI;
          
          const isProtein = ring.label.toLowerCase() === 'protein';
          const isCalories = ring.label.toLowerCase() === 'net calories';
          const percentRatio = ring.max > 0 ? (ring.value / ring.max) : 0;
          
          let currentStatus: 'normal' | 'success' | 'warning' = 'normal';
          
          if (percentRatio > 1) {
            currentStatus = isProtein ? 'success' : 'warning';
          } else if (percentRatio >= 0.9) {
            currentStatus = 'success';
          }

          if (isCalories && percentRatio > 1) {
            currentStatus = 'warning';
          }
          
          const percent = Math.min(percentRatio, 1);
          const offset = circumference - percent * circumference;
          
          const displayColor = currentStatus === 'success' ? '#10b981' : currentStatus === 'warning' ? '#ef4444' : ring.color;
          const filterId = `glow-${ring.label.replace(/\s+/g, '-')}`;

          return (
            <g key={ring.label}>
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                className="text-white/5"
              />
              
              {/* Foreground circle */}
              <circle
                cx={center}
                cy={center}
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
                  currentStatus === 'warning' ? "animate-pulse" : ""
                )}
              />
            </g>
          );
        })}
      </svg>
      
      {/* End Labels */}
      {rings.map((ring, index) => {
        const radius = (size / 2) - (strokeWidth / 2) - (index * (strokeWidth + gap));
        if (radius <= 0) return null;

        const percentRatio = ring.max > 0 ? (ring.value / ring.max) : 0;
        const percent = Math.min(percentRatio, 1);
        
        let currentStatus: 'normal' | 'success' | 'warning' = 'normal';
        const isProtein = ring.label.toLowerCase() === 'protein';
        const isCalories = ring.label.toLowerCase() === 'net calories';
        if (percentRatio > 1) {
          currentStatus = isProtein ? 'success' : 'warning';
        } else if (percentRatio >= 0.9) {
          currentStatus = 'success';
        }
        if (isCalories && percentRatio > 1) {
          currentStatus = 'warning';
        }
        
        const displayColor = currentStatus === 'success' ? '#10b981' : currentStatus === 'warning' ? '#ef4444' : ring.color;
        
        // Label position exactly at the end of the stroked arc
        // 0 angle is at top visually (-90 deg mathematics)
        // Progress goes clockwise. So angle = percent * 2 * PI - PI/2
        const theta = percent * 2 * Math.PI - Math.PI / 2;
        const x = center + radius * Math.cos(theta);
        const y = center + radius * Math.sin(theta);
        
        // Calculate tangent angle for rotation if we want arrow to point along the path
        // Tangent angle is theta + 90 deg
        const arrowAngle = (percent * 360);
        
        return (
          <div
            key={`label-${ring.label}`}
            className="absolute flex items-center justify-center pointer-events-none drop-shadow-md transition-all duration-1000 ease-out"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
          >
            <div 
              className="flex items-center space-x-0.5 rounded-full px-1.5 py-0.5 whitespace-nowrap"
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: displayColor,
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              <span className="text-[10px] font-bold tracking-tight px-0.5 whitespace-pre">
                {Math.round(ring.value)}{ring.unit || (isCalories ? '' : 'g')}
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="12" height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ transform: `rotate(${arrowAngle}deg)` }}
              >
                <path d="m13 17 5-5-5-5" />
                <path d="m6 17 5-5-5-5" />
              </svg>
            </div>
          </div>
        );
      })}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center transform transition-transform duration-300 hover:scale-105 pointer-events-none">
        <div className="pointer-events-auto">
          {centerContent}
        </div>
      </div>
      
      {/* Legend / Hover states can be managed externally or added here */}
    </div>
  );
}
