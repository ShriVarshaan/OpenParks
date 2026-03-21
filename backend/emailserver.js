const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) console.error('Email transporter error:', error);
  else console.log('Email server is ready');
});



const sendEmail = async ({ to, subject, html }) => {
  const randomString = crypto.randomBytes(4).toString('hex');
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text: randomString,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};