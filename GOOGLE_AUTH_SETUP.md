# Habilitar el registro e inicio de sesión con Google en AVODAH

El frontend ya usa `supabase.auth.signInWithOAuth({ provider: 'google' })` y redirige de vuelta a la URL desde la que se inició el acceso. Los enlaces con `?invite=...` conservan la invitación al volver de Google.

Para que Google permita el acceso, una persona administradora del proyecto debe crear las credenciales OAuth y guardarlas **en Supabase**, no en este repositorio.

## 1. Crear las credenciales en Google Cloud

Abrir https://console.cloud.google.com/auth/overview y elegir un proyecto (o crear uno para AVODAH). Configurar Branding/Audience con el nombre AVODAH, email de soporte y los dominios que Google pida. Elegir **External** si van a registrarse personas con cuentas Google de distintas organizaciones; publicar la app o añadir usuarios de prueba si queda en modo Testing.

En Google Auth Platform → Clients, crear un cliente **OAuth Client ID → Web application**.

**Authorized JavaScript origins**:

```text
https://avodah-six.vercel.app
```

**Authorized redirect URIs** (callback de Supabase, NO la URL de Vercel):

```text
https://lzhdnrzurvphekrjfrfw.supabase.co/auth/v1/callback
```

Crear el cliente. Copiar su **Client ID** y su **Client Secret**; no compartirlos en chats, repositorios, capturas ni archivos.

Guía oficial: https://supabase.com/docs/guides/auth/social-login/auth-google

## 2. Habilitar Google en Supabase Auth

Abrir https://supabase.com/dashboard/project/lzhdnrzurvphekrjfrfw/auth/providers

Elegir **Google**, habilitar el proveedor y pegar el **Client ID** y **Client Secret** creados arriba. Guardar.

La clave `sb_publishable_...` del frontend **no** reemplaza estos datos.

## 3. Configurar redirecciones de la aplicación

Abrir https://supabase.com/dashboard/project/lzhdnrzurvphekrjfrfw/auth/url-configuration

Configurar:
- **Site URL:** `https://avodah-six.vercel.app`
- **Redirect URLs adicionales:** `https://avodah-six.vercel.app/**`

Si utilizás dominios distintos de Preview más adelante, agregarlos por separado según la política de URL permitidas de Supabase.

Guía: https://supabase.com/docs/guides/auth/redirect-urls

## 4. Verificación

1. Abrir https://avodah-six.vercel.app en una ventana privada.
2. Pulsar **Continuar con Google**.
3. Elegir una cuenta Google autorizada. Confirmar que vuelve a AVODAH con sesión activa.
4. Si no pertenece a un workspace, AVODAH muestra la pantalla para crear uno o unirse con código.
5. Si se usa `https://avodah-six.vercel.app/?invite=CODIGO_VALIDO`, comprobar que al volver de Google se procesa la invitación y se entra al workspace.

**Si el botón falla antes de completar los tres ajustes**, eso indica que falta configurar OAuth: el cambio de código no habilita automáticamente el proveedor en Google Cloud/Supabase.
