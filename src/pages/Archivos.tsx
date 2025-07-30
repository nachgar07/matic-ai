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
import { Mic, FileText, Plus, MoreVertical, Camera, Receipt, Trash2, Edit, Eye } from "lucide-react";

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
  const { toast } = useToast();

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...');
        
        // Primero intentar obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check:', session?.user?.id || 'No session', sessionError);
        
        if (session?.user) {
          console.log('User found from session:', session.user.id);
          setUser(session.user);
          await fetchGastos(session.user);
          return;
        }

        // Si no hay sesión, intentar obtener el usuario directamente
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('User check:', user?.id || 'No user', userError);
        
        if (user) {
          console.log('User found:', user.id);
          setUser(user);
          await fetchGastos(user);
        } else {
          console.log('No authenticated user found');
          setLoading(false);
          toast({
            title: "No autenticado",
            description: "Por favor inicia sesión para ver tus gastos",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setLoading(false);
        toast({
          title: "Error de autenticación",
          description: "Problema al verificar la autenticación",
          variant: "destructive"
        });
      }
    };
    
    checkAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (session?.user) {
          setUser(session.user);
          await fetchGastos(session.user);
        } else {
          setUser(null);
          setGastos([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);


  const fetchGastos = async (currentUser = user) => {
    if (!currentUser) {
      console.log('No user provided, skipping fetch');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Starting fetchGastos for user:', currentUser.id);
      setLoading(true);
      
      // Usar directamente las tablas de Supabase con RLS
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_items (*)
        `)
        .order('expense_date', { ascending: false });

      console.log('Supabase query completed. Error:', error, 'Data:', expenses);

      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }

      console.log('Found expenses:', expenses?.length || 0);

      // Transformar los datos al formato esperado
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

      console.log('Transformed gastos:', gastosTransformados);
      setGastos(gastosTransformados);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: `No se pudieron cargar los gastos: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleTicketAnalysis = async (analysis: any) => {
    console.log('Análisis del ticket:', analysis);
    
    if (!user) {
      console.log('No user found for ticket analysis');
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive"
      });
      return;
    }
    
    try {
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

      if (expenseError) {
        console.error('Error creating expense:', expenseError);
        throw expenseError;
      }

      // Crear los items del gasto
      if (analysis.items && analysis.items.length > 0) {
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

        if (itemsError) {
          console.error('Error creating expense items:', itemsError);
          throw itemsError;
        }
      }

      toast({
        title: "¡Gasto registrado!",
        description: `Se registró el gasto de ${analysis.store_name || 'Establecimiento'} por $${analysis.total_amount}`
      });

      // Refrescar la lista
      await fetchGastos();
      setShowPhotoCapture(false);
    } catch (error) {
      console.error('Error saving expense:', error);
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
        {/* Photo Capture Section */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="text-primary" size={24} />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Escanear Recibo</div>
                <div className="text-xs text-muted-foreground">Capturar gasto</div>
              </div>
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => setShowPhotoCapture(true)}
              >
                Capturar
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Mic className="text-accent" size={24} />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Registro por Voz</div>
                <div className="text-xs text-muted-foreground">Dictar gastos</div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full"
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? "Detener" : "Hablar"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Gastos List */}
        <div>
          <h3 className="font-semibold mb-4">Gastos Recientes</h3>
          
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