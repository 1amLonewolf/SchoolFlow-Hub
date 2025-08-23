import { useState, useEffect } from 'react';
import Parse from 'parse';
import { usePaginatedData } from './usePaginatedData';

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use pagination for courses
  const {
    data: paginatedCourses,
    loading: paginatedLoading,
    error: paginatedError,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  } = usePaginatedData('Course', {
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (paginatedCourses) {
      setCourses(paginatedCourses);
      setLoading(false);
    }
    if (paginatedError) {
      setError(paginatedError);
      setLoading(false);
    }
  }, [paginatedCourses, paginatedError]);

  const addCourse = async (courseData) => {
    try {
      const Course = Parse.Object.extend('Course');
      const course = new Course();
      
      // Set course properties
      Object.keys(courseData).forEach(key => {
        course.set(key, courseData[key]);
      });
      
      const result = await course.save();
      // Refresh the courses list
      refresh();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateCourse = async (courseId, courseData) => {
    try {
      const Course = Parse.Object.extend('Course');
      const query = new Parse.Query(Course);
      const course = await query.get(courseId);
      
      // Update course properties
      Object.keys(courseData).forEach(key => {
        course.set(key, courseData[key]);
      });
      
      const result = await course.save();
      // Refresh the courses list
      refresh();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeCourse = async (courseId) => {
    try {
      const Course = Parse.Object.extend('Course');
      const query = new Parse.Query(Course);
      const course = await query.get(courseId);
      await course.destroy();
      // Refresh the courses list
      refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    courses,
    loading: paginatedLoading,
    error,
    addCourse,
    updateCourse,
    removeCourse,
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