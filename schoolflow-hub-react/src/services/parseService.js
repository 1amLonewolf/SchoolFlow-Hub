// services/parseService.js
import Parse from 'parse';

// Back4App Parse SDK Initialization
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
const B4A_SERVER_URL = 'https://parseapi.back4app.com/';

// Initialize Parse SDK
Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
Parse.serverURL = B4A_SERVER_URL;

export const ParseService = {
  // User authentication
  async login(username, password) {
    try {
      const user = await Parse.User.logIn(username, password);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async logout() {
    try {
      await Parse.User.logOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getCurrentUser() {
    return Parse.User.current();
  },

  // Student operations
  async getStudents() {
    try {
      const Student = Parse.Object.extend('Student');
      const query = new Parse.Query(Student);
      const results = await query.find();
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createStudent(studentData) {
    try {
      const Student = Parse.Object.extend('Student');
      const student = new Student();
      
      // Set student properties
      Object.keys(studentData).forEach(key => {
        student.set(key, studentData[key]);
      });
      
      const result = await student.save();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateStudent(studentId, studentData) {
    try {
      const Student = Parse.Object.extend('Student');
      const query = new Parse.Query(Student);
      const student = await query.get(studentId);
      
      // Update student properties
      Object.keys(studentData).forEach(key => {
        student.set(key, studentData[key]);
      });
      
      const result = await student.save();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteStudent(studentId) {
    try {
      const Student = Parse.Object.extend('Student');
      const query = new Parse.Query(Student);
      const student = await query.get(studentId);
      await student.destroy();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Teacher operations
  async getTeachers() {
    try {
      const Teacher = Parse.Object.extend('Teacher');
      const query = new Parse.Query(Teacher);
      const results = await query.find();
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createTeacher(teacherData) {
    try {
      const Teacher = Parse.Object.extend('Teacher');
      const teacher = new Teacher();
      
      // Set teacher properties
      Object.keys(teacherData).forEach(key => {
        teacher.set(key, teacherData[key]);
      });
      
      const result = await teacher.save();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Course operations
  async getCourses() {
    try {
      const Course = Parse.Object.extend('Course');
      const query = new Parse.Query(Course);
      const results = await query.find();
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createCourse(courseData) {
    try {
      const Course = Parse.Object.extend('Course');
      const course = new Course();
      
      // Set course properties
      Object.keys(courseData).forEach(key => {
        course.set(key, courseData[key]);
      });
      
      const result = await course.save();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export default ParseService;