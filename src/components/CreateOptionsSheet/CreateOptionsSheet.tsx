import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/components/CreateTaskDialog/CreateTaskDialog";
import { CategorySelector } from "@/components/CategorySelector/CategorySelector";
import { EvaluationType } from "@/components/ProgressEvaluationSelector/ProgressEvaluationSelector";
import { CreateGoalDialog } from "@/components/CreateGoalDialog/CreateGoalDialog";
import { CheckSquare, Target } from "lucide-react";

interface CreateOptionsSheetProps {
  children: React.ReactNode;
}

export const CreateOptionsSheet = ({ children }: CreateOptionsSheetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedEvaluationType, setSelectedEvaluationType] = useState<EvaluationType | null>(null);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCreateGoal = () => {
    setIsOpen(false);
    setShowCategorySelector(true);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategorySelector(false);
    // Saltar directamente al CreateGoalDialog con evaluationType "boolean" (Sí/No)
    setSelectedEvaluationType("boolean");
    setShowCreateGoal(true);
  };

  const handleGoalCreated = () => {
    setShowCreateGoal(false);
    setSelectedCategory("");
    setSelectedEvaluationType(null);
  };

  return (
    <>
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

            <Button 
              variant="outline" 
              className="w-full h-16 flex items-center justify-start gap-4 text-left"
              onClick={handleCreateGoal}
            >
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Target className="text-secondary-foreground" size={20} />
              </div>
              <div>
                <p className="font-medium">Crear Hábito</p>
                <p className="text-sm text-muted-foreground">Agregar un nuevo hábito</p>
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <CategorySelector 
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelectCategory={handleCategorySelect}
      />

      <CreateGoalDialog
        isOpen={showCreateGoal}
        onClose={() => {
          setShowCreateGoal(false);
          setSelectedCategory("");
          setSelectedEvaluationType(null);
        }}
        onBack={() => {
          setShowCreateGoal(false);
          setShowCategorySelector(true);
        }}
        onGoalCreated={handleGoalCreated}
        category={selectedCategory}
        evaluationType={selectedEvaluationType}
      />
    </>
  );
};