const express = require('express');
const { User, PatternSet, Mode, Download } = require('../models/pg/index');
const { Op } = require('sequelize');
const router = express.Router();

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.username === 'admin') {
    return next();
  }
  req.flash('error', 'Admin access required.');
  res.redirect('/login');
}

router.get('/', isAdmin, async (req, res) => {
  const userCount = await User.count();
  const patternCount = await PatternSet.count();
  const modeCount = await Mode.count();
  const downloadCount = await Download.count();
  res.render('admin/index', { userCount, patternCount, modeCount, downloadCount, section: 'dashboard' });
});

router.get('/users', isAdmin, async (req, res) => {
  const { q } = req.query;
  const where = q
    ? { [Op.or]: [{ username: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }] }
    : {};
  const users = await User.findAll({ where, order: [['id', 'DESC']] });
  res.render('admin/index', { users, section: 'users' });
});

router.post('/users/update-username', isAdmin, async (req, res) => {
  const { userId, newUsername } = req.body;
  try {
    await User.update({ username: newUsername }, { where: { id: userId } });
    req.flash('success', 'Username updated.');
  } catch (err) {
    req.flash('error', 'Failed to update username.');
  }
  res.redirect('/control/users');
});

router.post('/users/delete', isAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    await User.destroy({ where: { id: userId } });
    req.flash('success', 'User deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete user.');
  }
  res.redirect('/control/users');
});

router.get('/patterns', isAdmin, async (req, res) => {
  const { q } = req.query;
  const where = q ? { name: { [Op.iLike]: `%${q}%` } } : {};
  const patterns = await PatternSet.findAll({
    where, order: [['id', 'DESC']],
    include: [{ model: User, as: 'creator', attributes: ['username'] }]
  });
  res.render('admin/index', { patterns, section: 'patterns' });
});

router.post('/patterns/delete', isAdmin, async (req, res) => {
  const { patternId } = req.body;
  try {
    await PatternSet.destroy({ where: { id: patternId } });
    req.flash('success', 'Pattern deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete pattern.');
  }
  res.redirect('/control/patterns');
});

router.get('/modes', isAdmin, async (req, res) => {
  const { q } = req.query;
  const where = q ? { name: { [Op.iLike]: `%${q}%` } } : {};
  const modes = await Mode.findAll({
    where, order: [['id', 'DESC']],
    include: [{ model: User, as: 'creator', attributes: ['username'] }]
  });
  res.render('admin/index', { modes, section: 'modes' });
});

router.post('/modes/delete', isAdmin, async (req, res) => {
  const { modeId } = req.body;
  try {
    await Mode.destroy({ where: { id: modeId } });
    req.flash('success', 'Mode deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete mode.');
  }
  res.redirect('/control/modes');
});

router.get('/downloads', isAdmin, async (req, res) => {
  const downloads = await Download.findAll({ order: [['id', 'DESC']] });
  res.render('admin/index', { downloads, section: 'downloads' });
});

router.post('/downloads/new', isAdmin, async (req, res) => {
  try {
    await Download.create({
      device: req.body.device,
      version: req.body.version,
      category: req.body.category,
      fileUrl: req.body.fileUrl,
      fileSize: req.body.fileSize ? parseInt(req.body.fileSize) : 0,
      releaseDate: req.body.releaseDate || new Date(),
    });
    req.flash('success', 'Download created.');
  } catch (err) {
    req.flash('error', 'Failed to create download.');
  }
  res.redirect('/control/downloads');
});

router.post('/downloads/delete', isAdmin, async (req, res) => {
  const { downloadId } = req.body;
  try {
    await Download.destroy({ where: { id: downloadId } });
    req.flash('success', 'Download deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete download.');
  }
  res.redirect('/control/downloads');
});

module.exports = router;
