import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Download, FileText, Target, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { utils, writeFile } from "xlsx";

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DataExportDialog = ({ open, onOpenChange }: DataExportDialogProps) => {
  const [selectedDataType, setSelectedDataType] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Generar opciones de los últimos 3 meses
  const getLastThreeMonths = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7); // YYYY-MM format
      const label = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      months.push({ value, label });
    }
    
    return months;
  };

  const handleExport = async () => {
    if (!selectedDataType || !selectedMonth) {
      toast({
        title: "Error",
        description: "Por favor selecciona el tipo de datos y el mes",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Llamar a la edge function para obtener los datos
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: {
          dataType: selectedDataType,
          month: selectedMonth,
          userId: user.id
        }
      });

      if (error) throw error;

      // Generar archivo Excel según el tipo de datos
      let workbook;
      let filename;

      switch (selectedDataType) {
        case 'meals':
          workbook = createMealsWorkbook(data);
          filename = `comidas_${selectedMonth}.xlsx`;
          break;
        case 'goals':
          workbook = createGoalsWorkbook(data);
          filename = `objetivos_${selectedMonth}.xlsx`;
          break;
        case 'expenses':
          workbook = createExpensesWorkbook(data);
          filename = `gastos_${selectedMonth}.xlsx`;
          break;
        default:
          throw new Error("Tipo de datos no válido");
      }

      // Descargar archivo
      writeFile(workbook, filename);

      toast({
        title: "Éxito",
        description: "Datos exportados correctamente",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: error.message || "Error al exportar datos",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const createMealsWorkbook = (data: any) => {
    const workbook = utils.book_new();

    // Hoja de resumen
    const summaryData = data.dailySummary.map((day: any) => ({
      'Fecha': day.date,
      'Calorías Total': day.calories,
      'Proteínas (g)': day.protein,
      'Carbohidratos (g)': day.carbs,
      'Grasas (g)': day.fat,
      'Comidas Registradas': day.mealsCount
    }));

    const summarySheet = utils.json_to_sheet(summaryData);
    utils.book_append_sheet(workbook, summarySheet, "Resumen Diario");

    // Hoja de comidas detalladas
    const mealsData = data.meals.map((meal: any) => ({
      'Fecha': new Date(meal.consumed_at).toLocaleDateString('es-ES'),
      'Hora': new Date(meal.consumed_at).toLocaleTimeString('es-ES'),
      'Tipo de Comida': meal.meal_type,
      'Alimento': meal.foods?.food_name || 'Desconocido',
      'Marca': meal.foods?.brand_name || '',
      'Porciones': meal.servings,
      'Calorías': Math.round((meal.foods?.calories_per_serving || 0) * meal.servings),
      'Proteínas (g)': Math.round((meal.foods?.protein_per_serving || 0) * meal.servings * 10) / 10,
      'Carbohidratos (g)': Math.round((meal.foods?.carbs_per_serving || 0) * meal.servings * 10) / 10,
      'Grasas (g)': Math.round((meal.foods?.fat_per_serving || 0) * meal.servings * 10) / 10
    }));

    const mealsSheet = utils.json_to_sheet(mealsData);
    utils.book_append_sheet(workbook, mealsSheet, "Comidas Detalladas");

    return workbook;
  };

  const createGoalsWorkbook = (data: any) => {
    const workbook = utils.book_new();

    // Hoja de objetivos
    const goalsData = data.goals.map((goal: any) => ({
      'Nombre': goal.name,
      'Descripción': goal.description || '',
      'Categoría': goal.category,
      'Prioridad': goal.priority,
      'Frecuencia': goal.frequency,
      'Valor Objetivo': goal.target_value,
      'Fecha Inicio': goal.start_date,
      'Fecha Fin': goal.end_date || '',
      'Estado': goal.is_active ? 'Activo' : 'Inactivo'
    }));

    const goalsSheet = utils.json_to_sheet(goalsData);
    utils.book_append_sheet(workbook, goalsSheet, "Objetivos");

    // Hoja de progreso
    const progressData = data.progress.map((progress: any) => ({
      'Objetivo': progress.goal_name,
      'Fecha': progress.date,
      'Valor Completado': progress.completed_value,
      'Completado': progress.is_completed ? 'Sí' : 'No',
      'Notas': progress.notes || ''
    }));

    const progressSheet = utils.json_to_sheet(progressData);
    utils.book_append_sheet(workbook, progressSheet, "Progreso");

    // Hoja de tareas
    const tasksData = data.tasks.map((task: any) => ({
      'Título': task.title,
      'Descripción': task.description || '',
      'Categoría': task.category,
      'Prioridad': task.priority,
      'Fecha Vencimiento': task.due_date || '',
      'Hora Vencimiento': task.due_time || '',
      'Completada': task.is_completed ? 'Sí' : 'No',
      'Fecha Creación': new Date(task.created_at).toLocaleDateString('es-ES')
    }));

    const tasksSheet = utils.json_to_sheet(tasksData);
    utils.book_append_sheet(workbook, tasksSheet, "Tareas");

    return workbook;
  };

  const createExpensesWorkbook = (data: any) => {
    const workbook = utils.book_new();

    // Hoja de resumen por categoría
    const categoryData = data.categoryStats.map((cat: any) => ({
      'Categoría': cat.category_name,
      'Total Gastado': cat.total_amount,
      'Número de Gastos': cat.expense_count,
      'Promedio por Gasto': Math.round(cat.average_amount * 100) / 100
    }));

    const categorySheet = utils.json_to_sheet(categoryData);
    utils.book_append_sheet(workbook, categorySheet, "Resumen por Categoría");

    // Hoja de gastos detallados
    const expensesData = data.expenses.map((expense: any) => ({
      'Fecha': expense.expense_date,
      'Tienda': expense.store_name || '',
      'Categoría': expense.category_name || 'Sin categoría',
      'Total': expense.total_amount,
      'Método de Pago': expense.payment_method || '',
      'Confianza': expense.confidence ? `${Math.round(expense.confidence * 100)}%` : ''
    }));

    const expensesSheet = utils.json_to_sheet(expensesData);
    utils.book_append_sheet(workbook, expensesSheet, "Gastos");

    // Hoja de artículos detallados
    const itemsData = data.items.map((item: any) => ({
      'Fecha Gasto': item.expense_date,
      'Tienda': item.store_name || '',
      'Producto': item.product_name,
      'Cantidad': item.quantity,
      'Precio Unitario': item.unit_price || '',
      'Precio Total': item.total_price
    }));

    const itemsSheet = utils.json_to_sheet(itemsData);
    utils.book_append_sheet(workbook, itemsSheet, "Artículos Detallados");

    return workbook;
  };

  const months = getLastThreeMonths();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Datos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Datos</label>
              <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de datos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meals">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Datos de Comidas
                    </div>
                  </SelectItem>
                  <SelectItem value="goals">
                    <div className="flex items-center">
                      <Target className="mr-2 h-4 w-4" />
                      Objetivos y Tareas
                    </div>
                  </SelectItem>
                  <SelectItem value="expenses">
                    <div className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Gastos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mes</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedDataType && (
            <Card className="p-4 bg-muted/50">
              <div className="text-sm">
                <div className="font-medium mb-2">Se exportará:</div>
                <ul className="space-y-1 text-muted-foreground">
                  {selectedDataType === 'meals' && (
                    <>
                      <li>• Resumen diario de calorías y macros</li>
                      <li>• Detalle de todas las comidas registradas</li>
                      <li>• Información nutricional por alimento</li>
                    </>
                  )}
                  {selectedDataType === 'goals' && (
                    <>
                      <li>• Lista de objetivos y su configuración</li>
                      <li>• Progreso diario de cada objetivo</li>
                      <li>• Tareas y su estado de completado</li>
                    </>
                  )}
                  {selectedDataType === 'expenses' && (
                    <>
                      <li>• Resumen por categorías</li>
                      <li>• Detalle de todos los gastos</li>
                      <li>• Artículos individuales de cada gasto</li>
                    </>
                  )}
                </ul>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={!selectedDataType || !selectedMonth || isExporting}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};