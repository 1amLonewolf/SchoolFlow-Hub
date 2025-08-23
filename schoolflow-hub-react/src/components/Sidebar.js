import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const getLinkClass = (path) => {
    // For the root path, we want to match exactly
    if (path === '/' && location.pathname === '/') {
      return 'active';
    }
    // For other paths, we check if the current path starts with the link path
    if (path !== '/' && location.pathname.startsWith(path)) {
      return 'active';
    }
    return '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  return (
    <aside 
      className={`sidebar ${isOpen ? 'open' : ''}`} 
      id="sidebar" 
      role="navigation"
    >
      <div className="sidebar-brand">
        <img src="/SchoolFlow-Hub.png" alt="SchoolFlow Hub logo" className="sidebar-logo" width="96" height="96" />
      </div>
      <Link to="/overview" className={`sidebar-link ${getLinkClass('/overview')}`} onClick={onClose}>Overview</Link>
      <Link to="/students" className={`sidebar-link ${getLinkClass('/students')}`} onClick={onClose}>Students</Link>
      <Link to="/teachers" className={`sidebar-link ${getLinkClass('/teachers')}`} onClick={onClose}>Teachers</Link>
      <Link to="/courses" className={`sidebar-link ${getLinkClass('/courses')}`} onClick={onClose}>Courses</Link>
      <Link to="/attendance" className={`sidebar-link ${getLinkClass('/attendance')}`} onClick={onClose}>Attendance</Link>
      <Link to="/exams" className={`sidebar-link ${getLinkClass('/exams')}`} onClick={onClose}>Exams</Link>
      <Link to="/seasons" className={`sidebar-link ${getLinkClass('/seasons')}`} onClick={onClose}>Seasons</Link>
      <Link to="/graduation" className={`sidebar-link ${getLinkClass('/graduation')}`} onClick={onClose}>Graduation</Link>
      <Link to="/reports-analytics" className={`sidebar-link ${getLinkClass('/reports-analytics')}`} onClick={onClose}>Reports & Analytics</Link>
      <Link to="/settings" className={`sidebar-link ${getLinkClass('/settings')}`} onClick={onClose}>Settings</Link>
      <div className="sidebar-footer">
        <button id="logoutBtn" className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </aside>
  );
};

export default Sidebar;