import { useEffect } from 'react';
import Parse from 'parse';

// Preload common data that's used across multiple pages
export const useDataPreloader = () => {
  useEffect(() => {
    // Preload students
    const preloadStudents = async () => {
      try {
        const Student = Parse.Object.extend('Student');
        const query = new Parse.Query(Student);
        // Limit to recent students or use pagination
        query.limit(50);
        await query.find();
      } catch (error) {
        console.log('Failed to preload students:', error);
      }
    };

    // Preload teachers
    const preloadTeachers = async () => {
      try {
        const Teacher = Parse.Object.extend('Teacher');
        const query = new Parse.Query(Teacher);
        await query.find();
      } catch (error) {
        console.log('Failed to preload teachers:', error);
      }
    };

    // Preload courses
    const preloadCourses = async () => {
      try {
        const Course = Parse.Object.extend('Course');
        const query = new Parse.Query(Course);
        await query.find();
      } catch (error) {
        console.log('Failed to preload courses:', error);
      }
    };

    // Start preloading in the background
    preloadStudents();
    preloadTeachers();
    preloadCourses();
  }, []);
};