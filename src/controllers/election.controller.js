import logger from '../config/logger.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER } from '../constants/index.js';
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
} from '../services/election.services.js';
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

    const { title, purpose, start_date, end_date, constituency_id, election_type } =
      validatedFields.data;
    const election = await checkOverlappingElection(
      constituency_id,
      start_date,
      end_date,
      election_type
    );
    if (election.length > 0) {
      throw new AppError(
        `${election_type} election already exists in this constituency`,
        BAD_REQUEST
      );
    }

    const existingElection = await getElectionByName(title, {
      id: true,
    });

    if (existingElection) {
      throw new AppError('Election with this title already exists', BAD_REQUEST);
    }

    const { user_id } = req.user;
    let status;
    const present = new Date();
    const start = new Date(start_date);

    if (present.getTime() < start.getTime()) {
      status = 'upcoming';
    }

    const payload = {
      title,
      purpose,
      start_date,
      end_date,
      constituency_id,
      election_type,
      user_id,
      status,
    };

    const saved_election = await createElection(payload);
    return successResponse(res, saved_election, 'Election created successfully', CREATED, null);
  } catch (error) {
    logger.error('Error creation election:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong ', error.message, INTERNAL_SERVER);
  }
};

export const add_candidates = async (req, res) => {
  try {
    const validatedFields = addCandidateSchema.safeParse(req.body);
    if (!validatedFields.success) {
      throw new AppError('Invalid candidate data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { election_id, candidates } = validatedFields.data;
    const candidate_ids = candidates.map((c) => c.user_id);

    const election = await getElectionById(election_id, {
      id: true,
      end_date: true,
      Candidate: {
        select: {
          user_id: true,
          party_id: true,
        },
      },
    });

    if (!election) {
      throw new AppError('Election not found', BAD_REQUEST);
    }

    if (election.end_date < new Date()) {
      throw new AppError('Election has already ended', BAD_REQUEST);
    }

    const users = await getUserByIds(candidate_ids, {
      id: true,
      status: true,
      UserDetails: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
      leadParties: {
        select: {
          id: true,
          name: true,
        },
      },
      UserLocation: {
        select: {
          constituency_id: true,
        },
      },
    });

    const userMap = new Map(users.map((user) => [user.id.toString(), user]));

    const existingUserIds = new Set(election.Candidate.map((c) => c.user_id.toString()));
    const existingPartyIds = new Set(election.Candidate.map((c) => c.party_id?.toString()));

    const notFound = [];
    const notApproved = [];
    const alreadyExists = [];
    const duplicatePartyNames = new Set();
    const seenPartyIdsInRequest = new Set();

    for (const { user_id } of candidates) {
      const userIdStr = user_id.toString();
      const user = userMap.get(userIdStr);

      if (!user) {
        notFound.push(user_id);
        continue;
      }

      if (user.status !== 'approved') {
        const name =
          `${user.userDetails?.first_name ?? ''} ${user.userDetails?.last_name ?? ''}`.trim();
        notApproved.push(name || user.id);
        continue;
      }

      if (existingUserIds.has(userIdStr)) {
        const name =
          `${user.userDetails?.first_name ?? ''} ${user.userDetails?.last_name ?? ''}`.trim();
        alreadyExists.push(name || user.id);
        continue;
      }

      const party = user.leadParties?.[0];
      if (!party) {
        duplicatePartyNames.add(`User ${user.id} is not associated with a party`);
        continue;
      }

      const partyId = party.id.toString();

      if (existingPartyIds.has(partyId)) {
        duplicatePartyNames.add(`${party.name} already has a candidate in this election`);
      } else if (seenPartyIdsInRequest.has(partyId)) {
        duplicatePartyNames.add(`Duplicate party in request: ${party.name}`);
      } else {
        seenPartyIdsInRequest.add(partyId);
      }
    }

    const errors = [];
    if (notFound.length) errors.push(`User(s) not found: ${notFound.join(', ')}`);
    if (notApproved.length) errors.push(`Unapproved user(s): ${notApproved.join(', ')}`);
    if (alreadyExists.length) errors.push(`Already a candidate: ${alreadyExists.join(', ')}`);
    if (duplicatePartyNames.size) errors.push(...duplicatePartyNames);

    if (errors.length) {
      throw new AppError('Candidate validation failed', BAD_REQUEST, Array.from(errors));
    }

    const validCandidatesPayload = candidates.map(({ user_id, description }) => {
      const user = userMap.get(user_id.toString());

      return {
        user_id,
        party_id: user?.leadParties?.[0]?.id,
        description,
        election_id,
        constituency_id: user?.UserLocation?.[0]?.constituency_id,
      };
    });

    const result = await addCandidates(validCandidatesPayload);
    const response = {
      election_id,
      candidates: result.map((candidate) => {
        return {
          id: candidate.id,
          user_id: candidate.user_id,
          party_id: candidate.party_id,
        };
      }),
    };
    return successResponse(res, response, 'Candidates added successfully', CREATED, null);
  } catch (error) {
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
