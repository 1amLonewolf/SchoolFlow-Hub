import React, { useState } from 'react';
import { useExams } from '../hooks/useExams';
import { useStudents } from '../hooks/useStudents';
import { useCourses } from '../hooks/useCourses';
import ConfirmDialog from '../components/ConfirmDialog';

const ExamsPage = () => {
  const { 
    exams, 
    loading: examsLoading, 
    error: examsError, 
    addExam, 
    updateExam, 
    removeExam,
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  } = useExams();
  
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { courses, loading: coursesLoading, error: coursesError } = useCourses();
  
  const [formData, setFormData] = useState({
    studentId: '',
    examType: '',
    category: '',
    courseId: '',
    score: '',
    totalScore: '',
    date: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

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
      alert('Please select a valid student and course');
      return;
    }
    
    const examData = {
      student: selectedStudent,
      examType: formData.examType,
      category: formData.category,
      course: selectedCourse, // set the full parse.object
      score: parseInt(formData.score),
      totalScore: parseInt(formData.totalScore),
      date: new Date(formData.date)
    };

    let result;
    if (isEditing) {
      result = await updateExam(editingExamId, examData);
    } else {
      result = await addExam(examData);
    }

    if (result.success) {
      // Reset form
      setFormData({
        studentId: '',
        examType: '',
        category: '',
        courseId: '',
        score: '',
        totalScore: '',
        date: ''
      });
      setIsEditing(false);
      setEditingExamId(null);
      alert(isEditing ? 'Exam record updated successfully!' : 'Exam record added successfully!');
    } else {
      alert(`Error ${isEditing ? 'updating' : 'adding'} exam record: ${result.error}`);
    }
  };

  const handleEdit = (exam) => {
    const student = exam.get('student');
    const course = exam.get('course');
    const date = exam.get('date');
    
    setFormData({
      studentId: student ? student.id : '',
      examType: exam.get('examType'),
      category: exam.get('category'),
      courseId: course ? course.id : '',
      score: exam.get('score'),
      totalScore: exam.get('totalScore'),
      date: date ? new Date(date).toISOString().split('T')[0] : ''
    });
    setIsEditing(true);
    setEditingExamId(exam.id);
    // Scroll to the form
    document.getElementById('exam-form-heading').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteClick = (examId) => {
    setExamToDelete(examId);
    setIsConfirmDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const result = await removeExam(examToDelete);
    if (result.success) {
      alert('Exam record deleted successfully!');
    } else {
      alert(`Error deleting exam record: ${result.error}`);
    }
    setIsConfirmDialogOpen(false);
    setExamToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsConfirmDialogOpen(false);
    setExamToDelete(null);
  };

  const handleCancelEdit = () => {
    setFormData({
      studentId: '',
      examType: '',
      category: '',
      courseId: '',
      score: '',
      totalScore: '',
      date: ''
    });
    setIsEditing(false);
    setEditingExamId(null);
  };

  const handleRefresh = () => {
    refresh();
  };

  const loading = examsLoading || studentsLoading || coursesLoading;
  const error = examsError || studentsError || coursesError;

  if (loading) {
    return <div>SchoolFlow Hub: Loading exam records...</div>;
  }

  if (error) {
    return <div>SchoolFlow Hub: Error loading data: {error}</div>;
  }

  return (
    <div>
      <h2>Exam Records</h2>
      <div className="card form-container">
        <h3 id="exam-form-heading">{isEditing ? 'Edit Exam Record' : 'Add New Exam Record'}</h3>
        <form id="addExamForm" onSubmit={handleSubmit}>
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
            <label htmlFor="examType">Exam Type</label>
            <select 
              id="examType" 
              name="examType" 
              required
              value={formData.examType}
              onChange={handleInputChange}
            >
              <option value="">-- Select Exam Type --</option>
              <option value="Midterm">Midterm</option>
              <option value="Endterm">Endterm</option>
            </select>
          </div>
          
          <div className="form-field">
            <label htmlFor="category">Exam Category</label>
            <select 
              id="category" 
              name="category" 
              required
              value={formData.category}
              onChange={handleInputChange}
            >
              <option value="">-- Select Category --</option>
              <option value="Chapel">Chapel</option>
              <option value="Course">Course</option>
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
            <label htmlFor="score">Score</label>
            <input 
              type="number" 
              id="score" 
              name="score" 
              placeholder="Score" 
              min="0" 
              required
              value={formData.score}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="totalScore">Total Score</label>
            <input 
              type="number" 
              id="totalScore" 
              name="totalScore" 
              placeholder="Total Score" 
              min="1" 
              required
              value={formData.totalScore}
              onChange={handleInputChange}
            />
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
            />
          </div>
          
          <div className="form-actions">
            <button type="submit" className="button primary-button" id="saveExamBtn">
              {isEditing ? 'Update Exam Record' : 'Save Exam Record'}
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
              id="cancelExamBtn"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="button secondary-button" 
              onClick={handleRefresh}
            >
              Refresh
            </button>
          </div>
        </form>
      </div>
      
      <div className="card table-container">
        <h3>Exam Records</h3>
        {/* Exam Records Controls */}
        <div className="exam-controls" style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px'}}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center'}}>
            <div>
              <span id="examRecordCount" style={{fontWeight: '500'}}>Total Records: <span id="examTotalCount">{totalCount}</span></span>
            </div>
            <div>
              <span id="examPageInfo">Page {currentPage} of {totalPages}</span>
            </div>
            <div>
              <button 
                id="examPrevPage" 
                className="button secondary-button" 
                onClick={prevPage}
                disabled={currentPage === 1}
                style={{padding: '5px 10px', marginRight: '5px'}}
              >
                Previous
              </button>
              <button 
                id="examNextPage" 
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
        {/* End Exam Records Controls */}
        <table id="examTable">
          <thead>
            <tr>
              <th>Student</th>
              <th>Exam Type</th>
              <th>Category</th>
              <th>Course</th>
              <th>Score</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.length > 0 ? (
              exams.map(exam => {
                const student = exam.get('student');
                const course = exam.get('course');
                const date = exam.get('date');
                
                return (
                  <tr key={exam.id}>
                    <td>{student ? student.get('name') : 'N/A'}</td>
                    <td>{exam.get('examType')}</td>
                    <td>{exam.get('category')}</td>
                    <td>{course ? course.get('name') : 'N/A'}</td>
                    <td>{exam.get('score')} / {exam.get('totalScore')}</td>
                    <td>{date ? new Date(date).toLocaleDateString() : 'N/A'}</td>
                    <td className="actions">
                      <button 
                        className="button edit-button" 
                        onClick={() => handleEdit(exam)}
                      >
                        Edit
                      </button>
                      <button 
                        className="button delete-button" 
                        onClick={() => handleDeleteClick(exam.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>No exam records found</td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Pagination Controls */}
        <div id="examPagination" className="pagination-controls" style={{marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}>
          <button 
            id="examPrevPageBottom" 
            className="button secondary-button" 
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span id="examPageInfoBottom">Page {currentPage} of {totalPages}</span>
          <button 
            id="examNextPageBottom" 
            className="button secondary-button" 
            onClick={nextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
        {/* End Pagination Controls */}
      </div>
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Exam Record"
        message="Are you sure you want to delete this exam record? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default ExamsPage;