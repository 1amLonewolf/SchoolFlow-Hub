import React from 'react';
import { useSeasons } from '../hooks/useSeasons';

const SeasonsPage = () => {
  const { 
    currentSeason, 
    seasons, 
    loading, 
    error, 
    advanceToNextSeason, 
    archiveCurrentSeason 
  } = useSeasons();

  const handleAdvanceSeason = async () => {
    if (window.confirm(`Are you sure you want to advance to Season ${currentSeason + 1}? This will archive all current students and courses.`)) {
      const result = await advanceToNextSeason();
      if (result.success) {
        alert(`Advanced to Season ${currentSeason + 1}. Previous season archived.`);
      } else {
        alert(`Error advancing season: ${result.error}`);
      }
    }
  };

  const handleArchiveSeason = async () => {
    if (window.confirm(`Are you sure you want to archive Season ${currentSeason}? This will mark all current students as inactive.`)) {
      const result = await archiveCurrentSeason();
      if (result.success) {
        alert(`Archived Season ${currentSeason}.`);
      } else {
        alert(`Error archiving season: ${result.error}`);
      }
    }
  };

  if (loading) {
    return <div>Loading seasons data...</div>;
  }

  if (error) {
    return <div>Error loading seasons: {error}</div>;
  }

  return (
    <div>
      <h2>Season Management</h2>
      <div className="card">
        <h3>Current Season</h3>
        <div className="season-info">
          <p>Current Season: <strong>Season <span id="currentSeasonNumber">{currentSeason}</span></strong></p>
          <p>Total Students: <strong><span id="currentSeasonStudentCount">
            {seasons.find(s => s.number === currentSeason)?.studentCount || 0}
          </span></strong></p>
          <p>Total Courses: <strong><span id="currentSeasonCourseCount">
            {seasons.find(s => s.number === currentSeason)?.courseCount || 0}
          </span></strong></p>
        </div>
        <div className="season-actions">
          <button 
            className="button primary-button" 
            id="advanceSeasonBtn"
            onClick={handleAdvanceSeason}
          >
            Advance to Next Season
          </button>
          <button 
            className="button secondary-button" 
            id="archiveCurrentSeasonBtn"
            onClick={handleArchiveSeason}
          >
            Archive Current Season
          </button>
        </div>
      </div>
      
      <div className="card">
        <h3>Season History</h3>
        <div className="table-container">
          <table id="seasonsTable">
            <thead>
              <tr>
                <th>Season</th>
                <th>Students</th>
                <th>Courses</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seasons.length > 0 ? (
                seasons.map(season => (
                  <tr key={season.id}>
                    <td>Season {season.number}</td>
                    <td>{season.studentCount}</td>
                    <td>{season.courseCount}</td>
                    <td>{season.status}</td>
                    <td>
                      {season.status === 'Active' ? (
                        <button className="button secondary-button" style={{padding: '0.25rem 0.5rem'}}>
                          View
                        </button>
                      ) : (
                        <button className="button secondary-button" style={{padding: '0.25rem 0.5rem'}}>
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>No season data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="card">
        <h3>Season Reports</h3>
        <div className="season-reports">
          <button className="button secondary-button" id="exportCurrentSeasonBtn">Export Current Season Data</button>
          <button className="button secondary-button" id="exportAllSeasonsBtn">Export All Seasons Summary</button>
        </div>
      </div>
    </div>
  );
};

export default SeasonsPage;