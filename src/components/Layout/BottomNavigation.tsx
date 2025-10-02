import { Home, Utensils, Target, User, BarChart3 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.es) => translations[language][key];

  const navItems = [
    { icon: Home, label: t('home'), path: "/" },
    { icon: Utensils, label: t('meals'), path: "/comidas" },
    { icon: Target, label: t('goals'), path: "/objetivos" },
    { icon: BarChart3, label: "Stats", path: "/estadisticas" },
    { icon: User, label: t('profile'), path: "/perfil" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};