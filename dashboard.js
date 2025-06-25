// dashboard.js

// Back4App Parse SDK Initialization (IMPORTANT: These MUST match what's in loginPage.js)
// You can find these in your Back4App Dashboard -> App Settings -> Security & Keys
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0'; // Replace with your Application ID
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';   // Replace with your JavaScript Key
const B4A_SERVER_URL = 'https://parseapi.back4app.com';   // Replace with your Server URL (e.g., https://parseapi.back4app.com/)

// Global data arrays (will be populated by Parse LiveQuery)
let students = [];
let attendanceRecords = [];
let grades = [];
let announcements = [];

// LiveQuery subscriptions
let studentSubscription;
let attendanceSubscription;
let gradesSubscription;
let announcementsSubscription;

// Utility for displaying messages (replaces alert)
function showMessage(message, type = "info", duration = 3000) {
    let messageBox = document.getElementById('appMessage');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'appMessage';
        messageBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            color: white;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
            transform: translateY(-20px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(messageBox);
    }

    messageBox.textContent = message;
    messageBox.className = 'message';
    if (type === "success") {
        messageBox.style.backgroundColor = '#4CAF50';
    } else if (type === "error") {
        messageBox.style.backgroundColor = '#f44336';
    } else {
        messageBox.style.backgroundColor = '#2196F3';
    }

    messageBox.style.opacity = '1';
    messageBox.style.transform = 'translateY(0)';

    setTimeout(() => {
        messageBox.style.opacity = '0';
        messageBox.style.transform = 'translateY(-20px)';
        messageBox.addEventListener('transitionend', () => {
            if (messageBox.style.opacity === '0') {
                messageBox.remove();
            }
        }, { once: true });
    }, duration);
}

// Utility for displaying confirmation dialog (replaces confirm)
function showConfirmDialog(message, onConfirm, onCancel) {
    let confirmBox = document.getElementById('appConfirm');
    if (!confirmBox) {
        confirmBox = document.createElement('div');
        confirmBox.id = 'appConfirm';
        confirmBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 25px;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            max-width: 350px;
            text-align: center;
            opacity: 0;
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        `;
        document.body.appendChild(confirmBox);
    }

    confirmBox.innerHTML = `
        <p style="margin: 0; font-size: 1.1rem; color: #333;">${message}</p>
        <div style="display: flex; gap: 15px;">
            <button id="confirmYes" style="background: linear-gradient(135deg, #4CAF50 0%, #28a745 100%); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color 0.3s ease;">Yes</button>
            <button id="confirmNo" style="background-color: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color 0.3s ease;">No</button>
        </div>
    `;

    confirmBox.style.opacity = '1';
    confirmBox.style.transform = 'translate(-50%, -50%)';

    const confirmYesBtn = document.getElementById('confirmYes');
    const confirmNoBtn = document.getElementById('confirmNo');

    confirmYesBtn.onclick = () => {
        confirmBox.style.opacity = '0';
        confirmBox.style.transform = 'translate(-50%, -70%)';
        confirmBox.addEventListener('transitionend', () => confirmBox.remove(), { once: true });
        if (onConfirm) onConfirm();
    };

    confirmNoBtn.onclick = () => {
        confirmBox.style.opacity = '0';
        confirmBox.style.transform = 'translate(-50%, -70%)';
        confirmBox.addEventListener('transitionend', () => confirmBox.remove(), { once: true });
        if (onCancel) onCancel();
    };
}


// --- Parse Data Operations ---

// Helper function to convert Parse Object to plain JavaScript object
function parseObjectToJson(parseObject) {
    const json = parseObject.toJSON();
    // Parse automatically adds 'className', 'objectId', 'createdAt', 'updatedAt'
    // 'objectId' is our 'id'
    json.id = json.objectId;
    delete json.objectId;
    delete json.className; // Not needed on client
    // createdAt and updatedAt can be kept if useful, or removed
    return json;
}

async function saveParseData(className, data, id = null) {
    if (!Parse.User.current()) {
        showMessage('You must be logged in to save data.', 'error');
        return false;
    }
    const ParseObject = Parse.Object.extend(className);
    let obj;

    if (id) {
        obj = await new Parse.Query(ParseObject).get(id);
    } else {
        obj = new ParseObject();
        // Set ACL for new objects: public read, only creator can write
        const acl = new Parse.ACL(Parse.User.current());
        acl.setPublicReadAccess(true); // Can be read by anyone (for public data like announcements)
        // For private data, set acl.setReadAccess(Parse.User.current(), true); acl.setWriteAccess(Parse.User.current(), true);
        // We'll control read/write via Parse Dashboard Security for specific classes.
        // For now, let's allow public read for announcements, others remain private by default ACL of Parse.User.current()
        if (className === 'Announcement') {
            acl.setPublicReadAccess(true);
            acl.setWriteAccess(Parse.User.current(), true);
        } else {
             // For private data, ensure only current user can read/write
             acl.setReadAccess(Parse.User.current(), true);
             acl.setWriteAccess(Parse.User.current(), true);
             acl.setPublicReadAccess(false);
             acl.setPublicWriteAccess(false);
        }
        obj.setACL(acl);
    }

    // Set properties from data (excluding 'id' and 'objectId')
    for (const key in data) {
        if (key !== 'id' && key !== 'objectId') {
            obj.set(key, data[key]);
        }
    }

    try {
        await obj.save();
        showMessage('Data saved successfully!', 'success');
        return obj.id;
    } catch (e) {
        console.error("Error saving document: ", e);
        showMessage('Error saving data: ' + e.message, 'error');
        return false;
    }
}

async function deleteParseData(className, id) {
    if (!Parse.User.current()) {
        showMessage('You must be logged in to delete data.', 'error');
        return false;
    }
    try {
        const ParseObject = Parse.Object.extend(className);
        const obj = await new Parse.Query(ParseObject).get(id);
        await obj.destroy();
        showMessage('Item deleted successfully!', 'success');
        return true;
    } catch (e) {
        console.error("Error deleting document: ", e);
        showMessage('Error deleting item: ' + e.message, 'error');
        return false;
    }
}


// --- Real-time Data Loading with Parse LiveQuery ---
function setupParseLiveQueries() {
    if (typeof Parse === 'undefined' || !Parse.User.current()) {
        console.warn("Parse SDK not initialized or user not logged in. Cannot set up Live Queries.");
        return;
    }

    // Ensure LiveQueryClient is available
    if (!Parse.LiveQueryClient) {
        console.error("Parse LiveQuery Client not available. Make sure LiveQuery is enabled on your Back4App app and SDK supports it.");
        showMessage("Real-time features not available. Please check LiveQuery configuration.", "error", 7000);
        return;
    }

    // Initialize LiveQuery Client if not already done
    if (!Parse.LiveQueryClient.has  ('subscribes')) { // A simple check to see if client exists
         Parse.LiveQueryClient = new Parse.LiveQueryClient({
            applicationId: B4A_APP_ID,
            serverURL: B4A_SERVER_URL.replace('https', 'wss'), // Use wss for websocket
            javascriptKey: B4A_JS_KEY
        });
        Parse.LiveQueryClient.open();

        Parse.LiveQueryClient.on('open', () => console.log('LiveQuery client opened'));
        Parse.LiveQueryClient.on('close', () => console.log('LiveQuery client closed'));
        Parse.LiveQueryClient.on('error', (error) => console.error('LiveQuery error:', error));
    }


    // 1. Students LiveQuery
    if (studentSubscription) studentSubscription.unsubscribe(); // Unsubscribe previous if exists
    const Student = Parse.Object.extend("Student");
    const studentQuery = new Parse.Query(Student);
    // Student data is private to the user who created it
    studentQuery.equalTo("ACL.owner", Parse.User.current()); // Filter by current user's ownership (if ACL set up correctly)
    studentSubscription = Parse.LiveQueryClient.subscribe(studentQuery);

    studentSubscription.on('open', () => console.log('Student LiveQuery subscribed'));
    studentSubscription.on('create', (parseObject) => {
        console.log('Student created:', parseObject.toJSON());
        students.push(parseObjectToJson(parseObject));
        renderUIComponents();
    });
    studentSubscription.on('update', (parseObject) => {
        console.log('Student updated:', parseObject.toJSON());
        const updatedStudent = parseObjectToJson(parseObject);
        const index = students.findIndex(s => s.id === updatedStudent.id);
        if (index !== -1) students[index] = updatedStudent;
        renderUIComponents();
    });
    studentSubscription.on('delete', (parseObject) => {
        console.log('Student deleted:', parseObject.toJSON());
        students = students.filter(s => s.id !== parseObject.id);
        renderUIComponents();
    });
    studentSubscription.on('enter', (parseObject) => console.log('Student entered query:', parseObject.toJSON()));
    studentSubscription.on('leave', (parseObject) => console.log('Student left query:', parseObject.toJSON()));


    // 2. Attendance Records LiveQuery
    if (attendanceSubscription) attendanceSubscription.unsubscribe();
    const AttendanceRecord = Parse.Object.extend("AttendanceRecord");
    const attendanceQuery = new Parse.Query(AttendanceRecord);
    // Attendance records are private to the user who created them
    attendanceQuery.equalTo("ACL.owner", Parse.User.current());
    attendanceSubscription = Parse.LiveQueryClient.subscribe(attendanceQuery);

    attendanceSubscription.on('open', () => console.log('Attendance LiveQuery subscribed'));
    attendanceSubscription.on('create', (parseObject) => {
        console.log('Attendance created:', parseObject.toJSON());
        attendanceRecords.push(parseObjectToJson(parseObject));
        renderUIComponents();
    });
    attendanceSubscription.on('update', (parseObject) => {
        console.log('Attendance updated:', parseObject.toJSON());
        const updatedRecord = parseObjectToJson(parseObject);
        const index = attendanceRecords.findIndex(r => r.id === updatedRecord.id);
        if (index !== -1) attendanceRecords[index] = updatedRecord;
        renderUIComponents();
    });
    attendanceSubscription.on('delete', (parseObject) => {
        console.log('Attendance deleted:', parseObject.toJSON());
        attendanceRecords = attendanceRecords.filter(r => r.id !== parseObject.id);
        renderUIComponents();
    });


    // 3. Grades LiveQuery
    if (gradesSubscription) gradesSubscription.unsubscribe();
    const Grade = Parse.Object.extend("Grade");
    const gradesQuery = new Parse.Query(Grade);
    // Grades are private to the user who created them
    gradesQuery.equalTo("ACL.owner", Parse.User.current());
    gradesSubscription = Parse.LiveQueryClient.subscribe(gradesQuery);

    gradesSubscription.on('open', () => console.log('Grades LiveQuery subscribed'));
    gradesSubscription.on('create', (parseObject) => {
        console.log('Grade created:', parseObject.toJSON());
        grades.push(parseObjectToJson(parseObject));
        renderUIComponents();
    });
    gradesSubscription.on('update', (parseObject) => {
        console.log('Grade updated:', parseObject.toJSON());
        const updatedGrade = parseObjectToJson(parseObject);
        const index = grades.findIndex(g => g.id === updatedGrade.id);
        if (index !== -1) grades[index] = updatedGrade;
        renderUIComponents();
    });
    gradesSubscription.on('delete', (parseObject) => {
        console.log('Grade deleted:', parseObject.toJSON());
        grades = grades.filter(g => g.id !== parseObject.id);
        renderUIComponents();
    });


    // 4. Announcements LiveQuery (Public)
    if (announcementsSubscription) announcementsSubscription.unsubscribe();
    const Announcement = Parse.Object.extend("Announcement");
    const announcementsQuery = new Parse.Query(Announcement);
    announcementsQuery.equalTo("ACL.publicRead", true); // Should be readable by anyone
    announcementsSubscription = Parse.LiveQueryClient.subscribe(announcementsQuery);

    announcementsSubscription.on('open', () => console.log('Announcement LiveQuery subscribed'));
    announcementsSubscription.on('create', (parseObject) => {
        console.log('Announcement created:', parseObject.toJSON());
        announcements.push(parseObjectToJson(parseObject));
        renderAnnouncements(); // Specific render for announcements
    });
    announcementsSubscription.on('update', (parseObject) => {
        console.log('Announcement updated:', parseObject.toJSON());
        const updatedAnnouncement = parseObjectToJson(parseObject);
        const index = announcements.findIndex(a => a.id === updatedAnnouncement.id);
        if (index !== -1) announcements[index] = updatedAnnouncement;
        renderAnnouncements();
    });
    announcementsSubscription.on('delete', (parseObject) => {
        console.log('Announcement deleted:', parseObject.toJSON());
        announcements = announcements.filter(a => a.id !== parseObject.id);
        renderAnnouncements();
    });

    // Initial render after setting up subscriptions
    renderUIComponents(); // Call once after setting up listeners to display initial state
    renderAnnouncements(); // Ensure announcements render initially
}

// Function to render all UI components dependent on data
function renderUIComponents() {
    renderStudentTable();
    populateCourseDropdowns();
    populateStudentDropdowns(selectStudentForGrades);
    populateStudentDropdowns(addAssignmentStudentSelect);
    updateReports();
    // Only re-render current grades if a student is already selected
    if (currentGradesStudentId) {
        renderGradesTable(currentGradesStudentId);
    }
}


// --- DOM Content Loaded and Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.opacity = '1'; // Make body visible

    // --- Hamburger Menu Elements ---
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // --- Sidebar Navigation and Content Section Elements ---
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const dashboardSections = document.querySelectorAll('.dashboard-content-section');

    // --- Student Management Section Elements ---
    const addStudentBtn = document.getElementById('addStudentBtn');
    const addStudentFormContainer = document.querySelector('.add-student-form-container');
    const addStudentForm = document.getElementById('addStudentForm');
    const studentTableBody = document.querySelector('#studentTable tbody');
    const cancelButton = addStudentForm.querySelector('.cancel-button');
    const saveStudentButton = addStudentForm.querySelector('.submit-button');
    const formHeading = addStudentFormContainer.querySelector('h3');
    const studentNameInput = document.getElementById('studentName');
    const courseEnrolledInput = document.getElementById('courseEnrolled');
    const seasonNumberInput = document.getElementById('seasonNumber');
    const enrollmentStartDateInput = document.getElementById('enrollmentStartDate');
    const enrollmentEndDateInput = document.getElementById('enrollmentEndDate');
    const nationalIDInput = document.getElementById('nationalID');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const placeOfLivingInput = document.getElementById('placeOfLiving');
    let editingStudentId = null;

    // --- Bulk Student Upload Elements ---
    const fileUploadInput = document.getElementById('fileUploadInput');
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const uploadStatusDiv = document.getElementById('uploadStatus');

    // --- Attendance Management Section Elements ---
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');
    const attendanceDateInput = document.getElementById('attendanceDate');
    const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const currentAttendanceDateDisplay = document.getElementById('currentAttendanceDateDisplay');
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');

    // --- Grades Management Section Elements ---
    const gradesCourseFilter = document.getElementById('gradesCourseFilter');
    const selectStudentForGrades = document.getElementById('selectStudentForGrades');
    const loadGradesBtn = document.getElementById('loadGradesBtn');
    const gradesTableContainer = document.getElementById('gradesTableContainer');
    const currentGradesStudentName = document.getElementById('currentGradesStudentName');
    const gradesTableBody = document.getElementById('gradesTableBody');
    const saveGradesBtn = document.getElementById('saveGradesBtn');
    const addAssignmentForm = document.getElementById('addAssignmentForm');
    const addAssignmentCourseFilter = document.getElementById('addAssignmentCourseFilter');
    const addAssignmentStudentSelect = document.getElementById('addAssignmentStudent');
    const newAssignmentNameInput = document.getElementById('newAssignmentName');
    const newAssignmentMaxScoreInput = document.getElementById('newAssignmentMaxScore');
    const cancelAddAssignmentBtn = document.getElementById('cancelAddAssignmentBtn');

    // --- Announcements Section Elements ---
    const addAnnouncementForm = document.getElementById('addAnnouncementForm');
    const announcementTitleInput = document.getElementById('announcementTitle');
    const announcementContentInput = document.getElementById('announcementContent');
    const announcementDateInput = document.getElementById('announcementDate');
    const announcementsListDiv = document.getElementById('announcementsList');
    const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');

    // --- Reports & Analytics Section Elements ---
    const totalStudentsReport = document.getElementById('totalStudentsReport');
    const webDevStudents = document.getElementById('webDevStudents');
    const graphicDesignStudents = document.getElementById('graphicDesignStudents');
    const digitalMarketingStudents = document.getElementById('digitalMarketingStudents');
    const overallPresentRate = document.getElementById('overallPresentRate');
    const overallAbsentRate = document.getElementById('overallAbsentRate');
    const absenteeStudentsList = document.getElementById('absenteeStudentsList');
    const totalGradedAssignments = document.getElementById('totalGradedAssignments');
    const totalPendingAssignmentsReport = document.getElementById('totalPendingAssignmentsReport');
    const topStudentsList = document.getElementById('topStudentsList');
    const lowPerformingAssignments = document.getElementById('lowPerformingAssignments');
    const coursePopularityList = document.getElementById('coursePopularityList');

    // --- Dashboard Overview Statistics Elements ---
    const totalStudentsCountElement = document.getElementById('totalStudentsCount');
    const todayAbsencesCountElement = document.getElementById('todayAbsencesCount');
    const pendingAssignmentsCountElement = document.getElementById('pendingAssignmentsCount');

    // --- Settings Section Elements ---
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const editProfileBtn = document.querySelector('.setting-card .setting-content button.primary-button:nth-of-type(1)');
    const changePasswordBtn = document.querySelector('.setting-card .setting-content button.secondary-button');
    const saveGeneralSettingsBtn = document.querySelector('.setting-card button.primary-button:nth-of-type(2)');
    const logoutBtn = document.querySelector('.logout-btn');


    // --- Parse SDK Initialization ---
    if (typeof Parse !== 'undefined') {
        Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
        Parse.serverURL = B4A_SERVER_URL;
        console.log("Back4App Parse SDK Initialized in Dashboard.");

        // Check if user is already logged in (e.g., from loginPage.js)
        const currentUser = Parse.User.current();
        if (currentUser) {
            console.log("User already logged in:", currentUser.id);
            // Optionally, you might refresh the session token if needed
            // await currentUser.fetch(); // Re-fetches user data and updates session
            setupParseLiveQueries(); // Set up real-time listeners for authenticated user
            loadSettings(); // Load user settings
        } else {
            console.warn("No Parse user found. Redirecting to login page.");
            window.location.href = 'index.html'; // Redirect to login page if not authenticated
        }
    } else {
        console.error("Parse SDK not loaded in dashboard. Cannot connect to backend.");
        showMessage("Application error: Backend SDK not loaded. Cannot load data.", "error", 5000);
        // Fallback or exit if Parse is not available
        return;
    }


    // --- Logout Functionality ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default link behavior
            if (Parse.User.current()) {
                try {
                    await Parse.User.logOut();
                    console.log('User logged out successfully.');
                    // Unsubscribe from LiveQueries on logout
                    if (studentSubscription) studentSubscription.unsubscribe();
                    if (attendanceSubscription) attendanceSubscription.unsubscribe();
                    if (gradesSubscription) gradesSubscription.unsubscribe();
                    if (announcementsSubscription) announcementsSubscription.unsubscribe();

                    // Clear any local session storage related to user ID if used
                    sessionStorage.removeItem('currentParseUserId');
                    sessionStorage.removeItem('currentParseSessionToken');

                    showMessage('Logged out successfully! Redirecting...', 'success');
                    // Add a small delay for message visibility before redirect
                    setTimeout(() => {
                        window.location.href = 'index.html'; // Redirect to login page
                    }, 1000);
                } catch (error) {
                    console.error('Error during logout:', error);
                    showMessage('Error during logout: ' + error.message, 'error');
                }
            } else {
                // Already logged out or session invalid, just redirect
                window.location.href = 'index.html';
            }
        });
    }


    // --- Student Management Functions ---
    function renderStudentTable() {
        if (!studentTableBody) { console.error("studentTableBody not found."); return; }
        studentTableBody.innerHTML = '';
        if (students.length === 0) {
            studentTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No students enrolled yet.</td></tr>';
            return;
        }
        students.forEach(student => {
            const row = studentTableBody.insertRow();
            row.innerHTML = `
                <td data-label="Name">${student.name}</td>
                <td data-label="Course/Program">${student.course}</td>
                <td data-label="Season No.">${student.season}</td>
                <td data-label="Start Date">${student.startDate}</td>
                <td data-label="End Date">${student.endDate}</td>
                <td data-label="National ID">${student.nationalID}</td>
                <td data-label="Contact">${student.phone}</td>
                <td data-label="Location">${student.location}</td>
                <td data-label="Actions" class="actions">
                    <button class="edit-button" data-id="${student.id}">Edit</button>
                    <button class="delete-button" data-id="${student.id}">Delete</button>
                </td>
            `;
        });
        document.querySelectorAll('.edit-button').forEach(button => {
            button.onclick = (event) => editStudent(event.target.dataset.id);
        });
        document.querySelectorAll('.delete-button').forEach(button => {
            button.onclick = (event) => deleteStudent(event.target.dataset.id);
        });
    }

    async function addOrUpdateStudent(event, studentDataFromUpload = null) {
        if (event && event.preventDefault) { event.preventDefault(); }
        let studentData;
        if (studentDataFromUpload) {
            studentData = studentDataFromUpload;
        } else {
            if (!studentNameInput || !courseEnrolledInput || !seasonNumberInput || !enrollmentStartDateInput ||
                !enrollmentEndDateInput || !nationalIDInput || !phoneNumberInput || !placeOfLivingInput) {
                showMessage('Error: One or more student input fields not found.', 'error');
                return { success: false, message: 'Missing input fields.' };
            }
            studentData = {
                name: studentNameInput.value.trim(),
                course: courseEnrolledInput.value.trim(),
                season: parseInt(seasonNumberInput.value),
                startDate: enrollmentStartDateInput.value,
                endDate: enrollmentEndDateInput.value,
                nationalID: nationalIDInput.value.trim(),
                phone: phoneNumberInput.value.trim(),
                location: placeOfLivingInput.value.trim(),
            };
        }

        if (!studentData.name || !studentData.course || isNaN(studentData.season) || studentData.season <= 0 ||
            !studentData.startDate || !studentData.endDate || !studentData.nationalID ||
            !studentData.phone || !studentData.location) {
            showMessage('Error: Missing or invalid required student data fields.', 'error', 5000);
            return { success: false, message: 'Invalid data' };
        }

        let isDuplicate = false;
        let duplicateMessage = '';
        const studentsToCheck = students.filter(s => s.id !== editingStudentId);

        if (studentData.nationalID !== '') {
            isDuplicate = studentsToCheck.some(s => s.nationalID === studentData.nationalID);
            if (isDuplicate) {
                duplicateMessage = `A student with National ID '${studentData.nationalID}' already exists.`;
            }
        }
        if (!isDuplicate && studentData.nationalID === '') {
             isDuplicate = studentsToCheck.some(s =>
                s.name.toLowerCase() === studentData.name.toLowerCase() &&
                s.course.toLowerCase() === studentData.course.toLowerCase() &&
                s.season === studentData.season
            );
            if (isDuplicate) {
                duplicateMessage = `A student named '${studentData.name}' in '${studentData.course}' for Season ${studentData.season} already exists.`;
            }
        }

        if (isDuplicate) {
            const msg = `Duplicate entry detected: ${duplicateMessage}`;
            showMessage(msg, 'error', 5000);
            return { success: false, message: msg };
        }

        let savedId = null;
        if (editingStudentId) {
            savedId = await saveParseData('Student', studentData, editingStudentId);
        } else {
            savedId = await saveParseData('Student', studentData);
        }

        if (!studentDataFromUpload) {
            if (addStudentForm) addStudentForm.reset();
            if (addStudentFormContainer) addStudentFormContainer.style.display = 'none';
            editingStudentId = null;
            if (formHeading) formHeading.textContent = 'Add New Student';
            if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
        }
        return { success: !!savedId, id: savedId };
    }

    function editStudent(id) {
        const studentToEdit = students.find(student => student.id === id);
        if (studentToEdit) {
            if (studentNameInput) studentNameInput.value = studentToEdit.name;
            if (courseEnrolledInput) courseEnrolledInput.value = studentToEdit.course;
            if (seasonNumberInput) seasonNumberInput.value = studentToEdit.season;
            if (enrollmentStartDateInput) enrollmentStartDateInput.value = studentToEdit.startDate;
            if (enrollmentEndDateInput) enrollmentEndDateInput.value = studentToEdit.endDate;
            if (nationalIDInput) nationalIDInput.value = studentToEdit.nationalID;
            if (phoneNumberInput) phoneNumberInput.value = studentToEdit.phone;
            if (placeOfLivingInput) placeOfLivingInput.value = studentToEdit.location;

            if (formHeading) formHeading.textContent = `Edit Student: ${studentToEdit.name}`;
            if (addStudentFormContainer) addStudentFormContainer.style.display = 'block';
            editingStudentId = id;
            if (saveStudentButton) saveStudentButton.textContent = 'Update Student';
        }
    }

    async function deleteStudent(id) {
        showConfirmDialog('Are you sure you want to delete this student? This action cannot be undone.', async () => {
            await deleteParseData('Student', id);
        });
    }

    if (addStudentBtn) { addStudentBtn.addEventListener('click', () => {
        if (addStudentFormContainer) addStudentFormContainer.style.display = 'block';
        if (addStudentForm) addStudentForm.reset();
        editingStudentId = null;
        if (formHeading) formHeading.textContent = 'Add New Student';
        if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
    }); }

    if (cancelButton) { cancelButton.addEventListener('click', () => {
        if (addStudentFormContainer) addStudentFormContainer.style.display = 'none';
        if (addStudentForm) addStudentForm.reset();
        editingStudentId = null;
        if (formHeading) formHeading.textContent = 'Add New Student';
        if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
    }); }

    if (addStudentForm) { addStudentForm.addEventListener('submit', addOrUpdateStudent); }

    // --- Bulk Upload Functions ---
    const expectedHeaders = [
        "name", "course", "season", "enrollment start date",
        "enrollment end date", "national id", "phone number", "place of living"
    ];
    const headerMap = {
        "name": "name", "course": "course", "season": "season",
        "enrollment start date": "startDate", "enrollment end date": "endDate",
        "national id": "nationalID", "phone number": "phone", "place of living": "location"
    };

    async function handleFileUpload() {
        if (!fileUploadInput || !uploadStatusDiv) { showMessage("File upload elements not found.", "error"); return; }
        const file = fileUploadInput.files[0];
        if (!file) { showMessage("Please select a file to upload.", "error"); return; }
        uploadStatusDiv.textContent = 'Processing file...'; uploadStatusDiv.style.color = '#555';
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target.result; let parsedData = []; let fileType = file.type;
                if (fileType === "" || fileType === "application/octet-stream") {
                    const fileName = file.name.toLowerCase();
                    if (fileName.endsWith('.csv')) { fileType = 'text/csv'; }
                    else if (fileName.endsWith('.json')) { fileType = 'application/json'; }
                }
                if (fileType === 'text/csv') { parsedData = parseCSV(content); }
                else if (fileType === 'application/json') { parsedData = parseJSON(content); }
                else { showMessage("Unsupported file type. Please upload a CSV or JSON file.", "error"); uploadStatusDiv.textContent = 'Unsupported file type.'; return; }

                if (parsedData.length === 0) { showMessage("No data found in the file or file format is incorrect.", "error"); uploadStatusDiv.textContent = 'No data found or format incorrect.'; return; }
                await processStudentRecords(parsedData);
                fileUploadInput.value = '';
            } catch (error) {
                console.error("Error reading or processing file:", error);
                showMessage(`Error processing file: ${error.message}`, "error", 7000);
                uploadStatusDiv.textContent = `Error: ${error.message}`; uploadStatusDiv.style.color = 'red';
            }
        };
        reader.onerror = () => { showMessage("Error reading file.", "error"); uploadStatusDiv.textContent = 'Error reading file.'; uploadStatusDiv.style.color = 'red'; };
        reader.readAsText(file);
    }

    function parseCSV(csvText) {
        const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 2) { throw new Error("CSV file must contain a header row and at least one data row."); }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const records = [];
        const missingHeaders = expectedHeaders.filter(eh => !headers.includes(eh));
        if (missingHeaders.length > 0) { throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}. Please ensure your CSV matches the specified format.`); }
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length !== headers.length) { console.warn(`Skipping row ${i + 1} due to column count mismatch.`); continue; }
            const record = {};
            headers.forEach((header, index) => { record[headerMap[header] || header] = values[index].trim(); });
            records.push(record);
        }
        return records;
    }

    function parseJSON(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            if (!Array.isArray(data)) { throw new Error("JSON file must contain an array of student objects."); }
            if (data.length > 0) {
                const firstRecord = data[0];
                const recordKeys = Object.keys(firstRecord).map(key => key.toLowerCase());
                const missingKeys = expectedHeaders.filter(eh => !recordKeys.includes(eh));
                if (missingKeys.length > 0) { console.warn(`JSON data might be missing expected keys: ${missingKeys.join(', ')}.`); }
            }
            return data;
        } catch (error) { throw new Error(`Invalid JSON file: ${error.message}`); }
    }

    async function processStudentRecords(records) {
        let successCount = 0; let skipCount = 0;
        const totalRecords = records.length;
        uploadStatusDiv.textContent = `Processing ${totalRecords} records...`; uploadStatusDiv.style.color = '#555';
        for (let i = 0; i < totalRecords; i++) {
            const record = records[i];
            const studentData = {
                name: record.name || '', course: record.course || '', season: parseInt(record.season) || 0,
                startDate: record.startDate || record['enrollment start date'] || '',
                endDate: record.endDate || record['enrollment end date'] || '',
                nationalID: record.nationalID || record['national id'] || '',
                phone: record.phone || record['phone number'] || '',
                location: record.location || record['place of living'] || ''
            };
            studentData.season = parseInt(studentData.season);
            if (isNaN(studentData.season)) studentData.season = 0;
            const result = await addOrUpdateStudent(null, studentData);
            if (result.success) { successCount++; } else { skipCount++; console.warn(`Skipped record ${i + 1}: ${result.message || 'Unknown error'}. Data:`, record); }
        }
        const message = `Upload complete! Added ${successCount} students, skipped ${skipCount} duplicates/invalid records.`;
        showMessage(message, 'success', 7000);
        uploadStatusDiv.textContent = message; uploadStatusDiv.style.color = '#4CAF50';
    }

    if (uploadFileBtn) { uploadFileBtn.addEventListener('click', handleFileUpload); }


    // --- Quick Action Buttons Event Listeners ---
    const goToAttendanceBtn = document.getElementById('goToAttendanceBtn');
    const enterGradesBtn = document.getElementById('enterGradesBtn');
    const addStudentQuickBtn = document.getElementById('addStudentQuickBtn');

    function switchDashboardSection(targetSectionId) {
        sidebarLinks.forEach(item => {
            const href = item.getAttribute('href');
            if (href === `#${targetSectionId}`) { item.classList.add('active'); } else { item.classList.remove('active'); }
        });
        dashboardSections.forEach(section => {
            if (section.id === targetSectionId) { section.classList.add('active'); } else { section.classList.remove('active'); }
        });
    }

    if (goToAttendanceBtn) { goToAttendanceBtn.addEventListener('click', () => { switchDashboardSection('attendance-management'); }); }
    if (enterGradesBtn) { enterGradesBtn.addEventListener('click', () => { switchDashboardSection('grades-management'); }); }
    if (addStudentQuickBtn) { addStudentQuickBtn.addEventListener('click', () => {
        switchDashboardSection('student-management');
        if (addStudentFormContainer) addStudentFormContainer.style.display = 'block';
        if (addStudentForm) addStudentForm.reset(); editingStudentId = null;
        if (formHeading) formHeading.textContent = 'Add New Student';
        if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
    }); }


    // --- Course and Student Dropdown Population ---
    function getUniqueCourses() { return [...new Set(students.map(s => s.course))].sort(); }

    function populateCourseDropdowns() {
        const courses = getUniqueCourses();
        const courseFilters = [attendanceCourseFilter, gradesCourseFilter, addAssignmentCourseFilter];
        courseFilters.forEach(filter => {
            if (filter) {
                const currentValue = filter.value; filter.innerHTML = '<option value="">-- All Courses --</option>';
                if (filter.id === 'addAssignmentCourseFilter') { filter.innerHTML = '<option value="">-- Select Course --</option>'; }
                courses.forEach(course => { const option = document.createElement('option'); option.value = course; option.textContent = course; filter.appendChild(option); });
                filter.value = currentValue;
            }
        });
    }

    function populateStudentDropdowns(selectElement, course = '') {
        if (!selectElement) return;
        const currentValue = selectElement.value; selectElement.innerHTML = '<option value="">-- Select a Student --</option>';
        if (selectElement.id === 'addAssignmentStudent') { selectElement.innerHTML = '<option value="">-- Select Student --</doption>'; }
        const filteredStudents = course ? students.filter(s => s.course === course) : students;
        filteredStudents.sort((a, b) => a.name.localeCompare(b.name)).forEach(student => {
            const option = document.createElement('option'); option.value = student.id;
            option.textContent = student.name + (course ? '' : ` (${student.course})`);
            selectElement.appendChild(option);
        });
        selectElement.value = currentValue;
    }


    // --- Attendance Management Functions ---
    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    if (attendanceDateInput) { attendanceDateInput.value = getTodayDateString(); }

    async function renderAttendanceTable(selectedCourse = '', selectedDate) {
        if (!attendanceTableBody) { console.error("attendanceTableBody not found."); return; }
        attendanceTableBody.innerHTML = '';
        if (currentAttendanceDateDisplay) { currentAttendanceDateDisplay.textContent = selectedDate; }
        const filteredStudents = selectedCourse ? students.filter(s => s.course === selectedCourse) : students;
        if (filteredStudents.length === 0) {
            attendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found for this course/date.</td></tr>';
            if (saveAttendanceBtn) saveAttendanceBtn.style.display = 'none'; return;
        }
        if (saveAttendanceBtn) saveAttendanceBtn.style.display = 'block';
        const existingAttendance = attendanceRecords.find(rec => rec.date === selectedDate && rec.course === selectedCourse);
        const attendanceData = existingAttendance ? existingAttendance.records : {};
        filteredStudents.sort((a, b) => a.name.localeCompare(b.name)).forEach(student => {
            const status = attendanceData[student.id] ? attendanceData[student.id].status : 'present';
            const notes = attendanceData[student.id] ? attendanceData[student.id].notes : '';
            const row = attendanceTableBody.insertRow();
            row.dataset.studentId = student.id; row.dataset.course = student.course;
            row.innerHTML = `
                <td data-label="Student Name">${student.name}</td>
                <td data-label="Status">
                    <label><input type="radio" name="status-${student.id}" value="present" ${status === 'present' ? 'checked' : ''}> Present</label>
                    <label><input type="radio" name="status-${student.id}" value="absent" ${status === 'absent' ? 'checked' : ''}> Absent</label>
                    <label><input type="radio" name="status-${student.id}" value="late" ${status === 'late' ? 'checked' : ''}> Late</label>
                </td>
                <td data-label="Notes"><input type="text" value="${notes}" placeholder="Optional notes"></td>
                <td data-label="Course">${student.course}</td>
            `;
        });
    }

    async function saveAttendance() {
        const date = attendanceDateInput.value;
        const course = attendanceCourseFilter.value;
        if (!date) { showMessage('Please select a date for attendance.', 'error'); return; }
        const records = {}; let allPresent = true;
        if (attendanceTableBody) {
            attendanceTableBody.querySelectorAll('tr').forEach(row => {
                const studentId = row.dataset.studentId;
                if (studentId) {
                    const statusInput = row.querySelector(`input[name="status-${studentId}"]:checked`);
                    const status = statusInput ? statusInput.value : 'present';
                    const notesInput = row.querySelector('input[type="text"]');
                    const notes = notesInput ? notesInput.value : '';
                    records[studentId] = { status, notes };
                    if (status !== 'present') { allPresent = false; }
                }
            });
        }
        const existingRecord = attendanceRecords.find(rec => rec.date === date && rec.course === course);
        const attendanceData = { date: date, course: course, records: records, allPresent: allPresent };
        if (existingRecord) { await saveParseData('AttendanceRecord', attendanceData, existingRecord.id); }
        else { await saveParseData('AttendanceRecord', attendanceData); }
    }

    if (loadAttendanceBtn) { loadAttendanceBtn.addEventListener('click', () => {
        const selectedDate = attendanceDateInput.value; const selectedCourse = attendanceCourseFilter.value;
        if (selectedDate) { renderAttendanceTable(selectedCourse, selectedDate); }
        else { showMessage('Please select a date to load attendance.', 'error'); }
    }); }
    if (attendanceCourseFilter) { attendanceCourseFilter.addEventListener('change', () => {
        const selectedDate = attendanceDateInput.value; const selectedCourse = attendanceCourseFilter.value;
        if (selectedDate) { renderAttendanceTable(selectedCourse, selectedDate); }
        else { showMessage('Please select a date to load attendance.', 'error'); }
    }); }
    if (saveAttendanceBtn) { saveAttendanceBtn.addEventListener('click', saveAttendance); }


    // --- Grades Management Functions ---
    let currentGradesStudentId = null;

    async function renderGradesTable(studentId) {
        if (!gradesTableContainer || !gradesTableBody || !currentGradesStudentName || !saveGradesBtn) { console.error("Grades management elements not found."); return; }
        gradesTableContainer.style.display = 'block'; gradesTableBody.innerHTML = '';
        const student = students.find(s => s.id === studentId);
        if (!student) {
            gradesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Student not found.</td></tr>';
            currentGradesStudentName.textContent = 'N/A'; if (saveGradesBtn) saveGradesBtn.style.display = 'none'; return;
        }
        currentGradesStudentName.textContent = student.name; currentGradesStudentId = studentId;
        const studentGrades = grades.filter(g => g.studentId === studentId);
        if (studentGrades.length === 0) {
            gradesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No grades recorded for this student yet.</td></tr>';
            if (saveGradesBtn) saveGradesBtn.style.display = 'none'; return;
        }
        if (saveGradesBtn) saveGradesBtn.style.display = 'block';
        studentGrades.forEach(grade => {
            const row = gradesTableBody.insertRow(); row.dataset.gradeId = grade.id; row.dataset.assignmentName = grade.assignmentName;
            const statusClass = grade.score !== null && grade.score !== undefined ? 'graded' : 'pending';
            const statusText = grade.score !== null && grade.score !== undefined ? 'Graded' : 'Pending';
            row.innerHTML = `
                <td data-label="Assignment Name">${grade.assignmentName}</td>
                <td data-label="Max Score">${grade.maxScore}</td>
                <td data-label="Student Score"><input type="number" min="0" max="${grade.maxScore}" value="${grade.score !== null && grade.score !== undefined ? grade.score : ''}" placeholder="Enter score"></td>
                <td data-label="Status" class="grade-status ${statusClass}">${statusText}</td>
            `;
            const scoreInput = row.querySelector('input[type="number"]');
            if (scoreInput) { scoreInput.addEventListener('input', (event) => {
                const score = event.target.value.trim(); const statusCell = row.querySelector('.grade-status');
                if (statusCell) {
                    if (score !== '' && !isNaN(score) && Number(score) >= 0) { statusCell.textContent = 'Graded'; statusCell.className = 'grade-status graded'; }
                    else { statusCell.textContent = 'Pending'; statusCell.className = 'grade-status pending'; }
                }
            }); }
        });
    }

    async function saveGrades() {
        if (!currentGradesStudentId) { showMessage('No student selected to save grades for.', 'error'); return; }
        if (!gradesTableBody) { console.error("gradesTableBody not found."); return; }
        const gradesToUpdate = [];
        gradesTableBody.querySelectorAll('tr').forEach(row => {
            const gradeId = row.dataset.gradeId; const assignmentName = row.dataset.assignmentName;
            const scoreInput = row.querySelector('input[type="number"]');
            const newScore = scoreInput && scoreInput.value.trim() !== '' ? parseFloat(scoreInput.value) : null;
            const maxScore = parseFloat(row.children[1].textContent);
            const existingGrade = grades.find(g => g.id === gradeId);
            if (existingGrade) { gradesToUpdate.push({ ...existingGrade, score: newScore }); }
        });
        for (const gradeItem of gradesToUpdate) { await saveParseData('Grade', gradeItem, gradeItem.id); }
    }

    async function addAssignmentToStudent(event) {
        event.preventDefault();
        if (!addAssignmentStudentSelect || !newAssignmentNameInput || !newAssignmentMaxScoreInput || !addAssignmentCourseFilter) { showMessage('Error: Required assignment input fields not found.', 'error'); return; }
        const studentId = addAssignmentStudentSelect.value;
        const assignmentName = newAssignmentNameInput.value;
        const maxScore = parseFloat(newAssignmentMaxScoreInput.value);
        const course = addAssignmentCourseFilter.value;
        if (!studentId || !assignmentName || isNaN(maxScore) || maxScore <= 0) { showMessage('Please fill all assignment fields correctly.', 'error'); return; }
        const newAssignment = { studentId: studentId, assignmentName: assignmentName, maxScore: maxScore, score: null, course: course };
        await saveParseData('Grade', newAssignment);
        if (addAssignmentForm) addAssignmentForm.reset();
    }

    if (gradesCourseFilter) { gradesCourseFilter.addEventListener('change', () => {
        const selectedCourse = gradesCourseFilter.value; populateStudentDropdowns(selectStudentForGrades, selectedCourse);
        if (gradesTableContainer) gradesTableContainer.style.display = 'none';
        if (selectStudentForGrades) selectStudentForGrades.value = '';
    }); }
    if (loadGradesBtn) { loadGradesBtn.addEventListener('click', () => {
        const selectedStudentId = selectStudentForGrades.value;
        if (selectedStudentId) { renderGradesTable(selectedStudentId); }
        else { showMessage('Please select a student to load grades.', 'error'); if (gradesTableContainer) gradesTableContainer.style.display = 'none'; }
    }); }
    if (saveGradesBtn) { saveGradesBtn.addEventListener('click', saveGrades); }
    if (addAssignmentCourseFilter) { addAssignmentCourseFilter.addEventListener('change', () => {
        const selectedCourse = addAssignmentCourseFilter.value; populateStudentDropdowns(addAssignmentStudentSelect, selectedCourse);
    }); }
    if (addAssignmentForm) { addAssignmentForm.addEventListener('submit', addAssignmentToStudent); }
    if (cancelAddAssignmentBtn) { cancelAddAssignmentBtn.addEventListener('click', () => {
        if (addAssignmentForm) addAssignmentForm.reset();
        if (addAssignmentCourseFilter) addAssignmentCourseFilter.value = '';
        populateStudentDropdowns(addAssignmentStudentSelect, '');
    }); }


    // --- Announcements Functions ---
    async function renderAnnouncements() {
        if (!announcementsListDiv) { console.error("announcementsListDiv not found."); return; }
        announcementsListDiv.innerHTML = '';
        if (announcements.length === 0) { announcementsListDiv.innerHTML = '<p>No announcements to display yet.</p>'; return; }
        const sortedAnnouncements = [...announcements].sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedAnnouncements.forEach(announcement => {
            const announcementItem = document.createElement('div');
            announcementItem.classList.add('announcement-item');
            announcementItem.innerHTML = `
                <h4>${announcement.title}</h4>
                <p>${announcement.content}</p>
                <small>Posted on: ${announcement.date}</small>
                <button class="delete-button" data-id="${announcement.id}" style="margin-top: 10px; padding: 5px 10px; font-size: 0.8rem;">Delete</button>
            `;
            announcementsListDiv.appendChild(announcementItem);
        });
        document.querySelectorAll('.announcement-item .delete-button').forEach(button => {
            button.onclick = (event) => deleteAnnouncement(event.target.dataset.id);
        });
    }

    async function addAnnouncement(event) {
        event.preventDefault();
        if (!announcementTitleInput || !announcementContentInput || !announcementDateInput) { showMessage('Error: Required announcement input fields not found.', 'error'); return; }
        const newAnnouncement = { title: announcementTitleInput.value, content: announcementContentInput.value, date: announcementDateInput.value };
        await saveParseData('Announcement', newAnnouncement, null);
        if (addAnnouncementForm) addAnnouncementForm.reset();
        if (announcementDateInput) announcementDateInput.value = getTodayDateString();
    }

    async function deleteAnnouncement(id) {
        showConfirmDialog('Are you sure you want to delete this announcement?', async () => {
            await deleteParseData('Announcement', id);
        });
    }

    if (announcementDateInput) { announcementDateInput.value = getTodayDateString(); }
    if (addAnnouncementForm) { addAnnouncementForm.addEventListener('submit', addAnnouncement); }
    if (cancelAnnouncementBtn) { cancelAnnouncementBtn.addEventListener('click', () => {
        if (addAnnouncementForm) addAnnouncementForm.reset();
        if (announcementDateInput) announcementDateInput.value = getTodayDateString();
    }); }


    // --- Reports & Analytics Functions ---
    function updateReports() {
        if (totalStudentsCountElement) { totalStudentsCountElement.textContent = students.length; }
        const todayDate = getTodayDateString(); let todayAbsences = 0;
        attendanceRecords.forEach(record => {
            if (record.date === todayDate) {
                for (const studentId in record.records) {
                    if (record.records[studentId].status === 'absent') { todayAbsences++; }
                }
            }
        });
        if (todayAbsencesCountElement) { todayAbsencesCountElement.textContent = todayAbsences; }
        const pendingAssignmentsCount = grades.filter(g => g.score === null).length;
        if (pendingAssignmentsCountElement) { pendingAssignmentsCountElement.textContent = pendingAssignmentsCount; }
        if (totalStudentsReport) totalStudentsReport.textContent = students.length;
        if (webDevStudents) webDevStudents.textContent = students.filter(s => s.course === 'Web Development Basics').length;
        if (graphicDesignStudents) graphicDesignStudents.textContent = students.filter(s => s.course === 'Graphic Design Intro').length;
        if (digitalMarketingStudents) digitalMarketingStudents.textContent = students.filter(s => s.course === 'Digital Marketing Mastery').length;

        let totalAttendanceEntries = 0; let totalPresent = 0; let totalAbsent = 0; let totalLate = 0;
        const studentAttendanceCounts = {};
        attendanceRecords.forEach(record => {
            for (const studentId in record.records) {
                if (!studentAttendanceCounts[studentId]) { studentAttendanceCounts[studentId] = { present: 0, absent: 0, late: 0 }; }
                const status = record.records[studentId].status;
                if (status === 'present') { totalPresent++; studentAttendanceCounts[studentId].present++; }
                else if (status === 'absent') { totalAbsent++; studentAttendanceCounts[studentId].absent++; }
                else if (status === 'late') { totalLate++; studentAttendanceCounts[studentId].late++; }
                totalAttendanceEntries++;
            }
        });
        const overallPresentRateVal = totalAttendanceEntries > 0 ? ((totalPresent / totalAttendanceEntries) * 100).toFixed(2) : 0;
        const overallAbsentRateVal = totalAttendanceEntries > 0 ? ((totalAbsent / totalAttendanceEntries) * 100).toFixed(2) : 0;
        if (overallPresentRate) { overallPresentRate.textContent = `${overallPresentRateVal}%`; }
        if (overallAbsentRate) { overallAbsentRate.textContent = `${overallAbsentRateVal}%`; }
        if (absenteeStudentsList) {
            absenteeStudentsList.innerHTML = '';
            const absentStudents = [];
            for (const studentId in studentAttendanceCounts) {
                const student = students.find(s => s.id === studentId);
                if (student && (studentAttendanceCounts[studentId].absent > 0 || studentAttendanceCounts[studentId].late > 0)) {
                    absentStudents.push({ name: student.name, absent: studentAttendanceCounts[studentId].absent, late: studentAttendanceCounts[studentId].late });
                }
            }
            if (absentStudents.length > 0) {
                absentStudents.sort((a, b) => (b.absent + b.late) - (a.absent + a.late));
                absentStudents.forEach(s => { const li = document.createElement('li'); li.textContent = `${s.name}: ${s.absent} Absent, ${s.late} Late`; absenteeStudentsList.appendChild(li); });
            } else { absenteeStudentsList.innerHTML = '<li>No significant absences recorded.</li>'; }
        }

        let totalAssignmentsGradedCount = grades.filter(g => g.score !== null).length;
        if (totalGradedAssignments) { totalGradedAssignments.textContent = totalAssignmentsGradedCount; }
        if (totalPendingAssignmentsReport) { totalPendingAssignmentsReport.textContent = pendingAssignmentsCount; }
        const studentAverageGrades = {};
        const assignmentAverageScores = {};
        grades.forEach(grade => {
            if (grade.score !== null && grade.score !== undefined) {
                if (!studentAverageGrades[grade.studentId]) { studentAverageGrades[grade.studentId] = { totalScore: 0, totalMaxScore: 0, count: 0, avg: 0 }; }
                studentAverageGrades[grade.studentId].totalScore += grade.score;
                studentAverageGrades[grade.studentId].totalMaxScore += grade.maxScore;
                studentAverageGrades[grade.studentId].count++;
                if (!assignmentAverageScores[grade.assignmentName]) { assignmentAverageScores[grade.assignmentName] = { totalScore: 0, totalMaxScore: 0, count: 0, avg: 0 }; }
                assignmentAverageScores[grade.assignmentName].totalScore += grade.score;
                assignmentAverageScores[grade.assignmentName].totalMaxScore += grade.maxScore;
                assignmentAverageScores[grade.assignmentName].count++;
            }
        });

        for (const studentId in studentAverageGrades) { const studentData = studentAverageGrades[studentId]; studentData.avg = (studentData.totalScore / studentData.totalMaxScore) * 100 || 0; }
        for (const assignmentName in assignmentAverageScores) { const assignmentData = assignmentAverageScores[assignmentName]; assignmentData.avg = (assignmentData.totalScore / assignmentData.totalMaxScore) * 100 || 0; }
        if (topStudentsList) {
            topStudentsList.innerHTML = '';
            const sortedStudentsByGrade = Object.keys(studentAverageGrades)
                .map(id => ({ id, name: students.find(s => s.id === id)?.name || 'Unknown Student', avg: studentAverageGrades[id].avg }))
                .sort((a, b) => b.avg - a.avg).slice(0, 5);
            if (sortedStudentsByGrade.length > 0) {
                sortedStudentsByGrade.forEach(s => { const li = document.createElement('li'); li.textContent = `${s.name}: ${s.avg.toFixed(2)}%`; topStudentsList.appendChild(li); });
            } else { topStudentsList.innerHTML = '<li>No graded assignments yet.</li>'; }
        }

        if (lowPerformingAssignments) {
            lowPerformingAssignments.innerHTML = '';
            const sortedAssignmentsByGrade = Object.keys(assignmentAverageScores)
                .map(name => ({ name, avg: assignmentAverageScores[name].avg }))
                .sort((a, b) => a.avg - b.avg).slice(0, 5);
            if (sortedAssignmentsByGrade.length > 0) {
                sortedAssignmentsByGrade.forEach(a => { const li = document.createElement('li'); li.textContent = `${a.name}: ${a.avg.toFixed(2)}%`; lowPerformingAssignments.appendChild(li); });
            } else { lowPerformingAssignments.innerHTML = '<li>No graded assignments yet.</li>'; }
        }

        const courseCounts = {};
        students.forEach(student => { courseCounts[student.course] = (courseCounts[student.course] || 0) + 1; });
        if (coursePopularityList) {
            coursePopularityList.innerHTML = '';
            const sortedCourses = Object.keys(courseCounts).sort((a, b) => courseCounts[b] - courseCounts[a]);
            if (sortedCourses.length > 0) {
                sortedCourses.forEach(course => { const li = document.createElement('li'); li.textContent = `${course}: ${courseCounts[course]} students`; coursePopularityList.appendChild(li); });
            } else { coursePopularityList.innerHTML = '<li>No courses with students yet.</li>'; }
        }
    }


    // --- Settings Functions ---
    function loadSettings() {
        if (themeSelect) {
            const savedTheme = localStorage.getItem('schoolflowTheme');
            if (savedTheme) { themeSelect.value = savedTheme; applyTheme(savedTheme); }
        }
        if (notificationsToggle) {
            const savedNotifications = localStorage.getItem('schoolflowNotifications');
            if (savedNotifications !== null) { notificationsToggle.checked = (savedNotifications === 'true'); }
        }
    }

    function applyTheme(theme) { console.log(`Applying theme: ${theme}`); }
    if (themeSelect) { themeSelect.addEventListener('change', () => {
        const selectedTheme = themeSelect.value; applyTheme(selectedTheme);
    }); loadSettings(); }

    if (notificationsToggle) { notificationsToggle.addEventListener('change', () => {
        if (notificationsToggle.checked) { showMessage('Notifications will be enabled on save.', 'info'); }
        else { showMessage('Notifications will be disabled on save.', 'info'); }
    }); }

    if (editProfileBtn) { editProfileBtn.addEventListener('click', () => {
        showMessage('Edit Profile clicked! (Functionality to edit user data is not yet implemented)', 'info');
    }); }

    if (changePasswordBtn) { changePasswordBtn.addEventListener('click', () => {
        showMessage('Change Password clicked! (Functionality to change password is not yet implemented)', 'info');
    }); }

    if (saveGeneralSettingsBtn) { saveGeneralSettingsBtn.addEventListener('click', () => {
        if (themeSelect) { localStorage.setItem('schoolflowTheme', themeSelect.value); }
        if (notificationsToggle) { localStorage.setItem('schoolflowNotifications', notificationsToggle.checked); }
        showMessage('General Settings saved successfully!', 'success');
    }); }
});
