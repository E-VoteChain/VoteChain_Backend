import logger from '../config/logger.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER, OK } from '../constants/index.js';
import { getUserByIds } from '../services/auth.services.js';
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
} from '../services/election.services.js';
import { getConstituencyById } from '../services/location.services.js';
import { AppError } from '../utils/AppError.js';
import { formatError } from '../utils/helper.js';
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

    const { election_id, candidate_id } = validatedFields.data;

    const election = await getElectionById(election_id, {
      id: true,
      status: true,
      constituency_id: true,
    });

    const { user_id } = req.user;
    const { constituency_id } = req.userDetails;

    if (!election) {
      throw new AppError('Election not found', BAD_REQUEST);
    }

    if (election.status !== 'ongoing') {
      throw new AppError('Election is not ongoing', BAD_REQUEST);
    }

    if (election.constituency_id !== constituency_id) {
      throw new AppError('User does not belong to the constituency', BAD_REQUEST);
    }

    const votes = await getVoteByElectionId(election_id, {
      id: true,
      user_id: true,
    });

    const existing_vote = votes.find((vote) => vote.user_id === user_id);

    if (existing_vote) {
      throw new AppError('User has already voted', BAD_REQUEST);
    }

    await castVote(user_id, election_id, candidate_id);

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

    const { election_id } = validatedFields.data;
    const election = await getElectionById(election_id, {
      id: true,
      status: true,
      constituency_id: true,
    });

    const candidate = await getCandidateByElectionId(election_id, {
      id: true,
      user_id: true,
      status: true,
      _count: {
        select: {
          Vote: true,
        },
      },
    });

    if (!election) {
      throw new AppError('Election not found', BAD_REQUEST);
    }

    if (election.status !== 'completed') {
      throw new AppError('Election is not completed', BAD_REQUEST);
    }

    if (candidate.length === 0) {
      throw new AppError('No candidates found for this election', BAD_REQUEST);
    }

    const winner = candidate.reduce((prev, current) => {
      return prev._count.Vote > current._count.Vote ? prev : current;
    });

    await updateElectionStatus(winner.id);

    return successResponse(res, null, 'Result declared successfully', CREATED, null);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};
