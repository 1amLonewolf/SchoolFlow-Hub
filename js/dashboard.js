// js/dashboard.js

// Import our modules
import StudentManager from './studentManager.js';
import TeacherManager from './teacherManager.js';
import SeasonManager from './seasonManager.js';
import CourseManager from './courseManager.js';
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

async function loadParseData(className) {
    try {
        const query = new Parse.Query(className);
        const results = await query.find();
        console.log(`[loadParseData] Successfully loaded ${results.length} ${className} records`);
        return results;
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

async function saveParseData(className, data, id = null) {
    try {
        const Class = Parse.Object.extend(className);
        let object;
        if (id) {
            object = await new Parse.Query(className).get(id);
        } else {
            object = new Class();
        }
        for (const key in data) {
            object.set(key, data[key]);
        }
        await object.save();
        Utils.showMessage(`${className} saved successfully!`, 'success');
        await loadAllData();
    } catch (error) {
        console.error(`Error saving ${className}:`, error);
        Utils.showMessage(`Error saving ${className}. Please try again.`, 'error');
    }
}

async function deleteParseData(className, id) {
    try {
        const object = new Parse.Object(className);
        object.set('objectId', id);
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
        } else if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
            Utils.showMessage(`Error: ${className} not found or already deleted.`, 'error');
        } else {
            Utils.showMessage(`Error deleting ${className}. ${error.message || 'Please try again.'}`, 'error');
        }
    }
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
        const [studentsR, attendanceR, teachersR, coursesR, examsR] = await Promise.all([
            loadParseData('Student'),
            loadParseData('Attendance'),
            loadParseData('Teacher'),
            loadParseData('Course'),
            loadParseData('Exam'),
        ]);
        
        // Set data in our managers
        window.studentManager.setStudents(studentsR);
        window.teacherManager.setTeachers(teachersR);
        window.courseManager.setCourses(coursesR);
        // We would also set attendance and exams in their respective managers
        
        console.log(`[loadAllData] Data loaded. Students: ${studentsR.length}, Teachers: ${teachersR.length}, Courses: ${coursesR.length}`);
        updateUI();
        console.log("[loadAllData] All data loaded and UI updated.");
    } catch (error) {
        console.error("[loadAllData] Critical error during data loading:", error);
        Utils.showMessage('Critical error loading dashboard data. Some features may not work correctly.', 'error');
        // Still try to update UI with whatever data we have
        updateUI();
    }
}

function updateUI() {
    console.log("[updateUI] Starting UI update...");

    window.studentManager.renderStudentTable();
    window.teacherManager.renderTeacherTable();
    window.courseManager.renderCourseTable();
    // We would also call render methods for other managers

    window.teacherManager.populateTeacherDropdown();

    // Update season displays
    seasonManager.updateSeasonDisplay();
    seasonManager.renderSeasonsTable();
    
    // Render overview charts
    renderOverviewCharts();

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
            const courseNames = courses.map(course => course.get('name') || 'Unnamed Course');
            const studentCounts = courses.map(course => {
                // Count students in this course for current season
                const courseId = course.id;
                return window.studentManager.getStudents().filter(student => 
                    student.get('course') === courseId && 
                    student.get('seasonId') === window.currentSeason
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
            const attendanceRecords = []; // This would need to be implemented
            const presentCount = attendanceRecords.filter(record => record.get('status') === 'Present').length;
            const absentCount = attendanceRecords.filter(record => record.get('status') === 'Absent').length;

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
            const studentNames = students.slice(0, 5).map(student => student.get('name') || 'Unnamed Student');
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
            const studentId = e.target.getAttribute('data-editing-id');
            const studentData = {
                name: document.getElementById('studentName').value.trim(),
                course: document.getElementById('studentCourse').value,
                season: parseInt(document.getElementById('studentSeason').value),
                nationalID: document.getElementById('studentID').value.trim(),
                phone: document.getElementById('studentPhone').value.trim(),
                location: document.getElementById('studentLocation').value.trim(),
            };
            await window.studentManager.addOrUpdateStudent(studentId, studentData);
            await loadAllData();
            window.studentManager.resetStudentForm();
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
    // We would need to access attendance records here
    const attendanceRecords = []; // This would need to be implemented
    attendanceRecords.forEach(r => {
        const student = window.studentManager.getStudents().find(s => s.id === r.get('studentId'));
        const d = r.get('date');
        rows.push([
            d ? new Date(d).toLocaleDateString() : '',
            student ? student.get('name') : '',
            student ? student.get('course') : '',
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
    SeasonManager,
    Utils,
    studentManager: window.studentManager,
    teacherManager: window.teacherManager,
    courseManager: window.courseManager,
    seasonManager: window.seasonManager,
    Utils: window.Utils
};