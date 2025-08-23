import { useState, useEffect } from 'react';
import Parse from 'parse';
import { usePaginatedData } from './usePaginatedData';

export const useTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use pagination for teachers
  const {
    data: paginatedTeachers,
    loading: paginatedLoading,
    error: paginatedError,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  } = usePaginatedData('Teacher', {
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (paginatedTeachers) {
      setTeachers(paginatedTeachers);
      setLoading(false);
    }
    if (paginatedError) {
      setError(paginatedError);
      setLoading(false);
    }
  }, [paginatedTeachers, paginatedError]);

  const addTeacher = async (teacherData) => {
    try {
      const Teacher = Parse.Object.extend('Teacher');
      const teacher = new Teacher();
      
      // Set teacher properties
      Object.keys(teacherData).forEach(key => {
        teacher.set(key, teacherData[key]);
      });
      
      const result = await teacher.save();
      // Refresh the teachers list
      refresh();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateTeacher = async (teacherId, teacherData) => {
    try {
      const Teacher = Parse.Object.extend('Teacher');
      const query = new Parse.Query(Teacher);
      const teacher = await query.get(teacherId);
      
      // Update teacher properties
      Object.keys(teacherData).forEach(key => {
        teacher.set(key, teacherData[key]);
      });
      
      const result = await teacher.save();
      // Refresh the teachers list
      refresh();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeTeacher = async (teacherId) => {
    try {
      const Teacher = Parse.Object.extend('Teacher');
      const query = new Parse.Query(Teacher);
      const teacher = await query.get(teacherId);
      await teacher.destroy();
      // Refresh the teachers list
      refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    teachers,
    loading: paginatedLoading,
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
    prevPage,
    refresh
  };
};