const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');

const TournamentRegistration = sequelize.define('TournamentRegistration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tournament_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seed: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'tournament_registrations',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['tournament_id', 'user_id'] }
  ]
});

module.exports = TournamentRegistration;
