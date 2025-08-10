import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Hash, Clock, List, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type EvaluationType = "boolean" | "quantity" | "timer" | "activities";

interface ProgressEvaluationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvaluation: (evaluationType: EvaluationType) => void;
  category: string;
}

const evaluationOptions = [
  {
    type: "boolean" as EvaluationType,
    title: "CON UN SI O UN NO",
    description: "Si cada día quieres registrar si tuviste éxito o no con tu actividad",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600"
  },
  {
    type: "quantity" as EvaluationType,
    title: "CON UNA CANTIDAD",
    description: "Si quieres establecer un valor numérico como meta o límite diario para el hábito",
    icon: Hash,
    gradient: "from-blue-500 to-indigo-600",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  {
    type: "timer" as EvaluationType,
    title: "CON UN CRONÓMETRO",
    description: "Si quieres establecer una cantidad de tiempo como meta o límite diario para el hábito",
    icon: Clock,
    gradient: "from-purple-500 to-violet-600",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  {
    type: "activities" as EvaluationType,
    title: "CON UNA LISTA DE ACTIVIDADES",
    description: "Si quieres evaluar tu actividad en base a un conjunto de sub-items",
    icon: List,
    gradient: "from-rose-500 to-pink-600",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    isPremium: true
  }
];

export const ProgressEvaluationSelector = ({ 
  isOpen, 
  onClose, 
  onSelectEvaluation, 
  category 
}: ProgressEvaluationSelectorProps) => {
  const [selectedType, setSelectedType] = useState<EvaluationType | null>(null);

  const handleSelectType = (type: EvaluationType) => {
    setSelectedType(type);
    onSelectEvaluation(type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full sm:max-w-md h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto bg-gradient-to-b from-background to-muted/20 m-0 sm:m-4 rounded-none sm:rounded-lg">
        <DialogHeader className="space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-2 sm:px-6">
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute left-2 sm:left-4 top-3 sm:top-4 h-8 w-8 z-10"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center space-y-1 sm:space-y-2 pt-6 sm:pt-8 px-2">
            <DialogTitle className="text-lg sm:text-2xl font-bold text-primary leading-tight">
              ¿Cómo quieres evaluar tu progreso?
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Selecciona el método que mejor se adapte a tu hábito
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-4 pb-4 sm:pb-6 px-2 sm:px-6">
          {evaluationOptions.map((option, index) => (
            <Button
              key={option.type}
              variant="outline"
              className={cn(
                "w-full h-auto p-3 sm:p-6 flex flex-col items-start space-y-2 sm:space-y-3 text-left border-2 transition-all duration-200 hover:scale-[1.01] sm:hover:scale-[1.02]",
                selectedType === option.type 
                  ? "border-primary bg-primary/5 shadow-lg" 
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              )}
              onClick={() => handleSelectType(option.type)}
            >
              <div className="flex items-start gap-2 sm:gap-4 w-full">
                <div className={cn(
                  "w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0",
                  option.iconBg
                )}>
                  <option.icon className={cn("w-4 h-4 sm:w-6 sm:h-6", option.iconColor)} />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <div className={cn(
                    "font-bold text-xs sm:text-base lg:text-lg mb-1 sm:mb-2 bg-gradient-to-r bg-clip-text text-transparent break-words leading-tight",
                    option.gradient
                  )}>
                    {option.title}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words word-wrap overflow-wrap-anywhere hyphens-auto">
                    {option.description}
                  </p>
                  
                  {option.isPremium && (
                    <div className="flex items-center gap-1 mt-2">
                      <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-medium rounded-full whitespace-nowrap">
                        Funcionalidad premium
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>

        <div className="flex justify-center space-x-2 pb-4">
          {[0, 1, 2, 3].map((dot, index) => (
            <div
              key={dot}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === 0 ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};