import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  onUpdateCategory: (id: string, category: Omit<Category, 'id'>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6'
];

const DEFAULT_ICONS = [
  '💰', '🍔', '⛽', '🏠', '👕', '🎬', '🏥', '🎓', '🚗', '✈️',
  '🎮', '📱', '🛒', '💊', '🎵', '🏋️', '☕', '🍕', '🚇', '💡'
];

export const CategoryManager = ({ 
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory 
}: CategoryManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: DEFAULT_COLORS[0],
    icon: DEFAULT_ICONS[0]
  });

  const resetForm = () => {
    setFormData({
      name: '',
      color: DEFAULT_COLORS[0],
      icon: DEFAULT_ICONS[0]
    });
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, formData);
        toast.success("Categoría actualizada correctamente");
      } else {
        await onAddCategory(formData);
        toast.success("Categoría creada correctamente");
      }
      resetForm();
      setIsOpen(false);
    } catch (error) {
      toast.error("Error al guardar la categoría");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon
    });
    setIsOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await onDeleteCategory(categoryId);
      toast.success("Categoría eliminada correctamente");
    } catch (error) {
      toast.error("Error al eliminar la categoría");
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Categorías de Gastos</h3>
          <Button 
            onClick={() => setIsOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((category) => (
            <div 
              key={category.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <div>
                  <span className="font-medium">{category.name}</span>
                  <div 
                    className="w-4 h-4 rounded-full mt-1" 
                    style={{ backgroundColor: category.color }}
                  />
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(category)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                  disabled={category.name === 'General'}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Comida, Transporte, etc."
                required
              />
            </div>

            <div>
              <Label>Icono</Label>
              <div className="grid grid-cols-10 gap-2 mt-2">
                {DEFAULT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`p-2 text-lg border rounded hover:bg-muted ${
                      formData.icon === icon ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-ring' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingCategory ? 'Actualizar' : 'Crear'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};