import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faEye, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const Factures = ({ chantierId, chantierName }) => {
  const [invoices, setInvoices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    num: '',
    title: '',
    date: '',
    amount: '',
    status: '',
    pdf: '',
    pdfFile: null,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoices = async () => {
      if (chantierId) {
        const invoicesCollectionRef = collection(db, 'chantiers', chantierId, 'Factures');
        const q = query(invoicesCollectionRef, orderBy('date', 'asc'));
        onSnapshot(q, (snapshot) => {
          const fetchedInvoices = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setInvoices(fetchedInvoices);
        });
      }
    };
    fetchInvoices();
  }, [chantierId]);

  const handleAddInvoice = async () => {
    if (!newInvoice.num || !newInvoice.title || !newInvoice.date || !newInvoice.amount || !newInvoice.status) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (isNaN(newInvoice.amount)) {
      setError('Le montant doit etre un nombre valide.');
      return;
    }

    try {
      let pdfUrl = '';

      if (newInvoice.pdfFile) {
        const uniqueFolderName = `${chantierName}_${chantierId}`;
        const pdfRef = ref(storage, `${uniqueFolderName}/factures/${newInvoice.pdfFile.name}`);
        await uploadBytes(pdfRef, newInvoice.pdfFile);
        pdfUrl = await getDownloadURL(pdfRef);
      }

      const docRef = await addDoc(collection(db, 'chantiers', chantierId, 'Factures'), {
        num: newInvoice.num,
        title: newInvoice.title,
        date: newInvoice.date,
        amount: parseFloat(newInvoice.amount),
        status: newInvoice.status,
        pdf: pdfUrl,
        statusColor: newInvoice.status === 'PAYE' ? 'bg-green-200' : 'bg-red-200',
      });

      setInvoices([...invoices, { id: docRef.id, ...newInvoice, pdf: pdfUrl }]);
      setNewInvoice({ num: '', title: '', date: '', amount: '', status: '', pdf: '', pdfFile: null });
      setIsModalOpen(false);
      setError('');
    } catch (error) {
      console.error("Erreur lors de l'ajout de la facture :", error);
      setError("Erreur lors de l'ajout de la facture");
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      await deleteDoc(doc(db, 'chantiers', chantierId, 'Factures', id));
      setInvoices(invoices.filter((invoice) => invoice.id !== id));
    } catch (error) {
      console.error("Erreur lors de la suppression de la facture :", error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Factures - {chantierName}</h2>
        <button
          className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500 text-sm md:text-base flex items-center"
          onClick={() => setIsModalOpen(true)}
        >
          <FontAwesomeIcon icon={faPlusCircle} className="mr-1 md:mr-2" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Modal d'ajout de facture */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm md:max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center">Nouvelle Facture</h3>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            
            <div className="space-y-2">
              <input type="text" className="w-full p-2 border rounded" placeholder="Numero" value={newInvoice.num} onChange={(e) => setNewInvoice({ ...newInvoice, num: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Titre" value={newInvoice.title} onChange={(e) => setNewInvoice({ ...newInvoice, title: e.target.value })} />
              <input type="date" className="w-full p-2 border rounded" value={newInvoice.date} onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Montant" value={newInvoice.amount} onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded" placeholder="Statut (PAYE ou EN RETARD)" value={newInvoice.status} onChange={(e) => setNewInvoice({ ...newInvoice, status: e.target.value })} />
              <input type="file" className="w-full p-2 border rounded" onChange={(e) => setNewInvoice({ ...newInvoice, pdfFile: e.target.files[0] })} />
            </div>
            
            <div className="flex justify-between mt-4">
              <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500 flex-1 mr-2" onClick={handleAddInvoice}>
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
        {invoices.map((invoice, index) => (
          <div key={index} className="bg-gray-100 p-3 rounded shadow-md">
            <p><strong>Numero:</strong> {invoice.num}</p>
            <p><strong>Titre:</strong> {invoice.title}</p>
            <p><strong>Date:</strong> {invoice.date}</p>
            <p><strong>Montant:</strong> {parseFloat(invoice.amount).toLocaleString()} EUR</p>
            <p><strong>Statut:</strong> <span className={invoice.statusColor}>{invoice.status}</span></p>
            <div className="flex justify-between mt-2">
              <a href={invoice.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center">
                <FontAwesomeIcon icon={faEye} className="mr-1" />
                <span>Visualiser PDF</span>
              </a>
              <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteInvoice(invoice.id)}>
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
              <th className="border p-2">Numero</th>
              <th className="border p-2">Titre</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Montant</th>
              <th className="border p-2">Statut</th>
              <th className="border p-2">PDF</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="border p-2 text-center">{invoice.num}</td>
                <td className="border p-2">{invoice.title}</td>
                <td className="border p-2">{invoice.date}</td>
                <td className="border p-2 text-center">{parseFloat(invoice.amount).toLocaleString()} EUR</td>
                <td className={`border p-2 text-center ${invoice.statusColor}`}>{invoice.status}</td>
                <td className="border p-2 text-center">
                  <a href={invoice.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center justify-center">
                    <FontAwesomeIcon icon={faEye} className="mr-1" /> 
                    <span>Visualiser PDF</span>
                  </a>
                </td>
                <td className="border p-2 text-center">
                  <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteInvoice(invoice.id)}>
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

export default Factures;
