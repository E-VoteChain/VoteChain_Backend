import prisma from '../config/db.js';
import logger from '../config/logger.js';
import { INTERNAL_SERVER, NOT_FOUND } from '../constants/index.js';
import { paginate } from '../plugins/paginate.js';
import { AppError } from '../utils/AppError.js';

export const queryElection = async (filter, options) => {
  try {
    return await paginate('election', filter, options);
  } catch (error) {
    throw new AppError('Failed to query election', INTERNAL_SERVER, error);
  }
};

export const getWinnerByElectionId = async (electionId, select = {}) => {
  try {
    const winner = await prisma.candidate.findFirst({
      where: {
        electionId: electionId,
        status: 'WIN',
      },
      select: select,
    });

    return winner;
  } catch (error) {
    throw new AppError('Winner not Found', NOT_FOUND, error);
  }
};

export const getElectionVotes = async (electionId) => {
  return await prisma.vote.count({
    where: {
      electionId: electionId,
    },
  });
};

export const getElectionById = async (id, select = {}) => {
  try {
    const election = await prisma.election.findUnique({
      where: {
        id: id,
      },
      select: select,
    });

    return election;
  } catch (error) {
    throw new AppError('Election not Found', NOT_FOUND, error);
  }
};

export const getCandidateByElectionId = async (election_id, select = {}) => {
  try {
    const candidate = await prisma.candidate.findMany({
      where: {
        electionId: election_id,
      },
      select: select,
    });

    return candidate;
  } catch (error) {
    throw new AppError('Candidate not Found', NOT_FOUND, error);
  }
};

export const getElectionByName = async (election_name, select = {}) => {
  try {
    const election = await prisma.election.findUnique({
      where: {
        title: election_name,
      },
      select: select,
    });

    return election;
  } catch (error) {
    throw new AppError('Election not Found', NOT_FOUND, error);
  }
};

export const checkOverlappingElection = async (
  constituencyId,
  startDate,
  endDate,
  electionType
) => {
  try {
    const election = await prisma.election.findMany({
      where: {
        constituencyId: constituencyId,
        electionType: electionType,
        AND: [
          {
            OR: [{ status: 'UPCOMING' }, { status: 'ONGOING' }],
          },
          {
            startDate: {
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
            },
          },
        ],
      },
    });

    return election;
  } catch (error) {
    throw new AppError('Error checking overlapping elections', INTERNAL_SERVER, error);
  }
};

export const createElection = async (payload) => {
  const { title, purpose, startDate, endDate, electionType, constituencyId, status } = payload;

  try {
    const election = await prisma.election.create({
      data: {
        title,
        purpose,
        startDate,
        endDate,
        electionType,
        status,
        constituency: {
          connect: {
            id: constituencyId,
          },
        },
      },
    });
    return election;
  } catch (error) {
    logger.error('Error creating election:', error);
    throw new AppError('Error creating election', INTERNAL_SERVER, error);
  }
};

export const addCandidates = async (payload) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const candidate of payload) {
        const created = await tx.candidate.create({
          data: {
            electionId: candidate.electionId,
            constituencyId: candidate.constituencyId,
            partyId: candidate.partyId,
            userId: candidate.userId,
          },
        });
        results.push(created);
      }

      return results;
    });

    return result;
  } catch (error) {
    throw new AppError('Error adding candidates', INTERNAL_SERVER, error);
  }
};

export const getVoteByElectionId = async (election_id, select = {}) => {
  try {
    const vote = await prisma.vote.findMany({
      where: {
        election_id: election_id,
      },
      select: select,
    });

    return vote;
  } catch (error) {
    throw new AppError('Vote not Found', NOT_FOUND, error);
  }
};

export const castVote = async (user_id, election_id, candidate_id) => {
  try {
    const vote = await prisma.vote.create({
      data: {
        user_id,
        election_id,
        candidate_id,
      },
    });
    return vote;
  } catch (error) {
    throw new AppError('Error casting vote', INTERNAL_SERVER, error);
  }
};

export const updateElectionStatus = async (election_id, winner_id) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.candidate.update({
        where: {
          id: winner_id,
        },
        data: {
          status: 'win',
        },
      });

      await tx.candidate.updateMany({
        where: {
          election_id: election_id,
          NOT: {
            id: winner_id,
          },
        },
        data: {
          status: 'lose',
        },
      });

      await tx.election.update({
        where: {
          id: election_id,
        },
        data: {
          result_declared: true,
        },
      });
    });
  } catch (error) {
    throw new AppError('Error updating election status', INTERNAL_SERVER, error);
  }
};
