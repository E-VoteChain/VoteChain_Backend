import logger from '../config/logger.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER, NOT_FOUND, OK } from '../constants/index.js';
import { getUserByIds, getVoterCount } from '../services/auth.services.js';
import {
  addCandidates,
  castVote,
  checkOverlappingElection,
  createElection,
  getCandidateByElectionId,
  getElectionById,
  getElectionByName,
  getVoteByElectionId,
  updateElectionStatus,
  queryElection,
  getWinnerByElectionId,
  getElectionVotes,
} from '../services/election.services.js';
import { getConstituencyById } from '../services/location.services.js';
import { AppError } from '../utils/AppError.js';
import { getElectionTags, getPriority } from '../utils/election.js';
import { generateCandidateDescription, generateManifestoDescription } from '../utils/fake-data.js';
import { formatError, unicodeToEmoji } from '../utils/helper.js';
import { errorResponse, successResponse } from '../utils/response.js';
import {
  addCandidateSchema,
  createElection as createElectionSchema,
  ResultSchema,
  voteSchema,
} from '../validations/index.js';

export const create_election = async (req, res) => {
  try {
    const validatedFields = createElectionSchema.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid election data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { title, purpose, startDate, endDate, constituencyId, electionType } =
      validatedFields.data;
    const election = await checkOverlappingElection(
      constituencyId,
      startDate,
      endDate,
      electionType
    );
    if (election.length > 0) {
      throw new AppError(
        `${electionType} election already exists in this constituency`,
        BAD_REQUEST
      );
    }

    const existingElection = await getElectionByName(title, {
      id: true,
    });

    if (existingElection) {
      throw new AppError('Election with this title already exists', BAD_REQUEST);
    }

    const { userId } = req.user;
    let status;
    const present = new Date();
    const start = new Date(startDate);

    if (present.getTime() < start.getTime()) {
      status = 'UPCOMING';
    }

    const payload = {
      title,
      purpose,
      startDate,
      endDate,
      constituencyId,
      electionType,
      userId,
      status,
    };

    const saved_election = await createElection(payload);
    return successResponse(res, saved_election, 'Election created successfully', CREATED, null);
  } catch (error) {
    console.error('Error creating election:', error);
    logger.error('Error creation election:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong ', error.message, INTERNAL_SERVER);
  }
};

export const get_elections = async (req, res) => {
  const { page, limit, sortBy } = req.query;
  const parsedFilter = {
    resultDeclared: false,
  };

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy: sortBy || 'createdAt',
    populate: 'constituency,candidates',
  };

  try {
    const { results } = await queryElection(parsedFilter, options);

    const filteredResults = results.filter((election) => {
      return election.candidates.length === 0;
    });

    const formattedElections = filteredResults.map(async (election) => {
      if (election.constituency) {
        election.states = await getConstituencyById(election.constituencyId, {
          id: true,
          name: true,
          mandal: {
            select: {
              name: true,
              district: {
                select: {
                  name: true,
                  state: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        });
      }

      const location = election.states;
      return {
        id: election.id,
        title: election.title,
        purpose: election.purpose,
        startDate: election.startDate,
        status: election.status,
        endDate: election.endDate,
        electionType: election.electionType,
        level: election.level,
        location: {
          constituencyId: election.constituencyId,
          constituencyName: location.name,
          mandalName: location.mandal.name,
          districtName: location.mandal.district.name,
          stateName: location.mandal.district.state.name,
        },
      };
    });

    const resolvedElections = await Promise.all(formattedElections);

    return successResponse(res, resolvedElections, 'Elections fetched successfully', OK, req.query);
  } catch (error) {
    console.error('Error fetching elections:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};

export const getElectionsResults = async (req, res) => {
  const { page, limit, sortBy } = req.query;

  const parsedFilter = {
    status: 'COMPLETED',
  };

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy: sortBy || 'createdAt',
    populate: 'constituency,candidates,votes',
  };

  try {
    const {
      results,
      page: currentPage,
      limit: currentLimit,
      totalPages,
      totalResults,
    } = await queryElection(parsedFilter, options);

    const users = await getUserByIds(
      results.flatMap((election) => election.candidates.map((c) => c.userId)),
      {
        id: true,
        walletAddress: true,
        userDetails: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        partyMembers: {
          select: {
            partyId: true,
            party: {
              select: {
                name: true,
                symbol: true,
              },
            },
          },
        },
      }
    );

    const formattedResult = results.map((election) => {
      const candidateVotes = election.candidates.map((candidate) => {
        const voteCount = election.votes.filter((v) => v.candidateId === candidate.id).length;
        return {
          candidateId: candidate.id,
          voteCount,
        };
      });

      const totalVotes = election.votes.length;

      const maxVotes = Math.max(...candidateVotes.map((cv) => cv.voteCount));

      const winners = candidateVotes
        .filter((cv) => cv.voteCount === maxVotes)
        .map((cv) => cv.candidateId);

      const isDraw = winners.length > 1;

      const candidatesWithVotes = election.candidates.map((candidate) => {
        const user = users.find((u) => u.id === candidate.userId);
        const voteCount =
          candidateVotes.find((cv) => cv.candidateId === candidate.id)?.voteCount || 0;
        const isWinner = winners.includes(candidate.id);

        return {
          id: candidate.id,
          userId: candidate.userId,
          firstName: user?.userDetails[0].firstName,
          lastName: user?.userDetails[0].lastName,
          profileImage: user?.userDetails[0].profileImage,
          party: {
            id: user?.partyMembers[0]?.partyId,
            name: user?.partyMembers[0]?.party.name,
            symbol: unicodeToEmoji(user?.partyMembers[0]?.party.symbol),
          },
          votes: voteCount,
          winner: isWinner,
        };
      });

      return {
        id: election.id,
        title: election.title,
        purpose: election.purpose,
        startDate: election.startDate,
        endDate: election.endDate,
        level: election.level,
        electionType: election.electionType,
        status: election.status,
        resultDeclared: election.resultDeclared,
        isDraw,
        totalVotes,
        constituency: {
          id: election.constituency.id,
          name: election.constituency.name,
        },
        candidates: candidatesWithVotes,
      };
    });

    return successResponse(res, formattedResult, 'Elections results fetched successfully', OK, {
      page: currentPage,
      limit: currentLimit,
      totalPages,
      totalResults,
    });
  } catch (error) {
    console.error('Error fetching elections results:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};

export const add_candidates = async (req, res) => {
  try {
    const validated = addCandidateSchema.safeParse(req.body);
    if (!validated.success) {
      throw new AppError('Invalid candidate data', BAD_REQUEST, formatError(validated.error));
    }

    const { electionId, constituencyId, candidates } = validated.data;
    const userIds = candidates.map((c) => c.userId.toString());

    const election = await getElectionById(electionId, {
      id: true,
      endDate: true,
      candidates: { select: { userId: true, partyId: true } },
    });
    if (!election) throw new AppError('Election not found', BAD_REQUEST);
    if (new Date(election.endDate) < new Date()) {
      throw new AppError('Election has already ended', BAD_REQUEST);
    }

    const users = await getUserByIds(userIds, {
      id: true,
      status: true,
      userDetails: { select: { firstName: true, lastName: true } },
    });
    const userMap = new Map(users.map((u) => [u.id.toString(), u]));

    const existingUserIds = new Set(election.candidates.map((c) => c.userId.toString()));
    const existingPartyIds = new Set(election.candidates.map((c) => c.partyId.toString()));
    const seenPartyIds = new Set();

    const notFound = [];
    const notApproved = [];
    const alreadyExists = [];
    const duplicateParties = [];

    for (const { userId, partyId } of candidates) {
      const uId = userId.toString();
      const pId = partyId.toString();
      const user = userMap.get(uId);

      if (!user) {
        notFound.push(uId);
        continue;
      }
      if (user.status !== 'APPROVED') {
        const name =
          `${user.userDetails?.firstName || ''} ${user.userDetails?.lastName || ''}`.trim();
        notApproved.push(name || uId);
        continue;
      }
      if (existingUserIds.has(uId)) {
        alreadyExists.push(uId);
        continue;
      }
      if (existingPartyIds.has(pId)) {
        duplicateParties.push(`Party ${pId} already has a candidate`);
      } else if (seenPartyIds.has(pId)) {
        duplicateParties.push(`Duplicate party in request: ${pId}`);
      } else {
        seenPartyIds.add(pId);
      }
    }

    const errors = [];
    if (notFound.length) errors.push(`User(s) not found: ${notFound.join(', ')}`);
    if (notApproved.length) errors.push(`Unapproved user(s): ${notApproved.join(', ')}`);
    if (alreadyExists.length) errors.push(`Already a candidate: ${alreadyExists.join(', ')}`);
    if (duplicateParties.length) errors.push(...duplicateParties);

    if (errors.length) {
      throw new AppError('Candidate validation failed', BAD_REQUEST, errors);
    }

    const payload = candidates.map(({ userId, partyId }) => ({
      userId,
      partyId,
      electionId,
      constituencyId,
    }));

    const result = await addCandidates(payload);
    const response = {
      electionId,
      candidates: result.map((c) => ({ id: c.id, userId: c.userId, partyId: c.partyId })),
    };
    return successResponse(res, response, 'Candidates added successfully', CREATED);
  } catch (error) {
    console.error('Error adding candidates:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};

export const cast_vote = async (req, res) => {
  try {
    const validatedFields = voteSchema.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid vote data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { electionId, candidateId } = validatedFields.data;

    const election = await getElectionById(electionId, {
      id: true,
      status: true,
      constituencyId: true,
    });

    const { userId } = req.user;
    const { constituencyId } = req.userDetails;

    if (!election) {
      throw new AppError('Election not found', BAD_REQUEST);
    }

    if (election.status !== 'ONGOING') {
      throw new AppError('Election is not ongoing', BAD_REQUEST);
    }

    if (election.constituencyId !== constituencyId) {
      throw new AppError('User does not belong to the constituency', BAD_REQUEST);
    }

    const votes = await getVoteByElectionId(electionId, {
      id: true,
      userId: true,
    });

    const existingVote = votes.find((vote) => vote.userId === userId);

    if (existingVote) {
      throw new AppError('User has already voted', BAD_REQUEST);
    }

    await castVote(userId, electionId, candidateId);

    return successResponse(res, null, 'Vote casted successfully', CREATED, null);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};

export const declare_result = async (req, res) => {
  try {
    const validatedFields = ResultSchema.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid result data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { electionId } = validatedFields.data;
    const election = await getElectionById(electionId, {
      id: true,
      status: true,
      constituencyId: true,
    });

    const candidate = await getCandidateByElectionId(electionId, {
      id: true,
      userId: true,
      status: true,
      _count: {
        select: {
          votes: true,
        },
      },
    });

    if (!election) {
      throw new AppError('Election not found', BAD_REQUEST);
    }

    if (election.status !== 'COMPLETED') {
      throw new AppError('Election is not completed', BAD_REQUEST);
    }

    if (candidate.length === 0) {
      throw new AppError('No candidates found for this election', BAD_REQUEST);
    }

    const winner = candidate.reduce((prev, current) => {
      return prev._count.votes > current._count.votes ? prev : current;
    });

    await updateElectionStatus(election.id, winner.id);

    return successResponse(res, null, 'Result declared successfully', CREATED, null);
  } catch (error) {
    console.error('Error declaring result:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};

export const get_elections_by_constituency = async (req, res) => {
  try {
    const { constituencyId } = req.userDetails;
    const { page, limit, sortBy } = req.query;

    const parsedFiler = {
      constituencyId,
    };
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || 'createdAt',
      populate: 'constituency,candidates,votes',
    };

    const totalVoters = await getVoterCount(constituencyId);

    const {
      results,
      page: currentPage,
      limit: currentLimit,
      totalPages,
      totalResults,
    } = await queryElection(parsedFiler, options);

    const formattedResults = results.map((election) => {
      return {
        id: election.id,
        title: election.title,
        purpose: election.purpose,
        startDate: election.startDate,
        endDate: election.endDate,
        priority: getPriority(election.electionType, election.level),
        electionType: election.electionType,
        status: election.status,
        level: election.level,
        constituency: {
          id: election.constituency.id,
          name: election.constituency.name,
        },
        candidates_count: election.candidates.length,
        votes_count: election.votes.length,
        totalVoters: totalVoters,
      };
    });

    return successResponse(res, formattedResults, 'Elections fetched successfully', OK, {
      page: currentPage,
      limit: currentLimit,
      totalPages,
      totalResults,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};

export const get_election_by_id = async (req, res) => {
  try {
    const validatedFields = ResultSchema.safeParse(req.query);
    if (!validatedFields.success) {
      throw new AppError('Invalid election ID', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { electionId } = validatedFields.data;
    const { userId } = req.user;

    const election = await getElectionById(electionId, {
      id: true,
      title: true,
      purpose: true,
      startDate: true,
      endDate: true,
      level: true,
      electionType: true,
      resultDeclared: true,
      status: true,
      constituency: {
        select: {
          id: true,
          name: true,
        },
      },
      votes: {
        where: {
          userId: userId,
        },
        select: {
          id: true,
        },
      },
      candidates: {
        select: {
          id: true,
          party: {
            select: {
              id: true,
              name: true,
              symbol: true,
            },
          },
          user: {
            select: {
              id: true,
              walletAddress: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                  dob: true,
                },
              },
            },
          },
          _count: {
            select: {
              votes: true,
            },
          },
        },
      },
    });

    if (!election) {
      throw new AppError('Election not found', NOT_FOUND);
    }

    const totalVoters = await getVoterCount(election.constituency.id);
    const hasVoted = Array.isArray(election.votes) && election.votes.length > 0;

    const formattedCandidates = election.candidates.map((candidate) => {
      const base = {
        id: candidate.id,
        party: {
          id: candidate.party.id,
          name: candidate.party.name,
          symbol: unicodeToEmoji(candidate.party.symbol),
          manifesto: generateManifestoDescription(),
        },
        user: {
          id: candidate.user.id,
          walletAddress: candidate.user.walletAddress,
          firstName: candidate.user.userDetails[0].firstName,
          lastName: candidate.user.userDetails[0].lastName,
          profileImage: candidate.user.userDetails[0].profileImage,
          dob: candidate.user.userDetails[0].dob,
          description: generateCandidateDescription(),
        },
      };

      if (election.resultDeclared) {
        base.votes = candidate._count.votes;
      }

      return base;
    });

    const formattedElection = {
      id: election.id,
      title: election.title,
      purpose: election.purpose,
      startDate: election.startDate,
      endDate: election.endDate,
      level: election.level,
      electionType: election.electionType,
      status: election.status,
      resultDeclared: election.resultDeclared,
      tags: getElectionTags(election.electionType, election.level),
      priority: getPriority(election.electionType, election.level),
      constituency: {
        id: election.constituency.id,
        name: election.constituency.name,
      },
      hasVoted,
      totalVoters,
      candidates: formattedCandidates,
    };

    if (election.status === 'ONGOING') {
      const totalVotesCast = await getElectionVotes(electionId);

      formattedElection.totalVotesCast = totalVotesCast;
    }

    if (election.resultDeclared) {
      const winner = await getWinnerByElectionId(electionId, {
        id: true,
        userId: true,
      });

      const winnerCandidate = formattedCandidates.find((c) => c.user.id === winner?.userId);

      formattedElection.winner = winner
        ? {
            id: winner.id,
            party: winnerCandidate?.party,
            user: winnerCandidate?.user,
            votes: winnerCandidate?.votes,
          }
        : null;
    }

    return successResponse(res, formattedElection, 'Election fetched successfully', OK, req.query);
  } catch (error) {
    console.error('Error fetching election by ID:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};
