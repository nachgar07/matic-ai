import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calculator, User, Target, Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface PersonalData {
  age?: number;
  gender?: 'male' | 'female';
  weight?: number;
  height?: number;
  goal?: 'lose' | 'maintain' | 'gain';
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'active' | 'very_active';
  calculated_tdee?: number;
  calculated_calories?: number;
  target_weight?: number;
  progress_speed?: 'slow' | 'moderate' | 'fast';
  nationality?: string;
  currency?: string;
}

interface PersonalDataSettingsProps {
  userId: string;
  onDataUpdate?: (data: PersonalData & { calculated_calories: number }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  active: 1.725,
  very_active: 1.9
};

const PROGRESS_SPEED_ADJUSTMENTS = {
  slow: { lose: -300, gain: 300 },      // 0.25 kg/week ≈ 300 cal deficit/surplus
  moderate: { lose: -500, gain: 500 },  // 0.5 kg/week ≈ 500 cal deficit/surplus 
  fast: { lose: -750, gain: 750 }       // 0.75 kg/week ≈ 750 cal deficit/surplus
};

const COUNTRIES_CURRENCIES = {
  'Argentina': 'ARS',
  'México': 'MXN', 
  'España': 'EUR',
  'Colombia': 'COP',
  'Chile': 'CLP',
  'Perú': 'PEN',
  'Venezuela': 'VES',
  'Ecuador': 'USD',
  'Bolivia': 'BOB',
  'Paraguay': 'PYG',
  'Uruguay': 'UYU',
  'Estados Unidos': 'USD',
  'Canadá': 'CAD',
  'Brasil': 'BRL',
  'Reino Unido': 'GBP',
  'Francia': 'EUR',
  'Italia': 'EUR',
  'Alemania': 'EUR'
};

export const PersonalDataSettings: React.FC<PersonalDataSettingsProps> = ({ userId, onDataUpdate, open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PersonalData>({});

  useEffect(() => {
    loadPersonalData();
  }, [userId]);

  useEffect(() => {
    calculateTDEE();
  }, [data.age, data.gender, data.weight, data.height, data.activity_level, data.goal, data.progress_speed, data.target_weight]);

  const loadPersonalData = async () => {
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('age, gender, weight, height, goal, activity_level, calculated_tdee, calculated_calories, target_weight, progress_speed, nationality, currency')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setData((profile as PersonalData) || {});
    } catch (error) {
      console.error('Error loading personal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTDEE = () => {
    const { age, gender, weight, height, activity_level, goal, progress_speed, target_weight } = data;
    
    if (!age || !gender || !weight || !height || !activity_level) {
      return;
    }

    // Mifflin-St Jeor equation
    let bmr: number;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    const tdee = bmr * ACTIVITY_FACTORS[activity_level];
    
    let goalAdjustment = 0;
    // Solo aplicar ajuste de calorías si hay peso objetivo definido
    if (goal && goal !== 'maintain' && progress_speed && target_weight && weight) {
      goalAdjustment = PROGRESS_SPEED_ADJUSTMENTS[progress_speed][goal];
      
      // Ajuste adicional basado en la diferencia de peso objetivo
      const weightDiff = Math.abs(target_weight - weight);
      // Agregar 50 calorías por kg de diferencia para que el proceso sea más eficiente
      if (goal === 'gain' && target_weight > weight) {
        goalAdjustment += weightDiff * 50;
      } else if (goal === 'lose' && target_weight < weight) {
        goalAdjustment -= weightDiff * 50;
      }
    }
    
    const targetCalories = Math.round(tdee + goalAdjustment);

    setData(prev => ({
      ...prev,
      calculated_tdee: Math.round(tdee),
      calculated_calories: targetCalories
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age: data.age,
          gender: data.gender,
          weight: data.weight,
          height: data.height,
          goal: data.goal,
          activity_level: data.activity_level,
          calculated_tdee: data.calculated_tdee,
          calculated_calories: data.calculated_calories,
          target_weight: data.target_weight,
          progress_speed: data.progress_speed,
          nationality: data.nationality,
          currency: data.currency
        })
        .eq('id', userId);

      if (error) throw error;

      // Update nutrition goals with calculated calories
      if (data.calculated_calories) {
        await supabase
          .from('nutrition_goals')
          .upsert({
            user_id: userId,
            daily_calories: data.calculated_calories
          });
        
        onDataUpdate?.(data as PersonalData & { calculated_calories: number });
      }

      toast({
        title: "Datos guardados",
        description: "Tus datos personales y objetivos calóricos han sido actualizados."
      });
      
      // Close dialog after successful save
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving personal data:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateData = (key: keyof PersonalData, value: any) => {
    const updates: Partial<PersonalData> = { [key]: value };
    
    // Auto-update currency when nationality changes
    if (key === 'nationality' && COUNTRIES_CURRENCIES[value as keyof typeof COUNTRIES_CURRENCIES]) {
      updates.currency = COUNTRIES_CURRENCIES[value as keyof typeof COUNTRIES_CURRENCIES];
    }
    
    setData(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return <div className="text-center py-8">Cargando datos personales...</div>;
  }

  console.log('PersonalDataSettings render:', { open, loading, data });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Datos Personales
          </DialogTitle>
          <DialogDescription>
            Configura tus datos para calcular automáticamente tus necesidades calóricas
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
        {/* Información básica */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age">Edad (años)</Label>
            <Input
              id="age"
              type="number"
              value={data.age || ''}
              onChange={(e) => updateData('age', parseInt(e.target.value) || undefined)}
              placeholder="Ej: 25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={data.weight || ''}
              onChange={(e) => updateData('weight', parseFloat(e.target.value) || undefined)}
              placeholder="Ej: 70.5"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Altura (cm)</Label>
          <Input
            id="height"
            type="number"
            value={data.height || ''}
            onChange={(e) => updateData('height', parseInt(e.target.value) || undefined)}
            placeholder="Ej: 175"
          />
        </div>

        {/* Nacionalidad */}
        <div className="space-y-2">
          <Label htmlFor="nationality">País/Nacionalidad</Label>
          <Select value={data.nationality || ''} onValueChange={(value) => updateData('nationality', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu país" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(COUNTRIES_CURRENCIES).map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sexo */}
        <div className="space-y-3">
          <Label>Sexo</Label>
          <RadioGroup
            value={data.gender || ''}
            onValueChange={(value) => updateData('gender', value as 'male' | 'female')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male">Hombre</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female">Mujer</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Objetivo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Objetivo Principal
          </Label>
          <Select value={data.goal || ''} onValueChange={(value) => updateData('goal', value as 'lose' | 'maintain' | 'gain')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lose">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Perder peso
                </div>
              </SelectItem>
              <SelectItem value="maintain">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4" />
                  Mantener peso
                </div>
              </SelectItem>
              <SelectItem value="gain">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ganar peso
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Peso objetivo */}
        <div className="space-y-2">
          <Label htmlFor="target_weight">
            Peso objetivo (kg)
          </Label>
          <Input
            id="target_weight"
            type="number"
            step="0.1"
            value={data.target_weight || ''}
            onChange={(e) => updateData('target_weight', parseFloat(e.target.value) || undefined)}
            placeholder={data.goal === 'lose' ? 'Ej: 65.0' : data.goal === 'gain' ? 'Ej: 80.0' : 'Ej: 70.0'}
          />
        </div>

        {/* Velocidad del progreso - solo si el objetivo no es mantener */}
        {data.goal && data.goal !== 'maintain' && (
          <div className="space-y-2">
            <Label>Velocidad del progreso</Label>
            <Select value={data.progress_speed || ''} onValueChange={(value) => updateData('progress_speed', value as 'slow' | 'moderate' | 'fast')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la velocidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">
                  <div>
                    <div className="font-medium">Lenta</div>
                    <div className="text-sm text-muted-foreground">0.25 kg por semana</div>
                  </div>
                </SelectItem>
                <SelectItem value="moderate">
                  <div>
                    <div className="font-medium">Moderada</div>
                    <div className="text-sm text-muted-foreground">0.5 kg por semana</div>
                  </div>
                </SelectItem>
                <SelectItem value="fast">
                  <div>
                    <div className="font-medium">Rápida</div>
                    <div className="text-sm text-muted-foreground">0.75-1 kg por semana</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Nivel de actividad */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Nivel de Actividad Física
          </Label>
          <Select value={data.activity_level || ''} onValueChange={(value) => updateData('activity_level', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu nivel de actividad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentario (poco o ningún ejercicio)</SelectItem>
              <SelectItem value="lightly_active">Ligeramente activo (ejercicio ligero 1-3 días/semana)</SelectItem>
              <SelectItem value="moderately_active">Moderadamente activo (ejercicio moderado 3-5 días/semana)</SelectItem>
              <SelectItem value="active">Activo (ejercicio intenso 6-7 días/semana)</SelectItem>
              <SelectItem value="very_active">Muy activo (ejercicio muy intenso, trabajo físico)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Calculadora TDEE */}
        {data.calculated_tdee && data.calculated_calories && (
          <Card className="bg-primary/5">
            <div className="p-4 border-b">
              <h4 className="flex items-center gap-2 text-lg font-semibold">
                <Calculator className="h-5 w-5" />
                Cálculo Automático de Calorías
              </h4>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">TDEE (Gasto Energético Total)</p>
                  <p className="text-2xl font-bold text-foreground">{data.calculated_tdee} cal</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Objetivo Calórico Diario</p>
                  <p className="text-2xl font-bold text-foreground">{data.calculated_calories} cal</p>
                </div>
              </div>

              {/* Información de progreso si hay peso objetivo */}
              {data.target_weight && data.weight && data.goal && data.goal !== 'maintain' && data.progress_speed && (
                <div className="mt-4 p-3 bg-background rounded-lg border">
                  <h5 className="font-medium mb-2">Proyección de Progreso</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Peso a {data.goal === 'lose' ? 'perder' : 'ganar'}</p>
                      <p className="text-lg font-bold text-foreground">
                        {Math.abs(data.target_weight - data.weight).toFixed(1)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tiempo estimado</p>
                      <p className="text-lg font-bold text-foreground">
                        {(() => {
                          const weightDiff = Math.abs(data.target_weight - data.weight);
                          const weeklyRate = data.progress_speed === 'slow' ? 0.25 : 
                                           data.progress_speed === 'moderate' ? 0.5 : 0.75;
                          const weeks = Math.ceil(weightDiff / weeklyRate);
                          
                          console.log('Tiempo estimado:', { weightDiff, weeklyRate, weeks, progress_speed: data.progress_speed });
                          
                          if (weeks <= 3) {
                            return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
                          } else {
                            const months = Math.floor(weeks / 4.33);
                            const remainingWeeks = Math.round(weeks % 4.33);
                            
                            if (months === 0) {
                              return `${weeks} semanas`;
                            } else if (remainingWeeks === 0) {
                              return `${months} ${months === 1 ? 'mes' : 'meses'}`;
                            } else {
                              return `${months} ${months === 1 ? 'mes' : 'meses'} ${remainingWeeks} ${remainingWeeks === 1 ? 'semana' : 'semanas'}`;
                            }
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <p>Fórmula: Mifflin-St Jeor + Ajuste saludable</p>
                {data.goal && data.goal !== 'maintain' && data.progress_speed && (
                  <p>
                    Ajuste por velocidad: {data.goal === 'lose' ? '-' : '+'}{Math.abs(PROGRESS_SPEED_ADJUSTMENTS[data.progress_speed][data.goal as 'lose' | 'gain'])} cal/día
                    ({data.progress_speed === 'slow' ? '0.25' : data.progress_speed === 'moderate' ? '0.5' : '0.75'} kg/semana)
                  </p>
                )}
                {data.goal === 'maintain' && <p>Sin ajuste calórico (mantenimiento)</p>}
                <p className="text-xs opacity-75">Basado en 1kg = 7,700 calorías</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};