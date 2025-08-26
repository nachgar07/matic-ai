import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Política de Privacidad</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-8">Fecha de vigencia: 26 de agosto de 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. INFORMACIÓN QUE RECOPILAMOS</h2>
            
            <h3 className="text-lg font-medium mb-3">1.1 Información de cuenta</h3>
            <ul className="list-disc ml-6 mb-4">
              <li>Dirección de correo electrónico</li>
              <li>Datos de autenticación de terceros (Google)</li>
              <li>Configuración de perfil personal</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">1.2 Datos de uso de la aplicación</h3>
            <ul className="list-disc ml-6 mb-4">
              <li>Fotografías de alimentos y tickets (procesadas localmente)</li>
              <li>Registro de comidas y estimaciones calóricas</li>
              <li>Datos de gastos e ingresos</li>
              <li>Tareas y hábitos personales</li>
              <li>Configuración de objetivos (peso, altura)</li>
              <li>Interacciones con el asistente de IA</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">1.3 Información técnica</h3>
            <ul className="list-disc ml-6">
              <li>Identificadores del dispositivo (con fines de seguridad)</li>
              <li>Datos de rendimiento de la aplicación</li>
              <li>Registros de errores y fallos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. CÓMO UTILIZAMOS SU INFORMACIÓN</h2>
            <ul className="list-disc ml-6">
              <li>Proporcionar funcionalidad de seguimiento personal</li>
              <li>Procesar imágenes para estimación de calorías y gastos</li>
              <li>Generar respuestas del asistente de IA nutricional</li>
              <li>Mantener la seguridad de su cuenta</li>
              <li>Mejorar el rendimiento de la aplicación</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. BASE LEGAL PARA EL PROCESAMIENTO</h2>
            <p>Procesamos sus datos basándose en:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Su consentimiento explícito</li>
              <li>Ejecución del servicio contratado</li>
              <li>Interés legítimo en mejorar la aplicación</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. COMPARTICIÓN DE DATOS</h2>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg mb-4">
              <p className="font-semibold text-green-800 dark:text-green-200">NO VENDEMOS NI COMPARTIMOS SUS DATOS PERSONALES.</p>
            </div>
            <p>Únicamente se comparten datos con:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Proveedores de servicios de autenticación (Google)</li>
              <li>Servicios de hosting necesarios para el funcionamiento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. ALMACENAMIENTO Y SEGURIDAD</h2>
            <ul className="list-disc ml-6">
              <li>Los datos se almacenan con cifrado</li>
              <li>Implementamos medidas de seguridad técnicas y organizativas</li>
              <li>Las fotografías se procesan localmente cuando es posible</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. SUS DERECHOS</h2>
            <p>Tiene derecho a:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Acceder a sus datos personales</li>
              <li>Rectificar información incorrecta</li>
              <li>Eliminar su cuenta y todos los datos asociados</li>
              <li>Portabilidad de datos</li>
              <li>Retirar el consentimiento en cualquier momento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. RETENCIÓN DE DATOS</h2>
            <ul className="list-disc ml-6">
              <li>Los datos se conservan mientras mantenga su cuenta activa</li>
              <li>Tras eliminación de cuenta: datos borrados en 30 días</li>
              <li>Datos técnicos anónimos pueden conservarse para mejoras</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. TRANSFERENCIAS INTERNACIONALES</h2>
            <p>Si utiliza servicios de terceros, sus datos pueden procesarse fuera de Argentina bajo las garantías de protección correspondientes.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. MENORES DE EDAD</h2>
            <p>La aplicación no está dirigida a menores de 13 años. No recopilamos intencionalmente datos de menores.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. CONTACTO</h2>
            <p>Para ejercer sus derechos o resolver dudas:</p>
            <p className="mt-2">Email: cal.maticai@gmail.com</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. CAMBIOS EN ESTA POLÍTICA</h2>
            <p>Las actualizaciones se notificarán a través de la aplicación. El uso continuado constituye aceptación de los cambios.</p>
          </section>
        </div>
      </div>
    </div>
  );
};