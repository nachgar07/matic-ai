import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { CloudIcon, FileSpreadsheetIcon, RefreshCwIcon, ExternalLinkIcon, XIcon } from 'lucide-react';

interface GoogleDriveIntegrationProps {
  expenses: any[];
  onRefreshExpenses: () => void;
}

export const GoogleDriveIntegration = ({ expenses, onRefreshExpenses }: GoogleDriveIntegrationProps) => {
  const [sheetId, setSheetId] = useState<string | null>(localStorage.getItem('expenseSheetId'));
  const [sheetUrl, setSheetUrl] = useState<string | null>(localStorage.getItem('expenseSheetUrl'));
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('lastExpenseSync'));
  
  const {
    isLoading,
    isConnected,
    authenticate,
    createExpenseSheet,
    syncExpensesToSheet,
    syncFromSheet,
    disconnect
  } = useGoogleDrive();

  const handleConnect = async () => {
    try {
      await authenticate();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleCreateSheet = async () => {
    try {
      const result = await createExpenseSheet(expenses);
      if (result?.spreadsheetId) {
        setSheetId(result.spreadsheetId);
        setSheetUrl(result.url);
        localStorage.setItem('expenseSheetId', result.spreadsheetId);
        localStorage.setItem('expenseSheetUrl', result.url);
        updateLastSync();
      }
    } catch (error) {
      console.error('Failed to create sheet:', error);
    }
  };

  const handleSyncToSheet = async () => {
    if (!sheetId) return;
    
    try {
      await syncExpensesToSheet(expenses, sheetId);
      updateLastSync();
    } catch (error) {
      console.error('Failed to sync to sheet:', error);
    }
  };

  const handleSyncFromSheet = async () => {
    if (!sheetId) return;
    
    try {
      await syncFromSheet(sheetId);
      updateLastSync();
      onRefreshExpenses();
    } catch (error) {
      console.error('Failed to sync from sheet:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setSheetId(null);
    setSheetUrl(null);
    setLastSync(null);
    localStorage.removeItem('expenseSheetId');
    localStorage.removeItem('expenseSheetUrl');
    localStorage.removeItem('lastExpenseSync');
  };

  const updateLastSync = () => {
    const now = new Date().toLocaleString('es-ES');
    setLastSync(now);
    localStorage.setItem('lastExpenseSync', now);
  };

  const openSheet = () => {
    if (sheetUrl) {
      window.open(sheetUrl, '_blank');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudIcon className="h-5 w-5 text-primary" />
            <CardTitle>Integración Google Drive</CardTitle>
            {isConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Conectado
              </Badge>
            )}
          </div>
          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Sincroniza tus gastos con Google Sheets para trabajar con Excel
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Button 
            onClick={handleConnect} 
            disabled={isLoading}
            className="w-full"
          >
            <CloudIcon className="mr-2 h-4 w-4" />
            {isLoading ? 'Conectando...' : 'Conectar Google Drive'}
          </Button>
        ) : (
          <div className="space-y-3">
            {!sheetId ? (
              <Button 
                onClick={handleCreateSheet} 
                disabled={isLoading}
                className="w-full"
              >
                <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
                {isLoading ? 'Creando...' : 'Crear Excel de Gastos'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSyncToSheet}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                    {isLoading ? 'Sincronizando...' : 'Exportar a Excel'}
                  </Button>
                  
                  <Button 
                    onClick={handleSyncFromSheet}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                    {isLoading ? 'Importando...' : 'Importar de Excel'}
                  </Button>
                </div>
                
                <Button 
                  onClick={openSheet}
                  variant="secondary"
                  className="w-full"
                >
                  <ExternalLinkIcon className="mr-2 h-4 w-4" />
                  Abrir Excel en Drive
                </Button>
                
                {lastSync && (
                  <p className="text-sm text-muted-foreground text-center">
                    Última sincronización: {lastSync}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Los cambios en la app se pueden exportar al Excel</p>
          <p>• Los cambios en Excel se pueden importar a la app</p>
          <p>• El Excel se guarda en tu Google Drive personal</p>
        </div>
      </CardContent>
    </Card>
  );
};