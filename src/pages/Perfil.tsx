import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { User, Settings, Target, TrendingDown, TrendingUp, Scale, Activity, Moon, Sun, Camera, FileText, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useNutritionGoals } from "@/hooks/useFatSecret";
import { EditNutritionGoalsDialog } from "@/components/EditNutritionGoalsDialog/EditNutritionGoalsDialog";
import { PersonalDataSettings } from "@/components/PersonalDataSettings/PersonalDataSettings";
import { DataExportDialog } from "@/components/DataExportDialog/DataExportDialog";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog/DeleteAccountDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
export const Perfil = () => {
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    data: nutritionGoals
  } = useNutritionGoals();
  const [editGoalsOpen, setEditGoalsOpen] = useState(false);
  const [personalDataOpen, setPersonalDataOpen] = useState(false);
  const [exportDataOpen, setExportDataOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    const getUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const {
          data: profile
        } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) {
        throw uploadError;
      }
      const {
        data
      } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const {
        error: updateError
      } = await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: data.publicUrl,
        display_name: profile?.display_name || user.user_metadata?.display_name
      });
      if (updateError) {
        throw updateError;
      }
      setProfile({
        ...profile,
        avatar_url: data.publicUrl
      });
      toast({
        title: "Éxito",
        description: "Imagen de perfil actualizada correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  const goals = {
    calories: nutritionGoals?.daily_calories || 0,
    protein: nutritionGoals?.daily_protein || 0,
    carbs: nutritionGoals?.daily_carbs || 0,
    fat: nutritionGoals?.daily_fat || 0
  };
  return <div className="min-h-screen bg-background pb-20">
      <Header title="Perfil" />
      
      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card className="p-6 text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                <User className="text-primary-foreground" size={32} />
              </div>}
            <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera size={14} />
            </label>
            <Input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
          </div>
          <h2 className="text-xl font-semibold">
            {profile?.display_name || user?.user_metadata?.display_name || "Usuario"}
          </h2>
          <p className="text-muted-foreground">{user?.email || "Cargando..."}</p>
          {uploading && <p className="text-sm text-muted-foreground mt-2">Subiendo imagen...</p>}
        </Card>

        {/* Country and Currency Info */}
        {profile?.nationality && <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">
                {profile.nationality === 'Argentina' ? '🇦🇷' : profile.nationality === 'México' ? '🇲🇽' : profile.nationality === 'España' ? '🇪🇸' : profile.nationality === 'Colombia' ? '🇨🇴' : profile.nationality === 'Chile' ? '🇨🇱' : profile.nationality === 'Perú' ? '🇵🇪' : profile.nationality === 'Venezuela' ? '🇻🇪' : profile.nationality === 'Ecuador' ? '🇪🇨' : profile.nationality === 'Bolivia' ? '🇧🇴' : profile.nationality === 'Paraguay' ? '🇵🇾' : profile.nationality === 'Uruguay' ? '🇺🇾' : profile.nationality === 'Estados Unidos' ? '🇺🇸' : profile.nationality === 'Canadá' ? '🇨🇦' : profile.nationality === 'Brasil' ? '🇧🇷' : profile.nationality === 'Reino Unido' ? '🇬🇧' : profile.nationality === 'Francia' ? '🇫🇷' : profile.nationality === 'Italia' ? '🇮🇹' : profile.nationality === 'Alemania' ? '🇩🇪' : '🌍'}
              </div>
              <div>
                <div className="font-medium">{profile.nationality}</div>
                <div className="text-sm text-muted-foreground">
                  Moneda: {profile.currency || 'USD'}
                </div>
              </div>
            </div>
          </Card>}

        {/* Current Goals */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Target className="mr-2" size={20} />
            Objetivo Actual
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              {profile?.goal === 'lose' ? <TrendingDown className="mr-3 text-destructive" size={20} /> : profile?.goal === 'gain' ? <TrendingUp className="mr-3 text-success" size={20} /> : <Scale className="mr-3 text-muted-foreground" size={20} />}
              <div>
                <div className="font-medium">
                  {profile?.goal === 'lose' ? 'Perder peso' : profile?.goal === 'gain' ? 'Ganar peso' : 'Mantener peso'}
                </div>
                {profile?.goal && profile?.goal !== 'maintain' && <div className="text-sm text-muted-foreground">
                    {profile?.progress_speed === 'slow' ? '0.25 kg por semana' : profile?.progress_speed === 'moderate' ? '0.5 kg por semana' : profile?.progress_speed === 'fast' ? '1 kg por semana' : '0.5 kg por semana'}
                  </div>}
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

        {/* Settings */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            Configuración
          </h3>
          <div className="space-y-3">
            <Button variant="ghost" className="w-full justify-start" onClick={() => {
            console.log('Opening personal data dialog');
            setPersonalDataOpen(true);
          }}>
              Ajustar datos personales
            </Button>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                {theme === 'dark' ? <Moon className="mr-3" size={20} /> : <Sun className="mr-3" size={20} />}
                <span>Tema oscuro</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-8 w-16"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
            </div>
          </div>
        </Card>

        {/* Legal Section */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <FileText className="mr-2" size={20} />
            Legal
          </h3>
          <div className="space-y-1">
            <Link to="/terms-and-conditions" target="_blank">
              <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                <span>Términos y Condiciones</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Button>
            </Link>
            
            <Link to="/privacy-policy" target="_blank">
              <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                <span>Política de Privacidad</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Button>
            </Link>
            
            <a href="mailto:cal.maticai@gmail.com" className="block">
              <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                <span>Email de Soporte</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Button>
            </a>
            
            <Button 
              variant="ghost" 
              className="w-full justify-between p-3 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteAccountOpen(true)}
            >
              <span>Eliminar Cuenta</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Button>
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
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setEditGoalsOpen(true)}>
              Editar objetivos
            </Button>
          </div>
        </Card>
      </div>

      <EditNutritionGoalsDialog open={editGoalsOpen} onOpenChange={setEditGoalsOpen} />

      {user && <PersonalDataSettings userId={user.id} open={personalDataOpen} onOpenChange={setPersonalDataOpen} onDataUpdate={data => {
      // Refresh profile when personal data is updated
      setProfile({
        ...profile,
        ...data
      });
    }} />}

      <DataExportDialog open={exportDataOpen} onOpenChange={setExportDataOpen} />

      <DeleteAccountDialog 
        isOpen={deleteAccountOpen} 
        onOpenChange={setDeleteAccountOpen}
        userEmail={user?.email || ""}
      />

      <BottomNavigation />
    </div>;
};