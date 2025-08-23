import { useState, useEffect } from 'react';
import Parse from 'parse';
import { usePaginatedData } from './usePaginatedData';

export const useAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use pagination for attendance records
  const {
    data: paginatedAttendance,
    loading: paginatedLoading,
    error: paginatedError,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  } = usePaginatedData('Attendance', {
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
    // Removed include for now to avoid 400 errors
  });

  useEffect(() => {
    if (paginatedAttendance) {
      setAttendanceRecords(paginatedAttendance);
      setLoading(false);
    }
    if (paginatedError) {
      console.error('Error loading attendance:', paginatedError);
      setError(paginatedError);
      setLoading(false);
    }
  }, [paginatedAttendance, paginatedError]);

  const addAttendanceRecord = async (attendanceData) => {
    try {
      // Enforce that a student can only have one attendance record per day
      // Check if an attendance record already exists for this student on this date
      const Attendance = Parse.Object.extend('Attendance');
      const query = new Parse.Query(Attendance);
      
      // Query for existing record with same student and date
      query.equalTo('student', attendanceData.student);
      query.equalTo('date', attendanceData.date);
      
      const existingRecords = await query.find();
      
      if (existingRecords.length > 0) {
        return { 
          success: false, 
          error: 'Duplicate Record Prevention: This student already has an attendance record for this date. Please delete the existing record first if you need to make changes.' 
        };
      }
      
      const attendanceRecord = new Attendance();
      
      // Set attendance properties
      Object.keys(attendanceData).forEach(key => {
        attendanceRecord.set(key, attendanceData[key]);
      });
      
      const result = await attendanceRecord.save();
      
      // Refresh the attendance records list
      refresh();
      
      return { success: true, data: result };
    } catch (err) {
      console.error('SchoolFlow Hub - Error adding attendance record:', err);
      return { success: false, error: `SchoolFlow Hub encountered an error: ${err.message}` };
    }
  };

  const removeAttendanceRecord = async (recordId) => {
    try {
      const Attendance = Parse.Object.extend('Attendance');
      const query = new Parse.Query(Attendance);
      const record = await query.get(recordId);
      await record.destroy();
      
      // Refresh the attendance records list
      refresh();
      
      return { success: true };
    } catch (err) {
      console.error('SchoolFlow Hub - Error removing attendance record:', err);
      return { success: false, error: `SchoolFlow Hub encountered an error: ${err.message}` };
    }
  };

  return {
    attendanceRecords,
    loading: paginatedLoading,
    error: paginatedError,
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
  };
};