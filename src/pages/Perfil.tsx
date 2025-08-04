import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { User, Settings, Target, TrendingDown, Scale, Activity, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useNutritionGoals } from "@/hooks/useFatSecret";
import { EditNutritionGoalsDialog } from "@/components/EditNutritionGoalsDialog/EditNutritionGoalsDialog";

export const Perfil = () => {
  const { theme, setTheme } = useTheme();
  const { data: nutritionGoals } = useNutritionGoals();
  const [editGoalsOpen, setEditGoalsOpen] = useState(false);

  const goals = {
    calories: nutritionGoals?.daily_calories || 2000,
    protein: nutritionGoals?.daily_protein || 150,
    carbs: nutritionGoals?.daily_carbs || 250,
    fat: nutritionGoals?.daily_fat || 67
  };
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Perfil" />
      
      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card className="p-6 text-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-primary-foreground" size={32} />
          </div>
          <h2 className="text-xl font-semibold">Usuario</h2>
          <p className="text-muted-foreground">usuario@email.com</p>
        </Card>

        {/* Current Goals */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Target className="mr-2" size={20} />
            Objetivo Actual
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <TrendingDown className="mr-3 text-success" size={20} />
              <div>
                <div className="font-medium">Perder peso</div>
                <div className="text-sm text-muted-foreground">0.5 kg por semana</div>
              </div>
            </div>
            <div className="flex items-center">
              <Scale className="mr-3 text-muted-foreground" size={20} />
              <div>
                <div className="font-medium">Peso objetivo: 75 kg</div>
                <div className="text-sm text-muted-foreground">Altura: 178 cm</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Daily Targets */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Activity className="mr-2" size={20} />
            Objetivos Diarios
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Calorías objetivo</span>
              <span className="font-medium">{goals.calories} kcal</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Proteína</span>
              <span className="font-medium">{goals.protein} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Carbohidratos</span>
              <span className="font-medium">{goals.carbs} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Grasas</span>
              <span className="font-medium">{goals.fat} g</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => setEditGoalsOpen(true)}
            >
              Editar objetivos
            </Button>
          </div>
        </Card>

        {/* Settings */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            Configuración
          </h3>
          <div className="space-y-3">
            <Button variant="ghost" className="w-full justify-start">
              Cambiar objetivo de peso
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Ajustar datos personales
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Preferencias de notificaciones
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Exportar datos
            </Button>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                {theme === 'dark' ? (
                  <Moon className="mr-3" size={20} />
                ) : (
                  <Sun className="mr-3" size={20} />
                )}
                <span>Tema oscuro</span>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </div>
        </Card>

        {/* Progress Summary */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Resumen de Progreso</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Días registrados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">0</div>
              <div className="text-sm text-muted-foreground">Objetivos cumplidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">0</div>
              <div className="text-sm text-muted-foreground">Archivos creados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">0</div>
              <div className="text-sm text-muted-foreground">Racha actual</div>
            </div>
          </div>
        </Card>
      </div>

      <EditNutritionGoalsDialog 
        open={editGoalsOpen}
        onOpenChange={setEditGoalsOpen}
      />

      <BottomNavigation />
    </div>
  );
};