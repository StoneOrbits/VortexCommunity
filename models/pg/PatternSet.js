const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database-pg');
const { sanitize, NAME_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } = require('../../middleware/validate');

const PatternSet = sequelize.define('PatternSet', {
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
  },

  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'pattern_sets',
  timestamps: true,
  hooks: {
    beforeValidate: (pat) => {
      if (pat.name) pat.name = sanitize(pat.name);
      if (pat.description) pat.description = sanitize(pat.description);
    }
  }
});

// Optional computed alias for legacy frontend expectations
Object.defineProperty(PatternSet.prototype, '_id', {
  get() {
    return this.id;
  }
});

module.exports = PatternSet;
