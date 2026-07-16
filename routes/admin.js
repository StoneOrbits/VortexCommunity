const express = require('express');
const { User, PatternSet, Mode, Download, sequelize } = require('../models/pg/index');
const { Op } = require('sequelize');
const router = express.Router();

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.username === 'admin') {
    return next();
  }
  req.flash('error', 'Admin access required.');
  res.redirect((req.app.locals.basePath || '') + '/login');
}

router.get('/', isAdmin, async (req, res) => {
  const userCount = await User.count();
  const patternCount = await PatternSet.count();
  const modeCount = await Mode.count();
  const downloadCount = await Download.count();
  res.render('admin/index', { userCount, patternCount, modeCount, downloadCount, section: 'dashboard' });
});

router.get('/users', isAdmin, async (req, res) => {
  const { q, noContent, createdAfter, createdBefore, emailDomain, verified } = req.query;
  const where = {};

  if (q) {
    where[Op.or] = [
      { username: { [Op.iLike]: `%${q}%` } },
      { email: { [Op.iLike]: `%${q}%` } }
    ];
  }
  if (createdAfter) {
    where.createdAt = { ...(where.createdAt || {}), [Op.gte]: new Date(createdAfter) };
  }
  if (createdBefore) {
    where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(createdBefore + 'T23:59:59') };
  }
  if (emailDomain) {
    where.email = { ...where.email, [Op.iLike]: `%@${emailDomain}` };
  }
  if (verified === 'yes') {
    where.emailVerified = true;
  } else if (verified === 'no') {
    where.emailVerified = false;
  }

  if (noContent === 'yes') {
    const emptyUserIds = [];
    const patEmpty = await PatternSet.findAll({
      attributes: ['createdBy'],
      group: ['createdBy'],
      raw: true
    });
    const modEmpty = await Mode.findAll({
      attributes: ['createdBy'],
      group: ['createdBy'],
      raw: true
    });
    const contentCreatorIds = new Set([
      ...patEmpty.map(r => r.createdBy),
      ...modEmpty.map(r => r.createdBy)
    ]);
    const allUserIds = (await User.findAll({ attributes: ['id'], where, raw: true })).map(u => u.id);
    for (const id of allUserIds) {
      if (!contentCreatorIds.has(id)) emptyUserIds.push(id);
    }
    where.id = { [Op.in]: emptyUserIds };
  }

  const users = await User.findAll({ where, order: [['id', 'DESC']] });

  const userIds = users.map(u => u.id);
  const [patternRows, modeRows] = await Promise.all([
    PatternSet.findAll({
      attributes: ['createdBy', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { createdBy: userIds },
      group: ['createdBy'],
      raw: true
    }),
    Mode.findAll({
      attributes: ['createdBy', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { createdBy: userIds },
      group: ['createdBy'],
      raw: true
    })
  ]);

  const patCounts = {};
  patternRows.forEach(r => { patCounts[r.createdBy] = parseInt(r.count, 10); });
  const modCounts = {};
  modeRows.forEach(r => { modCounts[r.createdBy] = parseInt(r.count, 10); });

  users.forEach(u => {
    u.dataValues.patternCount = patCounts[u.id] || 0;
    u.dataValues.modeCount = modCounts[u.id] || 0;
  });

  const filters = { q, noContent, createdAfter, createdBefore, emailDomain, verified };
  res.render('admin/index', { users, section: 'users', filters });
});

router.post('/users/update-username', isAdmin, async (req, res) => {
  const { userId, newUsername } = req.body;
  const basePath = req.app.locals.basePath || '';
  try {
    await User.update({ username: newUsername }, { where: { id: userId } });
    req.flash('success', 'Username updated.');
  } catch (err) {
    req.flash('error', 'Failed to update username.');
  }
  res.redirect(basePath + '/control/users');
});

router.post('/users/delete', isAdmin, async (req, res) => {
  const { userId } = req.body;
  const basePath = req.app.locals.basePath || '';
  try {
    await User.destroy({ where: { id: userId } });
    req.flash('success', 'User deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete user.');
  }
  res.redirect(basePath + '/control/users');
});

router.post('/users/bulk-delete', isAdmin, async (req, res) => {
  const { userIds } = req.body;
  const basePath = req.app.locals.basePath || '';
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    req.flash('error', 'No users selected.');
    return res.redirect(basePath + '/control/users');
  }
  try {
    const count = await User.destroy({ where: { id: { [Op.in]: userIds } } });
    req.flash('success', `${count} user(s) deleted.`);
  } catch (err) {
    req.flash('error', 'Failed to delete users.');
  }
  res.redirect(basePath + '/control/users');
});

router.get('/patterns', isAdmin, async (req, res) => {
  const { q } = req.query;
  const page = Math.max(1, parseInt(req.query.page || 1, 10));
  const pageSize = 50;
  const where = q ? { name: { [Op.iLike]: `%${q}%` } } : {};
  const { count: totalCount, rows: patterns } = await PatternSet.findAndCountAll({
    where, order: [['id', 'DESC']],
    offset: (page - 1) * pageSize, limit: pageSize,
    include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
  });
  res.render('admin/index', { patterns, section: 'patterns', currentPage: page, pageCount: Math.ceil(totalCount / pageSize), totalCount, q });
});

router.post('/patterns/delete', isAdmin, async (req, res) => {
  const { patternId } = req.body;
  const basePath = req.app.locals.basePath || '';
  try {
    await PatternSet.destroy({ where: { id: patternId } });
    req.flash('success', 'Pattern deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete pattern.');
  }
  res.redirect(basePath + '/control/patterns');
});

router.get('/modes', isAdmin, async (req, res) => {
  const { q } = req.query;
  const page = Math.max(1, parseInt(req.query.page || 1, 10));
  const pageSize = 50;
  const where = q ? { name: { [Op.iLike]: `%${q}%` } } : {};
  const { count: totalCount, rows: modes } = await Mode.findAndCountAll({
    where, order: [['id', 'DESC']],
    offset: (page - 1) * pageSize, limit: pageSize,
    include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
  });
  res.render('admin/index', { modes, section: 'modes', currentPage: page, pageCount: Math.ceil(totalCount / pageSize), totalCount, q });
});

router.post('/modes/delete', isAdmin, async (req, res) => {
  const { modeId } = req.body;
  const basePath = req.app.locals.basePath || '';
  try {
    await Mode.destroy({ where: { id: modeId } });
    req.flash('success', 'Mode deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete mode.');
  }
  res.redirect(basePath + '/control/modes');
});

router.get('/downloads', isAdmin, async (req, res) => {
  const downloads = await Download.findAll({ order: [['id', 'DESC']] });
  res.render('admin/index', { downloads, section: 'downloads' });
});

router.post('/downloads/new', isAdmin, async (req, res) => {
  const basePath = req.app.locals.basePath || '';
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
  res.redirect(basePath + '/control/downloads');
});

router.post('/downloads/delete', isAdmin, async (req, res) => {
  const { downloadId } = req.body;
  const basePath = req.app.locals.basePath || '';
  try {
    await Download.destroy({ where: { id: downloadId } });
    req.flash('success', 'Download deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete download.');
  }
  res.redirect(basePath + '/control/downloads');
});

module.exports = router;
