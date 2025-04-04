import winston from 'winston';
import env from './env.js';

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    return { ...info, message: info.stack };
  }
  return info;
});

const logger = winston.createLogger({
  level: env.env === 'development' ? 'debug' : 'info',

  format: winston.format.combine(
    enumerateErrorFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),

    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaInfo = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level.toUpperCase()}] ${message} ${metaInfo}`;
    })
  ),

  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
    new winston.transports.File({ filename: 'logs/app.log' }),
  ],
});

export default logger;
