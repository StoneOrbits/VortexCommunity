const sequelize = require('../../config/database-pg');
const { DataTypes } = require('sequelize');

const User = require('./User');
const PatternSet = require('./PatternSet');
const Mode = require('./Mode');
const Download = require('./Download');

/**
 * Join tables
 */

const UserFavoritePattern = sequelize.define('UserFavoritePattern', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  patternSetId: { type: DataTypes.INTEGER, primaryKey: true }
}, {
  tableName: 'user_favorite_patterns',
  timestamps: false
});

const UserFavoriteMode = sequelize.define('UserFavoriteMode', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  modeId: { type: DataTypes.INTEGER, primaryKey: true }
}, {
  tableName: 'user_favorite_modes',
  timestamps: false
});

const PatternSetUpvote = sequelize.define('PatternSetUpvote', {
  patternSetId: { type: DataTypes.INTEGER, primaryKey: true },
  userId: { type: DataTypes.INTEGER, primaryKey: true }
}, {
  tableName: 'pattern_set_upvotes',
  timestamps: false
});

const ModeUpvote = sequelize.define('ModeUpvote', {
  modeId: { type: DataTypes.INTEGER, primaryKey: true },
  userId: { type: DataTypes.INTEGER, primaryKey: true }
}, {
  tableName: 'mode_upvotes',
  timestamps: false
});

const ModePatternSet = sequelize.define('ModePatternSet', {
  modeId: { type: DataTypes.INTEGER, primaryKey: true },
  patternSetId: { type: DataTypes.INTEGER, primaryKey: true },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'mode_pattern_sets',
  timestamps: false
});

/**
 * Associations
 */

// Favorites
User.belongsToMany(PatternSet, {
  through: UserFavoritePattern,
  as: 'favPats',
  foreignKey: 'userId'
});

PatternSet.belongsToMany(User, {
  through: UserFavoritePattern,
  as: 'favoritedByUsers',
  foreignKey: 'patternSetId'
});

User.belongsToMany(Mode, {
  through: UserFavoriteMode,
  as: 'favModes',
  foreignKey: 'userId'
});

Mode.belongsToMany(User, {
  through: UserFavoriteMode,
  as: 'favoritedByUsers',
  foreignKey: 'modeId'
});

// Upvotes
PatternSet.belongsToMany(User, {
  through: PatternSetUpvote,
  as: 'upvotedBy',
  foreignKey: 'patternSetId'
});

User.belongsToMany(PatternSet, {
  through: PatternSetUpvote,
  as: 'upvotedPatterns',
  foreignKey: 'userId'
});

Mode.belongsToMany(User, {
  through: ModeUpvote,
  as: 'upvotedBy',
  foreignKey: 'modeId'
});

User.belongsToMany(Mode, {
  through: ModeUpvote,
  as: 'upvotedModes',
  foreignKey: 'userId'
});

Mode.belongsToMany(PatternSet, {
  through: {
    model: ModePatternSet,
    unique: false
  },
  as: 'patternSets',
  foreignKey: 'modeId',
  otherKey: 'patternSetId'
});

PatternSet.belongsToMany(Mode, {
  through: {
    model: ModePatternSet,
    unique: false
  },
  as: 'modes',
  foreignKey: 'patternSetId',
  otherKey: 'modeId'
});

// Creator relations
PatternSet.belongsTo(User, {
  as: 'creator',
  foreignKey: 'createdBy'
});

User.hasMany(PatternSet, {
  foreignKey: 'createdBy'
});

Mode.belongsTo(User, {
  as: 'creator',
  foreignKey: 'createdBy'
});

User.hasMany(Mode, {
  foreignKey: 'createdBy'
});

/**
 * Sync helper
 */
async function syncDatabase() {
  await sequelize.sync();
  console.log('PostgreSQL tables synced');
}

module.exports = {
  sequelize,
  syncDatabase,
  User,
  PatternSet,
  Mode,
  Download,
  UserFavoritePattern,
  UserFavoriteMode,
  PatternSetUpvote,
  ModeUpvote,
  ModePatternSet
};
