import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const OverviewPage = () => {
  const navigate = useNavigate();

  // Sample data for charts
  const coursePopularityData = {
    labels: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
    datasets: [
      {
        label: 'Enrollment',
        data: [45, 38, 42, 35, 50],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const attendanceData = {
    labels: ['January', 'February', 'March', 'April', 'May'],
    datasets: [
      {
        label: 'Attendance Rate',
        data: [85, 88, 92, 87, 90],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const topStudentsData = {
    labels: ['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Eva Davis'],
    datasets: [
      {
        data: [95, 92, 90, 88, 85],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        font: {
          size: 16,
        },
      },
    },
  };

  const handleAddStudent = () => {
    navigate('/students');
  };

  const handleAddTeacher = () => {
    navigate('/teachers');
  };

  const handleAddCourse = () => {
    navigate('/courses');
  };

  const handleRecordAttendance = () => {
    navigate('/attendance');
  };

  const handleRefreshDashboard = () => {
    window.location.reload();
  };

  return (
    <div>
      <h2>Dashboard Overview</h2>
      <div className="overview-grid">
        <div className="chart-container card">
          <Bar 
            data={coursePopularityData} 
            options={{
              ...chartOptions,
              title: {
                display: true,
                text: 'Course Popularity',
                font: {
                  size: 16,
                },
              },
            }} 
          />
        </div>
        <div className="chart-container card">
          <Bar 
            data={attendanceData} 
            options={{
              ...chartOptions,
              title: {
                display: true,
                text: 'Overall Attendance',
                font: {
                  size: 16,
                },
              },
            }} 
          />
        </div>
        <div className="chart-container card">
          <Pie 
            data={topStudentsData} 
            options={{
              ...chartOptions,
              title: {
                display: true,
                text: 'Top Students',
                font: {
                  size: 16,
                },
              },
            }} 
          />
        </div>
      </div>
      <div className="quick-actions">
        <button className="button primary-button" onClick={handleAddStudent}>Add Student</button>
        <button className="button primary-button" onClick={handleAddTeacher}>Add Teacher</button>
        <button className="button primary-button" onClick={handleAddCourse}>Add Course</button>
        <button className="button primary-button" onClick={handleRecordAttendance}>Record Attendance</button>
        <button className="button secondary-button" onClick={handleRefreshDashboard}>Refresh Dashboard</button>
      </div>
    </div>
  );
};

export default OverviewPage;