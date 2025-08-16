// js/attendanceManager.js

class AttendanceManager {
    constructor() {
        this.attendanceRecords = [];
        this.editingAttendanceId = null;
    }

    setAttendanceRecords(attendanceRecords) {
        this.attendanceRecords = attendanceRecords;
    }

    getAttendanceRecords() {
        return this.attendanceRecords;
    }

    /**
     * Renders the attendance table based on optional filters.
     * @param {string} [courseFilter=''] - Optional course ID to filter by.
     * @param {string} [dateFilter=''] - Optional date string (YYYY-MM-DD) to filter by.
     */
    renderAttendanceTable(courseFilter = '', dateFilter = '') {
        const attendanceTableBody = document.querySelector('#attendanceTable tbody');
        if (!attendanceTableBody) {
            console.warn("Attendance table body not found.");
            return;
        }
        attendanceTableBody.innerHTML = '';

        let recordsToRender = [...this.attendanceRecords]; // Create a mutable copy

        // Apply filters
        if (courseFilter) {
            recordsToRender = recordsToRender.filter(record => record.course === courseFilter); // Direct access
        }
        if (dateFilter) {
            recordsToRender = recordsToRender.filter(record => record.date === dateFilter); // Direct access
        }


        if (recordsToRender.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.textContent = 'No attendance records found with current filters.';
            tr.appendChild(td);
            attendanceTableBody.appendChild(tr);
            return;
        }
        recordsToRender.forEach(record => {
            const row = attendanceTableBody.insertRow();

            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            // Get student name (students are plain objects)
            const student = window.studentManager.getStudents().find(s => s.id === record.studentId); // Direct access
            const studentName = student ? student.name : 'Unknown Student'; // Direct access
            
            // Get course name (courses are also plain objects now)
            const course = window.courseManager.getCourses().find(c => c.id === record.course);
            const courseName = course ? course.name : (record.course || 'Unknown Course');


            const date = record.date; // Direct access
            const formattedDate = date ? new Date(date).toLocaleDateString() : '';
            
            row.appendChild(makeCell('Date', formattedDate));
            row.appendChild(makeCell('Student', studentName));
            row.appendChild(makeCell('Course', courseName));
            row.appendChild(makeCell('Status', record.status)); // Direct access

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');

            const editButton = document.createElement('button');
            editButton.className = 'button edit-button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => this.editAttendance(record.id));

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => this.deleteAttendance(record.id));

            actionsTd.appendChild(editButton);
            actionsTd.appendChild(deleteButton);
            row.appendChild(actionsTd);
        });
        console.log("[AttendanceManager] Attendance table rendered.");
    }

    async addOrUpdateAttendance(event) {
        event.preventDefault(); // Prevent default form submission
        const attendanceStudentSelect = document.getElementById('attendanceStudent');
        const attendanceDateInput = document.getElementById('attendanceDate');
        const attendanceStatusSelect = document.getElementById('attendanceStatus');
        const attendanceCourseFilter = document.getElementById('attendanceCourseFilter'); // Use this to get the course ID

        const attendanceData = {
            studentId: attendanceStudentSelect.value,
            date: attendanceDateInput.value, // YYYY-MM-DD string
            status: attendanceStatusSelect.value,
            course: attendanceCourseFilter.value // Use the selected course ID
        };

        if (!attendanceData.studentId || !attendanceData.date || !attendanceData.status || !attendanceData.course) {
            window.Utils.showMessage('All fields (Student, Date, Status, Course) are required.', 'error');
            return;
        }

        try {
            let savedRecordJson;
            if (this.editingAttendanceId) {
                // Updating existing record
                savedRecordJson = await window.saveParseData('Attendance', attendanceData, this.editingAttendanceId);
            } else {
                // Before creating, check if an attendance record for this student/date/course already exists
                const existingAttendance = window.attendanceManager.getAttendanceRecords().find(
                    record => record.studentId === attendanceData.studentId &&
                              record.date === attendanceData.date &&
                              record.course === attendanceData.course
                );

                if (existingAttendance) {
                    window.Utils.showMessage('Attendance record for this student on this date in this course already exists. Updating existing record.', 'info');
                    savedRecordJson = await window.saveParseData('Attendance', attendanceData, existingAttendance.id);
                } else {
                    savedRecordJson = await window.saveParseData('Attendance', attendanceData);
                }
            }

            if (savedRecordJson) {
                console.log('Attendance record saved successfully', savedRecordJson);
                window.Utils.showMessage('Attendance record saved successfully!', 'success');
                this.resetAttendanceForm(); // Reset form after successful save
                // loadAllData is called by saveParseData, so no need to call it again here
            } else {
                console.error("[AttendanceManager] Failed to save attendance record via window.saveParseData.");
                window.Utils.showMessage('Failed to save attendance record. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error adding or updating attendance record:', error);
            // Error message handled by window.saveParseData
        }
    }

    editAttendance(id) {
        const recordToEdit = this.attendanceRecords.find(r => r.id === id);
        if (recordToEdit) {
            document.getElementById('attendanceStudent').value = recordToEdit.studentId || '';
            
            // Assuming date is already stored as YYYY-MM-DD string or Date object
            const dateValue = recordToEdit.date instanceof Date ? recordToEdit.date.toISOString().split('T')[0] : recordToEdit.date;
            if (dateValue) {
                document.getElementById('attendanceDate').value = dateValue;
            }
            document.getElementById('attendanceStatus').value = recordToEdit.status || '';
            document.getElementById('attendanceCourseFilter').value = recordToEdit.course || ''; // Set course filter too
            
            document.getElementById('saveAttendanceBtn').textContent = 'Update Attendance';
            document.getElementById('cancelAttendanceBtn').style.display = 'inline-block';
            this.editingAttendanceId = id; // Set editing ID
            console.log("[AttendanceManager] Attendance form populated for editing.");
        } else {
            console.warn(`[AttendanceManager] Attendance record with ID ${id} not found for editing.`);
            window.Utils.showMessage(`Attendance record with ID ${id} not found.`, 'warning');
        }
    }

    async deleteAttendance(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this attendance record? This action cannot be undone.', async () => {
            const success = await window.deleteParseData('Attendance', id);
            if (success) {
                console.log(`[AttendanceManager] Attendance record with ID ${id} deleted.`);
                // loadAllData called by deleteParseData
            } else {
                console.error(`[AttendanceManager] Failed to delete attendance record with ID ${id}.`);
            }
        });
    }

    resetAttendanceForm() {
        const addAttendanceForm = document.getElementById('addAttendanceForm');
        if (addAttendanceForm) {
            addAttendanceForm.reset();
        }
        document.getElementById('saveAttendanceBtn').textContent = 'Record Attendance';
        document.getElementById('cancelAttendanceBtn').style.display = 'none';
        this.editingAttendanceId = null; // Reset editing ID
        // Set today's date as default
        const attendanceDateInput = document.getElementById('attendanceDate');
        if (attendanceDateInput) {
            attendanceDateInput.value = window.Utils.getTodayDateString();
        }
        console.log("[AttendanceManager] Attendance form reset.");
    }
    
    /**
     * Get attendance statistics for all records
     * @returns {Object} Object containing present, absent, and late counts
     */
    getAttendanceStats() {
        const presentCount = this.attendanceRecords.filter(record => record.status === 'Present').length;
        const absentCount = this.attendanceRecords.filter(record => record.status === 'Absent').length;
        const lateCount = this.attendanceRecords.filter(record => record.status === 'Late').length;
        
        return {
            presentCount,
            absentCount,
            lateCount
        };
    }

    /**
     * Exports current attendance records (filtered) to a CSV file.
     * This function should ideally be passed filters if used for specific reports.
     */
    exportAttendanceCSV() {
        const rows = [["Date", "Student", "Course", "Status"]];
        const recordsToExport = this.getAttendanceRecords(); // You might want to apply current filters here

        recordsToExport.forEach(r => {
            const student = window.studentManager.getStudents().find(s => s.id === r.studentId);
            const course = window.courseManager.getCourses().find(c => c.id === r.course);
            const courseName = course ? course.name : (r.course || 'Unknown Course');
            const formattedDate = r.date ? new Date(r.date).toLocaleDateString() : '';
            
            rows.push([
                formattedDate,
                student ? student.name : 'Unknown Student',
                courseName,
                r.status || ''
            ]);
        });
        const csv = window.Utils.toCSV(rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'attendance.csv'; a.click();
        URL.revokeObjectURL(url);
        window.Utils.showMessage('Attendance data exported to CSV.', 'success');
        console.log("[AttendanceManager] Attendance CSV exported.");
    }
}

// Export for use in other modules
export default AttendanceManager;
