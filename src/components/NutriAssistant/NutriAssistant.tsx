
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Mic, MicOff, Send, X, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { useMealCategories } from '@/hooks/useMealCategories';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface NutriAssistantProps {
  onClose: () => void;
  initialContext?: string; // For photo analysis context
  selectedDate?: Date;
}

export const NutriAssistant = ({ onClose, initialContext, selectedDate }: NutriAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { clearAllConversations } = useChatPersistence();
  const { data: mealCategories } = useMealCategories();

  // Load conversation history on component mount
  useEffect(() => {
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If no user, show welcome message
        const welcomeMessage: Message = {
          role: 'assistant',
          content: '¡Hola! Soy NutriAI, tu asistente nutricional. Puedo ayudarte con consejos sobre alimentación, analizar tus comidas y responder preguntas sobre nutrición. ¿En qué puedo ayudarte hoy?',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        return;
      }

      const { data: conversations, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true })
        .limit(50); // Limit to last 50 messages

      if (error) {
        console.error('Error loading conversation history:', error);
        // Show welcome message even if there's an error
        const welcomeMessage: Message = {
          role: 'assistant',
          content: '¡Hola! Soy NutriAI, tu asistente nutricional. Puedo ayudarte con consejos sobre alimentación, analizar tus comidas y responder preguntas sobre nutrición. ¿En qué puedo ayudarte hoy?',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        return;
      }

      let loadedMessages: Message[] = [];

      if (conversations && conversations.length > 0) {
        loadedMessages = conversations.map(conv => ({
          id: conv.id,
          content: conv.message_content,
          role: conv.message_role as 'user' | 'assistant',
          timestamp: new Date(conv.timestamp)
        }));
      } else {
        // If no conversation history, add welcome message
        const welcomeMessage: Message = {
          role: 'assistant',
          content: '¡Hola! Soy NutriAI, tu asistente nutricional. Puedo ayudarte con consejos sobre alimentación, analizar tus comidas y responder preguntas sobre nutrición. ¿En qué puedo ayudarte hoy?',
          timestamp: new Date()
        };
        loadedMessages = [welcomeMessage];
        // Save welcome message to database
        await saveMessageToDb(welcomeMessage.content, 'assistant');
      }

      setMessages(loadedMessages);

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
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Fallback to welcome message
      const welcomeMessage: Message = {
        role: 'assistant',
        content: '¡Hola! Soy NutriAI, tu asistente nutricional. Puedo ayudarte con consejos sobre alimentación, analizar tus comidas y responder preguntas sobre nutrición. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  };

  const saveMessageToDb = async (content: string, role: 'user' | 'assistant') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          message_content: content,
          message_role: role
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
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

      // Default values - will be overridden by user goals if they exist
      let goals = {
        daily_calories: 2000,
        daily_protein: 150,
        daily_carbs: 200,
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

      // Get today's meals (local timezone)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowYear = tomorrow.getFullYear();
      const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
      
      console.log('Fetching meals for date:', today);
      
      const { data: todayMeals } = await supabase
        .from('meal_entries')
        .select(`
          *,
          foods (*)
        `)
        .eq('user_id', user.id)
        .gte('consumed_at', `${today}T00:00:00`)
        .lt('consumed_at', `${tomorrowStr}T00:00:00`)
        .order('consumed_at', { ascending: false });

      console.log('Found meals for today:', todayMeals?.length || 0);
      console.log('Today meals:', todayMeals?.map(m => ({ 
        food: m.foods?.food_name, 
        type: m.meal_type, 
        time: m.consumed_at 
      })));

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

      console.log('📊 Calculated today totals:', todayTotals);
      console.log('📊 Each meal breakdown:', todayMeals?.map(m => ({
        food: m.foods?.food_name,
        servings: m.servings,
        calories_per_serving: m.foods?.calories_per_serving,
        total_calories: (m.foods?.calories_per_serving || 0) * m.servings,
        meal_type: m.meal_type,
        time: m.consumed_at
      })));

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

      // Add user's custom meal categories to context
      const userMealCategories = mealCategories?.map(category => ({
        name: category.name,
        icon: category.icon,
        color: category.color,
        is_default: category.is_default
      })) || [];

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
        },
        meal_categories: userMealCategories
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

    // Save user message to database
    await saveMessageToDb(messageText, 'user');

    try {
      console.log('🚀 Starting message send...', { messageText });

      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get user context from frontend
      const userContext = await getUserNutritionContext();
      console.log('👤 User context loaded:', !!userContext);
      console.log('🏷️ User meal categories:', userContext?.meal_categories);

      // Get auth session to pass to edge function
      let { data: { session } } = await supabase.auth.getSession();
      
      console.log('🔐 Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length,
        expiresAt: session?.expires_at,
        isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : 'no-expiry-info'
      });

      // If no session or expired, try to refresh
      if (!session?.access_token || (session.expires_at && new Date(session.expires_at * 1000) < new Date())) {
        console.log('🔄 Session invalid/expired, attempting refresh...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('❌ Session refresh failed:', refreshError);
          
          // Clear any invalid session data
          await supabase.auth.signOut();
          
          toast({
            title: "Sesión expirada",
            description: "Tu sesión ha expirado. Por favor, recarga la página para volver a iniciar sesión.",
            variant: "destructive",
            action: (
              <button 
                onClick={() => window.location.reload()} 
                className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
              >
                Recargar
              </button>
            )
          });
          
          throw new Error('Sesión expirada. Por favor, recarga la página.');
        }
        
        session = refreshData.session;
        console.log('✅ Session refreshed successfully');
      }
      
      console.log('📤 Invoking OpenAI assistant...');
      const { data, error } = await supabase.functions.invoke('openai-food-assistant', {
        body: {
          action: 'chat',
          text: messageText,
          conversationHistory,
          userContext: {
            ...userContext,
            originalUserMessage: messageText,
            selectedDate: selectedDate?.toISOString()
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('📥 Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      // Normalize payload shape between different function versions
      const payload: any = (data && (data as any).data) ? (data as any).data : (data as any);
      const replyText: string = payload?.response ?? payload?.reply ?? payload?.message ?? '';

      if (!replyText) {
        console.error('No response data:', data);
        throw new Error('La IA no devolvió una respuesta válida');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: replyText,
        timestamp: new Date()
      };

      console.log('✅ Adding assistant message:', assistantMessage.content.substring(0, 100) + '...');
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveMessageToDb(assistantMessage.content, 'assistant');

      // If a meal was created, show success toast and refresh data
      const mealCreated: boolean = Boolean(payload?.meal_created ?? payload?.functionCalled);
      const mealData = payload?.meal_data ?? null;
      if (mealCreated) {
        toast({
          title: "¡Comida registrada!",
          description: mealData?.totals?.calories
            ? `Se agregó tu comida con ${mealData.totals.calories} kcal`
            : `Se agregó tu comida correctamente`,
        });
        // Trigger data refresh on parent component
        window.dispatchEvent(new CustomEvent('meal-created'));
      }

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      
      // More detailed error handling
      let errorMessage = "Disculpa, tengo problemas técnicos en este momento. ¿Puedes intentar de nuevo?";
      let toastMessage = "Error de comunicación";
      let toastDescription = "Intenta de nuevo en unos segundos";
      
      // Log the full error for debugging
      console.error('Full error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack,
        response: error.response
      });
      
      if (error.message?.includes('non-2xx') || error.message?.includes('500') || error.status === 500) {
        errorMessage = "🤖 El asistente de IA está temporalmente no disponible.\n\n✅ Alternativas que puedes usar:\n• Botón 'Buscar comida' para agregar alimentos\n• 'Capturar foto' para analizar tus comidas\n• Intenta nuevamente en unos minutos";
        toastMessage = "Servicio IA no disponible";
        toastDescription = "Usa las opciones manuales mientras tanto";
      } else if (error.message?.includes('401') || error.status === 401) {
        errorMessage = "Tu sesión ha expirado. Recarga la página e inicia sesión nuevamente.";
        toastMessage = "Sesión expirada";
        toastDescription = "Recarga la página";
      } else if (error.message?.includes('429') || error.status === 429) {
        errorMessage = "Has hecho muchas consultas muy rápido. Espera un momento antes de intentar nuevamente.";
        toastMessage = "Límite alcanzado";
        toastDescription = "Espera un momento";
      } else if (error.message?.includes('network') || error.name === 'NetworkError') {
        errorMessage = "Problema de conexión a internet. Verifica tu conexión e intenta nuevamente.";
        toastMessage = "Error de conexión";
        toastDescription = "Verifica tu internet";
      }

      toast({
        title: toastMessage,
        description: toastDescription,
        variant: "destructive",
        duration: 6000,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveMessageToDb(assistantMessage.content, 'assistant');
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

  // Format assistant messages to remove markdown and add icons (avoid duplicating existing icons)
  const formatAssistantMessage = (content: string) => {
    // Handle undefined or null content
    if (!content) {
      return '';
    }
    
    let formatted = content;
    
    // Remove markdown bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Remove markdown headers
    formatted = formatted.replace(/### (.*?)(\n|$)/g, '$1$2');
    formatted = formatted.replace(/## (.*?)(\n|$)/g, '$1$2');
    formatted = formatted.replace(/# (.*?)(\n|$)/g, '$1$2');
    
    // Only add food emojis if they don't already exist in the text
    if (!formatted.includes('🥚')) {
      formatted = formatted.replace(/^- (Huevos?|Huevo)/gmi, '🥚 $1');
    }
    if (!formatted.includes('🍞')) {
      formatted = formatted.replace(/^- (Pan|Tostada)/gmi, '🍞 $1');
    }
    if (!formatted.includes('🥑')) {
      formatted = formatted.replace(/^- (Palta|Aguacate)/gmi, '🥑 $1');
    }
    if (!formatted.includes('🍗')) {
      formatted = formatted.replace(/^- (Pollo|Pechuga)/gmi, '🍗 $1');
    }
    if (!formatted.includes('🍚')) {
      formatted = formatted.replace(/^- (Arroz)/gmi, '🍚 $1');
    }
    if (!formatted.includes('🌾')) {
      formatted = formatted.replace(/^- (Quinoa)/gmi, '🌾 $1');
    }
    if (!formatted.includes('🥗')) {
      formatted = formatted.replace(/^- (Ensalada|Lechuga)/gmi, '🥗 $1');
    }
    if (!formatted.includes('🍅')) {
      formatted = formatted.replace(/^- (Tomate)/gmi, '🍅 $1');
    }
    if (!formatted.includes('🍋')) {
      formatted = formatted.replace(/^- (Limón)/gmi, '🍋 $1');
    }
    
    // Add nutrition emoji before totals only if they don't already exist
    if (!formatted.includes('📊')) {
      formatted = formatted.replace(/Totales del (desayuno|almuerzo|cena|snack):/gi, '📊 Totales del $1:');
    }
    if (!formatted.includes('🔥')) {
      formatted = formatted.replace(/Calorías:/gi, '🔥 Calorías:');
    }
    if (!formatted.includes('💪')) {
      formatted = formatted.replace(/Proteína:/gi, '💪 Proteína:');
    }
    if (!formatted.includes('🌾')) {
      formatted = formatted.replace(/Carbohidratos:/gi, '🌾 Carbohidratos:');
    }
    if (!formatted.includes('🥑')) {
      formatted = formatted.replace(/Grasas:/gi, '🥑 Grasas:');
    }
    
    return formatted;
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

  const clearConversation = async () => {
    const success = await clearAllConversations();
    if (success) {
      setMessages([]);
      // Add welcome message after clearing
      const welcomeMessage: Message = {
        role: 'assistant',
        content: '¡Hola! Soy NutriAI, tu asistente nutricional. Puedo ayudarte con consejos sobre alimentación, analizar tus comidas y responder preguntas sobre nutrición. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      await saveMessageToDb(welcomeMessage.content, 'assistant');
      
      toast({
        title: "Conversación limpiada",
        description: "Se ha borrado todo el historial de conversación.",
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo limpiar la conversación.",
        variant: "destructive"
      });
    }
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={clearConversation} title="Limpiar conversación">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
                    <p className="text-sm whitespace-pre-wrap">
                      {message.role === 'assistant' ? formatAssistantMessage(message.content) : message.content}
                    </p>
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
