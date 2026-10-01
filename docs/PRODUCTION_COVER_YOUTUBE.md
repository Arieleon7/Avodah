# Portadas de producciones y enlace de YouTube en AVODAH

En **Producciones → Nueva producción**, se puede elegir una portada horizontal (preferentemente 16:9) y añadir el enlace de la transmisión de YouTube. También se pueden cambiar ambos datos después de crear el programa.

- Portada: JPG, PNG o WebP hasta 8 MB. La imagen se guarda en el depósito privado existente `avodah-files` bajo el prefijo del espacio de trabajo. Cada persona del equipo la ve a través de una URL firmada y temporal. Las portadas anteriores se eliminan al reemplazar la imagen, y también cuando se quita o se borra la producción.
- El enlace de YouTube admite el enlace de un video programado o transmitido (`youtube.com/watch?v=...`, `youtube.com/live/...` o `youtu.be/...`) y la dirección `/live` de un canal. No admite páginas de otros dominios, enlaces inseguros ni HTML embebido.
- El enlace se muestra en la tarjeta del programa, el detalle y el modo programa. Si contiene el ID de un video, la sección Resumen permite abrir la vista previa sin salir de AVODAH. Un enlace a `@canal/live` se ofrece para abrir en YouTube y no intenta incrustarse sin un ID concreto.
- AVODAH **no** inicia ni administra la transmisión de YouTube; sólo conserva el enlace y facilita el acceso. No anuncia que una emisión esté realmente en directo a menos que el estado editorial del programa lo indique.
- El modo demo permite guardar un enlace en una producción de prueba. Las portadas privadas requieren iniciar sesión para asignar permisos de almacenamiento al equipo.

## Pruebas pendientes con una cuenta real
1. Crear programa con portada y enlace de YouTube. Comprobar la portada en dashboard, lista y detalle.
2. Sustituir portada desde la pantalla de producción, abrir AVODAH en otro dispositivo y comprobar sincronización.
3. Abrir el enlace de YouTube desde la tarjeta, Resumen y modo programa.
4. Verificar desde una segunda cuenta del mismo equipo el acceso a la imagen privada; una cuenta de otro equipo no debería obtener URL firmada.
5. Quitar la portada y comprobar que desaparece. La compilación automática no prueba estos flujos de usuario.
