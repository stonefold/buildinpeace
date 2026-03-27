import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <nav className="flex justify-between items-center bg-white py-4 px-4 sm:px-8 shadow-lg">
      <div className="flex items-center">
        <img 
          src="/assets/logo.jfif" 
          alt="Logo" 
          className="w-8 h-8 mr-3"
        />
        <h1 className="text-xl sm:text-2xl text-gray-800 font-light tracking-wide">Build In Peace</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button
          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-500 shadow-sm transition duration-300"
          onClick={handleLoginClick}
        >
          Connexion
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
