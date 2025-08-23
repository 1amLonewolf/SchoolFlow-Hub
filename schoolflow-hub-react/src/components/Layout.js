import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      {isSidebarOpen && <div className="sidebar-overlay visible" onClick={closeSidebar}></div>}
      <main className="main-content">
        <div className="header-content">
          <button className="burger" type="button" aria-label="Toggle sidebar" onClick={toggleSidebar}>
            &#9776;
          </button>
          <h1>SchoolFlow-Hub</h1>
          <div className="admin-welcome">
            <span id="welcomeMessage">Welcome, Admin</span>
          </div>
        </div>
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;