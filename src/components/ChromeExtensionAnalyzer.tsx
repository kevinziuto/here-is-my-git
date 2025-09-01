import React, { useState } from 'react';
import { Upload, File, FolderOpen, Download, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import JSZip from 'jszip';

interface ExtensionFile {
  name: string;
  size: number;
  content: string | ArrayBuffer;
  isText: boolean;
}

interface ManifestData {
  name?: string;
  version?: string;
  description?: string;
  manifest_version?: number;
  permissions?: string[];
  content_scripts?: any[];
  background?: any;
  action?: any;
  browser_action?: any;
  icons?: { [key: string]: string };
}

const ChromeExtensionAnalyzer = () => {
  const [files, setFiles] = useState<ExtensionFile[]>([]);
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [selectedFile, setSelectedFile] = useState<ExtensionFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.crx') && !file.name.endsWith('.zip')) {
      toast({
        title: "Archivo no válido",
        description: "Por favor selecciona un archivo .crx o .zip",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      let zipData: ArrayBuffer;

      if (file.name.endsWith('.crx')) {
        // Los archivos .crx tienen un header que debemos saltar
        // Los primeros 16 bytes son header + signature
        const view = new Uint8Array(arrayBuffer);
        const headerSize = 16;
        const publicKeyLength = view[12] | (view[13] << 8) | (view[14] << 16) | (view[15] << 24);
        const signatureLength = view[16] | (view[17] << 8) | (view[18] << 16) | (view[19] << 24);
        const zipStartOffset = headerSize + publicKeyLength + signatureLength;
        zipData = arrayBuffer.slice(zipStartOffset);
      } else {
        zipData = arrayBuffer;
      }

      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipData);
      
      const extractedFiles: ExtensionFile[] = [];
      let manifestData: ManifestData | null = null;

      for (const [fileName, zipEntry] of Object.entries(loadedZip.files)) {
        if (!zipEntry.dir) {
          const isText = /\.(json|js|html|css|txt|md)$/i.test(fileName);
          const content = isText 
            ? await zipEntry.async('text')
            : await zipEntry.async('arraybuffer');

          extractedFiles.push({
            name: fileName,
            size: (content as string).length || (content as ArrayBuffer).byteLength || 0,
            content,
            isText
          });

          // Procesar manifest.json
          if (fileName === 'manifest.json' && isText) {
            try {
              manifestData = JSON.parse(content as string);
            } catch (error) {
              console.error('Error parsing manifest.json:', error);
            }
          }
        }
      }

      setFiles(extractedFiles);
      setManifest(manifestData);
      setSelectedFile(null);
      
      toast({
        title: "¡Extensión extraída!",
        description: `Se encontraron ${extractedFiles.length} archivos`
      });

    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo. Asegúrate de que sea una extensión válida.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (file: ExtensionFile) => {
    const blob = new Blob([file.content], { 
      type: file.isText ? 'text/plain' : 'application/octet-stream' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Analizador de Extensiones Chrome</h1>
          <p className="text-muted-foreground">Descomprime y analiza extensiones de Google Chrome (.crx)</p>
        </div>

        {/* Upload Area */}
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-primary mb-4" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Sube tu extensión de Chrome</p>
              <p className="text-sm text-muted-foreground">Archivos .crx o .zip</p>
            </div>
            <input
              type="file"
              accept=".crx,.zip"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              id="file-upload"
            />
            <Button 
              asChild 
              className="mt-4"
              disabled={isProcessing}
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                {isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
              </label>
            </Button>
          </CardContent>
        </Card>

        {manifest && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extension Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Información de la Extensión
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-foreground">{manifest.name}</p>
                  <p className="text-sm text-muted-foreground">{manifest.description}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">v{manifest.version}</Badge>
                  <Badge variant="outline">Manifest v{manifest.manifest_version}</Badge>
                </div>
                {manifest.permissions && manifest.permissions.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Permisos:</p>
                    <div className="flex flex-wrap gap-1">
                      {manifest.permissions.map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Archivos ({files.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                        onClick={() => setSelectedFile(file)}
                      >
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* File Viewer */}
        {selectedFile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Contenido: {selectedFile.name}</span>
                <Button 
                  size="sm" 
                  onClick={() => downloadFile(selectedFile)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFile.isText ? (
                <ScrollArea className="h-96">
                  <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
                    <code>{selectedFile.content as string}</code>
                  </pre>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <File className="h-12 w-12 mx-auto mb-2" />
                  <p>Archivo binario - {formatFileSize(selectedFile.size)}</p>
                  <p className="text-sm">Haz clic en "Descargar" para ver el contenido</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChromeExtensionAnalyzer;