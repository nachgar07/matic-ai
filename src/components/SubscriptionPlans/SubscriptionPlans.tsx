import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Check, Crown, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";

export const SubscriptionPlans = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const { 
    isNative, 
    isInitialized, 
    offerings, 
    subscriptionInfo, 
    loading, 
    purchasePackage,
    restorePurchases 
  } = useSubscription();

  if (!isNative) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          {t.subscriptionsOnlyAvailable}
        </p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentOffering = offerings?.current;
  const packages = currentOffering?.availablePackages || [];

  if (packages.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          {t.noPlansAvailable}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {subscriptionInfo?.isActive && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle>{t.activeSub}</CardTitle>
            </div>
            <CardDescription>
              {subscriptionInfo.expiresAt && (
                <>
                  {t.renewsOn}: {new Date(subscriptionInfo.expiresAt).toLocaleDateString()}
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          const isCurrentPlan = subscriptionInfo?.productId === pkg.product.identifier;
          
          return (
            <Card 
              key={pkg.identifier} 
              className={isCurrentPlan ? 'border-primary' : ''}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{pkg.product.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {pkg.product.description}
                    </CardDescription>
                  </div>
                  {isCurrentPlan && (
                    <Badge variant="default">
                      {t.current}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {pkg.product.priceString}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pkg.packageType}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{t.unlimitedMeals}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{t.aiAssistant}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{t.advancedStats}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{t.noAds}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => purchasePackage(pkg)}
                  disabled={loading || isCurrentPlan}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.processing}
                    </>
                  ) : isCurrentPlan ? (
                    t.currentPlan
                  ) : (
                    t.subscribe
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={restorePurchases}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.processing}
            </>
          ) : (
            t.restorePurchases
          )}
        </Button>
      </div>
    </div>
  );
};
