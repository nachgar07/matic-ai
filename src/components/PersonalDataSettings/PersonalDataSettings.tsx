import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calculator, User, Target, Activity } from "lucide-react";

interface PersonalData {
  age?: number;
  gender?: 'male' | 'female';
  weight?: number;
  height?: number;
  goal?: 'lose' | 'maintain' | 'gain';
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'active' | 'very_active';
  calculated_tdee?: number;
  calculated_calories?: number;
}

interface PersonalDataSettingsProps {
  userId: string;
  onDataUpdate?: (data: PersonalData & { calculated_calories: number }) => void;
}

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  active: 1.725,
  very_active: 1.9
};

const GOAL_ADJUSTMENTS = {
  lose: -400,
  maintain: 0,
  gain: 400
};

export const PersonalDataSettings: React.FC<PersonalDataSettingsProps> = ({ userId, onDataUpdate }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PersonalData>({});

  useEffect(() => {
    loadPersonalData();
  }, [userId]);

  useEffect(() => {
    calculateTDEE();
  }, [data.age, data.gender, data.weight, data.height, data.activity_level, data.goal]);

  const loadPersonalData = async () => {
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('age, gender, weight, height, goal, activity_level, calculated_tdee, calculated_calories')
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
    const { age, gender, weight, height, activity_level, goal } = data;
    
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
    const goalAdjustment = goal ? GOAL_ADJUSTMENTS[goal] : 0;
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
          calculated_calories: data.calculated_calories
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
    setData(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="text-center py-8">Cargando datos personales...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Datos Personales
        </CardTitle>
        <CardDescription>
          Configura tus datos para calcular automáticamente tus necesidades calóricas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
              <SelectItem value="lose">Perder peso</SelectItem>
              <SelectItem value="maintain">Mantener peso</SelectItem>
              <SelectItem value="gain">Ganar peso</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5" />
                Cálculo Automático de Calorías
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">TDEE (Gasto Energético Total)</p>
                  <p className="text-2xl font-bold text-primary">{data.calculated_tdee} cal</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Objetivo Calórico Diario</p>
                  <p className="text-2xl font-bold text-secondary">{data.calculated_calories} cal</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Fórmula: Mifflin-St Jeor</p>
                <p>
                  Ajuste por objetivo: {data.goal === 'lose' ? '-400 cal' : data.goal === 'gain' ? '+400 cal' : '0 cal'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Guardando...' : 'Guardar Datos Personales'}
        </Button>
      </CardContent>
    </Card>
  );
};