import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { User, Settings, Target, TrendingDown, Scale, Activity, Moon, Sun, Camera } from "lucide-react";
import { useTheme } from "next-themes";
import { useNutritionGoals } from "@/hooks/useFatSecret";
import { EditNutritionGoalsDialog } from "@/components/EditNutritionGoalsDialog/EditNutritionGoalsDialog";
import { PersonalDataSettings } from "@/components/PersonalDataSettings/PersonalDataSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Perfil = () => {
  const { theme, setTheme } = useTheme();
  const { data: nutritionGoals } = useNutritionGoals();
  const [editGoalsOpen, setEditGoalsOpen] = useState(false);
  const [personalDataOpen, setPersonalDataOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profile);
      }
    };
    
    getUser();
  }, []);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          avatar_url: data.publicUrl,
          display_name: profile?.display_name || user.user_metadata?.display_name
        });

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: data.publicUrl });
      toast({
        title: "Éxito",
        description: "Imagen de perfil actualizada correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const goals = {
    calories: nutritionGoals?.daily_calories || 2000,
    protein: nutritionGoals?.daily_protein || 150,
    carbs: nutritionGoals?.daily_carbs || 250,
    fat: nutritionGoals?.daily_fat || 67
  };
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Perfil" />
      
      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card className="p-6 text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                <User className="text-primary-foreground" size={32} />
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Camera size={14} />
            </label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
              className="hidden"
            />
          </div>
          <h2 className="text-xl font-semibold">
            {profile?.display_name || user?.user_metadata?.display_name || "Usuario"}
          </h2>
          <p className="text-muted-foreground">{user?.email || "Cargando..."}</p>
          {uploading && (
            <p className="text-sm text-muted-foreground mt-2">Subiendo imagen...</p>
          )}
        </Card>

        {/* Current Goals */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Target className="mr-2" size={20} />
            Objetivo Actual
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <TrendingDown className="mr-3 text-success" size={20} />
              <div>
                <div className="font-medium">
                  {profile?.goal === 'lose' ? 'Perder peso' : 
                   profile?.goal === 'gain' ? 'Ganar peso' : 'Mantener peso'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {profile?.progress_speed === 'slow' ? '0.25 kg por semana' :
                   profile?.progress_speed === 'normal' ? '0.5 kg por semana' :
                   profile?.progress_speed === 'fast' ? '1 kg por semana' :
                   '0.5 kg por semana'}
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <Scale className="mr-3 text-muted-foreground" size={20} />
              <div>
                <div className="font-medium">
                  Peso objetivo: {profile?.target_weight || 'No definido'} kg
                </div>
                <div className="text-sm text-muted-foreground">
                  Altura: {profile?.height || 'No definida'} cm
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Daily Targets */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Activity className="mr-2" size={20} />
            Objetivos Diarios
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Calorías objetivo</span>
              <span className="font-medium">{goals.calories} kcal</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Proteína</span>
              <span className="font-medium">{goals.protein} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Carbohidratos</span>
              <span className="font-medium">{goals.carbs} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Grasas</span>
              <span className="font-medium">{goals.fat} g</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => setEditGoalsOpen(true)}
            >
              Editar objetivos
            </Button>
          </div>
        </Card>


        {/* Settings */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            Configuración
          </h3>
          <div className="space-y-3">
            <Button variant="ghost" className="w-full justify-start">
              Cambiar objetivo de peso
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                console.log('Opening personal data dialog');
                setPersonalDataOpen(true);
              }}
            >
              Ajustar datos personales
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Preferencias de notificaciones
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Exportar datos
            </Button>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                {theme === 'dark' ? (
                  <Moon className="mr-3" size={20} />
                ) : (
                  <Sun className="mr-3" size={20} />
                )}
                <span>Tema oscuro</span>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </div>
        </Card>

        {/* Progress Summary */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Resumen de Progreso</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Días registrados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">0</div>
              <div className="text-sm text-muted-foreground">Objetivos cumplidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">0</div>
              <div className="text-sm text-muted-foreground">Archivos creados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">0</div>
              <div className="text-sm text-muted-foreground">Racha actual</div>
            </div>
          </div>
        </Card>
      </div>

      <EditNutritionGoalsDialog 
        open={editGoalsOpen}
        onOpenChange={setEditGoalsOpen}
      />

      {user && (
        <PersonalDataSettings 
          userId={user.id} 
          open={personalDataOpen}
          onOpenChange={setPersonalDataOpen}
          onDataUpdate={(data) => {
            // Refresh profile when personal data is updated
            setProfile({ ...profile, ...data });
          }}
        />
      )}

      <BottomNavigation />
    </div>
  );
};