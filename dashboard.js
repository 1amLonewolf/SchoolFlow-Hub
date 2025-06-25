// dashboard.js

// Firebase configuration variables - These will be globally available in the Canvas environment
// If running locally, you might need to manually set these or mock them
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

// Firebase App and Firestore instances
let app;
let db;
let auth;
let userId; // Will store the current user's ID

// Import Firebase modules (if running in a non-module environment, these imports might need adjustment
// to script tags as shown in Firestore documentation for HTML, but for Canvas immersive, this is typical)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Global data arrays (will be replaced by Firestore data)
let students = [];
let attendanceRecords = [];
let grades = [];
let announcements = [];

// --- Utility Function for displaying messages (replaces alert) ---
// Moved to global scope to be accessible immediately
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
    messageBox.className = 'message'; // Reset classes
    if (type === "success") {
        messageBox.style.backgroundColor = '#4CAF50'; // Green
    } else if (type === "error") {
        messageBox.style.backgroundColor = '#f44336'; // Red
    } else {
        messageBox.style.backgroundColor = '#2196F3'; // Blue
    }

    // Show message
    messageBox.style.opacity = '1';
    messageBox.style.transform = 'translateY(0)';

    // Hide message after duration
    setTimeout(() => {
        messageBox.style.opacity = '0';
        messageBox.style.transform = 'translateY(-20px)';
        messageBox.addEventListener('transitionend', () => {
            if (messageBox.style.opacity === '0') {
                messageBox.remove(); // Remove from DOM after fade out
            }
        }, { once: true });
    }, duration);
}

// --- Utility Function for displaying confirmation dialog (replaces confirm) ---
// Moved to global scope to be accessible immediately
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

    // Show the confirmation box
    confirmBox.style.opacity = '1';
    confirmBox.style.transform = 'translate(-50%, -50%)';

    const confirmYesBtn = document.getElementById('confirmYes');
    const confirmNoBtn = document.getElementById('confirmNo');

    confirmYesBtn.onclick = () => {
        confirmBox.style.opacity = '0';
        confirmBox.style.transform = 'translate(-50%, -70%)'; // Slide up on close
        confirmBox.addEventListener('transitionend', () => confirmBox.remove(), { once: true });
        if (onConfirm) onConfirm();
    };

    confirmNoBtn.onclick = () => {
        confirmBox.style.opacity = '0';
        confirmBox.style.transform = 'translate(-50%, -70%)'; // Slide up on close
        confirmBox.addEventListener('transitionend', () => confirmBox.remove(), { once: true });
        if (onCancel) onCancel();
    };
}


// --- Helper for generating unique IDs (simple, for in-memory data) ---
function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// --- Firebase Data Operations ---
async function getCollectionRef(collectionName, isPublic = false, subCollectionId = null) {
    if (!db || !userId) {
        console.warn("Firestore not initialized or userId not available. Operations will be on mock data.");
        return null; // Indicates that Firestore is not ready
    }
    if (isPublic) {
        // For public data shared across all users for this app
        return collection(db, `artifacts/${appId}/public/data/${collectionName}`);
    } else {
        // For private user-specific data
        return collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`);
    }
}

async function saveData(collectionName, data, id = null, isPublic = false) {
    try {
        const colRef = await getCollectionRef(collectionName, isPublic);
        if (!colRef) return false;

        if (id) {
            // Update existing document
            await setDoc(doc(colRef, id), data);
            console.log(`Document ${id} in ${collectionName} updated successfully.`);
        } else {
            // Add new document
            const docRef = await addDoc(colRef, data);
            id = docRef.id; // Get the ID of the newly added document
            console.log(`Document added to ${collectionName} with ID: ${id}`);
        }
        showMessage('Data saved successfully!', 'success');
        return id;
    } catch (e) {
        console.error("Error saving document: ", e);
        showMessage('Error saving data!', 'error');
        return false;
    }
}

async function loadData(collectionName, isPublic = false) {
    try {
        const colRef = await getCollectionRef(collectionName, isPublic);
        if (!colRef) return [];

        const q = query(colRef); // Fetch all documents
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Loaded ${data.length} documents from ${collectionName}.`);
        return data;
    } catch (e) {
        console.error("Error loading documents: ", e);
        showMessage('Error loading data!', 'error');
        return [];
    }
}

async function deleteData(collectionName, id, isPublic = false) {
    try {
        const colRef = await getCollectionRef(collectionName, isPublic);
        if (!colRef) return false;

        await deleteDoc(doc(colRef, id));
        console.log(`Document ${id} deleted from ${collectionName}.`);
        showMessage('Item deleted successfully!', 'success');
        return true;
    } catch (e) {
        console.error("Error deleting document: ", e);
        showMessage('Error deleting item!', 'error');
        return false;
    }
}

// --- Load all data on app start or authentication change ---
async function loadAllData() {
    if (db && userId) { // Only load if Firestore is ready
        students = await loadData('students');
        attendanceRecords = await loadData('attendanceRecords');
        grades = await loadData('grades');
        announcements = await loadData('announcements', true); // Announcements can be public
        populateCourseDropdowns();
        populateStudentDropdowns(selectStudentForGrades);
        populateStudentDropdowns(addAssignmentStudentSelect);
        renderStudentTable(); // Render table after data is loaded
        renderAnnouncements(); // Render announcements after data is loaded
        updateReports(); // Update reports after all data is loaded
    } else {
        console.warn("Firestore not ready for full data load. Using mock data.");
        loadMockData(); // Fallback to mock data if Firebase init fails or is missing
        populateCourseDropdowns();
        populateStudentDropdowns(selectStudentForGrades);
        populateStudentDropdowns(addAssignmentStudentSelect);
        renderStudentTable(); // Render table after data is loaded
        renderAnnouncements(); // Render announcements after data is loaded
        updateReports(); // Update reports after all data is loaded
    }
}

function loadMockData() {
    // Mock data for initial load if Firebase isn't used
    students = JSON.parse(localStorage.getItem('students')) || [
        { id: 's001', name: 'Alice Smith', course: 'Web Development Basics', season: 1, startDate: '2024-01-15', endDate: '2024-06-15', nationalID: '12345678A', phone: '0712345678', location: 'Nairobi' },
        { id: 's002', name: 'Bob Johnson', course: 'Graphic Design Intro', season: 1, startDate: '2024-01-15', endDate: '2024-06-15', nationalID: '87654321B', phone: '0723456789', location: 'Mombasa' },
        { id: 's003', name: 'Charlie Brown', course: 'Digital Marketing Mastery', season: 1, startDate: '2024-01-15', endDate: '2024-06-15', nationalID: '11223344C', phone: '0734567890', location: 'Kisumu' }
    ];
    attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    grades = JSON.parse(localStorage.getItem('grades')) || [];
    announcements = JSON.parse(localStorage.getItem('announcements')) || [];
}

function saveMockData() {
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    localStorage.setItem('grades', JSON.stringify(grades));
    localStorage.setItem('announcements', JSON.stringify(announcements));
}


// --- DOM Content Loaded and Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // This line is crucial for the page to become visible after styling is loaded
        document.body.style.opacity = '1';

        // --- Hamburger Menu Elements ---
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const mainHeader = document.querySelector('.main-header'); // For height calculation on mobile


        // --- Sidebar Navigation and Content Section Elements ---
        const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
        const dashboardSections = document.querySelectorAll('.dashboard-content-section');

        // --- Student Management Section Elements --
        const addStudentBtn = document.getElementById('addStudentBtn');
        const addStudentFormContainer = document.querySelector('.add-student-form-container');
        const addStudentForm = document.getElementById('addStudentForm');
        const studentTableBody = document.querySelector('#studentTable tbody');
        const cancelButton = addStudentForm.querySelector('.cancel-button');
        const saveStudentButton = addStudentForm.querySelector('.submit-button');
        const formHeading = addStudentFormContainer.querySelector('h3');

        // Input fields for the student form
        const studentNameInput = document.getElementById('studentName');
        const courseEnrolledInput = document.getElementById('courseEnrolled');
        const seasonNumberInput = document.getElementById('seasonNumber');
        const enrollmentStartDateInput = document.getElementById('enrollmentStartDate');
        const enrollmentEndDateInput = document.getElementById('enrollmentEndDate');
        const nationalIDInput = document.getElementById('nationalID');
        const phoneNumberInput = document.getElementById('phoneNumber');
        const placeOfLivingInput = document.getElementById('placeOfLiving');

        let editingStudentId = null; // To store the ID of the student being edited

        // --- Bulk Student Upload Elements (NEW) ---
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

        // Add Assignment Elements
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
        // NEW: References for settings buttons
        const editProfileBtn = document.querySelector('.setting-card .setting-content button.primary-button:nth-of-type(1)'); // More specific selector
        const changePasswordBtn = document.querySelector('.setting-card .setting-content button.secondary-button'); // More specific selector
        const saveGeneralSettingsBtn = document.querySelector('.setting-card button.primary-button:nth-of-type(2)'); // Adjusted selector to be more specific


        // --- Initialize Firebase ---
        if (firebaseConfig) {
            try {
                app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);

                // Authenticate user
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        userId = user.uid;
                        console.log("Firebase authenticated. User ID:", userId);
                        // Load initial data only after authentication is confirmed
                        await loadAllData();
                        // Load settings after Firebase is ready
                        loadSettings();
                    } else {
                        // Sign in anonymously if no user is found
                        console.log("No user found, signing in anonymously...");
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await signInWithCustomToken(auth, __initial_auth_token);
                        } else {
                            await signInAnonymously(auth);
                        }
                    }
                });
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                showMessage("Error initializing application. Please try again.", "error");
            }
        } else {
            console.warn("Firebase config not found. Running with in-memory data only.");
            loadMockData();
            loadSettings(); // Load settings even with mock data
        }

        // --- Sidebar Toggle Logic (Hamburger Menu) ---
        if (hamburgerBtn && sidebar && sidebarOverlay) {
            hamburgerBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                sidebarOverlay.classList.toggle('visible');
            });

            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('visible');
            });
        }

        // Close sidebar when a navigation link is clicked (on mobile)
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('visible');
                }

                sidebarLinks.forEach(item => item.classList.remove('active'));
                event.currentTarget.classList.add('active');

                dashboardSections.forEach(section => {
                    section.classList.remove('active');
                });

                const targetSectionId = event.currentTarget.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetSectionId);
                if (targetSection) {
                    targetSection.classList.add('active');
                } else {
                    console.warn(`Target section '${targetSectionId}' not found.`);
                }
            });
        });

        // --- Student Management Functions ---
        function renderStudentTable() {
            if (!studentTableBody) {
                console.error("studentTableBody not found. Cannot render student table.");
                return;
            }
            studentTableBody.innerHTML = ''; // Clear existing rows
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

            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-button').forEach(button => {
                button.onclick = (event) => editStudent(event.target.dataset.id);
            });
            document.querySelectorAll('.delete-button').forEach(button => {
                button.onclick = (event) => deleteStudent(event.target.dataset.id);
            });
        }

        async function addOrUpdateStudent(event, studentDataFromUpload = null) {
            // If called from a form submission, prevent default behavior
            if (event && event.preventDefault) {
                event.preventDefault();
            }

            let studentData;
            // Determine if data comes from form or upload
            if (studentDataFromUpload) {
                studentData = studentDataFromUpload;
            } else {
                // Input validation and existence checks for form data
                if (!studentNameInput || !courseEnrolledInput || !seasonNumberInput || !enrollmentStartDateInput ||
                    !enrollmentEndDateInput || !nationalIDInput || !phoneNumberInput || !placeOfLivingInput) {
                    showMessage('Error: One or more student input fields not found.', 'error');
                    console.error("Missing student input elements for addOrUpdateStudent.");
                    return;
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

            // --- Basic Data Validation (ensure required fields are not empty) ---
            if (!studentData.name || !studentData.course || isNaN(studentData.season) || studentData.season <= 0 ||
                !studentData.startDate || !studentData.endDate || !studentData.nationalID ||
                !studentData.phone || !studentData.location) {
                showMessage('Error: Missing or invalid required student data fields. Name, Course, Season, Dates, ID, Phone, Location are required.', 'error', 5000);
                return { success: false, message: 'Invalid data' }; // Return status for upload processing
            }


            // --- Duplicate Data Detection Logic ---
            let isDuplicate = false;
            let duplicateMessage = '';

            // Filter out the student being edited from the check
            const studentsToCheck = students.filter(s => s.id !== editingStudentId);

            // Primary check: National ID
            if (studentData.nationalID !== '') {
                isDuplicate = studentsToCheck.some(s => s.nationalID === studentData.nationalID);
                if (isDuplicate) {
                    duplicateMessage = `A student with National ID '${studentData.nationalID}' already exists.`;
                }
            }

            // Fallback check: Name + Course + Season if National ID is empty or not found as duplicate
            // Only perform this check if no duplicate was found by National ID AND National ID was empty for the new entry
            if (!isDuplicate && studentData.nationalID === '') {
                 isDuplicate = studentsToCheck.some(s =>
                    s.name.toLowerCase() === studentData.name.toLowerCase() && // Case-insensitive
                    s.course.toLowerCase() === studentData.course.toLowerCase() && // Case-insensitive
                    s.season === studentData.season
                );
                if (isDuplicate) {
                    duplicateMessage = `A student named '${studentData.name}' in '${studentData.course}' for Season ${studentData.season} already exists.`;
                }
            }

            if (isDuplicate) {
                // For bulk upload, we return a specific message, for form we show a general message
                const msg = `Duplicate entry detected: ${duplicateMessage}`;
                showMessage(msg, 'error', 5000);
                return { success: false, message: msg }; // Return status for upload processing
            }
            // --- End Duplicate Data Detection Logic ---


            let newId = null;
            if (editingStudentId) {
                // Update existing student
                const index = students.findIndex(s => s.id === editingStudentId);
                if (index !== -1) {
                    if (db && userId) {
                        await saveData('students', studentData, editingStudentId);
                        students[index] = { id: editingStudentId, ...studentData };
                    } else {
                        students[index] = { id: editingStudentId, ...studentData };
                        saveMockData();
                    }
                    showMessage('Student updated successfully!', 'success');
                }
            } else {
                // Add new student
                if (db && userId) {
                    newId = await saveData('students', studentData);
                    if (newId) {
                        students.push({ id: newId, ...studentData });
                    }
                } else {
                    newId = generateUniqueId();
                    students.push({ id: newId, ...studentData });
                    saveMockData();
                }
                showMessage('Student added successfully!', 'success');
            }

            // Only reset form if called from actual form submission, not bulk upload
            if (!studentDataFromUpload) {
                if (addStudentForm) addStudentForm.reset();
                if (addStudentFormContainer) addStudentFormContainer.style.display = 'none';
                editingStudentId = null; // Reset editing state
                if (formHeading) formHeading.textContent = 'Add New Student'; // Reset form heading
                if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
            }

            renderStudentTable();
            populateCourseDropdowns();
            populateStudentDropdowns(selectStudentForGrades);
            populateStudentDropdowns(addAssignmentStudentSelect);
            updateReports(); // Crucial to update reports after student data changes
            return { success: true, id: newId || editingStudentId }; // Return status for upload processing
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
                if (db && userId) {
                    const success = await deleteData('students', id);
                    if (success) {
                        students = students.filter(student => student.id !== id);
                        renderStudentTable();
                        populateCourseDropdowns();
                        populateStudentDropdowns(selectStudentForGrades);
                        populateStudentDropdowns(addAssignmentStudentSelect);
                        updateReports(); // Crucial to update reports after student data changes
                    }
                } else {
                    students = students.filter(student => student.id !== id);
                    saveMockData();
                    renderStudentTable();
                    populateCourseDropdowns();
                    populateStudentDropdowns(selectStudentForGrades);
                    populateStudentDropdowns(addAssignmentStudentSelect);
                    updateReports(); // Crucial to update reports after student data changes
                    showMessage('Student deleted successfully!', 'success');
                }
            });
        }

        if (addStudentBtn) {
            addStudentBtn.addEventListener('click', () => {
                if (addStudentFormContainer) addStudentFormContainer.style.display = 'block';
                if (addStudentForm) addStudentForm.reset();
                editingStudentId = null;
                if (formHeading) formHeading.textContent = 'Add New Student';
                if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
            });
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                if (addStudentFormContainer) addStudentFormContainer.style.display = 'none';
                if (addStudentForm) addStudentForm.reset();
                editingStudentId = null;
                if (formHeading) formHeading.textContent = 'Add New Student';
                if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
            });
        }

        if (addStudentForm) {
            addStudentForm.addEventListener('submit', addOrUpdateStudent);
        }

        // --- Bulk Upload Functions (NEW) ---

        // Expected headers for CSV/JSON (case-insensitive for JSON keys in processing)
        const expectedHeaders = [
            "name", "course", "season", "enrollment start date",
            "enrollment end date", "national id", "phone number", "place of living"
        ];
        // Mapping from user-friendly header to internal field name
        const headerMap = {
            "name": "name",
            "course": "course",
            "season": "season",
            "" : "enrollmentStartDate", // Added this here for mapping
            "enrollment start date": "enrollmentStartDate",
            "enrollment end date": "enrollmentEndDate",
            "national id": "nationalID",
            "phone number": "phone",
            "place of living": "location"
        };


        async function handleFileUpload() {
            if (!fileUploadInput || !uploadStatusDiv) {
                showMessage("File upload elements not found.", "error");
                return;
            }

            const file = fileUploadInput.files[0];
            if (!file) {
                showMessage("Please select a file to upload.", "error");
                return;
            }

            uploadStatusDiv.textContent = 'Processing file...';
            uploadStatusDiv.style.color = '#555';

            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    let parsedData = [];
                    let fileType = file.type;

                    // Fallback to extension check if MIME type is generic
                    if (fileType === "" || fileType === "application/octet-stream") {
                        const fileName = file.name.toLowerCase();
                        if (fileName.endsWith('.csv')) {
                            fileType = 'text/csv';
                        } else if (fileName.endsWith('.json')) {
                            fileType = 'application/json';
                        }
                    }

                    if (fileType === 'text/csv') {
                        parsedData = parseCSV(content);
                    } else if (fileType === 'application/json') {
                        parsedData = parseJSON(content);
                    } else {
                        showMessage("Unsupported file type. Please upload a CSV or JSON file.", "error");
                        uploadStatusDiv.textContent = 'Unsupported file type.';
                        return;
                    }

                    if (parsedData.length === 0) {
                        showMessage("No data found in the file or file format is incorrect.", "error");
                        uploadStatusDiv.textContent = 'No data found or format incorrect.';
                        return;
                    }

                    await processStudentRecords(parsedData);
                    fileUploadInput.value = ''; // Clear file input
                } catch (error) {
                    console.error("Error reading or processing file:", error);
                    showMessage(`Error processing file: ${error.message}`, "error", 7000);
                    uploadStatusDiv.textContent = `Error: ${error.message}`;
                    uploadStatusDiv.style.color = 'red';
                }
            };

            reader.onerror = () => {
                showMessage("Error reading file.", "error");
                uploadStatusDiv.textContent = 'Error reading file.';
                uploadStatusDiv.style.color = 'red';
            };

            reader.readAsText(file);
        }

        function parseCSV(csvText) {
            const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length < 2) {
                throw new Error("CSV file must contain a header row and at least one data row.");
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const records = [];

            // Validate headers against expected ones
            const missingHeaders = expectedHeaders.filter(eh => !headers.includes(eh));
            if (missingHeaders.length > 0) {
                throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}. Please ensure your CSV matches the specified format.`);
            }

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                if (values.length !== headers.length) {
                    console.warn(`Skipping row ${i + 1} due to column count mismatch. Expected ${headers.length}, got ${values.length}.`);
                    continue; // Skip invalid rows
                }

                const record = {};
                headers.forEach((header, index) => {
                    // Use the mapping for internal field names
                    const fieldName = headerMap[header] || header; // Fallback to header if no map entry
                    record[fieldName] = values[index].trim();
                });
                records.push(record);
            }
            return records;
        }

        function parseJSON(jsonText) {
            try {
                const data = JSON.parse(jsonText);
                if (!Array.isArray(data)) {
                    throw new Error("JSON file must contain an array of student objects.");
                }

                // Optional: Basic validation of JSON structure
                if (data.length > 0) {
                    const firstRecord = data[0];
                    const recordKeys = Object.keys(firstRecord).map(key => key.toLowerCase()); // Get keys and make lowercase
                    const missingKeys = expectedHeaders.filter(eh => !recordKeys.includes(eh)); // Check against lowercased expected headers
                    if (missingKeys.length > 0) {
                        console.warn(`JSON data might be missing expected keys: ${missingKeys.join(', ')}. Attempting to process anyway.`);
                        // Decide if you want to throw an error here or just warn.
                        // For now, we'll warn and let addOrUpdateStudent handle missing required fields.
                    }
                }
                return data;
            } catch (error) {
                throw new Error(`Invalid JSON file: ${error.message}`);
            }
        }

        async function processStudentRecords(records) {
            let successCount = 0;
            let skipCount = 0;
            const totalRecords = records.length;
            uploadStatusDiv.textContent = `Processing ${totalRecords} records...`;
            uploadStatusDiv.style.color = '#555';

            for (let i = 0; i < totalRecords; i++) {
                const record = records[i];
                // Map keys from potential CSV/JSON headers to expected internal format
                const studentData = {
                    name: record.name || '',
                    course: record.course || '',
                    season: parseInt(record.season) || 0, // Ensure season is a number
                    startDate: record.enrollmentStartDate || record['enrollment start date'] || '',
                    endDate: record.enrollmentEndDate || record['enrollment end date'] || '',
                    nationalID: record.nationalID || record['national id'] || '',
                    phone: record.phone || record['phone number'] || '',
                    location: record.location || record['place of living'] || ''
                };
                // Ensure season is a number even if it comes as string from CSV
                studentData.season = parseInt(studentData.season);
                if (isNaN(studentData.season)) studentData.season = 0; // Default to 0 or handle as error

                const result = await addOrUpdateStudent(null, studentData); // Pass null for event, pass data directly
                if (result.success) {
                    successCount++;
                } else {
                    skipCount++;
                    console.warn(`Skipped record ${i + 1}: ${result.message || 'Unknown error'}. Data:`, record);
                }
            }

            const message = `Upload complete! Added ${successCount} students, skipped ${skipCount} duplicates/invalid records.`;
            showMessage(message, 'success', 7000);
            uploadStatusDiv.textContent = message;
            uploadStatusDiv.style.color = '#4CAF50';

            // Re-load all data and update UI after bulk upload
            await loadAllData();
        }

        if (uploadFileBtn) {
            uploadFileBtn.addEventListener('click', handleFileUpload);
        }


        // --- Quick Action Buttons Event Listeners ---
        const goToAttendanceBtn = document.getElementById('goToAttendanceBtn');
        const enterGradesBtn = document.getElementById('enterGradesBtn');
        const addStudentQuickBtn = document.getElementById('addStudentQuickBtn');

        // Function to switch dashboard sections (refactored for reuse)
        function switchDashboardSection(targetSectionId) {
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
                } else {
                    section.classList.remove('active');
                }
            });
        }

        if (goToAttendanceBtn) {
            goToAttendanceBtn.addEventListener('click', () => {
                switchDashboardSection('attendance-management');
                // Optional: Scroll to top of the section or highlight something
            });
        }
        if (enterGradesBtn) {
            enterGradesBtn.addEventListener('click', () => {
                switchDashboardSection('grades-management');
                // Optional: Scroll to top of the section or highlight something
            });
        }
        if (addStudentQuickBtn) {
            addStudentQuickBtn.addEventListener('click', () => {
                switchDashboardSection('student-management');
                if (addStudentFormContainer) addStudentFormContainer.style.display = 'block'; // Show the form immediately
                if (addStudentForm) addStudentForm.reset();
                editingStudentId = null;
                if (formHeading) formHeading.textContent = 'Add New Student';
                if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
            });
        }

        // --- Course and Student Dropdown Population ---
        function getUniqueCourses() {
            return [...new Set(students.map(s => s.course))].sort();
        }

        function populateCourseDropdowns() {
            const courses = getUniqueCourses();
            const courseFilters = [attendanceCourseFilter, gradesCourseFilter, addAssignmentCourseFilter];

            courseFilters.forEach(filter => {
                if (filter) { // Ensure filter element exists
                    const currentValue = filter.value; // Preserve current selection
                    filter.innerHTML = '<option value="">-- All Courses --</option>'; // Default option
                    if (filter.id === 'addAssignmentCourseFilter') {
                        filter.innerHTML = '<option value="">-- Select Course --</option>';
                    }
                    courses.forEach(course => {
                        const option = document.createElement('option');
                        option.value = course;
                        option.textContent = course;
                        filter.appendChild(option);
                    });
                    filter.value = currentValue; // Restore selection
                }
            });
        }

        function populateStudentDropdowns(selectElement, course = '') {
            if (!selectElement) return; // Ensure selectElement exists

            const currentValue = selectElement.value; // Preserve current selection
            selectElement.innerHTML = '<option value="">-- Select a Student --</option>';
            if (selectElement.id === 'addAssignmentStudent') {
                selectElement.innerHTML = '<option value="">-- Select Student --</option>';
            }

            const filteredStudents = course ? students.filter(s => s.course === course) : students;

            filteredStudents.sort((a, b) => a.name.localeCompare(b.name)).forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.name + (course ? '' : ` (${student.course})`); // Add course if 'All Courses' selected
                selectElement.appendChild(option);
            });
            selectElement.value = currentValue; // Restore selection
        }


        // --- Attendance Management Functions ---
        // Set default date to today
        function getTodayDateString() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        if (attendanceDateInput) {
            attendanceDateInput.value = getTodayDateString(); // Set current date as default
        }

        async function renderAttendanceTable(selectedCourse = '', selectedDate) {
            if (!attendanceTableBody) {
                console.error("attendanceTableBody not found. Cannot render attendance table.");
                return;
            }
            attendanceTableBody.innerHTML = '';
            if (currentAttendanceDateDisplay) {
                currentAttendanceDateDisplay.textContent = selectedDate;
            }


            const filteredStudents = selectedCourse ? students.filter(s => s.course === selectedCourse) : students;

            if (filteredStudents.length === 0) {
                attendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found for this course/date.</td></tr>';
                if (saveAttendanceBtn) saveAttendanceBtn.style.display = 'none';
                return;
            }

            if (saveAttendanceBtn) saveAttendanceBtn.style.display = 'block';

            // Try to find existing attendance for this date
            const existingAttendance = attendanceRecords.find(rec => rec.date === selectedDate && rec.course === selectedCourse);
            const attendanceData = existingAttendance ? existingAttendance.records : {};

            filteredStudents.sort((a, b) => a.name.localeCompare(b.name)).forEach(student => {
                const status = attendanceData[student.id] ? attendanceData[student.id].status : 'present'; // Default to present
                const notes = attendanceData[student.id] ? attendanceData[student.id].notes : '';

                const row = attendanceTableBody.insertRow();
                row.dataset.studentId = student.id; // Store student ID on the row
                row.dataset.course = student.course; // Store student course on the row

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
            const course = attendanceCourseFilter.value; // Course filter value used for this attendance record

            if (!date) {
                showMessage('Please select a date for attendance.', 'error');
                return;
            }

            const records = {};
            let allPresent = true; // Flag to check if all students are present

            if (attendanceTableBody) {
                attendanceTableBody.querySelectorAll('tr').forEach(row => {
                    const studentId = row.dataset.studentId;
                    if (studentId) { // Check if it's a student row, not the "No students" message
                        const statusInput = row.querySelector(`input[name="status-${studentId}"]:checked`);
                        const status = statusInput ? statusInput.value : 'present'; // Fallback
                        const notesInput = row.querySelector('input[type="text"]');
                        const notes = notesInput ? notesInput.value : '';
                        records[studentId] = { status, notes };
                        if (status !== 'present') {
                            allPresent = false;
                        }
                    }
                });
            }


            // Find existing record for this date and course
            const existingIndex = attendanceRecords.findIndex(rec => rec.date === date && rec.course === course);
            const attendanceData = {
                date: date,
                course: course,
                records: records,
                allPresent: allPresent // Save the allPresent status
            };

            if (db && userId) {
                if (existingIndex !== -1) {
                    const recordId = attendanceRecords[existingIndex].id;
                    await saveData('attendanceRecords', attendanceData, recordId);
                    attendanceRecords[existingIndex] = { id: recordId, ...attendanceData };
                } else {
                    const newId = await saveData('attendanceRecords', attendanceData);
                    if (newId) {
                        attendanceRecords.push({ id: newId, ...attendanceData });
                    }
                }
            } else {
                if (existingIndex !== -1) {
                    attendanceRecords[existingIndex] = attendanceData;
                } else {
                    attendanceRecords.push({ id: generateUniqueId(), ...attendanceData });
                }
                saveMockData();
            }

            showMessage('Attendance saved successfully!', 'success');
            updateReports();
        }

        if (loadAttendanceBtn) {
            loadAttendanceBtn.addEventListener('click', () => {
                const selectedDate = attendanceDateInput.value;
                const selectedCourse = attendanceCourseFilter.value;
                if (selectedDate) {
                    renderAttendanceTable(selectedCourse, selectedDate);
                } else {
                    showMessage('Please select a date to load attendance.', 'error');
                }
            });
        }
        if (attendanceCourseFilter) {
            attendanceCourseFilter.addEventListener('change', () => {
                const selectedDate = attendanceDateInput.value;
                const selectedCourse = attendanceCourseFilter.value;
                if (selectedDate) {
                    renderAttendanceTable(selectedCourse, selectedDate);
                } else {
                    showMessage('Please select a date to load attendance.', 'error');
                }
            });
        }
        if (saveAttendanceBtn) {
            saveAttendanceBtn.addEventListener('click', saveAttendance);
        }


        // --- Grades Management Functions ---
        let currentGradesStudentId = null; // Store the student ID whose grades are currently displayed

        async function renderGradesTable(studentId) {
            if (!gradesTableContainer || !gradesTableBody || !currentGradesStudentName || !saveGradesBtn) {
                console.error("Grades management elements not found. Cannot render grades table.");
                return;
            }
            gradesTableContainer.style.display = 'block';
            gradesTableBody.innerHTML = '';

            const student = students.find(s => s.id === studentId);
            if (!student) {
                gradesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Student not found.</td></tr>';
                currentGradesStudentName.textContent = 'N/A';
                saveGradesBtn.style.display = 'none';
                return;
            }

            currentGradesStudentName.textContent = student.name;
            currentGradesStudentId = studentId; // Set the current student ID

            const studentGrades = grades.filter(g => g.studentId === studentId);

            if (studentGrades.length === 0) {
                gradesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No grades recorded for this student yet.</td></tr>';
                saveGradesBtn.style.display = 'none';
                return;
            }

            saveGradesBtn.style.display = 'block';

            studentGrades.forEach(grade => {
                const row = gradesTableBody.insertRow();
                row.dataset.gradeId = grade.id; // Store grade ID on the row
                row.dataset.assignmentName = grade.assignmentName; // For easy reference

                const statusClass = grade.score !== null && grade.score !== undefined ? 'graded' : 'pending';
                const statusText = grade.score !== null && grade.score !== undefined ? 'Graded' : 'Pending';

                row.innerHTML = `
                    <td data-label="Assignment Name">${grade.assignmentName}</td>
                    <td data-label="Max Score">${grade.maxScore}</td>
                    <td data-label="Student Score"><input type="number" min="0" max="${grade.maxScore}" value="${grade.score !== null && grade.score !== undefined ? grade.score : ''}" placeholder="Enter score"></td>
                    <td data-label="Status" class="grade-status ${statusClass}">${statusText}</td>
                `;

                // Add event listener to update status dynamically when score input changes
                const scoreInput = row.querySelector('input[type="number"]');
                if (scoreInput) { // Check existence
                    scoreInput.addEventListener('input', (event) => {
                        const score = event.target.value.trim();
                        const statusCell = row.querySelector('.grade-status');
                        if (statusCell) { // Check existence
                            if (score !== '' && !isNaN(score) && Number(score) >= 0) {
                                statusCell.textContent = 'Graded';
                                statusCell.className = 'grade-status graded';
                            } else {
                                statusCell.textContent = 'Pending';
                                statusCell.className = 'grade-status pending';
                            }
                        }
                    });
                }
            });
        }

        async function saveGrades() {
            if (!currentGradesStudentId) {
                showMessage('No student selected to save grades for.', 'error');
                return;
            }
            if (!gradesTableBody) {
                console.error("gradesTableBody not found. Cannot save grades.");
                return;
            }


            const updatedGrades = [];
            gradesTableBody.querySelectorAll('tr').forEach(row => {
                const gradeId = row.dataset.gradeId;
                const assignmentName = row.dataset.assignmentName;
                const scoreInput = row.querySelector('input[type="number"]');
                const newScore = scoreInput && scoreInput.value.trim() !== '' ? parseFloat(scoreInput.value) : null; // Check input existence
                const maxScore = parseFloat(row.children[1].textContent); // Get max score from table cell

                updatedGrades.push({
                    id: gradeId, // Keep existing ID
                    studentId: currentGradesStudentId,
                    assignmentName: assignmentName,
                    maxScore: maxScore,
                    score: newScore,
                    course: students.find(s => s.id === currentGradesStudentId)?.course // Store course for reporting
                });
            });

            // Update the global grades array
            grades = grades.map(g => {
                const updated = updatedGrades.find(ug => ug.id === g.id);
                return updated || g;
            });

            if (db && userId) {
                // Save each updated grade individually to Firestore (or batch if performance is critical)
                for (const gradeItem of updatedGrades) {
                    await saveData('grades', {
                        studentId: gradeItem.studentId,
                        assignmentName: gradeItem.assignmentName,
                        maxScore: gradeItem.maxScore,
                        score: gradeItem.score,
                        course: gradeItem.course
                    }, gradeItem.id);
                }
            } else {
                saveMockData();
            }

            showMessage('Grades saved successfully!', 'success');
            updateReports();
            renderGradesTable(currentGradesStudentId); // Re-render to show updated statuses
        }

        async function addAssignmentToStudent(event) {
            event.preventDefault();

            // Check existence of all inputs before accessing value
            if (!addAssignmentStudentSelect || !newAssignmentNameInput || !newAssignmentMaxScoreInput || !addAssignmentCourseFilter) {
                showMessage('Error: Required assignment input fields not found.', 'error');
                console.error("Missing assignment input elements.");
                return;
            }

            const studentId = addAssignmentStudentSelect.value;
            const assignmentName = newAssignmentNameInput.value;
            const maxScore = parseFloat(newAssignmentMaxScoreInput.value);
            const course = addAssignmentCourseFilter.value; // Get course from filter or student's course

            if (!studentId || !assignmentName || isNaN(maxScore) || maxScore <= 0) {
                showMessage('Please fill all assignment fields correctly.', 'error');
                return;
            }

            const newAssignment = {
                studentId: studentId,
                assignmentName: assignmentName,
                maxScore: maxScore,
                score: null, // Initially null as it's pending
                course: course // Store course
            };

            if (db && userId) {
                const newId = await saveData('grades', newAssignment);
                if (newId) {
                    grades.push({ id: newId, ...newAssignment });
                }
            } else {
                const newId = generateUniqueId();
                grades.push({ id: newId, ...newAssignment });
                saveMockData();
            }

            showMessage('Assignment added successfully!', 'success');
            if (addAssignmentForm) addAssignmentForm.reset();
            updateReports();
            // If the student whose grades are currently displayed is the one we added an assignment for, re-render their table
            if (currentGradesStudentId === studentId) {
                renderGradesTable(studentId);
            }
        }

        if (gradesCourseFilter) {
            gradesCourseFilter.addEventListener('change', () => {
                const selectedCourse = gradesCourseFilter.value;
                populateStudentDropdowns(selectStudentForGrades, selectedCourse);
                if (gradesTableContainer) gradesTableContainer.style.display = 'none';
                if (selectStudentForGrades) selectStudentForGrades.value = '';
            });
        }

        if (loadGradesBtn) {
            loadGradesBtn.addEventListener('click', () => {
                const selectedStudentId = selectStudentForGrades.value;
                if (selectedStudentId) {
                    renderGradesTable(selectedStudentId);
                } else {
                    showMessage('Please select a student to load grades.', 'error');
                    if (gradesTableContainer) gradesTableContainer.style.display = 'none';
                }
            });
        }
        if (saveGradesBtn) {
            saveGradesBtn.addEventListener('click', saveGrades);
        }

        if (addAssignmentCourseFilter) {
            addAssignmentCourseFilter.addEventListener('change', () => {
                const selectedCourse = addAssignmentCourseFilter.value;
                populateStudentDropdowns(addAssignmentStudentSelect, selectedCourse);
            });
        }

        if (addAssignmentForm) {
            addAssignmentForm.addEventListener('submit', addAssignmentToStudent);
        }

        if (cancelAddAssignmentBtn) {
            cancelAddAssignmentBtn.addEventListener('click', () => {
                if (addAssignmentForm) addAssignmentForm.reset();
                if (addAssignmentCourseFilter) addAssignmentCourseFilter.value = '';
                populateStudentDropdowns(addAssignmentStudentSelect, '');
            });
        }


        // --- Announcements Functions ---
        async function renderAnnouncements() {
            if (!announcementsListDiv) {
                console.error("announcementsListDiv not found. Cannot render announcements.");
                return;
            }
            announcementsListDiv.innerHTML = ''; // Clear existing announcements
            if (announcements.length === 0) {
                announcementsListDiv.innerHTML = '<p>No announcements to display yet.</p>';
                return;
            }
            // Sort by date, newest first
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

            // Check existence of all inputs before accessing value
            if (!announcementTitleInput || !announcementContentInput || !announcementDateInput) {
                showMessage('Error: Required announcement input fields not found.', 'error');
                console.error("Missing announcement input elements.");
                return;
            }

            const newAnnouncement = {
                title: announcementTitleInput.value,
                content: announcementContentInput.value,
                date: announcementDateInput.value
            };

            if (db && userId) {
                const newId = await saveData('announcements', newAnnouncement, null, true); // Public announcement
                if (newId) {
                    announcements.push({ id: newId, ...newAnnouncement });
                }
            } else {
                const newId = generateUniqueId();
                announcements.push({ id: newId, ...newAnnouncement });
                saveMockData();
            }

            showMessage('Announcement posted successfully!', 'success');
            if (addAnnouncementForm) addAnnouncementForm.reset();
            if (announcementDateInput) announcementDateInput.value = getTodayDateString(); // Reset date to today
            renderAnnouncements();
        }

        async function deleteAnnouncement(id) {
            showConfirmDialog('Are you sure you want to delete this announcement?', async () => {
                if (db && userId) {
                    const success = await deleteData('announcements', id, true); // Public announcement
                    if (success) {
                        announcements = announcements.filter(ann => ann.id !== id);
                        renderAnnouncements();
                    }
                } else {
                    announcements = announcements.filter(ann => ann.id !== id);
                    saveMockData();
                    renderAnnouncements();
                    showMessage('Announcement deleted successfully!', 'success');
                }
            });
        }

        if (announcementDateInput) {
            announcementDateInput.value = getTodayDateString(); // Set current date as default for announcements
        }
        if (addAnnouncementForm) {
            addAnnouncementForm.addEventListener('submit', addAnnouncement);
        }
        if (cancelAnnouncementBtn) {
            cancelAnnouncementBtn.addEventListener('click', () => {
                if (addAnnouncementForm) addAnnouncementForm.reset();
                if (announcementDateInput) announcementDateInput.value = getTodayDateString();
            });
        }


        // --- Reports & Analytics Functions ---
        function updateReports() {
            // Student Enrollment Summary (Updates dashboard overview stats)
            if (totalStudentsCountElement) {
                totalStudentsCountElement.textContent = students.length;
            }

            // Calculate Today's Absences
            const todayDate = getTodayDateString();
            let todayAbsences = 0;
            attendanceRecords.forEach(record => {
                if (record.date === todayDate) {
                    for (const studentId in record.records) {
                        if (record.records[studentId].status === 'absent') {
                            todayAbsences++;
                        }
                    }
                }
            });

            if (todayAbsencesCountElement) {
                todayAbsencesCountElement.textContent = todayAbsences;
            }

            // Calculate Pending Assignments
            const pendingAssignmentsCount = grades.filter(g => g.score === null).length;
            if (pendingAssignmentsCountElement) {
                pendingAssignmentsCountElement.textContent = pendingAssignmentsCount;
            }


            // Detailed Reports (remain as they were)
            if (totalStudentsReport) totalStudentsReport.textContent = students.length;
            if (webDevStudents) webDevStudents.textContent = students.filter(s => s.course === 'Web Development Basics').length;
            if (graphicDesignStudents) graphicDesignStudents.textContent = students.filter(s => s.course === 'Graphic Design Intro').length;
            if (digitalMarketingStudents) digitalMarketingStudents.textContent = students.filter(s => s.course === 'Digital Marketing Mastery').length;

            // Attendance Overview
            let totalAttendanceEntries = 0;
            let totalPresent = 0;
            let totalAbsent = 0;
            let totalLate = 0;
            const studentAttendanceCounts = {}; // { studentId: { present: N, absent: N, late: N } }

            attendanceRecords.forEach(record => {
                for (const studentId in record.records) {
                    if (!studentAttendanceCounts[studentId]) {
                        studentAttendanceCounts[studentId] = { present: 0, absent: 0, late: 0 };
                    }
                    const status = record.records[studentId].status;
                    if (status === 'present') {
                        totalPresent++;
                        studentAttendanceCounts[studentId].present++;
                    } else if (status === 'absent') {
                        totalAbsent++;
                        studentAttendanceCounts[studentId].absent++;
                    } else if (status === 'late') {
                        totalLate++;
                        studentAttendanceCounts[studentId].late++;
                    }
                    totalAttendanceEntries++;
                }
            });

            const overallPresentRateVal = totalAttendanceEntries > 0 ? ((totalPresent / totalAttendanceEntries) * 100).toFixed(2) : 0;
            const overallAbsentRateVal = totalAttendanceEntries > 0 ? ((totalAbsent / totalAttendanceEntries) * 100).toFixed(2) : 0;
            if (overallPresentRate) overallPresentRate.textContent = `${overallPresentRateVal}%`;
            if (overallAbsentRate) overallAbsentRate.textContent = `${overallAbsentRateVal}%`;

            if (absenteeStudentsList) {
                absenteeStudentsList.innerHTML = '';
                const absentStudents = [];
                for (const studentId in studentAttendanceCounts) {
                    const student = students.find(s => s.id === studentId);
                    if (student && (studentAttendanceCounts[studentId].absent > 0 || studentAttendanceCounts[studentId].late > 0)) {
                        absentStudents.push({
                            name: student.name,
                            absent: studentAttendanceCounts[studentId].absent,
                            late: studentAttendanceCounts[studentId].late
                        });
                    }
                }
                if (absentStudents.length > 0) {
                    absentStudents.sort((a, b) => (b.absent + b.late) - (a.absent + a.late)); // Sort by total missed
                    absentStudents.forEach(s => {
                        const li = document.createElement('li');
                        li.textContent = `${s.name}: ${s.absent} Absent, ${s.late} Late`;
                        absenteeStudentsList.appendChild(li);
                    });
                } else {
                    absenteeStudentsList.innerHTML = '<li>No significant absences recorded.</li>';
                }
            }


            // Grade Performance Summary
            let totalAssignmentsGradedCount = grades.filter(g => g.score !== null).length;
            if (totalGradedAssignments) totalGradedAssignments.textContent = totalAssignmentsGradedCount;
            if (totalPendingAssignmentsReport) totalPendingAssignmentsReport.textContent = pendingAssignmentsCount; // Use the already calculated value


            const studentAverageGrades = {}; // { studentId: { totalScore: N, totalMaxScore: N, count: N, avg: N } }
            const assignmentAverageScores = {}; // { assignmentName: { totalScore: N, totalMaxScore: N, count: N, avg: N } }

            grades.forEach(grade => {
                if (grade.score !== null && grade.score !== undefined) {
                    // Student average
                    if (!studentAverageGrades[grade.studentId]) {
                        studentAverageGrades[grade.studentId] = { totalScore: 0, totalMaxScore: 0, count: 0, avg: 0 };
                    }
                    studentAverageGrades[grade.studentId].totalScore += grade.score;
                    studentAverageGrades[grade.studentId].totalMaxScore += grade.maxScore;
                    studentAverageGrades[grade.studentId].count++;

                    // Assignment average
                    if (!assignmentAverageScores[grade.assignmentName]) {
                        assignmentAverageScores[grade.assignmentName] = { totalScore: 0, totalMaxScore: 0, count: 0, avg: 0 };
                    }
                    assignmentAverageScores[grade.assignmentName].totalScore += grade.score;
                    assignmentAverageScores[grade.assignmentName].totalMaxScore += grade.maxScore;
                    assignmentAverageScores[grade.assignmentName].count++;
                }
            });

            // Calculate averages
            for (const studentId in studentAverageGrades) {
                const studentData = studentAverageGrades[studentId];
                studentData.avg = (studentData.totalScore / studentData.totalMaxScore) * 100 || 0; // Percentage
            }
            for (const assignmentName in assignmentAverageScores) {
                const assignmentData = assignmentAverageScores[assignmentName];
                assignmentData.avg = (assignmentData.totalScore / assignmentData.totalMaxScore) * 100 || 0; // Percentage
            }

            if (topStudentsList) {
                topStudentsList.innerHTML = '';
                const sortedStudentsByGrade = Object.keys(studentAverageGrades)
                    .map(id => ({
                        id,
                        name: students.find(s => s.id === id)?.name || 'Unknown Student',
                        avg: studentAverageGrades[id].avg
                    }))
                    .sort((a, b) => b.avg - a.avg)
                    .slice(0, 5); // Top 5

                if (sortedStudentsByGrade.length > 0) {
                    sortedStudentsByGrade.forEach(s => {
                        const li = document.createElement('li');
                        li.textContent = `${s.name}: ${s.avg.toFixed(2)}%`;
                        topStudentsList.appendChild(li);
                    });
                } else {
                    topStudentsList.innerHTML = '<li>No graded assignments yet.</li>';
                }
            }


            if (lowPerformingAssignments) {
                lowPerformingAssignments.innerHTML = '';
                const sortedAssignmentsByGrade = Object.keys(assignmentAverageScores)
                    .map(name => ({
                        name,
                        avg: assignmentAverageScores[name].avg
                    }))
                    .sort((a, b) => a.avg - b.avg)
                    .slice(0, 5); // Bottom 5

                if (sortedAssignmentsByGrade.length > 0) {
                    sortedAssignmentsByGrade.forEach(a => {
                        const li = document.createElement('li');
                        li.textContent = `${a.name}: ${a.avg.toFixed(2)}%`;
                        lowPerformingAssignments.appendChild(li);
                    });
                } else {
                    lowPerformingAssignments.innerHTML = '<li>No graded assignments yet.</li>';
                }
            }


            // Course Popularity
            const courseCounts = {};
            students.forEach(student => {
                courseCounts[student.course] = (courseCounts[student.course] || 0) + 1;
            });

            if (coursePopularityList) {
                coursePopularityList.innerHTML = '';
                const sortedCourses = Object.keys(courseCounts).sort((a, b) => courseCounts[b] - courseCounts[a]);
                if (sortedCourses.length > 0) {
                    sortedCourses.forEach(course => {
                        const li = document.createElement('li');
                        li.textContent = `${course}: ${courseCounts[course]} students`;
                        coursePopularityList.appendChild(li);
                    });
                } else {
                    coursePopularityList.innerHTML = '<li>No courses with students yet.</li>';
                }
            }
        }


        // --- Settings Functions ---

        // Function to load settings from localStorage
        function loadSettings() {
            if (themeSelect) {
                const savedTheme = localStorage.getItem('schoolflowTheme');
                if (savedTheme) {
                    themeSelect.value = savedTheme;
                    applyTheme(savedTheme); // Apply theme visually if your CSS supports it
                }
            }
            if (notificationsToggle) {
                const savedNotifications = localStorage.getItem('schoolflowNotifications');
                if (savedNotifications !== null) { // Check for null as it could be "false"
                    notificationsToggle.checked = (savedNotifications === 'true');
                }
            }
        }

        // Function to apply theme (can be expanded to modify CSS classes)
        function applyTheme(theme) {
            // This is a placeholder. In a real app, you'd toggle CSS classes on the body or a root element.
            // Example: document.body.className = `${theme}-theme`;
            console.log(`Applying theme: ${theme}`);
        }

        if (themeSelect) {
            themeSelect.addEventListener('change', () => {
                const selectedTheme = themeSelect.value;
                applyTheme(selectedTheme);
                // The actual saving to localStorage happens when 'Save General Settings' is clicked.
            });
            // Apply initial theme on load
            loadSettings(); // Call it here for initial setup.
        }

        if (notificationsToggle) {
            notificationsToggle.addEventListener('change', () => {
                if (notificationsToggle.checked) {
                    showMessage('Notifications will be enabled on save.', 'info');
                } else {
                    showMessage('Notifications will be disabled on save.', 'info');
                }
                // The actual saving to localStorage happens when 'Save General Settings' is clicked.
            });
        }

        // Event listeners for settings buttons
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                showMessage('Edit Profile clicked! (Functionality to edit user data is not yet implemented)', 'info');
                // Future: Open a modal or navigate to a profile editing section
                // This would involve Firebase Authentication for updating user profiles (email, display name)
                // and potentially saving custom user data to Firestore.
            });
        }

        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                showMessage('Change Password clicked! (Functionality to change password is not yet implemented)', 'info');
                // Future: Open a modal or navigate to a password change section
                // This would involve Firebase Authentication for updating user passwords.
            });
        }

        if (saveGeneralSettingsBtn) {
            saveGeneralSettingsBtn.addEventListener('click', () => {
                // Save theme preference to localStorage
                if (themeSelect) {
                    localStorage.setItem('schoolflowTheme', themeSelect.value);
                }
                // Save notification preference to localStorage
                if (notificationsToggle) {
                    localStorage.setItem('schoolflowNotifications', notificationsToggle.checked);
                }
                showMessage('General Settings saved successfully!', 'success');
            });
        }


        // Initial population of dropdowns and reports when data is loaded
        // Note: loadSettings() is now called after Firebase init to ensure consistency.
        // It's also called if Firebase config is missing to ensure mock data still uses preferences.
    } catch (error) {
        console.error("An uncaught error occurred during dashboard initialization:", error);
        showMessage("An error occurred during dashboard setup. Please check the console for details.", "error", 5000);
    }
});
