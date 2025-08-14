import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Download, FileText, Target, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { utils, writeFile, write } from "xlsx";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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
      // Use local timezone format instead of UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`; // YYYY-MM format
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

      // Verificar si es un dispositivo móvil con Capacitor
      if (Capacitor.isNativePlatform()) {
        await downloadFileNative(workbook, filename);
      } else if (isMobileDevice()) {
        // Navegador móvil sin Capacitor - usar descarga como CSV
        await downloadAsCSVMobile(data, selectedDataType, filename);
      } else {
        // Navegador web - usar descarga normal
        writeFile(workbook, filename);
      }

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

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const downloadAsCSVMobile = async (data: any, dataType: string, filename: string) => {
    try {
      let csvContent = '';
      const csvFilename = filename.replace('.xlsx', '.csv');

      switch (dataType) {
        case 'meals':
          csvContent = createMealsCSV(data);
          break;
        case 'goals':
          csvContent = createGoalsCSV(data);
          break;
        case 'expenses':
          csvContent = createExpensesCSV(data);
          break;
      }

      // Crear y descargar CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', csvFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading CSV on mobile:', error);
      throw new Error('Error al descargar archivo CSV en móvil');
    }
  };

  const createMealsCSV = (data: any) => {
    const headers = ['Fecha', 'Hora', 'Tipo de Comida', 'Alimento', 'Marca', 'Porciones', 'Calorías', 'Proteínas (g)', 'Carbohidratos (g)', 'Grasas (g)'];
    
    const rows = data.meals.map((meal: any) => [
      new Date(meal.consumed_at).toLocaleDateString('es-ES'),
      new Date(meal.consumed_at).toLocaleTimeString('es-ES'),
      meal.meal_type,
      meal.foods?.food_name || 'Desconocido',
      meal.foods?.brand_name || '',
      meal.servings,
      Math.round((meal.foods?.calories_per_serving || 0) * meal.servings),
      Math.round((meal.foods?.protein_per_serving || 0) * meal.servings * 10) / 10,
      Math.round((meal.foods?.carbs_per_serving || 0) * meal.servings * 10) / 10,
      Math.round((meal.foods?.fat_per_serving || 0) * meal.servings * 10) / 10
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const createGoalsCSV = (data: any) => {
    const headers = ['Nombre', 'Descripción', 'Categoría', 'Prioridad', 'Frecuencia', 'Valor Objetivo', 'Fecha Inicio', 'Estado'];
    
    const rows = data.goals.map((goal: any) => [
      goal.name,
      goal.description || '',
      goal.category,
      goal.priority,
      goal.frequency,
      goal.target_value,
      goal.start_date,
      goal.is_active ? 'Activo' : 'Inactivo'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const createExpensesCSV = (data: any) => {
    const headers = ['Fecha', 'Tienda', 'Categoría', 'Total', 'Método de Pago'];
    
    const rows = data.expenses.map((expense: any) => [
      expense.expense_date,
      expense.store_name || '',
      expense.category_name || 'Sin categoría',
      expense.total_amount,
      expense.payment_method || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadFileNative = async (workbook: any, filename: string) => {
    try {
      // Convertir el workbook a ArrayBuffer
      const arrayBuffer = write(workbook, { type: 'array', bookType: 'xlsx' });
      
      // Convertir ArrayBuffer a base64
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      uint8Array.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const base64Data = btoa(binary);

      // Escribir archivo en el sistema de archivos del dispositivo
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      // Compartir el archivo
      await Share.share({
        title: 'Exportar datos',
        text: `Archivo exportado: ${filename}`,
        url: result.uri,
        dialogTitle: 'Compartir archivo exportado'
      });

    } catch (error) {
      console.error('Error downloading file on native:', error);
      throw new Error('Error al descargar archivo en dispositivo móvil');
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
                
                <div className="mt-3 pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    {Capacitor.isNativePlatform() ? (
                      "📱 App móvil: Se exportará como Excel y se podrá compartir"
                    ) : isMobileDevice() ? (
                      "📱 Navegador móvil: Se exportará como CSV para mejor compatibilidad"
                    ) : (
                      "💻 Navegador web: Se exportará como Excel con múltiples hojas"
                    )}
                  </div>
                </div>
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