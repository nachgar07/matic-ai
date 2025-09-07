import { useState } from 'react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useNativeGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initializeGoogleAuth = async () => {
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.initialize({
        clientId: '831364630977-7v0fjumfc4jvn5vf88a5amc5dc9oldsc.apps.googleusercontent.com', // Web Client ID
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    
    try {
      // Check if we're on a native platform (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          // Use native Google Sign-In as default
          await initializeGoogleAuth();
          
          const googleUser = await GoogleAuth.signIn();
          
          if (googleUser.authentication?.idToken) {
            // Sign in to Supabase with the ID token
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: googleUser.authentication.idToken,
            });

            if (error) throw error;

            toast({
              title: "¡Bienvenido!",
              description: "Has iniciado sesión correctamente.",
            });

            return { data, error: null };
          } else {
            throw new Error('No se pudo obtener el token de autenticación nativo');
          }
        } catch (nativeError: any) {
          console.log('Native Google Sign-In failed, trying web fallback:', nativeError);
          
          // Fallback to web OAuth if native fails
          toast({
            title: "Intentando método alternativo...",
            description: "Probando autenticación web.",
          });

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

          return { data, error };
        }
      } else {
        // Web platform - use OAuth directly
        toast({
          title: "Redirigiendo a Google...",
          description: "Te redirigiremos de vuelta en unos segundos.",
        });

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

        return { data, error };
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
    isNative: Capacitor.isNativePlatform(),
  };
};
