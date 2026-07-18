const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');
const { sanitize, NAME_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } = require('../../middleware/validate');

const Mode = sequelize.define('Mode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Name is required.' },
      len: { args: [1, NAME_MAX_LENGTH], msg: `Name must be between 1 and ${NAME_MAX_LENGTH} characters.` }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, DESCRIPTION_MAX_LENGTH], msg: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less.` }
    }
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
  timestamps: true,
  hooks: {
    beforeValidate: (mode) => {
      if (mode.name) mode.name = sanitize(mode.name);
      if (mode.description) mode.description = sanitize(mode.description);
    }
  }
});

module.exports = Mode;
