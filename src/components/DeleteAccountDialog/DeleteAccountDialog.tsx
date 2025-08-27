import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export const DeleteAccountDialog = ({ isOpen, onOpenChange, userEmail }: DeleteAccountDialogProps) => {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    if (confirmEmail !== userEmail) {
      toast({
        title: "Error",
        description: "El email de confirmación no coincide",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsDeleting(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "No hay sesión activa",
          variant: "destructive"
        });
        return;
      }

      // Call the delete account function
      const { error: deleteError } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deleteError) {
        throw deleteError;
      }
      
      // Clean up all authentication state immediately
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage || {}).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });

      // Sign out completely
      await supabase.auth.signOut({ scope: 'global' });
      
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta y todos tus datos han sido eliminados permanentemente.",
      });
      
      // Force redirect to auth page with a small delay to ensure cleanup
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Hubo un error al eliminar la cuenta. Por favor contacta soporte.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetState = () => {
    setConfirmEmail("");
    setIsDeleting(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar cuenta permanentemente</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Esta acción es irreversible. Se eliminarán permanentemente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Tu perfil y datos personales</li>
                <li>Historial de comidas y calorías</li>
                <li>Registro de gastos</li>
                <li>Tareas y objetivos</li>
                <li>Todas las conversaciones con la IA</li>
              </ul>
              <div className="space-y-2">
                <Label htmlFor="confirm-email">
                  Para confirmar, escribe tu email: <strong>{userEmail}</strong>
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder="Confirma tu email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  disabled={isDeleting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={confirmEmail !== userEmail || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar cuenta"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};