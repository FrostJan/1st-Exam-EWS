import React, { useState, useEffect } from 'react';
import '../styles/modals.css';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { appointmentService } from '../services/api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import DateTimePicker from '../components/ui/date-time-picker';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactNumber: z.string()
    .min(11, 'Contact number must be 11 digits (09xxxxxxxxx)')
    .max(11, 'Contact number must be 11 digits (09xxxxxxxxx)')
    .regex(/^09\d{9}$/, 'Contact number must start with 09 and be followed by 9 digits (e.g., 09123456789)'),
  dateTime: z.object({
    date: z.date(),
    time: z.string().min(1, 'Time is required')
  }, { required_error: 'Date and time are required' }),
});

const CustomerPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contactNumber: '',
      dateTime: null,
    },
  });

  useEffect(() => {
    // DateTimePicker enforces min date
  }, []);

  const validateDateTime = (dateTimeValue) => {
    if (!dateTimeValue || !dateTimeValue.date) {
      setError('Date and time are required.');
      return false;
    }

    if (!dateTimeValue.time) {
      setError('Please select a time slot.');
      return false;
    }

    const selectedDate = dateTimeValue.date;
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 2);
    
    if (selectedDate < minDate) {
      setError('Cannot book past dates. Only 2+ days onward allowed.');
      return false;
    }
    return true;
  };

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!validateDateTime(data.dateTime)) {
      setIsSubmitting(false);
      return;
    }

    try {
      setLoading(true);
      
    // Transform dateTime to bookingDate/bookingTime
      const formattedData = {
        ...data,
        bookingDate: data.dateTime.date.toISOString().split('T')[0],
  bookingTime: data.dateTime.time,
      };
      
  // Remove the dateTime field before sending
      delete formattedData.dateTime;
      
      await appointmentService.createAppointment(formattedData);
      setSuccess('Appointment created successfully!');
      
      // Reset form
      form.reset();
      
  // Success modal stays until closed
    } catch (err) {
      setError(err.message || 'Failed to create appointment');
      console.error(err);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="customer-section">
        <div className="form-container customer-form">
          <div className="form-header">
            <h2 className="form-title">
              Create New Appointment
            </h2>
          </div>
          
          {/* Enhanced Alert Messages */}
          {error && (
            <div className="alert alert-error">
              <i className="fa fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="modal-overlay modal-success" role="dialog" aria-modal="true">
              <div className="modal-content">
                <div className="modal-header">
                  <div className="success-icon"><i className="fa fa-check-circle"></i></div>
                  <h2 className="modal-title">Appointment Booked!</h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setSuccess('')}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <p>Your appointment has been created successfully.<br />We look forward to seeing you!</p>
                </div>
                <div className="modal-actions">
                  <Button type="button" className="btn" onClick={() => setSuccess('')}>OK</Button>
                </div>
              </div>
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="appointment-form">
              <div className="form-grid">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="form-field">
                      <FormLabel className="field-label">
                        <i className="fa fa-user"></i>
                        Full Name *
                      </FormLabel>
                      <FormControl>
                        <div className="input-wrapper">
                          <Input 
                            placeholder="Enter your full name" 
                            className="form-input"
                            {...field} 
                          />
                          <i className="fa fa-user input-icon"></i>
                        </div>
                      </FormControl>
                      <FormMessage className="field-error" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem className="form-field">
                      <FormLabel className="field-label">
                        <i className="fa fa-phone"></i>
                        Contact Number *
                      </FormLabel>
                      <FormControl>
                        <div className="input-wrapper">
                          <Input 
                            type="tel" 
                            placeholder="09123456789" 
                            className="form-input"
                            {...field} 
                          />
                          <i className="fa fa-phone input-icon"></i>
                        </div>
                      </FormControl>
                      <FormMessage className="field-error" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem className="form-field">
                    <FormLabel className="field-label">
                      <i className="fa fa-calendar"></i>
                      Booking Date and Time *
                    </FormLabel>
                    <FormControl>
                      <div className="datetime-wrapper">
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="field-error" />
                  </FormItem>
                )}
              />

              {/* Notes field removed */}

              <div className="form-actions">
                <Button 
                  type="submit" 
                  className="submit-btn"
                  disabled={loading || isSubmitting}
                >
                  {loading ? (
                    <>
                      <i className="fa fa-spinner fa-spin"></i>
                      Creating Appointment...
                    </>
                  ) : (
                    <>
                      <i className="fa fa-calendar-check-o"></i>
                      Book Appointment
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="reset-btn"
                  onClick={() => form.reset()}
                  disabled={loading || isSubmitting}
                >
                  <i className="fa fa-refresh"></i>
                  Reset Form
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default CustomerPage;
