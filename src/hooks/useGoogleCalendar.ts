import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGoogleCalendar = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { toast } = useToast();

  const authenticate = async () => {
    try {
      setIsLoading(true);
      
      // Get client ID from Supabase edge function (same as Google Drive)
      const { data: configData, error: configError } = await supabase.functions.invoke('google-drive-sync', {
        body: { action: 'get-config' }
      });

      if (configError || !configData?.clientId) {
        throw new Error('Failed to get Google client configuration');
      }
      
      const clientId = configData.clientId;
      const redirectUri = window.location.origin;
      const scope = 'https://www.googleapis.com/auth/calendar';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      // Open popup for Google authentication
      const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
      
      // Listen for the popup to close or redirect
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            reject(new Error('Authentication cancelled'));
          }
        }, 1000);

        // Listen for the auth code from the popup
        window.addEventListener('message', (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            clearInterval(checkClosed);
            popup?.close();
            setAccessToken(event.data.accessToken);
            resolve(event.data.accessToken);
          }
        });
      });

    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Error de autenticación",
        description: "No se pudo conectar con Google Calendar",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const syncMealsToCalendar = async (meals: any[], date: string) => {
    try {
      setIsLoading(true);
      
      let token = accessToken;
      if (!token) {
        token = await authenticate() as string;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'sync-meals',
          meals,
          date,
          accessToken: token
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "¡Sincronización exitosa!",
        description: data.message
      });

      return data;

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Error de sincronización",
        description: "No se pudieron sincronizar las comidas con Google Calendar",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    accessToken,
    authenticate,
    syncMealsToCalendar
  };
};