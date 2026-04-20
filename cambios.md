# Historial de Cambios: Refactorización DOJX Frontend

Este documento detalla todos los cambios estructurales, de seguridad y de arquitectura que se han implementado en el frontend del proyecto DOJX para llevarlo a un estándar de producción moderno y seguro.

---

## 1. Migración Arquitectónica (De Monolito a MPA + ES Modules)

Se eliminó el archivo gigante `dojo-plus-script.js` (aprox. 1800 líneas) que centralizaba toda la lógica. En su lugar, se adoptó una arquitectura modular utilizando **ES Modules**, creando la carpeta `js/` con la siguiente distribución de responsabilidades:

- **`main.js`**: El nuevo punto de entrada (`bootstrapper`). Configura los eventos globales, procesa tokens en la URL e inicializa las vistas según la página actual.
- **`api.js`**: Centraliza todas las llamadas al backend. Maneja la inyección de tokens JWT, formato de cabeceras JSON, parseo de respuestas y un manejo de errores unificado.
- **`state.js`**: Almacenamiento local en memoria (Store). Almacena el usuario actual, el estado de los filtros y datos persistentes para evitar múltiples llamadas innecesarias al backend.
- **`data.js`**: Conecta la API con el renderizado, implementando filtros eficientes en memoria (por ciudad, disciplina y texto) en lugar de ocultar nodos del DOM basados en clases o atributos.
- **`render.js`**: Responsable exclusivo de generar el HTML dinámico (tarjetas de escuelas, entrenadores, eventos y detalles).
- **`auth.js`**: Lógica aislada para inicio de sesión, registro, recuperación y validación estricta contra el backend.
- **`publish.js`**: Controladores para la publicación de contenido (modal, subida de archivos, formularios y carga de endpoints).
- **`admin.js`**: Módulo dedicado al panel administrativo (estadísticas, control de usuarios y reseñas).
- **`ui.js`**: Utilidades visuales (toasts, tabs, menú hamburguesa).
- **`utils.js`**: Funciones auxiliares genéricas (debounce, formateo de fechas, prevención XSS).

---

## 2. Refuerzo de Seguridad (Crítico)

### Mitigación de XSS (Cross-Site Scripting)
- Se implementó la función **`esc()`** en `utils.js` para sanear todas las cadenas de texto provenientes de la base de datos o el usuario.
- Toda inyección de variables dinámicas dentro de las plantillas literales de `render.js` (y otros módulos) ahora usa `esc(variable)`, asegurando que no se pueda inyectar código malicioso a través de campos como nombres o descripciones.

### Seguridad en Enlaces Externos
- A todos los enlaces que abren nuevas pestañas (especialmente enlaces de WhatsApp o botones dinámicos) se les ha inyectado el atributo `rel="noopener noreferrer"` en conjunto con `target="_blank"` para evitar vulnerabilidades de _Tabnabbing_ (manipulación del historial o estado de la pestaña origen).

---

## 3. Implementación de Patrón de Delegación de Eventos

Anteriormente, el HTML dependía fuertemente de eventos JavaScript en línea (ej. `onclick="goTo('login')"`), lo que acoplaba la vista a la lógica e impedía el uso estricto de Content Security Policies (CSP).

- **Eliminación masiva de `onclick`**: Un script recorrió todos los archivos `.html` y eliminó estas invocaciones.
- **Atributos Data (`data-action`)**: Se añadieron atributos declarativos. Por ejemplo, los botones ahora dicen `data-action="doLogin"`.
- **Listener Global**: En `main.js`, un único _Event Listener_ adherido al `body` captura los clics, evalúa si existe un `data-action` y delega la ejecución al módulo correspondiente. Esto reduce significativamente el consumo de memoria del navegador.

---

## 4. Limpieza y Reestructuración de Vistas HTML

- Se modificaron todos los archivos `.html` (`screen-1-home-search.html`, `screen-escuelas-listado.html`, etc.) para actualizar la referencia de carga de scripts:
  - **Antes**: `<script src="dojo-plus-script.js"></script>`
  - **Ahora**: `<script type="module" src="js/main.js"></script>`
- Se implementó un esquema **MPA (Multi-Page Application)** completo y funcional con navegación entre los distintos archivos, preservando parámetros de URLs (como el token de verificación de correo).
- Se repararon duplicidades en el código HTML de `dojo-plus.html`, específicamente eliminando el doble menú lateral móvil.

---

## 5. Cambios en la Experiencia de Usuario (UX)

- **Filtros In-Memory**: Las búsquedas ahora procesan los datos cacheados en JavaScript en vez de esconder las tarjetas con CSS. Esto asegura que los contadores (ej. "5 escuelas encontradas") sean exactos y que las pantallas de estado vacío se actualicen de manera instantánea.
- **Autenticación Fuerte**: En lugar de confiar en que un token expirado reensamble la sesión por su carga local, ahora el sistema valida la validez directamente contra el servidor en cada carga significativa a través del `/auth/me`.

---

## Próximos Pasos Recomendados

1. Dado que ahora el frontend es modular (`type="module"`), el desarrollo **requiere usar un servidor local** (ej. Live Server, Nginx o un proxy local de NodeJS).
2. Se sugiere revisar la integración del módulo de pagos (Epayco/Wompi), implementando lógicas similares con llamadas centralizadas en `api.js`.
3. Es posible ahora implementar configuraciones de minificación/bundle (como **Vite** o **Webpack**) para fusionar y comprimir todo el contenido de la carpeta `/js/` a la hora de desplegar en producción.
