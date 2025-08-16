// js/examManager.js

class ExamManager {
    constructor() {
        this.exams = [];
        this.editingExamId = null;
    }

    setExams(exams) {
        this.exams = exams;
    }

    getExams() {
        return this.exams;
    }

    renderExamTable() {
        const examTableBody = document.querySelector('#examTable tbody');
        if (!examTableBody) return;
        examTableBody.innerHTML = '';
        if (this.exams.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.style.textAlign = 'center';
            td.textContent = 'No exam records added yet.';
            tr.appendChild(td);
            examTableBody.appendChild(tr);
            return;
        }
        this.exams.forEach(exam => {
            const row = examTableBody.insertRow();

            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            // Get student name
            const studentId = exam.get('studentId');
            const student = window.studentManager.getStudents().find(s => s.id === studentId);
            const studentName = student ? student.get('name') : 'Unknown Student';
            
            // Get course name
            const courseId = exam.get('courseId');
            const course = window.courseManager.getCourses().find(c => c.id === courseId);
            const courseName = course ? course.get('name') : 'Unknown Course';

            row.appendChild(makeCell('Student', studentName));
            row.appendChild(makeCell('Exam Type', exam.get('examType')));
            row.appendChild(makeCell('Category', exam.get('category')));
            row.appendChild(makeCell('Course', courseName));
            
            // Calculate percentage
            const score = exam.get('score');
            const totalScore = exam.get('totalScore');
            const percentage = totalScore ? Math.round((score / totalScore) * 100) : 0;
            row.appendChild(makeCell('Score', `${score}/${totalScore} (${percentage}%)`));
            
            const date = exam.get('date');
            const formattedDate = date ? new Date(date).toLocaleDateString() : '';
            row.appendChild(makeCell('Date', formattedDate));

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');
            actionsTd.className = 'actions';
            actionsTd.style.position = 'relative';
            actionsTd.style.zIndex = '1';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-button';
            editBtn.dataset.id = exam.id;
            editBtn.textContent = 'Edit';
            editBtn.style.position = 'relative';
            editBtn.style.zIndex = '2';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editExam(e.currentTarget.dataset.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.dataset.id = exam.id;
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.position = 'relative';
            deleteBtn.style.zIndex = '2';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteExam(e.currentTarget.dataset.id);
            });

            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
        });
    }

    async addOrUpdateExam(event) {
        event.preventDefault();
        const examStudentSelect = document.getElementById('examStudent');
        const examTypeSelect = document.getElementById('examType');
        const examCategorySelect = document.getElementById('examCategory');
        const examCourseSelect = document.getElementById('examCourse');
        const examScoreInput = document.getElementById('examScore');
        const examTotalScoreInput = document.getElementById('examTotalScore');
        const examDateInput = document.getElementById('examDate');

        const examData = {
            studentId: examStudentSelect.value,
            examType: examTypeSelect.value,
            category: examCategorySelect.value,
            courseId: examCourseSelect.value,
            score: parseInt(examScoreInput.value),
            totalScore: parseInt(examTotalScoreInput.value),
            date: examDateInput.value
        };

        if (!examData.studentId || !examData.examType || !examData.category || 
            !examData.courseId || !examData.score || !examData.totalScore || !examData.date) {
            window.Utils.showMessage('All fields are required.', 'error');
            return;
        }

        if (examData.score > examData.totalScore) {
            window.Utils.showMessage('Score cannot be greater than total score.', 'error');
            return;
        }

        try {
            let exam;
            if (this.editingExamId) {
                // Updating existing exam
                exam = await new Parse.Query('Exam').get(this.editingExamId);
            } else {
                // Creating new exam
                exam = new Parse.Object('Exam');
            }
            
            // Set exam properties
            exam.set('studentId', examData.studentId);
            exam.set('examType', examData.examType);
            exam.set('category', examData.category);
            exam.set('courseId', examData.courseId);
            exam.set('score', examData.score);
            exam.set('totalScore', examData.totalScore);
            exam.set('date', new Date(examData.date));

            const savedExam = await exam.save();
            console.log('Exam saved successfully', savedExam);
            window.Utils.showMessage('Exam record saved successfully!', 'success');
            
            this.resetExamForm();
            await window.loadAllData();
        } catch (error) {
            console.error('Error adding or updating exam:', error);
            window.Utils.showMessage('Error saving exam record. Please try again.', 'error');
        }
    }

    editExam(id) {
        const examToEdit = this.exams.find(e => e.id === id);
        if (examToEdit) {
            document.getElementById('examStudent').value = examToEdit.get('studentId');
            document.getElementById('examType').value = examToEdit.get('examType');
            document.getElementById('examCategory').value = examToEdit.get('category');
            document.getElementById('examCourse').value = examToEdit.get('courseId');
            document.getElementById('examScore').value = examToEdit.get('score');
            document.getElementById('examTotalScore').value = examToEdit.get('totalScore');
            const date = examToEdit.get('date');
            if (date) {
                document.getElementById('examDate').value = new Date(date).toISOString().split('T')[0];
            }
            
            document.getElementById('exam-form-heading').textContent = 'Edit Exam Record';
            document.getElementById('saveExamBtn').textContent = 'Update Exam Record';
            document.getElementById('cancelExamBtn').style.display = 'inline-block';
            this.editingExamId = id;
        }
    }

    async deleteExam(id) {
        window.Utils.showConfirmDialog('Are you sure you want to delete this exam record? This action cannot be undone.', async () => {
            await window.deleteParseData('Exam', id);
        });
    }

    resetExamForm() {
        document.getElementById('addExamForm').reset();
        document.getElementById('exam-form-heading').textContent = 'Add New Exam Record';
        document.getElementById('saveExamBtn').textContent = 'Save Exam Record';
        document.getElementById('cancelExamBtn').style.display = 'none';
        this.editingExamId = null;
    }
    
    /**
     * Get low performing assignments based on average scores
     * @returns {Array} Array of assignments with their average scores
     */
    getLowPerformingAssignments() {
        // Group exams by course and exam type
        const assignmentScores = {};
        
        this.exams.forEach(exam => {
            const courseId = exam.get('courseId');
            const examType = exam.get('examType');
            const course = window.courseManager.getCourses().find(c => c.id === courseId);
            const courseName = course ? course.get('name') : 'Unknown Course';
            
            // Create a unique key for this assignment
            const assignmentKey = `${courseName} - ${examType}`;
            
            if (!assignmentScores[assignmentKey]) {
                assignmentScores[assignmentKey] = {
                    name: assignmentKey,
                    scores: []
                };
            }
            
            // Calculate percentage score
            const score = exam.get('score');
            const totalScore = exam.get('totalScore');
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExamManager;
} else {
    window.ExamManager = ExamManager;
}