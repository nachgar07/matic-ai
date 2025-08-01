import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Save, Plus, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ExpenseItem {
  id: string;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ManualExpenseEntryProps {
  onExpenseAdded: (expenseData: any, categoryId: string | null) => void;
  onClose: () => void;
  categories: ExpenseCategory[];
}

export const ManualExpenseEntry = ({ onExpenseAdded, onClose, categories }: ManualExpenseEntryProps) => {
  const [formData, setFormData] = useState({
    store_name: "",
    total_amount: "",
    payment_method: "",
    notes: ""
  });
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      product_name: "",
      quantity: "1",
      unit_price: 0,
      total_price: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate total_price when quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          const quantity = field === 'quantity' ? parseFloat(value as string) || 0 : parseFloat(item.quantity) || 0;
          const unitPrice = field === 'unit_price' ? value as number : item.unit_price;
          updatedItem.total_price = quantity * unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateItemsTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.store_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del establecimiento es requerido",
        variant: "destructive"
      });
      return;
    }

    if (!formData.total_amount.trim()) {
      toast({
        title: "Error",
        description: "El monto total es requerido",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const totalAmount = parseFloat(formData.total_amount);
      const itemsTotal = calculateItemsTotal();
      
      // Warn if items total doesn't match total amount
      if (items.length > 0 && Math.abs(itemsTotal - totalAmount) > 0.01) {
        toast({
          title: "Aviso",
          description: `La suma de los items (${itemsTotal.toFixed(2)}) no coincide con el total (${totalAmount.toFixed(2)})`,
          variant: "default"
        });
      }

      const expenseData = {
        store_name: formData.store_name,
        total_amount: totalAmount,
        expense_date: format(expenseDate, 'yyyy-MM-dd'),
        payment_method: formData.payment_method || null,
        confidence: 1.0, // Manual entries have 100% confidence
        items: items.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      };

      onExpenseAdded(expenseData, selectedCategoryId || null);
      onClose();

      toast({
        title: "¡Gasto agregado!",
        description: "El gasto se ha guardado correctamente"
      });

    } catch (error) {
      console.error('Error adding manual expense:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el gasto",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Crear Gasto Manual</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-4 space-y-4">
            <h3 className="font-medium">Información Básica</h3>
            
            <div className="space-y-2">
              <Label htmlFor="store_name">Establecimiento *</Label>
              <Input
                id="store_name"
                value={formData.store_name}
                onChange={(e) => handleInputChange('store_name', e.target.value)}
                placeholder="Ej: Supermercado, Restaurante, etc."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">Monto Total *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_amount}
                  onChange={(e) => handleInputChange('total_amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha del Gasto</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expenseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expenseDate ? format(expenseDate, "d 'de' MMM", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expenseDate}
                      onSelect={(date) => {
                        if (date) {
                          setExpenseDate(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta_debito">Tarjeta de Débito</SelectItem>
                    <SelectItem value="tarjeta_credito">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
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
            </div>
          </Card>

          {/* Items Section */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Items del Gasto (Opcional)</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={16} className="mr-1" />
                Agregar Item
              </Button>
            </div>
            
            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Producto</Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                        placeholder="Nombre del producto"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Cant.</Label>
                      <Input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        placeholder="1"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Precio Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price.toString()}
                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Total</Label>
                      <Input
                        value={item.total_price.toFixed(2)}
                        readOnly
                        className="bg-muted h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {items.length > 0 && (
                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-sm font-medium">
                      Total Items: ${calculateItemsTotal().toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </form>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || !formData.store_name.trim() || !formData.total_amount.trim()}
          className="w-full"
        >
          <Save className="mr-2" size={20} />
          {isLoading ? "Guardando..." : "Guardar Gasto"}
        </Button>
      </div>
    </div>
  );
};