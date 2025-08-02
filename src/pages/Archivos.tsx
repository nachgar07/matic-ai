import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoCapture } from "@/components/PhotoCapture/PhotoCapture";
import { ExpenseChart } from "@/components/ExpenseChart/ExpenseChart";
import { CategoryManager } from "@/components/CategoryManager/CategoryManager";
import { ExpenseReviewModal } from "@/components/ExpenseReviewModal/ExpenseReviewModal";
import { ManualExpenseEntry } from "@/components/ManualExpenseEntry/ManualExpenseEntry";

import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, FileText, Plus, MoreVertical, Camera, Receipt, Trash2, Edit, Eye, Calendar as CalendarIcon, Filter, PenTool } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Gasto {
  id: string;
  nombre: string;
  fecha: string;
  fechaCreacion: string;
  tipo: "ticket" | "excel_voz";
  total: number;
  items: Array<{
    producto: string;
    cantidad: string;
    precio: number;
  }>;
  imagenTicket?: string;
  categoryId?: string;
}

export const Archivos = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Gasto>>({});
  const [filterDate, setFilterDate] = useState<Date>(new Date()); // Por defecto hoy
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('month'); // Período para el gráfico
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<any>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // Para controlar el popover del calendario
  const [showImageModal, setShowImageModal] = useState(false); // Para el modal de imagen
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // URL de la imagen seleccionada
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const { toast } = useToast();
  
  // Hook para manejar categorías
  const { 
    categories, 
    loading: categoriesLoading, 
    addCategory: addCategoryHook, 
    updateCategory: updateCategoryHook, 
    deleteCategory: deleteCategoryHook 
  } = useExpenseCategories();

  // Wrappers para hacer compatibles las funciones con CategoryManager
  const handleAddCategory = async (categoryData: { name: string; color: string; icon: string }) => {
    await addCategoryHook(categoryData);
  };

  const handleUpdateCategory = async (id: string, categoryData: { name: string; color: string; icon: string }) => {
    await updateCategoryHook(id, categoryData);
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategoryHook(id);
  };

  // Persistencia local como backup - limitada para evitar quota exceeded
  const saveToLocalStorage = (gastos: Gasto[]) => {
    if (user) {
      try {
        // Guardar solo los últimos 20 gastos para evitar quota exceeded
        const limitedGastos = gastos.slice(0, 20);
        localStorage.setItem(`gastos_${user.id}`, JSON.stringify(limitedGastos));
      } catch (error) {
        console.warn('LocalStorage quota exceeded, clearing old data:', error);
        // Si falla, limpiar storage anterior y guardar solo los últimos 10
        try {
          localStorage.removeItem(`gastos_${user.id}`);
          const veryLimitedGastos = gastos.slice(0, 10);
          localStorage.setItem(`gastos_${user.id}`, JSON.stringify(veryLimitedGastos));
        } catch (secondError) {
          console.error('Failed to save to localStorage even after cleanup:', secondError);
        }
      }
    }
  };

  const loadFromLocalStorage = (): Gasto[] => {
    if (user) {
      try {
        const saved = localStorage.getItem(`gastos_${user.id}`);
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.warn('Error loading from localStorage, clearing data:', error);
        localStorage.removeItem(`gastos_${user.id}`);
        return [];
      }
    }
    return [];
  };

  // Verificar autenticación y cargar datos con realtime
  useEffect(() => {
    let isMounted = true;
    let realtimeChannel = null;
    let hasLoadedExpenses = false; // Bandera para evitar múltiples cargas iniciales

    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        setLoading(true);

        // Obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('📋 Session check:', session?.user?.id || 'No session');

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          return;
        }

        if (session?.user && isMounted) {
          console.log('✅ User authenticated:', session.user.id);
          setUser(session.user);
          
          // Cargar gastos solo si no se han cargado ya
          if (!hasLoadedExpenses) {
            hasLoadedExpenses = true;
            await loadExpenses(session.user.id, filterDate);
          }
          
          // Configurar realtime para escuchar cambios en expenses
          realtimeChannel = supabase
            .channel('expenses-changes')
            .on(
              'postgres_changes',
              {
                event: '*', // Escuchar INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'expenses',
                filter: `user_id=eq.${session.user.id}`
              },
              (payload) => {
                console.log('🔄 Realtime expense change:', payload);
                // Recargar gastos cuando hay cambios (solo si no es una carga inicial)
                if (isMounted && session.user && hasLoadedExpenses) {
                  console.log('🔄 Reloading expenses due to realtime change');
                  loadExpenses(session.user.id, filterDate);
                }
              }
            )
            .subscribe();
            
          console.log('📡 Realtime channel configured');
        } else {
          console.log('⚠️ No authenticated user');
          if (isMounted) {
            setLoading(false);
            toast({
              title: "Sesión requerida",
              description: "Por favor inicia sesión para ver tus gastos",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Listener para cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id);
        
        if (session?.user && isMounted) {
          setUser(session.user);
          // No cargar gastos aquí para evitar duplicados
        } else if (isMounted) {
          setUser(null);
          setGastos([]);
          setLoading(false);
          hasLoadedExpenses = false; // Reset para próxima sesión
        }
      }
    );

    initializeApp();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  const loadExpenses = async (userId: string, dateFilter?: Date | null, showRecent?: boolean) => {
    if (!userId) return;
    
    try {
      console.log('📊 Loading expenses for user:', userId);
      setLoading(true);

      let query = supabase
        .from('expenses')
        .select(`
          *,
          expense_items (*)
        `)
        .eq('user_id', userId);

      // Aplicar filtro de fecha si se proporciona
      if (dateFilter) {
        const selectedDate = format(dateFilter, 'yyyy-MM-dd');
        query = query.eq('expense_date', selectedDate);
        console.log('📅 Filtering by date:', selectedDate);
      } else if (showRecent) {
        // Mostrar gastos de las últimas 24 horas basado en created_at
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', yesterday);
        console.log('📅 Filtering recent (last 24h):', yesterday);
      }

      const { data: expenses, error } = await query.order('expense_date', { ascending: false });

      console.log('📈 Query result - Error:', error, 'Count:', expenses?.length || 0);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      const gastosTransformados = expenses?.map(expense => ({
        id: expense.id,
        nombre: expense.store_name || 'Establecimiento desconocido',
        fecha: expense.expense_date,
        fechaCreacion: expense.created_at,
        tipo: 'ticket' as const,
        total: parseFloat(expense.total_amount.toString()),
        items: expense.expense_items?.map(item => ({
          producto: item.product_name,
          cantidad: item.quantity,
          precio: parseFloat(item.total_price.toString())
        })) || [],
        imagenTicket: expense.receipt_image,
        categoryId: expense.category_id
      })) || [];

      console.log('✅ Transformed expenses:', gastosTransformados.length);
      setGastos(gastosTransformados);
      saveToLocalStorage(gastosTransformados);
    } catch (error) {
      console.error('💥 Load expenses error:', error);
      
      // Intentar cargar desde localStorage como fallback
      const localData = loadFromLocalStorage();
      if (localData.length > 0) {
        console.log('📱 Loading from localStorage as fallback');
        setGastos(localData);
        toast({
          title: "Datos cargados desde caché local",
          description: "Se mostraron los datos guardados localmente"
        });
      } else {
        toast({
          title: "Error",
          description: `No se pudieron cargar los gastos: ${error.message}`,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para cargar gastos por período (para el gráfico)
  const loadExpensesForChart = async (userId: string, period: 'day' | 'week' | 'month', baseDate?: Date) => {
    if (!userId) return [];
    
    try {
      const referenceDate = baseDate || new Date();
      let startDate: Date;
      let endDate: Date;
      
      switch (period) {
        case 'day':
          startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
          endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59);
          break;
        case 'week':
          const weekStart = new Date(referenceDate);
          weekStart.setDate(referenceDate.getDate() - referenceDate.getDay());
          startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          endDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59);
          break;
        case 'month':
          startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
          endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
          endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59);
      }
      
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_items (*)
        `)
        .eq('user_id', userId)
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });

      if (error) throw error;

      return expenses?.map(expense => ({
        id: expense.id,
        nombre: expense.store_name || 'Establecimiento desconocido',
        fecha: expense.expense_date,
        fechaCreacion: expense.created_at,
        tipo: 'ticket' as const,
        total: parseFloat(expense.total_amount.toString()),
        items: expense.expense_items?.map(item => ({
          producto: item.product_name,
          cantidad: item.quantity,
          precio: parseFloat(item.total_price.toString())
        })) || [],
        imagenTicket: expense.receipt_image,
        categoryId: expense.category_id
      })) || [];
    } catch (error) {
      console.error('Error loading expenses for chart:', error);
      return [];
    }
  };


  const fetchGastos = async () => {
    if (!user) {
      console.log('⚠️ No user available for fetch');
      return;
    }
    await loadExpenses(user.id, filterDate);
  };

  // Función para manejar cambio de filtro de fecha
  const handleDateFilterChange = async (date: Date | undefined) => {
    if (date && user) {
      setFilterDate(date);
      await loadExpenses(user.id, date);
      setIsCalendarOpen(false); // Cerrar el popover después de seleccionar fecha
    }
  };

  // Función para mostrar imagen en grande
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  // Función para manejar gasto manual agregado
  const handleManualExpenseAdded = async (expenseData: any, categoryId: string | null) => {
    if (!user) return;

    try {
      const gastoData = {
        user_id: user.id,
        store_name: expenseData.store_name,
        total_amount: expenseData.total_amount,
        expense_date: expenseData.expense_date,
        payment_method: expenseData.payment_method,
        confidence: expenseData.confidence,
        category_id: categoryId
      };

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert(gastoData)
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Si hay items, guardarlos también
      if (expenseData.items && expenseData.items.length > 0) {
        const itemsData = expenseData.items.map((item: any) => ({
          expense_id: expense.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        const { error: itemsError } = await supabase
          .from('expense_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      // Recargar gastos
      await fetchGastos();

      toast({
        title: "¡Gasto creado!",
        description: "El gasto se ha guardado correctamente"
      });

    } catch (error) {
      console.error('Error saving manual expense:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el gasto",
        variant: "destructive"
      });
    }
  };

  // useEffect para recargar cuando cambie el filtro de fecha
  useEffect(() => {
    if (user && filterDate) {
      loadExpenses(user.id, filterDate);
    }
  }, [filterDate]);

  const handleTicketAnalysis = async (analysis: any) => {
    console.log('🎯 Ticket analysis received:', analysis);
    
    if (!user) {
      console.log('❌ No user found for ticket analysis');
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive"
      });
      return;
    }
    
    // Mostrar modal de revisión en lugar de guardar directamente
    setPendingAnalysis(analysis);
    setShowReviewModal(true);
    setShowPhotoCapture(false);
  };

  const handleReviewConfirm = async (data: any) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log('💾 Saving reviewed expense to database...');
      
      // Crear el gasto principal en Supabase
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          store_name: data.store_name || 'Establecimiento desconocido',
          expense_date: data.date || data.dateDetected || new Date().toISOString().split('T')[0],
          total_amount: parseFloat(data.total_amount) || 0,
          payment_method: data.payment_method || 'efectivo',
          receipt_image: data.originalImage,
          confidence: parseFloat(data.confidence) || 0.5,
          category_id: data.categoryId || null
        })
        .select()
        .single();

      console.log('💿 Expense created:', expense?.id, 'Error:', expenseError);

      if (expenseError) {
        console.error('❌ Error creating expense:', expenseError);
        throw expenseError;
      }

      // Crear los items del gasto
      if (data.items && data.items.length > 0) {
        console.log('📝 Creating expense items:', data.items.length);
        const items = data.items.map((item: any) => ({
          expense_id: expense.id,
          product_name: item.product_name || 'Producto desconocido',
          quantity: item.quantity || '1x',
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0
        }));

        const { error: itemsError } = await supabase
          .from('expense_items')
          .insert(items);

        console.log('📋 Items created. Error:', itemsError);

        if (itemsError) {
          console.error('❌ Error creating expense items:', itemsError);
          throw itemsError;
        }
      }

      console.log('✅ Expense saved successfully!');
      toast({
        title: "¡Gasto registrado!",
        description: `Se registró el gasto de ${data.store_name || 'Establecimiento'} por $${data.total_amount}`
      });

      // Refrescar la lista inmediatamente
      console.log('🔄 Refreshing expenses list...');
      await loadExpenses(user.id, filterDate);
      setShowReviewModal(false);
      setPendingAnalysis(null);
    } catch (error) {
      console.error('💥 Error saving expense:', error);
      toast({
        title: "Error",
        description: `No se pudo guardar el gasto: ${error.message || 'Error desconocido'}`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteGasto = async (gastoId: string) => {
    if (!user) {
      console.log('No user found for delete');
      return;
    }
    
    try {
      console.log('Deleting expense:', gastoId);
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', gastoId);

      console.log('Delete completed. Error:', error);

      if (error) {
        console.error('Error deleting expense:', error);
        throw error;
      }

      toast({
        title: "Gasto eliminado",
        description: "El gasto se eliminó correctamente"
      });

      console.log('Calling fetchGastos after delete');
      await fetchGastos();
      console.log('fetchGastos completed after delete');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: `No se pudo eliminar el gasto: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleViewGasto = (gasto: Gasto) => {
    setSelectedGasto(gasto);
    setShowViewModal(true);
  };

  const handleEditGasto = (gasto: Gasto) => {
    setSelectedGasto(gasto);
    setEditForm({
      nombre: gasto.nombre,
      total: gasto.total,
      categoryId: gasto.categoryId
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedGasto || !user) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          store_name: editForm.nombre,
          total_amount: editForm.total,
          category_id: editForm.categoryId || null
        })
        .eq('id', selectedGasto.id);

      if (error) {
        console.error('Error updating expense:', error);
        throw error;
      }

      toast({
        title: "Gasto actualizado",
        description: "Los cambios se guardaron correctamente"
      });

      setShowEditModal(false);
      await fetchGastos();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: `No se pudo actualizar el gasto: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Estado para datos del gráfico
  const [chartExpenses, setChartExpenses] = useState<Gasto[]>([]);

  // Cargar datos del gráfico según el período seleccionado y fecha del filtro
  useEffect(() => {
    if (user) {
      loadExpensesForChart(user.id, chartPeriod, filterDate).then(setChartExpenses);
    }
  }, [user, chartPeriod, filterDate]);

  // Procesar datos para el gráfico de categorías
  const getChartData = () => {
    if (!chartExpenses.length) return { chartData: [], totalAmount: 0 };

    // Mapear gastos con sus categorías
    const categoryTotals = new Map();
    let totalAmount = 0;

    chartExpenses.forEach(gasto => {
      totalAmount += gasto.total;
      
      // Buscar la categoría del gasto
      let categoryName = 'Sin Categoría';
      let categoryColor = '#6366f1';
      let categoryIcon = '💰';
      
      if (gasto.categoryId && categories.length > 0) {
        const category = categories.find(c => c.id === gasto.categoryId);
        if (category) {
          categoryName = category.name;
          categoryColor = category.color;
          categoryIcon = category.icon;
        }
      }
      
      const current = categoryTotals.get(categoryName) || { amount: 0, color: categoryColor, icon: categoryIcon };
      categoryTotals.set(categoryName, {
        amount: current.amount + gasto.total,
        color: categoryColor,
        icon: categoryIcon
      });
    });

    const chartData = Array.from(categoryTotals.entries()).map(([categoryName, data]) => ({
      name: categoryName,
      value: data.amount,
      color: data.color,
      icon: data.icon
    }));

    return { chartData, totalAmount };
  };

  const { chartData, totalAmount } = getChartData();

  // Función para obtener el título del período
  const getPeriodTitle = () => {
    switch (chartPeriod) {
      case 'day': return 'Hoy';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      default: return 'Este Mes';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Gastos y Recibos"
        rightAction={
          <Button size="sm" className="rounded-full" onClick={() => setShowPhotoCapture(true)}>
            <Receipt size={16} />
          </Button>
        }
      />
      
      <div className="p-4 space-y-4">
        
        {/* Gráfico de distribución de gastos */}
        {!loading && categories.length > 0 && (
          <ExpenseChart 
            data={chartData} 
            totalAmount={totalAmount}
            chartPeriod={chartPeriod}
            onPeriodChange={setChartPeriod}
            referenceDate={filterDate}
          />
        )}


        {/* Gestor de Categorías */}
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="w-full"
          >
            {showCategoryManager ? 'Ocultar' : 'Gestionar'} Categorías
          </Button>
          
          {showCategoryManager && (
            <CategoryManager
              categories={categories}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
        </div>

        {/* Filtro de Fecha */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Gastos Recientes</h3>
          
          <div className="flex items-center gap-2">
            {/* Botón + para crear gastos */}
            <Popover open={showCreatePopup} onOpenChange={setShowCreatePopup}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full">
                  <Plus size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-3">Crear Nuevo Gasto</h4>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => {
                      setShowCreatePopup(false);
                      setShowPhotoCapture(true);
                    }}
                  >
                    <Camera className="mr-3 h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">Escanear Recibo</div>
                      <div className="text-xs text-muted-foreground">Detectar gastos automáticamente</div>
                    </div>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => {
                      setShowCreatePopup(false);
                      setShowManualEntry(true);
                    }}
                  >
                    <PenTool className="mr-3 h-4 w-4 text-secondary" />
                    <div>
                      <div className="font-medium">Crear Manual</div>
                      <div className="text-xs text-muted-foreground">Ingresar detalles manualmente</div>
                    </div>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Filtro de calendario */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !filterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {filterDate ? format(filterDate, "d 'de' MMM", { locale: es }) : "Seleccionar fecha"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={handleDateFilterChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateFilterChange(new Date())}
                className="text-xs flex-1 sm:flex-initial"
              >
                Hoy
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDate(null);
                  if (user) loadExpenses(user.id, null, false);
                }}
                className="text-xs flex-1 sm:flex-initial"
              >
                Todos
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDate(null);
                  if (user) loadExpenses(user.id, null, true);
                }}
                className="text-xs flex-1 sm:flex-initial"
              >
                Recientes
              </Button>
            </div>
          </div>
        </div>

        {/* Gastos List */}
        <div>
          
          {loading ? (
            <div className="bg-card rounded-lg p-6 text-center">
              <div className="text-muted-foreground">
                Cargando gastos...
              </div>
            </div>
          ) : gastos.length === 0 ? (
            <div className="bg-card rounded-lg p-6 text-center">
              <Receipt className="mx-auto mb-4 text-muted-foreground" size={48} />
              <div className="text-muted-foreground mb-2">
                No tienes gastos registrados
              </div>
              <div className="text-sm text-muted-foreground">
                Toma una foto de tu primer ticket
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {gastos.map((gasto) => {
                // Buscar la categoría del gasto
                const category = categories.find(c => c.id === gasto.categoryId);
                
                return (
                  <Card key={gasto.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{gasto.nombre}</h4>
                          {category && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${category.color}20`,
                                color: category.color,
                                border: `1px solid ${category.color}40`
                              }}
                            >
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {gasto.fecha.split('-').reverse().join('/')}
                        </div>
                        <div className="text-lg font-semibold text-primary mt-1">
                          ${gasto.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteGasto(gasto.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-muted rounded-lg p-3 mb-3">
                      <div className="text-xs text-muted-foreground mb-2">Productos:</div>
                      {gasto.items.slice(0, 2).map((item, index) => (
                        <div key={index} className="text-sm flex justify-between">
                          <span>{item.producto} ({item.cantidad})</span>
                          <span>${item.precio.toFixed(2)}</span>
                        </div>
                      ))}
                      {gasto.items.length > 2 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          +{gasto.items.length - 2} productos más
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewGasto(gasto)}
                      >
                        <Eye size={14} className="mr-1" />
                        Ver
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEditGasto(gasto)}
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showPhotoCapture && (
        <PhotoCapture
          onAnalysisComplete={handleTicketAnalysis}
          onClose={() => setShowPhotoCapture(false)}
        />
      )}

      {showManualEntry && (
        <ManualExpenseEntry
          onExpenseAdded={handleManualExpenseAdded}
          onClose={() => setShowManualEntry(false)}
          categories={categories}
        />
      )}

      {/* Modal para Ver Gasto */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Gasto</DialogTitle>
          </DialogHeader>
          {selectedGasto && (
            <div className="space-y-4 pb-4">
              <div>
                <Label className="text-sm font-medium">Establecimiento</Label>
                <p className="text-base sm:text-lg break-words">{selectedGasto.nombre}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Fecha</Label>
                <p className="text-base">{selectedGasto.fecha.split('-').reverse().join('/')}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Total</Label>
                <p className="text-xl sm:text-2xl font-bold text-primary">${selectedGasto.total.toFixed(2)}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Productos ({selectedGasto.items.length})</Label>
                <div className="bg-muted rounded-lg p-2 sm:p-3 mt-2 max-h-40 sm:max-h-48 overflow-y-auto">
                  {selectedGasto.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start gap-2 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base break-words">{item.producto}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{item.cantidad}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-medium text-sm sm:text-base">${item.precio.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedGasto.imagenTicket && (
                <div>
                  <Label className="text-sm font-medium">Imagen del Ticket</Label>
                  <div className="mt-2">
                    <img 
                      src={selectedGasto.imagenTicket} 
                      alt="Ticket" 
                      className="w-full rounded-lg border max-h-[40vh] sm:max-h-[50vh] object-contain cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleImageClick(selectedGasto.imagenTicket!)}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-center">Haz clic para ver en grande</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para Editar Gasto */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Establecimiento</Label>
              <Input
                id="nombre"
                value={editForm.nombre || ''}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                placeholder="Nombre del establecimiento"
              />
            </div>
            
            <div>
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={editForm.total || ''}
                onChange={(e) => setEditForm({ ...editForm, total: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select 
                value={editForm.categoryId || ""} 
                onValueChange={(value) => setEditForm({ ...editForm, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveEdit}
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Revisión de Gastos */}
      {showReviewModal && pendingAnalysis && (
        <ExpenseReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setPendingAnalysis(null);
          }}
          onConfirm={handleReviewConfirm}
          analysisData={pendingAnalysis}
          categories={categories}
        />
      )}

      {/* Modal para Ver Imagen en Grande */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <DialogHeader className="pb-2">
            <DialogTitle>Imagen del Ticket</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Ticket completo" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};