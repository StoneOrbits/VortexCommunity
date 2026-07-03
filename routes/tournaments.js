const express = require('express');
const router = express.Router();
const { User, Tournament, TournamentRegistration, TournamentMatch, TournamentSRHistory, TournamentVote } = require('../models/pg/index');
const { Op } = require('sequelize');
const { ensureAuthenticated } = require('../middleware/checkAuth');

function bp(req) {
  return req.app.locals.basePath || '';
}

const ACTIVE_STATUSES = ['draft', 'registration', 'in_progress'];

router.get('/', async (req, res) => {
  try {
    const filter = req.query.filter || 'active';
    let where = {};
    if (filter === 'active') {
      where.status = { [Op.in]: ACTIVE_STATUSES };
    } else if (filter === 'completed') {
      where.status = 'completed';
    } else if (filter === 'archived') {
      where.status = 'archived';
    }

    const tournaments = await Tournament.findAll({
      where,
      include: [{ model: User, as: 'creator' }],
      order: [['createdAt', 'DESC']]
    });

    const registrationCounts = {};
    for (const t of tournaments) {
      const count = await TournamentRegistration.count({ where: { tournament_id: t.id } });
      registrationCounts[t.id] = count;
    }

    res.render('tournaments', {
      tournaments,
      registrationCounts,
      currentFilter: filter,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/create', ensureAuthenticated, (req, res) => {
  res.render('tournament-create', { user: req.user });
});

router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, type, max_participants } = req.body;

    if (!name || name.trim().length < 3) {
      req.flash('error', 'Tournament name must be at least 3 characters.');
      return res.redirect(bp(req) + '/tournaments/create');
    }

    const activeCount = await Tournament.count({
      where: { created_by: req.user.id, status: { [Op.in]: ACTIVE_STATUSES } }
    });
    if (activeCount > 0) {
      req.flash('error', 'You can only have one active tournament at a time.');
      return res.redirect(bp(req) + '/tournaments/create');
    }

    const registration_ends_at = req.body.registration_ends_at || null;
    const submission_ends_at = req.body.submission_ends_at || null;
    const voting_ends_at = req.body.voting_ends_at || null;

    const tournament = await Tournament.create({
      name: name.trim(),
      description: description || null,
      type: type || 'open',
      max_participants: parseInt(max_participants) || 16,
      created_by: req.user.id,
      status: 'draft',
      registration_ends_at,
      submission_ends_at,
      voting_ends_at
    });

    req.flash('success', 'Tournament created!');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create tournament.');
    res.redirect(bp(req) + '/tournaments/create');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator' },
        { model: TournamentRegistration, include: [{ model: User }] },
        { model: TournamentMatch, include: [
          { model: User, as: 'competitor1' },
          { model: User, as: 'competitor2' },
          { model: User, as: 'winner' },
          { model: TournamentVote }
        ]}
      ]
    });

    if (!tournament) return res.status(404).render('error', { message: 'Tournament not found' });

    // Auto-advance phases based on timeline
    const now = new Date();
    if (tournament.status === 'in_progress') {
      if (tournament.current_phase === 'submission' && tournament.submission_ends_at && new Date(tournament.submission_ends_at) <= now) {
        if (tournament.type === 'open') {
          tournament.current_phase = 'voting';
          await tournament.save();
          await TournamentMatch.update(
            { status: 'voting' },
            {
              where: {
                tournament_id: tournament.id,
                round: tournament.current_round,
                status: 'submission'
              }
            }
          );
        } else {
          tournament.current_phase = 'judging';
          await tournament.save();
          await TournamentMatch.update(
            { status: 'judging' },
            {
              where: {
                tournament_id: tournament.id,
                round: tournament.current_round,
                status: 'submission'
              }
            }
          );
        }
      } else if (tournament.current_phase === 'voting' && tournament.type === 'open' && tournament.voting_ends_at && new Date(tournament.voting_ends_at) <= now) {
        // Auto-compute winners from votes
        const roundMatches = await TournamentMatch.findAll({
          where: { tournament_id: tournament.id, round: tournament.current_round, status: 'voting' },
          include: [{ model: TournamentVote }]
        });
        for (const m of roundMatches) {
          const votes1 = m.TournamentVotes ? m.TournamentVotes.filter(v => v.competitor_id === m.competitor1_id).length : 0;
          const votes2 = m.TournamentVotes ? m.TournamentVotes.filter(v => v.competitor_id === m.competitor2_id).length : 0;
          if (votes1 !== votes2) {
            m.winner_id = votes1 > votes2 ? m.competitor1_id : m.competitor2_id;
          }
          m.status = 'completed';
          await m.save();

          // Advance winner to next round
          const nextRound = m.round + 1;
          const nextPos = Math.floor(m.position / 2);
          const nextMatch = await TournamentMatch.findOne({
            where: { tournament_id: tournament.id, round: nextRound, position: nextPos }
          });
          if (nextMatch && m.winner_id) {
            if (m.position % 2 === 0) {
              nextMatch.competitor1_id = m.winner_id;
            } else {
              nextMatch.competitor2_id = m.winner_id;
            }
            await nextMatch.save();
          }

          // SR update
          const srType = tournament.type === 'closed' ? 'closed_sr' : 'open_sr';
          if (m.winner_id) {
            const c1 = await User.findByPk(m.competitor1_id);
            const c2 = await User.findByPk(m.competitor2_id);
            const winner = m.winner_id === m.competitor1_id ? c1 : c2;
            const loser = m.winner_id === m.competitor1_id ? c2 : c1;
            if (winner && loser) {
              await updateSR(winner, loser, srType, tournament.id);
            }
          }
        }

        const remainingInRound = await TournamentMatch.count({
          where: { tournament_id: tournament.id, round: tournament.current_round, status: { [Op.ne]: 'completed' } }
        });
        if (remainingInRound === 0) {
          const nextRound = tournament.current_round + 1;
          const nextRoundMatches = await TournamentMatch.count({
            where: { tournament_id: tournament.id, round: nextRound }
          });
          if (nextRoundMatches === 0) {
            tournament.current_round = 0;
            tournament.current_phase = null;
            tournament.status = 'completed';
            await tournament.save();
          } else {
            tournament.current_round = nextRound;
            tournament.current_phase = 'submission';
            await tournament.save();
            await TournamentMatch.update(
              { status: 'submission' },
              { where: { tournament_id: tournament.id, round: nextRound } }
            );
          }
        }
      }
    }

    const isCreator = req.user && req.user.id === tournament.created_by;
    const isRegistered = req.user && tournament.TournamentRegistrations.some(r => r.user_id === req.user.id);
    let userMatch = null;
    if (req.user && tournament.status === 'in_progress') {
      userMatch = tournament.TournamentMatches.find(m =>
        (m.competitor1_id === req.user.id || m.competitor2_id === req.user.id) &&
        m.round === tournament.current_round &&
        m.status !== 'completed'
      );
    }
    const matchesByRound = {};
    for (const m of tournament.TournamentMatches) {
      if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
      matchesByRound[m.round].push(m);
    }
    const totalRounds = Object.keys(matchesByRound).length;

    res.render('tournament-detail', {
      tournament,
      matchesByRound,
      totalRounds,
      isCreator,
      isRegistered,
      userMatch,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/start-registration', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect(bp(req) + '/tournaments');
    }
    if (tournament.status !== 'draft') {
      req.flash('error', 'Tournament is not in draft status.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    tournament.status = 'registration';
    await tournament.save();
    req.flash('success', 'Registration is now open!');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to start registration.');
    res.redirect(bp(req) + '/tournaments');
  }
});

router.post('/:id/register', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament) {
      req.flash('error', 'Tournament not found.');
      return res.redirect(bp(req) + '/tournaments');
    }
    if (tournament.status !== 'registration') {
      req.flash('error', 'Registration is not open.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }
    if (tournament.type !== 'open') {
      req.flash('error', 'This is a closed tournament. The creator must add you.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    if (tournament.created_by === req.user.id) {
      req.flash('error', 'You cannot register for your own tournament.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const existing = await TournamentRegistration.findOne({
      where: { tournament_id: tournament.id, user_id: req.user.id }
    });
    if (existing) {
      req.flash('error', 'You are already registered.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const count = await TournamentRegistration.count({ where: { tournament_id: tournament.id } });
    if (count >= tournament.max_participants) {
      req.flash('error', 'Tournament is full.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    await TournamentRegistration.create({
      tournament_id: tournament.id,
      user_id: req.user.id
    });

    req.flash('success', 'You have joined the tournament!');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to register.');
    res.redirect(bp(req) + '/tournaments');
  }
});

router.post('/:id/add-player', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect(bp(req) + '/tournaments');
    }
    if (tournament.status !== 'registration') {
      req.flash('error', 'Registration is not open.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }
    if (tournament.type !== 'closed') {
      req.flash('error', 'This is an open tournament. Players can join themselves.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const { username } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const existing = await TournamentRegistration.findOne({
      where: { tournament_id: tournament.id, user_id: user.id }
    });
    if (existing) {
      req.flash('error', 'User is already registered.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const count = await TournamentRegistration.count({ where: { tournament_id: tournament.id } });
    if (count >= tournament.max_participants) {
      req.flash('error', 'Tournament is full.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    await TournamentRegistration.create({
      tournament_id: tournament.id,
      user_id: user.id
    });

    req.flash('success', `${user.username} has been added to the tournament!`);
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add player.');
    res.redirect(bp(req) + '/tournaments');
  }
});

function generateBracket(participantIds) {
  const n = participantIds.length;
  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(n)));
  const padded = [...participantIds];
  while (padded.length < nextPow2) {
    padded.push(null);
  }

  const pairs = [];
  for (let i = 0; i < padded.length / 2; i++) {
    pairs.push([padded[i], padded[padded.length - 1 - i]]);
  }

  const matches = [];
  for (let round = 1; round <= Math.log2(nextPow2); round++) {
    const matchesInRound = Math.pow(2, Math.log2(nextPow2) - round);
    for (let pos = 0; pos < matchesInRound; pos++) {
      matches.push({
        round,
        position: pos,
        competitor1_id: null,
        competitor2_id: null,
        status: 'pending'
      });
    }
  }

  const round1Count = matches.filter(m => m.round === 1).length;
  for (let i = 0; i < round1Count; i++) {
    if (i < pairs.length) {
      const [c1, c2] = pairs[i];
      if (c1 !== null && c2 !== null) {
        matches[i].competitor1_id = c1;
        matches[i].competitor2_id = c2;
      } else if (c1 !== null) {
        matches[i].competitor1_id = c1;
        matches[i].competitor2_id = c1;
        matches[i].status = 'completed';
        matches[i].winner_id = c1;
      } else if (c2 !== null) {
        matches[i].competitor1_id = c2;
        matches[i].competitor2_id = c2;
        matches[i].status = 'completed';
        matches[i].winner_id = c2;
      }
    }
  }

  return matches;
}

router.post('/:id/generate-bracket', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect(bp(req) + '/tournaments');
    }
    if (tournament.status !== 'registration') {
      req.flash('error', 'Tournament is not in registration.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const registrations = await TournamentRegistration.findAll({
      where: { tournament_id: tournament.id },
      include: [{ model: User }]
    });

    if (registrations.length < 2) {
      req.flash('error', 'Need at least 2 participants to generate a bracket.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const sorted = registrations.sort((a, b) => (b.User.open_sr + b.User.closed_sr) - (a.User.open_sr + a.User.closed_sr));
    const participantIds = sorted.map(r => r.user_id);

    const matches = generateBracket(participantIds);

    await TournamentMatch.destroy({ where: { tournament_id: tournament.id } });

    for (const m of matches) {
      await TournamentMatch.create({
        tournament_id: tournament.id,
        round: m.round,
        position: m.position,
        competitor1_id: m.competitor1_id,
        competitor2_id: m.competitor2_id,
        winner_id: m.winner_id,
        status: m.status
      });
    }

    const totalRounds = Math.max(...matches.map(m => m.round));
    tournament.current_round = 1;
    tournament.current_phase = 'submission';
    tournament.status = 'in_progress';
    await tournament.save();

    const round1Matches = await TournamentMatch.findAll({
      where: { tournament_id: tournament.id, round: 1 }
    });
    for (const m of round1Matches) {
      if (m.status === 'pending') {
        m.status = 'submission';
        await m.save();
      }
    }

    req.flash('success', 'Bracket generated! Round 1 is now in submission phase.');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to generate bracket.');
    res.redirect(bp(req) + '/tournaments');
  }
});

router.post('/:id/matches/:matchId/submit', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    const match = await TournamentMatch.findByPk(req.params.matchId);
    if (!tournament || !match || match.tournament_id !== tournament.id) {
      req.flash('error', 'Match not found.');
      return res.redirect(bp(req) + `/tournaments/${req.params.id}`);
    }
    if (tournament.status !== 'in_progress' || tournament.current_phase !== 'submission') {
      req.flash('error', 'Not in submission phase.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }
    if (match.round !== tournament.current_round) {
      req.flash('error', 'This match is not in the current round.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const youtubeUrl = req.body.youtube_url ? req.body.youtube_url.trim() : '';
    if (!youtubeUrl) {
      req.flash('error', 'YouTube URL is required.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
    if (!ytRegex.test(youtubeUrl)) {
      req.flash('error', 'Please provide a valid YouTube link.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    if (req.user.id === match.competitor1_id) {
      match.submission1_url = youtubeUrl;
    } else if (req.user.id === match.competitor2_id) {
      match.submission2_url = youtubeUrl;
    } else {
      req.flash('error', 'You are not a competitor in this match.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    if (match.submission1_url && match.submission2_url) {
      match.status = tournament.type === 'open' ? 'voting' : 'judging';
    }

    await match.save();
    req.flash('success', 'Submission received!');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to submit.');
    res.redirect(bp(req) + '/tournaments');
  }
});

async function updateSR(winner, loser, srType, tournamentId) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (loser[srType] - winner[srType]) / 400));
  const winnerGain = Math.round(K * (1 - expected));
  const loserLoss = Math.round(K * (0 - (1 - expected)));

  const winnerBefore = winner[srType];
  const loserBefore = loser[srType];
  winner[srType] += winnerGain;
  loser[srType] += loserLoss;

  await winner.save();
  await loser.save();

  await TournamentSRHistory.create({
    user_id: winner.id, tournament_id: tournamentId, sr_type: srType,
    sr_before: winnerBefore, sr_after: winner[srType]
  });
  await TournamentSRHistory.create({
    user_id: loser.id, tournament_id: tournamentId, sr_type: srType,
    sr_before: loserBefore, sr_after: loser[srType]
  });
}

router.post('/:id/matches/:matchId/vote', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    const match = await TournamentMatch.findByPk(req.params.matchId);
    if (!tournament || !match || match.tournament_id !== tournament.id) {
      req.flash('error', 'Match not found.');
      return res.redirect(bp(req) + `/tournaments/${req.params.id}`);
    }
    if (tournament.type !== 'open') {
      req.flash('error', 'Voting is only for open tournaments.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }
    if (match.status !== 'voting') {
      req.flash('error', 'This match is not in voting phase.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }
    if (req.user.id === match.competitor1_id || req.user.id === match.competitor2_id) {
      req.flash('error', 'Competitors cannot vote on their own match.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const competitorId = parseInt(req.body.competitor_id);
    if (competitorId !== match.competitor1_id && competitorId !== match.competitor2_id) {
      req.flash('error', 'Invalid competitor selection.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    const existing = await TournamentVote.findOne({
      where: { match_id: match.id, voter_id: req.user.id }
    });
    if (existing) {
      existing.competitor_id = competitorId;
      await existing.save();
      req.flash('success', 'Vote updated!');
    } else {
      await TournamentVote.create({
        match_id: match.id,
        voter_id: req.user.id,
        competitor_id: competitorId
      });
      req.flash('success', 'Vote cast!');
    }

    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to vote.');
    res.redirect(bp(req) + '/tournaments');
  }
});

async function declareWinnerAndAdvance(tournament, match, winnerId, req, res) {
  const srType = tournament.type === 'closed' ? 'closed_sr' : 'open_sr';

  const c1 = await User.findByPk(match.competitor1_id);
  const c2 = await User.findByPk(match.competitor2_id);
  const winner = winnerId === match.competitor1_id ? c1 : c2;
  const loser = winnerId === match.competitor1_id ? c2 : c1;

  match.winner_id = winnerId;
  match.status = 'completed';
  await match.save();

  if (winner && loser) {
    await updateSR(winner, loser, srType, tournament.id);
  }

  const nextRound = match.round + 1;
  const nextPos = Math.floor(match.position / 2);
  const nextMatch = await TournamentMatch.findOne({
    where: { tournament_id: tournament.id, round: nextRound, position: nextPos }
  });

  if (nextMatch) {
    if (match.position % 2 === 0) {
      nextMatch.competitor1_id = winnerId;
    } else {
      nextMatch.competitor2_id = winnerId;
    }
    await nextMatch.save();
  }

  const remainingInRound = await TournamentMatch.count({
    where: { tournament_id: tournament.id, round: match.round, status: { [Op.ne]: 'completed' } }
  });

  if (remainingInRound === 0) {
    const nextRoundMatches = await TournamentMatch.count({
      where: { tournament_id: tournament.id, round: nextRound }
    });
    if (nextRoundMatches === 0) {
      tournament.current_round = 0;
      tournament.current_phase = null;
      tournament.status = 'completed';
      await tournament.save();
    } else {
      const nextRoundPending = await TournamentMatch.count({
        where: { tournament_id: tournament.id, round: nextRound, competitor1_id: null }
      });
      if (nextRoundPending === 0) {
        tournament.current_round = nextRound;
        tournament.current_phase = 'submission';
        await tournament.save();
        await TournamentMatch.update(
          { status: 'submission' },
          { where: { tournament_id: tournament.id, round: nextRound } }
        );
      }
    }
  }
}

router.post('/:id/matches/:matchId/winner', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    const match = await TournamentMatch.findByPk(req.params.matchId);
    if (!tournament || !match || match.tournament_id !== tournament.id) {
      req.flash('error', 'Match not found.');
      return res.redirect(bp(req) + `/tournaments/${req.params.id}`);
    }
    if (tournament.created_by !== req.user.id) {
      req.flash('error', 'Only the tournament creator can declare winners.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    if (tournament.type === 'closed') {
      if (match.status !== 'judging') {
        req.flash('error', 'Match is not in judging phase.');
        return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
      }
    } else {
      if (match.status !== 'voting' && match.status !== 'judging') {
        req.flash('error', 'Match is not in a phase where a winner can be forced.');
        return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
      }
    }

    const winnerId = parseInt(req.body.winner_id);
    if (winnerId !== match.competitor1_id && winnerId !== match.competitor2_id) {
      req.flash('error', 'Invalid winner selection.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    await declareWinnerAndAdvance(tournament, match, winnerId, req, res);
    req.flash('success', 'Winner declared!');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to declare winner.');
    res.redirect(bp(req) + '/tournaments');
  }
});

router.post('/:id/advance-phase', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect(bp(req) + '/tournaments');
    }
    if (tournament.status !== 'in_progress') {
      req.flash('error', 'Tournament is not in progress.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    if (tournament.current_phase === 'submission') {
      const pendingSubmissions = await TournamentMatch.count({
        where: {
          tournament_id: tournament.id,
          round: tournament.current_round,
          status: 'submission'
        }
      });
      if (pendingSubmissions > 0) {
        req.flash('error', 'Not all competitors have submitted yet.');
        return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
      }
      const nextPhase = tournament.type === 'open' ? 'voting' : 'judging';
      tournament.current_phase = nextPhase;
      await tournament.save();
      await TournamentMatch.update(
        { status: nextPhase },
        {
          where: {
            tournament_id: tournament.id,
            round: tournament.current_round,
            status: 'submission'
          }
        }
      );
      req.flash('success', `Round ${tournament.current_round} is now in ${nextPhase} phase.`);
    } else if (tournament.current_phase === 'judging') {
      const pendingJudging = await TournamentMatch.count({
        where: {
          tournament_id: tournament.id,
          round: tournament.current_round,
          status: 'judging'
        }
      });
      if (pendingJudging > 0) {
        req.flash('error', 'Not all matches have been judged yet.');
        return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
      }
    } else if (tournament.current_phase === 'voting') {
      const pendingVoting = await TournamentMatch.count({
        where: {
          tournament_id: tournament.id,
          round: tournament.current_round,
          status: 'voting'
        }
      });
      if (pendingVoting > 0) {
        req.flash('error', 'Not all matches have votes cast yet.');
        return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
      }
    }

    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to advance phase.');
    res.redirect(bp(req) + '/tournaments');
  }
});

router.post('/:id/complete', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect(bp(req) + '/tournaments');
    }
    if (tournament.status !== 'in_progress') {
      req.flash('error', 'Tournament is not in progress.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    tournament.status = 'completed';
    tournament.current_round = 0;
    tournament.current_phase = null;
    await tournament.save();
    req.flash('success', 'Tournament completed!');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to complete tournament.');
    res.redirect(bp(req) + '/tournaments');
  }
});

router.post('/:id/archive', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect(bp(req) + '/tournaments');
    }
    if (tournament.status !== 'completed') {
      req.flash('error', 'Only completed tournaments can be archived.');
      return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
    }

    tournament.status = 'archived';
    await tournament.save();
    req.flash('success', 'Tournament archived.');
    res.redirect(bp(req) + '/tournaments');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to archive tournament.');
    res.redirect(bp(req) + '/tournaments');
  }
});

module.exports = router;
