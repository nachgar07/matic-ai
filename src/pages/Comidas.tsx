import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Camera, Plus, Search, Sparkles, Calendar } from "lucide-react";
import { FoodSearch } from "@/components/FoodSearch/FoodSearch";
import { MealLogger } from "@/components/MealLogger/MealLogger";
import { FoodPhotoCapture } from "@/components/FoodPhotoCapture/FoodPhotoCapture";
import { FoodAnalysisResults } from "@/components/FoodAnalysisResults/FoodAnalysisResults";
import { NutriAssistant } from "@/components/NutriAssistant/NutriAssistant";
import { MealPlateList } from "@/components/MealPlateList/MealPlateList";
import { NutritionSummary } from "@/components/NutritionSummary/NutritionSummary";
import { useUserMeals, Food, useDeleteMeal } from "@/hooks/useFatSecret";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Comidas = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Estado para manejar las imágenes de cada plato
  const [plateImages, setPlateImages] = useState<Record<string, string>>({});
  
  const dateString = selectedDate.toISOString().split('T')[0];
  const { data: mealsData, isLoading } = useUserMeals(dateString);
  const { mutateAsync: deleteMeal } = useDeleteMeal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { syncMealsToCalendar, isLoading: isCalendarLoading } = useGoogleCalendar();

  // Listen for meal creation events from chat
  useEffect(() => {
    const handleMealCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['user-meals'] });
    };

    window.addEventListener('meal-created', handleMealCreated);
    return () => window.removeEventListener('meal-created', handleMealCreated);
  }, [queryClient]);

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setShowFoodSearch(false);
  };

  const handleMealSuccess = () => {
    setSelectedFood(null);
    setAnalysisResults(null);
    queryClient.invalidateQueries({ queryKey: ['user-meals'] });
  };

  const handleAnalysisComplete = (analysis: any) => {
    console.log("🔍 Analysis received:", analysis);
    console.log("🖼️ Original image exists:", !!analysis.originalImage);
    console.log("🍽️ Foods detected:", analysis.foods?.length || 0);
    
    setAnalysisResults(analysis);
    setShowCamera(false);
  };

  const handleEditMeal = (meal: any) => {
    // TODO: Implement meal editing
    console.log("Edit meal:", meal);
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteMeal(mealId);
      queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      toast({
        title: "Comida eliminada",
        description: "La comida se eliminó correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la comida",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSelectedMeals = async (mealIds: string[]) => {
    try {
      await Promise.all(mealIds.map(id => deleteMeal(id)));
      queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      toast({
        title: "Comidas eliminadas",
        description: `${mealIds.length} comida${mealIds.length === 1 ? '' : 's'} eliminada${mealIds.length === 1 ? '' : 's'} correctamente`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar algunas comidas",
        variant: "destructive"
      });
    }
  };

  const handleSyncToCalendar = async () => {
    if (meals.length === 0) {
      toast({
        title: "No hay comidas",
        description: "No tienes comidas registradas para sincronizar",
        variant: "destructive"
      });
      return;
    }

    try {
      await syncMealsToCalendar(meals, dateString);
    } catch (error) {
      // Error already handled in the hook
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const formatDisplayDate = (date: Date) => {
    if (isToday) return "Hoy";
    return format(date, "d MMM yyyy", { locale: es });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="¿Qué comiste?" />
        <div className="p-4 text-center">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const meals = mealsData?.meals || [];
  const dailyTotals = mealsData?.dailyTotals || { calories: 0, carbs: 0, protein: 0, fat: 0 };

  return (
    <>
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
              onClick={() => setShowFoodSearch(true)}
            >
              <Search className="mr-3" size={24} />
              Buscar Alimentos
            </Button>

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => setShowAssistant(true)}
            >
              <Sparkles className="mr-2" size={20} />
              Hablar con NutriAI
            </Button>
          </div>

          {/* Nutrition Summary */}
          <NutritionSummary dailyTotals={dailyTotals} />

          {/* Date Navigation */}
          <div className="flex items-center gap-2 justify-between mb-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDisplayDate(selectedDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {!isToday && (
                <Button variant="ghost" onClick={handleTodayClick} className="text-primary">
                  Hoy
                </Button>
              )}
            </div>
          </div>

          {/* Recent Meals */}
          <div className="mt-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                Comidas {isToday ? "de Hoy" : `del ${format(selectedDate, "d 'de' MMMM", { locale: es })}`}
              </h2>
            </div>
          <MealPlateList 
            meals={meals}
            onDeleteSelectedMeals={handleDeleteSelectedMeals}
            onDeleteMeal={handleDeleteMeal}
            plateImages={plateImages}
          />
          </div>
        </div>

        <BottomNavigation />
      </div>

      {/* Food Search Modal */}
      {showFoodSearch && (
        <FoodSearch
          onFoodSelect={handleFoodSelect}
          onClose={() => setShowFoodSearch(false)}
        />
      )}

      {/* Meal Logger Modal */}
      {selectedFood && (
        <MealLogger
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
          onSuccess={handleMealSuccess}
          selectedDate={selectedDate}
        />
      )}

      {/* Food Photo Capture Modal */}
      {showCamera && (
        <FoodPhotoCapture
          onAnalysisComplete={handleAnalysisComplete}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Analysis Results Modal */}
      {analysisResults && (
        <FoodAnalysisResults
          analysis={analysisResults}
          onClose={() => setAnalysisResults(null)}
          onSuccess={handleMealSuccess}
        />
      )}

      {/* NutriAI Assistant */}
      {showAssistant && (
        <NutriAssistant
          onClose={() => setShowAssistant(false)}
        />
      )}
    </>
  );
};