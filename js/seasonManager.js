// js/seasonManager.js

class SeasonManager {
    constructor() {
        this.currentSeason = 1;
    }

    getCurrentSeason() {
        return this.currentSeason;
    }

    setCurrentSeason(seasonNumber) {
        this.currentSeason = seasonNumber;
        console.log(`[Season Management] Current season set to: ${this.currentSeason}`);
        
        // Update UI to reflect new season
        this.updateSeasonDisplay();
        
        // Refresh dashboard data
        window.loadAllData();
    }

    updateSeasonDisplay() {
        // Update current season display in overview
        const currentSeasonDisplay = document.getElementById('currentSeasonDisplay');
        if (currentSeasonDisplay) {
            currentSeasonDisplay.textContent = this.getCurrentSeason();
        }
        
        // Update season info in seasons tab
        const currentSeasonNumber = document.getElementById('currentSeasonNumber');
        if (currentSeasonNumber) {
            currentSeasonNumber.textContent = this.getCurrentSeason();
        }
        
        // Update student and course counts
        const activeStudents = window.studentManager.getStudentsBySeason(this.getCurrentSeason());
        const activeCourses = window.courseManager.getCoursesBySeason(this.getCurrentSeason());
        
        const currentSeasonStudentCount = document.getElementById('currentSeasonStudentCount');
        if (currentSeasonStudentCount) {
            currentSeasonStudentCount.textContent = activeStudents.length;
        }
        
        const currentSeasonCourseCount = document.getElementById('currentSeasonCourseCount');
        if (currentSeasonCourseCount) {
            currentSeasonCourseCount.textContent = activeCourses.length;
        }
    }

    getAllSeasons() {
        const seasons = new Set();
        
        // Collect all season IDs from students
        window.studentManager.getStudents().forEach(student => {
            const seasonId = student.seasonId;
            if (seasonId) {
                seasons.add(seasonId);
            }
        });
        
        // Collect all season IDs from courses
        window.courseManager.getCourses().forEach(course => {
            const seasonId = course.seasonId;
            if (seasonId) {
                seasons.add(seasonId);
            }
        });
        
        // Convert to sorted array
        return Array.from(seasons).sort((a, b) => a - b);
    }

    renderSeasonsTable() {
        const tableBody = document.querySelector('#seasonsTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const seasons = this.getAllSeasons();
        
        if (seasons.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.textContent = 'No season data available.';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }
        
        seasons.forEach(seasonId => {
            const row = tableBody.insertRow();
            
            const studentsInSeason = window.studentManager.getStudentsBySeason(seasonId);
            const coursesInSeason = window.courseManager.getCoursesBySeason(seasonId);
            const isCurrentSeason = seasonId === this.getCurrentSeason();
            const status = isCurrentSeason ? 'Active' : 'Archived';
            
            const makeCell = (value) => {
                const td = document.createElement('td');
                td.textContent = value;
                return td;
            };
            
            row.appendChild(makeCell(`Season ${seasonId}`));
            row.appendChild(makeCell(studentsInSeason.length));
            row.appendChild(makeCell(coursesInSeason.length));
            row.appendChild(makeCell(status));
            
            const actionsTd = document.createElement('td');
            if (isCurrentSeason) {
                const viewBtn = document.createElement('button');
                viewBtn.className = 'button secondary-button';
                viewBtn.textContent = 'View';
                viewBtn.style.marginRight = '10px';
                viewBtn.addEventListener('click', () => {
                    // Switch to overview tab to view this season's data
                    this.setCurrentSeason(seasonId);
                    window.switchToTab('overview');
                });
                actionsTd.appendChild(viewBtn);
            } else {
                const restoreBtn = document.createElement('button');
                restoreBtn.className = 'button secondary-button';
                restoreBtn.textContent = 'Restore';
                restoreBtn.style.marginRight = '10px';
                restoreBtn.addEventListener('click', () => {
                    this.setCurrentSeason(seasonId);
                    window.Utils.showMessage(`Season ${seasonId} is now the current season.`, 'success');
                });
                actionsTd.appendChild(restoreBtn);
            }
            row.appendChild(actionsTd);
        });
    }

    async advanceToNextSeason() {
        const nextSeason = this.getCurrentSeason() + 1;
        
        window.Utils.showConfirmDialog(`Are you sure you want to advance to Season ${nextSeason}? This will archive all current students and courses.`, async () => {
            try {
                // Archive current season students
                const currentStudents = window.studentManager.getStudentsBySeason(this.getCurrentSeason());
                for (const student of currentStudents) {
                    try {
                        // Use the centralized archiveStudent function to update the student
                        await window.archiveStudent(student.id);
                    } catch (error) {
                        console.error(`Error archiving student ${student.id}:`, error);
                    }
                }
                
                // Set new current season
                this.setCurrentSeason(nextSeason);
                window.Utils.showMessage(`Advanced to Season ${nextSeason}. Previous season archived.`, 'success');
            } catch (error) {
                console.error('Error advancing season:', error);
                window.Utils.showMessage('Error advancing season. Please try again.', 'error');
            }
        });
    }

    async archiveCurrentSeason() {
        window.Utils.showConfirmDialog(`Are you sure you want to archive Season ${this.getCurrentSeason()}? This will mark all current students as inactive.`, async () => {
            try {
                // Archive current season students
                const currentStudents = window.studentManager.getStudentsBySeason(this.getCurrentSeason());
                let archivedCount = 0;
                
                for (const student of currentStudents) {
                    try {
                        // Use the centralized archiveStudent function to update the student
                        const studentObj = await window.archiveStudent(student.id);
                        if (studentObj.isActive !== false) {
                            archivedCount++;
                        }
                    } catch (error) {
                        console.error(`Error archiving student ${student.id}:`, error);
                    }
                }
                
                window.Utils.showMessage(`Archived ${archivedCount} students from Season ${this.getCurrentSeason()}.`, 'success');
                await window.loadAllData();
            } catch (error) {
                console.error('Error archiving season:', error);
                window.Utils.showMessage('Error archiving season. Please try again.', 'error');
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SeasonManager;
} else {
    window.SeasonManager = SeasonManager;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SeasonManager;
} else {
    window.SeasonManager = SeasonManager;
}