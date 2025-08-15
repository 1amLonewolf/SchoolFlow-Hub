// js/studentManager.js
// StudentManager class handles all student-related functionality in the dashboard

class StudentManager {
    /**
     * Constructor initializes the student manager with empty students array
     * and no student currently being edited
     */
    constructor() {
        this.students = [];
        this.editingStudentId = null;
    }

    /**
     * Set the students array
     * @param {Array} students - Array of student objects from Parse
     */
    setStudents(students) {
        this.students = students;
    }

    /**
     * Get the current students array
     * @returns {Array} Array of student objects
     */
    getStudents() {
        return this.students;
    }

    /**
     * Filter students by season ID
     * @param {number} seasonId - The season ID to filter by
     * @returns {Array} Array of students in the specified season
     */
    getStudentsBySeason(seasonId) {
        return this.students.filter(student => {
            const studentSeason = student.get('seasonId');
            const isActive = student.get('isActive');
            
            // If student doesn't have seasonId, check if they should be included
            if (studentSeason === undefined || studentSeason === null) {
                return isActive !== false;
            }
            
            return studentSeason === seasonId && (isActive === true || isActive === undefined);
        });
    }

    /**
     * Render the student table in the UI
     * Populates the student table with current student data
     */
    renderStudentTable() {
        const studentTableBody = document.querySelector('#studentTable tbody');
        if (!studentTableBody) return;
        studentTableBody.innerHTML = '';
        if (this.students.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.style.textAlign = 'center';
            td.textContent = 'No students added yet.';
            tr.appendChild(td);
            studentTableBody.appendChild(tr);
            return;
        }
        this.students.forEach(student => {
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
                this.editStudent(e.currentTarget.dataset.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.dataset.id = student.id;
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.position = 'relative';
            deleteBtn.style.zIndex = '2';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteStudent(e.currentTarget.dataset.id);
            });

            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
        });
    }

    /**
     * Add or update a student in the database
     * @param {string|null} studentId - ID of student to update, or null to create new
     * @param {Object} studentData - Student data to save
     * @returns {Object} Result object with success status and student data
     */
    async addOrUpdateStudent(studentId, studentData) {
        try {
            let student;
            if (studentId) {
                // Updating existing student
                student = await new Parse.Query('Student').get(studentId);
            } else {
                // Creating new student - check if one with same national ID exists
                const query = new Parse.Query('Student');
                query.equalTo('nationalID', studentData.nationalID);
                const results = await query.find();
                if (results.length > 0) {
                    student = results[0];
                } else {
                    student = new Parse.Object('Student');
                }
            }
            
            // Set student properties
            student.set('name', studentData.name);
            student.set('course', studentData.course);
            student.set('season', studentData.season);
            student.set('startDate', studentData.startDate);
            student.set('endDate', studentData.endDate);
            student.set('nationalID', studentData.nationalID);
            student.set('phone', studentData.phone);
            student.set('location', studentData.location);
            
            // Add season information
            student.set('seasonId', window.currentSeason);
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

    /**
     * Edit a student by populating the form with student data
     * @param {string} id - ID of student to edit
     */
    editStudent(id) {
        const studentToEdit = this.students.find(s => s.id === id);
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

    /**
     * Delete a student after confirmation
     * @param {string} id - ID of student to delete
     */
    async deleteStudent(id) {
        window.showConfirmDialog('Are you sure you want to delete this student?', async () => {
            await window.deleteParseData('Student', id);
        });
    }

    /**
     * Reset the student form to its initial state
     * Clears all form fields and resets button labels
     */
    resetStudentForm() {
        document.getElementById('addStudentForm').reset();
        document.getElementById('addStudentForm').removeAttribute('data-editing-id');
        document.getElementById('student-form-heading').textContent = 'Add New Student';
        document.getElementById('saveStudentBtn').textContent = 'Save Student';
        document.getElementById('cancelStudentBtn').style.display = 'none';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
} else {
    window.StudentManager = StudentManager;
}