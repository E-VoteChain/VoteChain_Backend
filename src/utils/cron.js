import cron from 'node-cron';
import prisma from '../config/db.js';
import logger from '../config/logger.js';

export const startElectionCron = async () => {
  // Schedule a cron job to run every minute
  cron.schedule('* * * * *', async () => {
    logger.info('Running election cron job...');
    const now = new Date();

    try {
      const toStart = await prisma.election.findMany({
        where: {
          startDate: {
            lte: now,
          },
          status: 'UPCOMING',
        },
      });

      if (toStart.length > 0) {
        await prisma.election.updateMany({
          where: {
            id: {
              in: toStart.map((e) => e.id),
            },
          },
          data: {
            status: 'ONGOING',
          },
        });
        console.log(`Started ${toStart.length} election(s).`);
      }

      const toEnd = await prisma.election.findMany({
        where: {
          endDate: {
            lte: now,
          },
          status: 'ONGOING',
        },
      });

      if (toEnd.length > 0) {
        await prisma.election.updateMany({
          where: {
            id: {
              in: toEnd.map((e) => e.id),
            },
          },
          data: {
            status: 'COMPLETED',
          },
        });
        console.log(`Completed ${toEnd.length} election(s).`);
      }
    } catch (err) {
      console.error('Election cron error:', err.message);
    }
  });
};
