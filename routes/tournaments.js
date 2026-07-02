const express = require('express');
const router = express.Router();
const { User, Tournament, TournamentRegistration, TournamentMatch, TournamentSRHistory, PatternSet } = require('../models/pg/index');
const { Op } = require('sequelize');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const sequelize = require('../config/database-pg');

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
      return res.redirect('/tournaments/create');
    }

    const activeCount = await Tournament.count({
      where: { created_by: req.user.id, status: { [Op.in]: ACTIVE_STATUSES } }
    });
    if (activeCount > 0) {
      req.flash('error', 'You can only have one active tournament at a time.');
      return res.redirect('/tournaments/create');
    }

    const tournament = await Tournament.create({
      name: name.trim(),
      description: description || null,
      type: type || 'open',
      max_participants: parseInt(max_participants) || 16,
      created_by: req.user.id,
      status: 'draft'
    });

    TournamentRegistration.create({
      tournament_id: tournament.id,
      user_id: req.user.id
    });

    req.flash('success', 'Tournament created!');
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create tournament.');
    res.redirect('/tournaments/create');
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
    const userPatterns = req.user ? await PatternSet.findAll({ where: { createdBy: req.user.id } }) : [];

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
      userPatterns,
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
      return res.redirect('/tournaments');
    }
    if (tournament.status !== 'draft') {
      req.flash('error', 'Tournament is not in draft status.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    tournament.status = 'registration';
    await tournament.save();
    req.flash('success', 'Registration is now open!');
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to start registration.');
    res.redirect('/tournaments');
  }
});

router.post('/:id/register', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament) {
      req.flash('error', 'Tournament not found.');
      return res.redirect('/tournaments');
    }
    if (tournament.status !== 'registration') {
      req.flash('error', 'Registration is not open.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }
    if (tournament.type !== 'open') {
      req.flash('error', 'This is a closed tournament. The creator must add you.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const existing = await TournamentRegistration.findOne({
      where: { tournament_id: tournament.id, user_id: req.user.id }
    });
    if (existing) {
      req.flash('error', 'You are already registered.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const count = await TournamentRegistration.count({ where: { tournament_id: tournament.id } });
    if (count >= tournament.max_participants) {
      req.flash('error', 'Tournament is full.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    await TournamentRegistration.create({
      tournament_id: tournament.id,
      user_id: req.user.id
    });

    req.flash('success', 'You have joined the tournament!');
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to register.');
    res.redirect('/tournaments');
  }
});

router.post('/:id/add-player', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect('/tournaments');
    }
    if (tournament.status !== 'registration') {
      req.flash('error', 'Registration is not open.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }
    if (tournament.type !== 'closed') {
      req.flash('error', 'This is an open tournament. Players can join themselves.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const { username } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const existing = await TournamentRegistration.findOne({
      where: { tournament_id: tournament.id, user_id: user.id }
    });
    if (existing) {
      req.flash('error', 'User is already registered.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const count = await TournamentRegistration.count({ where: { tournament_id: tournament.id } });
    if (count >= tournament.max_participants) {
      req.flash('error', 'Tournament is full.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    await TournamentRegistration.create({
      tournament_id: tournament.id,
      user_id: user.id
    });

    req.flash('success', `${user.username} has been added to the tournament!`);
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add player.');
    res.redirect('/tournaments');
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
      return res.redirect('/tournaments');
    }
    if (tournament.status !== 'registration') {
      req.flash('error', 'Tournament is not in registration.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const registrations = await TournamentRegistration.findAll({
      where: { tournament_id: tournament.id },
      include: [{ model: User }]
    });

    if (registrations.length < 2) {
      req.flash('error', 'Need at least 2 participants to generate a bracket.');
      return res.redirect(`/tournaments/${tournament.id}`);
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
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to generate bracket.');
    res.redirect('/tournaments');
  }
});

router.post('/:id/matches/:matchId/submit', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    const match = await TournamentMatch.findByPk(req.params.matchId);
    if (!tournament || !match || match.tournament_id !== tournament.id) {
      req.flash('error', 'Match not found.');
      return res.redirect(`/tournaments/${req.params.id}`);
    }
    if (tournament.status !== 'in_progress' || tournament.current_phase !== 'submission') {
      req.flash('error', 'Not in submission phase.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }
    if (match.round !== tournament.current_round) {
      req.flash('error', 'This match is not in the current round.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const patternId = parseInt(req.body.patternset_id);
    const pattern = await PatternSet.findByPk(patternId);
    if (!pattern || pattern.createdBy !== req.user.id) {
      req.flash('error', 'Invalid pattern selection.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    if (req.user.id === match.competitor1_id) {
      match.patternset1_id = patternId;
    } else if (req.user.id === match.competitor2_id) {
      match.patternset2_id = patternId;
    } else {
      req.flash('error', 'You are not a competitor in this match.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    if (match.patternset1_id && match.patternset2_id) {
      match.status = 'judging';
    }

    await match.save();
    req.flash('success', 'Submission received!');
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to submit.');
    res.redirect('/tournaments');
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

router.post('/:id/matches/:matchId/winner', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    const match = await TournamentMatch.findByPk(req.params.matchId, {
      include: [
        { model: User, as: 'competitor1' },
        { model: User, as: 'competitor2' }
      ]
    });
    if (!tournament || !match || match.tournament_id !== tournament.id) {
      req.flash('error', 'Match not found.');
      return res.redirect(`/tournaments/${req.params.id}`);
    }
    if (tournament.created_by !== req.user.id) {
      req.flash('error', 'Only the tournament creator can declare winners.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }
    if (match.status !== 'judging') {
      req.flash('error', 'Match is not in judging phase.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    const winnerId = parseInt(req.body.winner_id);
    if (winnerId !== match.competitor1_id && winnerId !== match.competitor2_id) {
      req.flash('error', 'Invalid winner selection.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    match.winner_id = winnerId;
    match.status = 'completed';
    await match.save();

    const srType = tournament.type === 'closed' ? 'closed_sr' : 'open_sr';
    const winner = winnerId === match.competitor1_id ? match.competitor1 : match.competitor2;
    const loser = winnerId === match.competitor1_id ? match.competitor2 : match.competitor1;
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
        req.flash('success', 'Tournament completed!');
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

    req.flash('success', 'Winner declared!');
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to declare winner.');
    res.redirect('/tournaments');
  }
});

router.post('/:id/advance-phase', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect('/tournaments');
    }
    if (tournament.status !== 'in_progress') {
      req.flash('error', 'Tournament is not in progress.');
      return res.redirect(`/tournaments/${tournament.id}`);
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
        return res.redirect(`/tournaments/${tournament.id}`);
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
      const pendingJudging = await TournamentMatch.count({
        where: {
          tournament_id: tournament.id,
          round: tournament.current_round,
          status: 'judging'
        }
      });
      if (pendingJudging > 0) {
        req.flash('error', 'Not all matches have been judged yet.');
        return res.redirect(`/tournaments/${tournament.id}`);
      }
    }

    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to advance phase.');
    res.redirect('/tournaments');
  }
});

router.post('/:id/complete', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect('/tournaments');
    }
    if (tournament.status !== 'in_progress') {
      req.flash('error', 'Tournament is not in progress.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    tournament.status = 'completed';
    tournament.current_round = 0;
    tournament.current_phase = null;
    await tournament.save();
    req.flash('success', 'Tournament completed!');
    res.redirect(`/tournaments/${tournament.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to complete tournament.');
    res.redirect('/tournaments');
  }
});

router.post('/:id/archive', ensureAuthenticated, async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);
    if (!tournament || tournament.created_by !== req.user.id) {
      req.flash('error', 'Not authorized.');
      return res.redirect('/tournaments');
    }
    if (tournament.status !== 'completed') {
      req.flash('error', 'Only completed tournaments can be archived.');
      return res.redirect(`/tournaments/${tournament.id}`);
    }

    tournament.status = 'archived';
    await tournament.save();
    req.flash('success', 'Tournament archived.');
    res.redirect('/tournaments');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to archive tournament.');
    res.redirect('/tournaments');
  }
});

module.exports = router;
