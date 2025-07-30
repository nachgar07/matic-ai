import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoCapture } from "@/components/PhotoCapture/PhotoCapture";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, FileText, Plus, MoreVertical, Camera, Receipt, Trash2, Edit, Eye, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Gasto {
  id: string;
  nombre: string;
  fechaCreacion: string;
  tipo: "ticket" | "excel_voz";
  total: number;
  items: Array<{
    producto: string;
    cantidad: string;
    precio: number;
  }>;
  imagenTicket?: string;
}

export const Archivos = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Gasto>>({});
  const [filterDate, setFilterDate] = useState<Date>(new Date()); // Por defecto hoy
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const { toast } = useToast();

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
        fechaCreacion: expense.created_at,
        tipo: 'ticket' as const,
        total: parseFloat(expense.total_amount.toString()),
        items: expense.expense_items?.map(item => ({
          producto: item.product_name,
          cantidad: item.quantity,
          precio: parseFloat(item.total_price.toString())
        })) || [],
        imagenTicket: expense.receipt_image
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
    
    try {
      console.log('💾 Saving expense to database...');
      
      // Crear el gasto principal directamente en Supabase
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          store_name: analysis.store_name || 'Establecimiento desconocido',
          expense_date: analysis.date || new Date().toISOString().split('T')[0],
          total_amount: parseFloat(analysis.total_amount) || 0,
          payment_method: analysis.payment_method || 'efectivo',
          receipt_image: analysis.originalImage,
          confidence: parseFloat(analysis.confidence) || 0.5
        })
        .select()
        .single();

      console.log('💿 Expense created:', expense?.id, 'Error:', expenseError);

      if (expenseError) {
        console.error('❌ Error creating expense:', expenseError);
        throw expenseError;
      }

      // Crear los items del gasto
      if (analysis.items && analysis.items.length > 0) {
        console.log('📝 Creating expense items:', analysis.items.length);
        const items = analysis.items.map((item: any) => ({
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
        description: `Se registró el gasto de ${analysis.store_name || 'Establecimiento'} por $${analysis.total_amount}`
      });

      // Refrescar la lista inmediatamente
      console.log('🔄 Refreshing expenses list...');
      await loadExpenses(user.id, filterDate);
      setShowPhotoCapture(false);
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
      total: gasto.total
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
          total_amount: editForm.total
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

        {/* Filtro de Fecha */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Gastos Recientes</h3>
          
          <div className="flex items-center gap-2">
            <Popover>
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
                  {filterDate ? format(filterDate, "d 'de' MMM", { locale: es }) : "Seleccionar fecha"}
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
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDateFilterChange(new Date())}
              className="text-xs"
            >
              Hoy
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterDate(null);
                if (user) loadExpenses(user.id, null, true);
              }}
              className="text-xs"
            >
              Recientes
            </Button>
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
              {gastos.map((gasto) => (
                <Card key={gasto.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{gasto.nombre}</h4>
                      <div className="text-sm text-muted-foreground">
                        {new Date(gasto.fechaCreacion).toLocaleDateString()}
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
              ))}
            </div>
          )}
        </div>

        {/* Quick Create Button */}
          <Button 
          size="lg"
          className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setShowPhotoCapture(true)}
        >
          <Receipt className="mr-3" size={24} />
          Escanear Nuevo Recibo
        </Button>
      </div>

      {showPhotoCapture && (
        <PhotoCapture
          onAnalysisComplete={handleTicketAnalysis}
          onClose={() => setShowPhotoCapture(false)}
        />
      )}

      {/* Modal para Ver Gasto */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Gasto</DialogTitle>
          </DialogHeader>
          {selectedGasto && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Establecimiento</Label>
                <p className="text-lg">{selectedGasto.nombre}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Fecha</Label>
                <p>{new Date(selectedGasto.fechaCreacion).toLocaleDateString()}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Total</Label>
                <p className="text-2xl font-bold text-primary">${selectedGasto.total.toFixed(2)}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Productos ({selectedGasto.items.length})</Label>
                <div className="bg-muted rounded-lg p-3 mt-2 max-h-48 overflow-y-auto">
                  {selectedGasto.items.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <div className="font-medium">{item.producto}</div>
                        <div className="text-sm text-muted-foreground">{item.cantidad}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${item.precio.toFixed(2)}</div>
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
                      className="w-full rounded-lg border"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para Editar Gasto */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
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

      <BottomNavigation />
    </div>
  );
};