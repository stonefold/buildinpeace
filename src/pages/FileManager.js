import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFolder, faFile, faTrash, faDownload } from '@fortawesome/free-solid-svg-icons';
import { db, storage, auth } from '../firebase';  // Firebase config
import { collection, addDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const FileManager = () => {
  const [directories, setDirectories] = useState([]);  // Liste des répertoires
  const [selectedDirectory, setSelectedDirectory] = useState(null);  // Répertoire sélectionné
  const [newDirectoryName, setNewDirectoryName] = useState('');  // Nouveau répertoire
  const [newDocument, setNewDocument] = useState(null);  // Nouveau document
  const [documents, setDocuments] = useState([]);  // Documents dans un répertoire
  const user = auth.currentUser;  // Utilisateur actuel

  // Charger les répertoires de l'utilisateur depuis Firestore
  useEffect(() => {
    const loadDirectories = async () => {
      if (user) {
        const directoriesRef = collection(db, 'Utilisateurs', user.uid, 'directories');
        const snapshot = await getDocs(directoriesRef);
        if (snapshot.empty) {
          const defaultDirectory = { name: 'Documents par défaut' };
          const docRef = await addDoc(directoriesRef, defaultDirectory);
          setDirectories([{ id: docRef.id, ...defaultDirectory }]);
        } else {
          setDirectories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }
    };
    loadDirectories();
  }, [user]);

  // Ajouter un nouveau répertoire
  const addDirectory = async () => {
    if (newDirectoryName.trim() && user) {
      try {
        const directory = { name: newDirectoryName };
        const directoriesRef = collection(db, 'Utilisateurs', user.uid, 'directories');
        const docRef = await addDoc(directoriesRef, directory);
        setDirectories([...directories, { id: docRef.id, ...directory }]);
        setNewDirectoryName('');
      } catch (error) {
        console.error("Erreur lors de l'ajout du répertoire:", error);
      }
    }
  };

  // Ajouter un document dans le répertoire sélectionné
  const addDocument = async () => {
    if (newDocument && selectedDirectory && user) {
      try {
        const storageRef = ref(storage, `documents/${user.uid}/${newDocument.name}`);
        await uploadBytes(storageRef, newDocument);
        const downloadURL = await getDownloadURL(storageRef);

        const documentData = {
          name: newDocument.name,
          storagePath: storageRef.fullPath,
          url: downloadURL,
          uploadedAt: new Date(),
        };

        const documentsRef = collection(db, 'Utilisateurs', user.uid, 'directories', selectedDirectory.id, 'documents');
        await addDoc(documentsRef, documentData);

        setDocuments([...documents, { id: documentData.id, ...documentData }]);
        setNewDocument(null);
      } catch (error) {
        console.error("Erreur lors de l'ajout du document:", error);
      }
    }
  };

  // Charger les documents d'un répertoire
  const loadDocuments = async (directory) => {
    if (user) {
      const documentsRef = collection(db, 'Utilisateurs', user.uid, 'directories', directory.id, 'documents');
      const snapshot = await getDocs(documentsRef);
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSelectedDirectory(directory);
    }
  };

  // Supprimer un document
  const deleteDocument = async (docId, storagePath) => {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);  // Supprimer le fichier de Firebase Storage
      const docRef = doc(db, 'Utilisateurs', user.uid, 'directories', selectedDirectory.id, 'documents', docId);
      await deleteDoc(docRef);  // Supprimer l'entrée dans Firestore

      setDocuments(documents.filter(doc => doc.id !== docId));  // Mettre à jour la liste des documents
    } catch (error) {
      console.error("Erreur lors de la suppression du document:", error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-gray-50 shadow-sm rounded-lg">
      <h2 className="text-lg font-light text-gray-800 mb-4">Gestion des Répertoires et Documents</h2>

      {/* Ajouter un répertoire */}
      <div className="flex flex-col md:flex-row items-center mb-4 space-y-2 md:space-y-0">
        <input
          type="text"
          value={newDirectoryName}
          onChange={(e) => setNewDirectoryName(e.target.value)}
          placeholder="Nouveau répertoire"
          className="flex-grow p-2 border border-gray-300 rounded-l-md text-sm bg-white"
        />
        <button
          onClick={addDirectory}
          className="bg-gray-600 text-white py-2 px-4 rounded-r-md hover:bg-gray-500 transition"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>

      {/* Liste des répertoires */}
      <div className="flex flex-col space-y-2 mb-4">
        {directories.map(directory => (
          <div
            key={directory.id}
            className={`flex items-center p-2 bg-gray-100 rounded-md shadow-sm hover:bg-gray-200 cursor-pointer ${
              selectedDirectory === directory ? 'bg-gray-200' : ''
            }`}
            onClick={() => loadDocuments(directory)}
          >
            <FontAwesomeIcon icon={faFolder} className="text-gray-500 mr-2" />
            <span className="text-sm text-gray-800">{directory.name}</span>
          </div>
        ))}
      </div>

      {/* Documents dans le répertoire sélectionné */}
      {selectedDirectory && (
        <div>
          <h3 className="text-lg font-light text-gray-800 mb-3">{selectedDirectory.name}</h3>

          {/* Ajout de document */}
          <div className="flex flex-col md:flex-row items-center mb-4 space-y-2 md:space-y-0">
            <input
              type="file"
              onChange={(e) => setNewDocument(e.target.files[0])}
              className="flex-grow p-2 border border-gray-300 rounded-l-md text-sm bg-white"
            />
            <button
              onClick={addDocument}
              className="bg-gray-600 text-white py-2 px-4 rounded-r-md hover:bg-gray-500 transition"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>

          {/* Liste compacte des documents */}
          <div className="flex flex-col space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-100 rounded-md shadow-sm">
                <div className="flex items-center truncate">
                  <FontAwesomeIcon icon={faFile} className="text-gray-500 mr-2" />
                  <span title={doc.name} className="text-sm text-gray-800 truncate">{doc.name}</span>
                </div>
                <div className="flex space-x-2">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                    <FontAwesomeIcon icon={faDownload} />
                  </a>
                  <button
                    onClick={() => deleteDocument(doc.id, doc.storagePath)}
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
  );
};

export default FileManager;
