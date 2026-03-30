import React, { useState } from 'react';

const ChantierSubMenu = () => {
  const [showSubMenu, setShowSubMenu] = useState(false);

  const toggleSubMenu = () => {
    setShowSubMenu(!showSubMenu);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Bouton pour afficher le sous-menu */}
      <button 
        onClick={toggleSubMenu} 
        className="bg-purple-400 text-white font-bold py-2 px-6 rounded hover:bg-purple-500"
      >
        Chantier
      </button>

      {showSubMenu && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 w-full">
          {/* Sous-menus adaptes pour les petits ecrans */}
          <div className="bg-purple-200 p-4 rounded text-center">
            <p>Offre</p>
          </div>
          <div className="bg-purple-200 p-4 rounded text-center">
            <p>Conversations</p>
          </div>
          <div className="bg-purple-200 p-4 rounded text-center">
            <p>Acteurs</p>
          </div>
          <div className="bg-purple-200 p-4 rounded text-center">
            <p>Documents</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChantierSubMenu;
