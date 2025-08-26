import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const TermsAcceptanceModal = ({ isOpen, onAccept }: TermsAcceptanceModalProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Términos y Condiciones
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Para continuar es necesario aceptar los{" "}
            <Link 
              to="/terms-and-conditions" 
              target="_blank"
              className="text-primary underline hover:no-underline"
            >
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link 
              to="/privacy-policy" 
              target="_blank"
              className="text-primary underline hover:no-underline"
            >
              Política de Privacidad
            </Link>
            .
          </p>

          <div className="flex items-start space-x-2">
            <Checkbox 
              id="terms" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
            />
            <label 
              htmlFor="terms" 
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              He leído y acepto los{" "}
              <Link 
                to="/terms-and-conditions" 
                target="_blank"
                className="text-primary underline hover:no-underline"
              >
                Términos y Condiciones
              </Link>{" "}
              y{" "}
              <Link 
                to="/privacy-policy" 
                target="_blank"
                className="text-primary underline hover:no-underline"
              >
                Política de Privacidad
              </Link>
              .
            </label>
          </div>

          <Button 
            onClick={handleAccept}
            disabled={!accepted}
            className="w-full"
            size="lg"
          >
            Aceptar y continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};