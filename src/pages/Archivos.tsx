import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoCapture } from "@/components/PhotoCapture/PhotoCapture";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const { toast } = useToast();

  useEffect(() => {
    fetchGastos();
  }, []);

  const fetchGastos = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('expense-manager', {
        body: { action: 'list' },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      // Convertir la data de Supabase al formato esperado
      const gastosFormateados: Gasto[] = data.expenses.map((expense: any) => ({
        id: expense.id,
        nombre: expense.store_name || 'Gasto sin nombre',
        fechaCreacion: expense.expense_date,
        tipo: 'ticket',
        total: parseFloat(expense.total_amount),
        items: expense.expense_items.map((item: any) => ({
          producto: item.product_name,
          cantidad: item.quantity,
          precio: parseFloat(item.total_price)
        })),
        imagenTicket: expense.receipt_image
      }));

      setGastos(gastosFormateados);
    } catch (error) {
      console.error('Error fetching gastos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTicketAnalysis = async (analysis: any) => {
    console.log('Análisis del ticket:', analysis);
    
    try {
      const expenseData = {
        store_name: analysis.store_name || 'Establecimiento desconocido',
        date: analysis.date || new Date().toISOString().split('T')[0],
        total_amount: parseFloat(analysis.total_amount) || 0,
        payment_method: analysis.payment_method || 'efectivo',
        receipt_image: analysis.originalImage,
        confidence: parseFloat(analysis.confidence) || 0.5,
        items: (analysis.items || []).map((item: any) => ({
          product_name: item.product_name || 'Producto desconocido',
          quantity: item.quantity || '1x',
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0
        }))
      };

      console.log('Expense data to save:', expenseData);

      const { data, error } = await supabase.functions.invoke('expense-manager', {
        body: { 
          action: 'create',
          expenseData 
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "¡Gasto registrado!",
        description: `Se registró el gasto de ${expenseData.store_name} por $${expenseData.total_amount}`
      });

      // Refrescar la lista
      fetchGastos();
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
    try {
      const { error } = await supabase.functions.invoke('expense-manager', {
        body: { 
          action: 'delete',
          expenseId: gastoId 
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Gasto eliminado",
        description: "El gasto se eliminó correctamente"
      });

      fetchGastos();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
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
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye size={14} className="mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
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

      <BottomNavigation />
    </div>
  );
};