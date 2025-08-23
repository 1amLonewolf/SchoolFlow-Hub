import { useState, useEffect } from 'react';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useCachedData = (key, fetchDataFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cachedItem = cache.get(key);
    const now = Date.now();

    // Check if we have valid cached data
    if (cachedItem && (now - cachedItem.timestamp) < CACHE_DURATION) {
      setData(cachedItem.data);
      setLoading(false);
      return;
    }

    // Fetch fresh data
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchDataFn();
        setData(result);
        
        // Cache the result
        cache.set(key, {
          data: result,
          timestamp: now
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies); // Re-fetch when dependencies change

  const invalidateCache = () => {
    cache.delete(key);
  };

  return { data, loading, error, invalidateCache };
};