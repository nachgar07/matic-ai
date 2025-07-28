import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Target, TrendingDown, Minus, TrendingUp } from "lucide-react";

interface Objetivo {
  id: string;
  nombre: string;
  prioridad: number;
  fechaInicio: string;
  fechaFin: string;
  subtareas: { texto: string; completado: boolean; prioridad: number }[];
  progreso: number;
}

export const Objetivos = () => {
  const [objetivos] = useState<Objetivo[]>([
    {
      id: "1",
      nombre: "Perder 5kg en 3 meses",
      prioridad: 9,
      fechaInicio: "2024-01-01",
      fechaFin: "2024-04-01",
      subtareas: [
        { texto: "Hacer ejercicio 4 veces por semana", completado: false, prioridad: 8 },
        { texto: "Reducir calorías a 1800 diarias", completado: true, prioridad: 9 },
        { texto: "Beber 2L de agua diariamente", completado: false, prioridad: 6 }
      ],
      progreso: 33
    }
  ]);

  const getPriorityColor = (prioridad: number) => {
    if (prioridad >= 8) return "border-l-red-500 bg-red-50";
    if (prioridad >= 6) return "border-l-yellow-500 bg-yellow-50";
    return "border-l-green-500 bg-green-50";
  };

  const getPriorityIcon = (prioridad: number) => {
    if (prioridad >= 8) return <TrendingUp className="text-red-500" size={16} />;
    if (prioridad >= 6) return <Minus className="text-yellow-500" size={16} />;
    return <TrendingDown className="text-green-500" size={16} />;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Mis Objetivos" 
        rightAction={
          <Button size="sm" className="rounded-full">
            <Plus size={16} />
          </Button>
        }
      />
      
      <div className="p-4 space-y-4">
        {objetivos.length === 0 ? (
          <div className="bg-card rounded-lg p-6 text-center">
            <Target className="mx-auto mb-4 text-muted-foreground" size={48} />
            <div className="text-muted-foreground mb-2">
              No tienes objetivos activos
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Crea tu primer objetivo para comenzar
            </div>
            <Button>
              <Plus className="mr-2" size={16} />
              Crear Objetivo
            </Button>
          </div>
        ) : (
          objetivos.map((objetivo) => (
            <Card key={objetivo.id} className={`p-4 border-l-4 ${getPriorityColor(objetivo.prioridad)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{objetivo.nombre}</h3>
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    <Calendar size={14} className="mr-1" />
                    <span>{new Date(objetivo.fechaInicio).toLocaleDateString()} - {new Date(objetivo.fechaFin).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  {getPriorityIcon(objetivo.prioridad)}
                  <span className="ml-1 text-sm font-medium">{objetivo.prioridad}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-medium">{objetivo.progreso}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${objetivo.progreso}%` }}
                  />
                </div>
              </div>

              {/* Subtasks Preview */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Subtareas ({objetivo.subtareas.filter(s => s.completado).length}/{objetivo.subtareas.length})</div>
                {objetivo.subtareas.slice(0, 2).map((subtarea, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className={`w-4 h-4 rounded border-2 mr-2 flex items-center justify-center ${
                      subtarea.completado ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}>
                      {subtarea.completado && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    <span className={subtarea.completado ? 'line-through text-muted-foreground' : ''}>
                      {subtarea.texto}
                    </span>
                  </div>
                ))}
                {objetivo.subtareas.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{objetivo.subtareas.length - 2} más...
                  </div>
                )}
              </div>
            </Card>
          ))
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button variant="outline" className="h-20 flex-col">
            <Plus className="mb-2" size={20} />
            <span className="text-sm">Nuevo Objetivo</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <Calendar className="mb-2" size={20} />
            <span className="text-sm">Vista Calendario</span>
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};