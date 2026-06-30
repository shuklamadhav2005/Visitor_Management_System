import dns from 'dns';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

dns.setDefaultResultOrder('ipv4first');

function ipv4Lookup(hostname, options, callback) {
  const lookupOptions = typeof options === 'object' && options !== null
    ? { ...options, family: 4 }
    : { family: 4 };

  return dns.lookup(hostname, lookupOptions, callback);
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

async function sendWithResend({ to, subject, text, html }) {
  const resend = getResendClient();
  if (!resend) {
    return false;
  }

  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Smart Visitor System <onboarding@resend.dev>';

  const recipients = Array.isArray(to) ? to : [to];
  const { data, error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Resend email failed');
  }

  console.log('RESEND EMAIL SENT:', data?.id || 'ok');
  return true;
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
    if (process.env.RESEND_API_KEY) {
      return await sendWithResend({ to, subject, text, html });
    }

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

    if (!process.env.RESEND_API_KEY) {
      return false;
    }

    try {
      const transporter = getTransporter();
      if (!transporter) {
        return false;
      }

      const user = process.env.SMTP_USER || process.env.EMAIL_USER;
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

      console.log('SMTP FALLBACK SENT:', info.messageId || 'ok');
      return true;
    } catch (fallbackError) {
      console.error('SMTP fallback failed:', fallbackError);
    }

    return false;
  }
}
