import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTermsAcceptance = () => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkTermsAcceptance = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_terms_acceptance')
        .select('*')
        .eq('user_id', userId)
        .eq('terms_version', '2025-08-26')
        .eq('privacy_version', '2025-08-26')
        .maybeSingle();

      if (error) {
        // Log the error but don't block the user if it's just a network issue
        console.error('Error checking terms acceptance:', error);
        setHasAcceptedTerms(false);
      } else {
        setHasAcceptedTerms(!!data);
      }
    } catch (error) {
      console.error('Network error checking terms acceptance:', error);
      // In case of network errors, assume terms not accepted to be safe
      setHasAcceptedTerms(false);
    } finally {
      setLoading(false);
    }
  };

  const acceptTerms = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_terms_acceptance')
        .upsert({
          user_id: userId,
          terms_version: '2025-08-26',
          privacy_version: '2025-08-26',
          ip_address: null, // Could be populated with actual IP if needed
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Error accepting terms:', error);
        toast({
          title: "Error",
          description: "Hubo un error al aceptar los términos. Inténtalo de nuevo.",
          variant: "destructive"
        });
        return false;
      }

      setHasAcceptedTerms(true);
      toast({
        title: "Éxito",
        description: "Términos y condiciones aceptados correctamente.",
      });
      return true;
    } catch (error) {
      console.error('Network error accepting terms:', error);
      toast({
        title: "Error de red",
        description: "Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    hasAcceptedTerms,
    loading,
    checkTermsAcceptance,
    acceptTerms
  };
};