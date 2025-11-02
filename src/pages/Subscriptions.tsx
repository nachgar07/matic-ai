import { Header } from "@/components/Layout/Header";
import { BottomNavigation } from "@/components/Layout/BottomNavigation";
import { SubscriptionPlans } from "@/components/SubscriptionPlans/SubscriptionPlans";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

export const Subscriptions = () => {
  const { language } = useLanguage();
  const t = translations[language];
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Premium" />
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <SubscriptionPlans />
      </main>
      <BottomNavigation />
    </div>
  );
};
