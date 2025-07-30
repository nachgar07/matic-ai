import { useState } from "react";
import { Search, Filter, Heart, Plus, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSearchFoods, Food, useAddFavorite, useFavoriteFoods } from "@/hooks/useFatSecret";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ManualFoodEntry } from "@/components/ManualFoodEntry/ManualFoodEntry";

interface FoodSearchProps {
  onFoodSelect: (food: Food) => void;
  onClose: () => void;
}

export const FoodSearch = ({ onFoodSelect, onClose }: FoodSearchProps) => {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { mutateAsync: searchFoods } = useSearchFoods();
  const { mutateAsync: addFavorite } = useAddFavorite();
  const { data: favorites } = useFavoriteFoods();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const results = await searchFoods(query);
      setSearchResults(results.foods || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron buscar los alimentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddFavorite = async (foodId: string) => {
    try {
      await addFavorite(foodId);
      queryClient.invalidateQueries({ queryKey: ['favorite-foods'] });
      toast({
        title: "¡Agregado a favoritos!",
        description: "El alimento se añadió a tus favoritos"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar a favoritos",
        variant: "destructive"
      });
    }
  };

  const isFavorite = (foodId: string) => {
    return favorites?.some(fav => fav.food_id === foodId) || false;
  };

  const handleManualFoodAdded = (food: Food) => {
    onFoodSelect(food);
    setShowManualEntry(false);
  };

  if (showManualEntry) {
    return (
      <ManualFoodEntry
        onFoodAdded={handleManualFoodAdded}
        onClose={() => setShowManualEntry(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" onClick={onClose}>
          ×
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar alimentos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
            autoFocus
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "..." : <Search size={20} />}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowManualEntry(true)}
          className="ml-2"
        >
          <PlusCircle size={16} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-4 border-b overflow-x-auto">
        <Badge variant="secondary" className="whitespace-nowrap">
          <Filter size={14} className="mr-1" />
          Todos
        </Badge>
        <Badge variant="outline" className="whitespace-nowrap">Bajo en calorías</Badge>
        <Badge variant="outline" className="whitespace-nowrap">Alto en proteína</Badge>
        <Badge variant="outline" className="whitespace-nowrap">Vegano</Badge>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="text-center text-muted-foreground py-8">
            Buscando alimentos...
          </div>
        )}
        
        {searchResults.length === 0 && !loading && (
          <div className="text-center text-muted-foreground py-8">
            {query ? "No se encontraron resultados. Prueba con otro término o agrega un alimento manual." : "Busca un alimento o agrega uno manualmente"}
          </div>
        )}

        {searchResults.map((food) => (
          <Card key={food.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{food.food_name}</h3>
                {food.brand_name && (
                  <p className="text-xs text-muted-foreground">{food.brand_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {food.serving_description || "1 porción"}
                </p>
                
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="font-medium">
                    {food.calories_per_serving || 0} cal
                  </span>
                  <span>P: {food.protein_per_serving || 0}g</span>
                  <span>C: {food.carbs_per_serving || 0}g</span>
                  <span>G: {food.fat_per_serving || 0}g</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 ml-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 p-0 ${isFavorite(food.food_id) ? 'text-red-500' : ''}`}
                  onClick={() => handleAddFavorite(food.food_id)}
                >
                  <Heart size={16} fill={isFavorite(food.food_id) ? 'currentColor' : 'none'} />
                </Button>
                <Button
                  size="sm"
                  onClick={() => onFoodSelect(food)}
                  className="h-8 w-8 p-0"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};