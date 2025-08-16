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
        if (!teacherTableBody) return;
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
                this.editTeacher(e.currentTarget.dataset.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.dataset.id = teacher.id;
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.position = 'relative';
            deleteBtn.style.zIndex = '2';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTeacher(e.currentTarget.dataset.id);
            });

            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
        });
    }

    async addOrUpdateTeacher(event) {
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
            window.showMessage('Teacher name and email are required.', 'error');
            return;
        }

        if (!teacherData.email.includes('@')) {
            window.showMessage('Please enter a valid email address.', 'error');
            return;
        }

        if (this.editingTeacherId) {
            await window.saveParseData('Teacher', teacherData, this.editingTeacherId);
        } else {
            await window.saveParseData('Teacher', teacherData);
        }
        this.resetTeacherForm();
    }

    editTeacher(id) {
        const teacherToEdit = this.teachers.find(t => t.id === id);
        if (teacherToEdit) {
            document.getElementById('teacherName').value = teacherToEdit.get('name');
            document.getElementById('teacherEmail').value = teacherToEdit.get('email');
            document.getElementById('teacherPhone').value = teacherToEdit.get('phone');
            document.getElementById('teacher-form-heading').textContent = `Edit Teacher: ${teacherToEdit.get('name')}`;
            document.getElementById('saveTeacherBtn').textContent = 'Update Teacher';
            document.getElementById('cancelTeacherBtn').style.display = 'inline-block';
            this.editingTeacherId = id;
        }
    }

    async deleteTeacher(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this teacher? This action cannot be undone.', async () => {
            await window.deleteParseData('Teacher', id);
        });
    }

    resetTeacherForm() {
        document.getElementById('addTeacherForm').reset();
        document.getElementById('teacher-form-heading').textContent = 'Add New Teacher';
        document.getElementById('saveTeacherBtn').textContent = 'Save Teacher';
        document.getElementById('cancelTeacherBtn').style.display = 'none';
        this.editingTeacherId = null;
    }

    populateTeacherDropdown() {
        const assignedTeacherSelect = document.getElementById('assignedTeacher');
        if (!assignedTeacherSelect) return;
        const currentValue = assignedTeacherSelect.value;
        assignedTeacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';
        this.teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacher.get('name');
            assignedTeacherSelect.appendChild(option);
        });
        assignedTeacherSelect.value = currentValue;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeacherManager;
} else {
    window.TeacherManager = TeacherManager;
}