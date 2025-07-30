import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Mic, MicOff, Send, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface NutriAssistantProps {
  onClose: () => void;
  initialContext?: string; // For photo analysis context
}

export const NutriAssistant = ({ onClose, initialContext }: NutriAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: Message = {
      role: 'assistant',
      content: '¡Hola! Soy NutriAI, tu asistente nutricional. Puedo ayudarte con consejos sobre alimentación, analizar tus comidas y responder preguntas sobre nutrición. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);

    // If there's initial context (from photo analysis), add it
    if (initialContext) {
      const contextMessage: Message = {
        role: 'user',
        content: `Acabo de analizar una foto de comida: ${initialContext}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, contextMessage]);
      handleSendMessage(`Acabo de analizar una foto de comida: ${initialContext}`, false);
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Error de reconocimiento",
          description: "No se pudo procesar el audio. Intenta de nuevo.",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [initialContext]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const getUserNutritionContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Try to get nutrition goals, but don't fail if they don't exist
      let goals = {
        daily_calories: 2000,
        daily_protein: 150,
        daily_carbs: 250,
        daily_fat: 67
      };

      try {
        const { data: userGoals } = await supabase
          .from('nutrition_goals')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (userGoals) {
          goals = userGoals;
        }
      } catch (error) {
        console.log('No nutrition goals found, using defaults');
      }

      // Get today's meals
      const today = new Date().toISOString().split('T')[0];
      const { data: todayMeals } = await supabase
        .from('meal_entries')
        .select(`
          *,
          foods (*)
        `)
        .eq('user_id', user.id)
        .gte('consumed_at', `${today}T00:00:00`)
        .lt('consumed_at', `${today}T23:59:59`)
        .order('consumed_at', { ascending: false });

      // Get recent meals (last 7 days for pattern analysis)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentMeals } = await supabase
        .from('meal_entries')
        .select(`
          *,
          foods (*)
        `)
        .eq('user_id', user.id)
        .gte('consumed_at', sevenDaysAgo.toISOString())
        .order('consumed_at', { ascending: false })
        .limit(50);

      // Calculate today's totals
      const todayTotals = todayMeals?.reduce((acc: any, meal: any) => {
        if (meal.foods) {
          const calories = (meal.foods.calories_per_serving || 0) * meal.servings;
          const protein = (meal.foods.protein_per_serving || 0) * meal.servings;
          const carbs = (meal.foods.carbs_per_serving || 0) * meal.servings;
          const fat = (meal.foods.fat_per_serving || 0) * meal.servings;
          
          return {
            calories: acc.calories + calories,
            protein: acc.protein + protein,
            carbs: acc.carbs + carbs,
            fat: acc.fat + fat
          };
        }
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 }) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

      // Group today's meals by type
      const mealsByType = todayMeals?.reduce((acc: any, meal: any) => {
        if (!acc[meal.meal_type]) {
          acc[meal.meal_type] = [];
        }
        acc[meal.meal_type].push({
          food_name: meal.foods?.food_name || 'Comida manual',
          servings: meal.servings,
          calories: (meal.foods?.calories_per_serving || 0) * meal.servings,
          protein: (meal.foods?.protein_per_serving || 0) * meal.servings
        });
        return acc;
      }, {});

      // Get frequent foods
      const foodCounts: { [key: string]: number } = {};
      recentMeals?.forEach(meal => {
        if (meal.foods?.food_name) {
          foodCounts[meal.foods.food_name] = (foodCounts[meal.foods.food_name] || 0) + 1;
        }
      });
      
      const frequentFoods = Object.entries(foodCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([food, count]) => ({ food, count }));

      return {
        user: {
          id: user.id,
          email: user.email,
          display_name: profile?.display_name || 'Usuario'
        },
        goals,
        today: {
          consumed: todayTotals,
          meals: mealsByType,
          meal_count: todayMeals?.length || 0
        },
        recent_patterns: {
          total_meals: recentMeals?.length || 0,
          frequent_foods: frequentFoods
        }
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return null;
    }
  };

  const handleSendMessage = async (text?: string, addToUI = true) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    if (addToUI) {
      setMessages(prev => [...prev, userMessage]);
    }
    setInputText('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get user context from frontend
      const userContext = await getUserNutritionContext();

      const { data, error } = await supabase.functions.invoke('gemini-food-assistant', {
        body: {
          action: 'chat',
          text: messageText,
          conversationHistory,
          userContext // Pass context directly from frontend
        }
      });

      if (error) {
        throw error;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If a meal was created, show success toast
      if (data.meal_created && data.meal_data?.success) {
        toast({
          title: "¡Comida registrada!",
          description: `Se agregó tu ${getMealTypeName(data.meal_data.meal_type)} con ${data.meal_data.totals.calories} kcal`,
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Try to provide a more helpful error message
      let errorMessage = "Disculpa, tengo problemas de conexión en este momento. Por favor intenta de nuevo.";
      let toastMessage = "No se pudo enviar el mensaje. Verifica tu conexión e intenta de nuevo.";
      
      if (error.message?.includes('non-2xx')) {
        errorMessage = "El servicio de IA está temporalmente sobrecargado. Mientras tanto, puedes usar el botón 'Buscar comida' para agregar alimentos manualmente. ¿Hay algo específico sobre nutrición en lo que pueda ayudarte?";
        toastMessage = "Servicio temporalmente sobrecargado. Intenta de nuevo en unos segundos.";
      }

      toast({
        title: "Problema temporal",
        description: toastMessage,
        variant: "destructive"
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Función no disponible",
        description: "El reconocimiento de voz no está disponible en este navegador.",
        variant: "destructive"
      });
      return;
    }

    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMealTypeName = (mealType: string) => {
    const names: { [key: string]: string } = {
      breakfast: 'desayuno',
      lunch: 'almuerzo',
      dinner: 'cena',
      snack: 'snack'
    };
    return names[mealType] || mealType;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[80vh] bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">NutriAI</h3>
              <p className="text-xs text-muted-foreground">Tu asistente nutricional</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] space-y-1`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-muted mr-4'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className={`text-xs text-muted-foreground ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg mr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-muted-foreground">NutriAI está escribiendo...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe tu pregunta sobre nutrición..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
                className="flex-1"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={isListening ? 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700' : ''}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {isListening && (
            <div className="mt-2 text-center">
              <p className="text-xs text-red-600 dark:text-red-400 animate-pulse">
                🎤 Escuchando... Habla ahora
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};