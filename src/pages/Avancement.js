import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faEye, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const Avancement = ({ chantierId, chantierName }) => {
  const [progressList, setProgressList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProgress, setNewProgress] = useState({
    num: '',
    title: '',
    date: '',
    amount: '',
    status: '',
    pdf: '',
    pdfFile: null
  });
  const [error, setError] = useState('');

  // Charger les avancements depuis Firestore
  useEffect(() => {
    const fetchProgress = () => {
      if (chantierId) {
        const progressCollectionRef = collection(db, 'chantiers', chantierId, 'Avancement');
        const q = query(progressCollectionRef, orderBy('date', 'asc'));
        onSnapshot(q, (snapshot) => {
          const fetchedProgress = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProgressList(fetchedProgress);
        });
      }
    };

    fetchProgress();
  }, [chantierId]);

  // Ajouter un nouvel avancement dans Firestore
  const handleAddProgress = async () => {
    if (!newProgress.num || !newProgress.title || !newProgress.date || !newProgress.amount || !newProgress.status) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (isNaN(newProgress.amount)) {
      setError('Le montant doit être un nombre valide.');
      return;
    }

    try {
      let pdfUrl = '';

      if (newProgress.pdfFile) {
        const uniqueFolderName = `${chantierName}_${chantierId}`;
        const pdfRef = ref(storage, `${uniqueFolderName}/avancement/${newProgress.pdfFile.name}`);
        await uploadBytes(pdfRef, newProgress.pdfFile);
        pdfUrl = await getDownloadURL(pdfRef);
      }

      const docRef = await addDoc(collection(db, 'chantiers', chantierId, 'Avancement'), {
        num: newProgress.num,
        title: newProgress.title,
        date: newProgress.date,
        amount: parseFloat(newProgress.amount),
        status: newProgress.status,
        pdf: pdfUrl,
        statusColor: newProgress.status === 'VALIDÉ' ? 'bg-green-200' : 'bg-yellow-200',
      });

      setProgressList([...progressList, { id: docRef.id, ...newProgress, pdf: pdfUrl }]);
      setNewProgress({ num: '', title: '', date: '', amount: '', status: '', pdf: '', pdfFile: null });
      setIsModalOpen(false);
      setError('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'avancement :', error);
      setError('Erreur lors de l\'ajout de l\'avancement');
    }
  };

  // Supprimer un avancement
  const handleDeleteProgress = async (id) => {
    try {
      await deleteDoc(doc(db, 'chantiers', chantierId, 'Avancement', id));
      setProgressList(progressList.filter((progress) => progress.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'avancement :', error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Avancement - {chantierName}</h2>
        <button
          className="bg-teal-600 text-white px-2 py-1 rounded hover:bg-teal-500 text-sm md:text-base flex items-center"
          onClick={() => setIsModalOpen(true)}
        >
          <FontAwesomeIcon icon={faPlusCircle} className="mr-1 md:mr-2" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Modal d'ajout d'avancement */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Nouvel Avancement</h3>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <input type="text" className="w-full mb-2 p-2 border rounded" placeholder="Numéro" value={newProgress.num} onChange={(e) => setNewProgress({ ...newProgress, num: e.target.value })} />
            <input type="text" className="w-full mb-2 p-2 border rounded" placeholder="Titre" value={newProgress.title} onChange={(e) => setNewProgress({ ...newProgress, title: e.target.value })} />
            <input type="date" className="w-full mb-2 p-2 border rounded" value={newProgress.date} onChange={(e) => setNewProgress({ ...newProgress, date: e.target.value })} />
            <input type="text" className="w-full mb-2 p-2 border rounded" placeholder="Montant" value={newProgress.amount} onChange={(e) => setNewProgress({ ...newProgress, amount: e.target.value })} />
            <input type="text" className="w-full mb-2 p-2 border rounded" placeholder="Statut (VALIDÉ ou Modifié)" value={newProgress.status} onChange={(e) => setNewProgress({ ...newProgress, status: e.target.value })} />
            <input type="file" className="w-full mb-2" onChange={(e) => setNewProgress({ ...newProgress, pdfFile: e.target.files[0] })} />
            <div className="flex justify-between mt-4">
              <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500 flex-1 mr-2" onClick={handleAddProgress}>Ajouter</button>
              <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 flex-1" onClick={() => setIsModalOpen(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Card layout for small screens */}
      <div className="block md:hidden space-y-2">
        {progressList.map((progress, index) => (
          <div key={index} className="bg-gray-100 p-3 rounded shadow-md">
            <p><strong>Numéro:</strong> {progress.num}</p>
            <p><strong>Titre:</strong> {progress.title}</p>
            <p><strong>Date:</strong> {progress.date}</p>
            <p><strong>Montant:</strong> {parseFloat(progress.amount).toLocaleString()} €</p>
            <p><strong>Statut:</strong> <span className={progress.statusColor}>{progress.status}</span></p>
            <div className="flex justify-between mt-2">
              <a href={progress.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center">
                <FontAwesomeIcon icon={faEye} className="mr-1" />
                Visualiser PDF
              </a>
              <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteProgress(progress.id)}>
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
              <th className="border p-2">Numéro</th>
              <th className="border p-2">Titre</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Montant</th>
              <th className="border p-2">Statut</th>
              <th className="border p-2">PDF</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {progressList.map((progress, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="border p-2 text-center">{progress.num}</td>
                <td className="border p-2">{progress.title}</td>
                <td className="border p-2">{progress.date}</td>
                <td className="border p-2 text-center">{parseFloat(progress.amount).toLocaleString()} €</td>
                <td className={`border p-2 text-center ${progress.statusColor}`}>{progress.status}</td>
                <td className="border p-2 text-center">
                  <a href={progress.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center justify-center">
                    <FontAwesomeIcon icon={faEye} className="mr-1" /> Visualiser PDF
                  </a>
                </td>
                <td className="border p-2 text-center">
                  <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteProgress(progress.id)}>
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

export default Avancement;
