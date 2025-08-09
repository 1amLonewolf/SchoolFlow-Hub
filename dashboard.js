// dashboard.js

// Back4App Parse SDK Initialization (IMPORTANT: These are now filled with your keys)
const B4A_APP_ID = '1ViZN5pbU94AJep2LHr2owBflGOGedwvYliU50g0';
const B4A_JS_KEY = '7CE7gnknAyyfSZRTWpqvuDvNhLOMsF0DNYk8qvgn';
const B4A_SERVER_URL = 'https://parseapi.back4app.com/';

// --- Initialize Parse SDK immediately on script load ---
// FIX: Moved initialization to the top to ensure it's always ready.
Parse.initialize(B4A_APP_ID, B4A_JS_KEY);
Parse.serverURL = B4A_SERVER_URL;

// Global data arrays
let students = [];
let attendanceRecords = [];
let grades = [];
let announcements = [];
let teachers = [];
let courses = [];

// Chart instances
let coursePopularityChartInstance = null;
let overallAttendanceChartInstance = null;
let topStudentsChartInstance = null;
let lowPerformingAssignmentsChartInstance = null;

// Global state for editing
window.editingStudentId = null;
window.editingTeacherId = null;
window.editingCourseId = null;

// --- UTILITY FUNCTIONS ---

function showMessage(message, type = "info", duration = 3000) {
    let messageBox = document.getElementById('appMessage');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'appMessage';
        messageBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
            transform: translateY(-20px);
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(messageBox);
    }
    
    messageBox.textContent = message;
    let backgroundColor = '#333';
    if (type === 'success') { backgroundColor = '#4CAF50'; }
    if (type === 'error') { backgroundColor = '#f44336'; }
    if (type === 'warning') { backgroundColor = '#ff9800'; }
    
    messageBox.style.backgroundColor = backgroundColor;
    messageBox.style.opacity = 1;
    messageBox.style.transform = 'translateY(0)';
    
    setTimeout(() => {
        messageBox.style.opacity = 0;
        messageBox.style.transform = 'translateY(-20px)';
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

// --- BACKEND COMMUNICATION FUNCTIONS ---

async function loadParseData(className) {
    try {
        const query = new Parse.Query(className);
        const results = await query.find();
        return results;
    } catch (error) {
        console.error(`Error fetching ${className} data:`, error);
        showMessage(`Error fetching ${className} data.`, 'error');
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
        showMessage(`Error deleting ${className}. Please try again.`, 'error');
    }
}


// --- STUDENT MANAGEMENT FUNCTIONS ---

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

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.dataset.id = student.id;
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', (e) => editStudent(e.currentTarget.dataset.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.dataset.id = student.id;
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => deleteStudent(e.currentTarget.dataset.id));

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


// --- TEACHER MANAGEMENT FUNCTIONS ---

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

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.dataset.id = teacher.id;
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', (e) => editTeacher(e.currentTarget.dataset.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.dataset.id = teacher.id;
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => deleteTeacher(e.currentTarget.dataset.id));

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


// --- COURSE MANAGEMENT FUNCTIONS ---

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

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.dataset.id = course.id;
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', (e) => editCourse(e.currentTarget.dataset.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.dataset.id = course.id;
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => deleteCourse(e.currentTarget.dataset.id));

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

    if (window.editingCourseId) {
        await saveParseData('Course', courseData, window.editingCourseId);
    } else {
        await saveParseData('Course', courseData);
    }
    resetCourseForm();
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


// --- SESSION MANAGEMENT FUNCTIONS ---

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
        setTimeout(() => window.location.href = 'loginPage.html', 2000);
        return false;
    }
}


// --- ATTENDANCE FUNCTIONS ---

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

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.dataset.id = record.id;
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => deleteAttendanceRecord(e.currentTarget.dataset.id));

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

    const presentCount = attendanceRecords.filter(r => r.get('status') === 'Present').length;
    const absentCount = attendanceRecords.filter(r => r.get('status') === 'Absent').length;

    overallAttendanceChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent'],
            datasets: [{
                data: [presentCount, absentCount],
                backgroundColor: ['#4CAF50', '#f44336']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Overall Attendance Summary'
                }
            }
        }
    });
}

async function recordAttendance(event) {
    event.preventDefault();
    const studentId = document.getElementById('attendanceStudent').value;
    const attendanceDate = new Date(document.getElementById('attendanceDate').value);
    const attendanceStatus = document.getElementById('attendanceStatus').value;

    if (!studentId || !attendanceDate || !attendanceStatus) {
        showMessage('Please fill all attendance fields.', 'error');
        return;
    }

    const data = {
        studentId: studentId,
        date: attendanceDate,
        status: attendanceStatus,
    };
    await saveParseData('Attendance', data);
    document.getElementById('addAttendanceForm').reset();
}

async function deleteAttendanceRecord(id) {
    showConfirmDialog('Are you sure you want to delete this attendance record?', async () => {
        await deleteParseData('Attendance', id);
    });
}


// --- GRADES MANAGEMENT FUNCTIONS ---

function renderGradesTable() {
    console.log("[renderGradesTable] Rendering grades table with data:", grades);
    const gradesTableBody = document.querySelector('#gradesTable tbody');
    if (!gradesTableBody) {
        console.error("Grades table body not found.");
        return;
    }
    gradesTableBody.innerHTML = '';

    grades.forEach(grade => {
        if (typeof grade.get !== 'function') {
            console.error("Invalid grade object found:", grade);
            return;
        }

        const student = students.find(s => s.id === grade.get('studentId'));
        const gradeDate = grade.get('date');
        const formattedDate = gradeDate ? gradeDate.toISOString().split('T')[0] : '';

        const row = document.createElement('tr');

        const makeCell = (value) => {
            const td = document.createElement('td');
            td.textContent = value ?? '';
            return td;
        };

        row.appendChild(makeCell(student ? student.get('name') : 'N/A'));
        row.appendChild(makeCell(grade.get('assignmentName')));
        row.appendChild(makeCell(`${grade.get('score')} / ${grade.get('totalScore')}`));
        row.appendChild(makeCell(formattedDate));

        const actionsTd = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.className = 'button small-button';
        editBtn.textContent = 'Edit';
        if (typeof window.editGrade === 'function' || typeof editGrade === 'function') {
            editBtn.addEventListener('click', () => editGrade(grade.id));
        } else {
            editBtn.disabled = true;
            editBtn.title = 'Edit not implemented';
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'button small-button cancel-button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteGrade(grade.id));

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);

        gradesTableBody.appendChild(row);
    });
}

async function saveGrade(event) {
    event.preventDefault();
    const studentId = document.getElementById('addGradeStudent').value;
    const assignmentName = document.getElementById('assignmentName').value;
    const score = parseInt(document.getElementById('assignmentScore').value);
    const totalScore = parseInt(document.getElementById('assignmentTotalScore').value);
    const gradeDate = new Date(document.getElementById('assignmentDate').value);

    if (!studentId || !assignmentName || isNaN(score) || isNaN(totalScore) || !gradeDate) {
        showMessage('Please fill all grade fields correctly.', 'error');
        return;
    }
    const data = {
        studentId: studentId,
        assignmentName: assignmentName,
        score: score,
        totalScore: totalScore,
        date: gradeDate,
    };
    await saveParseData('Grade', data);
    document.getElementById('addGradeForm').reset();
}

async function deleteGrade(id) {
    showConfirmDialog('Are you sure you want to delete this grade?', async () => {
        await deleteParseData('Grade', id);
    });
}


// --- DASHBOARD OVERVIEW FUNCTIONS ---

function renderCoursePopularityChart() {
    const canvas = document.getElementById('coursePopularityChart');
    if (!canvas) return;
    if (coursePopularityChartInstance) {
        coursePopularityChartInstance.destroy();
    }
    const courseCounts = students.reduce((acc, student) => {
        const courseName = student.get('course');
        acc[courseName] = (acc[courseName] || 0) + 1;
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
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Student Enrollment by Course'
                }
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

    const studentScores = students.reduce((acc, student) => {
        acc[student.id] = { name: student.get('name'), totalScore: 0, totalAssignments: 0 };
        return acc;
    }, {});

    grades.forEach(grade => {
        if (studentScores[grade.get('studentId')]) {
            studentScores[grade.get('studentId')].totalScore += grade.get('score');
            studentScores[grade.get('studentId')].totalAssignments += 1;
        }
    });

    const topStudents = Object.values(studentScores)
        .map(s => ({ ...s, average: s.totalAssignments > 0 ? s.totalScore / s.totalAssignments : 0 }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 5);

    topStudentsChartInstance = new Chart(canvas, {
        type: 'polarArea',
        data: {
            labels: topStudents.map(s => s.name),
            datasets: [{
                data: topStudents.map(s => s.average),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                title: { display: true, text: 'Top 5 Students by Average Grade' }
            }
        }
    });
}


// --- FILE UPLOAD FUNCTIONS ---

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


// --- MAIN APPLICATION LOGIC ---

async function loadAllData() {
    console.log("[loadAllData] Starting to load all dashboard data...");
    students = await loadParseData('Student');
    attendanceRecords = await loadParseData('Attendance');
    grades = await loadParseData('Grade');
    announcements = await loadParseData('Announcement');
    teachers = await loadParseData('Teacher');
    courses = await loadParseData('Course');

    console.log(`[loadAllData] Data loaded. Students: ${students.length}, Teachers: ${teachers.length}, Courses: ${courses.length}`);
    updateUI();
    console.log("[loadAllData] All data loaded and UI updated.");
}

// Quick actions helpers used by buttons
async function refreshDashboard() {
    await loadAllData();
    showMessage('Dashboard refreshed.', 'success');
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
    const esc = (v) => (
        v === null || v === undefined ? '' : String(v).replace(/"/g, '""')
    );
    return rows.map(r => r.map(v => `"${esc(v)}"`).join(',')).join('\n');
}

function exportStudentsCSV() {
    const rows = [["Name","Course","National ID","Season","Phone","Location"]];
    students.forEach(s => rows.push([
        s.get('name') || '',
        s.get('course') || '',
        s.get('nationalID') || '',
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

function exportGradesCSV() {
    const rows = [["Student","Assignment","Score","Total","Date"]];
    grades.forEach(g => {
        const student = students.find(s => s.id === g.get('studentId'));
        const d = g.get('date');
        rows.push([
            student ? student.get('name') : '',
            g.get('assignmentName') || '',
            g.get('score') || '',
            g.get('totalScore') || '',
            d ? new Date(d).toISOString().split('T')[0] : ''
        ]);
    });
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'grades.csv'; a.click();
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

function addHorizontalSlider(container) {
    if (!container || container.querySelector(':scope > .h-scroll-slider')) return;
    const needsSlider = (container.scrollWidth - container.clientWidth) > 16;
    if (!needsSlider) return;
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
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll <= 0) { wrap.remove(); return; }
        const pos = container.scrollLeft / maxScroll;
        range.value = Math.round(pos * 1000);
    };
    const syncFromRange = () => {
        const maxScroll = container.scrollWidth - container.clientWidth;
        const pos = parseInt(range.value, 10) / 1000;
        container.scrollLeft = Math.round(maxScroll * pos);
    };

    container.addEventListener('scroll', syncFromScroll);
    range.addEventListener('input', syncFromRange);

    // Recompute on resize or content changes
    const ro = new ResizeObserver(() => {
        if (container.scrollWidth <= container.clientWidth + 4) {
            if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        } else {
            if (!wrap.parentNode) container.appendChild(wrap);
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
    renderGradesTable();
    renderTeacherTable();
    renderCourseTable();

    populateCourseDropdowns();
    populateStudentDropdowns(document.getElementById('addGradeStudent'));
    populateTeacherDropdown();

    renderCoursePopularityChart();
    renderOverallAttendanceChart();
    renderTopStudentsChart();
    renderLowPerformingAssignmentsChart();
    updateSummaryMetrics();

    console.log("[updateUI] UI update complete.");

    // Attach sliders for horizontally overflowed containers
    // Only attach sliders to table containers to avoid overlaying form buttons
    document.querySelectorAll('.table-container').forEach(addHorizontalSlider);
}


// --- EVENT LISTENERS AND INITIALIZATION ---

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
                }
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.style.display = 'none';
                }
            });
        }
    });

    // Dedicated logout handler: clears Parse session then redirects
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await Parse.User.logOut();
            } catch (err) {
                console.error('Error logging out:', err);
            }
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

    const addGradeForm = document.getElementById('addGradeForm');
    if (addGradeForm) {
        addGradeForm.addEventListener('submit', saveGrade);
    }
    
    // FIX: Replaced the missing populate functions.
    const courseSelect = document.getElementById('studentCourse');
    if (courseSelect) {
        courseSelect.addEventListener('focus', populateCourseDropdowns);
    }

    const attendanceStudentSelect = document.getElementById('attendanceStudent');
    if (attendanceStudentSelect) {
        attendanceStudentSelect.addEventListener('focus', () => populateStudentDropdowns(attendanceStudentSelect));
    }

    const gradesStudentSelect = document.getElementById('addGradeStudent');
    if (gradesStudentSelect) {
        gradesStudentSelect.addEventListener('focus', () => populateStudentDropdowns(gradesStudentSelect));
    }

    const assignedTeacherSelect = document.getElementById('assignedTeacher');
    if (assignedTeacherSelect) {
        assignedTeacherSelect.addEventListener('focus', populateTeacherDropdown);
    }

    // Settings tab handlers
    const settingsDarkModeToggle = document.getElementById('settingsDarkModeToggle');
    if (settingsDarkModeToggle) {
        // Initialize based on current state
        settingsDarkModeToggle.checked = document.body.classList.contains('dark-mode');
        settingsDarkModeToggle.addEventListener('change', (e) => {
            const checked = e.target.checked;
            if (checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            // Persist preference alongside login page toggle
            localStorage.setItem('darkMode', checked);
        });
    }

    console.log("[attachEventListeners] All event listeners attached.");
}

async function initDashboard() {
    const isSessionValid = await refreshSessionToken();
    if (!isSessionValid) return;
    attachEventListeners();
    loadAllData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// FIX: Added missing populate dropdown functions
function populateCourseDropdowns() {
    const courseDropdowns = [
        document.getElementById('studentCourse'),
        document.getElementById('gradesCourseFilter')
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

// FIX: Added a function that was referenced but not defined.
function renderLowPerformingAssignmentsChart() {
    const canvas = document.getElementById('lowPerformingAssignmentsChart');
    if (!canvas) return;

    if (lowPerformingAssignmentsChartInstance) {
        lowPerformingAssignmentsChartInstance.destroy();
    }

    // Aggregate minimum scores per assignment name
    const assignmentScores = {};
    grades.forEach(g => {
        const name = g.get('assignmentName');
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
        .slice(0, 10); // show worst 10

    const labels = entries.map(e => e.name);
    const data = entries.map(e => Math.round(e.min));

    lowPerformingAssignmentsChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Lowest % score',
                data,
                backgroundColor: 'rgba(244, 67, 54, 0.6)',
                borderColor: 'rgba(244, 67, 54, 1)',
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
            plugins: { title: { display: true, text: 'Low Performing Assignments (min %)' } }
        }
    });
}

function updateSummaryMetrics() {
    const elStudents = document.getElementById('summaryTotalStudents');
    const elCourses = document.getElementById('summaryTotalCourses');
    const elTeachers = document.getElementById('summaryTotalTeachers');
    if (elStudents) elStudents.textContent = students.length;
    if (elCourses) elCourses.textContent = courses.length;
    if (elTeachers) elTeachers.textContent = teachers.length;
}