const mongoose = require('mongoose');

const tableConfigSchema = new mongoose.Schema({
  configType: {
    type: String,
    default: 'admin-table',
    unique: true
  },
  headers: [{
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    field: {
      type: String,
      required: true
    },
    editable: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('TableConfig', tableConfigSchema);
