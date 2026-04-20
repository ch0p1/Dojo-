// src/services/email.service.js
// ─────────────────────────────────────────────────────────────
//  Servicio de envío de emails usando Resend
//  https://resend.com — 3.000 emails/mes gratis
//
//  Configurar en .env:
//  RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
//  APP_URL=http://127.0.0.1:3000          ← URL del frontend
// ─────────────────────────────────────────────────────────────

const RESEND_API = 'https://api.resend.com/emails';
const REMITENTE  = 'DOJX <no-reply@dojx.co>';

// ── Enviar email genérico via Resend ─────────────────────────
async function enviar({ para, asunto, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // En desarrollo sin API key: solo loguear en consola
    console.log('');
    console.log('📧  [EMAIL — modo simulado, configura RESEND_API_KEY]');
    console.log(`    Para:    ${para}`);
    console.log(`    Asunto:  ${asunto}`);
    console.log('─'.repeat(60));
    return { simulado: true };
  }

  const resp = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from:    REMITENTE,
      to:      [para],
      subject: asunto,
      html,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend error ${resp.status}: ${err}`);
  }

  return await resp.json();
}

// ── Template: verificación de email ──────────────────────────
function templateVerificacion(nombre, linkVerificar) {
  const primerNombre = nombre.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu cuenta en DOJX</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">

        <!-- Header rojo -->
        <tr>
          <td style="background:#C0392B;padding:28px 40px;text-align:center">
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:32px;font-weight:900;color:#FFFFFF;letter-spacing:3px">
              DOJ<span style="color:#FFD700">X</span>
            </div>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td style="padding:40px 40px 20px">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#FFFFFF">
              ¡Hola, ${primerNombre}! 👋
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7">
              Gracias por registrarte en <strong style="color:#FFFFFF">DOJX</strong> — la plataforma de artes marciales de Colombia.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7">
              Para activar tu cuenta y comenzar a explorar escuelas, entrenadores y eventos, confirma tu dirección de correo haciendo clic en el botón:
            </p>

            <!-- Botón CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:32px">
                <a href="${linkVerificar}"
                   style="display:inline-block;background:#C0392B;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:1px;padding:16px 40px;border-radius:6px;text-transform:uppercase">
                  Verificar mi cuenta
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.6">
              Si el botón no funciona, copia y pega este enlace en tu navegador:
            </p>
            <p style="margin:0 0 32px;font-size:12px;word-break:break-all">
              <a href="${linkVerificar}" style="color:#C0392B">${linkVerificar}</a>
            </p>

            <!-- Advertencia expiración -->
            <div style="background:rgba(212,172,13,0.08);border:1px solid rgba(212,172,13,0.2);border-radius:8px;padding:14px 18px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6)">
                ⏳ Este enlace expira en <strong style="color:#D4AC0D">24 horas</strong>.
                Si no lo usas a tiempo, puedes solicitar uno nuevo desde la pantalla de inicio de sesión.
              </p>
            </div>

            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6">
              Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid rgba(255,255,255,0.06)">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center;line-height:1.6">
              DOJX · La plataforma de artes marciales de Colombia<br>
              <a href="https://dojx.co" style="color:rgba(255,255,255,0.3)">dojx.co</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Template: reenvío de verificación ────────────────────────
function templateReenvio(nombre, linkVerificar) {
  // Reutiliza el mismo template con título diferente
  return templateVerificacion(nombre, linkVerificar)
    .replace('Verifica tu cuenta en DOJX', 'Nuevo enlace de verificación — DOJX')
    .replace('¡Hola, ', '¡Hola de nuevo, ');
}

// ── Exports ───────────────────────────────────────────────────
module.exports = {
  enviarVerificacion: async (para, nombre, linkVerificar) => {
    return enviar({
      para,
      asunto: '✅ Verifica tu cuenta en DOJX',
      html:   templateVerificacion(nombre, linkVerificar),
    });
  },
  enviarReenvioVerificacion: async (para, nombre, linkVerificar) => {
    return enviar({
      para,
      asunto: '🔄 Nuevo enlace de verificación — DOJX',
      html:   templateReenvio(nombre, linkVerificar),
    });
  },
};
