// js/dashboard.js

// Import our modules
import StudentManager from './studentManager.js';
import TeacherManager from './teacherManager.js';
import SeasonManager from './seasonManager.js';
import CourseManager from './courseManager.js';
import ExamManager from './examManager.js';
import AttendanceManager from './attendanceManager.js';
import Utils from './utils.js';

// Back4App Parse SDK Initialization
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
const B4A_SERVER_URL = 'https://parseapi.back4app.com/';

// Initialize Parse SDK
Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
Parse.serverURL = B4A_SERVER_URL;

// Create instances of our managers
window.studentManager = new StudentManager();
window.teacherManager = new TeacherManager();
window.courseManager = new CourseManager();
window.examManager = new ExamManager();
window.attendanceManager = new AttendanceManager();
window.seasonManager = new SeasonManager();
window.Utils = Utils;

// Global variables
window.currentSeason = 1;

// ======================
// INITIALIZATION
// ======================

async function initDashboard() {
    const ok = await bootstrapSessionFromLocalStorage();
    if (!ok) {
        Utils.showMessage('Authentication required. Redirecting to login...', 'error');
        return;
    }
    
    // Double-check that we have a valid Parse session
    const sessionValid = await refreshSessionToken();
    if (!sessionValid) {
        Utils.showMessage('Invalid session. Please log in again.', 'error');
        return;
    }
    
    attachEventListeners();
    
    // Display welcome message with admin indicator
    const currentUser = Parse.User.current();
    if (currentUser) {
        const username = currentUser.get('username');
        const isAdmin = currentUser.get('isAdmin') || false;
        const welcomeMessageElement = document.getElementById('welcomeMessage');
        if (welcomeMessageElement) {
            welcomeMessageElement.textContent = `Welcome, ${username}${isAdmin ? ' (Admin)' : ''}`;
        }
    }
    
    // Load data after confirming we have a valid session
    await loadAllData();
}

// ======================
// SESSION MANAGEMENT
// ======================

async function refreshSessionToken() {
    console.log("[refreshSessionToken] Checking user session...");
    const currentUser = Parse.User.current();

    if (currentUser) {
        try {
            await currentUser.fetch();
            console.log("[refreshSessionToken] Session is valid and refreshed.");
            return true;
        } catch (error) {
            console.error("[refreshSessionToken] Session refresh failed:", error);
            await Parse.User.logOut();
            Utils.showMessage('Your session has expired. Please log in again.', 'warning', 5000);
            setTimeout(() => window.location.href = 'loginPage.html', 5000);
            return false;
        }
    } else {
        console.log("[refreshSessionToken] No current user found. Redirecting to login.");
        Utils.showMessage('No valid session found. Please log in again.', 'error');
        setTimeout(() => window.location.href = 'loginPage.html', 2000);
        return false;
    }
}

async function bootstrapSessionFromLocalStorage() {
    try {
        if (localStorage.getItem('currentUser')) {
            localStorage.removeItem('currentUser');
        }
        const current = await Parse.User.currentAsync();
        if (current) return true;
    } catch (e) {
        console.warn('[bootstrapSession] currentAsync error:', e);
    }
    setTimeout(() => window.location.href = 'loginPage.html', 0);
    return false;
}

// ======================
// BACKEND COMMUNICATION
// ======================

/**
 * Convert a Parse Object to a plain JavaScript object
 * @param {Parse.Object} parseObject - The Parse Object to convert
 * @returns {Object} Plain JavaScript object with all Parse object properties
 */
function parseObjectToPlainObject(parseObject) {
    if (!parseObject) return null;
    
    // Get all attributes from the Parse object
    const attributes = parseObject.attributes || {};
    
    // Create a plain object with all the Parse object properties
    const plainObject = {
        id: parseObject.id,
        className: parseObject.className,
        createdAt: parseObject.createdAt,
        updatedAt: parseObject.updatedAt,
        ...attributes
    };
    
    return plainObject;
}

/**
 * Convert an array of Parse Objects to plain JavaScript objects
 * @param {Array} parseObjects - Array of Parse Objects
 * @returns {Array} Array of plain JavaScript objects
 */
function parseObjectsToPlainObjects(parseObjects) {
    if (!Array.isArray(parseObjects)) return [];
    return parseObjects.map(obj => parseObjectToPlainObject(obj));
}

// Generic data loading function
async function loadParseData(className) {
    try {
        console.log(`[loadParseData] Loading ${className} data from Parse backend...`);
        const query = new Parse.Query(className);
        const results = await query.find();
        console.log(`[loadParseData] Successfully loaded ${results.length} ${className} records`);
        
        // Convert Parse objects to plain JavaScript objects
        const plainObjects = parseObjectsToPlainObjects(results);
        
        if (className === 'Student') {
            console.log(`[loadParseData] Student records:`, plainObjects.map(s => ({
                id: s.id,
                name: s.name,
                nationalID: s.nationalID,
                course: s.course,
                season: s.season
            })));
        }
        
        return plainObjects;
    } catch (error) {
        console.error(`[loadParseData] Error fetching ${className} data:`, error);
        console.error(`[loadParseData] Error details - Code: ${error.code}, Message: ${error.message}`);
        
        let userMessage = `Error fetching ${className} data.`;
        if (error.code === Parse.Error.INVALID_SESSION_TOKEN) {
            userMessage = 'Your session has expired. Please log in again.';
            setTimeout(() => window.location.href = 'loginPage.html', 3000);
        } else if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
            userMessage = `${className} data not found.`;
        } else if (error.code === Parse.Error.CONNECTION_FAILED) {
            userMessage = 'Network error. Please check your connection.';
        } else if (error.code === Parse.Error.INTERNAL_SERVER_ERROR) {
            userMessage = 'Server error. Please try again later.';
        } else {
            userMessage = `Error fetching ${className} data: ${error.message || 'Unknown error'}`;
        }
        
        Utils.showMessage(userMessage, 'error');
        return [];
    }
}

// Generic data saving function
async function saveParseData(className, data, id = null) {
    try {
        // Ensure className is valid
        if (!className) {
            throw new Error('Class name is required');
        }
        
        // Validate data is an object
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be a valid object');
        }
        
        const Class = Parse.Object.extend(className);
        let object;
        
        if (id) {
            // For updates, fetch the existing object
            try {
                object = await new Parse.Query(className).get(id);
            } catch (fetchError) {
                if (fetchError.code === Parse.Error.OBJECT_NOT_FOUND) {
                    throw new Error(`${className} with id ${id} not found`);
                }
                throw fetchError;
            }
        } else {
            // For new objects, create a new instance
            object = new Class();
        }
        
        // Set the properties, filtering out any undefined or null values
        // Also filter out Parse-specific properties that shouldn't be set manually
        const reservedProperties = ['id', 'objectId', 'createdAt', 'updatedAt', 'className'];
        for (const key in data) {
            // Skip reserved properties, undefined/null values, and functions
            if (
                reservedProperties.includes(key) || 
                data[key] === undefined || 
                data[key] === null || 
                typeof data[key] === 'function'
            ) {
                continue;
            }
            
            // Special handling for date strings - convert to Date objects
            if (typeof data[key] === 'string' && !isNaN(Date.parse(data[key]))) {
                // Check if it's an ISO date string
                const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
                if (isoDateRegex.test(data[key])) {
                    object.set(key, new Date(data[key]));
                    continue;
                }
            }
            
            object.set(key, data[key]);
        }
        
        // Save the object
        const savedObject = await object.save();
        Utils.showMessage(`${className} saved successfully!`, 'success');
        await loadAllData();
        return parseObjectToPlainObject(savedObject); // Return the saved object as plain JS object
    } catch (error) {
        console.error(`Error saving ${className}:`, error);
        
        // More specific error messages
        let userMessage = `Error saving ${className}. Please try again.`;
        if (error.message) {
            userMessage = error.message;
        }
        
        Utils.showMessage(userMessage, 'error');
        throw error; // Re-throw the error so caller can handle it
    }
}

// Generic data deletion function
async function deleteParseData(className, id) {
    // Add defensive check for className and id
    if (!className || !id) {
        console.error('Error: className or id is undefined in deleteParseData', { className, id });
        Utils.showMessage('Error: Invalid parameters for deletion. Please try again.', 'error');
        return;
    }
    
    try {
        // First, retrieve the object to ensure it exists
        const object = await new Parse.Query(className).get(id);
        // Then destroy it
        await object.destroy();
        Utils.showMessage(`${className} deleted successfully.`, 'success');
        await loadAllData();
    } catch (error) {
        console.error(`Error deleting ${className}:`, error);
        if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
            Utils.showMessage(`Error: ${className} not found.`, 'error');
        } else if (error.code === Parse.Error.SESSION_MISSING || error.code === Parse.Error.INVALID_SESSION_TOKEN) {
            Utils.showMessage('Error: Your session has expired. Please log in again.', 'error');
            setTimeout(() => window.location.href = 'loginPage.html', 3000);
        } else {
            Utils.showMessage(`Error deleting ${className}. ${error.message || 'Please try again.'}`, 'error');
        }
    }
}

// Specific data access functions for Students
async function loadStudents() {
    return await loadParseData('Student');
}

async function saveStudent(studentData, studentId = null) {
    // Add default values for student data
    const data = {
        seasonId: window.currentSeason,
        isActive: true,
        enrollmentDate: new Date(),
        ...studentData
    };
    
    return await saveParseData('Student', data, studentId);
}

async function deleteStudent(studentId) {
    return await deleteParseData('Student', studentId);
}

async function archiveStudent(studentId) {
    return await saveParseData('Student', { isActive: false }, studentId);
}

// Specific data access functions for Teachers
async function loadTeachers() {
    return await loadParseData('Teacher');
}

async function saveTeacher(teacherData, teacherId = null) {
    return await saveParseData('Teacher', teacherData, teacherId);
}

async function deleteTeacher(teacherId) {
    return await deleteParseData('Teacher', teacherId);
}

// Specific data access functions for Courses
async function loadCourses() {
    return await loadParseData('Course');
}

async function saveCourse(courseData, courseId = null) {
    // Add default values for course data
    const data = {
        seasonId: window.currentSeason,
        isActive: true,
        ...courseData
    };
    
    return await saveParseData('Course', data, courseId);
}

async function deleteCourse(courseId) {
    return await deleteParseData('Course', courseId);
}

// Specific data access functions for Exams
async function loadExams() {
    return await loadParseData('Exam');
}

async function saveExam(examData, examId = null) {
    // Convert date string to Date object if needed
    const data = { ...examData };
    if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
    }
    
    return await saveParseData('Exam', data, examId);
}

async function deleteExam(examId) {
    return await deleteParseData('Exam', examId);
}

// Specific data access functions for Attendance
async function loadAttendanceRecords() {
    return await loadParseData('Attendance');
}

async function saveAttendanceRecord(attendanceData, recordId = null) {
    // Convert date string to Date object if needed
    const data = { ...attendanceData };
    if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
    }
    
    return await saveParseData('Attendance', data, recordId);
}

async function deleteAttendanceRecord(recordId) {
    return await deleteParseData('Attendance', recordId);
}

// ======================
// MAIN APPLICATION LOGIC
// ======================

async function loadAllData() {
    console.log("[loadAllData] Starting to load all dashboard data in parallel...");
    
    // Set current season
    window.currentSeason = seasonManager.getCurrentSeason();
    console.log(`[loadAllData] Current season: ${window.currentSeason}`);
    
    // Check if we have a valid session first
    const currentUser = Parse.User.current();
    if (!currentUser) {
        console.log("[loadAllData] No current user, skipping data load");
        Utils.showMessage('No valid session. Please log in again.', 'error');
        setTimeout(() => window.location.href = 'loginPage.html', 3000);
        return;
    }
    
    try {
        console.log("[loadAllData] Loading data from Parse backend...");
        const [students, attendanceRecords, teachers, courses, exams] = await Promise.all([
            loadStudents(),
            loadAttendanceRecords(),
            loadTeachers(),
            loadCourses(),
            loadExams(),
        ]);
        
        console.log(`[loadAllData] Data loaded from Parse:`);
        console.log(`  - Students: ${students.length}`);
        console.log(`  - Attendance: ${attendanceRecords.length}`);
        console.log(`  - Teachers: ${teachers.length}`);
        console.log(`  - Courses: ${courses.length}`);
        console.log(`  - Exams: ${exams.length}`);
        
        // Set data in our managers
        console.log("[loadAllData] Setting data in managers...");
        window.studentManager.setStudents(students);
        window.teacherManager.setTeachers(teachers);
        window.courseManager.setCourses(courses);
        window.examManager.setExams(exams);
        window.attendanceManager.setAttendanceRecords(attendanceRecords);
        
        console.log(`[loadAllData] Data stored in managers. Students: ${students.length}, Teachers: ${teachers.length}, Courses: ${courses.length}, Exams: ${exams.length}, Attendance: ${attendanceRecords.length}`);
        console.log("[loadAllData] Calling updateUI...");
        updateUI();
        console.log("[loadAllData] All data loaded and UI updated.");
    } catch (error) {
        console.error("[loadAllData] Critical error during data loading:", error);
        console.error("[loadAllData] Error details:", {
            message: error.message,
            stack: error.stack
        });
        Utils.showMessage('Critical error loading dashboard data. Some features may not work correctly.', 'error');
        // Still try to update UI with whatever data we have
        updateUI();
    }
}

function updateUI() {
    console.log("[updateUI] Starting UI update...");

    console.log("[updateUI] Rendering student table...");
    window.studentManager.renderStudentTable();
    console.log("[updateUI] Rendering teacher table...");
    window.teacherManager.renderTeacherTable();
    console.log("[updateUI] Rendering course table...");
    window.courseManager.renderCourseTable();
    console.log("[updateUI] Rendering exam table...");
    window.examManager.renderExamTable();
    console.log("[updateUI] Rendering attendance table...");
    window.attendanceManager.renderAttendanceTable();
    // We would also call render methods for other managers

    console.log("[updateUI] Populating teacher dropdown...");
    window.teacherManager.populateTeacherDropdown();

    // Update season displays
    console.log("[updateUI] Updating season displays...");
    seasonManager.updateSeasonDisplay();
    seasonManager.renderSeasonsTable();
    
    // Render overview charts
    console.log("[updateUI] Rendering overview charts...");
    renderOverviewCharts();
    
    // Update reports and analytics data
    console.log("[updateUI] Updating reports and analytics...");
    updateReportsAndAnalytics();

    console.log("[updateUI] UI update complete.");
}

/**
 * Render charts for the dashboard overview
 */
function renderOverviewCharts() {
    try {
        // Destroy existing charts if they exist
        if (window.coursePopularityChart && typeof window.coursePopularityChart.destroy === 'function') {
            window.coursePopularityChart.destroy();
        }
        if (window.overallAttendanceChart && typeof window.overallAttendanceChart.destroy === 'function') {
            window.overallAttendanceChart.destroy();
        }
        if (window.topStudentsChart && typeof window.topStudentsChart.destroy === 'function') {
            window.topStudentsChart.destroy();
        }

        // Course Popularity Chart
        const coursePopularityCtx = document.getElementById('coursePopularityChart');
        if (coursePopularityCtx) {
            // Get course data
            const courses = window.courseManager.getCourses();
            const courseNames = courses.map(course => course.name || 'Unnamed Course');
            const studentCounts = courses.map(course => {
                // Count students in this course for current season
                const courseId = course.id;
                return window.studentManager.getStudents().filter(student => 
                    student.course === courseId && 
                    student.seasonId === window.currentSeason
                ).length;
            });

            window.coursePopularityChart = new Chart(coursePopularityCtx, {
                type: 'bar',
                data: {
                    labels: courseNames,
                    datasets: [{
                        label: 'Number of Students',
                        data: studentCounts,
                        backgroundColor: 'rgba(47, 24, 87, 0.7)',
                        borderColor: 'rgba(47, 24, 87, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Course Popularity'
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // Overall Attendance Chart
        const overallAttendanceCtx = document.getElementById('overallAttendanceChart');
        if (overallAttendanceCtx) {
            // Get attendance data
            const attendanceStats = window.attendanceManager.getAttendanceStats();
            const presentCount = attendanceStats.presentCount;
            const absentCount = attendanceStats.absentCount;

            window.overallAttendanceChart = new Chart(overallAttendanceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Present', 'Absent'],
                    datasets: [{
                        data: [presentCount, absentCount],
                        backgroundColor: [
                            'rgba(76, 175, 80, 0.7)',
                            'rgba(244, 67, 54, 0.7)'
                        ],
                        borderColor: [
                            'rgba(76, 175, 80, 1)',
                            'rgba(244, 67, 54, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Overall Attendance'
                        }
                    }
                }
            });
        }

        // Top Students Chart
        const topStudentsCtx = document.getElementById('topStudentsChart');
        if (topStudentsCtx) {
            // Get top students based on exam scores
            const students = window.studentManager.getStudents();
            const studentNames = students.slice(0, 5).map(student => student.name || 'Unnamed Student');
            const averageScores = students.slice(0, 5).map(student => {
                // This would need to be implemented with actual exam data
                return Math.floor(Math.random() * 100);
            });

            window.topStudentsChart = new Chart(topStudentsCtx, {
                type: 'bar',
                data: {
                    labels: studentNames,
                    datasets: [{
                        label: 'Average Score',
                        data: averageScores,
                        backgroundColor: 'rgba(37, 117, 252, 0.7)',
                        borderColor: 'rgba(37, 117, 252, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Top Performing Students'
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('[renderOverviewCharts] Error rendering charts:', error);
        // Don't show an error message to the user for chart rendering issues
    }
}

/**
 * Update the reports and analytics tab with data and charts
 */
function updateReportsAndAnalytics() {
    try {
        // Update summary data
        updateSummaryData();
        
        // Render low performing assignments chart
        renderLowPerformingAssignmentsChart();
    } catch (error) {
        console.error('[updateReportsAndAnalytics] Error updating reports and analytics:', error);
    }
}

/**
 * Update the summary data in the reports and analytics tab
 */
function updateSummaryData() {
    // Update total students
    const totalStudentsElement = document.getElementById('summaryTotalStudents');
    if (totalStudentsElement) {
        totalStudentsElement.textContent = window.studentManager.getStudents().length;
    }
    
    // Update total courses
    const totalCoursesElement = document.getElementById('summaryTotalCourses');
    if (totalCoursesElement) {
        totalCoursesElement.textContent = window.courseManager.getCourses().length;
    }
    
    // Update total teachers
    const totalTeachersElement = document.getElementById('summaryTotalTeachers');
    if (totalTeachersElement) {
        totalTeachersElement.textContent = window.teacherManager.getTeachers().length;
    }
}

/**
 * Render the low performing assignments chart
 */
function renderLowPerformingAssignmentsChart() {
    // Destroy existing chart if it exists
    if (window.lowPerformingAssignmentsChart && typeof window.lowPerformingAssignmentsChart.destroy === 'function') {
        window.lowPerformingAssignmentsChart.destroy();
    }

    const ctx = document.getElementById('lowPerformingAssignmentsChart');
    if (ctx) {
        // Get low performing assignments from exam data
        const assignments = window.examManager.getLowPerformingAssignments();
        
        const assignmentNames = assignments.map(a => a.name);
        const averageScores = assignments.map(a => a.averageScore);
        
        window.lowPerformingAssignmentsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: assignmentNames,
                datasets: [{
                    label: 'Average Score',
                    data: averageScores,
                    backgroundColor: 'rgba(244, 67, 54, 0.7)',
                    borderColor: 'rgba(244, 67, 54, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Low Performing Assignments'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

function switchToTab(tabId) {
    // Switch to the specified tab
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.dashboard-content-section');
    
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${tabId}`) {
            link.classList.add('active');
        }
    });
    
    sections.forEach(section => {
        section.style.display = 'none';
        if (section.id === tabId) {
            section.style.display = 'block';
        }
    });
}

// ======================
// EVENT LISTENERS
// ======================

function attachEventListeners() {
    console.log("[attachEventListeners] Attaching all event listeners...");

    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.dashboard-content-section');
    const burger = document.querySelector('.burger');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const addStudentForm = document.getElementById('addStudentForm');
    const cancelStudentBtn = document.getElementById('cancelStudentBtn');

    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                sections.forEach(s => s.style.display = 'none');
                const targetId = href.substring(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.style.display = 'block';
                    setTimeout(() => {
                        if (targetId === 'students') {
                            // Handle student tab specific actions
                        }
                    }, 0);
                }
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.style.display = 'none';
                }
            });
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await Parse.User.logOut();
            } catch (err) {
                console.error('Error logging out:', err);
            }
            try { localStorage.removeItem('currentUser'); } catch (_) {}
            window.location.href = 'loginPage.html';
        });
    }

    if (burger) {
        burger.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            sidebarOverlay.style.display = isOpen ? 'block' : 'none';
            burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.style.display = 'none';
            if (burger) burger.setAttribute('aria-expanded', 'false');
        });
    }

    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("[Student Form] Form submission started");
            
            const studentId = e.target.getAttribute('data-editing-id');
            const studentData = {
                name: document.getElementById('studentName').value.trim(),
                course: document.getElementById('studentCourse').value,
                season: parseInt(document.getElementById('studentSeason').value),
                nationalID: document.getElementById('studentID').value.trim(),
                phone: document.getElementById('studentPhone').value.trim(),
                location: document.getElementById('studentLocation').value.trim(),
            };
            
            console.log("[Student Form] Student data:", studentData);
            
            const result = await window.studentManager.addOrUpdateStudent(studentId, studentData);
            console.log("[Student Form] Save result:", result);
            
            if (result.success) {
                console.log("[Student Form] Student saved successfully, refreshing data");
                await loadAllData();
                window.studentManager.resetStudentForm();
            } else {
                console.error("[Student Form] Error saving student:", result.message);
            }
        });
    }

    if (cancelStudentBtn) {
        cancelStudentBtn.addEventListener('click', () => {
            window.studentManager.resetStudentForm();
        });
    }

    const addTeacherForm = document.getElementById('addTeacherForm');
    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', (e) => {
            window.teacherManager.addOrUpdateTeacher(e);
        });
    }
    const cancelTeacherBtn = document.getElementById('cancelTeacherBtn');
    if (cancelTeacherBtn) {
        cancelTeacherBtn.addEventListener('click', () => {
            window.teacherManager.resetTeacherForm();
        });
    }

    // Course form event listeners
    const addCourseForm = document.getElementById('addCourseForm');
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', (e) => {
            window.courseManager.addOrUpdateCourse(e);
        });
    }
    const cancelCourseBtn = document.getElementById('cancelCourseBtn');
    if (cancelCourseBtn) {
        cancelCourseBtn.addEventListener('click', () => {
            window.courseManager.resetCourseForm();
        });
    }

    // Seasons tab buttons
    const advanceSeasonBtn = document.getElementById('advanceSeasonBtn');
    if (advanceSeasonBtn) {
        advanceSeasonBtn.addEventListener('click', () => {
            seasonManager.advanceToNextSeason();
        });
    }
    
    const archiveCurrentSeasonBtn = document.getElementById('archiveCurrentSeasonBtn');
    if (archiveCurrentSeasonBtn) {
        archiveCurrentSeasonBtn.addEventListener('click', () => {
            seasonManager.archiveCurrentSeason();
        });
    }
    
    // Export buttons
    const exportStudentsCsvBtn = document.getElementById('exportStudentsCsvBtn');
    if (exportStudentsCsvBtn) {
        exportStudentsCsvBtn.addEventListener('click', exportStudentsCSV);
    }
    
    const exportStudentsPdfBtn = document.getElementById('exportStudentsPdfBtn');
    if (exportStudentsPdfBtn) {
        exportStudentsPdfBtn.addEventListener('click', () => {
            Utils.exportTableToPDF('studentTable', 'Student Report', 'students.pdf');
        });
    }
    
    const exportAttendanceCsvBtn = document.getElementById('exportAttendanceCsvBtn');
    if (exportAttendanceCsvBtn) {
        exportAttendanceCsvBtn.addEventListener('click', exportAttendanceCSV);
    }
    
    const exportAttendancePdfBtn = document.getElementById('exportAttendancePdfBtn');
    if (exportAttendancePdfBtn) {
        exportAttendancePdfBtn.addEventListener('click', () => {
            Utils.exportTableToPDF('attendanceTable', 'Attendance Report', 'attendance.pdf');
        });
    }
    
    const exportStudentTablePdfBtn = document.getElementById('exportStudentTablePdfBtn');
    if (exportStudentTablePdfBtn) {
        exportStudentTablePdfBtn.addEventListener('click', () => {
            Utils.exportTableToPDF('studentTable', 'Student Report', 'students.pdf');
        });
    }
    
    const exportAttendanceTablePdfBtn = document.getElementById('exportAttendanceTablePdfBtn');
    if (exportAttendanceTablePdfBtn) {
        exportAttendanceTablePdfBtn.addEventListener('click', () => {
            Utils.exportTableToPDF('attendanceTable', 'Attendance Report', 'attendance.pdf');
        });
    }
    
    const downloadLowAssignmentsBtn = document.getElementById('downloadLowAssignmentsBtn');
    if (downloadLowAssignmentsBtn) {
        downloadLowAssignmentsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadChart('lowPerformingAssignmentsChart', 'low-performing-assignments.png');
        });
    }
    
    const refreshDashboardReportsBtn = document.getElementById('refreshDashboardReportsBtn');
    if (refreshDashboardReportsBtn) {
        refreshDashboardReportsBtn.addEventListener('click', () => {
            // Refresh all data
            loadAllData();
        });
    }
    
    const exportSummaryJsonBtn = document.getElementById('exportSummaryJsonBtn');
    if (exportSummaryJsonBtn) {
        exportSummaryJsonBtn.addEventListener('click', exportSummaryJSON);
    }
    
    const resetPreferencesBtn = document.getElementById('resetPreferencesBtn');
    if (resetPreferencesBtn) {
        resetPreferencesBtn.addEventListener('click', resetPreferences);
    }
    
    // Graduation table PDF export
    const exportGraduationTablePdfBtn = document.getElementById('exportGraduationTablePdfBtn');
    if (exportGraduationTablePdfBtn) {
        exportGraduationTablePdfBtn.addEventListener('click', () => {
            Utils.exportTableToPDF('eligibleStudentsTable', 'Graduation Eligibility Report', 'graduation-eligibility.pdf');
        });
    }
    
    // Attendance form event listeners
    const addAttendanceForm = document.getElementById('addAttendanceForm');
    if (addAttendanceForm) {
        addAttendanceForm.addEventListener('submit', (e) => {
            window.attendanceManager.addOrUpdateAttendance(e);
        });
    }
    const cancelAttendanceBtn = document.getElementById('cancelAttendanceBtn');
    if (cancelAttendanceBtn) {
        cancelAttendanceBtn.addEventListener('click', () => {
            window.attendanceManager.resetAttendanceForm();
        });
    }
    
    // Exam form event listeners
    const addExamForm = document.getElementById('addExamForm');
    if (addExamForm) {
        addExamForm.addEventListener('submit', (e) => {
            window.examManager.addOrUpdateExam(e);
        });
    }
    const cancelExamBtn = document.getElementById('cancelExamBtn');
    if (cancelExamBtn) {
        cancelExamBtn.addEventListener('click', () => {
            window.examManager.resetExamForm();
        });
    }

    console.log("[attachEventListeners] All event listeners attached.");
}

// ======================
// EXPORT FUNCTIONS
// ======================

function exportStudentsCSV() {
    // PII-reduced export: omit National ID by default
    const rows = [["Name","Course","Season","Phone","Location"]];
    window.studentManager.getStudents().forEach(s => rows.push([
        s.get('name') || '',
        s.get('course') || '',
        s.get('season') || '',
        s.get('phone') || '',
        s.get('location') || ''
    ]));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'students.csv'; a.click();
    URL.revokeObjectURL(url);
}

function exportAttendanceCSV() {
    const rows = [["Date","Student","Course","Status"]];
    window.attendanceManager.getAttendanceRecords().forEach(r => {
        const student = window.studentManager.getStudents().find(s => s.id === r.get('studentId'));
        const courseId = student ? student.get('course') : null;
        const course = window.courseManager.getCourses().find(c => c.id === courseId);
        const courseName = course ? course.get('name') : (courseId || 'Unknown Course');
        const d = r.get('date');
        rows.push([
            d ? new Date(d).toLocaleDateString() : '',
            student ? student.get('name') : 'Unknown Student',
            courseName,
            r.get('status') || ''
        ]);
    });
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'attendance.csv'; a.click();
    URL.revokeObjectURL(url);
}

function exportSummaryJSON() {
    const summary = {
        totalStudents: window.studentManager.getStudents().length,
        totalCourses: 0, // This would need to be implemented
        totalTeachers: window.teacherManager.getTeachers().length,
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'summary.json'; a.click();
    URL.revokeObjectURL(url);
}

function toCSV(rows) {
    // Sanitize to mitigate CSV/Excel formula injection
    const sanitize = (v) => {
        if (v === null || v === undefined) return '';
        let s = String(v);
        // Neutralize leading formula characters or control characters
        if (/^[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) {
            s = "'" + s;
        }
        return s.replace(/"/g, '""');
    };
    return rows.map(r => r.map(v => `"${sanitize(v)}"`).join(',')).join('\n');
}

function downloadChart(canvasId, filename = 'chart.png') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        Utils.showMessage('Chart not found.', 'error');
        return;
    }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
}

function resetPreferences() {
    try {
        localStorage.removeItem('darkMode');
        document.body.classList.remove('dark-mode');
        const toggle = document.getElementById('settingsDarkModeToggle');
        if (toggle) toggle.checked = false;
        Utils.showMessage('Preferences reset.', 'success');
    } catch (e) {
        console.error('Error resetting preferences:', e);
        Utils.showMessage('Failed to reset preferences.', 'error');
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Export for use in other modules
export default {
    StudentManager,
    TeacherManager,
    CourseManager,
    ExamManager,
    AttendanceManager,
    SeasonManager,
    Utils,
    studentManager: window.studentManager,
    teacherManager: window.teacherManager,
    courseManager: window.courseManager,
    examManager: window.examManager,
    attendanceManager: window.attendanceManager,
    seasonManager: window.seasonManager,
    Utils: window.Utils
};

// Expose saveParseData to the window object for use in other modules
window.saveParseData = saveParseData;