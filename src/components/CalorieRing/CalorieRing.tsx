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
  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(100, (consumed / target) * 100);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate calories from macros (protein and carbs = 4 cal/g, fat = 9 cal/g)
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;
  
  // Calculate proportions for each macro based on consumed calories
  const proteinPercentage = totalMacroCals > 0 ? (proteinCals / consumed) * percentage : 0;
  const carbsPercentage = totalMacroCals > 0 ? (carbsCals / consumed) * percentage : 0;
  const fatPercentage = totalMacroCals > 0 ? (fatCals / consumed) * percentage : 0;
  
  // Calculate stroke dash arrays for each segment
  const proteinStroke = (proteinPercentage / 100) * circumference;
  const carbsStroke = (carbsPercentage / 100) * circumference;
  const fatStroke = (fatPercentage / 100) * circumference;
  
  // Calculate offsets for positioning segments
  const proteinOffset = circumference - proteinStroke;
  const carbsOffset = circumference - proteinStroke - carbsStroke;
  const fatOffset = circumference - proteinStroke - carbsStroke - fatStroke;

  // Water semicircle calculations
  const waterRadius = size * 0.15;
  const waterCircumference = Math.PI * waterRadius;
  const waterPercentage = Math.min(100, (waterGlasses / 8) * 100); // 8 glasses target
  const waterStroke = (waterPercentage / 100) * waterCircumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            fill="transparent"
          />
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
          onClick={onWaterClick}
        >
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