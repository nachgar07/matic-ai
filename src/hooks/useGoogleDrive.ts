import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGoogleDrive = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const authenticate = async () => {
    try {
      setIsLoading(true);
      
      // Get Google Client ID from environment via edge function
      const { data: configData } = await supabase.functions.invoke('google-drive-sync', {
        body: { action: 'get-config' }
      });
      
      if (!configData?.clientId) {
        throw new Error('Google Client ID not configured');
      }
      
      const clientId = configData.clientId;
      const redirectUri = window.location.origin;
      const scope = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ].join(' ');
      
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
            setIsConnected(true);
            resolve(event.data.accessToken);
          }
        });
      });

    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Error de autenticación",
        description: "No se pudo conectar con Google Drive",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createExpenseSheet = async (expenses: any[]) => {
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

      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: {
          action: 'create-sheet',
          expenses,
          accessToken: token
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "¡Excel creado exitosamente!",
        description: "Se ha creado el archivo de gastos en Google Drive"
      });

      return data;

    } catch (error) {
      console.error('Create sheet error:', error);
      toast({
        title: "Error al crear Excel",
        description: "No se pudo crear el archivo en Google Drive",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const syncExpensesToSheet = async (expenses: any[], sheetId: string) => {
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

      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: {
          action: 'sync-expenses',
          expenses,
          sheetId,
          accessToken: token
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "¡Sincronización exitosa!",
        description: "Los gastos se han actualizado en Google Drive"
      });

      return data;

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Error de sincronización",
        description: "No se pudieron sincronizar los gastos",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const syncFromSheet = async (sheetId: string) => {
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

      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: {
          action: 'sync-from-sheet',
          sheetId,
          accessToken: token
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "¡Importación exitosa!",
        description: "Los cambios del Excel se han importado a la app"
      });

      return data;

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error de importación",
        description: "No se pudieron importar los cambios del Excel",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setAccessToken(null);
    setIsConnected(false);
    toast({
      title: "Desconectado de Google Drive",
      description: "La integración con Google Drive ha sido desactivada"
    });
  };

  return {
    isLoading,
    accessToken,
    isConnected,
    authenticate,
    createExpenseSheet,
    syncExpensesToSheet,
    syncFromSheet,
    disconnect
  };
};