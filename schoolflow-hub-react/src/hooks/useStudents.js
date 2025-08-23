import { useState, useEffect } from 'react';
import Parse from 'parse';
import { usePaginatedData } from './usePaginatedData';

export const useStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use pagination for students
  const {
    data: paginatedStudents,
    loading: paginatedLoading,
    error: paginatedError,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  } = usePaginatedData('Student', {
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (paginatedStudents) {
      setStudents(paginatedStudents);
      setLoading(false);
    }
    if (paginatedError) {
      setError(paginatedError);
      setLoading(false);
    }
  }, [paginatedStudents, paginatedError]);

  const addStudent = async (studentData) => {
    try {
      const Student = Parse.Object.extend('Student');
      const student = new Student();
      
      // Set student properties
      Object.keys(studentData).forEach(key => {
        student.set(key, studentData[key]);
      });
      
      const result = await student.save();
      // Refresh the students list
      refresh();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateStudent = async (studentId, studentData) => {
    try {
      const Student = Parse.Object.extend('Student');
      const query = new Parse.Query(Student);
      const student = await query.get(studentId);
      
      // Update student properties
      Object.keys(studentData).forEach(key => {
        student.set(key, studentData[key]);
      });
      
      const result = await student.save();
      // Refresh the students list
      refresh();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeStudent = async (studentId) => {
    try {
      const Student = Parse.Object.extend('Student');
      const query = new Parse.Query(Student);
      const student = await query.get(studentId);
      await student.destroy();
      // Refresh the students list
      refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    students,
    loading: paginatedLoading,
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
    prevPage,
    refresh
  };
};