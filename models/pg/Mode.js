const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');

const Mode = sequelize.define('Mode', {
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
  deviceType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  flags: {
    type: DataTypes.INTEGER,
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
  tableName: 'modes',
  timestamps: true
});

module.exports = Mode;
