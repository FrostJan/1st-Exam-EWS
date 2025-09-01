import React, { useState, useEffect } from 'react';
import { appointmentService, tableConfigService } from '../services/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Format booking date and time
const formatBookingDateTime = (date, time) => {
  if (!date) return '-';
  
  try {
    const dateObj = new Date(date);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = monthNames[dateObj.getMonth()];
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    
  // Format time
    let timeStr = '';
    if (time) {
      const [hours, minutes] = time.split(':');
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'pm' : 'am';
      timeStr = ` ${hour12}:${minutes}${ampm}`;
    }
    
    return `${month} ${day}, ${year}${timeStr}`;
  } catch (error) {
    return date;
  }
};

// Sortable header component
const SortableHeader = ({ id, children, isEditable, onEdit, editingIndex, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditing = editingIndex === index;

  // Enable drag listeners only when editable
  return (
    <th 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...(isEditable && !isEditing ? listeners : {})}
      className={isEditable ? "editable" : ""}
    >
      <div 
        style={{ cursor: isEditable && !isEditing ? 'pointer' : 'default' }}
        onClick={isEditable && !isEditing ? () => onEdit(index) : undefined}
      >
        {children}
      </div>
    </th>
  );
};

const AdminPage = () => {
  const [dragDropMode, setDragDropMode] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableHeaders, setTableHeaders] = useState([
    { id: 'name', label: 'Full Name', field: 'name', editable: true },
    { id: 'contact', label: 'Contact Number', field: 'contactNumber', editable: true },
    { id: 'bookingDate', label: 'Booking Date', field: 'bookingDate', editable: true },
    { id: 'status', label: 'Status', field: 'status', editable: false },
    { id: 'actions', label: 'Actions', field: 'actions', editable: false }
  ]);
  const [editingHeaderIndex, setEditingHeaderIndex] = useState(null);
  const [isEditTableMode, setIsEditTableMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalTableHeaders, setOriginalTableHeaders] = useState([]);
  
  // Inline editing states
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState(null); // 'asc' | 'desc'
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ visible: false, type: null, message: '', payload: null });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchAppointments();
    loadTableConfig();
  }, []);

  const loadTableConfig = async () => {
    try {
      console.log('Loading table config');
      const config = await tableConfigService.getTableConfig();
      console.log('Raw config from API:', config);
      
      if (config && config.headers) {
    // Check for old separate date/time columns and migrate if present
        const hasSeparateDateTime = config.headers.some(header => 
          header.field === 'date' || header.field === 'time'
        );
        
        if (hasSeparateDateTime) {
          // Replace separate date/time columns with a single bookingDate column
          const updatedHeaders = config.headers.filter(header => 
            header.field !== 'date' && header.field !== 'time'
          );
          
          // Add the bookingDate column if it doesn't exist
          const hasBookingDate = updatedHeaders.some(header => header.field === 'bookingDate');
          if (!hasBookingDate) {
            updatedHeaders.splice(2, 0, {
              id: 'bookingDate',
              label: 'Booking Date',
              field: 'bookingDate',
              editable: true,
              deleted: false
            });
          }
          
          setTableHeaders(updatedHeaders);
          setOriginalTableHeaders([...updatedHeaders]);
          
          // Save the corrected configuration
          await tableConfigService.saveTableConfig(updatedHeaders);
          // Saved corrected configuration
        } else {
          setTableHeaders(config.headers);
          setOriginalTableHeaders([...config.headers]);
        }
      } else {
        console.log('No config found, using defaults');
      }
    } catch (error) {
  console.error('Failed to load table configuration:', error);
    }
  };

  useEffect(() => {
    // Filter appointments based on search term - fix to search in filtered results
    const filtered = appointments.filter(appointment => {
      const searchLower = searchTerm.toLowerCase();

      // Search across all visible table headers
      return tableHeaders.some(header => {
        const field = header.field;
        if (field === 'actions') return false; // skip actions

        let value = '';
        if (field === 'bookingDate') {
          value = formatBookingDateTime(appointment.bookingDate, appointment.bookingTime);
        } else {
          value = appointment[field] !== undefined && appointment[field] !== null ? String(appointment[field]) : '';
        }

        return value.toLowerCase().includes(searchLower);
      });
    });

    // Apply sorting if requested
    const sorted = [...filtered];
    if (sortField) {
      sorted.sort((a, b) => {
        const aVal = sortField === 'bookingDate' ? new Date((a.bookingDate || '') + 'T' + (a.bookingTime || '00:00')) : (a[sortField] ?? '');
        const bVal = sortField === 'bookingDate' ? new Date((b.bookingDate || '') + 'T' + (b.bookingTime || '00:00')) : (b[sortField] ?? '');

        // numeric/date comparison when possible
        if (aVal instanceof Date && bVal instanceof Date) {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredAppointments(sorted);
    
    // Update selected appointments to only include those that are still visible after filtering
    setSelectedAppointments(prev => 
      prev.filter(id => filtered.some(appointment => appointment._id === id))
    );
  }, [appointments, searchTerm, sortField, sortDirection, tableHeaders]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAllAppointments();
      
      // Flatten custom fields from nested object to top-level properties
      const flattenedData = data.map(appointment => {
        const appointmentObj = { ...appointment };
        if (appointmentObj.customFields) {
          Object.keys(appointmentObj.customFields).forEach(key => {
            appointmentObj[`custom_${key}`] = appointmentObj.customFields[key];
          });
        }
        return appointmentObj;
      });
      
      setAppointments(flattenedData);
      setError('');
    } catch (err) {
      setError('Failed to fetch appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    if (!dragDropMode) return;
    if (!(isEditTableMode && dragDropMode)) return;
    const { active, over } = event;
    if (active.id !== over?.id) {
      setTableHeaders((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleHeaderEdit = (index, newValue) => {
    const newHeaders = [...tableHeaders];
    newHeaders[index].label = newValue;
    setTableHeaders(newHeaders);
    setEditingHeaderIndex(null);
    setHasUnsavedChanges(true);
  };

  const handleHeaderKeyPress = (e, index) => {
    if (e.key === 'Enter') {
      handleHeaderEdit(index, e.target.value);
    } else if (e.key === 'Escape') {
      setEditingHeaderIndex(null);
    }
  };

  const addNewTableHeader = () => {
    // Generate a unique field name for each new column
    const customFields = tableHeaders.filter(h => h.field.startsWith('custom_'));
    const nextIndex = customFields.length + 1;
    const newId = `custom_${Date.now()}`;
    const newHeader = {
      id: newId,
      label: 'New Column',
      field: `custom_${nextIndex}`,
      editable: true
    };
    
  // Insert before the Status column
  const newHeaders = [...tableHeaders];
  const statusIndex = newHeaders.findIndex(h => h.field === 'status');
  const insertIndex = statusIndex !== -1 ? statusIndex : newHeaders.length - 2;
  newHeaders.splice(insertIndex, 0, newHeader);
  setTableHeaders(newHeaders);
  setHasUnsavedChanges(true);

  // Automatically start editing the new header
  setEditingHeaderIndex(insertIndex);
  };


  const saveTableConfiguration = async () => {
    try {
      setLoading(true);
      
      // Completely remove columns marked for deletion
      let newHeaders = tableHeaders;
      if (columnsToDelete.length > 0) {
        newHeaders = tableHeaders.filter((_, i) => !columnsToDelete.includes(i));
      }
      
      await tableConfigService.saveTableConfig(newHeaders);
      
      // Clean up deleted column data from database
      if (columnsToDelete.length > 0) {
        const deletedFields = columnsToDelete.map(index => tableHeaders[index].field);
        console.log('Deleted fields being sent to cleanup:', deletedFields);
        try {
          await appointmentService.cleanupColumns(deletedFields);
          console.log('Cleanup completed successfully');
          // Refresh appointments to show updated data
          await fetchAppointments();
        } catch (cleanupError) {
          console.error('Failed to cleanup column data:', cleanupError);
          // Don't fail the entire save if cleanup fails
        }
      }
      
      setTableHeaders(newHeaders);
      setOriginalTableHeaders([...newHeaders]);
      setHasUnsavedChanges(false);
      setColumnsToDelete([]);
      setDeleteColumnMode(false);
      setIsEditTableMode(false); // Exit edit mode after saving
      setSuccess('Table configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to save table configuration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cancelTableChanges = () => {
  setTableHeaders([...originalTableHeaders]);
  setHasUnsavedChanges(false);
  setColumnsToDelete([]);
  setDeleteColumnMode(false);
  setIsEditTableMode(false); // Exit edit mode after canceling
  setSuccess('Changes cancelled successfully!');
  setTimeout(() => setSuccess(''), 3000);
  };

  const toggleEditTableMode = () => {
    // If trying to exit edit mode and there are unsaved changes, show confirmation modal
    if (isEditTableMode && hasUnsavedChanges) {
      showConfirm('exit', 'You have unsaved changes. Do you want to save them before exiting edit mode?', null);
      return;
    }

    // No unsaved changes or entering edit mode - proceed normally
    setIsEditTableMode(!isEditTableMode);
    setEditingHeaderIndex(null); // Exit any current editing
  };

  const handleSelectAppointment = (appointmentId) => {
    setSelectedAppointments(prev => {
      if (prev.includes(appointmentId)) {
        return prev.filter(id => id !== appointmentId);
      } else {
        return [...prev, appointmentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedAppointments.length === filteredAppointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(filteredAppointments.map(appointment => appointment._id));
    }
  };

  const handleDelete = async (id) => {
    // Open confirmation modal instead of window.confirm
    showConfirm('delete', 'Are you sure you want to delete this appointment?', { id });
  };

  const performDelete = async (id) => {
    try {
      setLoading(true);
      await appointmentService.deleteAppointment(id);
      setSuccess('Appointment deleted successfully');
      await fetchAppointments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete appointment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showConfirm = (type, message, payload = null) => {
    setConfirmModal({ visible: true, type, message, payload });
  };

  const closeConfirm = () => setConfirmModal({ visible: false, type: null, message: '', payload: null });

  const handleConfirm = (action) => {
    // action is used for multi-option modals (like exit edit mode): 'save'|'discard'|'cancel'
    const { type, payload } = confirmModal;

    if (type === 'delete' && payload && payload.id) {
      performDelete(payload.id);
      closeConfirm();
      return;
    }

    if (type === 'save') {
      closeConfirm();
      saveTableConfiguration();
      return;
    }

    if (type === 'cancel') {
      closeConfirm();
      cancelTableChanges();
      return;
    }

    if (type === 'exit') {
      // multi-choice: action will be 'save' or 'discard' or 'cancel'
      if (action === 'save') {
        closeConfirm();
        saveTableConfiguration();
        return;
      }
      if (action === 'discard') {
        closeConfirm();
        cancelTableChanges();
        return;
      }
      // cancel: just close
      closeConfirm();
      return;
    }

    // fallback
    closeConfirm();
  };

  const handleEdit = (appointment) => {
    setEditingRowId(appointment._id);
    // Ensure all custom fields are initialized for editing
    const customFields = tableHeaders.filter(h => h.field.startsWith('custom_')).map(h => h.field);
    const editingObj = { ...appointment };
    customFields.forEach(field => {
      if (!(field in editingObj)) {
        editingObj[field] = '';
      }
    });
    setEditingData(editingObj);
  };

  const handleSort = (field) => {
    if (!field || field === 'actions') return;
    if (sortField === field) {
      // toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSaveInlineEdit = async () => {
    try {
      setLoading(true);
      
      // Ensure all custom fields are included in the update and not empty
      const customFields = tableHeaders.filter(h => h.field.startsWith('custom_')).map(h => h.field);
      const updateData = { ...editingData };
      customFields.forEach(field => {
        if (updateData[field] === undefined) {
          updateData[field] = '';
        }
      });
      
      // Remove any fields not in tableHeaders
      Object.keys(updateData).forEach(key => {
        if (!tableHeaders.some(h => h.field === key)) {
          delete updateData[key];
        }
      });
      
      await appointmentService.updateAppointment(editingRowId, updateData);
      await fetchAppointments();
      setEditingRowId(null);
      setEditingData({});
      setSuccess('Appointment updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update appointment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  const handleInlineInputChange = (field, value) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [deleteColumnMode, setDeleteColumnMode] = useState(false);
  const [columnsToDelete, setColumnsToDelete] = useState([]);

  const handleHeaderDeleteToggle = (index) => {
    if (!deleteColumnMode) return;
    const header = tableHeaders[index];
    // Prevent deletion of Full Name, Contact Number, and Booking Date
    if (
      header.field === 'status' ||
      header.field === 'actions' ||
      header.field === 'name' ||
      header.field === 'contactNumber' ||
      header.field === 'bookingDate'
    ) return;
    
    // If column is already soft-deleted, don't allow toggling
    if (header.deleted) return;
    
    setColumnsToDelete((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
    setHasUnsavedChanges(true);
  };

  return (
    <div className="page-container">
      <div className="admin-section">
        <h1 className="page-title">Admin Dashboard</h1>
        
        {error && <div className="error">{error}</div>}
        {success && (
          <div
            className="admin-notification"
            style={{
              position: 'fixed',
              top: '2rem',
              right: '2rem',
              zIndex: 9999,
              background: '#28a745',
              color: '#fff',
              padding: '1rem 2rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 24px rgba(40,167,69,0.12)',
              fontWeight: 600,
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              minWidth: '260px',
              pointerEvents: 'none',
              transition: 'opacity 0.3s',
            }}
          >
            <span style={{ fontSize: '1.5rem', color: '#fff' }}>
              <i className="fa fa-check-circle"></i>
            </span>
            <span>{success}</span>
          </div>
        )}
        {/* Confirmation Modal */}
        {confirmModal.visible && (
          <div className="modal-overlay">
            <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
              <div className="modal-header">
                <h2 id="confirm-title">Confirmation</h2>
                <button className="btn-close" onClick={closeConfirm} aria-label="Close">×</button>
              </div>

              <div className="modal-body">{confirmModal.message}</div>

              <div className="modal-actions">
                {confirmModal.type === 'exit' ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => handleConfirm('cancel')}>Cancel</button>
                    <button className="btn btn-danger" onClick={() => handleConfirm('discard')}>Discard</button>
                    <button className="btn btn-success" onClick={() => handleConfirm('save')}>Save</button>
                  </>
                ) : confirmModal.type === 'delete' ? (
                  <>
                    <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
                    <button className="btn btn-danger" onClick={() => handleConfirm()}>Yes, Delete</button>
                  </>
                ) : confirmModal.type === 'save' ? (
                  <>
                    <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
                    <button className="btn btn-success" onClick={() => handleConfirm()}>Yes, Save</button>
                  </>
                ) : confirmModal.type === 'cancel' ? (
                  <>
                    <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
                    <button className="btn btn-danger" onClick={() => handleConfirm()}>Yes, Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary" onClick={closeConfirm}>Close</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="search-and-controls-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', width: '100%' }}>
          <div className="search-container" style={{ flex: '1', maxWidth: '400px', marginBottom: 0 }}>
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: '100%', marginBottom: 0, height: '44px', display: 'inline-block', verticalAlign: 'middle' }}
            />
          </div>
          <div className="admin-controls" style={{ display: 'flex', alignItems: 'center', height: '44px' }}>
            <button 
              className={`btn ${isEditTableMode ? 'btn-secondary' : 'btn-primary'}`}
              onClick={toggleEditTableMode}
              disabled={(isEditTableMode && hasUnsavedChanges) || editingRowId !== null}
              title={
                isEditTableMode && hasUnsavedChanges
                  ? 'Save or cancel your changes before exiting edit mode'
                  : editingRowId !== null
                    ? 'Disabled while editing an appointment'
                    : undefined
              }
              style={{ height: '44px', display: 'inline-flex', alignItems: 'center', fontWeight: 'bold' }}
            >
              {isEditTableMode ? 'Exit Edit Table' : 'Edit Table'}
            </button>
          </div>
        </div>

        {isEditTableMode && (
          <div className="edit-table-tools">
            <div className="edit-tools-header">
              <h3>Edit Table Tools</h3>
            </div>
            <div className="edit-tools-actions" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <button 
                className="btn btn-success" 
                onClick={addNewTableHeader}
              >
                <i className="fa fa-plus"></i> Add New Column
              </button>
              <button 
                className={`btn btn-danger${deleteColumnMode ? ' active' : ''}`}
                onClick={() => setDeleteColumnMode(!deleteColumnMode)}
                style={{ fontWeight: deleteColumnMode ? 'bold' : undefined, background: deleteColumnMode ? '#a94442' : undefined, color: deleteColumnMode ? '#fff' : undefined, boxShadow: deleteColumnMode ? '0 0 0 2px #a94442' : undefined }}
              >
                <i className="fa fa-trash"></i> Delete Column
                {deleteColumnMode && <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>(Active)</span>}
              </button>
                <button
                  className={`btn btn-info${dragDropMode ? ' active' : ''}`}
                  onClick={() => setDragDropMode(!dragDropMode)}
                  style={{ fontWeight: dragDropMode ? 'bold' : undefined, background: dragDropMode ? '#007bff' : undefined, color: dragDropMode ? '#fff' : undefined, boxShadow: dragDropMode ? '0 0 0 2px #007bff' : undefined }}
                >
                  <i className="fa fa-arrows"></i> Drag & Drop
                  {dragDropMode && <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>(Active)</span>}
                </button>
              <button 
                className="btn btn-primary" 
                onClick={() => showConfirm('save', 'Are you sure you want to save changes?', null)}
                disabled={!hasUnsavedChanges || loading}
              >
                <i className="fa fa-save"></i> {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => showConfirm('cancel', 'Are you sure you want to cancel your changes? This will discard unsaved edits.', null)}
                disabled={!hasUnsavedChanges}
              >
                <i className="fa fa-undo"></i> Cancel Changes
              </button>
              {hasUnsavedChanges && (
                <div className="unsaved-changes-indicator" style={{ color: '#d9534f', fontWeight: 600 }}>
                  <i className="fa fa-exclamation-triangle"></i> You have unsaved changes
                </div>
              )}
            </div>
          </div>
        )}

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="appointments-table">
            <thead>
              <tr>
                <SortableContext 
                  items={tableHeaders.filter((h, i) => h.field !== 'status' && h.field !== 'actions' && !columnsToDelete.includes(i)).map(h => h.id)} 
                  strategy={horizontalListSortingStrategy}
                >
                      {tableHeaders.map((header, index) => (
                    header.field === 'status' || header.field === 'actions' ? (
                      <th key={header.id}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{header.label}</span>
                      </th>
                    ) : (
                      columnsToDelete.includes(index) ? (
                        <th key={header.id} style={{ background: '#f8d7da', color: '#a94442', borderRadius: '6px', border: '2px solid #a94442', cursor: deleteColumnMode ? 'pointer' : undefined }} onClick={() => handleHeaderDeleteToggle(index)}>
                          <span>{header.label}</span>
                        </th>
                      ) : (
                        <SortableHeader 
                          key={header.id} 
                          id={header.id}
                          isEditable={header.editable && isEditTableMode && dragDropMode}
                          onEdit={setEditingHeaderIndex}
                          editingIndex={editingHeaderIndex}
                          index={index}
                        >
                          <div 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: deleteColumnMode ? 'pointer' : undefined }}
                            onClick={deleteColumnMode ? () => handleHeaderDeleteToggle(index) : undefined}
                          >
                            {editingHeaderIndex === index ? (
                              <input
                                type="text"
                                defaultValue={header.label}
                                className="header-edit-input"
                                onBlur={(e) => handleHeaderEdit(index, e.target.value)}
                                onKeyDown={(e) => handleHeaderKeyPress(e, index)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            ) : (
                              <>
                                <span onClick={() => handleSort(header.field)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>{header.label}</span>
                                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                    {sortField === header.field ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                  </span>
                                </span>
                                {isEditTableMode && header.editable && !columnsToDelete.includes(index) && (
                                  <button
                                    className="btn btn-sm btn-info"
                                    style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, position: 'relative' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setEditingHeaderIndex(index);
                                    }}
                                    title="Change Text"
                                    tabIndex={0}
                                  >
                                    <i className="fa fa-pencil"></i>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </SortableHeader>
                      )
                    )
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="loading">Loading appointments...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="error">{error}</td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="no-data">No appointments found.</td>
                </tr>
              ) : (
                filteredAppointments.map((appointment, rowIndex) => (
                  <tr key={appointment._id} className={editingRowId === appointment._id ? 'editing-row' : ''}>
                    {/* selection column removed */}
                    {tableHeaders.map((header) => (
                      <td key={header.id}>
                        {header.field === 'actions' ? (
                          <div className="action-buttons">
                            {editingRowId === appointment._id ? (
                              <>
                                <button 
                                  className="btn btn-success btn-small"
                                  onClick={handleSaveInlineEdit}
                                  disabled={isEditTableMode}
                                >
                                  <i className="fa fa-check"></i> Save
                                </button>
                                <button 
                                  className="btn btn-secondary btn-small"
                                  onClick={handleCancelInlineEdit}
                                  disabled={isEditTableMode}
                                >
                                  <i className="fa fa-times"></i> Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-warning btn-small"
                                  onClick={() => handleEdit(appointment)}
                                  disabled={isEditTableMode}
                                  title={isEditTableMode ? 'Disabled while editing table structure' : 'Edit appointment'}
                                >
                                  <i className="fa fa-pencil"></i> Edit
                                </button>
                                <button 
                                  className="btn btn-danger btn-small"
                                  onClick={() => handleDelete(appointment._id)}
                                  disabled={isEditTableMode}
                                  title={isEditTableMode ? 'Disabled while editing table structure' : 'Delete appointment'}
                                >
                                  <i className="fa fa-trash"></i> Delete
                                </button>
                              </>
                            )}
                          </div>
                        ) : header.field === 'status' ? (
                          editingRowId === appointment._id ? (
                            <select
                              className="inline-edit-select"
                              value={editingData.status || appointment.status}
                              onChange={(e) => handleInlineInputChange('status', e.target.value)}
                            >
                              <option value="Completed">Completed</option>
                              <option value="Pending">Pending</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <span className={`status ${appointment.status}`}>
                              {appointment.status}
                            </span>
                          )
                        ) : header.field === 'bookingDate' ? (
                          editingRowId === appointment._id ? (
                            <input
                              type="datetime-local"
                              className="inline-edit-input"
                              value={editingData.bookingDate ? 
                                new Date(editingData.bookingDate).toISOString().slice(0, 16) :
                                new Date(appointment.bookingDate).toISOString().slice(0, 16)
                              }
                              onChange={(e) => handleInlineInputChange('bookingDate', e.target.value)}
                            />
                          ) : (
                            formatBookingDateTime(appointment.bookingDate, appointment.bookingTime)
                          )
                        ) : header.field === 'name' ? (
                          editingRowId === appointment._id ? (
                            <input
                              type="text"
                              className="inline-edit-input"
                              value={editingData.name || appointment.name}
                              onChange={(e) => handleInlineInputChange('name', e.target.value)}
                            />
                          ) : (
                            appointment.name
                          )
                        ) : header.field === 'contactNumber' ? (
                          editingRowId === appointment._id ? (
                            <input
                              type="tel"
                              className="inline-edit-input"
                              value={editingData.contactNumber || appointment.contactNumber}
                              onChange={(e) => handleInlineInputChange('contactNumber', e.target.value)}
                            />
                          ) : (
                            appointment.contactNumber
                          )
                        ) : (
                          editingRowId === appointment._id ? (
                            <input
                              type="text"
                              className="inline-edit-input"
                              value={editingData[header.field] !== undefined ? editingData[header.field] : appointment[header.field] || ''}
                              onChange={(e) => handleInlineInputChange(header.field, e.target.value)}
                              placeholder="Enter value"
                            />
                          ) : (
                            <span>{appointment[header.field] || '-'}</span>
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
};

export default AdminPage;
