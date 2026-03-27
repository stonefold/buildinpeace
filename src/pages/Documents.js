import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faChevronDown, faChevronUp, faEye, faTrash } from '@fortawesome/free-solid-svg-icons';

const documentStructure = [
  {
    name: 'Plan',
    subCategories: ['Plan généraux', 'Plan elec', 'Plan démo'],
  },
  {
    name: 'Fiches techniques',
    subCategories: ['FT Stabilité', 'FT Elec', 'FT Sanitaire'],
  },
  {
    name: 'Cahier des charges',
    subCategories: ['Maçonnerie', 'Electricité', 'Sanitaire'],
  },
  {
    name: 'PV de chantier',
    subCategories: ['PV Gros œuvre', 'PV Second œuvre'],
  },
  {
    name: 'Photos',
    subCategories: ['Salle de bain', 'Salon'],
  },
];

const Documents = ({ chantierId }) => {
  const [selectedCategory, setSelectedCategory] = useState(documentStructure[0]);
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [documents, setDocuments] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDocumentData, setNewDocumentData] = useState({
    name: '',
    date: '',
    status: '',
    file: null,
  });
  const [error, setError] = useState('');
  const [subCategoryVisibility, setSubCategoryVisibility] = useState({});

  const fetchDocuments = async (category) => {
    if (!chantierId || !category) return;

    const newDocuments = {};
    await Promise.all(
      category.subCategories.map(async (subCategory) => {
        const docsCollectionRef = collection(
          db,
          `chantiers/${chantierId}/categories/${category.name}/subCategories/${subCategory}/documents`
        );
        const docsSnapshot = await getDocs(docsCollectionRef);
        newDocuments[subCategory] = docsSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
      })
    );
    setDocuments(newDocuments);
  };

  useEffect(() => {
    fetchDocuments(selectedCategory);
  }, [selectedCategory]);

  const handleCategoryChange = (e) => {
    const selectedCategory = documentStructure.find(
      (cat) => cat.name === e.target.value
    );
    setSelectedCategory(selectedCategory);
    fetchDocuments(selectedCategory);
  };

  const openAddModal = (subCategory) => {
    setSelectedSubCategory(subCategory);
    setIsModalOpen(true);
  };

  const toggleSubCategoryVisibility = (subCategory) => {
    setSubCategoryVisibility((prevState) => ({
      ...prevState,
      [subCategory]: !prevState[subCategory],
    }));
  };

  const handleAddDocument = async () => {
    if (
      !newDocumentData.name ||
      !newDocumentData.date ||
      !newDocumentData.status ||
      !newDocumentData.file
    ) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    try {
      const storageRef = ref(
        storage,
        `chantiers/${chantierId}/categories/${selectedCategory.name}/subCategories/${selectedSubCategory}/${newDocumentData.file.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, newDocumentData.file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {},
        (error) => {
          console.error('Erreur lors du téléversement:', error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(
            collection(
              db,
              `chantiers/${chantierId}/categories/${selectedCategory.name}/subCategories/${selectedSubCategory}/documents`
            ),
            {
              name: newDocumentData.name,
              url: downloadURL,
              date: newDocumentData.date,
              status: newDocumentData.status,
            }
          );

          setNewDocumentData({ name: '', date: '', status: '', file: null });
          setIsModalOpen(false);
          fetchDocuments(selectedCategory);
        }
      );
    } catch (error) {
      console.error("Erreur lors de l'ajout du document :", error);
      setError("Erreur lors de l'ajout du document");
    }
  };

  const handleDeleteDocument = async (subCategory, docId) => {
    try {
      await deleteDoc(
        doc(
          db,
          `chantiers/${chantierId}/categories/${selectedCategory.name}/subCategories/${subCategory}/documents`,
          docId
        )
      );
      fetchDocuments(selectedCategory);
    } catch (error) {
      console.error("Erreur lors de la suppression du document :", error);
    }
  };

  return (
    <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
      <h2 className="text-xl lg:text-2xl font-bold text-gray-700 mb-4">
        Documents du Chantier
      </h2>

      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-700 mb-2">Catégories</h3>
        <div className="mb-4 w-full">
          <select
            onChange={handleCategoryChange}
            className="p-3 w-full border rounded-md cursor-pointer bg-white text-gray-700"
            defaultValue={selectedCategory.name}
          >
            {documentStructure.map((category, idx) => (
              <option key={idx} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCategory && (
        <div>
          {selectedCategory.subCategories.map((subCategory, idx) => (
            <div
              key={idx}
              className="bg-white p-4 mb-6 rounded-lg shadow-md border border-gray-300"
            >
              <div className="flex justify-between items-center bg-blue-500 text-white px-3 py-2 rounded">
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => toggleSubCategoryVisibility(subCategory)}
                >
                  <h3 className="font-bold text-sm sm:text-base md:text-lg mr-2">
                    {subCategory}
                  </h3>
                  <FontAwesomeIcon
                    icon={subCategoryVisibility[subCategory] ? faChevronUp : faChevronDown}
                  />
                </div>
                <button
                  className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500 text-xs sm:text-sm md:text-base flex items-center"
                  onClick={() => openAddModal(subCategory)}
                >
                  <FontAwesomeIcon icon={faPlusCircle} className="mr-1" />
                  Ajouter
                </button>
              </div>

              {subCategoryVisibility[subCategory] && (
                <div className="mt-2">
                  {/* Affichage en tableau sur PC et en cartes sur mobile */}
                  <div className="hidden lg:block">
                    <table className="w-full mt-4 table-auto border-collapse text-sm sm:text-base">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border p-2">Nom du fichier</th>
                          <th className="border p-2">Date</th>
                          <th className="border p-2">Statut</th>
                          <th className="border p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(documents[subCategory] || []).map((doc, idx) => (
                          <tr key={idx} className="hover:bg-gray-100">
                            <td className="border p-2">{doc.name}</td>
                            <td className="border p-2">{doc.date}</td>
                            <td className="border p-2">
                              <span
                                className={`px-2 py-1 rounded ${
                                  doc.status === 'Validé' ? 'bg-green-100' : 'bg-red-100'
                                }`}
                              >
                                {doc.status}
                              </span>
                            </td>
                            <td className="border p-2 flex justify-around items-center">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </a>
                              <button
                                onClick={() => handleDeleteDocument(subCategory, doc.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Affichage en cartes sur mobile */}
                  <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {(documents[subCategory] || []).map((doc, idx) => (
                      <div key={idx} className="bg-gray-100 p-4 rounded-lg shadow">
                        <p className="text-lg font-semibold text-gray-800">{doc.name}</p>
                        <p className="text-sm text-gray-600">Date : {doc.date}</p>
                        <p className="text-sm text-gray-600">Statut : {doc.status}</p>
                        <div className="flex justify-between mt-4">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 flex items-center"
                          >
                            <FontAwesomeIcon icon={faEye} className="mr-1" />
                            Visualiser PDF
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(subCategory, doc.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm md:max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center">
              Ajouter un document dans {selectedSubCategory}
            </h3>
            {error && <p className="text-red-500 mb-2">{error}</p>}

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nom du fichier"
                className="w-full p-2 border rounded"
                value={newDocumentData.name}
                onChange={(e) =>
                  setNewDocumentData({ ...newDocumentData, name: e.target.value })
                }
              />
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={newDocumentData.date}
                onChange={(e) =>
                  setNewDocumentData({ ...newDocumentData, date: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Statut"
                className="w-full p-2 border rounded"
                value={newDocumentData.status}
                onChange={(e) =>
                  setNewDocumentData({ ...newDocumentData, status: e.target.value })
                }
              />
              <input
                type="file"
                className="w-full p-2 border rounded"
                onChange={(e) =>
                  setNewDocumentData({
                    ...newDocumentData,
                    file: e.target.files[0],
                  })
                }
              />
            </div>

            <div className="flex justify-between mt-4">
              <button
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500"
                onClick={handleAddDocument}
              >
                Ajouter
              </button>
              <button
                className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500"
                onClick={() => setIsModalOpen(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
