const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');

const Tournament = sequelize.define('Tournament', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['open', 'closed']] }
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft',
    validate: { isIn: [['draft', 'registration', 'in_progress', 'completed', 'archived']] }
  },
  current_round: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  current_phase: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: { isIn: [['submission', 'judging', null]] }
  },
  max_participants: {
    type: DataTypes.INTEGER,
    defaultValue: 16
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  registration_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submission_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  voting_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tournaments',
  timestamps: true
});

module.exports = Tournament;
