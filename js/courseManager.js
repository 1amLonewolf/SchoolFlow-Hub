// js/courseManager.js

class CourseManager {
    constructor() {
        this.courses = [];
        this.editingCourseId = null;
    }

    setCourses(courses) {
        this.courses = courses;
    }

    getCourses() {
        return this.courses;
    }

    /**
     * Filter courses by season ID
     * @param {number} seasonId - The season ID to filter by
     * @returns {Array} Array of courses in the specified season
     */
    getCoursesBySeason(seasonId) {
        return this.courses.filter(course => {
            const courseSeason = course.seasonId;
            const isActive = course.isActive;
            
            // If course doesn't have seasonId, check if it should be included
            if (courseSeason === undefined || courseSeason === null) {
                return isActive !== false;
            }
            
            return courseSeason === seasonId && (isActive === true || isActive === undefined);
        });
    }

    renderCourseTable() {
        const courseTableBody = document.querySelector('#courseTable tbody');
        if (!courseTableBody) return;
        courseTableBody.innerHTML = '';
        if (this.courses.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.style.textAlign = 'center';
            td.textContent = 'No courses added yet.';
            tr.appendChild(td);
            courseTableBody.appendChild(tr);
            return;
        }
        this.courses.forEach(course => {
            const row = courseTableBody.insertRow();

            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            row.appendChild(makeCell('Course Name', course.name));
            row.appendChild(makeCell('Description', course.description));
            
            // Get teacher name
            const teacherId = course.teacherId;
            const teacher = window.teacherManager.getTeachers().find(t => t.id === teacherId);
            const teacherName = teacher ? teacher.name : 'Unassigned';
            row.appendChild(makeCell('Assigned Teacher', teacherName));

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
                this.editCourse(e.currentTarget.dataset.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.dataset.id = course.id;
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.position = 'relative';
            deleteBtn.style.zIndex = '2';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCourse(e.currentTarget.dataset.id);
            });

            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
        });
    }

    async addOrUpdateCourse(event) {
        event.preventDefault();
        const courseNameInput = document.getElementById('courseName');
        const courseDescriptionInput = document.getElementById('courseDescription');
        const assignedTeacherSelect = document.getElementById('assignedTeacher');

        const courseData = {
            name: courseNameInput.value.trim(),
            description: courseDescriptionInput.value.trim(),
            teacherId: assignedTeacherSelect.value,
            seasonId: window.currentSeason,
            isActive: true
        };

        if (!courseData.name || !courseData.description) {
            window.Utils.showMessage('Course name and description are required.', 'error');
            return;
        }

        try {
            let courseId = this.editingCourseId || null;
            
            // Use the centralized saveCourse function
            const savedCourse = await window.saveCourse(courseData, courseId);
            console.log('Course saved successfully', savedCourse);
            window.Utils.showMessage('Course saved successfully!', 'success');
            
            this.resetCourseForm();
            await window.loadAllData();
        } catch (error) {
            console.error('Error adding or updating course:', error);
            window.Utils.showMessage('Error saving course. Please try again.', 'error');
        }
    }

    editCourse(id) {
        const courseToEdit = this.courses.find(c => c.id === id);
        if (courseToEdit) {
            document.getElementById('courseName').value = courseToEdit.name;
            document.getElementById('courseDescription').value = courseToEdit.description;
            
            // Set teacher selection
            const teacherId = courseToEdit.teacherId;
            if (teacherId) {
                document.getElementById('assignedTeacher').value = teacherId;
            }
            
            document.getElementById('course-form-heading').textContent = `Edit Course: ${courseToEdit.name}`;
            document.getElementById('saveCourseBtn').textContent = 'Update Course';
            document.getElementById('cancelCourseBtn').style.display = 'inline-block';
            this.editingCourseId = id;
        }
    }

    async deleteCourse(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this course? This action cannot be undone.', async () => {
            await window.deleteCourse(id);
        });
    }

    resetCourseForm() {
        document.getElementById('addCourseForm').reset();
        document.getElementById('course-form-heading').textContent = 'Add New Course';
        document.getElementById('saveCourseBtn').textContent = 'Save Course';
        document.getElementById('cancelCourseBtn').style.display = 'none';
        this.editingCourseId = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CourseManager;
} else {
    window.CourseManager = CourseManager;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CourseManager;
} else {
    window.CourseManager = CourseManager;
}