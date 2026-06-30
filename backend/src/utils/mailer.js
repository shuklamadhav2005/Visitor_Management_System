import dns from 'dns';
import nodemailer from 'nodemailer';

function ipv4Lookup(hostname, options, callback) {
  return dns.lookup(hostname, { ...options, family: 4 }, callback);
}

function getTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const service = process.env.SMTP_SERVICE || process.env.EMAIL_SERVICE;
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || 'false') === 'true';

  if (!user || !pass) {
    console.log('SMTP credentials missing');
    return null;
  }

  const transportOptions = {
    auth: {
      user,
      pass,
    },
  };

  if (host || service === 'gmail') {
    transportOptions.host = host || 'smtp.gmail.com';
    transportOptions.port = Number.isFinite(port) ? port : 587;
    transportOptions.secure = secure;
    transportOptions.family = 4;
    transportOptions.lookup = ipv4Lookup;
  } else if (service) {
    transportOptions.service = service;
  } else {
    transportOptions.host = 'smtp.gmail.com';
    transportOptions.port = 587;
    transportOptions.secure = false;
    transportOptions.family = 4;
    transportOptions.lookup = ipv4Lookup;
  }

  const transporter = nodemailer.createTransport(transportOptions);

  transporter.verify(function (error) {
    if (error) {
      console.log('SMTP ERROR:', error.message);
    } else {
      console.log('SMTP SERVER READY');
    }
  });

  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  try {
    const transporter = getTransporter();

    console.log('Transporter created');

    if (!transporter) {
      console.log('Transporter is NULL');
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

    console.log('EMAIL SENT:', info.messageId || 'ok');

    return true;

  } catch (error) {
    console.error('REAL MAIL ERROR:');
    console.error(error);

    return false;
  }
}
