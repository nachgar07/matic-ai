import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const TermsAndConditions = () => {
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
          <h1 className="text-2xl font-bold">Términos y Condiciones de Uso</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-8">Fecha de vigencia: 26 de agosto de 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. ACEPTACIÓN DE TÉRMINOS</h2>
            <p>Al descargar, instalar o usar esta aplicación, usted acepta estos términos y la Política de Privacidad. Si no está de acuerdo, no utilice la aplicación.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. DESCRIPCIÓN DEL SERVICIO</h2>
            <p>La aplicación ofrece herramientas de seguimiento personal para:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Registro fotográfico y seguimiento de alimentación y calorías</li>
              <li>Gestión de gastos personales mediante escaneo de tickets</li>
              <li>Organización de tareas y hábitos</li>
              <li>Asistencia mediante inteligencia artificial nutricional</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. REGISTRO Y CUENTA DE USUARIO</h2>
            
            <h3 className="text-lg font-medium mb-3">3.1 Requisitos</h3>
            <ul className="list-disc ml-6 mb-4">
              <li>Debe proporcionar información veraz y actualizada</li>
              <li>Es responsable de mantener la confidencialidad de sus credenciales</li>
              <li>Debe notificar inmediatamente cualquier uso no autorizado</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">3.2 Suspensión</h3>
            <p>Nos reservamos el derecho de suspender cuentas por:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Uso fraudulento o abusivo</li>
              <li>Violación de estos términos</li>
              <li>Actividad que comprometa la seguridad del sistema</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. USO ACEPTABLE</h2>
            
            <h3 className="text-lg font-medium mb-3">4.1 Usos permitidos</h3>
            <ul className="list-disc ml-6 mb-4">
              <li>Uso personal y no comercial</li>
              <li>Seguimiento de información personal propia</li>
              <li>Interacción normal con las funciones de la aplicación</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">4.2 Usos prohibidos</h3>
            <ul className="list-disc ml-6">
              <li>Intentar acceder a cuentas de otros usuarios</li>
              <li>Realizar ingeniería inversa de la aplicación</li>
              <li>Sobrecargar o interferir con los servicios</li>
              <li>Cargar contenido ofensivo, ilegal o que infrinja derechos de terceros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. FUNCIONALIDAD DE INTELIGENCIA ARTIFICIAL</h2>
            
            <h3 className="text-lg font-medium mb-3">5.1 Naturaleza del servicio</h3>
            <ul className="list-disc ml-6 mb-4">
              <li>Proporciona información general y sugerencias automatizadas</li>
              <li>Se basa en algoritmos y no en criterio profesional humano</li>
              <li>Las respuestas son generadas automáticamente</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">5.2 Limitaciones importantes</h3>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg mb-4">
              <p className="font-semibold text-amber-800 dark:text-amber-200">NO ES ASESORAMIENTO PROFESIONAL:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>No sustituye consulta médica, nutricional o financiera profesional</li>
                <li>No considera condiciones médicas específicas, alergias o intolerancias</li>
                <li>No debe usarse para diagnósticos o tratamientos médicos</li>
              </ul>
            </div>

            <h3 className="text-lg font-medium mb-3">5.3 Responsabilidad del usuario</h3>
            <ul className="list-disc ml-6">
              <li>Las decisiones basadas en sugerencias de IA son bajo su propio riesgo</li>
              <li>Debe consultar profesionales ante dudas sobre salud o nutrición</li>
              <li>Es responsable de verificar la idoneidad de las recomendaciones</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. PROPIEDAD INTELECTUAL</h2>
            <ul className="list-disc ml-6">
              <li>Todos los derechos sobre la aplicación nos pertenecen</li>
              <li>Se le otorga una licencia limitada, no exclusiva y revocable</li>
              <li>No puede copiar, modificar o distribuir el código de la aplicación</li>
              <li>Sus datos personales le pertenecen</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. DISPONIBILIDAD DEL SERVICIO</h2>
            
            <h3 className="text-lg font-medium mb-3">7.1 Disponibilidad</h3>
            <ul className="list-disc ml-6 mb-4">
              <li>Nos esforzamos por mantener disponibilidad 24/7</li>
              <li>Pueden ocurrir interrupciones por mantenimiento o fallas técnicas</li>
              <li>No garantizamos disponibilidad continua e ininterrumpida</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">7.2 Actualizaciones</h3>
            <ul className="list-disc ml-6">
              <li>Podemos actualizar la aplicación periódicamente</li>
              <li>Algunas actualizaciones pueden ser obligatorias</li>
              <li>Funcionalidades pueden modificarse o discontinuarse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. LIMITACIÓN DE RESPONSABILIDAD</h2>
            
            <h3 className="text-lg font-medium mb-3">8.1 Exclusión de garantías</h3>
            <p>La aplicación se proporciona "como está" sin garantías explícitas o implícitas sobre:</p>
            <ul className="list-disc ml-6 mt-2 mb-4">
              <li>Funcionamiento sin errores</li>
              <li>Disponibilidad continua</li>
              <li>Precisión de estimaciones calóricas o sugerencias</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">8.2 Limitación de daños</h3>
            <p>En ningún caso seremos responsables por:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Daños directos, indirectos, incidentales o consecuenciales</li>
              <li>Pérdida de datos o información</li>
              <li>Problemas de salud derivados del uso de la aplicación</li>
              <li>Decisiones tomadas basándose en información de la IA</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. INDEMNIZACIÓN</h2>
            <p>Usted acepta indemnizarnos contra reclamos de terceros derivados de:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Su uso indebido de la aplicación</li>
              <li>Violación de estos términos</li>
              <li>Infracción de derechos de terceros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. TERMINACIÓN</h2>
            
            <h3 className="text-lg font-medium mb-3">10.1 Terminación por el usuario</h3>
            <ul className="list-disc ml-6 mb-4">
              <li>Puede eliminar su cuenta en cualquier momento</li>
              <li>La eliminación resulta en pérdida permanente de datos</li>
              <li>Algunos datos técnicos anónimos pueden conservarse</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">10.2 Terminación por nuestra parte</h3>
            <ul className="list-disc ml-6">
              <li>Podemos suspender o terminar cuentas por violación de términos</li>
              <li>En caso de terminación del servicio, se proporcionará aviso previo razonable</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. LEGISLACIÓN APLICABLE</h2>
            <p>Estos términos se rigen por las leyes de la República Argentina. Las disputas se resolverán en los tribunales de Argentina.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. DIVISIBILIDAD</h2>
            <p>Si alguna disposición es declarada inválida, las demás continúan en vigor.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. MODIFICACIONES</h2>
            <p>Podemos modificar estos términos ocasionalmente. Los cambios sustanciales requieren nueva aceptación. El uso continuado después de modificaciones menores constituye aceptación.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">14. CONTACTO</h2>
            <p>Para consultas sobre estos términos:</p>
            <p className="mt-2">Email: cal.maticai@gmail.com</p>
          </section>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg mt-8">
            <p className="text-center font-medium">
              Al continuar usando la aplicación, confirma que ha leído, comprendido y acepta estos términos y condiciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};