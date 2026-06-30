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

  return nodemailer.createTransport(transportConfig);
}

export async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();

  console.log("Transporter:", transporter);

  const user =
    process.env.SMTP_USER || process.env.EMAIL_USER;

  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    `${process.env.EMAIL_FROM_NAME || 'Smart Visitor System'} <${user || 'no-reply@example.com'}>`;

  if (!transporter) {
    console.log("Transporter not created");
    return false;
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully");
    return true;

  } catch (error) {
    console.log("MAIL ERROR:", error);
    return false;
  }
}
