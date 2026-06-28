const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');

const PatternSet = sequelize.define('PatternSet', {
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
  data: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  dataHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  votes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'pattern_sets',
  timestamps: true
});

module.exports = PatternSet;
