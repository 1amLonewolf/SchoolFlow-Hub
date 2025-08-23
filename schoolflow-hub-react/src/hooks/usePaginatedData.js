import { useState, useEffect } from 'react';
import Parse from 'parse';

export const usePaginatedData = (parseClass, options = {}) => {
  const {
    pageSize = 25,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    include = []
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = async (page) => {
    try {
      setLoading(true);
      setError(null);
      
      const Class = Parse.Object.extend(parseClass);
      const query = new Parse.Query(Class);
      
      // Apply sorting
      if (sortOrder === 'desc') {
        query.descending(sortBy);
      } else {
        query.ascending(sortBy);
      }
      
      // Apply includes for relational data
      include.forEach(rel => query.include(rel));
      
      // Apply pagination
      query.limit(pageSize);
      query.skip((page - 1) * pageSize);
      
      // Get data and count
      const [results, count] = await Promise.all([
        query.find(),
        query.count()
      ]);
      
      setData(results);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / pageSize));
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const refresh = () => {
    fetchPage(currentPage);
  };

  useEffect(() => {
    fetchPage(1);
  }, [parseClass, pageSize, sortBy, sortOrder, ...include]);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  };
};