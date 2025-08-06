// dashboard.js

// Back4App Parse SDK Initialization (IMPORTANT: These are now filled with your keys)
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
const B4A_SERVER_URL = 'https://parseapi.back4app.com/'; // Confirmed correct URL

// Global data arrays (will be populated by explicit fetches from Parse)
let students = [];
let attendanceRecords = [];
let grades = [];
let announcements = [];

// Chart instances (to destroy and re-create on updates to prevent memory leaks)
let coursePopularityChartInstance = null;
let overallAttendanceChartInstance = null;
let topStudentsChartInstance = null;
let lowPerformingAssignmentsChartInstance = null;

// Global state for student editing
window.editingStudentId = null;


// --- UTILITY FUNCTIONS ---

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


// --- PARSE DATA OPERATIONS ---

// Helper function to convert Parse Object to plain JavaScript object
function parseObjectToJson(parseObject) {
    const json = parseObject.toJSON();
    json.id = json.objectId; // Map Parse objectId to 'id' for consistency
    delete json.objectId;
    delete json.className;
    return json;
}

// Function to save/update data in Parse
async function saveParseData(className, data, id = null) {
    if (!Parse.User.current()) {
        showMessage('You must be logged in to save data.', 'error');
        return false;
    }
    const ParseObject = Parse.Object.extend(className);
    let obj;

    try {
        if (id) {
            obj = await new Parse.Query(ParseObject).get(id);
        } else {
            obj = new ParseObject();
            // Set ACL for new objects based on class type
            const acl = new Parse.ACL(Parse.User.current());
            if (className === 'Announcement') {
                acl.setPublicReadAccess(true); // Announcements can be publicly read
                acl.setWriteAccess(Parse.User.current(), true); // Only creator can write
            } else {
                // Default for private data: only current user can read/write
                acl.setReadAccess(Parse.User.current(), true);
                acl.setWriteAccess(Parse.User.current(), true);
                acl.setPublicReadAccess(false);
                acl.setPublicWriteAccess(false);
            }
            obj.setACL(acl);

            // Set 'user' pointer for private data
            if (className !== 'Announcement') {
                obj.set("user", Parse.User.current()); // Link the object to the current user
            }
        }

        // Set properties from data (excluding 'id' and 'user' if already set as pointer)
        for (const key in data) {
            if (key !== 'id' && key !== 'user') { // Exclude 'user' from general data copy if it's handled as a pointer
                obj.set(key, data[key]);
            }
        }

        await obj.save();
        showMessage('Data saved successfully!', 'success');
        console.log(`[saveParseData] Data saved for class: ${className}. Reloading all data...`);
        await loadAllData(); // This should trigger the UI refresh
        return obj.id;
    } catch (e) {
        console.error("Error saving document: ", e);
        showMessage('Error saving data: ' + e.message, 'error');
        return false;
    }
}

// Function to delete data from Parse
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
        console.log(`[deleteParseData] Item deleted for class: ${className}. Reloading all data...`);
        await loadAllData(); // Refresh all data after a delete
        return true;
    } catch (e) {
        console.error("Error deleting document: ", e);
        showMessage('Error deleting item: ' + e.message, 'error');
        return false;
    }
}

// Function to load data from Parse (explicit fetch, not LiveQuery)
async function loadParseData(className) {
    if (!Parse.User.current()) {
        console.warn(`User not logged in. Cannot load ${className} data.`);
        return [];
    }

    const ParseObject = Parse.Object.extend(className);
    const query = new Parse.Query(ParseObject);

    if (className !== 'Announcement') { // Private data (Students, Attendance, Grades)
        // Filter by 'user' pointer for private data
        query.equalTo("user", Parse.User.current());
    } else { // Public data (Announcements)
        query.limit(1000); // Set a limit for announcements
        query.descending("createdAt"); // Sort by newest first
    }

    try {
        const results = await query.find();
        console.log(`[loadParseData] Successfully loaded ${results.length} ${className} records.`);
        return results.map(parseObjectToJson);
    } catch (e) {
        console.error(`Error loading ${className} data:`, e);
        showMessage(`Error loading ${className} data: ${e.message}`, 'error', 5000);
        return [];
    }
}

// Profile Management Dialog Functions
function showEditProfileDialog() {
    const currentUser = Parse.User.current();
    if (!currentUser) {
        showMessage('You must be logged in to edit profile.', 'error');
        return;
    }

    const dialogHtml = `
        <div id="editProfileDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); z-index: 10000; min-width: 300px;">
            <h3 style="margin: 0 0 20px 0; color: #333;">Edit Profile</h3>
            <form id="editProfileForm">
                <div style="margin-bottom: 15px;">
                    <label for="editUsername" style="display: block; margin-bottom: 5px; font-weight: bold;">Username:</label>
                    <input type="text" id="editUsername" value="${currentUser.get('username') || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="editEmail" style="display: block; margin-bottom: 5px; font-weight: bold;">Email:</label>
                    <input type="email" id="editEmail" value="${currentUser.get('email') || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label for="editFullName" style="display: block; margin-bottom: 5px; font-weight: bold;">Full Name:</label>
                    <input type="text" id="editFullName" value="${currentUser.get('fullName') || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Update Profile</button>
                    <button type="button" id="cancelEditProfile" style="flex: 1; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Cancel</button>
                </div>
            </form>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;" id="editProfileOverlay"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogHtml);

    const form = document.getElementById('editProfileForm');
    const overlay = document.getElementById('editProfileOverlay');
    const cancelBtn = document.getElementById('cancelEditProfile');

    const closeDialog = () => {
        document.getElementById('editProfileDialog')?.remove();
        document.getElementById('editProfileOverlay')?.remove();
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newData = {
            username: document.getElementById('editUsername').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            fullName: document.getElementById('editFullName').value.trim()
        };
        
        if (await updateUserProfile(newData)) {
            closeDialog();
        }
    });

    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);
}

function showChangePasswordDialog() {
    const dialogHtml = `
        <div id="changePasswordDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); z-index: 10000; min-width: 300px;">
            <h3 style="margin: 0 0 20px 0; color: #333;">Change Password</h3>
            <form id="changePasswordForm">
                <div style="margin-bottom: 15px;">
                    <label for="currentPassword" style="display: block; margin-bottom: 5px; font-weight: bold;">Current Password:</label>
                    <input type="password" id="currentPassword" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="newPassword" style="display: block; margin-bottom: 5px; font-weight: bold;">New Password:</label>
                    <input type="password" id="newPassword" required minlength="6" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label for="confirmPassword" style="display: block; margin-bottom: 5px; font-weight: bold;">Confirm New Password:</label>
                    <input type="password" id="confirmPassword" required minlength="6" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Change Password</button>
                    <button type="button" id="cancelChangePassword" style="flex: 1; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Cancel</button>
                </div>
            </form>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;" id="changePasswordOverlay"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogHtml);

    const form = document.getElementById('changePasswordForm');
    const overlay = document.getElementById('changePasswordOverlay');
    const cancelBtn = document.getElementById('cancelChangePassword');

    const closeDialog = () => {
        document.getElementById('changePasswordDialog')?.remove();
        document.getElementById('changePasswordOverlay')?.remove();
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showMessage('New passwords do not match.', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('New password must be at least 6 characters long.', 'error');
            return;
        }
        
        if (await changeUserPassword(currentPassword, newPassword)) {
            closeDialog();
        }
    });

    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);
}

// --- UI RENDERING & DATA MANAGEMENT FUNCTIONS ---

// Student Management Functions
function renderStudentTable() {
    const studentTableBody = document.querySelector('#studentTable tbody');
    if (!studentTableBody) { console.error("studentTableBody not found."); return; }
    console.log(`[renderStudentTable] Starting render. Current 'students' array length: ${students.length}`);

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
    // Re-attach event listeners to new buttons
    document.querySelectorAll('#studentTable .edit-button').forEach(button => {
        button.onclick = (event) => editStudent(event.target.dataset.id);
    });
    document.querySelectorAll('#studentTable .delete-button').forEach(button => {
        button.onclick = (event) => deleteStudent(event.target.dataset.id);
    });
    console.log("[renderStudentTable] Finished rendering student table.");
}

// Phone Number Validation Function
function isValidKenyanPhoneNumber(phoneNumber) {
    const kenyanPhoneRegex = /^(07|\+2547)\d{8}$/;
    const cleanedPhoneNumber = phoneNumber.replace(/[\s-]/g, '');
    return kenyanPhoneRegex.test(cleanedPhoneNumber);
}

// Add/Update Student (called from form submit or bulk upload)
async function addOrUpdateStudent(event, studentDataFromUpload = null) {
    if (event && event.preventDefault) { event.preventDefault(); }
    let studentData;

    const studentNameInput = document.getElementById('studentName');
    const courseEnrolledInput = document.getElementById('courseEnrolled');
    const seasonNumberInput = document.getElementById('seasonNumber');
    const enrollmentStartDateInput = document.getElementById('enrollmentStartDate');
    const enrollmentEndDateInput = document.getElementById('enrollmentEndDate');
    const nationalIDInput = document.getElementById('nationalID');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const placeOfLivingInput = document.getElementById('placeOfLiving');
    const addStudentForm = document.getElementById('addStudentForm');
    const addStudentFormContainer = document.querySelector('.add-student-form-container');
    const formHeading = addStudentFormContainer ? addStudentFormContainer.querySelector('h3') : null;
    const saveStudentButton = addStudentForm ? addStudentForm.querySelector('.submit-button') : null;


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
        showMessage('Error: Missing or invalid required student data fields. Name, Course, Season, Dates, ID, Phone, Location are required.', 'error', 5000);
        return { success: false, message: 'Invalid data' };
    }

    if (!isValidKenyanPhoneNumber(studentData.phone)) {
        showMessage('Error: Please enter a valid Kenyan phone number (e.g., 07XXXXXXXX or +2547XXXXXXXX).', 'error', 7000);
        return { success: false, message: 'Invalid Kenyan phone number format.' };
    }

    let isDuplicate = false;
    let duplicateMessage = '';
    const studentsToCheck = students.filter(s => s.id !== (window.editingStudentId || null));

    if (studentData.nationalID !== '') {
        isDuplicate = studentsToCheck.some(s => s.nationalID === studentData.nationalID);
        if (isDuplicate) {
            duplicateMessage = `A student with National ID '${studentData.nationalID}' already exists.`;
        }
    }
    if (!isDuplicate && studentData.nationalID === '') { // If National ID is empty, check by name/course/season
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
    if (window.editingStudentId) {
        savedId = await saveParseData('Student', studentData, window.editingStudentId);
    } else {
        savedId = await saveParseData('Student', studentData);
    }

    if (!studentDataFromUpload) {
        if (addStudentForm) addStudentForm.reset();
        if (addStudentFormContainer) addStudentFormContainer.style.display = 'none';
        window.editingStudentId = null;
        if (formHeading) formHeading.textContent = 'Add New Student';
        if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
    }
    return { success: !!savedId, id: savedId };
}

function editStudent(id) {
    const studentNameInput = document.getElementById('studentName');
    const courseEnrolledInput = document.getElementById('courseEnrolled');
    const seasonNumberInput = document.getElementById('seasonNumber');
    const enrollmentStartDateInput = document.getElementById('enrollmentStartDate');
    const enrollmentEndDateInput = document.getElementById('enrollmentEndDate');
    const nationalIDInput = document.getElementById('nationalID');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const placeOfLivingInput = document.getElementById('placeOfLiving');
    const addStudentFormContainer = document.querySelector('.add-student-form-container');
    const formHeading = addStudentFormContainer ? addStudentFormContainer.querySelector('h3') : null;
    const saveStudentButton = document.getElementById('addStudentForm') ? document.getElementById('addStudentForm').querySelector('.submit-button') : null;


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
        window.editingStudentId = id;
        if (saveStudentButton) saveStudentButton.textContent = 'Update Student';
    }
}

async function deleteStudent(id) {
    showConfirmDialog('Are you sure you want to delete this student? This action cannot be undone.', async () => {
        await deleteParseData('Student', id);
    });
}

// Bulk Upload Functions
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
    const fileUploadInput = document.getElementById('fileUploadInput');
    const uploadStatusDiv = document.getElementById('uploadStatus');

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
    const uploadStatusDiv = document.getElementById('uploadStatus');
    if (uploadStatusDiv) {
        uploadStatusDiv.textContent = `Processing ${totalRecords} records...`; uploadStatusDiv.style.color = '#555';
    }
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

        if (!isValidKenyanPhoneNumber(studentData.phone)) {
            console.warn(`Skipping record ${i + 1}: Invalid Kenyan phone number format for ${studentData.name}.`);
            skipCount++;
            continue;
        }

        const result = await addOrUpdateStudent(null, studentData);
        if (result.success) { successCount++; } else { skipCount++; console.warn(`Skipped record ${i + 1}: ${result.message || 'Unknown error'}. Data:`, record); }
    }
    const message = `Upload complete! Added ${successCount} students, skipped ${skipCount} duplicates/invalid records.`;
    showMessage(message, 'success', 7000);
    if (uploadStatusDiv) {
        uploadStatusDiv.textContent = message; uploadStatusDiv.style.color = '#4CAF50';
    }
}

// Course and Student Dropdown Population
function getUniqueCourses() { return [...new Set(students.map(s => s.course))].sort(); }

function populateCourseDropdowns() {
    const courses = getUniqueCourses();
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');
    const gradesCourseFilter = document.getElementById('gradesCourseFilter');
    const addAssignmentCourseFilter = document.getElementById('addAssignmentCourseFilter');

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

// Attendance Management Functions
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function renderAttendanceTable(selectedCourse = '', selectedDate) {
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const currentAttendanceDateDisplay = document.getElementById('currentAttendanceDateDisplay');
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');

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
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');
    const attendanceTableBody = document.getElementById('attendanceTableBody');

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

// Grades Management Functions
let currentGradesStudentId = null; // Re-declare locally for clarity, though it's global too.

async function renderGradesTable(studentId) {
    const gradesTableContainer = document.getElementById('gradesTableContainer');
    const gradesTableBody = document.getElementById('gradesTableBody');
    const currentGradesStudentName = document.getElementById('currentGradesStudentName');
    const saveGradesBtn = document.getElementById('saveGradesBtn');

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
    const gradesTableBody = document.getElementById('gradesTableBody');
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
    const addAssignmentStudentSelect = document.getElementById('addAssignmentStudent');
    const newAssignmentNameInput = document.getElementById('newAssignmentName');
    const newAssignmentMaxScoreInput = document.getElementById('newAssignmentMaxScore');
    const addAssignmentCourseFilter = document.getElementById('addAssignmentCourseFilter');
    const addAssignmentForm = document.getElementById('addAssignmentForm');

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

// Announcements Functions
async function renderAnnouncements() {
    const announcementsListDiv = document.getElementById('announcementsList');
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
    const announcementTitleInput = document.getElementById('announcementTitle');
    const announcementContentInput = document.getElementById('announcementContent');
    const announcementDateInput = document.getElementById('announcementDate');
    const addAnnouncementForm = document.getElementById('addAnnouncementForm');

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


// --- CHART RENDERING FUNCTIONS ---

/**
 * Renders the Course Popularity Bar Chart.
 * Destroys any existing chart instance before creating a new one.
 */
function renderCoursePopularityChart() {
    const ctx = document.getElementById('coursePopularityChart');
    if (!ctx) { console.warn("Course Popularity Chart canvas not found."); return; }

    // Destroy existing chart instance if it exists
    if (coursePopularityChartInstance) {
        coursePopularityChartInstance.destroy();
    }

    const courseCounts = {};
    students.forEach(student => {
        courseCounts[student.course] = (courseCounts[student.course] || 0) + 1;
    });

    const labels = Object.keys(courseCounts).sort();
    const data = labels.map(course => courseCounts[course]);

    coursePopularityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Students',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)', // Red
                    'rgba(54, 162, 235, 0.7)', // Blue
                    'rgba(255, 206, 86, 0.7)', // Yellow
                    'rgba(75, 192, 192, 0.7)', // Green
                    'rgba(153, 102, 255, 0.7)',// Purple
                    'rgba(255, 159, 64, 0.7)'  // Orange
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow canvas to resize freely
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Students'
                    },
                    ticks: {
                        stepSize: 1 // Ensure whole numbers for student count
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
                legend: {
                    display: false // No need for legend with single dataset
                },
                title: {
                    display: true,
                    text: 'Student Enrollment by Course'
                }
            }
        }
    });
    console.log("[Charts] Course Popularity Chart rendered.");
}

/**
 * Renders the Overall Attendance Doughnut Chart.
 * Destroys any existing chart instance before creating a new one.
 */
function renderOverallAttendanceChart() {
    const ctx = document.getElementById('overallAttendanceChart');
    if (!ctx) { console.warn("Overall Attendance Chart canvas not found."); return; }

    if (overallAttendanceChartInstance) {
        overallAttendanceChartInstance.destroy();
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    attendanceRecords.forEach(record => {
        for (const studentId in record.records) {
            const status = record.records[studentId].status;
            if (status === 'present') {
                totalPresent++;
            } else if (status === 'absent') {
                totalAbsent++;
            } else if (status === 'late') {
                totalLate++;
            }
        }
    });

    const data = [totalPresent, totalAbsent, totalLate];
    const labels = ['Present', 'Absent', 'Late'];
    const backgroundColors = [
        'rgba(75, 192, 192, 0.7)', // Green for Present
        'rgba(255, 99, 132, 0.7)', // Red for Absent
        'rgba(255, 159, 64, 0.7)'  // Orange for Late
    ];
    const borderColors = [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 159, 64, 1)'
    ];

    overallAttendanceChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Overall Attendance Breakdown'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
    console.log("[Charts] Overall Attendance Chart rendered.");
}

/**
 * Renders the Top 5 Students by Average Grade Bar Chart.
 * Destroys any existing chart instance before creating a new one.
 */
function renderTopStudentsChart() {
    const ctx = document.getElementById('topStudentsChart');
    if (!ctx) { console.warn("Top Students Chart canvas not found."); return; }

    if (topStudentsChartInstance) {
        topStudentsChartInstance.destroy();
    }

    const studentAverageGrades = {};
    students.forEach(student => {
        const studentGrades = grades.filter(g => g.studentId === student.id && g.score !== null && g.score !== undefined && g.maxScore > 0);
        if (studentGrades.length > 0) {
            const totalScore = studentGrades.reduce((sum, g) => sum + g.score, 0);
            const totalMaxScore = studentGrades.reduce((sum, g) => sum + g.maxScore, 0);
            studentAverageGrades[student.id] = (totalScore / totalMaxScore) * 100;
        }
    });

    const sortedStudentsByGrade = Object.keys(studentAverageGrades)
        .map(id => ({ id, name: students.find(s => s.id === id)?.name || 'Unknown Student', avg: parseFloat(studentAverageGrades[id].toFixed(2)) }))
        .sort((a, b) => b.avg - a.avg) // Sort descending
        .slice(0, 5); // Get top 5

    const labels = sortedStudentsByGrade.map(s => s.name);
    const data = sortedStudentsByGrade.map(s => s.avg);

    topStudentsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Grade (%)',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.7)', // Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Make it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Student Name'
                    }
                },
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Average Grade (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top 5 Students by Average Grade'
                }
            }
        }
    });
    console.log("[Charts] Top Students Chart rendered.");
}

/**
 * Renders the Lowest 5 Performing Assignments Bar Chart.
 * Destroys any existing chart instance before creating a new one.
 */
function renderLowPerformingAssignmentsChart() {
    const ctx = document.getElementById('lowPerformingAssignmentsChart');
    if (!ctx) { console.warn("Lowest Performing Assignments Chart canvas not found."); return; }

    if (lowPerformingAssignmentsChartInstance) {
        lowPerformingAssignmentsChartInstance.destroy();
    }

    const assignmentScores = {}; // Stores { assignmentName: { totalScore: X, totalMaxScore: Y, count: Z } }
    grades.forEach(grade => {
        if (grade.score !== null && grade.score !== undefined && grade.maxScore > 0) {
            if (!assignmentScores[grade.assignmentName]) {
                assignmentScores[grade.assignmentName] = { totalScore: 0, totalMaxScore: 0, count: 0 };
            }
            assignmentScores[grade.assignmentName].totalScore += grade.score;
            assignmentScores[grade.assignmentName].totalMaxScore += grade.maxScore;
            assignmentScores[grade.assignmentName].count++;
        }
    });

    const sortedAssignmentsByAvg = Object.keys(assignmentScores)
        .map(name => {
            const data = assignmentScores[name];
            const avg = (data.totalScore / data.totalMaxScore) * 100;
            return { name, avg: parseFloat(avg.toFixed(2)) };
        })
        .sort((a, b) => a.avg - b.avg) // Sort ascending for lowest performing
        .slice(0, 5); // Get lowest 5

    const labels = sortedAssignmentsByAvg.map(a => a.name);
    const data = sortedAssignmentsByAvg.map(a => a.avg);

    lowPerformingAssignmentsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Score (%)',
                data: data,
                backgroundColor: 'rgba(255, 99, 132, 0.7)', // Red
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Make it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Assignment Name'
                    }
                },
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Average Score (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Lowest 5 Performing Assignments'
                }
            }
        }
    });
    console.log("[Charts] Lowest Performing Assignments Chart rendered.");
}


// Reports & Analytics Functions (Updated to call chart rendering functions)
function updateReports() {
    const totalStudentsCountElement = document.getElementById('totalStudentsCount');
    const todayAbsencesCountElement = document.getElementById('todayAbsencesCount');
    const pendingAssignmentsCountElement = document.getElementById('pendingAssignmentsCount');
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
    // const coursePopularityList = document.getElementById('coursePopularityList'); // This list is now replaced by chart, but keeping for safety if referenced elsewhere.


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

    // --- NEW: Render Charts ---
    renderCoursePopularityChart();
    renderOverallAttendanceChart();
    renderTopStudentsChart();
    renderLowPerformingAssignmentsChart();
}


// Settings Functions
async function loadSettings() {
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const userNameSpan = document.getElementById('userNameDisplay');
    const userEmailSpan = document.getElementById('userEmailDisplay');

    // Always load from localStorage first as fallback
    const savedTheme = localStorage.getItem('schoolflowTheme') || 'light';
    const savedNotifications = localStorage.getItem('schoolflowNotifications');

    if (themeSelect) {
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
    }
    
    if (notificationsToggle) {
        notificationsToggle.checked = savedNotifications !== null ? (savedNotifications === 'true') : true;
    }

    // Load user profile from Parse
    const currentUser = Parse.User.current();
    if (currentUser) {
        try {
            await currentUser.fetch(); // Refresh user data
            if (userNameSpan) userNameSpan.textContent = currentUser.get('username') || 'Admin User';
            if (userEmailSpan) userEmailSpan.textContent = currentUser.get('email') || 'admin@schoolflow.com';
            
            // Load user preferences from Parse (override localStorage if available)
            const userPrefs = currentUser.get('preferences');
            if (userPrefs) {
                if (themeSelect && userPrefs.theme) {
                    themeSelect.value = userPrefs.theme;
                    applyTheme(userPrefs.theme);
                }
                if (notificationsToggle && userPrefs.notifications !== undefined) {
                    notificationsToggle.checked = userPrefs.notifications;
                }
            }
        } catch (error) {
            console.warn('Could not load user settings from Parse, using local settings:', error);
            // We already loaded from localStorage above, so continue with that
        }
    } else {
        // Set default values if no user is logged in
        if (userNameSpan) userNameSpan.textContent = 'Admin User';
        if (userEmailSpan) userEmailSpan.textContent = 'admin@schoolflow.com';
    }
}

function applyTheme(theme) {
    console.log(`Applying theme: ${theme}`);
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        console.log('Dark mode applied');
    } else {
        document.body.classList.remove('dark-mode');
        console.log('Light mode applied');
    }
    
    // Also update the theme select if it exists
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect && themeSelect.value !== theme) {
        themeSelect.value = theme;
    }
}

async function saveUserSettings() {
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const currentUser = Parse.User.current();

    if (!currentUser) {
        showMessage('You must be logged in to save settings.', 'error');
        return false;
    }

    try {
        const preferences = {
            theme: themeSelect ? themeSelect.value : 'light',
            notifications: notificationsToggle ? notificationsToggle.checked : true
        };

        // Save to localStorage first as backup
        localStorage.setItem('schoolflowTheme', preferences.theme);
        localStorage.setItem('schoolflowNotifications', preferences.notifications.toString());

        // Apply theme immediately
        applyTheme(preferences.theme);

        // Try to save to Parse, but don't fail if it doesn't work
        try {
            currentUser.set('preferences', preferences);
            await currentUser.save();
            showMessage('Settings saved successfully!', 'success');
        } catch (parseError) {
            console.warn('Could not save to Parse, but settings applied locally:', parseError);
            showMessage('Settings applied locally. Backend sync may be unavailable.', 'info');
        }

        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('Error saving settings: ' + error.message, 'error');
        return false;
    }
}

async function updateUserProfile(newData) {
    const currentUser = Parse.User.current();
    if (!currentUser) {
        showMessage('You must be logged in to update profile.', 'error');
        return false;
    }

    try {
        if (newData.email && newData.email !== currentUser.get('email')) {
            currentUser.set('email', newData.email);
        }
        if (newData.username && newData.username !== currentUser.get('username')) {
            currentUser.set('username', newData.username);
        }
        if (newData.fullName) {
            currentUser.set('fullName', newData.fullName);
        }

        await currentUser.save();
        showMessage('Profile updated successfully!', 'success');
        await loadSettings(); // Refresh the display
        return true;
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile: ' + error.message, 'error');
        return false;
    }
}

async function changeUserPassword(currentPassword, newPassword) {
    const currentUser = Parse.User.current();
    if (!currentUser) {
        showMessage('You must be logged in to change password.', 'error');
        return false;
    }

    try {
        // Verify current password by attempting to login
        await Parse.User.logIn(currentUser.get('username'), currentPassword);
        
        // Change password
        currentUser.set('password', newPassword);
        await currentUser.save();
        
        showMessage('Password changed successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 101) {
            showMessage('Current password is incorrect.', 'error');
        } else {
            showMessage('Error changing password: ' + error.message, 'error');
        }
        return false;
    }
}

// Function to render all UI components dependent on data
function renderUIComponents() {
    console.log("[renderUIComponents] Starting UI rendering.");
    renderStudentTable();
    populateCourseDropdowns();
    const selectStudentForGrades = document.getElementById('selectStudentForGrades');
    const addAssignmentStudentSelect = document.getElementById('addAssignmentStudent');
    if (selectStudentForGrades) populateStudentDropdowns(selectStudentForGrades);
    if (addAssignmentStudentSelect) populateStudentDropdowns(addAssignmentStudentSelect);
    updateReports(); // This now also renders charts
    // Only re-render current grades if a student is already selected
    if (currentGradesStudentId) {
        renderGradesTable(currentGradesStudentId);
    }
    renderAnnouncements(); // Ensure announcements render initially
    // Also update attendance table for current selected date/course
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');

    const selectedDate = attendanceDateInput?.value;
    const selectedCourse = attendanceCourseFilter?.value;
    if (selectedDate) {
        renderAttendanceTable(selectedCourse, selectedDate);
    }
    console.log("[renderUIComponents] Finished UI rendering.");
}

// Function to load all data and update UI
async function loadAllData() {
    console.log("Loading all data from Parse...");
    students = await loadParseData('Student');
    attendanceRecords = await loadParseData('AttendanceRecord');
    grades = await loadParseData('Grade');
    announcements = await loadParseData('Announcement');

    console.log("[loadAllData] Students data after fetch:", students);
    // Render all UI components after data is loaded
    renderUIComponents();
    console.log("All data loaded and UI updated. Session status after loadAllData:", Parse.User.current() ? 'VALID' : 'INVALID');
    // Check session status right after UI update
    if (!Parse.User.current()) {
        console.warn("Session found to be invalid immediately after loadAllData and UI update. Triggering redirect.");
        window.location.href = 'index.html'; // Redirect to login
    }
}


// --- DOM Content Loaded and Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // document.body.style.opacity = '1'; // Make body visible (This might be handled by CSS)

    // --- DOM Element References (Centralized for clarity) ---
    // Hamburger Menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('darkModeToggle'); // Assuming this element exists in your HTML

    // Sidebar Navigation and Content Section Elements
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const dashboardSections = document.querySelectorAll('.dashboard-content-section');

    // Student Management Section
    const addStudentBtn = document.getElementById('addStudentBtn');
    const addStudentFormContainer = document.querySelector('.add-student-form-container');
    const addStudentForm = document.getElementById('addStudentForm');
    const cancelButton = addStudentForm ? addStudentForm.querySelector('.cancel-button') : null;
    const saveStudentButton = addStudentForm ? addStudentForm.querySelector('.submit-button') : null;
    const formHeading = addStudentFormContainer ? addStudentFormContainer.querySelector('h3') : null;
    // window.editingStudentId is already global

    // Bulk Student Upload
    const fileUploadInput = document.getElementById('fileUploadInput');
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    // const uploadStatusDiv = document.getElementById('uploadStatus'); // Accessed directly in handleFileUpload

    // Attendance Management Section
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');
    const attendanceDateInput = document.getElementById('attendanceDate');
    const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');

    // Grades Management Section
    const gradesCourseFilter = document.getElementById('gradesCourseFilter');
    const selectStudentForGrades = document.getElementById('selectStudentForGrades');
    const loadGradesBtn = document.getElementById('loadGradesBtn');
    const gradesTableContainer = document.getElementById('gradesTableContainer');
    const saveGradesBtn = document.getElementById('saveGradesBtn');
    const addAssignmentForm = document.getElementById('addAssignmentForm');
    const addAssignmentCourseFilter = document.getElementById('addAssignmentCourseFilter');
    const addAssignmentStudentSelect = document.getElementById('addAssignmentStudent');
    const cancelAddAssignmentBtn = document.getElementById('cancelAddAssignmentBtn');

    // Announcements Section
    const addAnnouncementForm = document.getElementById('addAnnouncementForm');
    const announcementDateInput = document.getElementById('announcementDate');
    const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');

    // Quick Action Buttons
    const goToAttendanceBtn = document.getElementById('goToAttendanceBtn');
    const enterGradesBtn = document.getElementById('enterGradesBtn');
    const addStudentQuickBtn = document.getElementById('addStudentQuickBtn');

    // Settings Section
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const editProfileBtn = document.querySelector('.setting-card .setting-content button.primary-button:nth-of-type(1)');
    const changePasswordBtn = document.querySelector('.setting-card .setting-content button.secondary-button');
    const saveGeneralSettingsBtn = document.querySelector('.setting-card button.primary-button:nth-of-type(2)');
    const logoutBtn = document.querySelector('.logout-btn');


    // --- Parse SDK Initialization & Session Check ---
    if (typeof Parse !== 'undefined') {
        Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
        Parse.serverURL = B4A_SERVER_URL;
        console.log("Back4App Parse SDK Initialized in Dashboard.");

        const currentUser = Parse.User.current();
        console.log("Initial currentUser check on DOMContentLoaded:", currentUser ? currentUser.id : "NULL");

        if (currentUser) {
            try {
                console.log("Attempting to validate user session with fetch()...");
                await currentUser.fetch(); // Validate session token with server
                console.log("User session is VALID after fetch():", currentUser.id);
                await loadAllData(); // Load all data for the valid user
                loadSettings(); // Load user settings
                attachEventListeners(); // Attach event listeners ONLY after successful load
            } catch (error) {
                console.groupCollapsed("Session Validation Error Details (Click to expand)");
                console.error("User session invalid or expired caught during fetch():", error);
                console.error("Error Code:", error.code);
                console.error("Error Message:", error.message);
                console.groupEnd();

                showMessage("Your session has expired. Please log in again.", "error", 5000);
                await Parse.User.logOut(); // Clear invalid session
                window.location.href = 'index.html'; // Redirect to login
            }
        } else {
            console.warn("No Parse user found (currentUser is null). Redirecting to login page.");
            window.location.href = 'index.html'; // Redirect if no user token found locally
        }
    } else {
        console.error("Parse SDK not loaded in dashboard. Cannot connect to backend.");
        showMessage("Application error: Backend SDK not loaded. Cannot load data.", "error", 5000);
        return; // Stop execution if Parse SDK is not available
    }
});

// --- Function to Attach All Event Listeners ---
// This function is called ONLY after Parse is initialized and data is loaded.
function attachEventListeners() {
    console.log("[attachEventListeners] Attaching all event listeners...");

    // Hamburger Menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (hamburgerBtn && sidebar && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Dark Mode Toggle Event Listeners
    const darkModeToggle = document.getElementById('darkModeToggle'); // Assuming this element exists in your HTML
    if (darkModeToggle) {
        // Load saved dark mode preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }

        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
        });
    }

    // Sidebar Navigation
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const dashboardSections = document.querySelectorAll('.dashboard-content-section');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetSectionId = this.getAttribute('href').substring(1);

            dashboardSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSectionId) {
                    section.classList.add('active');
                }
            });

            sidebarLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            }
        });
    });

    // Helper function to switch dashboard sections
    function switchDashboardSection(targetSectionId) {
        const sidebarLinksLocal = document.querySelectorAll('.sidebar ul li a'); // Re-query for safety
        const dashboardSectionsLocal = document.querySelectorAll('.dashboard-content-section'); // Re-query for safety

        sidebarLinksLocal.forEach(item => {
            const href = item.getAttribute('href');
            if (href === `#${targetSectionId}`) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        dashboardSectionsLocal.forEach(section => {
            if (section.id === targetSectionId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    // Student Management Event Listeners
    const addStudentBtn = document.getElementById('addStudentBtn');
    const addStudentFormContainer = document.querySelector('.add-student-form-container');
    const addStudentForm = document.getElementById('addStudentForm');
    const cancelButton = addStudentForm ? addStudentForm.querySelector('.cancel-button') : null;
    const saveStudentButton = addStudentForm ? addStudentForm.querySelector('.submit-button') : null;
    const formHeading = addStudentFormContainer ? addStudentFormContainer.querySelector('h3') : null;

    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            if (addStudentFormContainer) addStudentFormContainer.style.display = 'block';
            if (addStudentForm) addStudentForm.reset();
            window.editingStudentId = null;
            if (formHeading) formHeading.textContent = 'Add New Student';
            if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
        });
    }
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (addStudentFormContainer) addStudentFormContainer.style.display = 'none';
            if (addStudentForm) addStudentForm.reset();
            window.editingStudentId = null;
            if (formHeading) formHeading.textContent = 'Add New Student';
            if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
        });
    }
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', addOrUpdateStudent);
    }
    const fileUploadInput = document.getElementById('fileUploadInput');
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const uploadStatusDiv = document.getElementById('uploadStatus'); // Re-query here for safety
    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', () => {
            if (fileUploadInput.files.length > 0) {
                if (uploadFileBtn) uploadFileBtn.style.display = 'inline-block';
                if (uploadStatusDiv) uploadStatusDiv.textContent = `File selected: ${fileUploadInput.files[0].name}`;
            } else {
                if (uploadFileBtn) uploadFileBtn.style.display = 'none';
                if (uploadStatusDiv) uploadStatusDiv.textContent = '';
            }
        });
    }
    if (uploadFileBtn) {
        uploadFileBtn.addEventListener('click', handleFileUpload);
    }

    // Quick Action Buttons Event Listeners
    const goToAttendanceBtn = document.getElementById('goToAttendanceBtn');
    const enterGradesBtn = document.getElementById('enterGradesBtn');
    const addStudentQuickBtn = document.getElementById('addStudentQuickBtn');

    if (goToAttendanceBtn) {
        goToAttendanceBtn.addEventListener('click', () => { switchDashboardSection('attendance-management'); });
    }
    if (enterGradesBtn) {
        enterGradesBtn.addEventListener('click', () => { switchDashboardSection('grades-management'); });
    }
    if (addStudentQuickBtn) {
        addStudentQuickBtn.addEventListener('click', () => {
            switchDashboardSection('student-management');
            if (addStudentFormContainer) addStudentFormContainer.style.display = 'block';
            if (addStudentForm) addStudentForm.reset();
            window.editingStudentId = null;
            if (formHeading) formHeading.textContent = 'Add New Student';
            if (saveStudentButton) saveStudentButton.textContent = 'Save Student';
        });
    }

    // Attendance Management Event Listeners
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceCourseFilter = document.getElementById('attendanceCourseFilter');
    const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');

    if (attendanceDateInput) {
        attendanceDateInput.value = getTodayDateString(); // Set initial date
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

    // Grades Management Event Listeners
    const gradesCourseFilter = document.getElementById('gradesCourseFilter');
    const selectStudentForGrades = document.getElementById('selectStudentForGrades');
    const loadGradesBtn = document.getElementById('loadGradesBtn');
    const gradesTableContainer = document.getElementById('gradesTableContainer');
    const saveGradesBtn = document.getElementById('saveGradesBtn');
    const addAssignmentForm = document.getElementById('addAssignmentForm');
    const addAssignmentCourseFilter = document.getElementById('addAssignmentCourseFilter');
    const addAssignmentStudentSelect = document.getElementById('addAssignmentStudent');
    const cancelAddAssignmentBtn = document.getElementById('cancelAddAssignmentBtn');

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

    // Announcements Event Listeners
    const addAnnouncementForm = document.getElementById('addAnnouncementForm');
    const announcementDateInput = document.getElementById('announcementDate');
    const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');

    if (announcementDateInput) {
        announcementDateInput.value = getTodayDateString();
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

    // Settings Event Listeners - Fixed selectors
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const editProfileBtn = document.querySelector('#settings .setting-card button.primary-button');
    const changePasswordBtn = document.querySelector('#settings .setting-card button.secondary-button');
    const saveGeneralSettingsBtn = document.querySelector('#settings .setting-card:nth-child(2) button.primary-button');
    const logoutBtn = document.querySelector('.logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            if (Parse.User.current()) {
                try {
                    await Parse.User.logOut();
                    console.log('User logged out successfully.');
                    showMessage('Logged out successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } catch (error) {
                    console.error('Error during logout:', error);
                    showMessage('Error during logout: ' + error.message, 'error');
                }
            } else {
                console.warn("Logout button clicked but no current user to log out. Redirecting anyway.");
                window.location.href = 'index.html';
            }
        });
    }

    if (themeSelect) {
        console.log('Theme select found, attaching event listener');
        themeSelect.addEventListener('change', () => {
            const selectedTheme = themeSelect.value;
            console.log('Theme changed to:', selectedTheme);
            applyTheme(selectedTheme);
        });
    } else {
        console.warn('Theme select element not found');
    }

    if (notificationsToggle) {
        console.log('Notifications toggle found, attaching event listener');
        notificationsToggle.addEventListener('change', () => {
            if (notificationsToggle.checked) {
                showMessage('Notifications will be enabled on save.', 'info', 2000);
            } else {
                showMessage('Notifications will be disabled on save.', 'info', 2000);
            }
        });
    } else {
        console.warn('Notifications toggle element not found');
    }

    if (editProfileBtn) {
        console.log('Edit profile button found, attaching event listener');
        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showEditProfileDialog();
        });
    } else {
        console.warn('Edit profile button not found');
    }

    if (changePasswordBtn) {
        console.log('Change password button found, attaching event listener');
        changePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showChangePasswordDialog();
        });
    } else {
        console.warn('Change password button not found');
    }

    if (saveGeneralSettingsBtn) {
        console.log('Save general settings button found, attaching event listener');
        saveGeneralSettingsBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Save settings button clicked');
            await saveUserSettings();
        });
    } else {
        console.warn('Save general settings button not found');
    }

    console.log("[attachEventListeners] All event listeners attached.");
}