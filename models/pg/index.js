const sequelize = require('../../config/database-pg');
const { DataTypes } = require('sequelize');

const User = require('./User');
const PatternSet = require('./PatternSet');
const Mode = require('./Mode');
const Download = require('./Download');
<<<<<<< HEAD
=======
const Tournament = require('./Tournament');
const TournamentRegistration = require('./TournamentRegistration');
const TournamentMatch = require('./TournamentMatch');
const TournamentSRHistory = require('./TournamentSRHistory');
const TournamentVote = require('./TournamentVote');
>>>>>>> 4012d50 (tournament feature)

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

<<<<<<< HEAD
=======
// Tournament associations
Tournament.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
User.hasMany(Tournament, { foreignKey: 'created_by' });

Tournament.belongsToMany(User, { through: TournamentRegistration, as: 'participants', foreignKey: 'tournament_id' });
User.belongsToMany(Tournament, { through: TournamentRegistration, as: 'registrations', foreignKey: 'user_id' });

TournamentRegistration.belongsTo(Tournament, { foreignKey: 'tournament_id' });
TournamentRegistration.belongsTo(User, { foreignKey: 'user_id' });
Tournament.hasMany(TournamentRegistration, { foreignKey: 'tournament_id' });

TournamentMatch.belongsTo(Tournament, { foreignKey: 'tournament_id' });
Tournament.hasMany(TournamentMatch, { foreignKey: 'tournament_id' });
TournamentMatch.belongsTo(User, { as: 'competitor1', foreignKey: 'competitor1_id' });
TournamentMatch.belongsTo(User, { as: 'competitor2', foreignKey: 'competitor2_id' });
TournamentMatch.belongsTo(User, { as: 'winner', foreignKey: 'winner_id' });

TournamentSRHistory.belongsTo(User, { foreignKey: 'user_id' });
TournamentSRHistory.belongsTo(Tournament, { foreignKey: 'tournament_id' });
User.hasMany(TournamentSRHistory, { foreignKey: 'user_id' });

TournamentVote.belongsTo(TournamentMatch, { foreignKey: 'match_id' });
TournamentMatch.hasMany(TournamentVote, { foreignKey: 'match_id' });
TournamentVote.belongsTo(User, { as: 'voter', foreignKey: 'voter_id' });
TournamentVote.belongsTo(User, { as: 'competitor', foreignKey: 'competitor_id' });

>>>>>>> 4012d50 (tournament feature)
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
<<<<<<< HEAD
=======
  Tournament,
  TournamentRegistration,
  TournamentMatch,
  TournamentSRHistory,
  TournamentVote,
>>>>>>> 4012d50 (tournament feature)
  UserFavoritePattern,
  UserFavoriteMode,
  PatternSetUpvote,
  ModeUpvote,
  ModePatternSet
};
