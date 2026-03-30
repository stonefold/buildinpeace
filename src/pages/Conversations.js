import React from 'react';
import { useParams } from 'react-router-dom';

const Conversations = () => {
  const { chantierId } = useParams();

  return (
    <div className="p-4 lg:p-8"> {/* Ajustement des marges pour petits et grands ecrans */}
      <h2 className="text-xl lg:text-2xl font-bold text-[#4433b9] mb-4">Conversations pour {chantierId}</h2> {/* Responsive font size */}
      <p className="text-sm lg:text-base"> {/* Taille de texte ajustee pour les petits ecrans */}
        Contenu de la page Conversations pour le chantier selectionne...
      </p>
    </div>
  );
};

export default Conversations;
