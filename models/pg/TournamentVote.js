const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');

const TournamentVote = sequelize.define('TournamentVote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  match_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  voter_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  competitor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'tournament_votes',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['match_id', 'voter_id'] }
  ]
});

module.exports = TournamentVote;
