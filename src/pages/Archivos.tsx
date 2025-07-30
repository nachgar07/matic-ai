import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoCapture } from "@/components/PhotoCapture/PhotoCapture";
import { Mic, FileText, Plus, MoreVertical, Camera, Receipt } from "lucide-react";

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
  const [gastos] = useState<Gasto[]>([
    {
      id: "1",
      nombre: "Compra Supermercado",
      fechaCreacion: "2024-01-26",
      tipo: "ticket",
      total: 25.50,
      items: [
        { producto: "Manzanas", cantidad: "2kg", precio: 5.00 },
        { producto: "Pan", cantidad: "1 unidad", precio: 2.50 },
        { producto: "Leche", cantidad: "1L", precio: 3.00 }
      ]
    }
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  const handleTicketAnalysis = (analysis: any) => {
    console.log('Análisis del ticket:', analysis);
    // Aquí procesarías los datos del ticket
    setShowPhotoCapture(false);
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
          
          {gastos.length === 0 ? (
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
                    <Button variant="ghost" size="sm">
                      <MoreVertical size={16} />
                    </Button>
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
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Compartir
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