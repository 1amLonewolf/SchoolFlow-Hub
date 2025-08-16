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
            const courseSeason = course.seasonId; // Direct access
            const isActive = course.isActive;     // Direct access
            
            // If course doesn't have seasonId, check if it should be included (e.g., older data without season)
            if (courseSeason === undefined || courseSeason === null) {
                return isActive !== false; // Include if not explicitly inactive
            }
            
            return courseSeason === seasonId && (isActive === true || isActive === undefined);
        });
    }

    renderCourseTable() {
        const courseTableBody = document.querySelector('#courseTable tbody');
        if (!courseTableBody) {
            console.warn("Course table body not found.");
            return;
        }
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

            row.appendChild(makeCell('Course Name', course.name)); // Direct access
            row.appendChild(makeCell('Description', course.description)); // Direct access
            
            // Get teacher name (teachers are now plain objects)
            const teacher = window.teacherManager.getTeachers().find(t => t.id === course.teacherId); // Direct access
            const teacherName = teacher ? teacher.name : 'Unassigned'; // Direct access
            row.appendChild(makeCell('Assigned Teacher', teacherName));

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');

            const editButton = document.createElement('button');
            editButton.className = 'button edit-button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => this.editCourse(course.id));

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => this.deleteCourse(course.id));

            actionsTd.appendChild(editButton);
            actionsTd.appendChild(deleteButton);
            row.appendChild(actionsTd);
        });
        console.log("[CourseManager] Course table rendered.");
    }

    async addOrUpdateCourse(event) {
        event.preventDefault();
        const courseNameInput = document.getElementById('courseName');
        const courseDescriptionInput = document.getElementById('courseDescription');
        const assignedTeacherSelect = document.getElementById('assignedTeacher');

        const courseData = {
            name: courseNameInput.value.trim(),
            description: courseDescriptionInput.value.trim(),
            teacherId: assignedTeacherSelect.value, // Teacher ID from dropdown
            seasonId: window.seasonManager.getCurrentSeason(), // Current active season
            isActive: true // New courses are active by default
        };

        if (!courseData.name || !courseData.description) {
            window.Utils.showMessage('Course name and description are required.', 'error');
            return;
        }

        try {
            let savedCourseJson;
            if (this.editingCourseId) {
                // Updating existing course
                savedCourseJson = await window.saveParseData('Course', courseData, this.editingCourseId);
            } else {
                // Check for duplicate course name within the current season
                const existingCourse = this.courses.find(
                    c => c.name.toLowerCase() === courseData.name.toLowerCase() &&
                         c.seasonId === courseData.seasonId
                );
                if (existingCourse) {
                    window.Utils.showMessage(`A course named '${courseData.name}' already exists in Season ${courseData.seasonId}.`, 'error');
                    return;
                }
                savedCourseJson = await window.saveParseData('Course', courseData);
            }
            
            if (savedCourseJson) {
                console.log('Course saved successfully', savedCourseJson);
                window.Utils.showMessage('Course saved successfully!', 'success');
                this.resetCourseForm(); // Reset form after successful save
                // loadAllData is called by saveParseData, no need to call it again
            } else {
                console.error("[CourseManager] Failed to save course via window.saveParseData.");
                window.Utils.showMessage('Failed to save course. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error adding or updating course:', error);
            // Message handled by window.saveParseData
        }
    }

    editCourse(id) {
        const courseToEdit = this.courses.find(c => c.id === id);
        if (courseToEdit) {
            document.getElementById('courseName').value = courseToEdit.name || '';
            document.getElementById('courseDescription').value = courseToEdit.description || '';
            
            // Set teacher selection (teacherId is direct property now)
            if (courseToEdit.teacherId) {
                document.getElementById('assignedTeacher').value = courseToEdit.teacherId;
            } else {
                document.getElementById('assignedTeacher').value = ''; // Clear if no teacher assigned
            }
            
            document.getElementById('course-form-heading').textContent = `Edit Course: ${courseToEdit.name || 'Course'}`;
            document.getElementById('saveCourseBtn').textContent = 'Update Course';
            document.getElementById('cancelCourseBtn').style.display = 'inline-block';
            this.editingCourseId = id;
            console.log("[CourseManager] Course form populated for editing.");
        } else {
            console.warn(`[CourseManager] Course with ID ${id} not found for editing.`);
            window.Utils.showMessage(`Course with ID ${id} not found.`, 'warning');
        }
    }

    async deleteCourse(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this course? This action cannot be undone.', async () => {
            const success = await window.deleteParseData('Course', id);
            if (success) {
                console.log(`[CourseManager] Course with ID ${id} deleted.`);
                // loadAllData called by deleteParseData
            } else {
                console.error(`[CourseManager] Failed to delete course with ID ${id}.`);
            }
        });
    }

    resetCourseForm() {
        const addCourseForm = document.getElementById('addCourseForm');
        if (addCourseForm) {
            addCourseForm.reset();
        }
        document.getElementById('course-form-heading').textContent = 'Add New Course';
        document.getElementById('saveCourseBtn').textContent = 'Save Course';
        document.getElementById('cancelCourseBtn').style.display = 'none';
        this.editingCourseId = null;
        // Re-populate teacher dropdown if it was affected by reset (optional, usually not needed)
        // window.teacherManager.populateTeacherDropdown(); 
        console.log("[CourseManager] Course form reset.");
    }

    /**
     * Populate the course dropdown for forms (e.g., Exams, Attendance Filters)
     * @param {HTMLSelectElement} selectElement - The select element to populate
     */
    populateCourseDropdown(selectElement) {
        if (!selectElement) return;

        const currentValue = selectElement.value; // Store current value to re-select
        selectElement.innerHTML = '<option value="">-- Select Course --</option>'; // Default option
        this.getCoursesBySeason(window.seasonManager.getCurrentSeason()).forEach(course => {
            const option = document.createElement('option');
            option.value = course.id; // Use the Parse object ID
            option.textContent = course.name; // Direct access to name
            selectElement.appendChild(option);
        });
        selectElement.value = currentValue; // Restore previous selection
        console.log("[CourseManager] Course dropdown populated.");
    }
}

// Export for use in other modules
export default CourseManager;
