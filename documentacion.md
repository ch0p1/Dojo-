# Documentación Técnica del Proyecto: DOJX

## 1. Introducción
**DOJX** es una plataforma digital integral diseñada específicamente para el ecosistema de las artes marciales en Colombia. Actúa como un hub centralizado que conecta a practicantes, entrenadores independientes y academias, facilitando el descubrimiento de servicios, la gestión de suscripciones y la promoción de eventos de combate.

## 2. Propósito del Proyecto
El proyecto surge para resolver la fragmentación de información en el sector de los deportes de contacto. **DOJX** busca digitalizar la oferta deportiva, proporcionando herramientas de visibilidad profesional para entrenadores y una interfaz intuitiva para que los usuarios encuentren entrenamiento verificado, eliminando las fricciones en el proceso de búsqueda y pago.

## 3. Cliente Objetivo
*   **Administradores de Escuelas:** Dueños de dojos y academias que buscan automatizar su presencia digital y atraer nuevos alumnos.
*   **Entrenadores Independientes:** Profesionales que requieren un portafolio digital y un canal de contacto directo (WhatsApp).
*   **Deportistas y Practicantes:** Usuarios que buscan disciplinas específicas (BJJ, MMA, Boxeo, etc.) filtradas por ubicación y horarios.
*   **Organizadores de Eventos:** Entidades que necesitan difundir torneos y gestionar reglamentos técnicos.

## 4. Funcionalidades (MVP)
*   **Sistema de Autenticación Robusto:** Registro y acceso basado en JWT (JSON Web Tokens) con validación obligatoria de correo electrónico mediante tokens únicos de expiración controlada.
*   **Motores de Búsqueda y Filtrado:** Localización de escuelas, entrenadores y eventos con filtros dinámicos por ciudad, disciplina y franja horaria.
*   **Pasarela de Pagos Integrada:** Integración con Wompi para la adquisición de planes (Basic Personal, Basic Escuela, Premium) con validación de integridad mediante firmas SHA256.
*   **Publicación de Contenido Dinámico:** Formularios avanzados para el registro de academias (incluyendo horarios multi-slot), perfiles de entrenadores y posters de eventos.
*   **Panel Administrativo:** Interfaz para la gestión de usuarios, auditoría de reseñas, activación manual de planes y estadísticas en tiempo real.
*   **Gestión de Medios:** Subida y previsualización de imágenes de instalaciones y documentos técnicos (PDF) para reglamentos.

## 5. Ventajas frente a Competidores
*   **Enfoque Local y Especializado:** A diferencia de plataformas genéricas de fitness, DOJX entiende las particularidades de las artes marciales (disciplinas, grados, tipos de eventos).
*   **UX Simplificada y Moderna:** Interfaz en modo oscuro (Dark Mode) optimizada para dispositivos móviles, priorizando el contacto rápido vía WhatsApp.
*   **Arquitectura Desacoplada:** El uso de módulos ES6 en el frontend permite una carga eficiente y un mantenimiento simplificado frente a monolitos de código tradicionales.

## 6. Arquitectura Tecnológica
*   **Frontend:** HTML5, CSS3 (Custom Properties) y JavaScript Vanilla (Arquitectura de Módulos ES6).
*   **Backend:** Node.js con el framework Express.
*   **Base de Datos:** PostgreSQL (Relacional) para garantizar integridad referencial y soporte de tipos complejos (ARRAYS para disciplinas).
*   **Seguridad:** Bcrypt (hashing), JWT (autorización), y sanitización XSS integrada.
*   **Servicios Externos:** 
    *   Wompi (Procesamiento de pagos).
    *   Nodemailer (Notificaciones transaccionales vía SMTP).

## 7. Desglose de la Arquitectura

### Flujo de Datos
1.  El **Frontend** (módulo `api.js`) realiza peticiones asíncronas al Backend inyectando el token Bearer.
2.  El **Backend** valida el token y delega la lógica a los **Controllers** (`auth.controller.js`, `subscriptions.controller.js`).
3.  Los controladores interactúan con el **Pool de Conexión** de PostgreSQL para persistir o recuperar datos.
4.  Las respuestas se devuelven en formato JSON y el módulo `render.js` actualiza el DOM de forma reactiva.

### Estructura de Carpetas Principal
*   `/dojo-frontend`:
    *   `js/`: Módulos de lógica (auth, api, render, ui).
    *   `styles/`: Definiciones CSS modulares.
*   `/dojo-backend`:
    *   `src/controllers/`: Lógica de negocio y endpoints.
    *   `src/services/`: Integraciones externas (Email, Wompi).
    *   `src/db/`: Configuración y scripts de conexión SQL.

## 8. Explicación de Funcionamiento

### Módulo de Autenticación
Implementa una estrategia de "Seguridad por Pasos". El registro no es funcional hasta que el usuario valida su identidad mediante un enlace único enviado por correo. Las contraseñas se cifran con un factor de costo 12 (SALT_ROUNDS), protegiendo contra ataques de fuerza bruta.

### Gestión de Pagos (Wompi)
Se implementa un flujo de alta seguridad:
1.  El servidor genera una **Firma de Integridad** SHA256 combinando referencia, monto y clave privada.
2.  Wompi procesa el pago y notifica a un **Webhook** del backend.
3.  El backend verifica la autenticidad del evento antes de actualizar el `plan_activo` del usuario en la base de datos, garantizando idempotencia en las transacciones.

### Sistema de Filtrado In-Memory
Para mejorar la velocidad de respuesta, los listados aplican filtros sobre datos ya cargados en el estado local de la aplicación, recalculando visibilidad y contadores instantáneamente sin latencia de red adicional.

## 9. Estado Actual vs. Estado Futuro

| Hito / Funcionalidad | Estado Actual (MVP) | Estado Futuro (Roadmap) |
| :--- | :--- | :--- |
| **Autenticación** | JWT + Email Verification | OAuth (Google/Facebook/Apple) |
| **Pagos** | Wompi (Tarjetas/PSE) | Suscripciones recurrentes automáticas |
| **Contenido** | Escuelas, Trainers, Eventos | Marketplace de equipo deportivo |
| **Social** | Reseñas verificadas por Admin | Chat interno entre usuarios y dojos |
| **Multimedia** | Imágenes estáticas y PDF | Integración de video (clases pre-grabadas) |
| **Movilidad** | Web Responsive | Aplicación Nativa (iOS / Android) |
| **Admin** | Gestión de usuarios y pagos | Dashboard de analítica avanzada |

---
*Documento generado el 20 de Abril de 2026 por el departamento de ingeniería de DOJX.*

ch0p1 : Tengo fe de que este producto acompañado de una buena estrategia de marketing podra alcanzar sin mayor dificultad sus primeros 10 clientes, de ahi espero recibir todo el feedback posible para poder solucionar problemas graves. Esto permitira que podamos ofrecer un servicio que alcance los +100 usuarios, por ahora no importa la manera de monetizarlo, solo quiero que funcione y las personas esten satisfechas con la eliminacion de busquedas insulsas para encontrar donde entrenar. vamos por mas
