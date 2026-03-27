import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faEye, faTrashAlt, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const Contrat = ({ chantierId, chantierName }) => {
  const [contracts, setContracts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContract, setNewContract] = useState({
    num: '',
    title: '',
    client: '',
    manager: '',
    managerInitials: '',
    startDate: '',
    endDate: '',
    amount: '',
    status: '',
    pdf: '',
    pdfFile: null,
  });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [contractsPerPage] = useState(10);

  useEffect(() => {
    const fetchContracts = async () => {
      if (chantierId) {
        const contractsCollectionRef = collection(db, 'chantiers', chantierId, 'Contrats');
        const q = query(contractsCollectionRef, orderBy('num', 'asc'));
        onSnapshot(q, (snapshot) => {
          const fetchedContracts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setContracts(fetchedContracts);
        });
      }
    };
    fetchContracts();
  }, [chantierId]);

  const handleAddContract = async () => {
    if (!newContract.num || !newContract.title || !newContract.client || !newContract.manager || !newContract.startDate || !newContract.endDate || !newContract.amount || !newContract.status) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (isNaN(newContract.amount)) {
      setError('Le montant doit être un nombre valide.');
      return;
    }

    try {
      let pdfUrl = '';

      if (newContract.pdfFile) {
        const uniqueFolderName = `${chantierName}_${chantierId}`;
        const pdfRef = ref(storage, `${uniqueFolderName}/contrats/${newContract.pdfFile.name}`);
        await uploadBytes(pdfRef, newContract.pdfFile);
        pdfUrl = await getDownloadURL(pdfRef);
      }

      const docRef = await addDoc(collection(db, 'chantiers', chantierId, 'Contrats'), {
        num: newContract.num,
        title: newContract.title,
        client: newContract.client,
        manager: newContract.manager,
        managerInitials: newContract.managerInitials,
        startDate: newContract.startDate,
        endDate: newContract.endDate,
        amount: parseFloat(newContract.amount),
        status: newContract.status,
        pdf: pdfUrl,
      });

      setContracts([...contracts, { id: docRef.id, ...newContract, pdf: pdfUrl }]);
      setNewContract({ num: '', title: '', client: '', manager: '', managerInitials: '', startDate: '', endDate: '', amount: '', status: '', pdf: '', pdfFile: null });
      setIsModalOpen(false);
      setError('');
    } catch (error) {
      console.error("Erreur lors de l'ajout du contrat :", error);
      setError("Erreur lors de l'ajout du contrat");
    }
  };

  const handleDeleteContract = async (id) => {
    try {
      await deleteDoc(doc(db, 'chantiers', chantierId, 'Contrats', id));
      setContracts(contracts.filter((contract) => contract.id !== id));
    } catch (error) {
      console.error("Erreur lors de la suppression du contrat :", error);
    }
  };

  const indexOfLastContract = currentPage * contractsPerPage;
  const indexOfFirstContract = indexOfLastContract - contractsPerPage;
  const currentContracts = contracts.slice(indexOfFirstContract, indexOfLastContract);
  const totalPages = Math.ceil(contracts.length / contractsPerPage);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mt-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-bold">Contrat - {chantierName}</h2>
        <button
          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-400 text-sm md:text-base flex items-center"
          onClick={() => setIsModalOpen(true)}
        >
          <FontAwesomeIcon icon={faPlusCircle} className="mr-1 md:mr-2" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Modal d'ajout de contrat */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-xs md:max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-center">Nouveau Contrat</h3>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <div className="space-y-2">
              <input type="text" className="w-full p-2 border rounded" placeholder="Numéro" value={newContract.num} onChange={(e) => setNewContract({ ...newContract, num: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Titre" value={newContract.title} onChange={(e) => setNewContract({ ...newContract, title: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Client" value={newContract.client} onChange={(e) => setNewContract({ ...newContract, client: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Gestionnaire" value={newContract.manager} onChange={(e) => setNewContract({ ...newContract, manager: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Initiales du gestionnaire" value={newContract.managerInitials} onChange={(e) => setNewContract({ ...newContract, managerInitials: e.target.value })} />
              <input type="date" className="w-full p-2 border rounded" value={newContract.startDate} onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })} />
              <input type="date" className="w-full p-2 border rounded" value={newContract.endDate} onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Montant" value={newContract.amount} onChange={(e) => setNewContract({ ...newContract, amount: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Statut" value={newContract.status} onChange={(e) => setNewContract({ ...newContract, status: e.target.value })} />
              <input type="file" className="w-full p-2 border rounded" onChange={(e) => setNewContract({ ...newContract, pdfFile: e.target.files[0] })} />
            </div>
            <div className="flex justify-between mt-4">
              <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500 flex-1 mr-2" onClick={handleAddContract}>
                Ajouter
              </button>
              <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 flex-1" onClick={() => setIsModalOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card layout for small screens */}
      <div className="block md:hidden space-y-2">
        {currentContracts.map((contract, index) => (
          <div key={index} className="bg-gray-100 p-3 rounded shadow-md">
            <p><strong>Numéro:</strong> {contract.num}</p>
            <p><strong>Titre:</strong> {contract.title}</p>
            <p><strong>Client:</strong> {contract.client}</p>
            <p><strong>Gestionnaire:</strong> {contract.manager} ({contract.managerInitials})</p>
            <p><strong>Date de début:</strong> {contract.startDate}</p>
            <p><strong>Date de fin:</strong> {contract.endDate}</p>
            <div className="flex justify-between mt-2">
              <a href={contract.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center">
                <FontAwesomeIcon icon={faEye} className="mr-1" />
                Visualiser PDF
              </a>
              <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteContract(contract.id)}>
                <FontAwesomeIcon icon={faTrashAlt} />
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
              <th className="border p-2">N°</th>
              <th className="border p-2">Titre</th>
              <th className="border p-2">Client</th>
              <th className="border p-2">Gestionnaire</th>
              <th className="border p-2">Date de début</th>
              <th className="border p-2">Date de fin</th>
              <th className="border p-2">PDF</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentContracts.map((contract, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="border p-2 text-center">{contract.num}</td>
                <td className="border p-2">{contract.title}</td>
                <td className="border p-2">{contract.client}</td>
                <td className="border p-2">{contract.manager} ({contract.managerInitials})</td>
                <td className="border p-2">{contract.startDate}</td>
                <td className="border p-2">{contract.endDate}</td>
                <td className="border p-2 text-center">
                  <a href={contract.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center justify-center">
                    <FontAwesomeIcon icon={faEye} className="mr-1" /> Visualiser PDF
                  </a>
                </td>
                <td className="border p-2 text-center">
                  <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteContract(contract.id)}>
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <button className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div>Page {currentPage} sur {totalPages}</div>
        <button className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
};

export default Contrat;
