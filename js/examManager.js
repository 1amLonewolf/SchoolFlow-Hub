// js/examManager.js

class ExamManager {
    constructor() {
        this.exams = [];
        this.editingExamId = null;
        this.currentPage = 1;
        this.pageSize = 25; // Default page size
        this.searchTerm = '';
        this.courseFilter = '';
        this.typeFilter = '';
        this.sortBy = 'newest'; // Default sort
    }

    setExams(exams) {
        this.exams = exams;
        this.updateExamTableControls(); // Update pagination and counts when data changes
    }

    getExams() {
        return this.exams;
    }

    /**
     * Renders the exam table based on current filters and pagination
     */
    renderExamTable() {
        const examTableBody = document.querySelector('#examTable tbody');
        if (!examTableBody) {
            console.warn("Exam table body not found.");
            return;
        }
        examTableBody.innerHTML = '';

        let filteredExams = [...this.exams]; // Create a mutable copy

        // Apply search filter
        if (this.searchTerm) {
            const lowerCaseSearch = this.searchTerm.toLowerCase();
            filteredExams = filteredExams.filter(exam =>
                (window.studentManager.getStudents().find(s => s.id === exam.studentId)?.name || '').toLowerCase().includes(lowerCaseSearch) ||
                (window.courseManager.getCourses().find(c => c.id === exam.courseId)?.name || '').toLowerCase().includes(lowerCaseSearch) ||
                (exam.examType || '').toLowerCase().includes(lowerCaseSearch) ||
                (exam.category || '').toLowerCase().includes(lowerCaseSearch)
            );
        }

        // Apply course filter
        if (this.courseFilter) {
            filteredExams = filteredExams.filter(exam => exam.courseId === this.courseFilter);
        }

        // Apply type filter
        if (this.typeFilter) {
            filteredExams = filteredExams.filter(exam => exam.examType === this.typeFilter);
        }

        // Apply sorting
        filteredExams.sort((a, b) => {
            switch (this.sortBy) {
                case 'oldest': return new Date(a.date) - new Date(b.date);
                case 'highest': return (b.score / b.totalScore) - (a.score / a.totalScore);
                case 'lowest': return (a.score / a.totalScore) - (b.score / b.totalScore);
                case 'newest': // Fallthrough
                default: return new Date(b.date) - new Date(a.date);
            }
        });

        // Update counts
        document.getElementById('examFilteredCount').textContent = filteredExams.length;
        document.getElementById('examTotalCount').textContent = this.exams.length;

        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const paginatedExams = filteredExams.slice(startIndex, endIndex);

        if (paginatedExams.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.style.textAlign = 'center';
            td.textContent = 'No exam records found with current filters.';
            tr.appendChild(td);
            examTableBody.appendChild(tr);
            return;
        }

        paginatedExams.forEach(exam => {
            const row = examTableBody.insertRow();

            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            // Get student name (students are plain objects)
            const student = window.studentManager.getStudents().find(s => s.id === exam.studentId);
            const studentName = student ? student.name : 'Unknown Student';
            
            // Get course name (courses are plain objects)
            const course = window.courseManager.getCourses().find(c => c.id === exam.courseId);
            const courseName = course ? course.name : 'Unknown Course';

            row.appendChild(makeCell('Student', studentName));
            row.appendChild(makeCell('Exam Type', exam.examType)); // Direct access
            row.appendChild(makeCell('Category', exam.category)); // Direct access
            row.appendChild(makeCell('Course', courseName));
            
            // Calculate percentage
            const score = exam.score; // Direct access
            const totalScore = exam.totalScore; // Direct access
            const percentage = totalScore ? Math.round((score / totalScore) * 100) : 0;
            row.appendChild(makeCell('Score', `${score}/${totalScore} (${percentage}%)`));
            
            const date = exam.date; // Direct access
            const formattedDate = date ? new Date(date).toLocaleDateString() : '';
            row.appendChild(makeCell('Date', formattedDate));

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');

            const editButton = document.createElement('button');
            editButton.className = 'button edit-button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => this.editExam(exam.id));

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => this.deleteExam(exam.id));

            actionsTd.appendChild(editButton);
            actionsTd.appendChild(deleteButton);
            row.appendChild(actionsTd);
        });
        this.updatePaginationControls(filteredExams.length);
        console.log("[ExamManager] Exam table rendered.");
    }

    async addOrUpdateExam(event) {
        event.preventDefault();
        const examStudentSelect = document.getElementById('examStudent');
        const examTypeSelect = document.getElementById('examType');
        const examCategoryInput = document.getElementById('examCategory');
        const examCourseSelect = document.getElementById('examCourse');
        const examScoreInput = document.getElementById('examScore');
        const examTotalScoreInput = document.getElementById('examTotalScore');
        const examDateInput = document.getElementById('examDate');

        const examData = {
            studentId: examStudentSelect.value,
            examType: examTypeSelect.value,
            category: examCategoryInput.value.trim(),
            courseId: examCourseSelect.value,
            score: parseInt(examScoreInput.value),
            totalScore: parseInt(examTotalScoreInput.value),
            date: examDateInput.value // YYYY-MM-DD string
        };

        if (!examData.studentId || !examData.examType || !examData.courseId || 
            isNaN(examData.score) || isNaN(examData.totalScore) || !examData.date) {
            window.Utils.showMessage('Student, Exam Type, Course, Score, Total Score, and Date are required. Scores must be numbers.', 'error');
            return;
        }

        if (examData.score > examData.totalScore) {
            window.Utils.showMessage('Score cannot be greater than total score.', 'error');
            return;
        }

        try {
            let savedExamJson;
            if (this.editingExamId) {
                // Updating existing exam record
                savedExamJson = await window.saveParseData('Exam', examData, this.editingExamId);
            } else {
                // Creating new exam record
                // Optional: Add a check for duplicate exam records for the same student/course/type/date
                savedExamJson = await window.saveParseData('Exam', examData);
            }
            
            if (savedExamJson) {
                console.log('Exam saved successfully', savedExamJson);
                window.Utils.showMessage('Exam record saved successfully!', 'success');
                this.resetExamForm(); // Reset form after successful save
                // loadAllData is called by saveParseData, no need to call it again
            } else {
                console.error("[ExamManager] Failed to save exam record via window.saveParseData.");
                window.Utils.showMessage('Failed to save exam record. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error adding or updating exam:', error);
            // Message handled by window.saveParseData
        }
    }

    editExam(id) {
        const examToEdit = this.exams.find(e => e.id === id);
        if (examToEdit) {
            document.getElementById('examStudent').value = examToEdit.studentId || '';
            document.getElementById('examType').value = examToEdit.examType || '';
            document.getElementById('examCategory').value = examToEdit.category || '';
            document.getElementById('examCourse').value = examToEdit.courseId || '';
            document.getElementById('examScore').value = examToEdit.score !== null && examToEdit.score !== undefined ? examToEdit.score : '';
            document.getElementById('examTotalScore').value = examToEdit.totalScore !== null && examToEdit.totalScore !== undefined ? examToEdit.totalScore : '';
            
            // Ensure date is in YYYY-MM-DD format for input type="date"
            const dateValue = examToEdit.date instanceof Date ? examToEdit.date.toISOString().split('T')[0] : examToEdit.date;
            if (dateValue) {
                document.getElementById('examDate').value = dateValue;
            }
            
            document.getElementById('exam-form-heading').textContent = 'Edit Exam Record';
            document.getElementById('saveExamBtn').textContent = 'Update Exam Record';
            document.getElementById('cancelExamBtn').style.display = 'inline-block';
            this.editingExamId = id;
            console.log("[ExamManager] Exam form populated for editing.");
        } else {
            console.warn(`[ExamManager] Exam with ID ${id} not found for editing.`);
            window.Utils.showMessage(`Exam with ID ${id} not found.`, 'warning');
        }
    }

    async deleteExam(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this exam record? This action cannot be undone.', async () => {
            const success = await window.deleteParseData('Exam', id);
            if (success) {
                console.log(`[ExamManager] Exam with ID ${id} deleted.`);
                // loadAllData called by deleteParseData
            } else {
                console.error(`[ExamManager] Failed to delete exam with ID ${id}.`);
            }
        });
    }

    resetExamForm() {
        const addExamForm = document.getElementById('addExamForm');
        if (addExamForm) {
            addExamForm.reset();
        }
        document.getElementById('exam-form-heading').textContent = 'Add New Exam Record';
        document.getElementById('saveExamBtn').textContent = 'Save Exam Record';
        document.getElementById('cancelExamBtn').style.display = 'none';
        this.editingExamId = null;
        console.log("[ExamManager] Exam form reset.");
    }

    /**
     * Get the top 5 lowest performing assignments based on average score.
     * @returns {Array} Array of assignment objects with name and averageScore.
     */
    getLowPerformingAssignments() {
        // Group exams by course and exam type
        const assignmentScores = {};
        
        this.exams.forEach(exam => {
            const courseId = exam.courseId; // Direct access
            const examType = exam.examType; // Direct access
            const course = window.courseManager.getCourses().find(c => c.id === courseId);
            const courseName = course ? course.name : 'Unknown Course';
            
            // Create a unique key for this assignment
            const assignmentKey = `${courseName} - ${examType}`;
            
            if (!assignmentScores[assignmentKey]) {
                assignmentScores[assignmentKey] = {
                    name: assignmentKey,
                    scores: []
                };
            }
            
            // Calculate percentage score
            const score = exam.score; // Direct access
            const totalScore = exam.totalScore; // Direct access
            if (score !== undefined && totalScore !== undefined && totalScore > 0) {
                const percentage = (score / totalScore) * 100;
                assignmentScores[assignmentKey].scores.push(percentage);
            }
        });
        
        // Calculate average scores for each assignment
        const assignments = Object.values(assignmentScores).map(assignment => {
            const total = assignment.scores.reduce((sum, score) => sum + score, 0);
            const averageScore = assignment.scores.length > 0 ? total / assignment.scores.length : 0;
            
            return {
                name: assignment.name,
                averageScore: Math.round(averageScore)
            };
        });
        
        // Sort by average score (lowest first) and take top 5
        return assignments
            .sort((a, b) => a.averageScore - b.averageScore)
            .slice(0, 5);
    }

    /**
     * Initializes event listeners for exam table filters and pagination controls.
     */
    initializeExamTableControls() {
        const examSearchInput = document.getElementById('examSearch');
        const examCourseFilterSelect = document.getElementById('examCourseFilter');
        const examTypeFilterSelect = document.getElementById('examTypeFilter');
        const examDateSortSelect = document.getElementById('examDateSort');
        const clearExamFiltersBtn = document.getElementById('clearExamFilters');
        const examPrevPageBtn = document.getElementById('examPrevPage');
        const examNextPageBtn = document.getElementById('examNextPage');
        const examPageSizeSelect = document.getElementById('examPageSize');

        if (examSearchInput) {
            examSearchInput.addEventListener('input', () => {
                this.searchTerm = examSearchInput.value.trim();
                this.currentPage = 1; // Reset to first page on new search
                this.renderExamTable();
            });
        }
        if (examCourseFilterSelect) {
            examCourseFilterSelect.addEventListener('change', () => {
                this.courseFilter = examCourseFilterSelect.value;
                this.currentPage = 1;
                this.renderExamTable();
            });
            window.courseManager.populateCourseDropdown(examCourseFilterSelect); // Populate course filter
        }
        if (examTypeFilterSelect) {
            examTypeFilterSelect.addEventListener('change', () => {
                this.typeFilter = examTypeFilterSelect.value;
                this.currentPage = 1;
                this.renderExamTable();
            });
        }
        if (examDateSortSelect) {
            examDateSortSelect.addEventListener('change', () => {
                this.sortBy = examDateSortSelect.value;
                this.renderExamTable();
            });
        }
        if (clearExamFiltersBtn) {
            clearExamFiltersBtn.addEventListener('click', () => {
                if (examSearchInput) examSearchInput.value = '';
                if (examCourseFilterSelect) examCourseFilterSelect.value = '';
                if (examTypeFilterSelect) examTypeFilterSelect.value = '';
                if (examDateSortSelect) examDateSortSelect.value = 'newest';
                
                this.searchTerm = '';
                this.courseFilter = '';
                this.typeFilter = '';
                this.sortBy = 'newest';
                this.currentPage = 1;
                this.renderExamTable();
            });
        }
        if (examPrevPageBtn) {
            examPrevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderExamTable();
                }
            });
        }
        if (examNextPageBtn) {
            examNextPageBtn.addEventListener('click', () => {
                // Determine max page based on filtered count
                const filteredCount = this.getFilteredExamsCount();
                const maxPage = Math.ceil(filteredCount / this.pageSize);
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    this.renderExamTable();
                }
            });
        }
        if (examPageSizeSelect) {
            examPageSizeSelect.addEventListener('change', () => {
                this.pageSize = parseInt(examPageSizeSelect.value);
                this.currentPage = 1; // Reset page when page size changes
                this.renderExamTable();
            });
        }
        console.log("[ExamManager] Exam table controls initialized.");
    }

    /**
     * Helper to get count of exams after applying filters (used for pagination logic).
     */
    getFilteredExamsCount() {
        let filteredExams = [...this.exams];
        if (this.searchTerm) {
            const lowerCaseSearch = this.searchTerm.toLowerCase();
            filteredExams = filteredExams.filter(exam =>
                (window.studentManager.getStudents().find(s => s.id === exam.studentId)?.name || '').toLowerCase().includes(lowerCaseSearch) ||
                (window.courseManager.getCourses().find(c => c.id === exam.courseId)?.name || '').toLowerCase().includes(lowerCaseSearch) ||
                (exam.examType || '').toLowerCase().includes(lowerCaseSearch) ||
                (exam.category || '').toLowerCase().includes(lowerCaseSearch)
            );
        }
        if (this.courseFilter) {
            filteredExams = filteredExams.filter(exam => exam.courseId === this.courseFilter);
        }
        if (this.typeFilter) {
            filteredExams = filteredExams.filter(exam => exam.examType === this.typeFilter);
        }
        return filteredExams.length;
    }

    /**
     * Updates pagination information displayed in the UI.
     */
    updatePaginationControls(filteredCount) {
        const examPageInfoSpan = document.getElementById('examPageInfo');
        const examPrevPageBtn = document.getElementById('examPrevPage');
        const examNextPageBtn = document.getElementById('examNextPage');
        const maxPage = Math.ceil(filteredCount / this.pageSize);

        if (examPageInfoSpan) {
            examPageInfoSpan.textContent = `Page ${this.currentPage} of ${maxPage || 1}`;
        }
        if (examPrevPageBtn) {
            examPrevPageBtn.disabled = this.currentPage === 1;
        }
        if (examNextPageBtn) {
            examNextPageBtn.disabled = this.currentPage === maxPage || maxPage === 0;
        }
    }

    /**
     * Updates exam table controls (e.g., pagination, counts) when data changes.
     */
    updateExamTableControls() {
        this.updatePaginationControls(this.getFilteredExamsCount());
    }
}

// Export for use in other modules
export default ExamManager;
