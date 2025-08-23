import React, { useState } from 'react';
import { useCourses } from '../hooks/useCourses';
import { useTeachers } from '../hooks/useTeachers';
import ConfirmDialog from '../components/ConfirmDialog';

const CoursesPage = () => {
  const { 
    courses, 
    loading: coursesLoading, 
    error: coursesError, 
    addCourse, 
    updateCourse, 
    removeCourse,
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage
  } = useCourses();
  
  const { teachers, loading: teachersLoading, error: teachersError } = useTeachers();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedTeacher: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const courseData = {
      name: formData.name,
      description: formData.description,
      assignedTeacher: formData.assignedTeacher
    };

    let result;
    if (isEditing) {
      result = await updateCourse(editingCourseId, courseData);
    } else {
      result = await addCourse(courseData);
    }

    if (result.success) {
      // Reset form
      setFormData({
        name: '',
        description: '',
        assignedTeacher: ''
      });
      setIsEditing(false);
      setEditingCourseId(null);
      alert(isEditing ? 'Course updated successfully!' : 'Course added successfully!');
    } else {
      alert(`Error ${isEditing ? 'updating' : 'adding'} course: ${result.error}`);
    }
  };

  const handleEdit = (course) => {
    setFormData({
      name: course.get('name'),
      description: course.get('description'),
      assignedTeacher: course.get('assignedTeacher') || ''
    });
    setIsEditing(true);
    setEditingCourseId(course.id);
    // Scroll to the form
    document.getElementById('course-form-heading').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteClick = (courseId) => {
    setCourseToDelete(courseId);
    setIsConfirmDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const result = await removeCourse(courseToDelete);
    if (result.success) {
      alert('Course deleted successfully!');
    } else {
      alert(`Error deleting course: ${result.error}`);
    }
    setIsConfirmDialogOpen(false);
    setCourseToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsConfirmDialogOpen(false);
    setCourseToDelete(null);
  };

  const handleCancelEdit = () => {
    setFormData({
      name: '',
      description: '',
      assignedTeacher: ''
    });
    setIsEditing(false);
    setEditingCourseId(null);
  };

  const loading = coursesLoading || teachersLoading;
  const error = coursesError || teachersError;

  if (loading) {
    return <div>Loading courses and teachers...</div>;
  }

  if (error) {
    return <div>SchoolFlow Hub: Error loading data: {error}</div>;
  }

  return (
    <div>
      <h2>Course Management</h2>
      <div className="card form-container">
        <h3 id="course-form-heading">{isEditing ? 'Edit Course' : 'Add New Course'}</h3>
        <form id="addCourseForm" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Course Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              placeholder="Course Name" 
              required 
              value={formData.name}
              onChange={handleInputChange}
              autoComplete="off"
            />
          </div>
          <div className="form-field">
            <label htmlFor="description">Course Description</label>
            <textarea 
              id="description" 
              name="description" 
              placeholder="Course Description" 
              required
              value={formData.description}
              onChange={handleInputChange}
              autoComplete="off"
            ></textarea>
          </div>
          <div className="form-field">
            <label htmlFor="assignedTeacher">Assigned Teacher</label>
            <select 
              id="assignedTeacher" 
              name="assignedTeacher" 
              required
              value={formData.assignedTeacher}
              onChange={handleInputChange}
              autoComplete="off"
            >
              <option value="">-- Select Teacher --</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.get('name')}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="button primary-button" id="saveCourseBtn">
              {isEditing ? 'Update Course' : 'Save Course'}
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
              id="cancelCourseBtn"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <div className="card table-container">
        <h3>Course List</h3>
        <div style={{ marginBottom: '1rem' }}>
          <p>Total courses: {totalCount}</p>
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
        <table id="courseTable">
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Description</th>
              <th>Assigned Teacher</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length > 0 ? (
              courses.map(course => (
                <tr key={course.id}>
                  <td>{course.get('name')}</td>
                  <td>{course.get('description')}</td>
                  <td>{course.get('assignedTeacher') || 'N/A'}</td>
                  <td className="actions">
                    <button 
                      className="button edit-button" 
                      onClick={() => handleEdit(course)}
                    >
                      Edit
                    </button>
                    <button 
                      className="button delete-button" 
                      onClick={() => handleDeleteClick(course.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>No courses found</td>
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
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default CoursesPage;