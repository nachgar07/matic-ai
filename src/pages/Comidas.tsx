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
import { es, enUS } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

import { useWaterIntake } from "@/hooks/useWaterIntake";

export const Comidas = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.es) => translations[language][key];
  const locale = language === 'es' ? es : enUS;
  
  // Estado para manejar las imágenes de cada plato
  const [plateImages, setPlateImages] = useState<Record<string, string>>({});
  
  const dateString = format(selectedDate, 'yyyy-MM-dd');
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
        title: t('mealDeleted'),
        description: t('mealDeletedDesc')
      });
    } catch (error) {
      toast({
        title: t('error'),
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
        title: t('mealsDeleted'),
        description: `${mealIds.length} comida${mealIds.length === 1 ? '' : 's'} eliminada${mealIds.length === 1 ? '' : 's'} correctamente`
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: "No se pudieron eliminar algunas comidas",
        variant: "destructive"
      });
    }
  };

  const handleSyncToCalendar = async () => {
    if (meals.length === 0) {
      toast({
        title: t('noMealsToSync'),
        description: t('noMealsToSyncDesc'),
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
    if (isToday) return t('today');
    return format(date, language === 'es' ? "d MMM yyyy" : "MMM d yyyy", { locale });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title={t('whatDidYouEat')} />
        <div className="p-4 text-center">
          <div className="text-muted-foreground">{t('loading')}</div>
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
        <Header title={t('whatDidYouEat')} />
        
        <div className="p-4 space-y-6">
          {/* Main Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={() => setShowCamera(true)}
              className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Camera className="mr-3" size={24} />
              {t('takePhoto')}
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-16"
              size="lg"
              onClick={() => setShowFoodSearch(true)}
            >
              <Search className="mr-3" size={24} />
              {t('searchFood')}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => setShowAssistant(true)}
            >
              <Sparkles className="mr-2" size={20} />
              {t('talkToNutri')}
            </Button>
          </div>

          {/* Nutrition Summary */}
          <NutritionSummary dailyTotals={dailyTotals} selectedDate={dateString} />

          {/* Recent Meals Section with Date Navigation */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isToday ? t('mealsToday') : `${t('mealsOf')} ${format(selectedDate, language === 'es' ? "d 'de' MMMM" : "MMMM d", { locale })}`}
              </h2>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDisplayDate(selectedDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
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
                    {t('today')}
                  </Button>
                )}
              </div>
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
          selectedDate={selectedDate}
        />
      )}

      {/* NutriAI Assistant */}
      {showAssistant && (
        <NutriAssistant
          onClose={() => setShowAssistant(false)}
          selectedDate={selectedDate}
        />
      )}
    </>
  );
};