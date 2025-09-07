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
      try {
        await GoogleAuth.initialize({
          clientId: '831364630977-7v0fjumfc4jvn5vf88a5amc5dc9oldsc.apps.googleauth.com', // Web Client ID
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
        console.log('Google Auth initialized successfully');
        return true;
      } catch (error) {
        console.error('Failed to initialize Google Auth:', error);
        throw error;
      }
    }
    return false;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    
    try {
      // Check if we're on a native platform (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          // Initialize Google Auth first
          console.log('Initializing Google Auth...');
          await initializeGoogleAuth();
          
          console.log('Attempting native Google Sign-In...');
          const googleUser = await GoogleAuth.signIn();
          console.log('Google Sign-In response:', googleUser);
          
          // Check for ID token in different possible locations
          const idToken = googleUser.authentication?.idToken || 
                          (googleUser as any).idToken ||
                          googleUser.authentication?.accessToken;
          
          if (idToken) {
            console.log('ID Token obtained, signing in to Supabase...');
            // Sign in to Supabase with the ID token
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            });

            if (error) {
              console.error('Supabase signInWithIdToken error:', error);
              throw error;
            }

            toast({
              title: "¡Bienvenido!",
              description: "Has iniciado sesión correctamente.",
            });

            return { data, error: null };
          } else {
            console.error('No ID token found in response:', googleUser);
            throw new Error('No se pudo obtener el token de autenticación nativo');
          }
        } catch (nativeError: any) {
          console.error('Native Google Sign-In failed:', nativeError);
          console.error('Error details:', {
            message: nativeError.message,
            code: nativeError.code,
            stack: nativeError.stack
          });
          
          // Only show fallback toast if it's actually going to try web auth
          if (Capacitor.isNativePlatform()) {
            toast({
              title: "Error en login nativo",
              description: `Código: ${nativeError.code || 'desconocido'}. Intentando método web...`,
              variant: "destructive"
            });
          }

          // Fallback to web OAuth if native fails
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
