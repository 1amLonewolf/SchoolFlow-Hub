import React, { useState, useEffect } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useStudents } from '../hooks/useStudents';
import { useCourses } from '../hooks/useCourses';
import ConfirmDialog from '../components/ConfirmDialog';

const AttendancePage = () => {
  // Note: The addAttendanceRecord function in useAttendance hook enforces that
  // a student can only have one attendance record per day (either present or absent)
  const { 
    attendanceRecords, 
    loading: attendanceLoading, 
    error: attendanceError, 
    addAttendanceRecord, 
    removeAttendanceRecord,
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  } = useAttendance();
  
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { courses, loading: coursesLoading, error: coursesError } = useCourses();
  
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    date: '',
    status: 'Present'
  });
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Set today's date as default
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      date: today
    }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Find the selected student and course objects
    const selectedStudent = students.find(student => student.id === formData.studentId);
    const selectedCourse = courses.find(course => course.id === formData.courseId);
    
    if (!selectedStudent || !selectedCourse) {
      alert('SchoolFlow Hub: Please select a valid student and course');
      return;
    }
    
    const attendanceData = {
      student: selectedStudent,
      course: selectedCourse,
      date: new Date(formData.date),
      status: formData.status
    };

    const result = await addAttendanceRecord(attendanceData);
    if (result.success) {
      // Reset form
      setFormData({
        studentId: '',
        courseId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Present'
      });
      alert('SchoolFlow Hub: Attendance record added successfully!');
    } else {
      alert(`SchoolFlow Hub: ${result.error}`);
    }
  };

  const handleDeleteClick = (recordId) => {
    setRecordToDelete(recordId);
    setIsConfirmDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const result = await removeAttendanceRecord(recordToDelete);
    if (result.success) {
      alert('SchoolFlow Hub: Attendance record deleted successfully!');
    } else {
      alert(`SchoolFlow Hub: Error deleting attendance record: ${result.error}`);
    }
    setIsConfirmDialogOpen(false);
    setRecordToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsConfirmDialogOpen(false);
    setRecordToDelete(null);
  };

  const handleRefresh = () => {
    refresh();
  };

  const loading = attendanceLoading || studentsLoading || coursesLoading;
  const error = attendanceError || studentsError || coursesError;

  if (loading) {
    return <div>SchoolFlow Hub: Loading attendance records...</div>;
  }

  if (error) {
    return <div>SchoolFlow Hub: Error loading data: {error}</div>;
  }

  return (
    <div>
      <h2>Attendance</h2>
      <div className="card form-container">
        <h3>Record Attendance</h3>
        <p style={{ fontStyle: 'italic', color: '#666', marginBottom: '15px' }}>
          Note: Each student can only have one attendance record per day (either Present or Absent).
        </p>
        <form id="addAttendanceForm" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="studentId">Student</label>
            <select 
              id="studentId" 
              name="studentId" 
              required
              value={formData.studentId}
              onChange={handleInputChange}
            >
              <option value="">-- Select a Student --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.get('name')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-field">
            <label htmlFor="courseId">Course</label>
            <select 
              id="courseId" 
              name="courseId" 
              required
              value={formData.courseId}
              onChange={handleInputChange}
            >
              <option value="">-- Select a Course --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.get('name')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-field">
            <label htmlFor="date">Date</label>
            <input 
              type="date" 
              id="date" 
              name="date" 
              required
              value={formData.date}
              onChange={handleInputChange}
              autoComplete="off"
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select 
              id="status" 
              name="status" 
              required
              value={formData.status}
              onChange={handleInputChange}
              autoComplete="off"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="button primary-button">Record Attendance</button>
            <button type="button" className="button secondary-button" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        </form>
      </div>
      
      <div className="card table-container">
        <h3>Attendance Records</h3>
        <div id="attendanceControls" className="attendance-controls" style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px'}}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center'}}>
            <div>
              <span id="attendanceRecordCount" style={{fontWeight: '500'}}>Total Records: <span id="attendanceTotalCount">{totalCount}</span></span>
            </div>
            <div>
              <span id="attendancePageInfo">Page {currentPage} of {totalPages}</span>
            </div>
            <div>
              <button 
                id="attendancePrevPage" 
                className="button secondary-button" 
                onClick={prevPage}
                disabled={currentPage === 1}
                style={{padding: '5px 10px', marginRight: '5px'}}
              >
                Previous
              </button>
              <button 
                id="attendanceNextPage" 
                className="button secondary-button" 
                onClick={nextPage}
                disabled={currentPage === totalPages}
                style={{padding: '5px 10px'}}
              >
                Next
              </button>
            </div>
          </div>
        </div>
        <table id="attendanceTable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Course</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.length > 0 ? (
              attendanceRecords.map(record => {
                const student = record.get('student');
                const course = record.get('course');
                const date = record.get('date');
                
                return (
                  <tr key={record.id}>
                    <td>{date ? new Date(date).toLocaleDateString() : 'N/A'}</td>
                    <td>{student ? student.get('name') : 'N/A'}</td>
                    <td>{course ? course.get('name') : 'N/A'}</td>
                    <td>{record.get('status')}</td>
                    <td className="actions">
                      <button 
                        className="button delete-button" 
                        onClick={() => handleDeleteClick(record.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No attendance records found</td>
              </tr>
            )}
          </tbody>
        </table>
        <div id="attendancePagination" className="pagination-controls" style={{marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}>
          <button 
            id="attendancePrevPageBottom" 
            className="button secondary-button" 
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span id="attendancePageInfoBottom">Page {currentPage} of {totalPages}</span>
          <button 
            id="attendanceNextPageBottom" 
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
        title="SchoolFlow Hub: Delete Attendance Record"
        message="Are you sure you want to delete this attendance record? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default AttendancePage;