import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

interface CaloriesChartProps {
  data: Array<{ date: string; calories: number }>;
  title: string;
  isLoading?: boolean;
  goal?: number;
}

export const CaloriesChart = ({ data, title, isLoading, goal }: CaloriesChartProps) => {
  const { language } = useLanguage();
  const t = (k: keyof typeof translations.es) => translations[language][k];
  const locale = language === 'es' ? es : enUS;
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    date: format(new Date(item.date), 'dd MMM', { locale }),
    calories: Math.round(item.calories),
    fullDate: item.date
  }));

  const maxCalories = Math.max(...chartData.map(d => d.calories), goal || 0);
  const avgCalories = chartData.length > 0 
    ? Math.round(chartData.reduce((sum, d) => sum + d.calories, 0) / chartData.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <span className="text-sm text-muted-foreground font-normal">
            {t('average')}: {avgCalories} kcal
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              domain={[0, Math.ceil(maxCalories * 1.1)]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            {goal && (
              <Line 
                type="monotone" 
                dataKey={() => goal}
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                dot={false}
                name={t('target')}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="calories" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              name={t('caloriesAxis')}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
