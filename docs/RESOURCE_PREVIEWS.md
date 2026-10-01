# Vista previa de recursos (AVODAH)
- Backend: POST /api/resource-preview. Solo usuarios autenticados con JWT Supabase, HTTPS público, DNS público validado y conexión IP fijada con TLS para reducir riesgo de SSRF. Se siguen hasta 3 redirecciones seguras; máximo 360 KB y tiempo limitado.
- YouTube y Spotify: oEmbed público para título, artista/canal y miniatura. Si bloquean acceso, se conserva miniatura derivable de YouTube o tarjeta con proveedor.
- Artículos: lectura básica de metadatos Open Graph, Twitter Card y <title>. No se requiere una API privada de terceros.
- PDF/Google Docs y enlaces sin metadatos accesibles: tarjeta tipográfica con nombre de la fuente y apertura externa. Algunos sitios no permiten previews automáticas.
- Solo se almacenan metadatos públicos en \`library_items\`; nunca se guardan tokens de acceso, texto privado, cuerpos HTML ni secretos.
- El servidor no precarga imágenes; el cliente carga solo las miniaturas visibles (lazy-loading), sin referrer. La ficha rápida solo incrusta YouTube (youtube-nocookie.com) y Spotify (open.spotify.com).
- Archivos locales de almacenamiento privado son una mejora posterior: jamás publicar un enlace firmado permanente como portada.
- El control de acceso a recursos persiste mediante las políticas RLS existentes del workspace.
