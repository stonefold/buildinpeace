import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTasks, faClipboardList, faFileAlt, faComments, faUserFriends, faCog, faChevronLeft, faChevronRight, faBell } from '@fortawesome/free-solid-svg-icons';
import Chantier from './Chantier';

const Dashboard = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true); // Sidebar collapsed by default
  const [showNotifications, setShowNotifications] = useState(false); // State to show/hide notifications submenu

  const isChantiersPage = location.pathname.includes('/dashboard/chantiers');

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications); // Toggle notifications submenu
  };

  // Gray color scheme to match Chantier component
  const bgColor = '#F8F9FA'; // Light gray background for the entire dashboard
  const hoverBgColor = '#E9ECEF'; // Slightly darker gray for hover effects
  const textColor = '#495057'; // Dark gray for text
  const hoverBorderColor = '#6C757D'; // Medium gray for hover border

  // Sample notifications
  const notifications = [
    { id: 1, text: 'Nouvelle tâche assignée dans le chantier A.' },
    { id: 2, text: 'Nouveau message dans le chat.' },
    { id: 3, text: 'Document partagé dans le chantier B.' },
  ];

  return (
    <div className="flex flex-col h-screen lg:flex-row" style={{ backgroundColor: bgColor }}>
      {/* Sidebar for large screens */}
      <div
        className={`hidden lg:flex transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-full lg:w-1/5'} flex-col py-2`}
        style={{ backgroundColor: bgColor, color: textColor }}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <div className="flex items-center justify-between px-4">
          <h1 className={`text-xl font-light transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'}`} style={{ fontFamily: 'Arial, sans-serif', fontWeight: '300' }}>
            Build In Peace
          </h1>
          <button onClick={toggleSidebar} className="text-gray-600">
            <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronLeft} />
          </button>
        </div>

        <div className="w-3/4 h-px my-2" style={{ backgroundColor: textColor }}></div> {/* Gray separator */}

        <ul className="space-y-4">
          {[
            { icon: faTasks, label: 'Gestion des chantiers', to: '/dashboard/chantiers' },
            { icon: faClipboardList, label: 'Tâches personnelles', to: '/dashboard/todo' },
           
            { icon: faUserFriends, label: 'Gestion des amis', to: '/dashboard/amis' },
            { icon: faCog, label: 'Configuration du profil', to: '/dashboard/profil' },
          ].map(({ icon, label, to }) => (
            <li key={label}>
              <Link
                to={to}
                className="flex items-center justify-center py-1 px-2 hover:border hover:rounded-md transition-all duration-300"
                style={{
                  backgroundColor: isCollapsed ? 'transparent' : hoverBgColor,
                  borderColor: hoverBorderColor,
                }}
              >
                <FontAwesomeIcon icon={icon} className="text-lg" /> {/* Icon size reduced */}
                {!isCollapsed && <span className="ml-2 text-base" style={{ fontWeight: '300', color: textColor }}>{label}</span>} {/* Text in dark gray */}
              </Link>
            </li>
          ))}

          {/* Notifications Menu */}

        </ul>
      </div>

      {/* Mobile menu - displayed at the bottom */}
      <div
        className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around py-2"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {[
          { icon: faTasks, label: 'Chantiers', to: '/dashboard/chantiers' },
          { icon: faClipboardList, label: 'To Do', to: '/dashboard/todo' },
      
          { icon: faUserFriends, label: 'Amis', to: '/dashboard/amis' },
          { icon: faCog, label: 'Profils', to: '/dashboard/profil' },
        ].map(({ icon, label, to }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center"
          >
            <FontAwesomeIcon icon={icon} className="text-lg" />
            <span className="text-xs mt-1" style={{ color: textColor }}>{label}</span> {/* Text in dark gray */}
          </Link>
        ))}
      </div>

      {/* Main content */}
      <div className="w-full lg:w-4/5 p-4 lg:p-8 flex flex-col space-y-6">
        {/* Chantier Management Section */}
        {isChantiersPage && <Chantier />}

        {/* Outlet for child routes */}
        <div className="flex-grow">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
