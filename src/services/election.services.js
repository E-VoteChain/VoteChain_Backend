import prisma from '../config/db.js';
import logger from '../config/logger.js';
import { INTERNAL_SERVER, NOT_FOUND } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

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
    console.log('error', error);
    throw new AppError('Election not Found', NOT_FOUND, error);
  }
};

export const getCandidateByElectionId = async (election_id, select = {}) => {
  try {
    const candidate = await prisma.candidate.findMany({
      where: {
        election_id: election_id,
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
    console.log('error', error);
    throw new AppError('Election not Found', NOT_FOUND, error);
  }
};

export const checkOverlappingElection = async (
  constituency_id,
  start_date,
  end_date,
  election_type
) => {
  try {
    const election = await prisma.election.findMany({
      where: {
        constituency_id: constituency_id,
        election_type: election_type,
        AND: [
          {
            OR: [{ status: 'upcoming' }, { status: 'ongoing' }],
          },
          {
            start_date: {
              lte: end_date,
            },
          },
          {
            end_date: {
              gte: start_date,
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
  const { title, purpose, start_date, end_date, election_type, constituency_id, status } = payload;

  try {
    const election = await prisma.election.create({
      data: {
        title,
        purpose,
        start_date,
        end_date,
        election_type,
        status,
        constituency: {
          connect: {
            id: constituency_id,
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
      const candidates = payload.map((candidate) => {
        return tx.candidate.create({
          data: {
            user_id: candidate.user_id,
            election_id: candidate.election_id,
            constituency_id: candidate.constituency_id,
            party_id: candidate.party_id,
            description: candidate.description,
          },
        });
      });

      return await Promise.all(candidates);
    });
    return result;
  } catch (error) {
    console.log('error', error);
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
