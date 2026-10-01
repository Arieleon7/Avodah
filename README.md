# AVODAH

Workspace colaborativo para radio, streaming, podcasts y producción de contenidos.

**Stack:** Next.js (App Router), Supabase Auth/Postgres/Realtime/Storage y Vercel.

El código de la aplicación y la configuración de despliegue deben mantenerse en este repositorio. Nunca subir claves `service_role` ni archivos `.env.local`.

Para configurar el despliegue en Vercel, importar este repositorio como un proyecto Next.js y definir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
