import React, { useState } from 'react';
import { useStudents } from '../hooks/useStudents';
import { useFileUpload } from '../hooks/useFileUpload';
import ConfirmDialog from '../components/ConfirmDialog';

const StudentsPage = () => {
  const { 
    students, 
    loading, 
    error, 
    addStudent, 
    updateStudent, 
    removeStudent,
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage
  } = useStudents();
  
  const { uploadStatus, isUploading, handleBulkUpload } = useFileUpload();
  const [formData, setFormData] = useState({
    name: '',
    nationalId: '',
    course: '',
    season: '',
    phone: '',
    location: ''
  });
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setBulkUploadFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const studentData = {
      name: formData.name,
      nationalId: formData.nationalId,
      course: formData.course,
      season: formData.season ? parseInt(formData.season) : null,
      phone: formData.phone,
      location: formData.location
    };

    let result;
    if (isEditing) {
      result = await updateStudent(editingStudentId, studentData);
    } else {
      result = await addStudent(studentData);
    }

    if (result.success) {
      // Reset form
      setFormData({
        name: '',
        nationalId: '',
        course: '',
        season: '',
        phone: '',
        location: ''
      });
      setIsEditing(false);
      setEditingStudentId(null);
      alert(isEditing ? 'Student updated successfully!' : 'Student added successfully!');
    } else {
      alert(`Error ${isEditing ? 'updating' : 'adding'} student: ${result.error}`);
    }
  };

  const handleEdit = (student) => {
    setFormData({
      name: student.get('name'),
      nationalId: student.get('nationalId'),
      course: student.get('course') || '',
      season: student.get('season') || '',
      phone: student.get('phone') || '',
      location: student.get('location') || ''
    });
    setIsEditing(true);
    setEditingStudentId(student.id);
    // Scroll to the form
    document.getElementById('student-form-heading').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteClick = (studentId) => {
    setStudentToDelete(studentId);
    setIsConfirmDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const result = await removeStudent(studentToDelete);
    if (result.success) {
      alert('Student deleted successfully!');
    } else {
      alert(`Error deleting student: ${result.error}`);
    }
    setIsConfirmDialogOpen(false);
    setStudentToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsConfirmDialogOpen(false);
    setStudentToDelete(null);
  };

  const handleCancelEdit = () => {
    setFormData({
      name: '',
      nationalId: '',
      course: '',
      season: '',
      phone: '',
      location: ''
    });
    setIsEditing(false);
    setEditingStudentId(null);
  };

  const handleBulkUploadSubmit = async (e) => {
    e.preventDefault();
    if (!bulkUploadFile) {
      alert('Please select a file to upload');
      return;
    }
    
    await handleBulkUpload(bulkUploadFile, 'Student');
  };

  if (loading) {
    return <div>Loading students...</div>;
  }

  if (error) {
    return <div>Error loading students: {error}</div>;
  }

  return (
    <div>
      <h2>Student Management</h2>
      <div className="card form-container">
        <h3 id="student-form-heading">{isEditing ? 'Edit Student' : 'Add New Student'}</h3>
        <form id="addStudentForm" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Student Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              placeholder="Student Name" 
              required 
              value={formData.name}
              onChange={handleInputChange}
              autoComplete="name"
            />
          </div>
          <div className="form-field">
            <label htmlFor="nationalId">National ID</label>
            <input 
              type="text" 
              id="nationalId" 
              name="nationalId" 
              placeholder="National ID" 
              required 
              value={formData.nationalId}
              onChange={handleInputChange}
              autoComplete="off"
            />
          </div>
          <div className="form-field">
            <label htmlFor="course">Course</label>
            <input 
              type="text" 
              id="course" 
              name="course" 
              placeholder="Course" 
              value={formData.course}
              onChange={handleInputChange}
              autoComplete="off"
            />
          </div>
          <div className="form-field">
            <label htmlFor="season">Season</label>
            <input 
              type="number" 
              id="season" 
              name="season" 
              placeholder="Season" 
              value={formData.season}
              onChange={handleInputChange}
              autoComplete="off"
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
          <div className="form-field">
            <label htmlFor="location">Place of Living</label>
            <input 
              type="text" 
              id="location" 
              name="location" 
              placeholder="Place of Living" 
              value={formData.location}
              onChange={handleInputChange}
              autoComplete="street-address"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="button primary-button" id="saveStudentBtn">
              {isEditing ? 'Update Student' : 'Save Student'}
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
              id="cancelStudentBtn"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
        <div className="bulk-upload-section">
          <h3>Bulk Upload Students</h3>
          <form id="bulkUploadForm" onSubmit={handleBulkUploadSubmit}>
            <div className="form-field">
              <label htmlFor="bulkUploadFile">Bulk Upload File (.csv or .json)</label>
              <input 
                type="file" 
                id="bulkUploadFile" 
                name="bulkUploadFile" 
                accept=".csv, .json" 
                required
                onChange={handleFileChange}
              />
            </div>
            <div className="form-actions">
              <button 
                type="submit" 
                className="button secondary-button"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </form>
          {uploadStatus && (
            <div id="uploadStatus" style={{ marginTop: '1rem' }}>
              {uploadStatus}
            </div>
          )}
        </div>
      </div>
      <div className="card table-container">
        <h3>Student List</h3>
        <div style={{ marginBottom: '1rem' }}>
          <p>Total students: {totalCount}</p>
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
        <table id="studentTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Course</th>
              <th>ID</th>
              <th>Season</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map(student => (
                <tr key={student.id}>
                  <td>{student.get('name')}</td>
                  <td>{student.get('course') || 'N/A'}</td>
                  <td>{student.get('nationalId')}</td>
                  <td>{student.get('season') || 'N/A'}</td>
                  <td>{student.get('phone') || 'N/A'}</td>
                  <td className="actions">
                    <button 
                      className="button edit-button" 
                      onClick={() => handleEdit(student)}
                    >
                      Edit
                    </button>
                    <button 
                      className="button delete-button" 
                      onClick={() => handleDeleteClick(student.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No students found</td>
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
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default StudentsPage;