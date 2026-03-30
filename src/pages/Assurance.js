import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faTimesCircle, faEye, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const Assurance = ({ chantierId, chantierName }) => {
  const [insuranceList, setInsuranceList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInsurance, setNewInsurance] = useState({
    num: '',
    title: '',
    date: '',
    pdf: '',
    status: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInsurances = async () => {
      try {
        const insurancesCollection = collection(db, 'chantiers', chantierId, 'Assurances');
        const insuranceSnapshot = await getDocs(insurancesCollection);
        const insuranceData = insuranceSnapshot.docs.map((doc) => ({
          id: doc.id, 
          ...doc.data()
        }));
        insuranceData.sort((a, b) => a.num - b.num);
        setInsuranceList(insuranceData);
      } catch (error) {
        console.error('Erreur lors de la recuperation des assurances :', error);
      }
    };

    fetchInsurances();
  }, [chantierId]);

  const handleAddInsurance = async () => {
    if (!newInsurance.num || !newInsurance.title || !newInsurance.date || !newInsurance.status) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    try {
      let pdfUrl = '';
      if (selectedFile) {
        const uniquePath = `${chantierName}_${chantierId}/Assurances/${selectedFile.name}`;
        const storageRef = ref(storage, uniquePath);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        pdfUrl = await getDownloadURL(snapshot.ref);
      }

      const insuranceDoc = {
        num: parseInt(newInsurance.num),
        title: newInsurance.title,
        date: newInsurance.date,
        pdf: pdfUrl ? pdfUrl : 'Visualiser PDF',
        status: newInsurance.status,
        statusColor: newInsurance.status === 'SIGNE ET CONTRE SIGNE' ? 'bg-green-200' : 'bg-yellow-200'
      };

      const docRef = await addDoc(collection(db, 'chantiers', chantierId, 'Assurances'), insuranceDoc);
      const updatedList = [...insuranceList, { ...insuranceDoc, id: docRef.id }];
      updatedList.sort((a, b) => a.num - b.num);
      setInsuranceList(updatedList);
      setNewInsurance({ num: '', title: '', date: '', pdf: 'Visualiser PDF', status: '' });
      setSelectedFile(null);
      setIsModalOpen(false);
      setError('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'assurance :', error);
      setError('Erreur lors de l\'ajout de l\'assurance');
    }
  };

  const handleDeleteInsurance = async (insuranceId) => {
    try {
      await deleteDoc(doc(db, 'chantiers', chantierId, 'Assurances', insuranceId));
      setInsuranceList(insuranceList.filter((insurance) => insurance.id !== insuranceId));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'assurance :', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Assurances</h2>
        <button
          className="bg-green-600 text-white px-2 py-1 rounded flex items-center hover:bg-green-500 text-sm md:text-base"
          onClick={() => setIsModalOpen(true)}
        >
          <FontAwesomeIcon icon={faPlusCircle} className="mr-1 md:mr-2" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Modal d'ajout d'assurance */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-xs md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-center w-full">Nouvelle Assurance</h3>
              <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 cursor-pointer absolute right-4 top-4" onClick={() => setIsModalOpen(false)} />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <div className="space-y-2">
              <input type="text" className="w-full p-2 border rounded mb-2" placeholder="Numero" value={newInsurance.num} onChange={(e) => setNewInsurance({ ...newInsurance, num: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded mb-2" placeholder="Titre" value={newInsurance.title} onChange={(e) => setNewInsurance({ ...newInsurance, title: e.target.value })} />
              <input type="date" className="w-full p-2 border rounded mb-2" value={newInsurance.date} onChange={(e) => setNewInsurance({ ...newInsurance, date: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded mb-4" placeholder="Statut (SIGNE ET CONTRE SIGNE ou En cours)" value={newInsurance.status} onChange={(e) => setNewInsurance({ ...newInsurance, status: e.target.value })} />
              <input type="file" className="w-full p-2 border rounded mb-4" onChange={(e) => setSelectedFile(e.target.files[0])} />
            </div>
            <div className="flex justify-between mt-4">
              <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500 flex-1 mr-2" onClick={handleAddInsurance}>Ajouter</button>
              <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 flex-1" onClick={() => setIsModalOpen(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Card layout for small screens */}
      <div className="block md:hidden space-y-2">
        {insuranceList.map((insurance, index) => (
          <div key={index} className="bg-gray-100 p-3 rounded shadow-md">
            <p><strong>Numero:</strong> {insurance.num}</p>
            <p><strong>Titre:</strong> {insurance.title}</p>
            <p><strong>Date:</strong> {insurance.date}</p>
            <p><strong>Statut:</strong> <span className={insurance.statusColor}>{insurance.status}</span></p>
            <div className="flex justify-between mt-2">
              <a href={insurance.pdf} target="_blank" rel="noopener noreferrer" className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-400 mr-2">
                <FontAwesomeIcon icon={faEye} /> Visualiser PDF
              </a>
              <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteInsurance(insurance.id)}>
                <FontAwesomeIcon icon={faTrashAlt} /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table layout for medium and larger screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full table-auto border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2 text-left">Numero</th>
              <th className="border px-4 py-2 text-left">Titre</th>
              <th className="border px-4 py-2 text-left">Date</th>
              <th className="border px-4 py-2 text-left">Statut</th>
              <th className="border px-4 py-2 text-center">PDF</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {insuranceList.map((insurance, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border px-4 py-2">{insurance.num}</td>
                <td className="border px-4 py-2">{insurance.title}</td>
                <td className="border px-4 py-2">{insurance.date}</td>
                <td className={`border px-4 py-2 text-center ${insurance.statusColor}`}>{insurance.status}</td>
                <td className="border px-4 py-2 text-center">
                  {insurance.pdf !== 'Visualiser PDF' ? (
                    <a href={insurance.pdf} target="_blank" rel="noopener noreferrer" className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-400">
                      <FontAwesomeIcon icon={faEye} /> Visualiser PDF
                    </a>
                  ) : 'N/A'}
                </td>
                <td className="border px-4 py-2 text-center">
                  <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteInsurance(insurance.id)}>
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Assurance;
