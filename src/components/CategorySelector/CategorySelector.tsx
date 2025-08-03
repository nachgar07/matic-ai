import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const categories = [
  { value: "bad_habit", label: "Dejar un mal há...", icon: "🚫", color: "#ef4444" },
  { value: "arte", label: "Arte", icon: "🎨", color: "#ec4899" },
  { value: "tarea", label: "Tarea", icon: "⏰", color: "#ec4899" },
  { value: "meditacion", label: "Meditación", icon: "🧘", color: "#a855f7" },
  { value: "estudio", label: "Estudio", icon: "🎓", color: "#8b5cf6" },
  { value: "deportes", label: "Deportes", icon: "🚴", color: "#3b82f6" },
  { value: "entretenimiento", label: "Entretenimiento", icon: "⭐", color: "#06b6d4" },
  { value: "social", label: "Social", icon: "💬", color: "#10b981" },
  { value: "finanzas", label: "Finanzas", icon: "$", color: "#22c55e" },
  { value: "salud", label: "Salud", icon: "➕", color: "#84cc16" },
  { value: "trabajo", label: "Trabajo", icon: "💼", color: "#a3a3a3" },
  { value: "nutricion", label: "Nutrición", icon: "🍽️", color: "#f59e0b" },
  { value: "hogar", label: "Hogar", icon: "🏠", color: "#f97316" },
  { value: "aire_libre", label: "Aire libre", icon: "⛰️", color: "#f97316" },
  { value: "otros", label: "Otros", icon: "🔲", color: "#ef4444" },
];

interface CategorySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
}

export const CategorySelector = ({ isOpen, onClose, onSelectCategory }: CategorySelectorProps) => {
  const handleCategorySelect = (categoryValue: string) => {
    onSelectCategory(categoryValue);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-full bg-background">
        <div className="flex flex-col h-full">
          <SheetHeader className="text-center py-6">
            <SheetTitle className="text-2xl font-bold text-primary">
              Selecciona una categoría
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant="ghost"
                  className="h-16 justify-start gap-4 p-4 text-left hover:bg-transparent"
                  onClick={() => handleCategorySelect(category.value)}
                >
                  <span className="text-foreground font-medium flex-1">
                    {category.label}
                  </span>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon}
                  </div>
                </Button>
              ))}
              
              <Button
                variant="ghost"
                className="h-16 justify-start gap-4 p-4 text-left hover:bg-transparent"
                onClick={() => {
                  // TODO: Implementar crear categoría personalizada
                  console.log("Crear categoría personalizada");
                }}
              >
                <div className="flex-1">
                  <div className="text-foreground font-medium">Crear categoría</div>
                  <div className="text-sm text-muted-foreground">5 disponibles</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
              </Button>
            </div>
          </div>

          <div className="p-4 pb-8">
            <Button 
              variant="outline" 
              className="w-full h-12 text-lg font-semibold"
              onClick={onClose}
            >
              CANCELAR
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};