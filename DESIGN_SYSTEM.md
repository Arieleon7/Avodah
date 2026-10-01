# AVODAH — Sistema visual v1.0

**Concepto:** un estudio editorial cálido y profesional para equipos que producen radio, streaming, podcasts y contenido. Su estética debe transmitir claridad y creatividad, no la apariencia de un panel administrativo genérico.

## Identidad
- Logotipo: nombre **AVODAH** en Manrope ExtraBold, espaciado amplio, acompañado por una A geométrica de cobre. El símbolo aparece en el favicon.
- Lema: **Donde las ideas se convierten en programas.**
- Iconografía: Lucide, líneas uniformes de 1.75–1.9 px. Evitar glifos arbitrarios y emojis en la navegación principal.
- Fotografía: grabación editorial, micrófonos reales, profundidad de campo y tonos cálidos. Usar fondos con degradado para asegurar contraste; nunca colocar texto sin protección sobre una fotografía.

## Paleta

| Propósito | Color |
|---|---|
| Fondo de aplicación | `#F7F6F3` |
| Panel | `#FFFFFF` |
| Texto principal | `#202322` |
| Texto secundario | `#737775` |
| Líneas suaves | `#E8E8E4` |
| Terracota/acento | `#AD5030` |
| Terracota suave | `#F9EDE6` |
| Verde salvia | `#688679` |
| Azul grisáceo | `#8DA5B7` |
| Sidebar | `#111B20` |

## Tipografía
- **Manrope**: titulares, sección, logotipo y énfasis.
- **Inter**: navegación, formularios, etiquetas, contenido y datos numéricos.
- Títulos grandes con espaciado levemente negativo. Contenido con altura de línea generosa.
- No mezclar con Georgia ni otras fuentes decorativas en componentes nuevos.

## Componentes
- Radio general de tarjetas: 15–16 px.
- Paneles blancos con borde gris suave y sombras cortas de bajo contraste.
- Botón principal: terracota sólido, 10 px de radio y foco de alto contraste.
- Botones secundarios: blanco con borde de línea; hover cálido, sin efectos exagerados.
- Etiquetas de estado: cápsulas pequeñas con fondo pastel y texto oscuro legible.
- Iconografía operativa: botones reales con acciones; no mostrar controles decorativos inertes.

## Composición
- Escritorio: barra lateral grafito de 238 px, toolbar superior de 78 px, contenido con máximo de 1660 px.
- Dashboard: bienvenida → cuatro acciones rápidas → producción destacada y tareas → producciones/ideas/actividad.
- Tablet: la composición pasa progresivamente de 3 columnas a 2 o 1.
- Móvil: navegación inferior con **Más** que expone todas las áreas. El buscador debe continuar siendo funcional. Nunca ocultar funcionalidades esenciales sin alternativa.
- Modo Programa: la misma identidad con contraste reforzado y cronómetro protagonista.

## Fuentes fotográficas
Fotografías externas de [Koen Sweers](https://unsplash.com/photos/a-microphone-with-a-laptop-in-the-background-kVEjALqUqPk) y [MiguelPhoto](https://unsplash.com/photos/a-microphone-and-headphones-in-a-dark-room-NVMAUan5cr8), identificadas como gratuitas bajo la licencia de Unsplash al seleccionar los recursos. Considerar almacenarlas como activos locales optimizados para eliminar dependencia externa antes de un lanzamiento general.

## Continuidad
Toda interfaz nueva (chat, calendario, biblioteca, tareas, gestión de equipo) debe reutilizar colores, tipografía, jerarquía, radios, estados, enfoque accesible y puntos de corte de este documento. No rehacer lógica Supabase ni navegación al aplicar estilo.
