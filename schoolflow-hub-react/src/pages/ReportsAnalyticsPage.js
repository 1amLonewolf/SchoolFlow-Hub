import React from 'react';
import { useDataExport } from '../hooks/useDataExport';

const ReportsAnalyticsPage = () => {
  const { isExporting, exportToCsv, exportToJson } = useDataExport();

  const handleRefreshData = () => {
    alert('Refreshing data...');
  };

  const handleExportStudentsCsv = () => {
    // In a real app, you would fetch actual student data
    const mockStudentData = [
      { id: 1, name: 'John Doe', course: 'Computer Science', season: 1 },
      { id: 2, name: 'Jane Smith', course: 'Mathematics', season: 1 },
      { id: 3, name: 'Robert Johnson', course: 'Physics', season: 2 }
    ];
    
    const result = exportToCsv(mockStudentData, 'students');
    if (!result.success) {
      alert(`Export failed: ${result.error}`);
    }
  };

  const handleExportAttendanceCsv = () => {
    // In a real app, you would fetch actual attendance data
    const mockAttendanceData = [
      { date: '2023-01-15', student: 'John Doe', course: 'Computer Science', status: 'Present' },
      { date: '2023-01-15', student: 'Jane Smith', course: 'Mathematics', status: 'Absent' }
    ];
    
    const result = exportToCsv(mockAttendanceData, 'attendance');
    if (!result.success) {
      alert(`Export failed: ${result.error}`);
    }
  };

  const handleDownloadChart = () => {
    alert('Downloading chart...');
  };

  const handleExportSummaryJson = () => {
    // In a real app, you would fetch actual summary data
    const mockSummaryData = {
      totalStudents: 45,
      totalCourses: 8,
      totalTeachers: 12,
      reportDate: new Date().toISOString()
    };
    
    const result = exportToJson(mockSummaryData, 'summary');
    if (!result.success) {
      alert(`Export failed: ${result.error}`);
    }
  };

  return (
    <div>
      <h2>Reports & Analytics</h2>
      <div className="quick-actions">
        <button className="button primary-button" id="refreshDashboardReportsBtn" onClick={handleRefreshData}>
          Refresh Data
        </button>
        <button 
          className="button secondary-button" 
          id="exportStudentsCsvBtn"
          onClick={handleExportStudentsCsv}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Students CSV'}
        </button>
        <button 
          className="button secondary-button" 
          id="exportAttendanceCsvBtn"
          onClick={handleExportAttendanceCsv}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Attendance CSV'}
        </button>
        <button className="button secondary-button" id="downloadLowAssignmentsBtn" onClick={handleDownloadChart}>
          Download Chart
        </button>
        <button 
          className="button secondary-button" 
          id="exportSummaryJsonBtn"
          onClick={handleExportSummaryJson}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Summary JSON'}
        </button>
      </div>
      
      <div className="reports-grid">
        <div className="report-card chart-card">
          <h3>Low Performing Assignments</h3>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <p>Chart visualization would appear here</p>
          </div>
        </div>
        
        <div className="report-card">
          <h3>Summary</h3>
          <div className="report-content">
            <p>Key metrics based on current data:</p>
            <ul>
              <li>Total students: <span id="summaryTotalStudents">0</span></li>
              <li>Total courses: <span id="summaryTotalCourses">0</span></li>
              <li>Total teachers: <span id="summaryTotalTeachers">0</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalyticsPage;