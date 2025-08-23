import React, { useState, useEffect } from 'react';

const SettingsPage = () => {
  const [darkMode, setDarkMode] = useState(false);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  // Apply dark mode class to body when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleResetPreferences = () => {
    if (window.confirm('Are you sure you want to reset all preferences?')) {
      setDarkMode(false);
      localStorage.removeItem('darkMode');
      alert('Preferences reset successfully!');
    }
  };

  return (
    <div>
      <h2>Settings</h2>
      <div className="settings-grid">
        <div className="setting-card card">
          <h3>Appearance</h3>
          <div className="setting-content">
            <label className="switch">
              Dark Mode
              <input 
                type="checkbox" 
                id="settingsDarkModeToggle" 
                checked={darkMode}
                onChange={handleToggleDarkMode}
              />
              <span className="slider"></span>
            </label>
            <p>Toggle dark theme for the dashboard interface.</p>
            <button 
              className="button secondary-button" 
              id="resetPreferencesBtn"
              onClick={handleResetPreferences}
            >
              Reset Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;