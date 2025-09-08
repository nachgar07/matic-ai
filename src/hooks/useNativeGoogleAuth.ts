import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export const useNativeGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  const signInWithGoogleNative = async () => {
    try {
      console.log('🚀 Iniciando Google Auth nativo con Capacitor...');
      
      // Inicializar GoogleAuth si es necesario
      await GoogleAuth.initialize({
        clientId: '831364630977-7v0fjumfc4jvn5vf88a5amc5dc9oldsc.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      // Obtener el token de Google de forma nativa
      const googleUser = await GoogleAuth.signIn();
      console.log('✅ Google Auth nativo exitoso:', googleUser);

      if (!googleUser.authentication?.idToken) {
        throw new Error('No se pudo obtener el token de autenticación de Google');
      }

      // Intercambiar el token de Google con Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.authentication.idToken,
        access_token: googleUser.authentication.accessToken,
      });

      if (error) {
        console.error('Error al autenticar con Supabase:', error);
        throw error;
      }

      console.log('✅ Autenticación con Supabase exitosa');
      return { data, error: null };

    } catch (error: any) {
      console.error('❌ Error en Google Auth nativo:', error);
      throw error;
    }
  };

  const signInWithGoogleWeb = async () => {
    try {
      console.log('🌐 Iniciando Google OAuth web...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }

      console.log('Google OAuth initiated successfully');
      return { data, error: null };
      
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    
    try {
      if (isNative) {
        toast({
          title: "Iniciando sesión...",
          description: "Autenticando con Google de forma nativa.",
        });
        return await signInWithGoogleNative();
      } else {
        toast({
          title: "Redirigiendo a Google...",
          description: "Te redirigiremos de vuelta en unos segundos.",
        });
        return await signInWithGoogleWeb();
      }
      
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle,
    loading,
    isNative,
  };
};
