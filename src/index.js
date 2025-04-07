import app from './config/app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import prisma from './config/db.js';
import process from 'process';
let server = null;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Prisma connected to database');

    server = app.listen(env.port, () => {
      logger.info(`Server started at http://localhost:${env.port}`);
    });
  } catch (err) {
    logger.error(`An error occurred connecting to DB: ${err.message}`);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  exitHandler();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  exitHandler();
});

const exitHandler = async () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }

  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected');
  } catch (err) {
    logger.error(`Error disconnecting Prisma: ${err.message}`);
  }
};

startServer();
export default prisma;
