import { Check, User, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface OnboardingCenterProps {
  hasPersonalData: boolean;
  hasNutritionGoals: boolean;
}

export const OnboardingCenter = ({ hasPersonalData, hasNutritionGoals }: OnboardingCenterProps) => {
  const navigate = useNavigate();

  if (hasPersonalData && hasNutritionGoals) {
    return null; // Usar el contenido normal del CalorieRing
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="text-sm font-medium text-muted-foreground mb-3">
          Completa tu perfil
        </div>
        
        <div className="space-y-2">
          {/* Datos Personales */}
          <Button
            variant={hasPersonalData ? "outline" : "default"}
            size="sm"
            onClick={() => navigate('/perfil?open=personal')}
            className="w-full text-xs py-1 h-auto flex items-center gap-2"
          >
            {hasPersonalData ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <User className="h-3 w-3" />
            )}
            <span className={hasPersonalData ? "line-through text-green-600" : ""}>
              Datos personales
            </span>
          </Button>

          {/* Objetivos Nutricionales */}
          <Button
            variant={hasNutritionGoals ? "outline" : "default"}
            size="sm"
            onClick={() => navigate('/perfil?open=goals')}
            className="w-full text-xs py-1 h-auto flex items-center gap-2"
          >
            {hasNutritionGoals ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Target className="h-3 w-3" />
            )}
            <span className={hasNutritionGoals ? "line-through text-green-600" : ""}>
              Objetivos nutricionales
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};