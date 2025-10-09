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
      
      // Verificar si estamos en un entorno nativo válido
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Google Auth nativo solo funciona en dispositivos móviles');
      }

      console.log('📱 Usando configuración nativa de Capacitor...');
      console.log('🔧 Platform:', Capacitor.getPlatform());

      // Obtener el token de Google de forma nativa
      let googleUser;
      try {
        googleUser = await GoogleAuth.signIn();
        console.log('✅ Google Auth nativo exitoso:', {
          email: googleUser.email,
          name: googleUser.name,
          hasIdToken: !!googleUser.authentication?.idToken,
          hasAccessToken: !!googleUser.authentication?.accessToken,
        });
      } catch (googleError: any) {
        console.error('❌ Error al hacer sign in con Google:', googleError);
        throw new Error(`Error de Google Sign In: ${googleError.message || 'Error desconocido'}`);
      }

      if (!googleUser.authentication?.idToken) {
        console.error('❌ No se recibió idToken de Google');
        throw new Error('No se pudo obtener el token de autenticación de Google');
      }

      console.log('🔄 Intercambiando token con Supabase...');
      
      // Intercambiar el token de Google con Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.authentication.idToken,
        access_token: googleUser.authentication.accessToken,
      });

      if (error) {
        console.error('❌ Error al autenticar con Supabase:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        throw new Error(`Error de Supabase: ${error.message}`);
      }

      console.log('✅ Autenticación con Supabase exitosa:', {
        userId: data.user?.id,
        email: data.user?.email,
      });
      
      return { data, error: null };

    } catch (error: any) {
      console.error('❌ Error completo en Google Auth nativo:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
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
