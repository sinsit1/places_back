import nodemailer from "nodemailer";

export async function sendEmail(to, subject, html) {
  try {
    if (!to) {
      throw new Error("El destinatario (to) es requerido pero está vacío 🚨");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_HOST,
      port: process.env.BREVO_PORT,
      secure: false, // STARTTLS en puerto 587
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
      },
    });

    const mailOptions = {
      from: `"Spottica" <alexandra8989@gmail.com>`,
      to: Array.isArray(to) ? to : [to], // 🔹 Asegura que siempre sea un array
      subject,
      html,
    };

    console.log("📨 Enviando email a:", to); // 👀 debug para verificar
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email enviado con Brevo:", info.messageId);
  } catch (err) {
    console.error("❌ Error enviando email con Brevo:", err);
    throw new Error("No se pudo enviar el correo con Brevo");
  }
}
