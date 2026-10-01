# AVODAH → Vercel

- **Frontend**: Next.js App Router en Vercel
- **Backend**: Supabase AVODAH (Auth, PostgreSQL, RLS, Realtime, Storage)
- **Reuniones**: Jitsi

Importar `Arieleon7/Avodah` desde [Vercel](https://vercel.com/new), seleccionar framework Next.js y root `./`.

Agregar en Production, Preview y Development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Copiar valores desde `.env.example`. Nunca exponer una clave privada de Supabase.

En Supabase Auth → URL Configuration, agregar la URL de producción de Vercel a las URL permitidas de redirección para confirmar emails y recuperar sesiones. Configurar el dominio propio cuando esté disponible.
