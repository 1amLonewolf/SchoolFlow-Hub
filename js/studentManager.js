// js/studentManager.js
// StudentManager class handles all student-related functionality in the dashboard

class StudentManager {
    /**
     * Constructor initializes the student manager with empty students array
     */
    constructor() {
        this.students = [];
    }

    /**
     * Set the students array
     * @param {Array} students - Array of plain student objects
     */
    setStudents(students) {
        console.log(`[StudentManager] setStudents called with ${students.length} students`);
        this.students = students;
    }

    /**
     * Get the current students array
     * @returns {Array} Array of plain student objects
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
            const studentSeason = student.season; // Direct access to plain object property
            const isActive = student.isActive;    // Direct access to plain object property
            
            // If student doesn't have seasonId, check if they should be included (e.g., from older data)
            if (studentSeason === undefined || studentSeason === null) {
                return isActive !== false; // Include if not explicitly inactive
            }
            
            return studentSeason === seasonId && (isActive === true || isActive === undefined);
        });
    }

    /**
     * Renders the student table in the UI
     */
    renderStudentTable() {
        const studentTableBody = document.querySelector('#studentTable tbody');
        if (!studentTableBody) {
            console.warn("Student table body not found.");
            return;
        }
        studentTableBody.innerHTML = ''; // Clear existing rows

        const activeStudents = this.getStudentsBySeason(window.seasonManager.getCurrentSeason());

        if (activeStudents.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6; // Adjust colspan if number of columns changes
            td.style.textAlign = 'center';
            td.textContent = 'No students added yet for this season.';
            tr.appendChild(td);
            studentTableBody.appendChild(tr);
            return;
        }

        activeStudents.forEach(student => {
            const row = studentTableBody.insertRow();

            // Helper to create a table cell
            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label); // For responsive design
                td.textContent = value ?? ''; // Use nullish coalescing for default empty string
                return td;
            };

            row.appendChild(makeCell('Name', student.name));
            row.appendChild(makeCell('Course', student.course));
            row.appendChild(makeCell('ID', student.nationalID));
            row.appendChild(makeCell('Season', student.season));
            row.appendChild(makeCell('Phone', student.phone));

            // Actions cell (Edit/Delete buttons)
            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');

            const editButton = document.createElement('button');
            editButton.className = 'button edit-button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => this.editStudent(student.id));

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => this.deleteStudent(student.id));

            actionsTd.appendChild(editButton);
            actionsTd.appendChild(deleteButton);
            row.appendChild(actionsTd);
        });
        console.log("[StudentManager] Student table rendered.");
    }

    /**
     * Adds a new student or updates an existing one
     * @param {string|null} studentId - ID of student to update, or null for new student
     * @param {Object} studentData - Data for the student
     * @returns {Promise<Object>} Object indicating success and saved student data
     */
    async addOrUpdateStudent(studentId, studentData) {
        try {
            console.log("[StudentManager] addOrUpdateStudent called with:", { studentId, studentData });

            // Ensure seasonId and isActive are correctly passed in studentData
            studentData.season = window.seasonManager.getCurrentSeason(); // Ensure 'season' is used, not 'seasonId' if your schema uses 'season'
            studentData.isActive = true;
            studentData.enrollmentDate = studentData.enrollmentDate || new Date().toISOString().split('T')[0]; // Store date as YYYY-MM-DD
            studentData.endDate = studentData.endDate || '';


            let savedStudentJson;
            if (studentId) {
                // Updating existing student
                console.log("[StudentManager] Updating existing student with ID:", studentId);
                savedStudentJson = await window.saveParseData('Student', studentData, studentId);
            } else {
                // Creating new student - check if one with same national ID exists locally first
                const existingStudent = this.students.find(s => s.nationalID === studentData.nationalID);
                if (existingStudent) {
                    window.Utils.showMessage(`A student with National ID '${studentData.nationalID}' already exists. Updating existing record.`, 'info');
                    console.log("[StudentManager] Found existing student with same national ID, updating that record.");
                    savedStudentJson = await window.saveParseData('Student', studentData, existingStudent.id);
                } else {
                    console.log("[StudentManager] No existing student with this national ID, creating new record.");
                    savedStudentJson = await window.saveParseData('Student', studentData);
                }
            }

            if (savedStudentJson) {
                console.log('[StudentManager] Student saved successfully', savedStudentJson);
                window.Utils.showMessage('Student record saved successfully!', 'success');
                // The loadAllData call in saveParseData will update this.students array
                return { success: true, student: savedStudentJson };
            } else {
                console.error("[StudentManager] Failed to save student via window.saveParseData.");
                return { success: false, message: "Failed to save student record." };
            }

        } catch (error) {
            console.error('[StudentManager] Error caught in addOrUpdateStudent:', error);
            // window.saveParseData already handles displaying messages, so just return error.
            return { success: false, message: error.message || "An unexpected error occurred." };
        }
    }

    /**
     * Populate the student dropdown for forms (e.g., Attendance, Exams)
     * @param {HTMLSelectElement} selectElement - The select element to populate
     */
    populateStudentDropdown(selectElement) {
        if (!selectElement) return;
        
        // Store current value to re-select after populating
        const currentValue = selectElement.value; 
        
        selectElement.innerHTML = '<option value="">-- Select Student --</option>'; // Default option
        this.getStudentsBySeason(window.seasonManager.getCurrentSeason()).forEach(student => {
            const option = document.createElement('option');
            option.value = student.id; // Use the Parse object ID
            option.textContent = student.name; // Direct access to name
            selectElement.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        selectElement.value = currentValue;
        console.log("[StudentManager] Student dropdown populated.");
    }

    /**
     * Edit a student record by populating the form
     * @param {string} id - ID of student to edit
     */
    editStudent(id) {
        const studentToEdit = this.students.find(s => s.id === id);
        if (studentToEdit) {
            document.getElementById('studentName').value = studentToEdit.name || '';
            document.getElementById('studentID').value = studentToEdit.nationalID || '';
            document.getElementById('studentCourse').value = studentToEdit.course || '';
            document.getElementById('studentSeason').value = studentToEdit.season || '';
            document.getElementById('studentPhone').value = studentToEdit.phone || '';
            document.getElementById('studentLocation').value = studentToEdit.location || '';
            document.getElementById('enrollmentStartDate').value = studentToEdit.startDate || '';
            document.getElementById('enrollmentEndDate').value = studentToEdit.endDate || '';

            document.getElementById('addStudentForm').setAttribute('data-editing-id', studentToEdit.id);
            document.getElementById('student-form-heading').textContent = `Edit Student: ${studentToEdit.name || 'Student'}`;
            document.getElementById('saveStudentBtn').textContent = 'Update Student';
            document.getElementById('cancelStudentBtn').style.display = 'inline-block';
            console.log("[StudentManager] Student form populated for editing.");
        } else {
            console.warn(`[StudentManager] Student with ID ${id} not found for editing.`);
            window.Utils.showMessage(`Student with ID ${id} not found.`, 'warning');
        }
    }

    /**
     * Delete a student after confirmation
     * @param {string} id - ID of student to delete
     */
    async deleteStudent(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this student? This action cannot be undone.', async () => {
            const success = await window.deleteParseData('Student', id);
            if (success) {
                console.log(`[StudentManager] Student with ID ${id} deleted.`);
                // loadAllData called by deleteParseData
            } else {
                console.error(`[StudentManager] Failed to delete student with ID ${id}.`);
            }
        });
    }

    /**
     * Reset the student form to its initial state
     * Clears all form fields and resets button labels
     */
    resetStudentForm() {
        const addStudentForm = document.getElementById('addStudentForm');
        if (addStudentForm) {
            addStudentForm.reset();
            addStudentForm.removeAttribute('data-editing-id');
        }
        document.getElementById('student-form-heading').textContent = 'Add New Student';
        document.getElementById('saveStudentBtn').textContent = 'Save Student';
        document.getElementById('cancelStudentBtn').style.display = 'none';
        console.log("[StudentManager] Student form reset.");
    }

    /**
     * Exports current season's active students to a CSV file.
     */
    exportStudentsCSV() {
        // PII-reduced export: omit National ID by default or make it optional
        const rows = [["Name", "Course", "Season", "Phone", "Location", "Enrollment Start", "Enrollment End", "Active"]];
        const activeStudents = this.getStudentsBySeason(window.seasonManager.getCurrentSeason());

        activeStudents.forEach(s => rows.push([
            s.name || '',
            s.course || '',
            s.season || '',
            s.phone || '',
            s.location || '',
            s.startDate || '',
            s.endDate || '',
            s.isActive ? 'Yes' : 'No'
        ]));
        const csv = window.Utils.toCSV(rows); // Use Utils.toCSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'students.csv'; a.click();
        URL.revokeObjectURL(url);
        window.Utils.showMessage('Students data exported to CSV.', 'success');
        console.log("[StudentManager] Students CSV exported.");
    }

    /**
     * Bulk processes student records from a CSV or JSON upload.
     * @param {Array<Object>} records - Array of student data objects.
     */
    async processStudentRecords(records) {
        if (!records || records.length === 0) {
            window.Utils.showMessage('No records to process.', 'warning');
            return;
        }

        const uploadStatusDiv = document.getElementById('uploadStatus');
        if (uploadStatusDiv) uploadStatusDiv.textContent = 'Processing records...';

        let successCount = 0;
        let failCount = 0;

        for (const record of records) {
            try {
                // Map CSV/JSON headers to expected studentData format
                const studentData = {
                    name: record.Name || record.name || '',
                    nationalID: record['National ID'] || record.nationalID || '',
                    course: record.Course || record.course || '',
                    season: parseInt(record.Season || record.season || window.seasonManager.getCurrentSeason()),
                    phone: record.Phone || record.phone || '',
                    location: record.Location || record.location || '',
                    startDate: record['Enrollment Start Date'] || record.startDate || '',
                    endDate: record['Enrollment End Date'] || record.endDate || '',
                    isActive: record.Active === 'No' ? false : true // Handle active status from import
                };

                // Add or update student via manager's method
                const result = await this.addOrUpdateStudent(null, studentData); // Null ID for new or existing by National ID
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to process record for ${studentData.name}: ${result.message}`);
                }
            } catch (error) {
                failCount++;
                console.error("Error processing single record:", record, error);
            }
        }
        window.Utils.showMessage(`Bulk upload complete: ${successCount} successful, ${failCount} failed.`, successCount > 0 ? 'success' : 'warning');
        if (uploadStatusDiv) uploadStatusDiv.textContent = `Upload complete: ${successCount} successful, ${failCount} failed.`;
        // Reload all data after bulk operation is complete
        window.loadAllData();
        console.log("[StudentManager] Bulk student records processed.");
    }
}

// Export for use in other modules
export default StudentManager;
