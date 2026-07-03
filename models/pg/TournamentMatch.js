const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');

const TournamentMatch = sequelize.define('TournamentMatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tournament_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  round: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  competitor1_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  competitor2_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  winner_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  submission1_url: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  submission2_url: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'submission', 'judging', 'completed']] }
  },
  likes1: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  likes2: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'tournament_matches',
  timestamps: true
});

module.exports = TournamentMatch;
