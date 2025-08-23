import { useState, useEffect } from 'react';
import Parse from 'parse';

export const useSeasons = () => {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // In a real app, you would fetch the current season from the backend
  // For now, we'll simulate this with local storage
  useEffect(() => {
    const savedSeason = localStorage.getItem('currentSeason');
    if (savedSeason) {
      setCurrentSeason(parseInt(savedSeason));
    }
    
    // Simulate fetching seasons data
    const mockSeasons = [
      { id: 1, number: 1, studentCount: 45, courseCount: 8, status: 'Active' },
      { id: 2, number: 2, studentCount: 38, courseCount: 7, status: 'Archived' },
      { id: 3, number: 3, studentCount: 52, courseCount: 9, status: 'Archived' }
    ];
    setSeasons(mockSeasons);
    setLoading(false);
  }, []);

  const advanceToNextSeason = async () => {
    try {
      const nextSeason = currentSeason + 1;
      
      // In a real app, you would make an API call here to archive current students
      // and set the new season
      
      // For now, we'll just update local state
      setCurrentSeason(nextSeason);
      localStorage.setItem('currentSeason', nextSeason.toString());
      
      // Update seasons list
      setSeasons(prev => {
        // Mark current season as archived
        const updatedSeasons = prev.map(season => 
          season.number === currentSeason 
            ? { ...season, status: 'Archived' } 
            : season
        );
        
        // Add new season if it doesn't exist
        if (!updatedSeasons.find(s => s.number === nextSeason)) {
          updatedSeasons.push({
            id: nextSeason,
            number: nextSeason,
            studentCount: 0,
            courseCount: 0,
            status: 'Active'
          });
        }
        
        return updatedSeasons;
      });
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const archiveCurrentSeason = async () => {
    try {
      // In a real app, you would make an API call here to archive current students
      
      // For now, we'll just update local state
      setSeasons(prev => 
        prev.map(season => 
          season.number === currentSeason 
            ? { ...season, status: 'Archived' } 
            : season
        )
      );
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    currentSeason,
    seasons,
    loading,
    error,
    advanceToNextSeason,
    archiveCurrentSeason
  };
};