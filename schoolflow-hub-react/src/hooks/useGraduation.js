import { useState, useEffect } from 'react';
import Parse from 'parse';

export const useGraduation = () => {
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, you would implement the actual eligibility logic here
      // For now, we'll simulate with mock data
      const mockEligibleStudents = [
        { id: 1, name: 'John Doe', course: 'Computer Science' },
        { id: 2, name: 'Jane Smith', course: 'Mathematics' },
        { id: 3, name: 'Robert Johnson', course: 'Physics' }
      ];
      
      setEligibleStudents(mockEligibleStudents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // In a real app, you might want to automatically check eligibility when the hook is used
  // useEffect(() => {
  //   checkEligibility();
  // }, []);

  return {
    eligibleStudents,
    loading,
    error,
    checkEligibility
  };
};