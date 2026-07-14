const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');

const TournamentSRHistory = sequelize.define('TournamentSRHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tournament_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sr_before: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sr_after: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'tournament_sr_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

module.exports = TournamentSRHistory;
