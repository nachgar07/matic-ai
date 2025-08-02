import { useState, useEffect } from 'react';

interface CalorieRingProps {
  consumed: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
  waterGlasses?: number;
  onWaterClick?: () => void;
}

export const CalorieRing = ({ consumed, target, size = 200, waterGlasses = 0, onWaterClick }: CalorieRingProps) => {
  const [showWaterAnimation, setShowWaterAnimation] = useState(false);
  
  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(100, (consumed / target) * 100);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke length for simple progress ring
  const strokeLength = (percentage / 100) * circumference;
  const strokeOffset = circumference - strokeLength;

  // Water drop calculations
  const waterDropSize = size * 0.15;
  const waterTarget = 12; // 12 glasses = ~3 liters
  const displayWaterGlasses = waterGlasses % waterTarget || (waterGlasses > 0 && waterGlasses % waterTarget === 0 ? waterTarget : 0);
  const waterPercentage = Math.min(100, (displayWaterGlasses / waterTarget) * 100);
  const waterFillHeight = waterPercentage === 100 ? 37 : (waterPercentage / 100) * 32;

  const handleWaterClick = () => {
    if (onWaterClick) {
      onWaterClick();
      setShowWaterAnimation(true);
    }
  };

  useEffect(() => {
    if (showWaterAnimation) {
      const timer = setTimeout(() => {
        setShowWaterAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showWaterAnimation]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f3f4f6"
            strokeWidth="8"
            fill="transparent"
          />
          
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10b981"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>

        {/* Water drop - top right */}
        <div 
          className="absolute cursor-pointer transition-transform hover:scale-110"
          style={{ 
            top: -waterDropSize * 0.7, 
            right: -waterDropSize * 0.7,
            width: waterDropSize * 1.4,
            height: waterDropSize * 1.6
          }}
          onClick={handleWaterClick}
        >
          {/* Water drop animations */}
          {showWaterAnimation && (
            <>
              {/* Water drops */}
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-blue-400 rounded-full animate-[fade-in_0.3s_ease-out,scale-in_0.2s_ease-out] opacity-0"
                  style={{
                    top: `${30 + i * 5}%`,
                    left: `${45 + i * 10}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationFillMode: 'forwards',
                    transform: `translateY(-${20 + i * 10}px)`,
                    animationDuration: '0.8s'
                  }}
                />
              ))}
              {/* +1 vaso indicator */}
              <div 
                className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-blue-500 animate-[fade-in_0.3s_ease-out] opacity-0 pointer-events-none"
                style={{
                  animationFillMode: 'forwards',
                  animationDelay: '0.1s'
                }}
              >
                +1 vaso
              </div>
            </>
          )}
          
          {/* Water drop SVG */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 40 50"
            className="absolute inset-0"
          >
            <defs>
              <clipPath id="dropClip">
                <path
                  d="M 20 5 
                      C 20 5, 8 20, 8 30
                      C 8 38, 12 42, 20 42
                      C 28 42, 32 38, 32 30
                      C 32 20, 20 5, 20 5 Z"
                />
              </clipPath>
            </defs>
            
            {/* Drop background - celeste opaco */}
            <path
              d="M 20 5 
                  C 20 5, 8 20, 8 30
                  C 8 38, 12 42, 20 42
                  C 28 42, 32 38, 32 30
                  C 32 20, 20 5, 20 5 Z"
              stroke="#64b5f6"
              strokeWidth="2"
              fill="#e3f2fd"
            />
            
            {/* Water fill */}
            <rect
              x="8"
              y={waterPercentage === 100 ? 5 : 42 - waterFillHeight}
              width="24"
              height={waterFillHeight}
              fill="#2196f3"
              clipPath="url(#dropClip)"
              className="transition-all duration-500 ease-in-out"
            />
          </svg>
          
          {/* Water glass count - centered in drop */}
          <div className="absolute inset-0 flex items-center justify-center pt-1">
            <span className="text-xs font-semibold text-blue-600 z-10">{displayWaterGlasses}</span>
          </div>
        </div>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-primary">{remaining}</div>
          <div className="text-sm text-muted-foreground">Calorías restantes</div>
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round(percentage)}%
          </div>
        </div>
      </div>
      
      {/* Stats below */}
      <div className="flex justify-between w-full max-w-xs mt-4">
        <div className="text-center">
          <div className="text-xl font-semibold">{consumed}</div>
          <div className="text-xs text-muted-foreground">Consumidas</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold">{target}</div>
          <div className="text-xs text-muted-foreground">Objetivo</div>
        </div>
      </div>
    </div>
  );
};