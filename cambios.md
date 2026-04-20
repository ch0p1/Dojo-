# Historial de Cambios: Actualizaciones del Sistema - DOJX

Este documento detalla las mejoras de UI/UX, correcciones de errores críticos de servidor y actualizaciones de base de datos realizadas en la sesión actual.

---

## 1. Mejoras de Interfaz (UI) y Navegación
- **Consistencia Visual en Nav**: Se ajustó el color de los textos de navegación a blanco por defecto, con un cambio dinámico al rojo corporativo (`--red`) al pasar el cursor (hover).
- **Feedback de Enlaces**: Se aplicó herencia de color y eliminación de subrayados en los elementos `<a>` dentro de los menús para mantener la estética limpia.

---

## 2. Optimización del Motor de Filtrado
- **Persistencia de Contenido**: Se corrigió el error donde los "ejemplos de muestra" estáticos desaparecían del DOM al filtrar. Ahora la lógica utiliza la clase CSS `.card-hidden` (`display: none !important`) en lugar de sobrescribir el contenedor con `innerHTML`.
- **Aislamiento de Scope**: Se rediseñó la función de filtrado para que las selecciones de una pantalla (ej. Home) no afecten los listados de otras pantallas (ej. Escuelas), limitando la búsqueda de elementos activos al contenedor actual.
- **Funcionalidad de Des-selección (Toggle)**: Se implementó la capacidad de desactivar un filtro haciendo clic por segunda vez en la misma "pill", permitiendo regresar fácilmente al estado global ("Todas").
- **Insensibilidad a Mayúsculas**: Se normalizaron las comparaciones de texto mediante `.toLowerCase()` y `.trim()` para evitar fallos por discrepancias tipográficas.

---

## 3. Corrección de Errores Críticos (Backend)
- **Resolución de Error 500 (Login)**: Se identificó y corrigió una excepción en el controlador de autenticación causada por la ausencia de la columna `email_verificado` en la base de datos y la falta de validación de `JWT_SECRET`.
- **Robustez de JWT**: Se añadió validación preventiva en `emitirToken` para asegurar que el servidor no inicie o falle con mensajes claros si las claves de entorno no están configuradas.
- **Mejora de Logs**: Se implementó un sistema de errores detallados en modo desarrollo que reporta códigos de error específicos de PostgreSQL (ej. Error 42703).

---

## 4. Infraestructura y Base de Datos (PostgreSQL)
- **Actualización de Esquema**: Se ejecutaron scripts de migración para añadir soporte a:
    - Verificación de correo electrónico (`email_verificado`).
    - Gestión de membresías (`plan_activo`, `plan_expira`).
    - Tablas de seguridad (`verification_tokens`) y pagos (`subscriptions`).
- **Soporte UUID**: Se habilitó la extensión `pgcrypto` para manejar identificadores únicos globales, mejorando la seguridad de las URLs de perfil.

---

## 5. Servicios y Documentación
- **Implementación de Nodemailer**: Se configuró `email.service.js` con soporte para transportes SMTP reales, plantillas HTML personalizadas para bienvenida y reenvío de enlaces de activación.
- **Documentación Técnica**: Se generó el archivo `documentacion.md` con el resumen ejecutivo, arquitectura de carpetas, flujo de datos y roadmap del proyecto.

---

## Estado de la Aplicación (Resumen)
- **Autenticación**: 100% Funcional (Registro -> Email -> Verificación -> Login).
- **Filtros**: 100% Funcional (Preserva contenido estático y dinámico).
- **Pagos**: Preparado para integración con Wompi (Estructura de tablas y firmas de integridad listas).

*Última actualización: 20 de Abril de 2026*
