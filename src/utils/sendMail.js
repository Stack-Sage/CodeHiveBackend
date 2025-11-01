import nodemailer from "nodemailer";

export async function sendMail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or your SMTP provider
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}
