import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExpenseCategory } from "@/hooks/useExpenseCategories";

interface AnalysisData {
  store_name?: string;
  total_amount: string | number;
  items?: Array<{
    product_name: string;
    quantity: string;
    unit_price?: string | number;
    total_price: string | number;
  }>;
  date?: string;
  dateDetected?: string;
  payment_method?: string;
  confidence?: string | number;
  originalImage?: string;
}

interface ExpenseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AnalysisData & { categoryId?: string }) => void;
  analysisData: AnalysisData;
  categories: ExpenseCategory[];
}

export const ExpenseReviewModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  analysisData, 
  categories 
}: ExpenseReviewModalProps) => {
  const [editableData, setEditableData] = useState<AnalysisData>(analysisData);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const handleConfirm = () => {
    onConfirm({
      ...editableData,
      categoryId: selectedCategoryId || undefined
    });
  };

  const totalAmount = parseFloat(editableData.total_amount?.toString() || "0");
  const itemsTotal = editableData.items?.reduce((sum, item) => 
    sum + parseFloat(item.total_price?.toString() || "0"), 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar Gasto Detectado</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información básica */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="store">Establecimiento</Label>
                <Input
                  id="store"
                  value={editableData.store_name || ""}
                  onChange={(e) => setEditableData(prev => ({ 
                    ...prev, 
                    store_name: e.target.value 
                  }))}
                  placeholder="Nombre del establecimiento"
                />
              </div>

              <div>
                <Label htmlFor="total">Total ($)</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={editableData.total_amount}
                  onChange={(e) => setEditableData(prev => ({ 
                    ...prev, 
                    total_amount: e.target.value 
                  }))}
                />
              </div>

              <div>
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
            </CardContent>
          </Card>

          {/* Items detectados */}
          {editableData.items && editableData.items.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Items Detectados ({editableData.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {editableData.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-muted-foreground ml-2">({item.quantity})</span>
                      </div>
                      <span className="font-medium">
                        ${parseFloat(item.total_price?.toString() || "0").toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex justify-between text-sm font-medium">
                  <span>Suma de items:</span>
                  <span>${itemsTotal.toFixed(2)}</span>
                </div>
                
                {Math.abs(totalAmount - itemsTotal) > 0.01 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Diferencia con total: ${Math.abs(totalAmount - itemsTotal).toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Guardar Gasto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};