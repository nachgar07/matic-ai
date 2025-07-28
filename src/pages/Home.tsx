import { CalorieRing } from "@/components/CalorieRing/CalorieRing";
import { WeeklyCalendar } from "@/components/WeeklyCalendar/WeeklyCalendar";
import { MacroCard } from "@/components/MacroCard/MacroCard";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { Footprints, Flame, Sparkles } from "lucide-react";

export const Home = () => {
  // Mock data
  const caloriesConsumed = 0;
  const caloriesTarget = 2586;
  const steps = 0;
  const activeCalories = 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Calogram</h1>
        <WeeklyCalendar />
      </div>

      {/* Main Calorie Ring */}
      <div className="px-4 py-6 flex justify-center">
        <CalorieRing
          consumed={caloriesConsumed}
          target={caloriesTarget}
          size={220}
        />
      </div>

      {/* Activity Stats */}
      <div className="px-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 bg-card rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Footprints className="text-muted-foreground mr-2" size={20} />
              <span className="text-sm text-muted-foreground">steps</span>
            </div>
            <div className="text-2xl font-bold">{steps}</div>
          </div>
          <div className="flex-1 bg-card rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Flame className="text-orange-500 mr-2" size={20} />
              <span className="text-sm text-muted-foreground">active calories</span>
            </div>
            <div className="text-2xl font-bold">{activeCalories}</div>
          </div>
        </div>
      </div>

      {/* Macronutrients */}
      <div className="px-4 mb-6">
        <div className="flex gap-3">
          <MacroCard
            icon="🥩"
            label="Protein"
            current={0}
            target={129}
            unit="g"
          />
          <MacroCard
            icon="🍞"
            label="Carbs"
            current={0}
            target={323}
            unit="g"
          />
          <MacroCard
            icon="🥑"
            label="Fat"
            current={0}
            target={86}
            unit="g"
          />
        </div>
      </div>

      {/* Reminder Card */}
      <div className="px-4 mb-6">
        <div className="bg-card rounded-lg p-4 flex items-center">
          <Sparkles className="text-primary mr-3" size={24} />
          <span className="text-muted-foreground">
            "Don't forget to log today's food!"
          </span>
        </div>
      </div>

      {/* Calorie Logs Section */}
      <div className="px-4">
        <h2 className="text-xl font-bold mb-4">Calorie logs</h2>
        <div className="bg-card rounded-lg p-6 text-center">
          <div className="text-muted-foreground mb-2">
            You haven't logged any food
          </div>
          <div className="text-sm text-muted-foreground">
            Start tracking today's calories by taking a quick photo
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};