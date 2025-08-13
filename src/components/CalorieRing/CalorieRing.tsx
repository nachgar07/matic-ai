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
  simple?: boolean; // Nueva prop para modo simple
  waterTarget?: number; // Nueva prop para el objetivo de agua
}

export const CalorieRing = ({ consumed, target, protein, carbs, fat, size = 200, waterGlasses = 0, onWaterClick, simple = false, waterTarget = 12 }: CalorieRingProps) => {
  const [showWaterAnimation, setShowWaterAnimation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Mark as initialized after first render with actual data
  useEffect(() => {
    if (consumed > 0 || protein > 0 || carbs > 0 || fat > 0) {
      setIsInitialized(true);
    }
  }, [consumed, protein, carbs, fat]);
  
  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(100, (consumed / target) * 100);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Simple mode - single progress ring
  const strokeLength = (percentage / 100) * circumference;
  const strokeOffset = circumference - strokeLength;

  // Complex mode - macro breakdown
  // Calculate calories from macros (protein and carbs = 4 cal/g, fat = 9 cal/g)
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  
  // Calculate target calories for each macro (assuming balanced diet)
  const proteinTarget = target * 0.25; // 25% protein
  const carbsTarget = target * 0.45;   // 45% carbs 
  const fatTarget = target * 0.30;     // 30% fat
  
  // New approach using SVG paths for precise positioning
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Calculate progress percentages (allow over 100% for full circle display)
  const proteinProgress = (proteinCals / proteinTarget) * 100;
  const carbsProgress = (carbsCals / carbsTarget) * 100;
  const fatProgress = (fatCals / fatTarget) * 100;
  
  // Each segment is 110 degrees with 10 degree gaps
  const segmentAngle = 110;
  const gapAngle = 10;
  
  // Starting angles for each segment (in degrees)
  const proteinStartAngle = -55; // Top center
  const carbsStartAngle = proteinStartAngle + segmentAngle + gapAngle;
  const fatStartAngle = carbsStartAngle + segmentAngle + gapAngle;
  
  // Calculate end angles based on progress (cap at 100% for visual display)
  const proteinEndAngle = proteinStartAngle + (Math.min(100, proteinProgress) / 100) * segmentAngle;
  const carbsEndAngle = carbsStartAngle + (Math.min(100, carbsProgress) / 100) * segmentAngle;
  const fatEndAngle = fatStartAngle + (Math.min(100, fatProgress) / 100) * segmentAngle;
  
  // Helper function to create arc path
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    // Ensure we have a valid range
    if (endAngle <= startAngle) return "";
    
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = (endAngle - startAngle) <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };
  
  // Helper function to convert polar to cartesian coordinates
  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  // Water drop calculations
  const waterDropSize = size * 0.15;
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
          {simple ? (
            // Simple mode - single progress ring
            <>
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
            </>
          ) : (
            // Complex mode - macro breakdown using SVG paths
            <>
              {/* Background segments */}
              <path
                d={createArcPath(proteinStartAngle, proteinStartAngle + segmentAngle, radius)}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeLinecap="round"
                className="text-muted opacity-20"
              />
              <path
                d={createArcPath(carbsStartAngle, carbsStartAngle + segmentAngle, radius)}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeLinecap="round"
                className="text-muted opacity-20"
              />
              <path
                d={createArcPath(fatStartAngle, fatStartAngle + segmentAngle, radius)}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeLinecap="round"
                className="text-muted opacity-20"
              />
              
              {/* Progress segments */}
              {proteinProgress > 0 && (
                <path
                  d={createArcPath(proteinStartAngle, proteinEndAngle, radius)}
                  stroke="hsl(var(--protein))"
                  strokeWidth="8"
                  fill="transparent"
                  strokeLinecap="round"
                  className={isInitialized ? "transition-all duration-500 ease-in-out" : ""}
                />
              )}
              {carbsProgress > 0 && (
                <path
                  d={createArcPath(carbsStartAngle, carbsEndAngle, radius)}
                  stroke="hsl(var(--carbs))"
                  strokeWidth="8"
                  fill="transparent"
                  strokeLinecap="round"
                  className={isInitialized ? "transition-all duration-500 ease-in-out" : ""}
                />
              )}
              {fatProgress > 0 && (
                <path
                  d={createArcPath(fatStartAngle, fatEndAngle, radius)}
                  stroke="hsl(var(--fat))"
                  strokeWidth="8"
                  fill="transparent"
                  strokeLinecap="round"
                  className={isInitialized ? "transition-all duration-500 ease-in-out" : ""}
                />
              )}
            </>
          )}
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