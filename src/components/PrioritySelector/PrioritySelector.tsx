import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface PrioritySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onValueChange: (value: number) => void;
}

const getPriorityLabel = (priority: number) => {
  if (priority >= 8) return "Urgente";
  if (priority >= 5) return "Alta";
  if (priority >= 3) return "Normal";
  return "Baja";
};

export const PrioritySelector = ({ open, onOpenChange, value, onValueChange }: PrioritySelectorProps) => {
  const [tempValue, setTempValue] = useState(value);

  const handleOpen = (open: boolean) => {
    if (open) {
      setTempValue(value);
    }
    onOpenChange(open);
  };

  const handleAccept = () => {
    onValueChange(tempValue);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    onOpenChange(false);
  };

  const incrementPriority = () => {
    setTempValue(Math.min(10, tempValue + 1));
  };

  const decrementPriority = () => {
    setTempValue(Math.max(1, tempValue - 1));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[300px] bg-background border border-border">
        <div className="space-y-6 p-4">
          <h2 className="text-lg font-medium text-center text-foreground">
            Selecciona una prioridad
          </h2>
          
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={decrementPriority}
              disabled={tempValue <= 1}
              className="w-12 h-12 rounded-full border border-border text-muted-foreground hover:text-foreground"
            >
              <Minus className="w-6 h-6" />
            </Button>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-2">
                {tempValue}
              </div>
              <div className="text-sm text-primary font-medium px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                {getPriorityLabel(tempValue)} - {tempValue}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={incrementPriority}
              disabled={tempValue >= 10}
              className="w-12 h-12 rounded-full border border-border text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Las actividades con mayor prioridad se mostrarán más alto en la lista de tareas
          </p>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              CERRAR
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              ACEPTAR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};