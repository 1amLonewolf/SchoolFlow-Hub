import { useState, useEffect } from 'react';
import Parse from 'parse';
import { usePaginatedData } from './usePaginatedData';

export const useExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use pagination for exams
  const {
    data: paginatedExams,
    loading: paginatedLoading,
    error: paginatedError,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  } = usePaginatedData('Exam', {
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
    // Removed include for now to avoid 400 errors
  });

  useEffect(() => {
    if (paginatedExams) {
      setExams(paginatedExams);
      setLoading(false);
    }
    if (paginatedError) {
      console.error('Error loading exams:', paginatedError);
      setError(paginatedError);
      setLoading(false);
    }
  }, [paginatedExams, paginatedError]);

  const addExam = async (examData) => {
    try {
      const Exam = Parse.Object.extend('Exam');
      const exam = new Exam();
      
      // Set exam properties
      Object.keys(examData).forEach(key => {
        exam.set(key, examData[key]);
      });
      
      const result = await exam.save();
      
      // Refresh the exams list
      refresh();
      
      return { success: true, data: result };
    } catch (err) {
      console.error('Error adding exam:', err);
      return { success: false, error: err.message };
    }
  };

  const updateExam = async (examId, examData) => {
    try {
      const Exam = Parse.Object.extend('Exam');
      const query = new Parse.Query(Exam);
      const exam = await query.get(examId);
      
      // Update exam properties
      Object.keys(examData).forEach(key => {
        exam.set(key, examData[key]);
      });
      
      const result = await exam.save();
      // Refresh the exams list
      refresh();
      return { success: true, data: result };
    } catch (err) {
      console.error('Error updating exam:', err);
      return { success: false, error: err.message };
    }
  };

  const removeExam = async (examId) => {
    try {
      const Exam = Parse.Object.extend('Exam');
      const query = new Parse.Query(Exam);
      const exam = await query.get(examId);
      await exam.destroy();
      
      // Refresh the exams list
      refresh();
      
      return { success: true };
    } catch (err) {
      console.error('Error removing exam:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    exams,
    loading: paginatedLoading,
    error: paginatedError,
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
  };
};