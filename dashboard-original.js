// dashboard.js

// Back4App Parse SDK Initialization
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
const B4A_SERVER_URL = 'https://parseapi.back4app.com/';

// Initialize Parse SDK
Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
Parse.serverURL = B4A_SERVER_URL;

// Global data arrays
let students = [];
let attendanceRecords = [];
let teachers = [];
let courses = [];
let exams = [];
let currentSeason = 1;

// Chart instances
let coursePopularityChartInstance = null;
let overallAttendanceChartInstance = null;
let topStudentsChartInstance = null;
let lowPerformingAssignmentsChartInstance = null;

// Global state for editing
window.editingStudentId = null;
window.editingTeacherId = null;
window.editingCourseId = null;

// ======================
// SEASON MANAGEMENT
// ======================

function getCurrentSeason() {
    return currentSeason;
}

function setCurrentSeason(seasonNumber) {
    currentSeason = seasonNumber;
    console.log(`[Season Management] Current season set to: ${currentSeason}`);
    
    // Update UI to reflect new season
    updateSeasonDisplay();
    
    // Refresh dashboard data
    loadAllData();
}

function updateSeasonDisplay() {
    // Update current season display in overview
    const currentSeasonDisplay = document.getElementById('currentSeasonDisplay');
    if (currentSeasonDisplay) {
        currentSeasonDisplay.textContent = getCurrentSeason();
    }
    
    // Update season info in seasons tab
    const currentSeasonNumber = document.getElementById('currentSeasonNumber');
    if (currentSeasonNumber) {
        currentSeasonNumber.textContent = getCurrentSeason();
    }
    
    // Update student and course counts
    const activeStudents = getStudentsBySeason(getCurrentSeason());
    const activeCourses = getCoursesBySeason(getCurrentSeason());
    
    const currentSeasonStudentCount = document.getElementById('currentSeasonStudentCount');
    if (currentSeasonStudentCount) {
        currentSeasonStudentCount.textContent = activeStudents.length;
    }
    
    const currentSeasonCourseCount = document.getElementById('currentSeasonCourseCount');
    if (currentSeasonCourseCount) {
        currentSeasonCourseCount.textContent = activeCourses.length;
    }
}

function getStudentsBySeason(seasonId) {
    return students.filter(student => {
        const studentSeason = student.get('seasonId');
        const isActive = student.get('isActive');
        
        // If student doesn't have seasonId, check if they should be included
        if (studentSeason === undefined || studentSeason === null) {
            return isActive !== false;
        }
        
        return studentSeason === seasonId && (isActive === true || isActive === undefined);
    });
}

function getCoursesBySeason(seasonId) {
    return courses.filter(course => {
        const courseSeason = course.get('seasonId');
        
        // If course doesn't have seasonId, include it
        if (courseSeason === undefined || courseSeason === null) {
            return true;
        }
        
        return courseSeason === seasonId;
    });
}

function getAllSeasons() {
    const seasons = new Set();
    
    // Collect all season IDs from students
    students.forEach(student => {
        const seasonId = student.get('seasonId');
        if (seasonId) {
            seasons.add(seasonId);
        }
    });
    
    // Collect all season IDs from courses
    courses.forEach(course => {
        const seasonId = course.get('seasonId');
        if (seasonId) {
            seasons.add(seasonId);
        }
    });
    
    // Convert to sorted array
    return Array.from(seasons).sort((a, b) => a - b);
}

function renderSeasonsTable() {
    const tableBody = document.querySelector('#seasonsTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const seasons = getAllSeasons();
    
    if (seasons.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.textAlign = 'center';
        td.textContent = 'No season data available.';
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }
    
    seasons.forEach(seasonId => {
        const row = tableBody.insertRow();
        
        const studentsInSeason = getStudentsBySeason(seasonId);
        const coursesInSeason = getCoursesBySeason(seasonId);
        const isCurrentSeason = seasonId === getCurrentSeason();
        const status = isCurrentSeason ? 'Active' : 'Archived';
        
        const makeCell = (value) => {
            const td = document.createElement('td');
            td.textContent = value;
            return td;
        };
        
        row.appendChild(makeCell(`Season ${seasonId}`));
        row.appendChild(makeCell(studentsInSeason.length));
        row.appendChild(makeCell(coursesInSeason.length));
        row.appendChild(makeCell(status));
        
        const actionsTd = document.createElement('td');
        if (isCurrentSeason) {
            const viewBtn = document.createElement('button');
            viewBtn.className = 'button secondary-button';
            viewBtn.textContent = 'View';
            viewBtn.style.marginRight = '10px';
            viewBtn.addEventListener('click', () => {
                // Switch to overview tab to view this season's data
                setCurrentSeason(seasonId);
                switchToTab('overview');
            });
            actionsTd.appendChild(viewBtn);
        } else {
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'button secondary-button';
            restoreBtn.textContent = 'Restore';
            restoreBtn.style.marginRight = '10px';
            restoreBtn.addEventListener('click', () => {
                setCurrentSeason(seasonId);
                showMessage(`Season ${seasonId} is now the current season.`, 'success');
            });
            actionsTd.appendChild(restoreBtn);
        }
        row.appendChild(actionsTd);
    });
}

async function advanceToNextSeason() {
    const nextSeason = getCurrentSeason() + 1;
    
    showConfirmDialog(`Are you sure you want to advance to Season ${nextSeason}? This will archive all current students and courses.`, async () => {
        try {
            // Archive current season students
            const currentStudents = getStudentsBySeason(getCurrentSeason());
            for (const student of currentStudents) {
                try {
                    const studentObj = await new Parse.Query('Student').get(student.id);
                    studentObj.set('isActive', false);
                    await studentObj.save();
                } catch (error) {
                    console.error(`Error archiving student ${student.id}:`, error);
                }
            }
            
            // Set new current season
            setCurrentSeason(nextSeason);
            showMessage(`Advanced to Season ${nextSeason}. Previous season archived.`, 'success');
        } catch (error) {
            console.error('Error advancing season:', error);
            showMessage('Error advancing season. Please try again.', 'error');
        }
    });
}

async function archiveCurrentSeason() {
    showConfirmDialog(`Are you sure you want to archive Season ${getCurrentSeason()}? This will mark all current students as inactive.`, async () => {
        try {
            // Archive current season students
            const currentStudents = getStudentsBySeason(getCurrentSeason());
            let archivedCount = 0;
            
            for (const student of currentStudents) {
                try {
                    const studentObj = await new Parse.Query('Student').get(student.id);
                    if (studentObj.get('isActive') !== false) {
                        studentObj.set('isActive', false);
                        await studentObj.save();
                        archivedCount++;
                    }
                } catch (error) {
                    console.error(`Error archiving student ${student.id}:`, error);
                }
            }
            
            showMessage(`Archived ${archivedCount} students from Season ${getCurrentSeason()}.`, 'success');
            await loadAllData();
        } catch (error) {
            console.error('Error archiving season:', error);
            showMessage('Error archiving season. Please try again.', 'error');
        }
    });
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
// UTILITY FUNCTIONS
// ======================

function showMessage(message, type = "info", duration = 3000) {
    let box = document.getElementById('appMessage');
    if (!box) {
        box = document.createElement('div');
        box.id = 'appMessage';
        box.className = 'app-message';
        document.body.appendChild(box);
    }
    box.classList.remove('app-message--success', 'app-message--error', 'app-message--warning');
    if (type === 'success') box.classList.add('app-message--success');
    if (type === 'error') box.classList.add('app-message--error');
    if (type === 'warning') box.classList.add('app-message--warning');
    box.textContent = message;
    box.classList.add('visible');
    window.clearTimeout(box._hideT);
    box._hideT = window.setTimeout(() => {
        box.classList.remove('visible');
    }, duration);
}

function showConfirmDialog(message, onConfirm) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    const content = document.createElement('div');
    content.className = 'confirm-dialog-content';

    const p = document.createElement('p');
    p.textContent = message || '';

    const buttons = document.createElement('div');
    buttons.className = 'confirm-dialog-buttons';

    const yesBtn = document.createElement('button');
    yesBtn.id = 'confirmYes';
    yesBtn.className = 'button primary-button';
    yesBtn.textContent = 'Yes';

    const noBtn = document.createElement('button');
    noBtn.id = 'confirmNo';
    noBtn.className = 'button cancel-button';
    noBtn.textContent = 'No';

    buttons.appendChild(yesBtn);
    buttons.appendChild(noBtn);

    content.appendChild(p);
    content.appendChild(buttons);

    dialog.appendChild(content);
    document.body.appendChild(dialog);

    yesBtn.addEventListener('click', () => {
        try { if (typeof onConfirm === 'function') onConfirm(); } finally { dialog.remove(); }
    });
    noBtn.addEventListener('click', () => dialog.remove());
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
        
        showMessage(userMessage, 'error');
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
        showMessage(`${className} saved successfully!`, 'success');
        await loadAllData();
    } catch (error) {
        console.error(`Error saving ${className}:`, error);
        showMessage(`Error saving ${className}. Please try again.`, 'error');
    }
}

async function deleteParseData(className, id) {
    try {
        const object = new Parse.Object(className);
        object.set('objectId', id);
        await object.destroy();
        showMessage(`${className} deleted successfully.`, 'success');
        await loadAllData();
    } catch (error) {
        console.error(`Error deleting ${className}:`, error);
        if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
            showMessage(`Error: ${className} not found.`, 'error');
        } else if (error.code === Parse.Error.SESSION_MISSING || error.code === Parse.Error.INVALID_SESSION_TOKEN) {
            showMessage('Error: Your session has expired. Please log in again.', 'error');
            setTimeout(() => window.location.href = 'loginPage.html', 3000);
        } else if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
            showMessage(`Error: ${className} not found or already deleted.`, 'error');
        } else {
            showMessage(`Error deleting ${className}. ${error.message || 'Please try again.'}`, 'error');
        }
    }
}

// ======================
// STUDENT MANAGEMENT
// ======================

function renderStudentTable() {
    const studentTableBody = document.querySelector('#studentTable tbody');
    if (!studentTableBody) return;
    studentTableBody.innerHTML = '';
    if (students.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.style.textAlign = 'center';
        td.textContent = 'No students added yet.';
        tr.appendChild(td);
        studentTableBody.appendChild(tr);
        return;
    }
    students.forEach(student => {
        const row = studentTableBody.insertRow();

        const makeCell = (label, value) => {
            const td = document.createElement('td');
            td.setAttribute('data-label', label);
            td.textContent = value ?? '';
            return td;
        };

        row.appendChild(makeCell('Name', student.get('name')));
        row.appendChild(makeCell('Course', student.get('course')));
        row.appendChild(makeCell('ID', student.get('nationalID')));
        row.appendChild(makeCell('Season', student.get('season')));
        row.appendChild(makeCell('Phone', student.get('phone')));

        const actionsTd = document.createElement('td');
        actionsTd.setAttribute('data-label', 'Actions');
        actionsTd.className = 'actions';
        actionsTd.style.position = 'relative';
        actionsTd.style.zIndex = '1';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.dataset.id = student.id;
        editBtn.textContent = 'Edit';
        editBtn.style.position = 'relative';
        editBtn.style.zIndex = '2';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editStudent(e.currentTarget.dataset.id);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.dataset.id = student.id;
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.position = 'relative';
        deleteBtn.style.zIndex = '2';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteStudent(e.currentTarget.dataset.id);
        });

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);
    });
}

async function addOrUpdateStudent(studentId, studentData) {
    try {
        let student;
        if (studentId) {
            student = await new Parse.Query('Student').get(studentId);
        } else {
            const query = new Parse.Query('Student');
            query.equalTo('nationalID', studentData.nationalID);
            const results = await query.find();
            if (results.length > 0) {
                student = results[0];
            } else {
                student = new Parse.Object('Student');
            }
        }
        student.set('name', studentData.name);
        student.set('course', studentData.course);
        student.set('season', studentData.season);
        student.set('startDate', studentData.startDate);
        student.set('endDate', studentData.endDate);
        student.set('nationalID', studentData.nationalID);
        student.set('phone', studentData.phone);
        student.set('location', studentData.location);
        
        // Add season information
        student.set('seasonId', getCurrentSeason());
        student.set('isActive', true);
        student.set('enrollmentDate', new Date());

        const savedStudent = await student.save();
        console.log('Student saved successfully', savedStudent);
        return { success: true, student: savedStudent };
    } catch (error) {
        console.error('Error adding or updating student:', error);
        return { success: false, message: error.message };
    }
}

function editStudent(id) {
    const studentToEdit = students.find(s => s.id === id);
    if (studentToEdit) {
        document.getElementById('studentName').value = studentToEdit.get('name');
        document.getElementById('studentID').value = studentToEdit.get('nationalID');
        document.getElementById('studentCourse').value = studentToEdit.get('course');
        document.getElementById('studentSeason').value = studentToEdit.get('season');
        document.getElementById('studentPhone').value = studentToEdit.get('phone');
        document.getElementById('studentLocation').value = studentToEdit.get('location');
        document.getElementById('addStudentForm').setAttribute('data-editing-id', studentToEdit.id);
        document.getElementById('student-form-heading').textContent = `Edit Student: ${studentToEdit.get('name')}`;
        document.getElementById('saveStudentBtn').textContent = 'Update Student';
        document.getElementById('cancelStudentBtn').style.display = 'inline-block';
    }
}

async function deleteStudent(id) {
    showConfirmDialog('Are you sure you want to delete this student?', async () => {
        await deleteParseData('Student', id);
    });
}

function resetStudentForm() {
    document.getElementById('addStudentForm').reset();
    document.getElementById('addStudentForm').removeAttribute('data-editing-id');
    document.getElementById('student-form-heading').textContent = 'Add New Student';
    document.getElementById('saveStudentBtn').textContent = 'Save Student';
    document.getElementById('cancelStudentBtn').style.display = 'none';
}

// ======================
// TEACHER MANAGEMENT
// ======================

function renderTeacherTable() {
    const teacherTableBody = document.querySelector('#teacherTable tbody');
    if (!teacherTableBody) return;
    teacherTableBody.innerHTML = '';
    if (teachers.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.textAlign = 'center';
        td.textContent = 'No teachers added yet.';
        tr.appendChild(td);
        teacherTableBody.appendChild(tr);
        return;
    }
    teachers.forEach(teacher => {
        const row = teacherTableBody.insertRow();

        const makeCell = (label, value) => {
            const td = document.createElement('td');
            td.setAttribute('data-label', label);
            td.textContent = value ?? '';
            return td;
        };

        row.appendChild(makeCell('Name', teacher.get('name')));
        row.appendChild(makeCell('Email', teacher.get('email')));
        row.appendChild(makeCell('Phone', teacher.get('phone') || ''));

        const actionsTd = document.createElement('td');
        actionsTd.setAttribute('data-label', 'Actions');
        actionsTd.className = 'actions';
        actionsTd.style.position = 'relative';
        actionsTd.style.zIndex = '1';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.dataset.id = teacher.id;
        editBtn.textContent = 'Edit';
        editBtn.style.position = 'relative';
        editBtn.style.zIndex = '2';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTeacher(e.currentTarget.dataset.id);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.dataset.id = teacher.id;
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.position = 'relative';
        deleteBtn.style.zIndex = '2';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTeacher(e.currentTarget.dataset.id);
        });

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);
    });
}

async function addOrUpdateTeacher(event) {
    event.preventDefault();
    const teacherNameInput = document.getElementById('teacherName');
    const teacherEmailInput = document.getElementById('teacherEmail');
    const teacherPhoneInput = document.getElementById('teacherPhone');

    const teacherData = {
        name: teacherNameInput.value.trim(),
        email: teacherEmailInput.value.trim(),
        phone: teacherPhoneInput.value.trim(),
    };

    if (!teacherData.name || !teacherData.email) {
        showMessage('Teacher name and email are required.', 'error');
        return;
    }

    if (!teacherData.email.includes('@')) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }

    if (window.editingTeacherId) {
        await saveParseData('Teacher', teacherData, window.editingTeacherId);
    } else {
        await saveParseData('Teacher', teacherData);
    }
    resetTeacherForm();
}

function editTeacher(id) {
    const teacherToEdit = teachers.find(t => t.id === id);
    if (teacherToEdit) {
        document.getElementById('teacherName').value = teacherToEdit.get('name');
        document.getElementById('teacherEmail').value = teacherToEdit.get('email');
        document.getElementById('teacherPhone').value = teacherToEdit.get('phone');
        document.getElementById('teacher-form-heading').textContent = `Edit Teacher: ${teacherToEdit.get('name')}`;
        document.getElementById('saveTeacherBtn').textContent = 'Update Teacher';
        document.getElementById('cancelTeacherBtn').style.display = 'inline-block';
        window.editingTeacherId = id;
    }
}

async function deleteTeacher(id) {
    showConfirmDialog('Are you sure you want to delete this teacher? This action cannot be undone.', async () => {
        await deleteParseData('Teacher', id);
    });
}

function resetTeacherForm() {
    document.getElementById('addTeacherForm').reset();
    document.getElementById('teacher-form-heading').textContent = 'Add New Teacher';
    document.getElementById('saveTeacherBtn').textContent = 'Save Teacher';
    document.getElementById('cancelTeacherBtn').style.display = 'none';
    window.editingTeacherId = null;
}

// ======================
// COURSE MANAGEMENT
// ======================

function renderCourseTable() {
    const courseTableBody = document.querySelector('#courseTable tbody');
    if (!courseTableBody) return;
    courseTableBody.innerHTML = '';
    if (courses.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.textAlign = 'center';
        td.textContent = 'No courses added yet.';
        tr.appendChild(td);
        courseTableBody.appendChild(tr);
        return;
    }
    courses.forEach(course => {
        const teacher = teachers.find(t => t.id === course.get('assignedTeacher'));
        const row = courseTableBody.insertRow();

        const makeCell = (label, value) => {
            const td = document.createElement('td');
            td.setAttribute('data-label', label);
            td.textContent = value ?? '';
            return td;
        };

        row.appendChild(makeCell('Course Name', course.get('name')));
        row.appendChild(makeCell('Description', course.get('description')));
        row.appendChild(makeCell('Assigned Teacher', teacher ? teacher.get('name') : 'N/A'));

        const actionsTd = document.createElement('td');
        actionsTd.setAttribute('data-label', 'Actions');
        actionsTd.className = 'actions';
        actionsTd.style.position = 'relative';
        actionsTd.style.zIndex = '1';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.dataset.id = course.id;
        editBtn.textContent = 'Edit';
        editBtn.style.position = 'relative';
        editBtn.style.zIndex = '2';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editCourse(e.currentTarget.dataset.id);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.dataset.id = course.id;
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.position = 'relative';
        deleteBtn.style.zIndex = '2';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCourse(e.currentTarget.dataset.id);
        });

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);
    });
}

function populateTeacherDropdown() {
    const assignedTeacherSelect = document.getElementById('assignedTeacher');
    if (!assignedTeacherSelect) return;
    const currentValue = assignedTeacherSelect.value;
    assignedTeacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = teacher.get('name');
        assignedTeacherSelect.appendChild(option);
    });
    assignedTeacherSelect.value = currentValue;
}

async function addOrUpdateCourse(event) {
    event.preventDefault();
    const courseNameInput = document.getElementById('courseName');
    const courseDescriptionInput = document.getElementById('courseDescription');
    const assignedTeacherSelect = document.getElementById('assignedTeacher');

    const courseData = {
        name: courseNameInput.value.trim(),
        description: courseDescriptionInput.value.trim(),
        assignedTeacher: assignedTeacherSelect.value,
    };

    if (!courseData.name || !courseData.description || !courseData.assignedTeacher) {
        showMessage('All course fields are required.', 'error');
        return;
    }

    try {
        let course;
        const editingId = window.editingCourseId;
        if (editingId) {
            course = await new Parse.Query('Course').get(editingId);
        } else {
            course = new Parse.Object('Course');
        }
        
        course.set('name', courseData.name);
        course.set('description', courseData.description);
        course.set('assignedTeacher', courseData.assignedTeacher);
        
        // Add season information
        course.set('seasonId', getCurrentSeason());
        course.set('startDate', new Date());
        course.set('endDate', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)); // 90 days from now

        await course.save();
        showMessage('Course saved successfully!', 'success');
        await loadAllData();
        resetCourseForm();
    } catch (error) {
        console.error('Error saving course:', error);
        showMessage('Error saving course. Please try again.', 'error');
    }
}

function editCourse(id) {
    const courseToEdit = courses.find(c => c.id === id);
    if (courseToEdit) {
        document.getElementById('courseName').value = courseToEdit.get('name');
        document.getElementById('courseDescription').value = courseToEdit.get('description');
        document.getElementById('assignedTeacher').value = courseToEdit.get('assignedTeacher');
        document.getElementById('course-form-heading').textContent = `Edit Course: ${courseToEdit.get('name')}`;
        document.getElementById('saveCourseBtn').textContent = 'Update Course';
        document.getElementById('cancelCourseBtn').style.display = 'inline-block';
        window.editingCourseId = id;
    }
}

async function deleteCourse(id) {
    showConfirmDialog('Are you sure you want to delete this course? This action cannot be undone.', async () => {
        try {
            const course = new Parse.Object('Course');
            course.set('objectId', id);
            await course.destroy();
            showMessage('Course deleted successfully.', 'success');
            loadAllData();
        } catch (error) {
            console.error('Error deleting course:', error);
            showMessage('Error deleting course. Please try again.', 'error');
        }
    });
}

function resetCourseForm() {
    document.getElementById('addCourseForm').reset();
    document.getElementById('course-form-heading').textContent = 'Add New Course';
    document.getElementById('saveCourseBtn').textContent = 'Save Course';
    document.getElementById('cancelCourseBtn').style.display = 'none';
    window.editingCourseId = null;
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
            showMessage('Your session has expired. Please log in again.', 'warning', 5000);
            setTimeout(() => window.location.href = 'loginPage.html', 5000);
            return false;
        }
    } else {
        console.log("[refreshSessionToken] No current user found. Redirecting to login.");
        showMessage('No valid session found. Please log in again.', 'error');
        setTimeout(() => window.location.href = 'loginPage.html', 2000);
        return false;
    }
}

// ======================
// ATTENDANCE MANAGEMENT
// ======================

function renderAttendanceTable() {
    const tableBody = document.querySelector('#attendanceTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const groupedAttendance = attendanceRecords.reduce((acc, record) => {
        if (!acc[record.get('studentId')]) acc[record.get('studentId')] = [];
        acc[record.get('studentId')].push(record);
        return acc;
    }, {});

    for (const studentId in groupedAttendance) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        groupedAttendance[studentId].forEach(record => {
            const row = tableBody.insertRow();
            const dateVal = record.get('date');
            const displayDate = dateVal ? new Date(dateVal).toLocaleDateString() : '';

            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            row.appendChild(makeCell('Date', displayDate));
            row.appendChild(makeCell('Student', student.get('name')));
            row.appendChild(makeCell('Course', student.get('course')));
            row.appendChild(makeCell('Status', record.get('status')));

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');
            actionsTd.className = 'actions';
            actionsTd.style.position = 'relative';
            actionsTd.style.zIndex = '1';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.dataset.id = record.id;
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.position = 'relative';
            deleteBtn.style.zIndex = '2';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteAttendanceRecord(e.currentTarget.dataset.id);
            });

            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
        });
    }
}

// FIX: Added the missing renderOverallAttendanceChart function
function renderOverallAttendanceChart() {
    const canvas = document.getElementById('overallAttendanceChart');
    if (!canvas) return;

    if (overallAttendanceChartInstance) {
        overallAttendanceChartInstance.destroy();
    }

    // Use only attendance records for active students in current season
    const activeStudents = getStudentsBySeason(getCurrentSeason());
    const activeStudentIds = activeStudents.map(student => student.id);
    
    const filteredAttendanceRecords = attendanceRecords.filter(record => 
        activeStudentIds.includes(record.get('studentId'))
    );

    const presentCount = filteredAttendanceRecords.filter(r => r.get('status') === 'Present').length;
    const absentCount = filteredAttendanceRecords.filter(r => r.get('status') === 'Absent').length;

    overallAttendanceChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent'],
            datasets: [{
                data: [presentCount, absentCount],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',   // Green for Present
                    'rgba(244, 67, 54, 0.8)'    // Red for Absent
                ],
                borderColor: [
                    'rgba(76, 175, 80, 1)',
                    'rgba(244, 67, 54, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: 'Overall Attendance Summary (Current Season)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const total = presentCount + absentCount;
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
}

async function recordAttendance(event) {
    event.preventDefault();
    
    const studentSelect = document.getElementById('attendanceStudent');
    const dateInput = document.getElementById('attendanceDate');
    const statusSelect = document.getElementById('attendanceStatus');
    
    const studentId = studentSelect.value;
    const attendanceDate = dateInput.value;
    const attendanceStatus = statusSelect.value;
    
    // Validation
    if (!studentId) {
        showMessage('Please select a student.', 'error');
        studentSelect.focus();
        return;
    }
    
    if (!attendanceDate) {
        showMessage('Please select a date.', 'error');
        dateInput.focus();
        return;
    }
    
    if (!attendanceStatus) {
        showMessage('Please select an attendance status.', 'error');
        statusSelect.focus();
        return;
    }
    
    // Convert date string to Date object
    const dateObj = new Date(attendanceDate);
    if (isNaN(dateObj.getTime())) {
        showMessage('Please enter a valid date.', 'error');
        dateInput.focus();
        return;
    }
    
    const data = {
        studentId: studentId,
        date: dateObj,
        status: attendanceStatus,
    };
    
    try {
        await saveParseData('Attendance', data);
        // Reset form but keep the date
        studentSelect.value = '';
        statusSelect.value = 'Present';
        showMessage('Attendance record saved successfully!', 'success');
    } catch (error) {
        console.error('Error recording attendance:', error);
        showMessage(`Failed to save attendance record: ${error.message || 'Unknown error'}`, 'error');
    }
}

async function deleteAttendanceRecord(id) {
    showConfirmDialog('Are you sure you want to delete this attendance record?', async () => {
        await deleteParseData('Attendance', id);
    });
}

// ======================
// EXAM MANAGEMENT
// ======================

function renderExamTable() {
    console.log("[renderExamTable] Rendering exam table with data:", exams);
    
    // Update course filter dropdown
    populateExamCourseFilter();
    
    // Reset to first page
    examTableState.currentPage = 1;
    
    // Render filtered table
    renderFilteredExamTable();
}

async function addOrUpdateExam(event) {
    event.preventDefault();
    
    const examStudent = document.getElementById('examStudent').value;
    const examType = document.getElementById('examType').value;
    const examCategory = document.getElementById('examCategory').value;
    const examCourse = document.getElementById('examCourse').value;
    const examScore = parseInt(document.getElementById('examScore').value);
    const examTotalScore = parseInt(document.getElementById('examTotalScore').value);
    const examDate = new Date(document.getElementById('examDate').value);
    
    // Validation
    if (!examStudent || !examType || !examCategory || !examCourse || isNaN(examScore) || isNaN(examTotalScore) || !examDate) {
        showMessage('Please fill all exam fields correctly.', 'error');
        return;
    }
    
    if (examScore < 0) {
        showMessage('Score cannot be negative.', 'error');
        return;
    }
    
    if (examTotalScore <= 0) {
        showMessage('Total score must be greater than zero.', 'error');
        return;
    }
    
    if (examScore > examTotalScore) {
        showMessage('Score cannot be greater than total score.', 'error');
        return;
    }
    
    const data = {
        studentId: examStudent,
        examType: examType,
        examCategory: examCategory,
        course: examCourse,
        score: examScore,
        totalScore: examTotalScore,
        date: examDate,
    };
    
    // Check if we're editing an existing exam
    const editingId = document.getElementById('addExamForm').getAttribute('data-editing-id');
    
    try {
        if (editingId) {
            await saveParseData('Exam', data, editingId);
        } else {
            await saveParseData('Exam', data);
        }
        resetExamForm();
        document.getElementById('addExamForm').reset();
    } catch (error) {
        console.error('Error saving exam:', error);
        showMessage(`Error saving exam: ${error.message || 'Unknown error'}`, 'error');
    }
}

function editExam(id) {
    const examToEdit = exams.find(e => e.id === id);
    if (examToEdit) {
        document.getElementById('examStudent').value = examToEdit.get('studentId');
        document.getElementById('examType').value = examToEdit.get('examType');
        document.getElementById('examCategory').value = examToEdit.get('examCategory');
        document.getElementById('examCourse').value = examToEdit.get('course');
        document.getElementById('examScore').value = examToEdit.get('score');
        document.getElementById('examTotalScore').value = examToEdit.get('totalScore');
        
        const examDate = examToEdit.get('date');
        if (examDate) {
            document.getElementById('examDate').value = examDate.toISOString().split('T')[0];
        }
        
        document.getElementById('addExamForm').setAttribute('data-editing-id', examToEdit.id);
        document.getElementById('exam-form-heading').textContent = `Edit Exam Record`;
        document.getElementById('saveExamBtn').textContent = 'Update Exam Record';
        document.getElementById('cancelExamBtn').style.display = 'inline-block';
        
        // Scroll to the form
        document.getElementById('exams').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteExam(id) {
    showConfirmDialog('Are you sure you want to delete this exam record?', async () => {
        await deleteParseData('Exam', id);
    });
}

function resetExamForm() {
    document.getElementById('addExamForm').reset();
    document.getElementById('addExamForm').removeAttribute('data-editing-id');
    document.getElementById('exam-form-heading').textContent = 'Add New Exam Record';
    document.getElementById('saveExamBtn').textContent = 'Save Exam Record';
    document.getElementById('cancelExamBtn').style.display = 'none';
}

function populateExamStudentDropdown() {
    const examStudentSelect = document.getElementById('examStudent');
    if (!examStudentSelect) return;
    
    const currentValue = examStudentSelect.value;
    examStudentSelect.innerHTML = '<option value="">-- Select a Student --</option>';
    
    const sortedStudents = [...students].sort((a, b) => 
        (a.get('name') || '').localeCompare(b.get('name') || ''));
    
    sortedStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.get('name') || 'Unnamed'} (${student.get('course') || 'No Course'})`;
        examStudentSelect.appendChild(option);
    });
    
    if (currentValue && sortedStudents.some(s => s.id === currentValue)) {
        examStudentSelect.value = currentValue;
    }
}

function populateExamCourseDropdown() {
    const examCourseSelect = document.getElementById('examCourse');
    if (!examCourseSelect) return;
    
    const currentValue = examCourseSelect.value;
    examCourseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
    
    const sortedCourses = [...courses].sort((a, b) => 
        (a.get('name') || '').localeCompare(b.get('name') || ''));
    
    sortedCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.get('name');
        option.textContent = course.get('name');
        examCourseSelect.appendChild(option);
    });
    
    if (currentValue && sortedCourses.some(c => c.get('name') === currentValue)) {
        examCourseSelect.value = currentValue;
    }
}

// ======================
// EXAM TABLE ORGANIZATION
// ======================

// Exam table state management
let examTableState = {
    currentPage: 1,
    pageSize: 25,
    sortBy: 'newest',
    searchQuery: '',
    courseFilter: '',
    examTypeFilter: '',
    filteredExams: []
};

function initializeExamTableControls() {
    // Get control elements
    const searchInput = document.getElementById('examSearch');
    const courseFilter = document.getElementById('examCourseFilter');
    const typeFilter = document.getElementById('examTypeFilter');
    const sortSelect = document.getElementById('examDateSort');
    const clearBtn = document.getElementById('clearExamFilters');
    const pageSizeSelect = document.getElementById('examPageSize');
    const prevBtn = document.getElementById('examPrevPage');
    const nextBtn = document.getElementById('examNextPage');
    
    // Populate course filter dropdown
    populateExamCourseFilter();
    
    // Add event listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleExamSearch, 300));
    }
    
    if (courseFilter) {
        courseFilter.addEventListener('change', handleExamFilterChange);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', handleExamFilterChange);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', handleExamSortChange);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearExamFilters);
    }
    
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', handlePageSizeChange);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigateExamPage(-1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigateExamPage(1));
    }
}

function populateExamCourseFilter() {
    const courseFilter = document.getElementById('examCourseFilter');
    if (!courseFilter) return;
    
    // Save current selection
    const currentValue = courseFilter.value;
    
    // Clear and repopulate
    courseFilter.innerHTML = '<option value="">All Courses</option>';
    
    // Get unique courses from exams
    const examCourses = [...new Set(exams.map(exam => exam.get('course')).filter(Boolean))];
    
    // Add courses from current course list as well
    const allCourses = [...new Set([...examCourses, ...courses.map(c => c.get('name')).filter(Boolean)])];
    
    // Sort and add to dropdown
    allCourses.sort().forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseFilter.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue && allCourses.includes(currentValue)) {
        courseFilter.value = currentValue;
    }
}

function handleExamSearch(event) {
    examTableState.searchQuery = event.target.value.toLowerCase();
    examTableState.currentPage = 1;
    renderFilteredExamTable();
}

function handleExamFilterChange() {
    const courseFilter = document.getElementById('examCourseFilter');
    const typeFilter = document.getElementById('examTypeFilter');
    
    if (courseFilter) {
        examTableState.courseFilter = courseFilter.value;
    }
    
    if (typeFilter) {
        examTableState.examTypeFilter = typeFilter.value;
    }
    
    examTableState.currentPage = 1;
    renderFilteredExamTable();
}

function handleExamSortChange(event) {
    examTableState.sortBy = event.target.value;
    examTableState.currentPage = 1;
    renderFilteredExamTable();
}

function handlePageSizeChange(event) {
    examTableState.pageSize = parseInt(event.target.value);
    examTableState.currentPage = 1;
    renderFilteredExamTable();
}

function clearExamFilters() {
    // Reset all filters
    examTableState.searchQuery = '';
    examTableState.courseFilter = '';
    examTableState.examTypeFilter = '';
    examTableState.sortBy = 'newest';
    examTableState.currentPage = 1;
    
    // Update UI controls
    const searchInput = document.getElementById('examSearch');
    const courseFilter = document.getElementById('examCourseFilter');
    const typeFilter = document.getElementById('examTypeFilter');
    const sortSelect = document.getElementById('examDateSort');
    
    if (searchInput) searchInput.value = '';
    if (courseFilter) courseFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    if (sortSelect) sortSelect.value = 'newest';
    
    renderFilteredExamTable();
}

function navigateExamPage(direction) {
    const newPage = examTableState.currentPage + direction;
    const totalPages = Math.ceil(examTableState.filteredExams.length / examTableState.pageSize);
    
    if (newPage >= 1 && newPage <= totalPages) {
        examTableState.currentPage = newPage;
        renderFilteredExamTable();
    }
}

function filterAndSortExams() {
    let filtered = [...exams];
    
    // Apply search filter
    if (examTableState.searchQuery) {
        filtered = filtered.filter(exam => {
            const student = students.find(s => s.id === exam.get('studentId'));
            const studentName = student ? student.get('name') || '' : '';
            const course = exam.get('course') || '';
            const examType = exam.get('examType') || '';
            const category = exam.get('examCategory') || '';
            
            const searchText = `${studentName} ${course} ${examType} ${category}`.toLowerCase();
            return searchText.includes(examTableState.searchQuery);
        });
    }
    
    // Apply course filter
    if (examTableState.courseFilter) {
        filtered = filtered.filter(exam => exam.get('course') === examTableState.courseFilter);
    }
    
    // Apply exam type filter
    if (examTableState.examTypeFilter) {
        filtered = filtered.filter(exam => exam.get('examType') === examTableState.examTypeFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        switch (examTableState.sortBy) {
            case 'oldest':
                return new Date(a.get('date')) - new Date(b.get('date'));
            case 'highest':
                const scoreA = (a.get('score') / a.get('totalScore')) || 0;
                const scoreB = (b.get('score') / b.get('totalScore')) || 0;
                return scoreB - scoreA;
            case 'lowest':
                const scoreC = (a.get('score') / a.get('totalScore')) || 0;
                const scoreD = (b.get('score') / b.get('totalScore')) || 0;
                return scoreC - scoreD;
            case 'newest':
            default:
                return new Date(b.get('date')) - new Date(a.get('date'));
        }
    });
    
    return filtered;
}

function renderFilteredExamTable() {
    // Filter and sort exams
    examTableState.filteredExams = filterAndSortExams();
    
    // Update record counts
    updateExamRecordCounts();
    
    // Calculate pagination
    const totalPages = Math.ceil(examTableState.filteredExams.length / examTableState.pageSize);
    const startIndex = (examTableState.currentPage - 1) * examTableState.pageSize;
    const endIndex = Math.min(startIndex + examTableState.pageSize, examTableState.filteredExams.length);
    const pageExams = examTableState.filteredExams.slice(startIndex, endIndex);
    
    // Render table
    renderExamTablePage(pageExams);
    
    // Update pagination controls
    updateExamPaginationControls(totalPages);
}

function renderExamTablePage(examsToShow) {
    const examTableBody = document.querySelector('#examTable tbody');
    if (!examTableBody) return;
    
    examTableBody.innerHTML = '';
    
    if (examsToShow.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.style.textAlign = 'center';
        td.textContent = 'No exam records match the current filters.';
        tr.appendChild(td);
        examTableBody.appendChild(tr);
        return;
    }
    
    examsToShow.forEach(exam => {
        if (typeof exam.get !== 'function') {
            console.error("Invalid exam object found:", exam);
            return;
        }
        
        const student = students.find(s => s.id === exam.get('studentId'));
        const examDate = exam.get('date');
        const formattedDate = examDate ? examDate.toISOString().split('T')[0] : '';
        
        const row = document.createElement('tr');
        
        const makeCell = (label, value) => {
            const td = document.createElement('td');
            td.setAttribute('data-label', label);
            td.textContent = value ?? '';
            return td;
        };
        
        // Add visual indicators for scores
        const scoreValue = exam.get('score');
        const totalScore = exam.get('totalScore');
        let scoreText = `${scoreValue} / ${totalScore}`;
        if (totalScore > 0) {
            const percentage = (scoreValue / totalScore) * 100;
            if (percentage >= 80) {
                scoreText += ' 🟢'; // High score
            } else if (percentage >= 60) {
                scoreText += ' 🟡'; // Medium score
            } else {
                scoreText += ' 🔴'; // Low score
            }
        }
        
        row.appendChild(makeCell('Student', student ? student.get('name') : 'N/A'));
        row.appendChild(makeCell('Exam Type', exam.get('examType')));
        row.appendChild(makeCell('Category', exam.get('examCategory')));
        row.appendChild(makeCell('Course', exam.get('course')));
        row.appendChild(makeCell('Score', scoreText));
        row.appendChild(makeCell('Date', formattedDate));
        
        const actionsTd = document.createElement('td');
        actionsTd.setAttribute('data-label', 'Actions');
        actionsTd.className = 'actions';
        actionsTd.style.position = 'relative';
        actionsTd.style.zIndex = '1';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.textContent = 'Edit';
        editBtn.style.position = 'relative';
        editBtn.style.zIndex = '2';
        editBtn.dataset.id = exam.id;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editExam(e.currentTarget.dataset.id);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.position = 'relative';
        deleteBtn.style.zIndex = '2';
        deleteBtn.dataset.id = exam.id;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteExam(e.currentTarget.dataset.id);
        });
        
        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);
        
        examTableBody.appendChild(row);
    });
}

function updateExamRecordCounts() {
    const totalCountElement = document.getElementById('examTotalCount');
    const filteredCountElement = document.getElementById('examFilteredCount');
    
    if (totalCountElement) {
        totalCountElement.textContent = exams.length;
    }
    
    if (filteredCountElement) {
        filteredCountElement.textContent = examTableState.filteredExams.length;
    }
}

function updateExamPaginationControls(totalPages) {
    const prevBtn = document.getElementById('examPrevPage');
    const nextBtn = document.getElementById('examNextPage');
    const pageInfo = document.getElementById('examPageInfo');
    
    if (prevBtn) {
        prevBtn.disabled = examTableState.currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = examTableState.currentPage >= totalPages;
    }
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${examTableState.currentPage} of ${totalPages || 1}`;
    }
}

// Utility function for debouncing search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showExamsTab() {
    populateExamStudentDropdown();
    populateExamCourseDropdown();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('examDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = today;
    }
}

// ======================
// DASHBOARD OVERVIEW
// ======================

function renderCoursePopularityChart() {
    const canvas = document.getElementById('coursePopularityChart');
    if (!canvas) return;
    if (coursePopularityChartInstance) {
        coursePopularityChartInstance.destroy();
    }
    
    // Use only active students from current season
    const activeStudents = getStudentsBySeason(getCurrentSeason());
    const courseCounts = activeStudents.reduce((acc, student) => {
        const courseName = student.get('course');
        if (courseName) {
            acc[courseName] = (acc[courseName] || 0) + 1;
        }
        return acc;
    }, {});
    
    const labels = Object.keys(courseCounts);
    const data = Object.values(courseCounts);
    coursePopularityChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Students',
                data: data,
                backgroundColor: labels.map((_, i) => {
                    const colors = [
                        'rgba(54, 162, 235, 0.7)',  // Blue
                        'rgba(255, 99, 132, 0.7)',  // Red
                        'rgba(255, 206, 86, 0.7)',  // Yellow
                        'rgba(75, 192, 192, 0.7)',  // Teal
                        'rgba(153, 102, 255, 0.7)', // Purple
                        'rgba(255, 159, 64, 0.7)',  // Orange
                        'rgba(199, 199, 199, 0.7)'  // Grey
                    ];
                    return colors[i % colors.length];
                }),
                borderColor: labels.map((_, i) => {
                    const colors = [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)'
                    ];
                    return colors[i % colors.length];
                }),
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Student Enrollment by Course (Current Season)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `Students: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderTopStudentsChart() {
    const canvas = document.getElementById('topStudentsChart');
    if (!canvas) return;

    if (topStudentsChartInstance) {
        topStudentsChartInstance.destroy();
    }

    // Use only active students from current season
    const activeStudents = getStudentsBySeason(getCurrentSeason());
    const studentScores = activeStudents.reduce((acc, student) => {
        acc[student.id] = { name: student.get('name'), totalScore: 0, totalExams: 0 };
        return acc;
    }, {});

    exams.forEach(exam => {
        if (studentScores[exam.get('studentId')]) {
            // Calculate percentage score
            const score = exam.get('score');
            const totalScore = exam.get('totalScore') || 100;
            const percentage = (score / totalScore) * 100;
            
            studentScores[exam.get('studentId')].totalScore += percentage;
            studentScores[exam.get('studentId')].totalExams += 1;
        }
    });

    const topStudents = Object.values(studentScores)
        .map(s => ({ ...s, average: s.totalExams > 0 ? s.totalScore / s.totalExams : 0 }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 5);

    topStudentsChartInstance = new Chart(canvas, {
        type: 'polarArea',
        data: {
            labels: topStudents.map(s => s.name),
            datasets: [{
                label: 'Average Score (%)',
                data: topStudents.map(s => s.average),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: { 
                    display: true, 
                    text: 'Top 5 Students by Average Exam Score (Current Season)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

// ======================
// FILE UPLOAD
// ======================

const expectedHeaders = ['name', 'course', 'season', 'enrollment start date', 'enrollment end date', 'national id', 'phone number', 'place of living'];

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    const data = [];
    const missingKeys = expectedHeaders.filter(eh => !headers.includes(eh));
    if (missingKeys.length > 0) {
        console.warn(`CSV file might be missing expected headers: ${missingKeys.join(', ')}.`);
    }

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        if (values.length === headers.length) {
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index];
            });
            data.push(record);
        }
    }
    return data;
}

function parseJSON(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        if (!Array.isArray(data)) {
            throw new Error("JSON file must contain an array of student objects.");
        }
        if (data.length > 0) {
            const firstRecord = data[0];
            const recordKeys = Object.keys(firstRecord).map(key => key.toLowerCase());
            const missingKeys = expectedHeaders.filter(eh => !recordKeys.includes(eh));
            if (missingKeys.length > 0) {
                console.warn(`JSON data might be missing expected keys: ${missingKeys.join(', ')}.`);
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
    const uploadStatusDiv = document.getElementById('uploadStatus');

    if (uploadStatusDiv) {
        uploadStatusDiv.textContent = `Processing ${totalRecords} records...`;
        uploadStatusDiv.style.color = '#555';
    }

    for (let i = 0; i < totalRecords; i++) {
        const record = records[i];
        const studentData = {
            name: record.name || '',
            course: record.course || '',
            season: parseInt(record.season) || 0,
            startDate: record.startDate || record['enrollment start date'] || '',
            endDate: record.endDate || record['enrollment end date'] || '',
            nationalID: record.nationalID || record['national id'] || '',
            phone: record.phone || record['phone number'] || '',
            location: record.location || record['place of living'] || ''
        };

        studentData.season = parseInt(studentData.season);
        if (isNaN(studentData.season)) studentData.season = 0;

        const result = await addOrUpdateStudent(null, studentData);

        if (result.success) {
            successCount++;
        } else {
            skipCount++;
            console.warn(`Skipped record ${i + 1}: ${result.message || 'Unknown error'}. Data:`, record);
        }
    }

    await loadAllData();
    const message = `Upload complete! Added ${successCount} students, skipped ${skipCount} duplicates/invalid records.`;
    showMessage(message, 'success', 7000);

    if (uploadStatusDiv) {
        uploadStatusDiv.textContent = message;
        uploadStatusDiv.style.color = '#4CAF50';
    }
}

// ======================
// REPORTS & EXPORTS
// ======================

async function refreshDashboard() {
    await loadAllData();
    showMessage('Dashboard refreshed.', 'success');
    // Also check graduation eligibility after refresh if the tab is active
    const graduationSection = document.getElementById('graduation');
    if (graduationSection && window.getComputedStyle(graduationSection).display !== 'none') {
        checkGraduationEligibility();
    }
    
    // Update welcome message in case user info changed
    updateWelcomeMessage();
}

function downloadChart(canvasId, filename = 'chart.png') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        showMessage('Chart not found.', 'error');
        return;
    }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
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

function exportStudentsCSV() {
    // PII-reduced export: omit National ID by default
    const rows = [["Name","Course","Season","Phone","Location"]];
    students.forEach(s => rows.push([
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
    attendanceRecords.forEach(r => {
        const student = students.find(s => s.id === r.get('studentId'));
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
        totalStudents: students.length,
        totalCourses: courses.length,
        totalTeachers: teachers.length,
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'summary.json'; a.click();
    URL.revokeObjectURL(url);
}

function resetPreferences() {
    try {
        localStorage.removeItem('darkMode');
        document.body.classList.remove('dark-mode');
        const toggle = document.getElementById('settingsDarkModeToggle');
        if (toggle) toggle.checked = false;
        showMessage('Preferences reset.', 'success');
    } catch (e) {
        console.error('Error resetting preferences:', e);
        showMessage('Failed to reset preferences.', 'error');
    }
}

// ======================
// UI UTILITIES
// ======================

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
            range.disabled = false;
            syncFromScroll();
        }
    });
    ro.observe(container);

    container.appendChild(wrap);
    syncFromScroll();
}

function updateUI() {
    console.log("[updateUI] Starting UI update...");

    renderStudentTable();
    renderAttendanceTable();
    renderExamTable();
    renderTeacherTable();
    renderCourseTable();

    populateCourseDropdowns();
    populateExamStudentDropdown();
    populateExamCourseDropdown();
    populateTeacherDropdown();

    renderCoursePopularityChart();
    renderOverallAttendanceChart();
    renderTopStudentsChart();
    renderLowPerformingAssignmentsChart();
    updateSummaryMetrics();
    updateWelcomeMessage();
    
    // Update season displays
    updateSeasonDisplay();
    renderSeasonsTable();

    console.log("[updateUI] UI update complete.");

    // Additionally, enable a horizontal slider on the Students form when it overflows
    var studentsFormContainer = document.querySelector('#students .form-container');
    if (studentsFormContainer) addHorizontalSlider(studentsFormContainer);
    
    // Check graduation eligibility if the tab is active
    const graduationSection = document.getElementById('graduation');
    if (graduationSection && window.getComputedStyle(graduationSection).display !== 'none') {
        checkGraduationEligibility();
    }
}

// ======================
// DROPDOWN POPULATION
// ======================

function populateCourseDropdowns() {
    const courseDropdowns = [
        document.getElementById('studentCourse')
    ];
    courseDropdowns.forEach(selectElement => {
        if (!selectElement) return;
        const currentValue = selectElement.value;
        selectElement.innerHTML = '<option value="">-- Select a Course --</option>';
        courses.sort((a, b) => a.get('name').localeCompare(b.get('name'))).forEach(course => {
            const option = document.createElement('option');
            option.value = course.get('name');
            option.textContent = course.get('name');
            selectElement.appendChild(option);
        });
        selectElement.value = currentValue;
    });
}

function populateAttendanceStudentDropdown() {
    const attendanceStudentSelect = document.getElementById('attendanceStudent');
    if (!attendanceStudentSelect) return;
    
    const currentValue = attendanceStudentSelect.value;
    attendanceStudentSelect.innerHTML = '<option value="">-- Select a Student --</option>';
    
    const sortedStudents = [...students].sort((a, b) => 
        (a.get('name') || '').localeCompare(b.get('name') || ''));
    
    sortedStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.get('name') || 'Unnamed'} (${student.get('course') || 'No Course'})`;
        attendanceStudentSelect.appendChild(option);
    });
    
    if (currentValue && sortedStudents.some(s => s.id === currentValue)) {
        attendanceStudentSelect.value = currentValue;
    }
}

function populateStudentDropdowns(selectElement, course = '') {
    if (!selectElement) return;
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">-- Select a Student --</option>';
    const filteredStudents = course ? students.filter(s => s.get('course') === course) : students;
    filteredStudents.sort((a, b) => a.get('name').localeCompare(b.get('name'))).forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.get('name') + (course ? '' : ` (${student.get('course')})`);
        selectElement.appendChild(option);
    });
    selectElement.value = currentValue;
}

function showAttendanceTab() {
    populateAttendanceStudentDropdown();
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = today;
    }
}

// ======================
// CHARTS
// ======================

function renderLowPerformingAssignmentsChart() {
    const canvas = document.getElementById('lowPerformingAssignmentsChart');
    if (!canvas) return;

    if (lowPerformingAssignmentsChartInstance) {
        lowPerformingAssignmentsChartInstance.destroy();
    }

    // Filter exams to only include those from active students in current season
    const activeStudents = getStudentsBySeason(getCurrentSeason());
    const activeStudentIds = activeStudents.map(student => student.id);
    
    const filteredExams = exams.filter(exam => 
        activeStudentIds.includes(exam.get('studentId'))
    );

    const assignmentScores = {};
    filteredExams.forEach(g => {
        const name = `${g.get('examType') || 'Exam'} - ${g.get('examCategory') || 'General'} (${g.get('course') || 'Unknown Course'})`;
        const score = g.get('score');
        const total = g.get('totalScore') || 100;
        if (!name || typeof score !== 'number') return;
        const percent = (score / total) * 100;
        if (!(name in assignmentScores)) {
            assignmentScores[name] = { min: percent, count: 1 };
        } else {
            assignmentScores[name].min = Math.min(assignmentScores[name].min, percent);
            assignmentScores[name].count += 1;
        }
    });

    const entries = Object.entries(assignmentScores)
        .map(([name, { min, count }]) => ({ name, min, count }))
        .sort((a, b) => a.min - b.min)
        .slice(0, 10);

    const labels = entries.map(e => e.name);
    const data = entries.map(e => Math.round(e.min));

    lowPerformingAssignmentsChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Lowest % score',
                data,
                backgroundColor: 'rgba(244, 67, 54, 0.7)',  // Red with transparency
                borderColor: 'rgba(244, 67, 54, 1)',       // Solid red border
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
                hoverBackgroundColor: 'rgba(244, 67, 54, 0.9)',
                hoverBorderColor: 'rgba(244, 67, 54, 1)',
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                title: { 
                    display: true, 
                    text: 'Low Performing Exams (min %) - Current Season',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `Lowest Score: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        precision: 0
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            }
        }
    });
}

function downloadGraduationList() {
    if (!window.eligibleStudentsData || window.eligibleStudentsData.length === 0) {
        showMessage('No eligible students data available for download.', 'warning');
        return;
    }
    
    // Create CSV content
    let csvContent = 'Student Name,Course\n';
    window.eligibleStudentsData.forEach(student => {
        // Sanitize data to prevent CSV injection
        const sanitizedName = String(student.name).replace(/"/g, '""');
        const sanitizedCourse = String(student.course).replace(/"/g, '""');
        csvContent += `"${sanitizedName}","${sanitizedCourse}"\n`;
    });
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eligible_graduation_students_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Graduation list downloaded successfully!', 'success');
}

// ======================
// USER INTERFACE
// ======================

function updateWelcomeMessage() {
    const currentUser = Parse.User.current();
    if (currentUser) {
        const username = currentUser.get('username');
        const welcomeMessageElement = document.getElementById('welcomeMessage');
        if (welcomeMessageElement) {
            welcomeMessageElement.textContent = `Welcome, ${username}`;
        }
    }
}

// ======================
// GRADUATION
// ======================

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
    let totalCount = students.length;
    const eligibleStudents = [];
    
    students.forEach(student => {
        const studentId = student.id;
        const studentName = student.get('name') || 'N/A';
        const studentCourse = student.get('course') || 'N/A';
        
        // Calculate attendance percentage
        const studentAttendanceRecords = attendanceRecords.filter(record => record.get('studentId') === studentId);
        const totalAttendanceDays = studentAttendanceRecords.length;
        const presentDays = studentAttendanceRecords.filter(record => record.get('status') === 'Present').length;
        const attendancePercentage = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;
        
        // Check for required exams
        let hasMidterm = false;
        let hasFinal = false;
        
        exams.forEach(exam => {
            if (exam.get('studentId') === studentId && exam.get('examType')) {
                const examType = exam.get('examType').toLowerCase();
                
                if (!hasMidterm && (examType === 'midterm')) {
                    hasMidterm = true;
                }
                
                if (!hasFinal && (examType === 'endterm')) {
                    hasFinal = true;
                }
            }
        });
        
        // Determine eligibility (50% attendance + both midterm and final exams)
        const isEligible = attendancePercentage >= 50 && hasMidterm && hasFinal;
        
        if (isEligible) {
            eligibleCount++;
            eligibleStudents.push({
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
    
    if (eligibleStudents.length > 0) {
        eligibleStudents.forEach(student => {
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
    
    // Store eligible students data for download
    window.eligibleStudentsData = eligibleStudents;
    
    console.log(`[checkGraduationEligibility] Check complete. ${eligibleCount}/${totalCount} students eligible.`);
    showMessage(`Graduation eligibility check complete. ${eligibleCount} students are eligible.`, 'success');
}

// ======================
// EVENT LISTENERS
// ======================

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

function attachEventListeners() {
    console.log("[attachEventListeners] Attaching all event listeners...");

    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.dashboard-content-section');
    const burger = document.querySelector('.burger');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const addStudentForm = document.getElementById('addStudentForm');
    const cancelStudentBtn = document.getElementById('cancelStudentBtn');
    const bulkUploadForm = document.getElementById('bulkUploadForm');

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
                        // Additionally, enable a horizontal slider on the Students form when it overflows
                        const studentsFormContainer = targetEl.querySelector('.form-container');
                        if (studentsFormContainer) addHorizontalSlider(studentsFormContainer);
                        
                        if (targetId === 'graduation') {
                            checkGraduationEligibility();
                        }
                        
                        if (targetId === 'attendance') {
                            showAttendanceTab();
                        }
                        
                        if (targetId === 'exams') {
                            showExamsTab();
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
            await addOrUpdateStudent(studentId, studentData);
            await loadAllData();
            resetStudentForm();
        });
    }

    if (cancelStudentBtn) {
        cancelStudentBtn.addEventListener('click', resetStudentForm);
    }

    if (bulkUploadForm) {
        bulkUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('bulkUploadFile');
            if (fileInput.files.length === 0) {
                showMessage('Please select a file to upload.', 'error');
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                const fileContent = event.target.result;
                let records;
                try {
                    if (file.name.endsWith('.csv')) {
                        records = parseCSV(fileContent);
                    } else if (file.name.endsWith('.json')) {
                        records = parseJSON(fileContent);
                    } else {
                        showMessage('Invalid file type. Please upload a .csv or .json file.', 'error');
                        return;
                    }
                    if (records.length > 0) {
                        await processStudentRecords(records);
                    } else {
                        showMessage('File is empty or could not be parsed.', 'warning');
                    }
                } catch (error) {
                    showMessage(`Error processing file: ${error.message}`, 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    const addTeacherForm = document.getElementById('addTeacherForm');
    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', addOrUpdateTeacher);
    }
    const cancelTeacherBtn = document.getElementById('cancelTeacherBtn');
    if (cancelTeacherBtn) {
        cancelTeacherBtn.addEventListener('click', resetTeacherForm);
    }

    const addCourseForm = document.getElementById('addCourseForm');
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', addOrUpdateCourse);
    }
    const cancelCourseBtn = document.getElementById('cancelCourseBtn');
    if (cancelCourseBtn) {
        cancelCourseBtn.addEventListener('click', resetCourseForm);
    }

    const addAttendanceForm = document.getElementById('addAttendanceForm');
    if (addAttendanceForm) {
        addAttendanceForm.addEventListener('submit', recordAttendance);
    }

    const addExamForm = document.getElementById('addExamForm');
    if (addExamForm) {
        addExamForm.addEventListener('submit', addOrUpdateExam);
    }
    const cancelExamBtn = document.getElementById('cancelExamBtn');
    if (cancelExamBtn) {
        cancelExamBtn.addEventListener('click', resetExamForm);
    }

    const examStudentSelect = document.getElementById('examStudent');
    if (examStudentSelect) {
        examStudentSelect.addEventListener('focus', populateExamStudentDropdown);
        if (students && students.length > 0) {
            populateExamStudentDropdown();
        }
    }

    const examCourseSelect = document.getElementById('examCourse');
    if (examCourseSelect) {
        examCourseSelect.addEventListener('focus', populateExamCourseDropdown);
        if (courses && courses.length > 0) {
            populateExamCourseDropdown();
        }
    }

    const assignedTeacherSelect = document.getElementById('assignedTeacher');
    if (assignedTeacherSelect) {
        assignedTeacherSelect.addEventListener('focus', populateTeacherDropdown);
    }

    const settingsDarkModeToggle = document.getElementById('settingsDarkModeToggle');
    if (settingsDarkModeToggle) {
        settingsDarkModeToggle.checked = document.body.classList.contains('dark-mode');
        settingsDarkModeToggle.addEventListener('change', (e) => {
            const checked = e.target.checked;
            if (checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            localStorage.setItem('darkMode', checked);
        });
    }

    const bindClick = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', (e) => { e.preventDefault(); handler(); });
    };
    bindClick('refreshDashboardBtn', refreshDashboard);
    bindClick('refreshDashboardReportsBtn', refreshDashboard);
    bindClick('exportStudentsCsvBtn', exportStudentsCSV);
    bindClick('exportAttendanceCsvBtn', exportAttendanceCSV);
    bindClick('exportSummaryJsonBtn', exportSummaryJSON);
    const dla = document.getElementById('downloadLowAssignmentsBtn');
    if (dla) dla.addEventListener('click', (e) => { e.preventDefault(); downloadChart('lowPerformingAssignmentsChart','low-performing-assignments.png'); });
    bindClick('resetPreferencesBtn', resetPreferences);
    
    const checkGraduationBtn = document.getElementById('checkGraduationBtn');
    if (checkGraduationBtn) {
        checkGraduationBtn.addEventListener('click', checkGraduationEligibility);
    }
    
    // Graduation list download button
    const downloadGraduationBtn = document.getElementById('downloadGraduationList');
    if (downloadGraduationBtn) {
        downloadGraduationBtn.addEventListener('click', downloadGraduationList);
    }
    
    // Initialize exam table controls
    initializeExamTableControls();
    
    // Initialize exam table controls
    initializeExamTableControls();
    
    // Initialize exam table controls
    initializeExamTableControls();
    
    // Seasons tab buttons
    const advanceSeasonBtn = document.getElementById('advanceSeasonBtn');
    if (advanceSeasonBtn) {
        advanceSeasonBtn.addEventListener('click', advanceToNextSeason);
    }
    
    const archiveCurrentSeasonBtn = document.getElementById('archiveCurrentSeasonBtn');
    if (archiveCurrentSeasonBtn) {
        archiveCurrentSeasonBtn.addEventListener('click', archiveCurrentSeason);
    }
    
    const exportCurrentSeasonBtn = document.getElementById('exportCurrentSeasonBtn');
    if (exportCurrentSeasonBtn) {
        exportCurrentSeasonBtn.addEventListener('click', () => {
            showMessage('Current season export functionality coming soon.', 'info');
        });
    }
    
    const exportAllSeasonsBtn = document.getElementById('exportAllSeasonsBtn');
    if (exportAllSeasonsBtn) {
        exportAllSeasonsBtn.addEventListener('click', () => {
            showMessage('All seasons export functionality coming soon.', 'info');
        });
    }

    console.log("[attachEventListeners] All event listeners attached.");
}

// ======================
// MAIN APPLICATION LOGIC
// ======================

async function loadAllData() {
    console.log("[loadAllData] Starting to load all dashboard data in parallel...");
    
    // Set current season
    currentSeason = getCurrentSeason();
    console.log(`[loadAllData] Current season: ${currentSeason}`);
    
    // Check if we have a valid session first
    const currentUser = Parse.User.current();
    if (!currentUser) {
        console.log("[loadAllData] No current user, skipping data load");
        showMessage('No valid session. Please log in again.', 'error');
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
        
        students = studentsR;
        attendanceRecords = attendanceR;
        teachers = teachersR;
        courses = coursesR;
        exams = examsR;

        console.log(`[loadAllData] Data loaded. Students: ${students.length}, Teachers: ${teachers.length}, Courses: ${courses.length}, Attendance: ${attendanceRecords.length}, Exams: ${exams.length}`);
        updateUI();
        console.log("[loadAllData] All data loaded and UI updated.");
    } catch (error) {
        console.error("[loadAllData] Critical error during data loading:", error);
        showMessage('Critical error loading dashboard data. Some features may not work correctly.', 'error');
        // Still try to update UI with whatever data we have
        updateUI();
    }
}

function updateSummaryMetrics() {
    const elStudents = document.getElementById('summaryTotalStudents');
    const elCourses = document.getElementById('summaryTotalCourses');
    const elTeachers = document.getElementById('summaryTotalTeachers');
    
    // Use only active students from current season
    const activeStudents = getStudentsBySeason(getCurrentSeason());
    const activeCourses = getCoursesBySeason(getCurrentSeason());
    
    if (elStudents) elStudents.textContent = activeStudents.length;
    if (elCourses) elCourses.textContent = activeCourses.length;
    if (elTeachers) elTeachers.textContent = teachers.length;
}

// ======================
// INITIALIZATION
// ======================

async function initDashboard() {
    const ok = await bootstrapSessionFromLocalStorage();
    if (!ok) {
        showMessage('Authentication required. Redirecting to login...', 'error');
        return;
    }
    
    // Double-check that we have a valid Parse session
    const sessionValid = await refreshSessionToken();
    if (!sessionValid) {
        showMessage('Invalid session. Please log in again.', 'error');
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}