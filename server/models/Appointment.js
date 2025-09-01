const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  bookingTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Cancelled', 'Completed'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  },
  customFields: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Prevent booking past dates (only allow future dates or today)
appointmentSchema.pre('save', function(next) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (this.bookingDate < today) {
    const error = new Error('Cannot book past dates');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
