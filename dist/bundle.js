// Simple, single-file dashboard implementation
// This approach avoids the complexity of multiple modules and bundling issues

// Back4App Parse SDK Configuration
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
const B4A_SERVER_URL = 'https://parseapi.back4app.com/';

// Initialize Parse SDK
Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
Parse.serverURL = B4A_SERVER_URL;

// Global variables
let currentSeason = 1;
let students = [];
let teachers = [];
let courses = [];
let exams = [];
let attendanceRecords = [];

// DOM Ready Function
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Dashboard] DOM loaded, initializing dashboard...');
    
    // Check user authentication
    const currentUser = Parse.User.current();
    if (!currentUser) {
        console.log('[Dashboard] No user logged in, redirecting to login...');
        window.location.href = './loginPage.html';
        return;
    }
    
    // Display welcome message
    document.getElementById('welcomeMessage').textContent = `Welcome, ${currentUser.get('username')}`;
    
    // Attach event listeners
    attachEventListeners();
    
    // Load initial data
    loadAllData();
});

// Attach all event listeners
function attachEventListeners() {
    console.log('[Dashboard] Attaching event listeners...');
    
    // Sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchToTab(href.substring(1));
            });
        }
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Student form submission
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleStudentFormSubmit);
    }
    
    // Cancel student button
    const cancelStudentBtn = document.getElementById('cancelStudentBtn');
    if (cancelStudentBtn) {
        cancelStudentBtn.addEventListener('click', resetStudentForm);
    }
    
    console.log('[Dashboard] Event listeners attached.');
}

// Switch to a specific tab
function switchToTab(tabId) {
    console.log(`[Dashboard] Switching to tab: ${tabId}`);
    
    // Hide all sections
    const sections = document.querySelectorAll('.dashboard-content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show the selected section
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update active link
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${tabId}`) {
            link.classList.add('active');
        }
    });
}

// Logout function
async function logout() {
    console.log('[Dashboard] Logging out...');
    try {
        await Parse.User.logOut();
        window.location.href = './loginPage.html';
    } catch (error) {
        console.error('[Dashboard] Error during logout:', error);
        alert('Error logging out. Please try again.');
    }
}

// Reset student form
function resetStudentForm() {
    const form = document.getElementById('addStudentForm');
    if (form) {
        form.reset();
        form.removeAttribute('data-editing-id');
        document.getElementById('student-form-heading').textContent = 'Add New Student';
        document.getElementById('saveStudentBtn').textContent = 'Save Student';
        document.getElementById('cancelStudentBtn').style.display = 'none';
    }
}

// Handle student form submission
async function handleStudentFormSubmit(e) {
    e.preventDefault();
    console.log('[Dashboard] Handling student form submission...');
    
    const form = e.target;
    const studentId = form.getAttribute('data-editing-id');
    
    // Get form data
    const studentData = {
        name: document.getElementById('studentName').value.trim(),
        nationalID: document.getElementById('studentID').value.trim(),
        course: document.getElementById('studentCourse').value.trim(),
        season: parseInt(document.getElementById('studentSeason').value) || currentSeason,
        phone: document.getElementById('studentPhone').value.trim(),
        location: document.getElementById('studentLocation').value.trim(),
        seasonId: currentSeason,
        isActive: true,
        enrollmentDate: new Date()
    };
    
    // Validate required fields
    if (!studentData.name || !studentData.nationalID) {
        alert('Name and National ID are required.');
        return;
    }
    
    try {
        // Save student data
        let student;
        if (studentId) {
            // Update existing student
            student = await new Parse.Query('Student').get(studentId);
        } else {
            // Create new student
            student = new Parse.Object('Student');
        }
        
        // Set student properties
        for (const key in studentData) {
            if (studentData[key] !== undefined && studentData[key] !== null) {
                student.set(key, studentData[key]);
            }
        }
        
        // Save to Back4App
        await student.save();
        console.log('[Dashboard] Student saved successfully:', student);
        
        // Show success message
        alert('Student saved successfully!');
        
        // Reset form and reload data
        resetStudentForm();
        await loadAllData();
    } catch (error) {
        console.error('[Dashboard] Error saving student:', error);
        alert(`Error saving student: ${error.message || 'Unknown error'}`);
    }
}

// Load all data from Back4App
async function loadAllData() {
    console.log('[Dashboard] Loading all data...');
    
    try {
        // Show loading message
        const appMessage = document.getElementById('appMessage');
        if (appMessage) {
            appMessage.textContent = 'Loading data...';
            appMessage.className = 'app-message app-message--info';
            appMessage.classList.add('visible');
        }
        
        // Load data in parallel
        const [
            studentsData,
            teachersData,
            coursesData,
            examsData,
            attendanceData
        ] = await Promise.all([
            loadParseData('Student'),
            loadParseData('Teacher'),
            loadParseData('Course'),
            loadParseData('Exam'),
            loadParseData('Attendance')
        ]);
        
        // Store data globally
        students = studentsData;
        teachers = teachersData;
        courses = coursesData;
        exams = examsData;
        attendanceRecords = attendanceData;
        
        console.log('[Dashboard] Data loaded successfully:', {
            students: students.length,
            teachers: teachers.length,
            courses: courses.length,
            exams: exams.length,
            attendance: attendanceRecords.length
        });
        
        // Update UI with loaded data
        updateUI();
        
        // Hide loading message
        if (appMessage) {
            appMessage.classList.remove('visible');
        }
    } catch (error) {
        console.error('[Dashboard] Error loading data:', error);
        const appMessage = document.getElementById('appMessage');
        if (appMessage) {
            appMessage.textContent = `Error loading data: ${error.message || 'Unknown error'}`;
            appMessage.className = 'app-message app-message--error';
            appMessage.classList.add('visible');
        }
    }
}

// Generic function to load data from Parse
async function loadParseData(className) {
    try {
        console.log(`[Dashboard] Loading ${className} data...`);
        const query = new Parse.Query(className);
        const results = await query.find();
        console.log(`[Dashboard] Loaded ${results.length} ${className} records`);
        return results;
    } catch (error) {
        console.error(`[Dashboard] Error loading ${className} data:`, error);
        throw error;
    }
}

// Update UI with loaded data
function updateUI() {
    console.log('[Dashboard] Updating UI...');
    
    // Render student table
    renderStudentTable();
    
    // Render other tables (will implement as we go)
    // renderTeacherTable();
    // renderCourseTable();
    // renderExamTable();
    // renderAttendanceTable();
    
    // Update season display
    updateSeasonDisplay();
    
    // Render charts (will implement as we go)
    // renderCharts();
    
    console.log('[Dashboard] UI updated.');
}

// Render student table
function renderStudentTable() {
    console.log('[Dashboard] Rendering student table...');
    
    const tableBody = document.querySelector('#studentTable tbody');
    if (!tableBody) {
        console.log('[Dashboard] Student table body not found');
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Check if we have students
    if (students.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.textContent = 'No students found.';
        cell.style.textAlign = 'center';
        return;
    }
    
    // Render each student
    students.forEach(student => {
        const row = tableBody.insertRow();
        
        // Helper function to create table cells
        const makeCell = (label, value) => {
            const cell = document.createElement('td');
            cell.setAttribute('data-label', label);
            cell.textContent = value ?? '';
            return cell;
        };
        
        // Add cells for each student property
        row.appendChild(makeCell('Name', student.get('name')));
        row.appendChild(makeCell('Course', student.get('course')));
        row.appendChild(makeCell('ID', student.get('nationalID')));
        row.appendChild(makeCell('Season', student.get('season')));
        row.appendChild(makeCell('Phone', student.get('phone')));
        row.appendChild(makeCell('Location', student.get('location')));
        
        // Add action buttons
        const actionsCell = document.createElement('td');
        actionsCell.setAttribute('data-label', 'Actions');
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editStudent(student.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteStudent(student.id);
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);
    });
    
    console.log('[Dashboard] Student table rendered.');
}

// Edit student
function editStudent(studentId) {
    console.log(`[Dashboard] Editing student: ${studentId}`);
    
    const student = students.find(s => s.id === studentId);
    if (!student) {
        console.log('[Dashboard] Student not found');
        return;
    }
    
    // Populate form with student data
    document.getElementById('studentName').value = student.get('name') || '';
    document.getElementById('studentID').value = student.get('nationalID') || '';
    document.getElementById('studentCourse').value = student.get('course') || '';
    document.getElementById('studentSeason').value = student.get('season') || '';
    document.getElementById('studentPhone').value = student.get('phone') || '';
    document.getElementById('studentLocation').value = student.get('location') || '';
    
    // Set form to edit mode
    const form = document.getElementById('addStudentForm');
    form.setAttribute('data-editing-id', studentId);
    document.getElementById('student-form-heading').textContent = `Edit Student: ${student.get('name') || 'Student'}`;
    document.getElementById('saveStudentBtn').textContent = 'Update Student';
    document.getElementById('cancelStudentBtn').style.display = 'inline-block';
}

// Delete student
async function deleteStudent(studentId) {
    console.log(`[Dashboard] Deleting student: ${studentId}`);
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }
    
    try {
        // Delete from Back4App
        const student = await new Parse.Query('Student').get(studentId);
        await student.destroy();
        
        console.log('[Dashboard] Student deleted successfully');
        alert('Student deleted successfully!');
        
        // Reload data
        await loadAllData();
    } catch (error) {
        console.error('[Dashboard] Error deleting student:', error);
        alert(`Error deleting student: ${error.message || 'Unknown error'}`);
    }
}

// Update season display
function updateSeasonDisplay() {
    console.log('[Dashboard] Updating season display...');
    
    const seasonDisplay = document.getElementById('currentSeasonDisplay');
    if (seasonDisplay) {
        seasonDisplay.textContent = currentSeason;
    }
    
    console.log('[Dashboard] Season display updated.');
}