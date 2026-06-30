import nodemailer from 'nodemailer';

function getTransporter() {
  const service = process.env.SMTP_SERVICE || process.env.EMAIL_SERVICE;
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass || (!service && !host)) {
    return null;
  }

  const transportConfig = {
    auth: {
      user,
      pass,
    },
  };

  if (service) {
    transportConfig.service = service;
  } else {
    transportConfig.host = host;
    transportConfig.port = port;
    transportConfig.secure = String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;
  }

  const transporter = nodemailer.createTransport(transportConfig);

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
