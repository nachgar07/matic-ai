import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Camera, Plus } from "lucide-react";

export const Comidas = () => {
  const [showCamera, setShowCamera] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="¿Qué comiste?" />
      
      <div className="p-4 space-y-6">
        {/* Main Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => setShowCamera(true)}
            className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            <Camera className="mr-3" size={24} />
            Tomar Foto
          </Button>
          
          <Button
            variant="outline"
            className="w-full h-16"
            size="lg"
          >
            <Plus className="mr-3" size={24} />
            Agregar Manualmente
          </Button>
        </div>

        {/* Recent Meals */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Comidas de Hoy</h2>
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="text-muted-foreground mb-2">
              No has registrado comidas hoy
            </div>
            <div className="text-sm text-muted-foreground">
              Comienza tomando una foto de tu comida
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="bg-card rounded-lg p-4">
          <h3 className="font-semibold mb-3">Resumen del Día</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Calorías totales</span>
            <span className="font-semibold">0 / 2586</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full w-0 transition-all duration-300" />
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};