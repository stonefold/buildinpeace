import React from 'react';

const BuildInPeace = () => {
  return (
    <div className="bg-white text-gray-800 p-6 rounded-md shadow-lg mt-6 flex flex-col sm:flex-row items-center justify-center text-center sm:text-left">
      <img 
        src="/assets/logo.jfif"  // Chemin correct pour acceder a l'image dans public/assets
        alt="Logo" 
        className="w-10 h-10 mb-4 sm:mb-0 sm:mr-6"
      />
      <h2 className="text-xl sm:text-2xl font-light tracking-wide">Build In Peace</h2>
    </div>
  );
};

export default BuildInPeace;
