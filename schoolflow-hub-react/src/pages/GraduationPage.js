import React from 'react';
import { useGraduation } from '../hooks/useGraduation';

const GraduationPage = () => {
  const { 
    eligibleStudents, 
    loading, 
    error, 
    checkEligibility 
  } = useGraduation();

  const handleCheckEligibility = async () => {
    await checkEligibility();
  };

  const handleDownloadList = () => {
    // In a real app, you would generate and download a file
    alert('Downloading eligible students list...');
  };

  return (
    <div>
      <h2>Graduation Eligibility</h2>
      <div className="card">
        <h3>Check Eligibility</h3>
        <p>Verify which students meet the requirements for graduation based on attendance and exam completion.</p>
        <button 
          className="button primary-button" 
          id="checkGraduationBtn"
          onClick={handleCheckEligibility}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Eligibility Now'}
        </button>
      </div>
      
      <div id="graduationResults" className="card">
        <h3>Results</h3>
        <div id="graduationStats">
          {eligibleStudents.length > 0 && (
            <p>Total eligible students: {eligibleStudents.length}</p>
          )}
        </div>
        
        <h4>Eligible Students</h4>
        <div className="download-section" style={{margin: '15px 0'}}>
          <button 
            id="downloadGraduationList" 
            className="button secondary-button"
            onClick={handleDownloadList}
            disabled={eligibleStudents.length === 0}
          >
            Download Eligible Students List
          </button>
        </div>
        
        <div className="table-container" id="eligibleStudentsContainer">
          <table id="eligibleStudentsTable">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Course</th>
              </tr>
            </thead>
            <tbody>
              {eligibleStudents.length > 0 ? (
                eligibleStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.course}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center' }}>
                    {error ? `Error: ${error}` : 'No eligible students found. Run eligibility check first.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GraduationPage;