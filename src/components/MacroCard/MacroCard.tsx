interface MacroCardProps {
  icon: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  color?: string;
}

export const MacroCard = ({ icon, label, current, target, unit, color = "#6366f1" }: MacroCardProps) => {
  const percentage = (current / target) * 100;
  const displayWidth = percentage >= 100 ? 100 : percentage;

  return (
    <div className="flex-1 bg-card rounded-lg p-3">
      <div className="flex items-center mb-2">
        <span className="text-base mr-1">{icon}</span>
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-lg font-bold">{current}</span>
          <span className="text-xs text-muted-foreground">/{target}{unit}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full"
            style={{ 
              width: `${displayWidth}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
    </div>
  );
};