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
        console.log(`[StudentManager] setStudents called with ${students.length} students`);
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
        console.log("[StudentManager] renderStudentTable called");
        const studentTableBody = document.querySelector('#studentTable tbody');
        if (!studentTableBody) {
            console.log("[StudentManager] Student table body not found");
            return;
        }
        studentTableBody.innerHTML = '';
        console.log(`[StudentManager] Rendering ${this.students.length} students`);
        if (this.students.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.style.textAlign = 'center';
            td.textContent = 'No students added yet.';
            tr.appendChild(td);
            studentTableBody.appendChild(tr);
            return;
        }
        this.students.forEach(student => {
            // Check if student is defined
            if (!student) {
                console.error("[StudentManager] Encountered undefined student object");
                return;
            }
            
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
            row.appendChild(makeCell('Location', student.get('location')));

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');
            actionsTd.className = 'actions';
            actionsTd.style.position = 'relative';
            actionsTd.style.zIndex = '1';

            // Check if student.id is defined before using it
            if (!student.id) {
                console.error("[StudentManager] Student object missing id:", student);
                return;
            }

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
            console.log("[StudentManager] addOrUpdateStudent called with:", { studentId, studentData });
            
            let student;
            if (studentId) {
                // Updating existing student
                console.log("[StudentManager] Updating existing student with ID:", studentId);
                try {
                    student = await new Parse.Query('Student').get(studentId);
                    console.log("[StudentManager] Retrieved student object for update:", student);
                    if (student && typeof student === 'object') {
                        console.log("[StudentManager] Student object type:", typeof student);
                        console.log("[StudentManager] Student object constructor:", student.constructor.name);
                        if (student.className) {
                            console.log("[StudentManager] Student object className:", student.className);
                        } else {
                            console.warn("[StudentManager] Student object missing className property");
                        }
                    } else {
                        console.error("[StudentManager] Retrieved student object is invalid:", student);
                        throw new Error('Invalid student object retrieved from database');
                    }
                } catch (queryError) {
                    console.error("[StudentManager] Error querying student:", queryError);
                    // Fallback: Create a new object and set its ID
                    student = new Parse.Object('Student');
                    student.id = studentId;
                    console.log("[StudentManager] Created fallback student object with ID:", studentId);
                }
            } else {
                // Creating new student - check if one with same national ID exists
                console.log("[StudentManager] Creating new student, checking for existing with national ID:", studentData.nationalID);
                const query = new Parse.Query('Student');
                query.equalTo('nationalID', studentData.nationalID);
                const results = await query.find();
                console.log(`[StudentManager] Found ${results.length} existing students with this national ID`);
                if (results.length > 0) {
                    console.log("[StudentManager] Found existing student with same national ID, updating that record");
                    student = results[0];
                    console.log("[StudentManager] Using existing student object:", student);
                    if (student && typeof student === 'object') {
                        console.log("[StudentManager] Existing student object type:", typeof student);
                        console.log("[StudentManager] Existing student object constructor:", student.constructor.name);
                        if (student.className) {
                            console.log("[StudentManager] Existing student object className:", student.className);
                        } else {
                            console.warn("[StudentManager] Existing student object missing className property");
                        }
                    } else {
                        console.error("[StudentManager] Existing student object is invalid:", student);
                        throw new Error('Invalid existing student object');
                    }
                } else {
                    console.log("[StudentManager] No existing student with this national ID, creating new record");
                    // Create a new Parse object directly
                    student = new Parse.Object('Student');
                    console.log("[StudentManager] Created new student object:", student);
                    if (student && typeof student === 'object') {
                        console.log("[StudentManager] New student object type:", typeof student);
                        console.log("[StudentManager] New student object constructor:", student.constructor.name);
                        if (student.className) {
                            console.log("[StudentManager] New student object className:", student.className);
                        } else {
                            console.warn("[StudentManager] New student object missing className property");
                        }
                    } else {
                        console.error("[StudentManager] New student object is invalid:", student);
                        throw new Error('Failed to create new student object');
                    }
                }
            }
            
            // Verify that we have a valid student object before setting properties
            if (!student) {
                throw new Error('Student object is null or undefined');
            }
            
            // Set student properties
            console.log("[StudentManager] Setting student properties");
            if (studentData.name !== undefined) student.set('name', studentData.name);
            if (studentData.course !== undefined) student.set('course', studentData.course);
            if (studentData.season !== undefined) student.set('season', studentData.season);
            if (studentData.nationalID !== undefined) student.set('nationalID', studentData.nationalID);
            if (studentData.phone !== undefined) student.set('phone', studentData.phone);
            if (studentData.location !== undefined) student.set('location', studentData.location);
            
            // Add season information
            console.log("[StudentManager] Setting season information");
            student.set('seasonId', window.currentSeason);
            student.set('isActive', true);
            student.set('enrollmentDate', new Date());
            
            // Verify that the student object has the required methods before saving
            if (typeof student.save !== 'function') {
                throw new Error('Student object does not have save method');
            }
            
            console.log("[StudentManager] Student object before save:", student);
            if (student.className) {
                console.log("[StudentManager] Student object className before save:", student.className);
            }

            console.log("[StudentManager] Saving student to database");
            const savedStudent = await student.save();
            console.log('[StudentManager] Student saved successfully', {
                id: savedStudent.id,
                name: savedStudent.get('name'),
                nationalID: savedStudent.get('nationalID'),
                course: savedStudent.get('course'),
                season: savedStudent.get('season')
            });
            return { success: true, student: savedStudent };
        } catch (error) {
            console.error('[StudentManager] Error adding or updating student:', error);
            console.error('[StudentManager] Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
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
            // Safely set form values, handling cases where fields might be missing
            document.getElementById('studentName').value = studentToEdit.get('name') || '';
            document.getElementById('studentID').value = studentToEdit.get('nationalID') || '';
            document.getElementById('studentCourse').value = studentToEdit.get('course') || '';
            document.getElementById('studentSeason').value = studentToEdit.get('season') || '';
            document.getElementById('studentPhone').value = studentToEdit.get('phone') || '';
            document.getElementById('studentLocation').value = studentToEdit.get('location') || '';
            document.getElementById('addStudentForm').setAttribute('data-editing-id', studentToEdit.id);
            const studentName = studentToEdit.get('name') || 'Student';
            document.getElementById('student-form-heading').textContent = `Edit Student: ${studentName}`;
            document.getElementById('saveStudentBtn').textContent = 'Update Student';
            document.getElementById('cancelStudentBtn').style.display = 'inline-block';
        }
    }

    /**
     * Delete a student after confirmation
     * @param {string} id - ID of student to delete
     */
    async deleteStudent(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this student?', async () => {
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