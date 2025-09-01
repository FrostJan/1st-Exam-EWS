import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const appointmentService = {
  // Appointments API
  getAllAppointments: async () => {
    try {
      const response = await api.get('/appointments');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get appointment by ID
  getAppointmentById: async (id) => {
    try {
      const response = await api.get(`/appointments/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create appointment
  createAppointment: async (appointmentData) => {
    try {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update appointment
  updateAppointment: async (id, appointmentData) => {
    try {
      const response = await api.put(`/appointments/${id}`, appointmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete appointment
  deleteAppointment: async (id) => {
    try {
      const response = await api.delete(`/appointments/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Cleanup deleted columns
  cleanupColumns: async (deletedFields) => {
    try {
      const response = await api.post('/appointments/cleanup-columns', { deletedFields });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export const tableConfigService = {
  // Get table configuration
  getTableConfig: async () => {
    try {
      const response = await api.get('/table-config');
      return response.data;
    } catch (error) {
      // Return default config if not found
      if (error.response?.status === 404) {
        return {
          headers: [
            { id: 'name', label: 'Full Name', field: 'name', editable: true },
            { id: 'contact', label: 'Contact Number', field: 'contactNumber', editable: true },
            { id: 'date', label: 'Date', field: 'bookingDate', editable: true },
            { id: 'time', label: 'Time', field: 'bookingTime', editable: true },
            { id: 'status', label: 'Status', field: 'status', editable: false },
            { id: 'actions', label: 'Actions', field: 'actions', editable: false }
          ]
        };
      }
      throw error.response?.data || error.message;
    }
  },

  // Save table configuration
  saveTableConfig: async (headers) => {
    try {
      const response = await api.post('/table-config', { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Reset table configuration to default
  resetTableConfig: async () => {
    try {
      const response = await api.post('/table-config/reset');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Note: default axios instance `api` is intentionally not exported as default
// to avoid unused default imports. Use the named services above.
