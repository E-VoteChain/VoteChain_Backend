import nodemailer from 'nodemailer';
import env from './env.js';
import logger from './logger.js';
import { errorResponse } from '../utils/response.js';
import { INTERNAL_SERVER } from '../constants/index.js';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
});

export const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: env.smtp.fromEmail,
      to: to,
      subject: subject,
      html: html,
    });
  } catch (error) {
    logger.error('Error sending email', error);
    errorResponse(null, 'Error sending email', error.message, INTERNAL_SERVER);
  }
};
