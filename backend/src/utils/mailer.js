import nodemailer from 'nodemailer';

function getTransporter() {
 const user = process.env.SMTP_USER || process.env.EMAIL_USER;   
 const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.log("SMTP credentials missing");
    return null;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
    port: 587,
    secure: false,
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.log("SMTP ERROR:", error);
    } else {
      console.log("SMTP SERVER READY");
    }
  });

  return transporter; 
}

export async function sendMail({ to, subject, text, html }) {
  try {
    const transporter = getTransporter();

    console.log("Transporter Created");

    if (!transporter) {
      console.log("Transporter is NULL");
      return false;
    }

    const user =
      process.env.SMTP_USER || process.env.EMAIL_USER;

    const from =
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      `${process.env.EMAIL_FROM_NAME || 'Smart Visitor System'} <${user}>`;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log("EMAIL SENT:", info);

    return true;

  } catch (error) {
    console.error("REAL MAIL ERROR:");
    console.error(error);

    return false;
  }
}
