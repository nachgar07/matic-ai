import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExpenseChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
    icon: string;
  }>;
  totalAmount: number;
  chartPeriod: 'day' | 'week' | 'month';
  onPeriodChange: (period: 'day' | 'week' | 'month') => void;
}

export const ExpenseChart = ({ data, totalAmount, chartPeriod, onPeriodChange }: ExpenseChartProps) => {
  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Distribución de Gastos</CardTitle>
          {/* Botones de período */}
          <div className="flex gap-2 justify-center mt-3">
            <Button
              variant={chartPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange('month')}
              className="px-2 py-1 text-xs h-7"
            >
              Mes
            </Button>
            <Button
              variant={chartPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange('week')}
              className="px-2 py-1 text-xs h-7"
            >
              Semana
            </Button>
            <Button
              variant={chartPeriod === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange('day')}
              className="px-2 py-1 text-xs h-7"
            >
              Hoy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No hay datos para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalAmount) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{data.icon}</span>
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            ${data.value.toLocaleString()} ({percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs">{entry.payload.icon}</span>
            <span className="text-sm text-muted-foreground">{entry.value}</span>
            <span className="text-xs text-muted-foreground">
              {((entry.payload.value / totalAmount) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Distribución de Gastos</CardTitle>
        {/* Botones de período */}
        <div className="flex gap-2 justify-center mt-3">
          <Button
            variant={chartPeriod === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('month')}
            className="px-2 py-1 text-xs h-7"
          >
            Mes
          </Button>
          <Button
            variant={chartPeriod === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('week')}
            className="px-2 py-1 text-xs h-7"
          >
            Semana
          </Button>
          <Button
            variant={chartPeriod === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('day')}
            className="px-2 py-1 text-xs h-7"
          >
            Hoy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Total amount in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-2xl">💰</div>
            <div className="text-lg font-bold">${totalAmount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};