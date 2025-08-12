import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallPrompt = () => {
  const { isInstallable, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = () => {
    installApp();
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm border-accent/20 bg-card/95 backdrop-blur-sm">
      <CardHeader className="flex-row items-center space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-base">Instalar Vital AI</CardTitle>
          <CardDescription className="text-sm">
            Acceso rápido desde tu pantalla de inicio
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Instalar
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            size="sm"
          >
            Ahora no
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};