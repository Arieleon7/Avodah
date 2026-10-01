# AVODAH

Workspace colaborativo para equipos de radio, streaming, podcasts y producción de contenidos.

**Stack:** Next.js App Router, Supabase (Auth, PostgreSQL, Realtime y Storage privado), Vercel y Jitsi.

## Despliegue

1. Importar este repositorio en Vercel con preset **Next.js** y directorio raíz `./`.
2. Agregar las variables indicadas en `.env.example` para Production y Preview.
3. Desplegar. Cada nuevo commit en `main` actualizará producción.

**Importante:** no subir `.env.local`, claves `service_role` ni contraseñas. La clave `sb_publishable_` es pública y Supabase protege los datos mediante políticas RLS.

La base Supabase AVODAH ya existe y está provisionada por separado. Consulta `DEPLOY_VERCEL.md` para los detalles.
