import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface ExtensionData {
  manifest: any;
  files: Array<{
    name: string;
    content: string | ArrayBuffer;
    isText: boolean;
  }>;
}

const ExtensionRunner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [extensionData, setExtensionData] = useState<ExtensionData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [extensionUrl, setExtensionUrl] = useState<string>('');

  useEffect(() => {
    const data = location.state?.extensionData;
    if (!data) {
      navigate('/');
      return;
    }
    setExtensionData(data);
  }, [location.state, navigate]);

  const runExtension = async () => {
    if (!extensionData) return;

    setIsRunning(true);
    
    try {
      // Crear un objeto URL para los archivos de la extensión
      const htmlFile = extensionData.files.find(file => 
        file.name.endsWith('.html') && file.isText
      );

      if (htmlFile) {
        // Crear un blob con el contenido HTML
        const blob = new Blob([htmlFile.content as string], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setExtensionUrl(url);
        
        toast({
          title: "¡Extensión cargada!",
          description: "La extensión se está ejecutando en el iframe"
        });
      } else {
        // Si no hay archivo HTML, mostrar información del manifest
        const manifestContent = JSON.stringify(extensionData.manifest, null, 2);
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${extensionData.manifest.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                background: #f5f5f5;
              }
              .manifest { 
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              pre { 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 4px; 
                overflow-x: auto;
              }
            </style>
          </head>
          <body>
            <div class="manifest">
              <h1>${extensionData.manifest.name}</h1>
              <p>${extensionData.manifest.description}</p>
              <h2>Manifest.json</h2>
              <pre>${manifestContent}</pre>
            </div>
          </body>
          </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setExtensionUrl(url);
        
        toast({
          title: "Mostrando información",
          description: "No se encontró archivo HTML principal, mostrando manifest"
        });
      }
    } catch (error) {
      console.error('Error running extension:', error);
      toast({
        title: "Error",
        description: "No se pudo ejecutar la extensión",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const refreshExtension = () => {
    if (extensionUrl) {
      URL.revokeObjectURL(extensionUrl);
    }
    runExtension();
  };

  if (!extensionData) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Analizador
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Ejecutar Extensión</h1>
              <p className="text-muted-foreground">{extensionData.manifest.name}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {extensionUrl && (
              <Button
                variant="outline"
                onClick={refreshExtension}
                disabled={isRunning}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recargar
              </Button>
            )}
            <Button
              onClick={runExtension}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Ejecutando...' : 'Ejecutar'}
            </Button>
          </div>
        </div>

        {/* Extension Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Extensión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium text-foreground">{extensionData.manifest.name}</p>
                <p className="text-sm text-muted-foreground">{extensionData.manifest.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">v{extensionData.manifest.version}</Badge>
                <Badge variant="outline">Manifest v{extensionData.manifest.manifest_version}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {extensionData.files.length} archivos extraídos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Limitaciones de Ejecución
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Esta es una simulación limitada. Las extensiones de Chrome requieren APIs específicas del navegador que no están disponibles en este entorno web.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Extension Runner */}
        {extensionUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Vista de la Extensión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-96 border rounded-lg overflow-hidden">
                <iframe
                  src={extensionUrl}
                  className="w-full h-full"
                  title="Extension Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExtensionRunner;