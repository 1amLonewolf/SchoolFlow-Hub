// js/seasonManager.js

class SeasonManager {
    constructor() {
        // Initialize with a default current season. This should eventually come from Parse if you track current season in DB.
        this.currentSeason = parseInt(localStorage.getItem('schoolflowCurrentSeason')) || 1;
        this.seasons = []; // To store all unique season numbers found in data
    }

    getCurrentSeason() {
        return this.currentSeason;
    }

    setCurrentSeason(seasonNumber) {
        this.currentSeason = seasonNumber;
        localStorage.setItem('schoolflowCurrentSeason', seasonNumber); // Persist
        console.log(`[Season Management] Current season set to: ${this.currentSeason}`);
        
        // Update UI displays immediately (loadAllData will trigger full refresh)
        this.updateSeasonDisplay();
        
        // Refresh dashboard data to show relevant students/courses for new season
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
        
        // Update student and course counts for the current season
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
        console.log("[SeasonManager] Season display updated.");
    }

    /**
     * Get all unique season IDs present in student and course data.
     * @returns {Array<number>} Sorted array of unique season numbers.
     */
    getAllSeasons() {
        const seasons = new Set();
        
        // Collect all season IDs from students (plain objects)
        window.studentManager.getStudents().forEach(student => {
            const seasonId = student.season; // Direct access
            if (seasonId) {
                seasons.add(seasonId);
            }
        });
        
        // Collect all season IDs from courses (plain objects)
        window.courseManager.getCourses().forEach(course => {
            const seasonId = course.seasonId; // Direct access
            if (seasonId) {
                seasons.add(seasonId);
            }
        });
        
        // Convert to sorted array
        this.seasons = Array.from(seasons).sort((a, b) => a - b);
        return this.seasons;
    }

    /**
     * Renders the season history table.
     */
    renderSeasonsTable() {
        const seasonsTableBody = document.querySelector('#seasonsTable tbody');
        if (!seasonsTableBody) {
            console.warn("Seasons table body not found.");
            return;
        }
        seasonsTableBody.innerHTML = '';

        const allUniqueSeasons = this.getAllSeasons();

        if (allUniqueSeasons.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.textContent = 'No season data available yet.';
            tr.appendChild(td);
            seasonsTableBody.appendChild(tr);
            return;
        }

        allUniqueSeasons.forEach(seasonNum => {
            const row = seasonsTableBody.insertRow();
            const makeCell = (label, value) => {
                const td = document.createElement('td');
                td.setAttribute('data-label', label);
                td.textContent = value ?? '';
                return td;
            };

            const studentsInSeason = window.studentManager.getStudentsBySeason(seasonNum);
            const coursesInSeason = window.courseManager.getCoursesBySeason(seasonNum);

            const status = seasonNum === this.getCurrentSeason() ? 'Active' : 'Archived';

            row.appendChild(makeCell('Season', seasonNum));
            row.appendChild(makeCell('Students', studentsInSeason.length));
            row.appendChild(makeCell('Courses', coursesInSeason.length));
            row.appendChild(makeCell('Status', status));

            const actionsTd = document.createElement('td');
            actionsTd.setAttribute('data-label', 'Actions');

            if (status === 'Active') {
                const archiveButton = document.createElement('button');
                archiveButton.className = 'button secondary-button';
                archiveButton.textContent = 'Archive Season';
                archiveButton.addEventListener('click', () => this.archiveCurrentSeason()); // Direct call
                actionsTd.appendChild(archiveButton);
            } else {
                // You could add a "View Details" button for archived seasons if desired
                const viewDetailsButton = document.createElement('button');
                viewDetailsButton.className = 'button secondary-button';
                viewDetailsButton.textContent = 'View Details';
                viewDetailsButton.disabled = true; // Placeholder
                actionsTd.appendChild(viewDetailsButton);
            }
            row.appendChild(actionsTd);
        });
        console.log("[SeasonManager] Seasons table rendered.");
    }

    /**
     * Advances the academic season to the next number.
     * Archives all current students and courses (sets isActive to false).
     */
    async advanceToNextSeason() {
        const nextSeason = this.getCurrentSeason() + 1;
        
        window.Utils.showConfirmDialog(`Are you sure you want to advance to Season ${nextSeason}? This will archive all current students and courses.`, async () => {
            try {
                // Archive current season students
                const currentStudents = window.studentManager.getStudentsBySeason(this.getCurrentSeason());
                let archivedStudentsCount = 0;
                
                for (const student of currentStudents) {
                    try {
                        const updatedStudentData = { ...student, isActive: false }; // Create copy, set isActive
                        const saved = await window.saveParseData('Student', updatedStudentData, student.id);
                        if (saved) {
                            archivedStudentsCount++;
                        }
                    } catch (error) {
                        console.error(`Error archiving student ${student.id}:`, error);
                        window.Utils.showMessage(`Failed to archive student ${student.name}.`, 'error');
                    }
                }

                // Archive current season courses (optional, but good practice for consistency)
                const currentCourses = window.courseManager.getCoursesBySeason(this.getCurrentSeason());
                let archivedCoursesCount = 0;
                for (const course of currentCourses) {
                    try {
                        const updatedCourseData = { ...course, isActive: false };
                        const saved = await window.saveParseData('Course', updatedCourseData, course.id);
                        if (saved) {
                            archivedCoursesCount++;
                        }
                    } catch (error) {
                        console.error(`Error archiving course ${course.id}:`, error);
                        window.Utils.showMessage(`Failed to archive course ${course.name}.`, 'error');
                    }
                }
                
                // Set new current season
                this.setCurrentSeason(nextSeason); // This will trigger loadAllData()
                window.Utils.showMessage(`Advanced to Season ${nextSeason}. Archived ${archivedStudentsCount} students and ${archivedCoursesCount} courses from previous season.`, 'success');
                console.log(`[SeasonManager] Advanced to Season ${nextSeason}.`);
            } catch (error) {
                console.error('Error advancing season:', error);
                window.Utils.showMessage('Error advancing season. Please try again.', 'error');
            }
        });
    }

    /**
     * Archives all students and courses from the current season (sets isActive to false).
     */
    async archiveCurrentSeason() {
        window.Utils.showConfirmDialog(`Are you sure you want to archive Season ${this.getCurrentSeason()}? This will mark all current students and courses as inactive.`, async () => {
            try {
                // Archive current season students
                const currentStudents = window.studentManager.getStudentsBySeason(this.getCurrentSeason());
                let archivedStudentsCount = 0;
                
                for (const student of currentStudents) {
                    try {
                        if (student.isActive !== false) { // Only update if not already inactive
                            const updatedStudentData = { ...student, isActive: false };
                            const saved = await window.saveParseData('Student', updatedStudentData, student.id);
                            if (saved) {
                                archivedStudentsCount++;
                            }
                        }
                    } catch (error) {
                        console.error(`Error archiving student ${student.id}:`, error);
                        window.Utils.showMessage(`Failed to archive student ${student.name}.`, 'error');
                    }
                }

                // Archive current season courses
                const currentCourses = window.courseManager.getCoursesBySeason(this.getCurrentSeason());
                let archivedCoursesCount = 0;
                for (const course of currentCourses) {
                    try {
                        if (course.isActive !== false) { // Only update if not already inactive
                            const updatedCourseData = { ...course, isActive: false };
                            const saved = await window.saveParseData('Course', updatedCourseData, course.id);
                            if (saved) {
                                archivedCoursesCount++;
                            }
                        }
                    } catch (error) {
                        console.error(`Error archiving course ${course.id}:`, error);
                        window.Utils.showMessage(`Failed to archive course ${course.name}.`, 'error');
                    }
                }
                
                window.Utils.showMessage(`Archived ${archivedStudentsCount} students and ${archivedCoursesCount} courses from Season ${this.getCurrentSeason()}.`, 'success');
                // loadAllData is called by saveParseData for each update, so UI should refresh progressively
                // A final loadAllData might be redundant but ensures full consistency if issues occur
                window.loadAllData(); // Trigger full refresh after all archives are done
                console.log(`[SeasonManager] Archived Season ${this.getCurrentSeason()}.`);
            } catch (error) {
                console.error('Error archiving season:', error);
                window.Utils.showMessage('Error archiving season. Please try again.', 'error');
            }
        });
    }
}

// Export for use in other modules
export default SeasonManager;
