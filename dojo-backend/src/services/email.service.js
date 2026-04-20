const nodemailer = require('nodemailer');

// Configuración del transporte
// Se recomienda usar variables de entorno para la seguridad
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_PORT == 465, // true para 465, false para otros
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
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
          <a href="${link}" style="background: #c0392b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">VERIFICAR MI CUENTA</a>
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
          <a href="${link}" style="background: #c0392b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">ACTIVAR MI CUENTA</a>
        </div>
        <p style="font-size: 12px; color: #555; text-align: center;">Si tú no solicitaste esto, por favor contacta a soporte.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { enviarVerificacion, enviarReenvioVerificacion };