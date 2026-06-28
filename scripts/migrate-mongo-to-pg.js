#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const { sequelize, syncDatabase, User, PatternSet, Mode, Download,
        UserFavoritePattern, UserFavoriteMode, PatternSetUpvote,
        ModeUpvote, ModePatternSet } = require('../models/pg/index');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vortexcommunity';

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const mongo = mongoose.connection.db;

  console.log('Connecting to PostgreSQL...');
  await sequelize.authenticate();
  // Drop and recreate mode_pattern_sets to fix PK from (modeId,patternSetId) to (modeId,sortOrder)
  await sequelize.query('DROP TABLE IF EXISTS "mode_pattern_sets" CASCADE');
  await syncDatabase();
  // Remove the auto-created unique constraint on (modeId, patternSetId); duplicates are allowed
  try { await sequelize.query('ALTER TABLE "mode_pattern_sets" DROP CONSTRAINT IF EXISTS "mode_pattern_sets_modeId_patternSetId_key" CASCADE'); } catch (e) {}

  // Clear existing data for a fresh migration
  const tables = ['user_favorite_patterns', 'user_favorite_modes', 'pattern_set_upvotes',
                  'mode_upvotes', 'mode_pattern_sets', 'pattern_sets', 'modes', 'downloads', 'users'];
  for (const table of tables) {
    await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
  console.log('Cleared existing PostgreSQL data');

  const mongoUsers = await mongo.collection('users').find({}).toArray();
  const mongoPatternsets = await mongo.collection('patternsets').find({}).toArray();
  const mongoModes = await mongo.collection('modes').find({}).toArray();
  const mongoDownloads = await mongo.collection('downloads').find({}).toArray();

  console.log(`Found: ${mongoUsers.length} users, ${mongoPatternsets.length} patternsets, ${mongoModes.length} modes, ${mongoDownloads.length} downloads`);

  // Map old ObjectId -> new integer id
  const userMap = new Map();
  const patternSetMap = new Map();
  const modeMap = new Map();

  // Migrate users
  console.log('\nMigrating users...');
  for (const u of mongoUsers) {
    const oldId = u._id.toString();
    const user = await User.create({
      username: u.username,
      email: u.email || null,
      password: u.password,
      profilePic: u.profilePic || null,
      bio: u.bio || null,
      emailVerified: u.emailVerified || false,
      verificationToken: u.verificationToken || null,
      createdAt: u.uploadDate || u._id.getTimestamp() || new Date(),
      updatedAt: new Date()
    });
    userMap.set(oldId, user.id);
  }
  console.log(`  ${userMap.size} users migrated`);

  const getUserId = (oid) => {
    if (!oid) return null;
    const id = userMap.get(oid.toString());
    return id || null;
  };

  // Migrate patternsets
  console.log('Migrating pattern sets...');
  for (const ps of mongoPatternsets) {
    const oldId = ps._id.toString();
    const patternSet = await PatternSet.create({
      name: ps.name,
      description: ps.description || null,
      data: ps.data,
      dataHash: ps.dataHash,
      votes: ps.votes || 0,
      uploadDate: ps.uploadDate || new Date(),
      createdBy: getUserId(ps.createdBy),
      createdAt: ps.uploadDate || new Date(),
      updatedAt: new Date()
    });
    patternSetMap.set(oldId, patternSet.id);
  }
  console.log(`  ${patternSetMap.size} pattern sets migrated`);

  const getPatternSetId = (oid) => {
    if (!oid) return null;
    return patternSetMap.get(oid.toString()) || null;
  };

  // Migrate upvotes for patternsets
  console.log('Migrating pattern set upvotes...');
  let upvoteCount = 0;
  for (const ps of mongoPatternsets) {
    const newPsId = getPatternSetId(ps._id);
    if (!newPsId) continue;
    if (ps.upvotedBy && Array.isArray(ps.upvotedBy)) {
      for (const userId of ps.upvotedBy) {
        const newUserId = getUserId(userId);
        if (newUserId) {
          await PatternSetUpvote.findOrCreate({ where: { patternSetId: newPsId, userId: newUserId } });
          upvoteCount++;
        }
      }
    }
  }
  console.log(`  ${upvoteCount} pattern set upvotes migrated`);

  // Migrate modes
  console.log('Migrating modes...');
  for (const m of mongoModes) {
    const oldId = m._id.toString();
    const mode = await Mode.create({
      name: m.name,
      description: m.description || null,
      deviceType: m.deviceType,
      flags: m.flags,
      dataHash: m.dataHash,
      votes: m.votes || 0,
      uploadDate: m.uploadDate || new Date(),
      createdBy: getUserId(m.createdBy),
      createdAt: m.uploadDate || new Date(),
      updatedAt: new Date()
    });
    modeMap.set(oldId, mode.id);
  }
  console.log(`  ${modeMap.size} modes migrated`);

  const getModeId = (oid) => {
    if (!oid) return null;
    return modeMap.get(oid.toString()) || null;
  };

  // Migrate mode upvotes
  console.log('Migrating mode upvotes...');
  let modeUpvoteCount = 0;
  for (const m of mongoModes) {
    const newModeId = getModeId(m._id);
    if (!newModeId) continue;
    if (m.upvotedBy && Array.isArray(m.upvotedBy)) {
      for (const userId of m.upvotedBy) {
        const newUserId = getUserId(userId);
        if (newUserId) {
          await ModeUpvote.findOrCreate({ where: { modeId: newModeId, userId: newUserId } });
          modeUpvoteCount++;
        }
      }
    }
  }
  console.log(`  ${modeUpvoteCount} mode upvotes migrated`);

  // Migrate mode-patternset relationships
  console.log('Migrating mode-patternset relationships...');
  let mpsCount = 0;
  for (const m of mongoModes) {
    const newModeId = getModeId(m._id);
    if (!newModeId) continue;
    if (m.ledPatternOrder && Array.isArray(m.ledPatternOrder)) {
      for (let i = 0; i < m.ledPatternOrder.length; i++) {
        const psIndex = m.ledPatternOrder[i];
        if (psIndex !== undefined && m.patternSets && m.patternSets[psIndex]) {
          const newPsId = getPatternSetId(m.patternSets[psIndex]);
          if (newPsId) {
            await ModePatternSet.create({
              modeId: newModeId,
              sortOrder: i,
              patternSetId: newPsId
            });
            mpsCount++;
          }
        }
      }
    }
  }
  console.log(`  ${mpsCount} mode-patternset relationships migrated`);

  // Migrate favorite patterns for users
  console.log('Migrating user favorite patterns...');
  let favPatCount = 0;
  for (const u of mongoUsers) {
    const newUserId = getUserId(u._id);
    if (!newUserId) continue;
    if (u.favPats && Array.isArray(u.favPats)) {
      for (const psId of u.favPats) {
        const newPsId = getPatternSetId(psId);
        if (newPsId) {
          await UserFavoritePattern.findOrCreate({ where: { userId: newUserId, patternSetId: newPsId } });
          favPatCount++;
        }
      }
    }
  }
  console.log(`  ${favPatCount} favorite patterns migrated`);

  // Migrate favorite modes for users
  console.log('Migrating user favorite modes...');
  let favModeCount = 0;
  for (const u of mongoUsers) {
    const newUserId = getUserId(u._id);
    if (!newUserId) continue;
    if (u.favModes && Array.isArray(u.favModes)) {
      for (const modeId of u.favModes) {
        const newModeId = getModeId(modeId);
        if (newModeId) {
          await UserFavoriteMode.findOrCreate({ where: { userId: newUserId, modeId: newModeId } });
          favModeCount++;
        }
      }
    }
  }
  console.log(`  ${favModeCount} favorite modes migrated`);

  // Migrate downloads
  console.log('Migrating downloads...');
  for (const d of mongoDownloads) {
    await Download.create({
      device: d.device,
      version: d.version,
      category: d.category,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      downloadCount: d.downloadCount || 0,
      releaseDate: d.releaseDate || new Date(),
      createdAt: d.releaseDate || new Date(),
      updatedAt: new Date()
    });
  }
  console.log(`  ${mongoDownloads.length} downloads migrated`);

  console.log('\nMigration complete!');
  await mongoose.disconnect();
  await sequelize.close();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
