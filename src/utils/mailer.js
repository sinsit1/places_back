import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to, subject, html) {
  try {
    const data = await resend.emails.send({
      from: "Spottica <onboarding@resend.dev>", // puedes usar uno genérico de Resend
      to,
      subject,
      html,
    });

    console.log("📧 Email enviado con Resend:", data);
  } catch (err) {
    console.error("❌ Error enviando email con Resend:", err);
    throw new Error("No se pudo enviar el correo con Resend");
  }
}
