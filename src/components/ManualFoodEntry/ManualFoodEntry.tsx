import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Food } from "@/hooks/useFatSecret";

interface ManualFoodEntryProps {
  onFoodAdded: (food: Food) => void;
  onClose: () => void;
}

export const ManualFoodEntry = ({ onFoodAdded, onClose }: ManualFoodEntryProps) => {
  const [formData, setFormData] = useState({
    food_name: "",
    brand_name: "",
    serving_description: "",
    calories_per_serving: "",
    protein_per_serving: "",
    carbs_per_serving: "",
    fat_per_serving: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.food_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del alimento es requerido",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Generate a unique food_id for manual entries
      const food_id = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const foodData = {
        food_id,
        food_name: formData.food_name,
        brand_name: formData.brand_name || null,
        serving_description: formData.serving_description || "1 porción",
        calories_per_serving: parseFloat(formData.calories_per_serving) || 0,
        protein_per_serving: parseFloat(formData.protein_per_serving) || 0,
        carbs_per_serving: parseFloat(formData.carbs_per_serving) || 0,
        fat_per_serving: parseFloat(formData.fat_per_serving) || 0
      };

      const { data, error } = await supabase.functions.invoke('add-manual-food', {
        body: foodData
      });

      if (error) throw error;

      toast({
        title: "¡Alimento agregado!",
        description: "El alimento se ha guardado correctamente"
      });

      // Create the food object to return
      const newFood: Food = {
        id: data.id,
        food_id: data.food_id,
        food_name: data.food_name,
        brand_name: data.brand_name,
        serving_description: data.serving_description,
        calories_per_serving: data.calories_per_serving,
        protein_per_serving: data.protein_per_serving,
        carbs_per_serving: data.carbs_per_serving,
        fat_per_serving: data.fat_per_serving
      };

      onFoodAdded(newFood);
      onClose();

    } catch (error) {
      console.error('Error adding manual food:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el alimento",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Agregar Alimento Manual</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-4 space-y-4">
            <h3 className="font-medium">Información Básica</h3>
            
            <div className="space-y-2">
              <Label htmlFor="food_name">Nombre del Alimento *</Label>
              <Input
                id="food_name"
                value={formData.food_name}
                onChange={(e) => handleInputChange('food_name', e.target.value)}
                placeholder="Ej: Arroz integral cocido"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_name">Marca (Opcional)</Label>
              <Input
                id="brand_name"
                value={formData.brand_name}
                onChange={(e) => handleInputChange('brand_name', e.target.value)}
                placeholder="Ej: Diana, Maggi, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serving_description">Descripción de la Porción</Label>
              <Input
                id="serving_description"
                value={formData.serving_description}
                onChange={(e) => handleInputChange('serving_description', e.target.value)}
                placeholder="Ej: 1 taza, 100g, 1 pieza"
              />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-medium">Información Nutricional (por porción)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calorías</Label>
                <Input
                  id="calories"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.calories_per_serving}
                  onChange={(e) => handleInputChange('calories_per_serving', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="protein">Proteína (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.protein_per_serving}
                  onChange={(e) => handleInputChange('protein_per_serving', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carbs">Carbohidratos (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.carbs_per_serving}
                  onChange={(e) => handleInputChange('carbs_per_serving', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fat">Grasas (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.fat_per_serving}
                  onChange={(e) => handleInputChange('fat_per_serving', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </Card>
        </form>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || !formData.food_name.trim()}
          className="w-full"
        >
          <Save className="mr-2" size={20} />
          {isLoading ? "Guardando..." : "Guardar Alimento"}
        </Button>
      </div>
    </div>
  );
};