import nodemailer from "nodemailer";

export async function sendEmail(to, subject, text) {
  try {
    // Configuración del transporte SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {                                  
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Configuración del mensaje
    const mailOptions = {
      from: process.env.EMAIL_USER, 
      to,
      subject,
      text,
    };
console.log("Intentando enviar correo a", to);
    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado:", info.messageId);
  } catch (err) {
    console.error("Error enviando email:", err);
    throw new Error("No se pudo enviar el correo");
  }
}

