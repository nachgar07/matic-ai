# Configuración de RevenueCat para Suscripciones

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:

1. **Cuenta de RevenueCat** - Registrate gratis en [app.revenuecat.com](https://app.revenuecat.com)
2. **Google Play Console** (para Android) - Para crear productos de suscripción
3. **Apple Developer Account** (para iOS, opcional) - Si quieres publicar en App Store

---

## 🔧 Paso 1: Configuración en RevenueCat

### 1.1 Crear un Proyecto
1. Ve a [RevenueCat Dashboard](https://app.revenuecat.com)
2. Crea un nuevo proyecto
3. Dale un nombre (ej: "Nourish Aim Sync")

### 1.2 Obtener API Keys
1. En el dashboard, ve a **Settings** → **API Keys**
2. Copia tu **Public App-specific API Key** para Android
3. Si tienes iOS, copia también la key de iOS
4. Guarda estas keys, las necesitarás después

---

## 📱 Paso 2: Configuración en Google Play Console

### 2.1 Crear Productos de Suscripción
1. Ve a [Google Play Console](https://play.google.com/console)
2. Selecciona tu app (o créala si no existe)
3. Ve a **Monetización** → **Productos** → **Suscripciones**
4. Haz clic en **Crear suscripción**
5. Configura:
   - **ID del producto**: Ej: `premium_monthly`, `premium_yearly`
   - **Nombre**: Nombre visible para los usuarios
   - **Descripción**: Describe los beneficios
   - **Precio**: Establece el precio de la suscripción
   - **Período de facturación**: Mensual, anual, etc.
   - **Período de prueba** (opcional): 7 días, 14 días, etc.

### 2.2 Vincular con RevenueCat
1. En Google Play Console, ve a **Configuración** → **Acceso a la API**
2. Crea una cuenta de servicio nueva o usa una existente
3. Descarga el archivo JSON de credenciales
4. En RevenueCat Dashboard:
   - Ve a tu proyecto → **Google Play**
   - Sube el archivo JSON de credenciales
   - RevenueCat ahora puede validar compras de Google Play

---

## 🍎 Paso 3: Configuración en Apple (Opcional, solo iOS)

### 3.1 Crear Productos de Suscripción
1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. Selecciona tu app
3. Ve a **Suscripciones**
4. Crea grupos de suscripción y productos
5. Configura precios y períodos de prueba

### 3.2 Vincular con RevenueCat
1. En App Store Connect, genera un **App-Specific Shared Secret**
2. En RevenueCat Dashboard:
   - Ve a tu proyecto → **App Store**
   - Ingresa tu Shared Secret
   - Vincula tu App Bundle ID

---

## 🔑 Paso 4: Actualizar el Código de la App

### 4.1 Agregar API Keys en el Código

Abre el archivo `src/hooks/useSubscription.ts` y reemplaza las siguientes líneas:

```typescript
// Líneas 75-77 aproximadamente
await Purchases.configure({
  apiKey: Capacitor.getPlatform() === 'android' 
    ? 'TU_API_KEY_DE_ANDROID_AQUI'  // ← Reemplaza con tu key de Android
    : 'TU_API_KEY_DE_IOS_AQUI',     // ← Reemplaza con tu key de iOS
  appUserID: user.id,
});
```

**Ejemplo:**
```typescript
await Purchases.configure({
  apiKey: Capacitor.getPlatform() === 'android' 
    ? 'goog_AbCdEfGhIjKlMnOpQrStUvWx'  // Tu key real
    : 'appl_YzXwVuTsRqPoNmLkJiHgFe',   // Tu key real
  appUserID: user.id,
});
```

---

## 🔗 Paso 5: Configurar Webhook en RevenueCat

Los webhooks permiten que RevenueCat notifique a Supabase cuando hay cambios en las suscripciones.

### 5.1 Obtener URL del Webhook

Tu Edge Function de webhook está disponible en:
```
https://rdzfizthbykgfqfgftpv.supabase.co/functions/v1/revenuecat-webhook
```

### 5.2 Configurar en RevenueCat

1. En RevenueCat Dashboard, ve a **Integrations**
2. Busca "Webhooks" y haz clic en **+ Add**
3. Ingresa la URL del webhook:
   ```
   https://rdzfizthbykgfqfgftpv.supabase.co/functions/v1/revenuecat-webhook
   ```
4. Selecciona los eventos que quieres recibir:
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Cancellation
   - ✅ Expiration
   - ✅ Billing Issue
   - ✅ Product Change
5. Guarda la configuración

---

## 🧪 Paso 6: Probar las Suscripciones

### 6.1 Configurar Usuarios de Prueba

**Google Play:**
1. Ve a Google Play Console → **Configuración** → **Acceso de licencia y prueba**
2. Agrega correos electrónicos de usuarios de prueba
3. Estos usuarios podrán hacer compras de prueba sin cargos

**Apple:**
1. Ve a App Store Connect → **Usuarios y acceso** → **Testers de Sandbox**
2. Crea usuarios de prueba
3. Usa estos usuarios en tu dispositivo de prueba

### 6.2 Probar el Flujo Completo

1. Sincroniza tu proyecto:
   ```bash
   git pull
   npx cap sync
   ```

2. Ejecuta la app en un dispositivo:
   ```bash
   npx cap run android
   # o
   npx cap run ios
   ```

3. Navega a `/subscriptions` en la app
4. Intenta comprar una suscripción con tu usuario de prueba
5. Verifica en RevenueCat Dashboard que la compra se registró
6. Verifica en Supabase que la tabla `user_subscriptions` se actualizó

---

## 📊 Paso 7: Monitoreo

### Ver Estado de Suscripciones en Supabase

Puedes consultar la tabla `user_subscriptions` directamente:

```sql
SELECT * FROM user_subscriptions 
WHERE user_id = 'UUID_DEL_USUARIO';
```

### Dashboard de RevenueCat

En el dashboard de RevenueCat puedes ver:
- Suscripciones activas
- Ingresos totales
- Tasa de renovación
- Cancelaciones
- Y mucho más

---

## ⚠️ Notas Importantes

1. **Modo de Prueba**: Las compras de prueba NO generan cargos reales
2. **Webhooks**: Los webhooks pueden tardar unos segundos en procesarse
3. **Sincronización**: Usa el botón "Restaurar compras" si el estado no se sincroniza
4. **Producción**: Antes de publicar, asegúrate de:
   - Tener todos los productos de suscripción creados
   - Configurar correctamente los webhooks
   - Probar con usuarios de prueba en ambas plataformas
   - Revisar políticas de cancelación y términos de servicio

---

## 🆘 Solución de Problemas

### "No se cargaron los planes"
- Verifica que los productos existan en Google Play Console
- Asegúrate de que el servicio de Google Play esté vinculado en RevenueCat
- Espera unos minutos, a veces tarda en sincronizar

### "Error al comprar"
- Verifica que el usuario sea un usuario de prueba
- Revisa los logs en la consola del navegador/dispositivo
- Verifica que las API keys sean correctas

### "El webhook no actualiza Supabase"
- Verifica que la URL del webhook sea correcta
- Revisa los logs del Edge Function en Supabase
- Verifica que el usuario exista en la tabla `profiles`

---

## 📚 Recursos Adicionales

- [Documentación de RevenueCat](https://docs.revenuecat.com/)
- [Guía de Google Play Billing](https://developer.android.com/google/play/billing)
- [Guía de App Store Subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

¡Listo! Ahora tu app tiene un sistema completo de suscripciones con RevenueCat. 🎉
