// js/teacherManager.js

class TeacherManager {
    constructor() {
        this.teachers = [];
        this.editingTeacherId = null;
    }

    setTeachers(teachers) {
        this.teachers = teachers;
    }

    getTeachers() {
        return this.teachers;
    }

    renderTeacherTable() {
        const teacherTableBody = document.querySelector('#teacherTable tbody');
        if (!teacherTableBody) {
            console.warn("Teacher table body not found.");
            return;
        }
        teacherTableBody.innerHTML = '';
        if (this.teachers.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.style.textAlign = 'center';
            td.textContent = 'No teachers added yet.';
            tr.appendChild(td);
            teacherTableBody.appendChild(tr);
            return;
        }
        this.teachers.forEach(teacher => {
            const row = teacherTableBody.insertRow();

            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            row.appendChild(makeCell('Name', teacher.name)); // Direct access
            row.appendChild(makeCell('Email', teacher.email)); // Direct access
            row.appendChild(makeCell('Phone', teacher.phone || '')); // Direct access

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');

            const editButton = document.createElement('button');
            editButton.className = 'button edit-button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => this.editTeacher(teacher.id));

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => this.deleteTeacher(teacher.id));

            actionsTd.appendChild(editButton);
            actionsTd.appendChild(deleteButton);
            row.appendChild(actionsTd);
        });
        console.log("[TeacherManager] Teacher table rendered.");
    }

    async addOrUpdateTeacher(event) {
        event.preventDefault(); // Prevent default form submission
        const teacherNameInput = document.getElementById('teacherName');
        const teacherEmailInput = document.getElementById('teacherEmail');
        const teacherPhoneInput = document.getElementById('teacherPhone');

        const teacherData = {
            name: teacherNameInput.value.trim(),
            email: teacherEmailInput.value.trim(),
            phone: teacherPhoneInput.value.trim(),
        };

        if (!teacherData.name || !teacherData.email) {
            window.Utils.showMessage('Teacher name and email are required.', 'error');
            return;
        }

        if (!teacherData.email.includes('@') || !teacherData.email.includes('.')) {
            window.Utils.showMessage('Please enter a valid email address.', 'error');
            return;
        }

        try {
            let savedTeacherJson;
            if (this.editingTeacherId) {
                // Updating existing teacher
                savedTeacherJson = await window.saveParseData('Teacher', teacherData, this.editingTeacherId);
            } else {
                // Creating new teacher - check for duplicate email
                const existingTeacher = this.teachers.find(t => t.email.toLowerCase() === teacherData.email.toLowerCase());
                if (existingTeacher) {
                    window.Utils.showMessage(`A teacher with email '${teacherData.email}' already exists.`, 'error');
                    return;
                }
                savedTeacherJson = await window.saveParseData('Teacher', teacherData);
            }

            if (savedTeacherJson) {
                console.log('Teacher saved successfully', savedTeacherJson);
                window.Utils.showMessage('Teacher saved successfully!', 'success');
                this.resetTeacherForm(); // Reset form after successful save
                // loadAllData is called by saveParseData, so no need to call it again
            } else {
                // saveParseData already displays error messages, just log here
                console.error("[TeacherManager] Failed to save teacher via window.saveParseData.");
                window.Utils.showMessage('Failed to save teacher. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error adding or updating teacher:', error);
            // Error message handled by window.saveParseData
        }
    }

    editTeacher(id) {
        const teacherToEdit = this.teachers.find(t => t.id === id);
        if (teacherToEdit) {
            document.getElementById('teacherName').value = teacherToEdit.name || '';
            document.getElementById('teacherEmail').value = teacherToEdit.email || '';
            document.getElementById('teacherPhone').value = teacherToEdit.phone || '';
            document.getElementById('teacher-form-heading').textContent = `Edit Teacher: ${teacherToEdit.name || 'Teacher'}`;
            document.getElementById('saveTeacherBtn').textContent = 'Update Teacher';
            document.getElementById('cancelTeacherBtn').style.display = 'inline-block';
            this.editingTeacherId = id; // Set editing ID
            console.log("[TeacherManager] Teacher form populated for editing.");
        } else {
            console.warn(`[TeacherManager] Teacher with ID ${id} not found for editing.`);
            window.Utils.showMessage(`Teacher with ID ${id} not found.`, 'warning');
        }
    }

    async deleteTeacher(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this teacher? This action cannot be undone.', async () => {
            const success = await window.deleteParseData('Teacher', id);
            if (success) {
                console.log(`[TeacherManager] Teacher with ID ${id} deleted.`);
                // loadAllData called by deleteParseData
            } else {
                console.error(`[TeacherManager] Failed to delete teacher with ID ${id}.`);
            }
        });
    }

    resetTeacherForm() {
        const addTeacherForm = document.getElementById('addTeacherForm');
        if (addTeacherForm) {
            addTeacherForm.reset();
        }
        document.getElementById('teacher-form-heading').textContent = 'Add New Teacher';
        document.getElementById('saveTeacherBtn').textContent = 'Save Teacher';
        document.getElementById('cancelTeacherBtn').style.display = 'none';
        this.editingTeacherId = null; // Reset editing ID
        console.log("[TeacherManager] Teacher form reset.");
    }

    populateTeacherDropdown(selectElement) {
        if (!selectElement) {
            selectElement = document.getElementById('assignedTeacher'); // Default to this ID if none provided
        }
        if (!selectElement) return;

        const currentValue = selectElement.value; // Store current value to re-select
        selectElement.innerHTML = '<option value="">-- Select Teacher --</option>';
        this.teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id; // Use the Parse object ID
            option.textContent = teacher.name; // Direct access to name
            selectElement.appendChild(option);
        });
        selectElement.value = currentValue; // Restore previous selection
        console.log("[TeacherManager] Teacher dropdown populated.");
    }
}

// Export for use in other modules
export default TeacherManager;
