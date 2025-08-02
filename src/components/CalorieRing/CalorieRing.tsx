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

export const CalorieRing = ({ consumed, target, protein, carbs, fat, size = 200, waterGlasses = 0, onWaterClick }: CalorieRingProps) => {
  const [showWaterAnimation, setShowWaterAnimation] = useState(false);
  
  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(100, (consumed / target) * 100);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate calories from macros (protein and carbs = 4 cal/g, fat = 9 cal/g)
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  
  // Calculate target calories for each macro (assuming balanced diet)
  const proteinTarget = target * 0.25; // 25% protein
  const carbsTarget = target * 0.45;   // 45% carbs 
  const fatTarget = target * 0.30;     // 30% fat
  
  // Calculate fixed proportions for each macro based on targets
  const proteinProportion = 25; // 25% of circle
  const carbsProportion = 45;   // 45% of circle
  const fatProportion = 30;     // 30% of circle
  
  // Calculate progress within each segment
  const proteinProgress = Math.min(100, (proteinCals / proteinTarget) * 100);
  const carbsProgress = Math.min(100, (carbsCals / carbsTarget) * 100);
  const fatProgress = Math.min(100, (fatCals / fatTarget) * 100);
  
  // Calculate stroke lengths for backgrounds (full segments)
  const proteinBgStroke = (proteinProportion / 100) * circumference;
  const carbsBgStroke = (carbsProportion / 100) * circumference;
  const fatBgStroke = (fatProportion / 100) * circumference;
  
  // Calculate stroke lengths for progress
  const proteinStroke = (proteinProgress / 100) * proteinBgStroke;
  const carbsStroke = (carbsProgress / 100) * carbsBgStroke;
  const fatStroke = (fatProgress / 100) * fatBgStroke;
  
  // Calculate offsets for positioning segments with gaps
  const gapSize = circumference * 0.02; // 2% gap between segments
  const proteinOffset = circumference - proteinStroke;
  const proteinBgOffset = circumference - proteinBgStroke;
  const carbsOffset = circumference - proteinBgStroke - gapSize - carbsStroke;
  const carbsBgOffset = circumference - proteinBgStroke - gapSize - carbsBgStroke;
  const fatOffset = circumference - proteinBgStroke - gapSize - carbsBgStroke - gapSize - fatStroke;
  const fatBgOffset = circumference - proteinBgStroke - gapSize - carbsBgStroke - gapSize - fatBgStroke;

  // Water semicircle calculations
  const waterRadius = size * 0.15;
  const waterCircumference = Math.PI * waterRadius;
  const waterPercentage = Math.min(100, (waterGlasses / 8) * 100); // 8 glasses target
  const waterStroke = (waterPercentage / 100) * waterCircumference;

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
          {/* Background segments - opaque versions */}
          {/* Protein background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ff6b3540"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${proteinBgStroke} ${circumference - proteinBgStroke}`}
            strokeDashoffset={proteinBgOffset}
            strokeLinecap="round"
          />
          {/* Carbs background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ffa72640"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${carbsBgStroke} ${circumference - carbsBgStroke}`}
            strokeDashoffset={carbsBgOffset}
            strokeLinecap="round"
          />
          {/* Fat background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#4caf5040"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${fatBgStroke} ${circumference - fatBgStroke}`}
            strokeDashoffset={fatBgOffset}
            strokeLinecap="round"
          />
          
          {/* Progress segments - full color */}
          {/* Protein segment (red/orange) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ff6b35"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${proteinStroke} ${circumference - proteinStroke}`}
            strokeDashoffset={proteinOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
          {/* Carbs segment (yellow/gold) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ffa726"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${carbsStroke} ${circumference - carbsStroke}`}
            strokeDashoffset={carbsOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
          {/* Fat segment (green) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#4caf50"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${fatStroke} ${circumference - fatStroke}`}
            strokeDashoffset={fatOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>

        {/* Water semicircle - top right */}
        <div 
          className="absolute cursor-pointer transition-transform hover:scale-110"
          style={{ 
            top: -waterRadius / 2, 
            right: -waterRadius / 2,
            width: waterRadius * 2,
            height: waterRadius * 2
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
          <svg
            width={waterRadius * 2}
            height={waterRadius * 2}
            className="transform -rotate-90"
          >
            {/* Background semicircle */}
            <circle
              cx={waterRadius}
              cy={waterRadius}
              r={waterRadius * 0.7}
              stroke="hsl(var(--muted))"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={`${waterCircumference} ${waterCircumference}`}
              strokeDashoffset={waterCircumference / 2}
              strokeLinecap="round"
            />
            {/* Water progress semicircle */}
            <circle
              cx={waterRadius}
              cy={waterRadius}
              r={waterRadius * 0.7}
              stroke="#2196f3"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={`${waterStroke} ${waterCircumference - waterStroke}`}
              strokeDashoffset={waterCircumference / 2}
              strokeLinecap="round"
              className="transition-all duration-500 ease-in-out"
            />
          </svg>
          {/* Water glass count */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">{waterGlasses}</span>
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