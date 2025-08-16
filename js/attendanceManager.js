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

    renderAttendanceTable() {
        const attendanceTableBody = document.querySelector('#attendanceTable tbody');
        if (!attendanceTableBody) return;
        attendanceTableBody.innerHTML = '';
        if (this.attendanceRecords.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.textContent = 'No attendance records added yet.';
            tr.appendChild(td);
            attendanceTableBody.appendChild(tr);
            return;
        }
        this.attendanceRecords.forEach(record => {
            const row = attendanceTableBody.insertRow();

            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            // Get student name
            const studentId = record.studentId;
            const student = window.studentManager.getStudents().find(s => s.id === studentId);
            const studentName = student ? student.name : 'Unknown Student';
            
            // Get course name
            const courseId = student ? student.course : null;
            const course = window.courseManager.getCourses().find(c => c.id === courseId);
            const courseName = course ? course.name : (courseId || 'Unknown Course');

            const date = record.date;
            const formattedDate = date ? new Date(date).toLocaleDateString() : '';
            
            row.appendChild(makeCell('Date', formattedDate));
            row.appendChild(makeCell('Student', studentName));
            row.appendChild(makeCell('Course', courseName));
            row.appendChild(makeCell('Status', record.status));

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');
            actionsTd.className = 'actions';
            actionsTd.style.position = 'relative';
            actionsTd.style.zIndex = '1';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-button';
            editBtn.dataset.id = record.id;
            editBtn.textContent = 'Edit';
            editBtn.style.position = 'relative';
            editBtn.style.zIndex = '2';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editAttendance(e.currentTarget.dataset.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.dataset.id = record.id;
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.position = 'relative';
            deleteBtn.style.zIndex = '2';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAttendance(e.currentTarget.dataset.id);
            });

            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
        });
    }

    async addOrUpdateAttendance(event) {
        event.preventDefault();
        const attendanceStudentSelect = document.getElementById('attendanceStudent');
        const attendanceDateInput = document.getElementById('attendanceDate');
        const attendanceStatusSelect = document.getElementById('attendanceStatus');

        const attendanceData = {
            studentId: attendanceStudentSelect.value,
            date: attendanceDateInput.value,
            status: attendanceStatusSelect.value
        };

        if (!attendanceData.studentId || !attendanceData.date || !attendanceData.status) {
            window.Utils.showMessage('All fields are required.', 'error');
            return;
        }

        try {
            let recordId = this.editingAttendanceId || null;
            
            // Convert date string to Date object
            attendanceData.date = new Date(attendanceData.date);
            
            // Use the centralized saveAttendanceRecord function
            const savedRecord = await window.saveAttendanceRecord(attendanceData, recordId);
            console.log('Attendance record saved successfully', savedRecord);
            window.Utils.showMessage('Attendance record saved successfully!', 'success');
            
            this.resetAttendanceForm();
            await window.loadAllData();
        } catch (error) {
            console.error('Error adding or updating attendance record:', error);
            window.Utils.showMessage('Error saving attendance record. Please try again.', 'error');
        }
    }

    editAttendance(id) {
        const recordToEdit = this.attendanceRecords.find(r => r.id === id);
        if (recordToEdit) {
            document.getElementById('attendanceStudent').value = recordToEdit.studentId;
            const date = recordToEdit.date;
            if (date) {
                document.getElementById('attendanceDate').value = new Date(date).toISOString().split('T')[0];
            }
            document.getElementById('attendanceStatus').value = recordToEdit.status;
            
            document.getElementById('saveAttendanceBtn').textContent = 'Update Attendance';
            document.getElementById('cancelAttendanceBtn').style.display = 'inline-block';
            this.editingAttendanceId = id;
        }
    }

    async deleteAttendance(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this attendance record? This action cannot be undone.', async () => {
            await window.deleteAttendanceRecord(id);
        });
    }

    resetAttendanceForm() {
        document.getElementById('addAttendanceForm').reset();
        document.getElementById('saveAttendanceBtn').textContent = 'Record Attendance';
        document.getElementById('cancelAttendanceBtn').style.display = 'none';
        this.editingAttendanceId = null;
    }
    
    /**
     * Get attendance statistics
     * @returns {Object} Object containing present and absent counts
     */
    getAttendanceStats() {
        const presentCount = this.attendanceRecords.filter(record => record.status === 'Present').length;
        const absentCount = this.attendanceRecords.filter(record => record.status === 'Absent').length;
        
        return {
            presentCount,
            absentCount
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceManager;
} else {
    window.AttendanceManager = AttendanceManager;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceManager;
} else {
    window.AttendanceManager = AttendanceManager;
}