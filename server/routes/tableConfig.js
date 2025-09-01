const express = require('express');
const router = express.Router();
const TableConfig = require('../models/TableConfig');

// GET /api/table-config - Get table configuration
router.get('/', async (req, res) => {
  try {
    let config = await TableConfig.findOne({ configType: 'admin-table' });
    
    if (!config) {
      // Create default configuration if none exists
      config = new TableConfig({
        configType: 'admin-table',
        headers: [
          { id: 'name', label: 'Full Name', field: 'name', editable: true },
          { id: 'contact', label: 'Contact Number', field: 'contactNumber', editable: true },
          { id: 'bookingDate', label: 'Booking Date', field: 'bookingDate', editable: true },
          { id: 'status', label: 'Status', field: 'status', editable: false },
          { id: 'actions', label: 'Actions', field: 'actions', editable: false }
        ]
      });
      await config.save();
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching table config:', error);
    res.status(500).json({ message: 'Failed to fetch table configuration', error: error.message });
  }
});

// POST /api/table-config - Save table configuration
router.post('/', async (req, res) => {
  try {
    const { headers } = req.body;
    
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ message: 'Headers array is required' });
    }

    let config = await TableConfig.findOne({ configType: 'admin-table' });
    
    if (config) {
      config.headers = headers;
      await config.save();
    } else {
      config = new TableConfig({
        configType: 'admin-table',
        headers
      });
      await config.save();
    }
    
    res.json({ message: 'Table configuration saved successfully', config });
  } catch (error) {
    console.error('Error saving table config:', error);
    res.status(500).json({ message: 'Failed to save table configuration', error: error.message });
  }
});

// POST /api/table-config/reset - Reset table configuration to default
router.post('/reset', async (req, res) => {
  try {
    // Delete existing configuration
    await TableConfig.deleteMany({ configType: 'admin-table' });
    
    // Create new default configuration
    const defaultConfig = new TableConfig({
      configType: 'admin-table',
      headers: [
        { id: 'name', label: 'Full Name', field: 'name', editable: true },
        { id: 'contact', label: 'Contact Number', field: 'contactNumber', editable: true },
        { id: 'bookingDate', label: 'Booking Date', field: 'bookingDate', editable: true },
        { id: 'status', label: 'Status', field: 'status', editable: false },
        { id: 'actions', label: 'Actions', field: 'actions', editable: false }
      ]
    });
    
    await defaultConfig.save();
    
    res.json({ 
      message: 'Table configuration reset to default successfully', 
      config: defaultConfig 
    });
  } catch (error) {
    console.error('Error resetting table config:', error);
    res.status(500).json({ message: 'Failed to reset table configuration', error: error.message });
  }
});

module.exports = router;
