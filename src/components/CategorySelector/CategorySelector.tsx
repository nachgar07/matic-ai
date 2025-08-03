import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const categories = [
  { value: "bad_habit", label: "Dejar un\nmal hábito", icon: "🚫", color: "#ef4444" },
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
      <SheetContent side="bottom" className="h-[95vh] p-0 border-none">
        <div className="flex flex-col h-full bg-background">
          <div className="flex items-center justify-between p-6 border-b">
            <SheetTitle className="text-xl font-bold text-foreground">
              Selecciona una categoría
            </SheetTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="text-muted-foreground"
            >
              ✕
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant="ghost"
                  className="h-24 p-4 text-left hover:bg-muted/50 border border-border/50 rounded-xl flex items-center justify-between"
                  onClick={() => handleCategorySelect(category.value)}
                >
                   <span className="text-foreground font-medium text-sm pr-3 flex-1 leading-tight break-words whitespace-pre-line">
                     {category.label}
                   </span>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon}
                  </div>
                </Button>
              ))}
              
              <Button
                variant="ghost"
                className="h-20 justify-between p-4 text-left hover:bg-muted/50 border border-border/50 rounded-xl"
                onClick={() => {
                  // TODO: Implementar crear categoría personalizada
                  console.log("Crear categoría personalizada");
                }}
              >
                <div>
                  <div className="text-foreground font-medium text-sm">Crear categoría</div>
                  <div className="text-xs text-muted-foreground">5 disponibles</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ml-2">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
              </Button>
            </div>
          </div>

          <div className="p-4 border-t bg-background">
            <Button 
              variant="outline" 
              className="w-full h-12 text-base font-semibold"
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