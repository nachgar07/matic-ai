import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, FileText, Plus, MoreVertical } from "lucide-react";

interface Archivo {
  id: string;
  nombre: string;
  fechaCreacion: string;
  tipo: "excel_voz";
  contenido: string;
  preview: string[];
}

export const Archivos = () => {
  const [archivos] = useState<Archivo[]>([
    {
      id: "1",
      nombre: "Lista de compras semanal",
      fechaCreacion: "2024-01-26",
      tipo: "excel_voz",
      contenido: "{}",
      preview: ["Producto | Cantidad | Precio", "Manzanas | 2kg | $5.00"]
    }
  ]);

  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Mis Archivos"
        rightAction={
          <Button size="sm" className="rounded-full">
            <Plus size={16} />
          </Button>
        }
      />
      
      <div className="p-4 space-y-4">
        {/* Voice Recording Section */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 text-center">Crear tabla por voz</h3>
          
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              <Mic className="text-white" size={32} />
            </button>
            
            <div className="text-center">
              <div className="text-sm font-medium">
                {isRecording ? "Grabando..." : "Presiona para hablar"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isRecording ? "Tap para detener" : "Describe tu tabla en voz alta"}
              </div>
            </div>

            {isRecording && (
              <div className="w-full max-w-xs">
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">Texto detectado:</span>
                  <div className="mt-1">
                    "Crear una tabla con productos, cantidad y precio..."
                  </div>
                </div>
              </div>
            )}

            <Button 
              disabled={!isRecording}
              className="w-full max-w-xs"
            >
              Generar Tabla
            </Button>
          </div>
        </Card>

        {/* Files List */}
        <div>
          <h3 className="font-semibold mb-4">Archivos Recientes</h3>
          
          {archivos.length === 0 ? (
            <div className="bg-card rounded-lg p-6 text-center">
              <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
              <div className="text-muted-foreground mb-2">
                No tienes archivos creados
              </div>
              <div className="text-sm text-muted-foreground">
                Crea tu primera tabla usando tu voz
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {archivos.map((archivo) => (
                <Card key={archivo.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{archivo.nombre}</h4>
                      <div className="text-sm text-muted-foreground">
                        {new Date(archivo.fechaCreacion).toLocaleDateString()}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical size={16} />
                    </Button>
                  </div>

                  {/* Preview */}
                  <div className="bg-muted rounded-lg p-3 mb-3">
                    <div className="text-xs text-muted-foreground mb-2">Vista previa:</div>
                    {archivo.preview.map((row, index) => (
                      <div key={index} className="text-sm font-mono">
                        {row}
                      </div>
                    ))}
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
          className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Mic className="mr-3" size={24} />
          Crear Nueva Tabla por Voz
        </Button>
      </div>

      <BottomNavigation />
    </div>
  );
};