import { useState } from 'react';

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCsv = (data, filename) => {
    setIsExporting(true);
    
    try {
      // Convert data to CSV format
      const csvContent = convertToCsv(data);
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJson = (data, filename) => {
    setIsExporting(true);
    
    try {
      // Convert data to JSON format
      const jsonContent = JSON.stringify(data, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCsv = (data) => {
    if (!data || data.length === 0) {
      return '';
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create header row
    const headerRow = headers.join(',');
    
    // Create data rows
    const dataRows = data.map(obj => {
      return headers.map(header => {
        const value = obj[header] || '';
        // Escape quotes and wrap in quotes if necessary
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',');
    });
    
    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n');
  };

  return {
    isExporting,
    exportToCsv,
    exportToJson
  };
};