// dashboard.js

// Import our manager modules from the 'js/' subdirectory
import StudentManager from './js/studentManager.js';
import TeacherManager from './js/teacherManager.js';
import SeasonManager from './js/seasonManager.js';
import CourseManager from './js/courseManager.js';
import ExamManager from './js/examManager.js';
import AttendanceManager from './js/attendanceManager.js';
import Utils from './js/utils.js'; // Assuming utils.js is in 'js/'

// Back4App Parse SDK Initialization
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
const B4A_SERVER_URL = 'https://parseapi.back4app.com/';

// Initialize Parse SDK (ensure this happens early)
Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
Parse.serverURL = B4A_SERVER_URL;

// Create instances of our managers and expose them globally for inter-module communication
window.studentManager = new StudentManager();
window.teacherManager = new TeacherManager();
window.courseManager = new CourseManager();
window.examManager = new ExamManager();
window.attendanceManager = new AttendanceManager();
window.seasonManager = new SeasonManager();
window.Utils = Utils; // Assuming Utils is an object/class with static methods

// Global data arrays (will be populated by explicit fetches from Parse)
// These should be managed by the respective managers, but kept here if other dashboard.js functions directly access them
let students = []; // Managed by window.studentManager
let attendanceRecords = []; // Managed by window.attendanceManager
let teachers = []; // Managed by window.teacherManager
let courses = []; // Managed by window.courseManager
let exams = []; // Managed by window.examManager
let announcements = []; // Managed directly in dashboard.js for now, no dedicated manager

// Chart instances (to destroy and re-create on updates to prevent memory leaks)
let coursePopularityChartInstance = null;
let overallAttendanceChartInstance = null;
let topStudentsChartInstance = null;
let lowPerformingAssignmentsChartInstance = null;

// Global state for editing (moved to managers where applicable, but kept for legacy references)
window.editingStudentId = null;
window.editingTeacherId = null;
window.editingCourseId = null;


// ======================
// SESSION MANAGEMENT (Refined)
// ======================

async function refreshSessionToken() {
    console.log("[refreshSessionToken] Checking user session...");
    const currentUser = Parse.User.current();

    if (currentUser) {
        try {
            await currentUser.fetch(); // Validate session token with server
            console.log("[refreshSessionToken] Session is valid and refreshed.");
            return true;
        } catch (error) {
            console.error("[refreshSessionToken] Session refresh failed:", error);
            await Parse.User.logOut(); // Log out invalid session
            window.Utils.showMessage('Your session has expired. Please log in again.', 'warning', 5000);
            setTimeout(() => window.location.href = 'loginPage.html', 5000);
            return false;
        }
    } else {
        console.log("[refreshSessionToken] No current user found. Redirecting to login.");
        window.Utils.showMessage('No valid session found. Please log in again.', 'error');
        setTimeout(() => window.location.href = 'loginPage.html', 2000);
        return false;
    }
}

async function bootstrapSessionFromLocalStorage() {
    try {
        // Clear any old, potentially stale local storage entries related to current user if any
        if (localStorage.getItem('currentUser')) {
            localStorage.removeItem('currentUser');
        }
        // Attempt to get the current user. Parse SDK will try to resume session from local storage.
        const current = await Parse.User.currentAsync();
        if (current) {
            console.log("[bootstrapSessionFromLocalStorage] Session resumed from local storage.");
            return true;
        }
    } catch (e) {
        console.warn('[bootstrapSessionFromLocalStorage] currentAsync error or no session found:', e);
    }
    // If no session found or error, redirect to login
    setTimeout(() => window.location.href = 'loginPage.html', 0);
    return false;
}

// ======================
// BACKEND COMMUNICATION (Centralized and Robust)
// ======================

// Helper function to convert Parse Object to plain JavaScript object
function parseObjectToJson(parseObject) {
    if (!parseObject || typeof parseObject.toJSON !== 'function') {
        console.warn("[parseObjectToJson] Attempted to convert non-Parse object:", parseObject);
        return parseObject; // Return as is if not a Parse object
    }
    const json = parseObject.toJSON();
    json.id = json.objectId; // Map Parse objectId to 'id' for consistency
    delete json.objectId; // Remove Parse-specific objectId
    delete json.className; // Remove Parse-specific className
    return json;
}

// Function to load data from Parse (explicit fetch, returns plain JS objects)
async function loadParseData(className) {
    try {
        console.log(`[loadParseData] Loading ${className} data from Parse backend...`);
        const query = new Parse.Query(className);
        // Include 'user' pointer for classes tied to a user if needed for filtering/display
        if (className !== 'Announcement') {
             query.equalTo("user", Parse.User.current());
        }
        // Example of including related objects: query.include('teacher'); if 'Course' has a 'teacher' pointer
        const results = await query.find();
        console.log(`[loadParseData] Successfully loaded ${results.length} ${className} records.`);

        // Convert Parse Objects to plain JSON objects for consistent use throughout the app
        const jsonResults = results.map(parseObjectToJson);

        // For debugging specific data types (can remove later)
        if (className === 'Student') {
            console.log(`[loadParseData] Student records (JSON):`, jsonResults.map(s => ({
                id: s.id, name: s.name, nationalID: s.nationalID, course: s.course, season: s.season
            })));
        }
        return jsonResults;
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
        window.Utils.showMessage(userMessage, 'error');
        return [];
    }
}

// Function to save/update data in Parse (centralized, robust, handles ACLs and user pointers)
async function saveParseData(className, data, id = null) {
    // Basic validation for className
    if (typeof className !== 'string' || !className) {
        const msg = 'Error: Invalid data type (class name) specified for saving.';
        console.error("[saveParseData]", msg, { className, data, id });
        window.Utils.showMessage(msg, 'error');
        return null;
    }

    // Ensure user is logged in
    if (!Parse.User.current()) {
        const msg = 'You must be logged in to save data.';
        console.error("[saveParseData]", msg);
        window.Utils.showMessage(msg, 'error');
        return null;
    }

    let obj; // This will be our Parse.Object instance

    try {
        if (id) {
            // Attempt to fetch existing object for update
            const ParseObjectConstructor = Parse.Object.extend(className); // Get the constructor for the class
            obj = await new Parse.Query(ParseObjectConstructor).get(id);
            if (!obj) {
                const msg = `Error: Item to update with ID ${id} not found in ${className}.`;
                window.Utils.showMessage(msg, 'error');
                console.error(`[saveParseData] ${msg}`);
                return null;
            }
        } else {
            // Create a new Parse.Object instance
            obj = new Parse.Object(className); // Direct instantiation is safer and more common

            // Set Access Control List (ACL) for new objects
            const acl = new Parse.ACL(Parse.User.current());
            if (className === 'Announcement') {
                acl.setPublicReadAccess(true); // Announcements are publicly readable
                acl.setWriteAccess(Parse.User.current(), true); // Only creator can write
            } else {
                // Private data: only current user can read/write
                acl.setReadAccess(Parse.User.current(), true);
                acl.setWriteAccess(Parse.User.current(), true);
                acl.setPublicReadAccess(false);
                acl.setPublicWriteAccess(false);
            }
            obj.setACL(acl);

            // Link the object to the current user (for private data)
            if (className !== 'Announcement') {
                obj.set("user", Parse.User.current());
            }
        }

        // Set properties from the 'data' object on the Parse object
        for (const key in data) {
            // Avoid setting 'id' or 'objectId' directly as Parse manages these internally
            if (key !== 'id' && key !== 'objectId' && data[key] !== undefined && data[key] !== null) {
                obj.set(key, data[key]);
            }
        }

        // Final check to ensure 'obj' is a valid Parse Object before saving
        if (!obj || typeof obj.save !== 'function') {
            const msg = `Internal Error: Could not prepare ${className} object for saving.`;
            window.Utils.showMessage(msg, 'error');
            console.error("[saveParseData]", msg, obj);
            return null;
        }

        // Save the Parse object
        const savedObject = await obj.save();
        window.Utils.showMessage(`${className} saved successfully!`, 'success');
        console.log(`[saveParseData] Data saved for class: ${className}. ID: ${savedObject.id}. Reloading all data...`);
        
        // Reload all data after successful save to ensure UI is updated
        await loadAllData();
        
        // Return the saved object as a plain JSON object
        return parseObjectToJson(savedObject);
    } catch (error) {
        console.error(`Error saving ${className}:`, error);
        let userMessage = `Error saving ${className}.`;
        if (error.code === Parse.Error.INVALID_SESSION_TOKEN) {
            userMessage = 'Your session has expired. Please log in again.';
            setTimeout(() => window.location.href = 'loginPage.html', 3000);
        } else if (error.message) {
            userMessage += ` ${error.message}`;
        }
        window.Utils.showMessage(userMessage, 'error');
        return null;
    }
}

// Function to delete data from Parse (centralized and robust)
async function deleteParseData(className, id) {
    if (!className || !id) {
        console.error('Error: className or id is undefined in deleteParseData', { className, id });
        window.Utils.showMessage('Error: Invalid parameters for deletion. Please try again.', 'error');
        return false;
    }
    
    if (!Parse.User.current()) {
        window.Utils.showMessage('You must be logged in to delete data.', 'error');
        return false;
    }

    try {
        // Retrieve the object first to ensure it exists and we have permissions
        const ParseObjectConstructor = Parse.Object.extend(className);
        const obj = await new Parse.Query(ParseObjectConstructor).get(id);
        
        // Destroy the object
        await obj.destroy();
        window.Utils.showMessage(`${className} deleted successfully.`, 'success');
        console.log(`[deleteParseData] ${className} deleted. ID: ${id}. Reloading all data...`);
        
        // Reload all data after successful deletion to update UI
        await loadAllData();
        return true;
    } catch (error) {
        console.error(`Error deleting ${className}:`, error);
        if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
            window.Utils.showMessage(`Error: ${className} not found or already deleted.`, 'error');
        } else if (error.code === Parse.Error.SESSION_MISSING || error.code === Parse.Error.INVALID_SESSION_TOKEN) {
            window.Utils.showMessage('Error: Your session has expired. Please log in again.', 'error');
            setTimeout(() => window.location.href = 'loginPage.html', 3000);
        } else {
            window.Utils.showMessage(`Error deleting ${className}. ${error.message || 'Please try again.'}`, 'error');
        }
        return false;
    }
}

// Expose these global Parse interaction functions to the window object for manager classes
window.saveParseData = saveParseData;
window.deleteParseData = deleteParseData;


// ======================
// MAIN APPLICATION DATA LOAD & UI UPDATE
// ======================

async function loadAllData() {
    console.log("[loadAllData] Starting to load all dashboard data in parallel...");
    
    // Set current season (assuming seasonManager has loaded or defaults)
    window.currentSeason = window.seasonManager.getCurrentSeason();
    console.log(`[loadAllData] Current season: ${window.currentSeason}`);
    
    // Ensure a user session is active before loading data
    const currentUser = Parse.User.current();
    if (!currentUser) {
        console.log("[loadAllData] No current user, skipping data load.");
        window.Utils.showMessage('No valid session. Please log in again.', 'error');
        setTimeout(() => window.location.href = 'loginPage.html', 3000);
        return;
    }
    
    try {
        // Load data for all classes concurrently
        // Note: 'AttendanceRecord' is used for actual records, 'Attendance' for the class name
        const [studentsR, attendanceR, teachersR, coursesR, examsR, announcementsR] = await Promise.all([
            loadParseData('Student'),
            loadParseData('Attendance'), // Class name for attendance records
            loadParseData('Teacher'),
            loadParseData('Course'),
            loadParseData('Exam'),
            loadParseData('Announcement'), // Load announcements too
        ]);
        
        console.log(`[loadAllData] Data loaded from Parse:`);
        console.log(`  - Students: ${studentsR.length}`);
        console.log(`  - Attendance: ${attendanceR.length}`);
        console.log(`  - Teachers: ${teachersR.length}`);
        console.log(`  - Courses: ${coursesR.length}`);
        console.log(`  - Exams: ${examsR.length}`);
        console.log(`  - Announcements: ${announcementsR.length}`);
        
        // Set fetched data into our manager instances
        console.log("[loadAllData] Setting data in managers...");
        window.studentManager.setStudents(studentsR);
        window.teacherManager.setTeachers(teachersR);
        window.courseManager.setCourses(coursesR);
        window.examManager.setExams(examsR);
        window.attendanceManager.setAttendanceRecords(attendanceR);
        window.announcements = announcementsR; // Assign to global for dashboard.js direct usage

        console.log(`[loadAllData] Data stored in managers. Students: ${window.studentManager.getStudents().length}, Teachers: ${window.teacherManager.getTeachers().length}, Courses: ${window.courseManager.getCourses().length}, Exams: ${window.examManager.getExams().length}, Attendance: ${window.attendanceManager.getAttendanceRecords().length}`);
        
        // Update all UI components after data is loaded and set
        console.log("[loadAllData] Calling updateUI...");
        updateUI();
        console.log("[loadAllData] All data loaded and UI updated.");
    } catch (error) {
        console.error("[loadAllData] Critical error during data loading:", error);
        console.error("[loadAllData] Error details:", {
            message: error.message,
            stack: error.stack
        });
        window.Utils.showMessage('Critical error loading dashboard data. Some features may not work correctly.', 'error');
        // Still try to update UI with whatever data we have, even on critical error
        updateUI();
    }
}

// Function to update all UI components
function updateUI() {
    console.log("[updateUI] Starting UI update...");

    // Render all tables via their managers
    console.log("[updateUI] Rendering tables...");
    window.studentManager.renderStudentTable();
    window.teacherManager.renderTeacherTable();
    window.courseManager.renderCourseTable();
    window.examManager.renderExamTable();
    window.attendanceManager.renderAttendanceTable();
    
    // Populate dropdowns via their managers
    console.log("[updateUI] Populating dropdowns...");
    window.teacherManager.populateTeacherDropdown(); // For Course Assignment
    // Populate student dropdowns in attendance and exam sections if they exist
    const attendanceStudentSelect = document.getElementById('attendanceStudent');
    const examStudentSelect = document.getElementById('examStudent');
    const addAssignmentStudentSelect = document.getElementById('addAssignmentStudent'); // If this is for grades
    if (attendanceStudentSelect) window.studentManager.populateStudentDropdown(attendanceStudentSelect);
    if (examStudentSelect) window.studentManager.populateStudentDropdown(examStudentSelect);
    if (addAssignmentStudentSelect) window.studentManager.populateStudentDropdown(addAssignmentStudentSelect);
    
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');
    const examCourseFilter = document.getElementById('examCourseFilter');
    const gradesCourseFilter = document.getElementById('gradesCourseFilter'); // For grades
    const addAssignmentCourseFilter = document.getElementById('addAssignmentCourseFilter'); // For grades
    if (attendanceCourseFilter) window.courseManager.populateCourseDropdown(attendanceCourseFilter);
    if (examCourseFilter) window.courseManager.populateCourseDropdown(examCourseFilter);
    if (gradesCourseFilter) window.courseManager.populateCourseDropdown(gradesCourseFilter);
    if (addAssignmentCourseFilter) window.courseManager.populateCourseDropdown(addAssignmentCourseFilter);


    // Update season displays
    console.log("[updateUI] Updating season displays...");
    window.seasonManager.updateSeasonDisplay();
    window.seasonManager.renderSeasonsTable();
    
    // Render charts for the overview and reports sections
    console.log("[updateUI] Rendering charts...");
    renderOverviewCharts(); // Renders coursePopularityChart, overallAttendanceChart, topStudentsChart
    renderLowPerformingAssignmentsChart(); // Specific chart in reports
    
    // Update dashboard summary metrics
    console.log("[updateUI] Updating summary metrics...");
    updateSummaryMetrics();

    // Update welcome message
    console.log("[updateUI] Updating welcome message...");
    updateWelcomeMessage();

    // Render announcements
    console.log("[updateUI] Rendering announcements...");
    renderAnnouncements(); // Assuming this is managed directly here

    console.log("[updateUI] UI update complete. Checking active tab for specific updates.");

    // Trigger updates for currently active tabs if needed
    const activeSection = document.querySelector('.dashboard-content-section.active');
    if (activeSection) {
        if (activeSection.id === 'students') {
            const studentsFormContainer = activeSection.querySelector('.form-container');
            if (studentsFormContainer) window.Utils.addHorizontalSlider(studentsFormContainer);
        } else if (activeSection.id === 'graduation') {
            checkGraduationEligibility();
        } else if (activeSection.id === 'attendance') {
            showAttendanceTab(); // This will re-render attendance table with selected date/course
        } else if (activeSection.id === 'exams') {
            showExamsTab(); // This will re-render exam table with current filters
        }
    }
}

// ======================
// DASHBOARD OVERVIEW CHARTS & METRICS
// ======================

/**
 * Renders the charts for the dashboard overview.
 */
function renderOverviewCharts() {
    try {
        // Destroy existing chart instances to prevent duplicates and memory leaks
        if (coursePopularityChartInstance) coursePopularityChartInstance.destroy();
        if (overallAttendanceChartInstance) overallAttendanceChartInstance.destroy();
        if (topStudentsChartInstance) topStudentsChartInstance.destroy();

        // Course Popularity Chart
        const coursePopularityCtx = document.getElementById('coursePopularityChart');
        if (coursePopularityCtx) {
            const coursesData = window.courseManager.getCourses(); // Plain JS objects
            const studentsData = window.studentManager.getStudents(); // Plain JS objects

            const courseCounts = {};
            studentsData.filter(s => s.season === window.seasonManager.getCurrentSeason() && s.isActive).forEach(student => {
                const courseName = student.course; // Direct access
                if (courseName) {
                    courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
                }
            });

            const labels = Object.keys(courseCounts);
            const data = Object.values(courseCounts);

            coursePopularityChartInstance = new Chart(coursePopularityCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Students',
                        data: data,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(153, 102, 255, 0.7)',
                            'rgba(255, 159, 64, 0.7)',
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)',
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Students'
                            },
                            ticks: {
                                stepSize: 1
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Course/Program'
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Student Enrollment by Course' }
                    }
                }
            });
            console.log("[Charts] Course Popularity Chart rendered.");
        }

        // Overall Attendance Chart
        const overallAttendanceCtx = document.getElementById('overallAttendanceChart');
        if (overallAttendanceCtx) {
            const attendanceStats = window.attendanceManager.getAttendanceStats(); // Uses plain JS objects
            const presentCount = attendanceStats.presentCount;
            const absentCount = attendanceStats.absentCount;
            const lateCount = attendanceStats.lateCount;

            overallAttendanceChartInstance = new Chart(overallAttendanceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Present', 'Absent', 'Late'],
                    datasets: [{
                        data: [presentCount, absentCount, lateCount],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.7)', // Present - Green
                            'rgba(255, 99, 132, 0.7)', // Absent - Red
                            'rgba(255, 159, 64, 0.7)'  // Late - Orange
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'Overall Attendance Breakdown' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) { label += ': '; }
                                    if (context.parsed !== null) { label += context.parsed; }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
            console.log("[Charts] Overall Attendance Chart rendered.");
        }

        // Top Students Chart
        const topStudentsCtx = document.getElementById('topStudentsChart');
        if (topStudentsCtx) {
            const allStudents = window.studentManager.getStudents(); // Plain JS objects
            const allExams = window.examManager.getExams(); // Plain JS objects

            const studentAverageGrades = {};
            allStudents.forEach(student => {
                const studentExams = allExams.filter(e => e.studentId === student.id && e.score !== null && e.score !== undefined && e.totalScore > 0);
                if (studentExams.length > 0) {
                    const totalScore = studentExams.reduce((sum, e) => sum + e.score, 0);
                    const totalMaxScore = studentExams.reduce((sum, e) => sum + e.totalScore, 0);
                    studentAverageGrades[student.id] = (totalScore / totalMaxScore) * 100;
                }
            });

            const topStudentsData = Object.keys(studentAverageGrades)
                .map(id => ({ name: allStudents.find(s => s.id === id)?.name || 'Unknown Student', avg: parseFloat(studentAverageGrades[id].toFixed(2)) }))
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 5);

            const labels = topStudentsData.map(s => s.name);
            const data = topStudentsData.map(s => s.avg);

            topStudentsChartInstance = new Chart(topStudentsCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Average Grade (%)',
                        data: data,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Student Name' }
                        },
                        x: {
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: 'Average Grade (%)' }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Top 5 Students by Average Grade' }
                    }
                }
            });
            console.log("[Charts] Top Students Chart rendered.");
        }
    } catch (error) {
        console.error('[renderOverviewCharts] Error rendering charts:', error);
    }
}

/**
 * Update the summary data in the reports and analytics tab
 */
function updateSummaryMetrics() {
    const totalStudentsElement = document.getElementById('summaryTotalStudents');
    const totalCoursesElement = document.getElementById('summaryTotalCourses');
    const totalTeachersElement = document.getElementById('summaryTotalTeachers');
    
    // Get data directly from managers (which now hold plain JS objects)
    const activeStudents = window.studentManager.getStudentsBySeason(window.seasonManager.getCurrentSeason());
    const activeCourses = window.courseManager.getCoursesBySeason(window.seasonManager.getCurrentSeason());
    const allTeachers = window.teacherManager.getTeachers();

    if (totalStudentsElement) { totalStudentsElement.textContent = activeStudents.length; }
    if (totalCoursesElement) { totalCoursesElement.textContent = activeCourses.length; }
    if (totalTeachersElement) { totalTeachersElement.textContent = allTeachers.length; }
}

/**
 * Render the low performing assignments chart
 */
function renderLowPerformingAssignmentsChart() {
    if (lowPerformingAssignmentsChartInstance) {
        lowPerformingAssignmentsChartInstance.destroy();
    }

    const ctx = document.getElementById('lowPerformingAssignmentsChart');
    if (ctx) {
        const assignments = window.examManager.getLowPerformingAssignments(); // This function should now also return plain JS objects
        
        const assignmentNames = assignments.map(a => a.name);
        const averageScores = assignments.map(a => a.averageScore);
        
        lowPerformingAssignmentsChartInstance = new Chart(ctx, {
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
                indexAxis: 'y',
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Assignment Name' }
                    },
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Average Score (%)' }
                    }
                },
                plugins: {
                    title: { display: true, text: 'Lowest 5 Performing Assignments' },
                    legend: { display: false }
                }
            }
        });
        console.log("[Charts] Lowest Performing Assignments Chart rendered.");
    }
}


// ======================
// USER INTERFACE & EVENTS (Consolidated and Refined)
// ======================

// Utility to safely add horizontal scroll slider to overflowing elements
function addHorizontalSlider(container) {
    if (!container || container.querySelector(':scope > .h-scroll-slider')) return;
    const contentEl = container.querySelector('form') || container.querySelector('table') || container.firstElementChild || container;
    const getOverflow = () => (Math.max(container.scrollWidth, contentEl ? contentEl.scrollWidth : 0) - container.clientWidth);
    const needsSlider = getOverflow() > 8;
    // Force a slider in the Students form container to aid navigation on narrow screens
    const forced = !!(container.closest('#students') && container.querySelector('form'));
    if (!needsSlider && !forced) return;
    // Ensure the container can scroll horizontally and slider has space
    container.classList.add('has-hscroll');
    const wrap = document.createElement('div');
    wrap.className = 'h-scroll-slider';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = 0;
    range.max = 1000; // fine-grained control
    range.value = 0;
    wrap.appendChild(range);

    // Keep in sync both ways
    const syncFromScroll = () => {
        const maxScroll = getOverflow();
        if (maxScroll <= 0) {
            if (forced) {
                range.disabled = true;
                range.value = 0;
                return;
            }
            wrap.remove();
            return;
        }
        range.disabled = false;
        const pos = container.scrollLeft / maxScroll;
        range.value = Math.round(pos * 1000);
    };
    const syncFromRange = () => {
        const maxScroll = getOverflow();
        const pos = parseInt(range.value, 10) / 1000;
        container.scrollLeft = Math.round(maxScroll * pos);
    };

    container.addEventListener('scroll', syncFromScroll);
    range.addEventListener('input', syncFromRange);

    // Recompute on resize or content changes
    const ro = new ResizeObserver(() => {
        if (getOverflow() <= 4) {
            if (forced) {
                if (!wrap.parentNode) container.appendChild(wrap);
                range.disabled = true;
                range.value = 0;
            } else {
                if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
            }
        } else {
            if (!wrap.parentNode) container.appendChild(wrap);
            container.classList.add('has-hscroll');
            range.disabled = newOverflow <= 4;
            syncFromScroll(); // Update slider position
        }
    });
    ro.observe(container); // Observe the main container
    if (contentEl && contentEl !== container) {
        ro.observe(contentEl); // Also observe content element if it's different
    }

    container.appendChild(wrap); // Add the slider to the container
    syncFromScroll(); // Initial sync
    console.log("[Utils] Horizontal slider added.");
}

// Function to refresh all dashboard data and UI
async function refreshDashboard() {
    await loadAllData();
    window.Utils.showMessage('Dashboard refreshed.', 'success');
    // Also check graduation eligibility after refresh if the tab is active
    const graduationSection = document.getElementById('graduation');
    if (graduationSection && window.getComputedStyle(graduationSection).display !== 'none') {
        checkGraduationEligibility();
    }
}

// Helper to switch dashboard sections
function switchDashboardSection(targetSectionId) {
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const dashboardSections = document.querySelectorAll('.dashboard-content-section');

    sidebarLinks.forEach(item => {
        const href = item.getAttribute('href');
        if (href === `#${targetSectionId}`) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    dashboardSections.forEach(section => {
        if (section.id === targetSectionId) {
            section.classList.add('active');
            // Specific actions when a tab becomes active
            if (section.id === 'students') {
                const studentsFormContainer = section.querySelector('.form-container');
                if (studentsFormContainer) window.Utils.addHorizontalSlider(studentsFormContainer);
            } else if (section.id === 'graduation') {
                checkGraduationEligibility();
            } else if (section.id === 'attendance') {
                showAttendanceTab();
            } else if (section.id === 'exams') {
                showExamsTab();
            }
        } else {
            section.classList.remove('active');
        }
    });
    // On mobile, close sidebar after selecting a link
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }
}


// Attach all event listeners after DOM is loaded and data is bootstrapped
function attachEventListeners() {
    console.log("[attachEventListeners] Attaching all event listeners...");

    // DOM element references (ensure they are accessible here or re-queried)
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a'); // Re-query for safety
    const dashboardSections = document.querySelectorAll('.dashboard-content-section'); // Re-query for safety

    const logoutBtn = document.getElementById('logoutBtn');
    const addStudentForm = document.getElementById('addStudentForm');
    const cancelStudentBtn = document.getElementById('cancelStudentBtn');
    const addTeacherForm = document.getElementById('addTeacherForm');
    const cancelTeacherBtn = document.getElementById('cancelTeacherBtn');
    const addCourseForm = document.getElementById('addCourseForm');
    const cancelCourseBtn = document.getElementById('cancelCourseBtn');
    const addAttendanceForm = document.getElementById('addAttendanceForm');
    const cancelAttendanceBtn = document.getElementById('cancelAttendanceBtn');
    const addExamForm = document.getElementById('addExamForm');
    const cancelExamBtn = document.getElementById('cancelExamBtn');
    const advanceSeasonBtn = document.getElementById('advanceSeasonBtn');
    const archiveCurrentSeasonBtn = document.getElementById('archiveCurrentSeasonBtn');
    const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
    const exportStudentsCsvBtn = document.getElementById('exportStudentsCsvBtn');
    const exportStudentsPdfBtn = document.getElementById('exportStudentsPdfBtn');
    const exportAttendanceCsvBtn = document.getElementById('exportAttendanceCsvBtn');
    const exportAttendancePdfBtn = document.getElementById('exportAttendancePdfBtn');
    const downloadLowAssignmentsBtn = document.getElementById('downloadLowAssignmentsBtn');
    const exportSummaryJsonBtn = document.getElementById('exportSummaryJsonBtn');
    const resetPreferencesBtn = document.getElementById('resetPreferencesBtn');
    const exportGraduationTablePdfBtn = document.getElementById('exportGraduationTablePdfBtn');
    const checkGraduationBtn = document.getElementById('checkGraduationBtn');
    const downloadGraduationBtn = document.getElementById('downloadGraduationList'); // Check ID
    const bulkUploadForm = document.getElementById('bulkUploadForm');
    const fileUploadInput = document.getElementById('bulkUploadFile'); // Corrected ID from previous snippet
    const uploadStatusDiv = document.getElementById('uploadStatus');


    // Hamburger Menu (Toggle Sidebar)
    if (hamburgerBtn && sidebar && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            sidebarOverlay.style.display = isOpen ? 'block' : 'none';
            // hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); // Optional accessibility
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.style.display = 'none';
            // if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false'); // Optional accessibility
        });
    }

    // Sidebar Navigation (Smooth Section Switching)
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetSectionId = this.getAttribute('href').substring(1);
            switchDashboardSection(targetSectionId); // Use our helper for consistency
        });
    });

    // Logout Button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                if (Parse.User.current()) { // Only try to log out if there's a current user
                    await Parse.User.logOut();
                    console.log('User logged out successfully.');
                } else {
                    console.warn("Logout clicked but no active user. Proceeding with redirect.");
                }
                window.Utils.showMessage('Logged out successfully! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'loginPage.html'; // Redirect to login page
                }, 1000);
            } catch (error) {
                console.error('Error during logout:', error);
                window.Utils.showMessage('Error during logout: ' + error.message, 'error');
            }
        });
    }

    // --- Student Management Event Listeners ---
    const addStudentBtn = document.getElementById('addStudentBtn');
    const addStudentFormContainer = document.querySelector('.add-student-form-container'); // Corrected selector
    const studentFormHeading = document.getElementById('student-form-heading'); // Corrected ID
    const saveStudentBtn = document.getElementById('saveStudentBtn'); // Corrected ID

    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            if (addStudentFormContainer) addStudentFormContainer.style.display = 'block';
            if (addStudentForm) addStudentForm.reset();
            window.editingStudentId = null; // Reset global editing ID
            if (studentFormHeading) studentFormHeading.textContent = 'Add New Student';
            if (saveStudentBtn) saveStudentBtn.textContent = 'Save Student';
            if (cancelStudentBtn) cancelStudentBtn.style.display = 'none'; // Ensure cancel button is hidden initially
        });
    }

    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = e.target.getAttribute('data-editing-id'); // Get ID from form
            const studentData = {
                name: document.getElementById('studentName').value.trim(),
                course: document.getElementById('studentCourse').value,
                season: parseInt(document.getElementById('studentSeason').value),
                nationalID: document.getElementById('studentID').value.trim(), // Assuming 'studentID' is for nationalID
                phone: document.getElementById('studentPhone').value.trim(),
                location: document.getElementById('studentLocation').value.trim(),
                startDate: document.getElementById('enrollmentStartDate').value, // Add missing date fields
                endDate: document.getElementById('enrollmentEndDate').value,
            };
            // Call manager method which uses centralized saveParseData
            await window.studentManager.addOrUpdateStudent(studentId, studentData);
            window.studentManager.resetStudentForm(); // Reset form after action
        });
    }
    if (cancelStudentBtn) {
        cancelStudentBtn.addEventListener('click', () => window.studentManager.resetStudentForm());
    }

    // --- Bulk Student Upload ---
    if (bulkUploadForm) {
        bulkUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!fileUploadInput || fileUploadInput.files.length === 0) {
                window.Utils.showMessage('Please select a file to upload.', 'error');
                return;
            }
            const file = fileUploadInput.files[0];
            const reader = new FileReader();

            reader.onloadstart = () => {
                if (uploadStatusDiv) uploadStatusDiv.textContent = 'Reading file...';
            };
            reader.onload = async (event) => {
                const fileContent = event.target.result;
                let records = [];
                try {
                    if (file.name.endsWith('.csv')) {
                        records = window.Utils.parseCSV(fileContent); // Use Utils.parseCSV
                    } else if (file.name.endsWith('.json')) {
                        records = window.Utils.parseJSON(fileContent); // Use Utils.parseJSON
                    } else {
                        window.Utils.showMessage('Invalid file type. Please upload a .csv or .json file.', 'error');
                        if (uploadStatusDiv) uploadStatusDiv.textContent = 'Invalid file type.';
                        return;
                    }
                    if (records.length > 0) {
                        await window.studentManager.processStudentRecords(records); // Call manager method
                    } else {
                        window.Utils.showMessage('File is empty or could not be parsed.', 'warning');
                        if (uploadStatusDiv) uploadStatusDiv.textContent = 'No data found.';
                    }
                } catch (error) {
                    console.error("File processing error:", error);
                    window.Utils.showMessage(`Error processing file: ${error.message}`, 'error');
                    if (uploadStatusDiv) uploadStatusDiv.textContent = `Error: ${error.message}`;
                } finally {
                    fileUploadInput.value = ''; // Clear file input
                }
            };
            reader.onerror = () => {
                window.Utils.showMessage('Error reading file.', 'error');
                if (uploadStatusDiv) uploadStatusDiv.textContent = 'File read error.';
            };
            reader.readAsText(file);
        });
    }


    // --- Teacher Management Event Listeners ---
    const addTeacherBtn = document.getElementById('addTeacherBtn');
    if (addTeacherBtn) {
        addTeacherBtn.addEventListener('click', () => window.teacherManager.resetTeacherForm());
    } // Just reset form when adding new, actual logic is in submit
    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', (e) => window.teacherManager.addOrUpdateTeacher(e));
    }
    if (cancelTeacherBtn) {
        cancelTeacherBtn.addEventListener('click', () => window.teacherManager.resetTeacherForm());
    }

    // --- Course Management Event Listeners ---
    const addCourseBtn = document.getElementById('addCourseBtn');
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', () => window.courseManager.resetCourseForm());
    }
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', (e) => window.courseManager.addOrUpdateCourse(e));
    }
    if (cancelCourseBtn) {
        cancelCourseBtn.addEventListener('click', () => window.courseManager.resetCourseForm());
    }

    // --- Attendance Management Event Listeners ---
    const recordAttendanceBtn = document.getElementById('recordAttendanceBtn'); // Assuming this is the main button
    if (recordAttendanceBtn) {
        recordAttendanceBtn.addEventListener('click', (e) => window.attendanceManager.addOrUpdateAttendance(e));
    }
    if (addAttendanceForm) {
        addAttendanceForm.addEventListener('submit', (e) => window.attendanceManager.addOrUpdateAttendance(e));
    }
    if (cancelAttendanceBtn) {
        cancelAttendanceBtn.addEventListener('click', () => window.attendanceManager.resetAttendanceForm());
    }
    // Also attach to load attendance button
    const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');
    if (loadAttendanceBtn) {
        loadAttendanceBtn.addEventListener('click', () => {
            const selectedDate = attendanceDateInput.value;
            const selectedCourse = attendanceCourseFilter.value;
            window.attendanceManager.renderAttendanceTable(selectedCourse, selectedDate);
        });
    }
    if (attendanceCourseFilter) {
        attendanceCourseFilter.addEventListener('change', () => {
            const selectedDate = attendanceDateInput.value;
            const selectedCourse = attendanceCourseFilter.value;
            window.attendanceManager.renderAttendanceTable(selectedCourse, selectedDate);
        });
    }
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn'); // Assuming this is for bulk save
    if(saveAttendanceBtn) {
        saveAttendanceBtn.addEventListener('click', () => window.attendanceManager.saveAttendanceBulk());
    }


    // --- Exam Management Event Listeners ---
    const addExamBtn = document.getElementById('addExamBtn');
    if (addExamBtn) {
        addExamBtn.addEventListener('click', () => window.examManager.resetExamForm());
    }
    if (addExamForm) {
        addExamForm.addEventListener('submit', (e) => window.examManager.addOrUpdateExam(e));
    }
    if (cancelExamBtn) {
        cancelExamBtn.addEventListener('click', () => window.examManager.resetExamForm());
    }
    // Exam table filters and pagination
    window.examManager.initializeExamTableControls(); // Call the init for exam table controls

    // --- Seasons Management Event Listeners ---
    if (advanceSeasonBtn) {
        advanceSeasonBtn.addEventListener('click', () => window.seasonManager.advanceToNextSeason());
    }
    if (archiveCurrentSeasonBtn) {
        archiveCurrentSeasonBtn.addEventListener('click', () => window.seasonManager.archiveCurrentSeason());
    }

    // --- Quick Action Buttons ---
    const goToAttendanceBtn = document.getElementById('goToAttendanceBtn');
    const enterGradesBtn = document.getElementById('enterGradesBtn');
    const addStudentQuickBtn = document.getElementById('addStudentQuickBtn');
    if (goToAttendanceBtn) { goToAttendanceBtn.addEventListener('click', () => switchDashboardSection('attendance')); }
    if (enterGradesBtn) { enterGradesBtn.addEventListener('click', () => switchDashboardSection('grades')); }
    if (addStudentQuickBtn) { 
        addStudentQuickBtn.addEventListener('click', () => {
            switchDashboardSection('students');
            const studentFormContainer = document.querySelector('#students .form-container');
            if (studentFormContainer) studentFormContainer.style.display = 'block';
            if (addStudentForm) addStudentForm.reset();
            window.editingStudentId = null;
            if (studentFormHeading) studentFormHeading.textContent = 'Add New Student';
            if (saveStudentBtn) saveStudentBtn.textContent = 'Save Student';
        });
    }

    // --- Reports & Export Buttons ---
    // Using Utils for common PDF/CSV exports
    if (exportStudentsCsvBtn) { exportStudentsCsvBtn.addEventListener('click', () => window.studentManager.exportStudentsCSV()); }
    if (exportStudentsPdfBtn) { exportStudentsPdfBtn.addEventListener('click', () => window.Utils.exportTableToPDF('studentTable', 'Student Report', 'students.pdf')); }
    if (exportAttendanceCsvBtn) { exportAttendanceCsvBtn.addEventListener('click', () => window.attendanceManager.exportAttendanceCSV()); }
    if (exportAttendancePdfBtn) { exportAttendancePdfBtn.addEventListener('click', () => window.Utils.exportTableToPDF('attendanceTable', 'Attendance Report', 'attendance.pdf')); }
    if (downloadLowAssignmentsBtn) { downloadLowAssignmentsBtn.addEventListener('click', (e) => { e.preventDefault(); downloadChart('lowPerformingAssignmentsChart','low-performing-assignments.png'); }); }
    if (exportSummaryJsonBtn) { exportSummaryJsonBtn.addEventListener('click', () => exportSummaryJSON()); } // Keep this global or move to a manager if needed

    // Graduation tab buttons
    if (checkGraduationBtn) { checkGraduationBtn.addEventListener('click', () => checkGraduationEligibility()); }
    if (downloadGraduationBtn) { downloadGraduationBtn.addEventListener('click', () => downloadGraduationList()); }


    // --- General Settings & Preferences ---
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const editProfileBtn = document.getElementById('editProfileBtn'); // Assuming IDs from HTML
    const changePasswordBtn = document.getElementById('changePasswordBtn'); // Assuming IDs from HTML
    const saveGeneralSettingsBtn = document.getElementById('saveGeneralSettingsBtn'); // Assuming IDs from HTML

    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            const selectedTheme = themeSelect.value;
            // applyTheme function might be in Utils or global
            window.Utils.applyTheme(selectedTheme);
            localStorage.setItem('schoolflowTheme', selectedTheme); // Save preference
        });
        const savedTheme = localStorage.getItem('schoolflowTheme');
        if (savedTheme) { themeSelect.value = savedTheme; window.Utils.applyTheme(savedTheme); } // Apply on load
    }
    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', () => {
            const checked = notificationsToggle.checked;
            window.Utils.showMessage(checked ? 'Notifications will be enabled on save.' : 'Notifications will be disabled on save.', 'info');
            localStorage.setItem('schoolflowNotifications', checked); // Save preference
        });
        const savedNotifications = localStorage.getItem('schoolflowNotifications');
        if (savedNotifications !== null) { notificationsToggle.checked = (savedNotifications === 'true'); } // Apply on load
    }
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => window.Utils.showMessage('Edit Profile clicked! (Functionality to edit user data is not yet implemented)', 'info'));
    }
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => window.Utils.showMessage('Change Password clicked! (Functionality to change password is not yet implemented)', 'info'));
    }
    if (saveGeneralSettingsBtn) {
        saveGeneralSettingsBtn.addEventListener('click', () => window.Utils.showMessage('General Settings saved successfully!', 'success'));
    }
    if (resetPreferencesBtn) { resetPreferencesBtn.addEventListener('click', () => resetPreferences()); }


    console.log("[attachEventListeners] All event listeners attached.");
}

// ======================
// MAIN INITIALIZATION FLOW
// ======================

// Initialize when DOM is fully loaded
// REMOVED: document.addEventListener('DOMContentLoaded', async () => { ... });
// The entire module script runs after DOM is parsed when type="module" and defer are used.
// So, we can directly call initDashboard.

// Make body visible after content loads (prevents FOUC)
document.body.style.opacity = '1';

// Start the dashboard initialization process directly
initDashboard();


// Helper for export functions (can be moved to Utils if preferred)
function toCSV(rows) {
    const sanitize = (v) => {
        if (v === null || v === undefined) return '';
        let s = String(v);
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
        window.Utils.showMessage('Chart not found.', 'error');
        return;
    }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
}

// --- Placeholder/Directly Managed Functions (can be moved to managers if they grow) ---

function renderAnnouncements() {
    const announcementsListDiv = document.getElementById('announcementsList');
    if (!announcementsListDiv) { console.warn("Announcements list div not found."); return; }
    announcementsListDiv.innerHTML = ''; // Clear existing

    if (window.announcements.length === 0) {
        announcementsListDiv.innerHTML = '<p>No announcements to display yet.</p>';
        return;
    }

    // Sort by date (newest first)
    const sortedAnnouncements = [...window.announcements].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedAnnouncements.forEach(announcement => {
        const announcementItem = document.createElement('div');
        announcementItem.classList.add('announcement-item'); // Add your CSS class
        announcementItem.innerHTML = `
            <h4>${announcement.title || 'No Title'}</h4>
            <p>${announcement.content || 'No Content'}</p>
            <small>Posted on: ${announcement.date || 'N/A'}</small>
            <button class="delete-button" data-id="${announcement.id}" style="margin-left: 10px; padding: 5px 10px; font-size: 0.8em; cursor: pointer;">Delete</button>
        `;
        announcementsListDiv.appendChild(announcementItem);
    });

    // Attach delete listeners
    document.querySelectorAll('#announcementsList .delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const announcementId = e.target.dataset.id;
            window.deleteParseData('Announcement', announcementId); // Use centralized delete
        });
    });
}

// --- Other main dashboard.js functions that might use global data ---
// These are simplified for the dashboard.js file and should ideally be methods within a new DashboardManager class
// or spread across existing managers for better modularity.

function exportSummaryJSON() {
    const summary = {
        totalStudents: window.studentManager.getStudents().length,
        totalCourses: window.courseManager.getCourses().length,
        totalTeachers: window.teacherManager.getTeachers().length,
        currentSeason: window.seasonManager.getCurrentSeason()
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'summary.json'; a.click();
    URL.revokeObjectURL(url);
    window.Utils.showMessage('Summary data exported as JSON.', 'success');
}

function resetPreferences() {
    try {
        localStorage.removeItem('schoolflowTheme');
        localStorage.removeItem('schoolflowNotifications');
        // Reset UI elements to default
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = 'default';
        const notificationsToggle = document.getElementById('notificationsToggle');
        if (notificationsToggle) notificationsToggle.checked = true; // Assuming default is enabled
        
        document.body.classList.remove('dark-mode'); // Remove dark mode class if applied
        
        window.Utils.showMessage('Preferences reset to default.', 'success');
    } catch (e) {
        console.error('Error resetting preferences:', e);
        window.Utils.showMessage('Failed to reset preferences.', 'error');
    }
}

function updateWelcomeMessage() {
    const currentUser = Parse.User.current();
    const welcomeMessageElement = document.getElementById('welcomeMessage');
    if (welcomeMessageElement && currentUser) {
        const username = currentUser.get('username'); // Parse.User object still uses .get()
        const isAdmin = currentUser.get('isAdmin') || false; // Parse.User object still uses .get()
        welcomeMessageElement.textContent = `Welcome, ${username}${isAdmin ? ' (Admin)' : ''}`;
    }
}


// --- Graduation Eligibility (Directly in dashboard.js for now) ---
let eligibleStudentsData = []; // Global variable to store eligible student data for export

function checkGraduationEligibility() {
    console.log("[checkGraduationEligibility] Starting graduation eligibility check...");
    
    const resultsContainer = document.getElementById('graduationResults');
    const statsContainer = document.getElementById('graduationStats');
    const eligibleStudentsTableBody = document.querySelector('#eligibleStudentsTable tbody');
    
    if (!resultsContainer || !statsContainer || !eligibleStudentsTableBody) {
        console.error("Graduation UI elements not found.");
        return;
    }
    
    statsContainer.innerHTML = '';
    eligibleStudentsTableBody.innerHTML = '';
    
    let eligibleCount = 0;
    const allStudents = window.studentManager.getStudents(); // Get plain JS objects
    const allAttendanceRecords = window.attendanceManager.getAttendanceRecords(); // Get plain JS objects
    const allExams = window.examManager.getExams(); // Get plain JS objects

    const totalCount = allStudents.length;
    eligibleStudentsData = []; // Clear previous data
    
    allStudents.forEach(student => {
        // Use direct property access for plain JS objects
        const studentId = student.id;
        const studentName = student.name || 'N/A';
        const studentCourse = student.course || 'N/A';
        
        // Calculate attendance percentage
        const studentAttendanceRecords = allAttendanceRecords.filter(record => record.studentId === studentId);
        const totalAttendanceDays = studentAttendanceRecords.length;
        const presentDays = studentAttendanceRecords.filter(record => record.status === 'Present').length; // Direct access
        const attendancePercentage = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;
        
        // Check for required exams
        let hasMidterm = false;
        let hasFinal = false;
        
        allExams.forEach(exam => {
            if (exam.studentId === studentId && exam.examType) { // Direct access
                const examType = exam.examType.toLowerCase(); // Direct access
                if (!hasMidterm && (examType === 'midterm')) {
                    hasMidterm = true;
                }
                if (!hasFinal && (examType === 'endterm')) {
                    hasFinal = true;
                }
            }
        });
        
        // Determine eligibility (e.g., 50% attendance + both midterm and final exams)
        const isEligible = attendancePercentage >= 50 && hasMidterm && hasFinal;
        
        if (isEligible) {
            eligibleCount++;
            eligibleStudentsData.push({ // Store in global variable for download
                id: studentId,
                name: studentName,
                course: studentCourse,
                attendancePercentage: attendancePercentage.toFixed(2)
            });
        }
    });
    
    resultsContainer.style.display = 'block';
    
    statsContainer.innerHTML = `
        <p>Total Students: <strong>${totalCount}</strong></p>
        <p>Eligible for Graduation: <strong>${eligibleCount}</strong></p>
        <p>Not Eligible: <strong>${totalCount - eligibleCount}</strong></p>
        <p>Eligibility Rate: <strong>${totalCount > 0 ? ((eligibleCount / totalCount) * 100).toFixed(2) : '0.00'}%</strong></p>
    `;
    
    if (eligibleStudentsData.length > 0) {
        eligibleStudentsData.forEach(student => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            nameCell.textContent = student.name;
            const courseCell = document.createElement('td');
            courseCell.textContent = student.course;
            row.appendChild(nameCell);
            row.appendChild(courseCell);
            eligibleStudentsTableBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.textContent = 'No students are currently eligible for graduation.';
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        eligibleStudentsTableBody.appendChild(row);
    }
    
    console.log(`[checkGraduationEligibility] Check complete. ${eligibleCount}/${totalCount} students eligible.`);
    window.Utils.showMessage(`Graduation eligibility check complete. ${eligibleCount} students are eligible.`, 'success');
}

function downloadGraduationList() {
    if (!eligibleStudentsData || eligibleStudentsData.length === 0) {
        window.Utils.showMessage('No eligible students data available for download.', 'warning');
        return;
    }
    
    let csvContent = 'Student Name,Course\n';
    eligibleStudentsData.forEach(student => {
        const sanitizedName = String(student.name).replace(/"/g, '""');
        const sanitizedCourse = String(student.course).replace(/"/g, '""');
        csvContent += `"${sanitizedName}","${sanitizedCourse}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eligible_graduation_students_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.Utils.showMessage('Graduation list downloaded successfully!', 'success');
}


// These functions are from your provided file but should ideally be methods of their respective managers.
// They are kept here for now to ensure minimal disruption, but the best practice is to move them.
function populateAttendanceStudentDropdown() {
    const attendanceStudentSelect = document.getElementById('attendanceStudent');
    if (!attendanceStudentSelect) return;
    window.studentManager.populateStudentDropdown(attendanceStudentSelect); // Use manager method
}

function showAttendanceTab() {
    populateAttendanceStudentDropdown();
    const today = window.Utils.getTodayDateString(); // Assuming getTodayDateString is in Utils
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = today;
    }
    window.attendanceManager.renderAttendanceTable(document.getElementById('attendanceCourseFilter').value, dateInput.value); // Re-render table on tab switch
}

function populateExamStudentDropdown() {
    const examStudentSelect = document.getElementById('examStudent');
    if (!examStudentSelect) return;
    window.studentManager.populateStudentDropdown(examStudentSelect); // Use manager method
}

function populateExamCourseDropdown() {
    const examCourseSelect = document.getElementById('examCourse');
    if (!examCourseSelect) return;
    window.courseManager.populateCourseDropdown(examCourseSelect); // Use manager method
}

function showExamsTab() {
    populateExamStudentDropdown();
    populateExamCourseDropdown();
    
    const today = window.Utils.getTodayDateString(); // Assuming getTodayDateString is in Utils
    const dateInput = document.getElementById('examDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = today;
    }
    window.examManager.renderExamTable(); // Re-render exam table with current filters
}


// IMPORTANT: Utility functions like getTodayDateString, applyTheme should be in utils.js
// If not, they will need to be defined here or sourced correctly.
// Assuming 'getTodayDateString' is in Utils for showAttendanceTab and showExamsTab
// Assuming 'applyTheme' is in Utils for settings

// Placeholder for Utils.getTodayDateString if not in utils.js
if (!window.Utils || !window.Utils.getTodayDateString) {
    console.warn("Utils.getTodayDateString not found. Defining a basic one.");
    window.Utils = window.Utils || {};
    window.Utils.getTodayDateString = function() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
}

// Placeholder for Utils.applyTheme if not in utils.js
if (!window.Utils || !window.Utils.applyTheme) {
    console.warn("Utils.applyTheme not found. Defining a basic one.");
    window.Utils = window.Utils || {};
    window.Utils.applyTheme = function(themeName) {
        document.body.classList.remove('theme-default', 'theme-dark', 'theme-light'); // Remove all known themes
        if (themeName && themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
    };
}
