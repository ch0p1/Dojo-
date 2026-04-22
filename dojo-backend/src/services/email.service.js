const nodemailer = require('nodemailer');
require('dotenv').config(); // Asegura que las variables se carguen antes de configurar el transporte

// Depuración: Verificar si se cargó el host correcto
if (!process.env.EMAIL_HOST || process.env.EMAIL_HOST.includes('localhost')) {
  console.warn('⚠️  Alerta: EMAIL_HOST no está configurado correctamente (actualmente:', process.env.EMAIL_HOST, ')');
}

// Configuración del transporte
// Se recomienda usar variables de entorno para la seguridad
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
  console.error('❌ Error Crítico: EMAIL_USER o EMAIL_PASS no están definidos. El correo no funcionará.');
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: parseInt(process.env.EMAIL_PORT) === 465,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  tls: {
    // Permite conexiones aunque el certificado sea auto-firmado (común en dev)
    rejectUnauthorized: false
  },
  // Habilita logs detallados para depuración
  debug: true,
  logger: true
});

// Validación de conexión inmediata al iniciar el servidor
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error en configuración de correo (SMTP):', error);
  } else {
    console.log('📧 Servidor de correo listo para enviar mensajes');
  }
});

/**
 * Envía el correo de bienvenida con el link de verificación
 */
async function enviarVerificacion(email, nombre, link) {
  const mailOptions = {
    from: `"DOJX Martial Arts" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🥋 Verifica tu cuenta en DOJX',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 10px; border: 1px solid #c0392b;">
        <h1 style="color: #c0392b; font-size: 32px; text-align: center;">¡BIENVENIDO A DOJX!</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${nombre}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">Gracias por unirte a la comunidad de artes marciales más grande de Colombia. Para activar tu cuenta y empezar a explorar escuelas y eventos, haz clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" target="dojx_app" style="background: #c0392b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">VERIFICAR MI CUENTA</a>
        </div>
        <p style="font-size: 13px; color: #888; text-align: center;">Este enlace expirará en 24 horas.</p>
        <hr style="border: 0; border-top: 1px solid #222; margin: 30px 0;">
        <p style="font-size: 12px; color: #555; text-align: center;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Envía un nuevo link si el anterior expiró o se solicitó reenvío
 */
async function enviarReenvioVerificacion(email, nombre, link) {
  const mailOptions = {
    from: `"DOJX Martial Arts" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔄 Nuevo enlace de verificación - DOJX',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 10px; border: 1px solid #c0392b;">
        <h2 style="color: #ffffff; text-align: center;">Nuevo enlace solicitado</h2>
        <p style="font-size: 16px; line-height: 1.6;">Hola ${nombre}, aquí tienes el nuevo enlace para verificar tu correo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" target="dojx_app" style="background: #c0392b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">ACTIVAR MI CUENTA</a>
        </div>
        <p style="font-size: 12px; color: #555; text-align: center;">Si tú no solicitaste esto, por favor contacta a soporte.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { enviarVerificacion, enviarReenvioVerificacion };