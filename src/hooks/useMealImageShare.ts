import { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface MealShareData {
  plateName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  plateImage?: string;
}

export const useMealImageShare = () => {
  const { toast } = useToast();

  const generateShareableImage = useCallback(async (mealData: MealShareData): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }

      // Configurar tamaño del canvas
      canvas.width = 800;
      canvas.height = 800;

      // Fondo gradiente
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Si hay imagen del plato, cargarla
      if (mealData.plateImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Calcular dimensiones para centrar la imagen
            const maxSize = 300;
            let { width, height } = img;
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }

            const x = (canvas.width - width) / 2;
            const y = 100;

            // Dibujar la imagen
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, 20);
            ctx.clip();
            ctx.drawImage(img, x, y, width, height);
            ctx.restore();

            // Sombra sutil para la imagen
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, 20);
            ctx.stroke();
            ctx.shadowColor = 'transparent';

            finishDrawing();
          } catch (error) {
            console.error('Error loading meal image:', error);
            finishDrawing();
          }
        };
        
        img.onerror = () => {
          console.warn('Could not load meal image, continuing without it');
          finishDrawing();
        };
        
        img.src = mealData.plateImage;
      } else {
        finishDrawing();
      }

      function finishDrawing() {
        // Título del plato
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        const titleY = mealData.plateImage ? 450 : 200;
        ctx.fillText(mealData.plateName, canvas.width / 2, titleY);

        // Calorías principales
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${Math.round(mealData.calories)} cal`, canvas.width / 2, titleY + 80);

        // Macronutrientes
        const macroY = titleY + 150;
        ctx.font = '32px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#64748b';
        
        const macroSpacing = 180;
        const startX = (canvas.width - (macroSpacing * 2)) / 2;
        
        // Proteína
        ctx.textAlign = 'center';
        ctx.fillText('Proteína', startX, macroY);
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${Math.round(mealData.protein * 10) / 10}g`, startX, macroY + 45);

        // Carbohidratos
        ctx.fillStyle = '#64748b';
        ctx.font = '32px system-ui, -apple-system, sans-serif';
        ctx.fillText('Carbos', startX + macroSpacing, macroY);
        ctx.fillStyle = '#ea580c';
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${Math.round(mealData.carbs * 10) / 10}g`, startX + macroSpacing, macroY + 45);

        // Grasas
        ctx.fillStyle = '#64748b';
        ctx.font = '32px system-ui, -apple-system, sans-serif';
        ctx.fillText('Grasas', startX + (macroSpacing * 2), macroY);
        ctx.fillStyle = '#7c3aed';
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${Math.round(mealData.fat * 10) / 10}g`, startX + (macroSpacing * 2), macroY + 45);

        // Marca "Matic AI" en la esquina inferior derecha
        ctx.fillStyle = '#94a3b8';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Matic AI', canvas.width - 40, canvas.height - 40);

        // Convertir a imagen
        resolve(canvas.toDataURL('image/png', 0.9));
      }
    });
  }, []);

  const shareMealImage = useCallback(async (mealData: MealShareData) => {
    try {
      toast({
        title: "Generando imagen...",
        description: "Creando tu imagen para compartir"
      });

      const imageDataUrl = await generateShareableImage(mealData);
      
      // Convertir dataURL a blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Usar Web Share API si está disponible
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${mealData.plateName}-matic-ai.png`, {
          type: 'image/png'
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${mealData.plateName} - Matic AI`,
            text: `¡Mira mi comida registrada con Matic AI! 🍽️ ${Math.round(mealData.calories)} calorías`,
            files: [file]
          });
          
          toast({
            title: "¡Compartido!",
            description: "Tu comida se compartió exitosamente"
          });
          return;
        }
      }

      // Fallback: descargar la imagen
      const link = document.createElement('a');
      link.download = `${mealData.plateName}-matic-ai.png`;
      link.href = imageDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "¡Imagen descargada!",
        description: "La imagen se guardó en tu dispositivo"
      });

    } catch (error) {
      console.error('Error sharing meal image:', error);
      toast({
        title: "Error",
        description: "No se pudo generar la imagen para compartir",
        variant: "destructive"
      });
    }
  }, [generateShareableImage, toast]);

  return { shareMealImage };
};