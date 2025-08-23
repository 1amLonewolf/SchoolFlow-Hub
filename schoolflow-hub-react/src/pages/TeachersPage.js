import React, { useState } from 'react';
import { useTeachers } from '../hooks/useTeachers';
import ConfirmDialog from '../components/ConfirmDialog';

const TeachersPage = () => {
  const { 
    teachers, 
    loading, 
    error, 
    addTeacher, 
    updateTeacher, 
    removeTeacher,
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage
  } = useTeachers();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let result;
    if (isEditing) {
      result = await updateTeacher(editingTeacherId, formData);
    } else {
      result = await addTeacher(formData);
    }

    if (result.success) {
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: ''
      });
      setIsEditing(false);
      setEditingTeacherId(null);
      alert(isEditing ? 'Teacher updated successfully!' : 'Teacher added successfully!');
    } else {
      alert(`Error ${isEditing ? 'updating' : 'adding'} teacher: ${result.error}`);
    }
  };

  const handleEdit = (teacher) => {
    setFormData({
      name: teacher.get('name'),
      email: teacher.get('email'),
      phone: teacher.get('phone') || ''
    });
    setIsEditing(true);
    setEditingTeacherId(teacher.id);
    // Scroll to the form
    document.getElementById('teacher-form-heading').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteClick = (teacherId) => {
    setTeacherToDelete(teacherId);
    setIsConfirmDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const result = await removeTeacher(teacherToDelete);
    if (result.success) {
      alert('Teacher deleted successfully!');
    } else {
      alert(`Error deleting teacher: ${result.error}`);
    }
    setIsConfirmDialogOpen(false);
    setTeacherToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsConfirmDialogOpen(false);
    setTeacherToDelete(null);
  };

  const handleCancelEdit = () => {
    setFormData({
      name: '',
      email: '',
      phone: ''
    });
    setIsEditing(false);
    setEditingTeacherId(null);
  };

  if (loading) {
    return <div>Loading teachers...</div>;
  }

  if (error) {
    return <div>Error loading teachers: {error}</div>;
  }

  return (
    <div>
      <h2>Teacher Management</h2>
      <div className="card form-container">
        <h3 id="teacher-form-heading">{isEditing ? 'Edit Teacher' : 'Add New Teacher'}</h3>
        <form id="addTeacherForm" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Teacher Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              placeholder="Teacher Name" 
              required 
              value={formData.name}
              onChange={handleInputChange}
              autoComplete="name"
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Email" 
              required 
              value={formData.email}
              onChange={handleInputChange}
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone Number</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone" 
              placeholder="Phone Number" 
              value={formData.phone}
              onChange={handleInputChange}
              autoComplete="tel"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="button primary-button" id="saveTeacherBtn">
              {isEditing ? 'Update Teacher' : 'Save Teacher'}
            </button>
            {isEditing && (
              <button 
                type="button" 
                className="button secondary-button" 
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}
            <button 
              type="button" 
              className="button cancel-button" 
              id="cancelTeacherBtn"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <div className="card table-container">
        <h3>Teachers List</h3>
        <div style={{ marginBottom: '1rem' }}>
          <p>Total teachers: {totalCount}</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="button secondary-button" 
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              className="button secondary-button" 
              onClick={nextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
        <table id="teacherTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length > 0 ? (
              teachers.map(teacher => (
                <tr key={teacher.id}>
                  <td>{teacher.get('name')}</td>
                  <td>{teacher.get('email')}</td>
                  <td>{teacher.get('phone') || 'N/A'}</td>
                  <td className="actions">
                    <button 
                      className="button edit-button" 
                      onClick={() => handleEdit(teacher)}
                    >
                      Edit
                    </button>
                    <button 
                      className="button delete-button" 
                      onClick={() => handleDeleteClick(teacher.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>No teachers found</td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="button secondary-button" 
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            className="button secondary-button" 
            onClick={nextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Teacher"
        message="Are you sure you want to delete this teacher? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default TeachersPage;