import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/components/CreateTaskDialog/CreateTaskDialog";
import { CreateGoalDialog } from "@/components/CreateGoalDialog/CreateGoalDialog";
import { CheckSquare, Target } from "lucide-react";

interface CreateOptionsSheetProps {
  children: React.ReactNode;
}

export const CreateOptionsSheet = ({ children }: CreateOptionsSheetProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto p-6">
        <div className="space-y-4">
          <CreateTaskDialog>
            <Button 
              variant="outline" 
              className="w-full h-16 flex items-center justify-start gap-4 text-left"
              onClick={handleClose}
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckSquare className="text-primary" size={20} />
              </div>
              <div>
                <p className="font-medium">Crear Tarea</p>
                <p className="text-sm text-muted-foreground">Agregar una nueva tarea</p>
              </div>
            </Button>
          </CreateTaskDialog>

          <CreateGoalDialog>
            <Button 
              variant="outline" 
              className="w-full h-16 flex items-center justify-start gap-4 text-left"
              onClick={handleClose}
            >
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Target className="text-secondary-foreground" size={20} />
              </div>
              <div>
                <p className="font-medium">Crear Meta</p>
                <p className="text-sm text-muted-foreground">Agregar un nuevo objetivo</p>
              </div>
            </Button>
          </CreateGoalDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
};