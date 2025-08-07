import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FoodPhotoCaptureProps {
  onAnalysisComplete: (analysis: any) => void;
  onClose: () => void;
}

export const FoodPhotoCapture = ({ onAnalysisComplete, onClose }: FoodPhotoCaptureProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });
      
      streamRef.current = stream;
      setIsCameraOpen(true);
      
      // Wait a bit for state to update, then set video source
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara. Por favor, permite el acceso o usa la opción de subir archivo.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Archivo inválido",
        description: "Por favor selecciona una imagen.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    
    try {
      // Convert image to base64 without the data URL prefix
      const base64Image = capturedImage.split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('openai-food-assistant', {
        body: {
          action: 'analyze-food',
          image: base64Image
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error en el servicio de análisis');
      }

      if (!data || !data.foods || data.foods.length === 0) {
        throw new Error('No se pudieron identificar alimentos en la imagen. Intenta con una imagen más clara.');
      }

      toast({
        title: "Análisis completado",
        description: `Se identificaron ${data.foods.length} ingrediente(s) en la imagen.`
      });

      onAnalysisComplete({
        ...data,
        originalImage: capturedImage
      });

    } catch (error: any) {
      console.error('Error analyzing food image:', error);
      
      let errorMessage = "No se pudo analizar la imagen. El servicio puede estar temporalmente sobrecargado.";
      
      if (error.message && error.message.includes('sobrecargado')) {
        errorMessage = error.message;
        // Reintentar automáticamente después de 5 segundos
        toast({
          title: "Servicio temporalmente no disponible",
          description: errorMessage + " Reintentando en 5 segundos...",
          variant: "destructive",
        });
        
        setTimeout(() => {
          if (capturedImage) {
            analyzeImage();
          }
        }, 5000);
        return;
      }
      
      toast({
        title: "Error en el análisis",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {isCameraOpen && !capturedImage ? (
        // Full screen camera view
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="absolute top-4 right-4 bg-black/20 text-white hover:bg-black/40"
            disabled={isAnalyzing}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Capture button */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-20 h-20 rounded-full bg-white text-black hover:bg-gray-200"
              disabled={isAnalyzing}
            >
              <Camera className="h-8 w-8" />
            </Button>
          </div>
        </div>
      ) : (
        // Modal view for setup and captured image
        <div className="flex items-center justify-center w-full h-full p-4">
          <Card className="w-full max-w-lg bg-background">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Analizar Comida</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  disabled={isAnalyzing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!capturedImage ? (
                <div className="space-y-4">
                  {/* Camera preview placeholder */}
                  <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2">
                    <Button
                      onClick={startCamera}
                      variant="outline"
                      className="flex-1"
                      disabled={isAnalyzing}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Abrir Cámara
                    </Button>
                    
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="flex-1"
                      disabled={isAnalyzing}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Foto
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview of captured image */}
                  <div className="relative bg-muted rounded-lg overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Foto capturada"
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  </div>

                  {/* Analysis controls */}
                  <div className="flex gap-2">
                    <Button
                      onClick={resetCapture}
                      variant="outline"
                      className="flex-1"
                      disabled={isAnalyzing}
                    >
                      Tomar Otra
                    </Button>
                    
                    <Button
                      onClick={analyzeImage}
                      className="flex-1"
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analizando...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Analizar Comida
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Analizando comida e identificando ingredientes...
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};