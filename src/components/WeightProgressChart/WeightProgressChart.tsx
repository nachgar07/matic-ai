import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { WeightEntry } from "@/hooks/useWeightHistory";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddWeightEntry, useDeleteWeightEntry } from "@/hooks/useWeightHistory";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

interface WeightProgressChartProps {
  data: WeightEntry[];
  targetWeight?: number | null;
  isLoading?: boolean;
  period?: "day" | "week" | "month" | "all";
  onPeriodChange?: (period: "day" | "week" | "month" | "all") => void;
}

export const WeightProgressChart = ({ data, targetWeight, isLoading, period = "all", onPeriodChange }: WeightProgressChartProps) => {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");
  const { language } = useLanguage();
  const t = (k: keyof typeof translations.es) => translations[language][k];
  const locale = language === 'es' ? es : enUS;
  
  const addWeightEntry = useAddWeightEntry();
  const deleteWeightEntry = useDeleteWeightEntry();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weight) {
      addWeightEntry.mutate(
        { weight: parseFloat(weight), date, notes },
        {
          onSuccess: () => {
            setOpen(false);
            setWeight("");
            setNotes("");
            setDate(format(new Date(), 'yyyy-MM-dd'));
          }
        }
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('weightProgress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      date: format(new Date(item.date), 'dd MMM', { locale }),
      weight: parseFloat(item.weight.toString()),
      fullDate: item.date,
      id: item.id
    }));

  const currentWeight = chartData[chartData.length - 1]?.weight;
  const startWeight = chartData[0]?.weight;
  const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{t('weightProgress')}</span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('logWeight')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('logWeight')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">{t('weightKg')}</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70.5"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{t('date')}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t('notesOptional')}</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('notesPlaceholder')}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addWeightEntry.isPending}>
                  {addWeightEntry.isPending ? t('saving') : t('saveWeight')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        {onPeriodChange && (
          <Tabs value={period} onValueChange={(v) => onPeriodChange(v as "day" | "week" | "month" | "all")} className="w-full pt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="day">{t('day')}</TabsTrigger>
              <TabsTrigger value="week">{t('week')}</TabsTrigger>
              <TabsTrigger value="month">{t('month')}</TabsTrigger>
              <TabsTrigger value="all">{t('allTime')}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {currentWeight && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>{t('currentWeight')}: {currentWeight} kg</p>
            {targetWeight && <p>{t('target')}: {targetWeight} kg</p>}
            {weightChange !== 0 && (
              <p className={weightChange > 0 ? "text-red-500" : "text-green-500"}>
                {t('change')}: {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[
                (dataMin: number) => Math.floor(dataMin * 0.95),
                (dataMax: number) => Math.ceil(dataMax * 1.05)
              ]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            {targetWeight && (
              <Line 
                type="monotone" 
                dataKey={() => targetWeight}
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                dot={false}
                name={t('target')}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              name={t('weightLabel')}
            />
          </LineChart>
        </ResponsiveContainer>

        {data.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{t('recentHistory')}</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {[...data]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{parseFloat(entry.weight.toString())} kg</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(entry.date), 'dd MMM yyyy', { locale })}
                      </p>
                      {entry.notes && (
                        <p className="text-muted-foreground text-xs mt-1">{entry.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWeightEntry.mutate(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
