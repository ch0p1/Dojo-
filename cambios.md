# Historial de Cambios: Actualizaciones del Sistema - DOJX

Este documento detalla las mejoras de UI/UX, correcciones de errores críticos de servidor y actualizaciones de infraestructura realizadas.

---

## Sesión: 21 de Abril de 2026

### 1. Correcciones de Frontend e Interactividad
- **Exposición Global de Funciones**: Se inyectaron funciones clave de `auth.js` (`validateStep1`, `showLoginForm`, `nextRegStep`, etc.) en el objeto `window`. Esto solucionó el problema de los botones "Continuar" y enlaces de "Iniciar Sesión" que no respondían debido al scope de los módulos ES6.
- **Optimización de Pestañas**: Se implementó `window.name = 'dojx_app'` y el uso de `target="dojx_app"` en los enlaces de correo. Ahora, al hacer clic en "Activar mi cuenta", se reutiliza la pestaña abierta de la aplicación en lugar de abrir ventanas duplicadas.
- **Fix de Importación en API**: Se añadió el `export` faltante a `API_URL` en `api.js`, resolviendo errores de sintaxis al importar el módulo en otros archivos de lógica.

---

### 2. Infraestructura y Seguridad (Backend)
- **Gestión de Variables de Entorno**: Se reubicó el archivo `.env` a la raíz del backend y se forzó su carga en los servicios de Base de Datos y Email. Esto corrigió errores de credenciales no definidas (`undefined`).
- **Robustez en PostgreSQL**: Se actualizó `connection.js` para manejar autenticación SCRAM, asegurando que las contraseñas se procesen como strings y proporcionando logs de error claros para diagnóstico de conexión.
- **Implementación de Cloudinary**: Se creó `cloudinary.service.js` para centralizar la futura gestión de imágenes y archivos multimedia de la plataforma.

---

### 3. Flujo de Autenticación y Correo (SMTP)
- **Configuración de Gmail SMTP**: Se integró el soporte para "Contraseñas de Aplicación" de Google, eliminando el error de autenticación 535. Se añadieron logs detallados y manejo de TLS para asegurar la entrega.
- **Sincronización de Enlaces de Verificación**: Se corrigió la generación de enlaces en `auth.controller.js` para apuntar al puerto correcto del Live Server (`5500`) y al archivo de destino real (`screen-1-home-search.html`).
- **Manejo de Carrera (Race Condition)**: Se implementó `await` en el envío del correo de registro inicial, garantizando que el proceso de email finalice antes de que el servidor responda al usuario.

---

### Estado Actual (Resumen)
- **Autenticación**: 100% Operativa con verificación de correo.
- **Base de Datos**: Conexión estable con manejo de errores SCRAM.
- **Frontend**: Interactividad restaurada y navegación sincronizada con el servidor.

*Última actualización: 20 de Abril de 2026*
