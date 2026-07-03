const express = require('express');
const router = express.Router();
const { User, Tournament, TournamentRegistration, TournamentMatch, TournamentSRHistory } = require('../models/pg/index');
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

    const lbRawPage = Math.max(1, parseInt(req.query.lbPage) || 1);
    const lbLimit = 15;

    const lbTotal = await User.count();
    const lbTotalPages = Math.max(1, Math.ceil(lbTotal / lbLimit));
    const lbPage = Math.min(lbRawPage, lbTotalPages);
    const lbOffset = (lbPage - 1) * lbLimit;

    const lbUsers = await User.findAll({
      order: [['sr', 'DESC']],
      attributes: ['id', 'username', 'profilePic', 'sr'],
      limit: lbLimit,
      offset: lbOffset
    });

    const ranked = lbUsers.map((u, i) => ({
      rank: lbOffset + i + 1,
      id: u.id,
      username: u.username,
      profilePic: u.profilePic,
      sr: u.sr
    }));

    res.render('tournaments', {
      tournaments,
      registrationCounts,
      currentFilter: filter,
      ranked,
      lbPage,
      lbTotalPages,
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
    const { name, description, type, max_participants, judging_type } = req.body;

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

    const registration_ends_at = req.body.registration_ends_at ? new Date(req.body.registration_ends_at + 'T23:59:59') : null;
    const submission_duration = parseInt(req.body.submission_duration) || 72;

    let submission_ends_at = null;
    if (registration_ends_at) {
      submission_ends_at = new Date(registration_ends_at.getTime() + submission_duration * 60 * 60 * 1000);
    }

    const tournament = await Tournament.create({
      name: name.trim(),
      description: description || null,
      type: type || 'open',
      judging_type: judging_type || 'closed',
      max_participants: parseInt(max_participants) || 16,
      created_by: req.user.id,
      status: 'draft',
      registration_ends_at,
      submission_ends_at,
      submission_duration_hours: submission_duration
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
          { model: User, as: 'winner' }
        ]}
      ]
    });

    if (!tournament) return res.status(404).render('error', { message: 'Tournament not found' });

    // Auto-advance phases based on timeline
    const now = new Date();
    if (tournament.status === 'in_progress') {
      if (tournament.current_phase === 'submission' && tournament.submission_ends_at && new Date(tournament.submission_ends_at) <= now) {
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
    for (const round in matchesByRound) {
      matchesByRound[round].sort((a, b) => a.position - b.position);
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

    if (user.id === tournament.created_by) {
      req.flash('error', 'You cannot add yourself to your own tournament.');
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

      const sorted = registrations.sort((a, b) => (b.User.sr) - (a.User.sr));
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

    await updateSubmissionEndsAt(tournament);

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

    await match.save();
    req.flash('success', 'Submission received!');
    res.redirect(bp(req) + `/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to submit.');
    res.redirect(bp(req) + '/tournaments');
  }
});

async function updateSR(winner, loser, tournamentId) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (loser.sr - winner.sr) / 400));
  const winnerGain = Math.round(K * (1 - expected));
  const loserLoss = Math.round(K * (0 - (1 - expected)));

  const winnerBefore = winner.sr;
  const loserBefore = loser.sr;
  winner.sr += winnerGain;
  loser.sr += loserLoss;

  await winner.save();
  await loser.save();

  await TournamentSRHistory.create({
    user_id: winner.id, tournament_id: tournamentId,
    sr_before: winnerBefore, sr_after: winner.sr
  });
  await TournamentSRHistory.create({
    user_id: loser.id, tournament_id: tournamentId,
    sr_before: loserBefore, sr_after: loser.sr
  });
}

async function updateSubmissionEndsAt(tournament) {
  if (tournament.submission_duration_hours) {
    tournament.submission_ends_at = new Date(Date.now() + tournament.submission_duration_hours * 60 * 60 * 1000);
    await tournament.save();
  }
}

async function fetchYoutubeLikes(url) {
  if (!url) return 0;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (!match) return 0;
  try {
    const res = await fetch('https://www.youtube.com/watch?v=' + match[1]);
    const html = await res.text();
    const likeCountMatch = html.match(/"likeCount":"(\d+)"/);
    if (likeCountMatch) {
      return parseInt(likeCountMatch[1], 10) || 0;
    }
    const likesMatch = html.match(/"label":"(\d[\d,.]*)\s*likes?"/);
    if (likesMatch) {
      return parseInt(likesMatch[1].replace(/,/g, '')) || 0;
    }
    const simpleMatch = html.match(/(\d[\d,]*)\s*likes?\s*<\/span>/i);
    if (simpleMatch) {
      return parseInt(simpleMatch[1].replace(/,/g, '')) || 0;
    }
    const jsonLdMatch = html.match(/"interactionStatistic"[^}]*"userInteractionCount":(\d+)/);
    if (jsonLdMatch) {
      return parseInt(jsonLdMatch[1], 10) || 0;
    }
    return 0;
  } catch (e) {
    console.error('Failed to fetch YouTube likes for', url, e);
    return 0;
  }
}

async function resolveYoutubeLikesRound(tournament) {
  const round = tournament.current_round;
  const roundMatches = await TournamentMatch.findAll({
    where: {
      tournament_id: tournament.id,
      round,
      status: { [Op.in]: ['submission', 'judging'] }
    }
  });

  if (roundMatches.length === 0) return false;

  // Fetch ALL likes in parallel so all videos are sampled at the same moment
  const likePromises = roundMatches.map(m => {
    if (!m.submission1_url || !m.submission2_url) return null;
    return Promise.all([
      fetchYoutubeLikes(m.submission1_url),
      fetchYoutubeLikes(m.submission2_url)
    ]);
  });
  const likeResults = await Promise.all(likePromises);

  let anyResolved = false;

  for (let i = 0; i < roundMatches.length; i++) {
    const m = roundMatches[i];
    const likes = likeResults[i];
    if (!likes) continue;

    const [likes1, likes2] = likes;
    if (likes1 === 0 && likes2 === 0) {
      console.warn('Could not fetch likes for match', m.id, m.submission1_url, m.submission2_url);
      continue;
    }

    try {
      const winnerId = likes1 > likes2 ? m.competitor1_id : m.competitor2_id;
      m.winner_id = winnerId;
      m.status = 'completed';
      m.likes1 = likes1;
      m.likes2 = likes2;
      await m.save();

      const c1 = await User.findByPk(m.competitor1_id);
      const c2 = await User.findByPk(m.competitor2_id);
      const winner = winnerId === m.competitor1_id ? c1 : c2;
      const loser = winnerId === m.competitor1_id ? c2 : c1;
      if (winner && loser) {
        await updateSR(winner, loser, tournament.id);
      }

      const nextRound = m.round + 1;
      const nextPos = Math.floor(m.position / 2);
      const nextMatch = await TournamentMatch.findOne({
        where: { tournament_id: tournament.id, round: nextRound, position: nextPos }
      });
      if (nextMatch && winnerId) {
        if (m.position % 2 === 0) {
          nextMatch.competitor1_id = winnerId;
        } else {
          nextMatch.competitor2_id = winnerId;
        }
        await nextMatch.save();
      }

      anyResolved = true;
    } catch (e) {
      console.error('Failed to process match', m.id, e);
    }
  }

  return anyResolved;
}

async function advanceTournamentRound(tournament) {
  const remaining = await TournamentMatch.count({
    where: { tournament_id: tournament.id, round: tournament.current_round, status: { [Op.ne]: 'completed' } }
  });
  if (remaining > 0) return;

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
    // Promote winners from current round into next-round slots
    const prevMatches = await TournamentMatch.findAll({
      where: { tournament_id: tournament.id, round: tournament.current_round, status: 'completed' }
    });
    for (const m of prevMatches) {
      if (!m.winner_id) continue;
      const nextPos = Math.floor(m.position / 2);
      const nextMatch = await TournamentMatch.findOne({
        where: { tournament_id: tournament.id, round: nextRound, position: nextPos }
      });
      if (!nextMatch) continue;
      if (m.position % 2 === 0) {
        if (!nextMatch.competitor1_id) nextMatch.competitor1_id = m.winner_id;
      } else {
        if (!nextMatch.competitor2_id) nextMatch.competitor2_id = m.winner_id;
      }
      await nextMatch.save();
    }

    tournament.current_round = nextRound;
    tournament.current_phase = 'submission';
    await tournament.save();
    await updateSubmissionEndsAt(tournament);
    await TournamentMatch.update(
      { status: 'submission' },
      { where: { tournament_id: tournament.id, round: nextRound } }
    );
  }
}

async function declareWinnerAndAdvance(tournament, match, winnerId) {
  const c1 = await User.findByPk(match.competitor1_id);
  const c2 = await User.findByPk(match.competitor2_id);
  const winner = winnerId === match.competitor1_id ? c1 : c2;
  const loser = winnerId === match.competitor1_id ? c2 : c1;

  match.winner_id = winnerId;
  match.status = 'completed';
  await match.save();

  if (winner && loser && tournament.judging_type === 'youtube_likes') {
    await updateSR(winner, loser, tournament.id);
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

  await advanceTournamentRound(tournament);
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

    if (tournament.judging_type === 'youtube_likes') {
      if (match.status !== 'judging' && match.status !== 'submission') {
        req.flash('error', 'Match is not in a phase where a winner can be declared.');
        return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
      }
    } else {
      if (match.status !== 'judging') {
        req.flash('error', 'Match is not in judging phase.');
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
          status: 'submission',
          [Op.or]: [
            { submission1_url: null },
            { submission2_url: null }
          ]
        }
      });
      if (pendingSubmissions > 0) {
        req.flash('error', 'Not all competitors have submitted yet.');
        return res.redirect(bp(req) + `/tournaments/${tournament.id}`);
      }

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
      req.flash('success', `Round ${tournament.current_round} is now in judging phase.`);
    } else if (tournament.current_phase === 'judging') {
      if (tournament.judging_type === 'youtube_likes') {
        const resolved = await resolveYoutubeLikesRound(tournament);
        if (resolved) {
          await advanceTournamentRound(tournament);
          req.flash('success', 'Round resolved by YouTube likes!');
        } else {
          const remaining = await TournamentMatch.count({
            where: {
              tournament_id: tournament.id,
              round: tournament.current_round,
              status: { [Op.ne]: 'completed' }
            }
          });
          if (remaining === 0) {
            await advanceTournamentRound(tournament);
            req.flash('success', 'Round advanced!');
          } else {
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
            req.flash('success', 'No matches to resolve.');
          }
        }
      } else {
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
        await advanceTournamentRound(tournament);
        req.flash('success', 'Round advanced!');
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
