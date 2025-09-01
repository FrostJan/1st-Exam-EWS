const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');

// Validation middleware
// Validation middleware for creating appointments
const validateAppointment = [
  body('name').notEmpty().withMessage('Name is required'),
  body('contactNumber').notEmpty().withMessage('Contact number is required'),
  body('bookingDate').isISO8601().withMessage('Valid booking date is required'),
  body('bookingTime').notEmpty().withMessage('Booking time is required')
];

// Validation middleware for updating appointments (partial updates allowed)
const validateAppointmentUpdate = [
  body('name').optional().isString().withMessage('Name must be a string'),
  body('contactNumber').optional().isString().withMessage('Contact number must be a string'),
  body('bookingDate').optional().isISO8601().withMessage('Valid booking date is required'),
  body('bookingTime').optional().isString().withMessage('Booking time must be a string'),
  body('status').optional().isString().withMessage('Status must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

// @route   GET /api/appointments
// @desc    Get all appointments
// @access  Public
router.get('/', async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ bookingDate: 1, bookingTime: 1 });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Public
router.post('/', validateAppointment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, contactNumber, bookingDate, bookingTime, notes } = req.body;
    
    // Check if appointment slot is already taken
    const existingAppointment = await Appointment.findOne({
      bookingDate: new Date(bookingDate),
      bookingTime,
      status: { $ne: 'cancelled' }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }
    
    const appointment = new Appointment({
      name,
      contactNumber,
      bookingDate: new Date(bookingDate),
      bookingTime,
      notes
    });
    
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    if (error.message === 'Cannot book past dates') {
      return res.status(400).json({ message: 'Cannot book past dates, only 2 days onward' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update an appointment
// @access  Public
router.put('/:id', validateAppointmentUpdate, async (req, res) => {
  const errors = validationResult(req);
  // Only reject if there are validation errors for fields present in req.body
  if (!errors.isEmpty()) {
    const presentFieldErrors = errors.array().filter(err => Object.keys(req.body).includes(err.param));
    if (presentFieldErrors.length > 0) {
      return res.status(400).json({ errors: presentFieldErrors });
    }
  }

  try {
    const { name, contactNumber, bookingDate, bookingTime, status, notes, ...rest } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only check for time slot conflicts if bookingDate and bookingTime are present
    if (bookingDate && bookingTime && (bookingDate !== appointment.bookingDate.toISOString().split('T')[0] || bookingTime !== appointment.bookingTime)) {
      const existingAppointment = await Appointment.findOne({
        _id: { $ne: req.params.id },
        bookingDate: new Date(bookingDate),
        bookingTime,
        status: { $ne: 'cancelled' }
      });

      if (existingAppointment) {
        return res.status(400).json({ message: 'This time slot is already booked' });
      }
    }

    if (name !== undefined) appointment.name = name;
    if (contactNumber !== undefined) appointment.contactNumber = contactNumber;
    if (bookingDate !== undefined) appointment.bookingDate = new Date(bookingDate);
    if (bookingTime !== undefined) appointment.bookingTime = bookingTime;
    if (status !== undefined) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;

    // Merge new custom fields with existing ones, stripping 'custom_' prefix
    const customFieldKeys = Object.keys(rest).filter(key => key.startsWith('custom_'));
    if (customFieldKeys.length > 0) {
      const newCustomFields = customFieldKeys.reduce((acc, key) => {
        const cleanKey = key.replace(/^custom_/, '');
        acc[cleanKey] = rest[key];
        return acc;
      }, {});
      appointment.customFields = {
        ...appointment.customFields,
        ...newCustomFields
      };
    }

    await appointment.save();
    res.json(appointment);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (error.message === 'Cannot book past dates') {
      return res.status(400).json({ message: 'Cannot book past dates, only 2 days onward' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Delete an appointment
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments/cleanup-columns
// @desc    Clean up deleted column data from all appointments
// @access  Public
router.post('/cleanup-columns', async (req, res) => {
  try {
    const { deletedFields } = req.body;
    
    if (!deletedFields || !Array.isArray(deletedFields)) {
      return res.status(400).json({ message: 'deletedFields array is required' });
    }

    console.log('Cleanup request received with deletedFields:', deletedFields);

    // Remove the specified custom fields from all appointments
    const updateQuery = {};
    deletedFields.forEach(field => {
      // Remove the 'custom_' prefix to match the stored field names in customFields
      const cleanField = field.replace(/^custom_/, '');
      updateQuery[`customFields.${cleanField}`] = 1;
      console.log(`Removing field: ${field} -> customFields.${cleanField}`);
    });

    console.log('Update query:', updateQuery);

    if (Object.keys(updateQuery).length > 0) {
      const result = await Appointment.updateMany({}, { $unset: updateQuery });
      console.log('Cleanup result:', result);
    }

    res.json({ message: 'Column data cleanup completed successfully' });
  } catch (error) {
    console.error('Error cleaning up column data:', error);
    res.status(500).json({ message: 'Failed to cleanup column data', error: error.message });
  }
});

module.exports = router;
