import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faTrashAlt, faEye, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

const Offre = ({ chantierId, chantierName }) => {
  const [offers, setOffers] = useState({
    initial: [],
    validated: [],
    inProgress: [],
    refused: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOfferType, setSelectedOfferType] = useState('');
  const [newOfferData, setNewOfferData] = useState({
    num: '',
    title: '',
    date: '',
    montant: '',
    statut: '',
    pdf: '',
    pdfFile: null
  });
  const [error, setError] = useState('');
  const [sectionVisibility, setSectionVisibility] = useState({
    initial: true,
    validated: true,
    inProgress: true,
    refused: true
  });

  useEffect(() => {
    if (chantierId) {
      const fetchOffers = () => {
        const offersCollectionRef = collection(db, 'chantiers', chantierId, 'Offres');
        onSnapshot(offersCollectionRef, (snapshot) => {
          const fetchedOffers = {
            initial: [],
            validated: [],
            inProgress: [],
            refused: []
          };

          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            fetchedOffers[data.type] = [...fetchedOffers[data.type], { id: doc.id, ...data }];
          });

          setOffers(fetchedOffers);
        });
      };

      fetchOffers();
    }
  }, [chantierId]);

  const handleAddOffer = async () => {
    if (!newOfferData.num || !newOfferData.title || !newOfferData.date || !newOfferData.montant || !newOfferData.statut) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    try {
      let pdfUrl = '';

      if (newOfferData.pdfFile) {
        const uniqueFolderName = `${chantierName}_${chantierId}`;
        const pdfRef = ref(storage, `${uniqueFolderName}/offres/${selectedOfferType}/${newOfferData.pdfFile.name}`);
        await uploadBytes(pdfRef, newOfferData.pdfFile);
        pdfUrl = await getDownloadURL(pdfRef);
      }

      const offerDoc = {
        num: newOfferData.num,
        title: newOfferData.title,
        date: newOfferData.date,
        montant: parseFloat(newOfferData.montant),
        statut: newOfferData.statut,
        pdf: pdfUrl || 'Telecharger PDF',
        type: selectedOfferType
      };

      await addDoc(collection(db, 'chantiers', chantierId, 'Offres'), offerDoc);

      setNewOfferData({ num: '', title: '', date: '', montant: '', statut: '', pdf: '', pdfFile: null });
      setIsModalOpen(false);
      setError('');
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'offre :", error);
      setError("Erreur lors de l'ajout de l'offre");
    }
  };

  const handleDeleteOffer = async (type, id) => {
    try {
      await deleteDoc(doc(db, 'chantiers', chantierId, 'Offres', id));
      setOffers((prev) => ({
        ...prev,
        [type]: prev[type].filter((offer) => offer.id !== id)
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression de l'offre :", error);
    }
  };

  const openAddModal = (type) => {
    setSelectedOfferType(type);
    setIsModalOpen(true);
  };

  const toggleSectionVisibility = (type) => {
    setSectionVisibility((prevState) => ({
      ...prevState,
      [type]: !prevState[type]
    }));
  };

  const renderOfferSection = (type, title) => {
    return (
      <div className="bg-white p-3 mb-4 rounded-lg shadow-md border border-gray-300">
        <div
          className="flex justify-between items-center bg-blue-500 text-white px-3 py-2 rounded cursor-pointer"
          onClick={() => toggleSectionVisibility(type)}
        >
          <div className="flex items-center">
            <h3 className="font-bold mr-2">{title}</h3>
            <FontAwesomeIcon icon={sectionVisibility[type] ? faChevronUp : faChevronDown} />
          </div>
          <button
            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500 text-xs sm:text-sm flex items-center"
            onClick={(e) => {
              e.stopPropagation(); // Empecher le toggle du repli/depliement lors du clic sur "Ajouter"
              openAddModal(type);
            }}
          >
            <FontAwesomeIcon icon={faPlusCircle} className="mr-1" />
            Ajouter
          </button>
        </div>
        
        {sectionVisibility[type] && (
          <>
            {/* Card layout for small screens */}
            <div className="block md:hidden space-y-2 mt-2">
              {offers[type].map((offer, index) => (
                <div key={index} className="bg-gray-100 p-3 rounded shadow-md">
                  <p><strong>Numero:</strong> {offer.num}</p>
                  <p><strong>Titre:</strong> {offer.title}</p>
                  <p><strong>Date:</strong> {offer.date}</p>
                  <p><strong>Montant:</strong> {parseFloat(offer.montant).toLocaleString()} EUR</p>
                  <p><strong>Statut:</strong> {offer.statut}</p>
                  <div className="flex justify-between mt-2">
                    <a href={offer.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center">
                      <FontAwesomeIcon icon={faEye} className="mr-1" />
                      Visualiser PDF
                    </a>
                    <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteOffer(type, offer.id)}>
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table layout for larger screens */}
            <div className="hidden md:block mt-2 overflow-x-auto">
              <table className="w-full table-auto border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-600">
                    <th className="border p-1">Numero</th>
                    <th className="border p-1">Titre</th>
                    <th className="border p-1">Date</th>
                    <th className="border p-1">Montant</th>
                    <th className="border p-1">Statut</th>
                    <th className="border p-1">PDF</th>
                    <th className="border p-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers[type].map((offer, index) => (
                    <tr key={index} className="hover:bg-gray-100">
                      <td className="border p-1 text-center">{offer.num}</td>
                      <td className="border p-1">{offer.title}</td>
                      <td className="border p-1">{offer.date}</td>
                      <td className="border p-1">{parseFloat(offer.montant).toLocaleString()} EUR</td>
                      <td className="border p-1">{offer.statut}</td>
                      <td className="border p-1 text-center">
                        <a href={offer.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                          <FontAwesomeIcon icon={faEye} /> Visualiser PDF
                        </a>
                      </td>
                      <td className="border p-1 text-center">
                        <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteOffer(type, offer.id)}>
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderOfferSection('initial', 'Offre Initiale')}
      {renderOfferSection('validated', 'Offre Validee')}
      {renderOfferSection('inProgress', 'Offre en cours')}
      {renderOfferSection('refused', 'Offre Refusee')}

      {/* Modal pour ajouter une offre */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm md:max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center">Ajouter une offre {selectedOfferType}</h3>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            
            <div className="space-y-2">
              <input type="text" placeholder="Numero" className="w-full p-2 border rounded" value={newOfferData.num} onChange={(e) => setNewOfferData({ ...newOfferData, num: e.target.value })} />
              <input type="text" placeholder="Titre" className="w-full p-2 border rounded" value={newOfferData.title} onChange={(e) => setNewOfferData({ ...newOfferData, title: e.target.value })} />
              <input type="date" className="w-full p-2 border rounded" value={newOfferData.date} onChange={(e) => setNewOfferData({ ...newOfferData, date: e.target.value })} />
              <input type="text" placeholder="Montant" className="w-full p-2 border rounded" value={newOfferData.montant} onChange={(e) => setNewOfferData({ ...newOfferData, montant: e.target.value })} />
              <input type="text" placeholder="Statut" className="w-full p-2 border rounded" value={newOfferData.statut} onChange={(e) => setNewOfferData({ ...newOfferData, statut: e.target.value })} />
              <input type="file" className="w-full p-2 border rounded" onChange={(e) => setNewOfferData({ ...newOfferData, pdfFile: e.target.files[0] })} />
            </div>

            <div className="flex justify-between mt-4">
              <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500" onClick={handleAddOffer}>
                Ajouter
              </button>
              <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500" onClick={() => setIsModalOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offre;
