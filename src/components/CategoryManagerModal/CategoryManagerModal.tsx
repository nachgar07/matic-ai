import { useState } from 'react';
import { Trash2, Edit, Settings, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMealCategories, useUpdateMealCategory, useDeleteMealCategory } from '@/hooks/useMealCategories';
import { useToast } from '@/hooks/use-toast';

interface CategoryManagerModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CategoryManagerModal = ({ trigger, open, onOpenChange }: CategoryManagerModalProps) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { data: categories } = useMealCategories();
  const updateCategory = useUpdateMealCategory();
  const deleteCategory = useDeleteMealCategory();
  const { toast } = useToast();

  const handleStartEdit = (categoryId: string, currentName: string) => {
    setEditingCategory(categoryId);
    setEditName(currentName);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return;

    try {
      await updateCategory.mutateAsync({
        categoryId: editingCategory,
        name: editName.trim()
      });
      setEditingCategory(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditName('');
  };

  const handleDelete = async (categoryId: string) => {
    const category = categories?.find(cat => cat.id === categoryId);
    if (!category) return;

    if (category.is_default) {
      toast({
        title: "No se puede eliminar",
        description: "Las categorías por defecto no se pueden eliminar",
        variant: "destructive"
      });
      return;
    }

    try {
      await deleteCategory.mutateAsync(categoryId);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="text-muted-foreground">
      <Settings className="h-4 w-4 mr-2" />
      Administrar categorías
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Administrar Categorías</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {categories?.map((category) => (
            <Card key={category.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{category.icon}</span>
                  
                  {editingCategory === category.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveEdit}
                        disabled={!editName.trim()}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium truncate">{category.name}</span>
                      {category.is_default && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          Por defecto
                        </span>
                      )}
                    </>
                  )}
                </div>

                {editingCategory !== category.id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(category.id, category.name)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    {!category.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(category.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};