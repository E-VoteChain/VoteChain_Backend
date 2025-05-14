import cron from 'node-cron';
import prisma from '../config/db.js';
import logger from '../config/logger.js';

export const startElectionCron = async () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('Running election cron job...');
    const now = new Date();

    try {
      const toStart = await prisma.election.findMany({
        where: {
          start_date: {
            lte: now,
          },
          status: 'upcoming',
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
            status: 'ongoing',
          },
        });
        console.log(`Started ${toStart.length} election(s).`);
      }

      const toEnd = await prisma.election.findMany({
        where: {
          end_date: {
            lte: now,
          },
          status: 'ongoing',
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
            status: 'completed',
          },
        });
        console.log(`Completed ${toEnd.length} election(s).`);
      }
    } catch (err) {
      console.error('Election cron error:', err.message);
    }
  });
};
