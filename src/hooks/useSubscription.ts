import { useState, useEffect, useCallback } from 'react';
import { Purchases, PurchasesOfferings, CustomerInfo, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SubscriptionInfo {
  isActive: boolean;
  productId: string | null;
  expiresAt: Date | null;
  status: string | null;
  platform: string | null;
}

export const useSubscription = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNative = Capacitor.isNativePlatform();

  // Fetch subscription status from Supabase
  const { data: subscriptionInfo, refetch: refetchSubscription } = useQuery<SubscriptionInfo>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return {
          isActive: false,
          productId: null,
          expiresAt: null,
          status: null,
          platform: null,
        };
      }

      const now = new Date();
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      const isActive = data.subscription_status === 'active' && 
                      (!expiresAt || expiresAt > now);

      return {
        isActive,
        productId: data.product_id,
        expiresAt,
        status: data.subscription_status,
        platform: data.platform,
      };
    },
    enabled: !!isNative,
  });

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (!isNative) {
        console.log('Not native platform, skipping RevenueCat initialization');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user authenticated');
          return;
        }

        // Configure RevenueCat with user ID
        await Purchases.configure({
          apiKey: Capacitor.getPlatform() === 'android' 
            ? 'YOUR_ANDROID_API_KEY' // Usuario debe reemplazar esto
            : 'YOUR_IOS_API_KEY',    // Usuario debe reemplazar esto
          appUserID: user.id,
        });

        console.log('RevenueCat initialized for user:', user.id);
        setIsInitialized(true);

        // Fetch available offerings
        const offeringsResult = await Purchases.getOfferings();
        setOfferings(offeringsResult);
        console.log('Offerings loaded:', offeringsResult);

      } catch (error) {
        console.error('Error initializing RevenueCat:', error);
        toast({
          title: 'Error de inicialización',
          description: 'No se pudo inicializar el sistema de suscripciones',
          variant: 'destructive',
        });
      }
    };

    initializeRevenueCat();
  }, [isNative, toast]);

  // Purchase subscription
  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    if (!isInitialized) {
      toast({
        title: 'Error',
        description: 'El sistema de suscripciones no está listo',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: pkg,
      });

      console.log('Purchase successful:', purchaseResult);

      toast({
        title: '¡Suscripción activada!',
        description: 'Tu suscripción ha sido activada exitosamente',
      });

      // Refresh subscription status
      await refetchSubscription();
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });

      return true;
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      if (!error.userCancelled) {
        toast({
          title: 'Error en la compra',
          description: error.message || 'No se pudo completar la suscripción',
          variant: 'destructive',
        });
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [isInitialized, toast, refetchSubscription, queryClient]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    if (!isInitialized) {
      toast({
        title: 'Error',
        description: 'El sistema de suscripciones no está listo',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      const result = await Purchases.restorePurchases();
      const customerInfo = result.customerInfo;
      console.log('Purchases restored:', customerInfo);

      const hasActiveSubscription = Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasActiveSubscription) {
        toast({
          title: 'Compras restauradas',
          description: 'Tus suscripciones han sido restauradas exitosamente',
        });
        await refetchSubscription();
        queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      } else {
        toast({
          title: 'No se encontraron compras',
          description: 'No hay suscripciones activas para restaurar',
        });
      }

      return hasActiveSubscription;
    } catch (error: any) {
      console.error('Restore error:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron restaurar las compras',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isInitialized, toast, refetchSubscription, queryClient]);

  return {
    isNative,
    isInitialized,
    offerings,
    subscriptionInfo,
    loading,
    purchasePackage,
    restorePurchases,
    refetchSubscription,
  };
};
