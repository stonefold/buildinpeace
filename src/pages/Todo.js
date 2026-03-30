import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore';
import { auth } from '../auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortUp, faSortDown, faEye, faPencilAlt, faTrash, faPlus, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const Todo = ({ chantierId }) => {
  const [todos, setTodos] = useState([]);
  const [archivedTodos, setArchivedTodos] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionOpen, setSectionOpen] = useState({});
  const [activeTab, setActiveTab] = useState('Taches personnelles');
  const [newSectionName, setNewSectionName] = useState('');
  const [intervenants, setIntervenants] = useState([]);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [taskDetails, setTaskDetails] = useState(null); // Stocke les details de la tache selectionnee
  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const openTaskDetails = (task) => {
    setTaskDetails(task);
    setShowTaskDetailsModal(true);
  };
  

  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    piece: '',
    interventionType: '',
    date: '',
    section: '',
    comments: []
  });
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [step, setStep] = useState(1); // Assurez-vous que cette ligne est bien presente ici

  
  const [showSectionModal, setShowSectionModal] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    console.log("showTaskDetailsModal:", showTaskDetailsModal);
    console.log("taskDetails:", taskDetails);
  }, [showTaskDetailsModal, taskDetails]);
  

  useEffect(() => {
    if (chantierId) {
      const todosRef = collection(db, 'chantiers', chantierId, 'todos');
      const unsubscribe = onSnapshot(todosRef, (snapshot) => {
        const fetchedTodos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTodos(fetchedTodos.filter(todo => !todo.archived));
        setArchivedTodos(fetchedTodos.filter(todo => todo.archived));
      });
  
      const chantierRef = doc(db, 'chantiers', chantierId);
      const unsubscribeSections = onSnapshot(chantierRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const chantierData = docSnapshot.data();
          setSections(chantierData.sections || []);
          setSectionOpen(chantierData.sections.reduce((acc, section) => ({ ...acc, [section]: true }), {}));
        }
      });
  
      // Recuperer tous les intervenants a partir de la sous-collection 'participants'
      const participantsCollection = collection(chantierRef, 'participants');
      getDocs(participantsCollection).then((participantsSnapshot) => {
        const participantsList = participantsSnapshot.docs.map((doc) => doc.data().email); // Assuming each participant has a 'name' field
        setIntervenants(participantsList);
        console.log("Intervenants recuperes :", participantsList); // Verifiez le contenu recupere ici

      });
  
      return () => {
        unsubscribe();
        unsubscribeSections();
      };
    }
  }, [chantierId]);
  
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Inverser l'ordre si on clique sur la meme colonne
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Sinon, trier en ascendant sur la nouvelle colonne
      setSortColumn(column);
      setSortOrder('asc');
    }
  };
  

  const handleTabClick = (tabName) => setActiveTab(tabName);

  const getFilteredTasks = () => {
    let tasks = activeTab === 'Taches personnelles' 
      ? todos.filter(task => !task.completed) 
      : [...archivedTodos, ...todos.filter(task => task.completed)];
  
    // Trier les taches en fonction de sortColumn et sortOrder
    if (sortColumn) {
      tasks = tasks.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
  
    return tasks;
  };
  

  const addSection = async () => {
    if (newSectionName.trim()) {
      try {
        const chantierRef = doc(db, 'chantiers', chantierId);
        await updateDoc(chantierRef, {
          sections: arrayUnion(newSectionName),
        });
        setSections([...sections, newSectionName]);
        setSectionOpen({ ...sectionOpen, [newSectionName]: true });
        setNewSectionName('');
        setShowSectionModal(false);
      } catch (error) {
        console.error("Erreur lors de l'ajout de la section : ", error);
      }
    } else {
      alert("Veuillez indiquer un nom pour la section.");
    }
  };

  const deleteSection = async (section) => {
    const hasTodos = todos.some((todo) => todo.section === section);
    if (hasTodos) {
      alert("Vous ne pouvez pas supprimer une section contenant des taches.");
      return;
    }

    if (window.confirm(`Etes-vous sur de vouloir supprimer la section "${section}" ?`)) {
      try {
        const chantierRef = doc(db, 'chantiers', chantierId);
        await updateDoc(chantierRef, {
          sections: arrayRemove(section),
        });
        setSections(sections.filter((sec) => sec !== section));
        const updatedSectionOpen = { ...sectionOpen };
        delete updatedSectionOpen[section];
        setSectionOpen(updatedSectionOpen);
      } catch (error) {
        console.error("Erreur lors de la suppression de la section : ", error);
      }
    }
  };

  const toggleSection = (section) => {
    setSectionOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const addTodo = async () => {
    try {
      const todosRef = collection(db, 'chantiers', chantierId, 'todos');
      await addDoc(todosRef, {
        ...newTodo,
        creator: currentUser.email,
        createdAt: new Date(),
        completed: false,
        archived: false,
        comments: [],
        section: newTodo.section, // Ajoute la section selectionnee
      });
      setNewTodo({ title: '', description: '', piece: '', interventionType: '', date: '', section: '', comments: [], assignees: [] });
      setShowTodoModal(false);
      setStep(1); // Reinitialise l'etape a 1 pour la prochaine fois
    } catch (error) {
      console.error("Erreur lors de l'ajout de la tache : ", error);
    }
  };

  const openEditModal = (task) => {
    setSelectedTodo(task); 
    setNewTodo(task); // Pre-remplit les donnees existantes de la tache dans newTodo
    setShowTodoModal(true); // Ouvre le modal pour l'edition
  };
  

  const saveTodo = async () => {
    try {
      const todosRef = collection(db, 'chantiers', chantierId, 'todos');
      if (selectedTodo) {
        // Mode edition - Met a jour la tache existante
        const todoRef = doc(db, 'chantiers', chantierId, 'todos', selectedTodo.id);
        await updateDoc(todoRef, newTodo);
      } else {
        // Mode ajout - Ajoute une nouvelle tache
        await addDoc(todosRef, {
          ...newTodo,
          creator: currentUser.email,
          createdAt: new Date(),
          completed: false,
          archived: false,
          comments: [],
          section: newTodo.section,
        });
      }
      // Reinitialise les etats
      setNewTodo({ title: '', description: '', piece: '', interventionType: '', date: '', section: '', comments: [], assignees: [] });
      setShowTodoModal(false);
      setSelectedTodo(null);
      setStep(1);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la tache : ", error);
    }
  };
  
  
  const updateTodo = async () => {
    try {
      const todoRef = doc(db, 'chantiers', chantierId, 'todos', selectedTodo.id);
      await updateDoc(todoRef, selectedTodo);
      setSelectedTodo(null);
      setShowTodoModal(false);
    } catch (error) {
      console.error("Erreur lors de la mise a jour de la tache : ", error);
    }
  };

  const deleteTodo = async (todoId) => {
    if (window.confirm('Etes-vous sur de vouloir supprimer cette tache ?')) {
      try {
        const todoRef = doc(db, 'chantiers', chantierId, 'todos', todoId);
        await deleteDoc(todoRef);
        setTodos(todos.filter((todo) => todo.id !== todoId));
      } catch (error) {
        console.error("Erreur lors de la suppression de la tache : ", error);
      }
    }
  };

  return (
    <div className="todo-container p-4 w-full container mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap md:flex-nowrap">
        <div className="flex space-x-2">
          <button
            onClick={() => handleTabClick('Taches personnelles')}
            className={`py-1 px-4 rounded-full font-medium text-sm ${
              activeTab === 'Taches personnelles' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            Taches personnelles
          </button>
          <button
            onClick={() => handleTabClick('Taches terminees')}
            className={`py-1 px-4 rounded-full font-medium text-sm ${
              activeTab === 'Taches terminees' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            Taches terminees
          </button>
        </div>
        {activeTab === 'Taches personnelles' && (
          <div className="flex space-x-2 mt-2 md:mt-0">
            <button
  className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-600 transition duration-300 text-sm"
  onClick={() => {
    // Reinitialise les etapes et les donnees du formulaire
    setShowTodoModal(true);
    setSelectedTodo(null);
    setNewTodo({ 
      title: '', 
      description: '', 
      piece: '', 
      interventionType: '', 
      date: '', 
      section: '', 
      comments: [], 
      assignees: [] 
    });
    setStep(1); // Reinitialise l'etape a 1
  }}
>
  <FontAwesomeIcon icon={faPlus} /> Ajouter une tache
</button>

            <button
              className="bg-green-500 text-white py-1 px-3 rounded-lg hover:bg-green-600 transition duration-300 text-sm"
              onClick={() => setShowSectionModal(true)}
            >
              <FontAwesomeIcon icon={faPlus} /> Ajouter une section
            </button>
          </div>
        )}
      </div>

      <div className="hidden md:block">
        {/* Affichage en mode liste pour les ecrans moyens et grands */}
        {sections.map((section) => (
          <div key={section} className="mb-4">
            <div className="flex justify-between items-center">
              <div onClick={() => toggleSection(section)} className="flex items-center cursor-pointer">
                <FontAwesomeIcon icon={sectionOpen[section] ? faChevronDown : faChevronRight} className="mr-2" />
                <h3 className="text-lg font-bold text-blue-600">{section}</h3>
              </div>
              <button
                className="text-red-500 hover:text-red-700"
                onClick={() => deleteSection(section)}
                title="Supprimer la section"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
            {sectionOpen[section] && (
              <table className="w-full table-auto min-w-full border-collapse border border-gray-300 text-xs sm:text-sm mt-2">
                <thead>
                  <tr className="bg-gray-200 text-gray-600">
                    <th className="border border-gray-300 p-2 text-center">Ndeg</th>
                    <th
      className="border border-gray-300 p-2 text-center cursor-pointer"
      onClick={() => handleSort('title')}
    >
      Titre
      {sortColumn === 'title' && (
        <FontAwesomeIcon
          icon={sortOrder === 'asc' ? faSortUp : faSortDown}
          className="ml-1"
        />
      )}
    </th>
    <th
      className="border border-gray-300 p-2 text-center cursor-pointer"
      onClick={() => handleSort('assignees')}
    >
      Responsable
      {sortColumn === 'assignees' && (
        <FontAwesomeIcon
          icon={sortOrder === 'asc' ? faSortUp : faSortDown}
          className="ml-1"
        />
      )}
    </th>
    <th
      className="border border-gray-300 p-2 text-center cursor-pointer"
      onClick={() => handleSort('interventionType')}
    >
      Type
      {sortColumn === 'interventionType' && (
        <FontAwesomeIcon
          icon={sortOrder === 'asc' ? faSortUp : faSortDown}
          className="ml-1"
        />
      )}
    </th>
    <th
      className="border border-gray-300 p-2 text-center cursor-pointer"
      onClick={() => handleSort('date')}
    >
      Date
      {sortColumn === 'date' && (
        <FontAwesomeIcon
          icon={sortOrder === 'asc' ? faSortUp : faSortDown}
          className="ml-1"
        />
      )}
    </th>
                    <th className="border border-gray-300 p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTasks()
                    .filter((task) => task.section === section)
                    .map((task, index) => (
<tr key={task.id} className="hover:bg-gray-100 cursor-pointer">
  <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
  <td className="border border-gray-300 p-2 text-left">{task.title}</td>
  <td className="border border-gray-300 p-2 text-left">
    {task.assignees ? task.assignees.join(', ') : 'Non assigne'}
  </td>
  <td className="border border-gray-300 p-2 text-center">
    {task.interventionType}
  </td>
  <td className="border border-gray-300 p-2 text-center">
    {task.date ? new Date(task.date).toLocaleDateString() : '-'}
  </td>
  <td className="border border-gray-300 p-2 text-center">
    <div className="flex justify-center space-x-1">
       {/* Bouton pour visualiser les details de la tache */}
    <button
      className="bg-gray-600 text-white p-1 rounded hover:bg-gray-500"
      onClick={(event) => {
        event.stopPropagation();  // Bloque la propagation de l'evenement
        openTaskDetails(task);    // Ouvre le modal de details de la tache
      }}
      title="Voir"
    >
      <FontAwesomeIcon icon={faEye} />
    </button>

    {/* Bouton pour modifier la tache */}
    <button
      className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500"
      onClick={(event) => {
        event.stopPropagation();  // Bloque la propagation de l'evenement
        openEditModal(task);      // Ouvre le modal d'edition de la tache
      }}
      title="Modifier"
    >
      <FontAwesomeIcon icon={faPencilAlt} />
    </button>
      {/* Bouton pour supprimer la tache */}
      <button
        className="bg-red-600 text-white p-1 rounded hover:bg-red-500"
        onClick={(event) => {
          event.stopPropagation();
          console.log("Suppression de la tache");
          deleteTodo(task.id); // Supprime la tache
        }}
        title="Supprimer"
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>
  </td>
</tr>


                    ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden grid grid-cols-1 gap-4">
        {/* Affichage en mode cartes pour les ecrans petits */}
        {getFilteredTasks().map((task, index) => (
          <div key={task.id} className="bg-white shadow-md rounded-lg p-4">
<td className="border border-gray-300 p-2 text-left">
  {task.title}
</td>

            <p className="text-sm text-gray-600">{task.description}</p>
            <p className="text-xs text-gray-500">Responsable: {task.assignees ? task.assignees.join(', ') : 'Non assigne'}</p>
            
            <p className="text-xs text-gray-500">Date: {task.date ? new Date(task.date).toLocaleDateString() : '-'}</p>
            <div className="flex justify-end space-x-2 mt-2">
            <button
  className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500"
  onClick={(event) => {
    event.stopPropagation(); // Empeche la propagation vers la ligne de la tache
    setSelectedTodo(task); 
    setNewTodo(task); // Pre-remplit les donnees existantes de la tache dans newTodo
    setShowTodoModal(true); // Ouvre uniquement le modal d'edition
  }}
  title="Modifier"
>
  <FontAwesomeIcon icon={faPencilAlt} />
</button>


              <button
                className="bg-red-500 text-white p-1 rounded"
                onClick={() => deleteTodo(task.id)}
                title="Supprimer"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals pour les taches et les sections restent inchanges */}
      {showTodoModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
      <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowTodoModal(false)}>X</button>
      
      {/* Etape 1 : Prendre une photo avec previsualisation */}
      {step === 1 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Etape 1 : Prendre une photo</h3>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              if (e.target.files[0]) {
                const file = e.target.files[0];
                setNewTodo({ ...newTodo, photo: URL.createObjectURL(file) });
              }
            }}
          />
          {newTodo.photo && (
            <div className="mt-4">
              <p>Previsualisation :</p>
              <img src={newTodo.photo} alt="Previsualisation" className="w-full h-32 object-cover rounded" />
            </div>
          )}
        </div>
      )}

      {/* Etape 2 : Choisir le type d'action */}
      {step === 2 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Etape 2 : Choisir le type d'action</h3>
          <div className="flex flex-col space-y-2">
            {['Intervention', 'Demande d\'offre', 'Decision'].map((type) => (
              <button
                key={type}
                className={`p-2 rounded ${newTodo.interventionType === type ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setNewTodo({ ...newTodo, interventionType: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Etape 3 : Nommer la tache */}
      {step === 3 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Etape 3 : Nommer la tache</h3>
          <input
            type="text"
            className="w-full p-2 border rounded mb-3"
            placeholder="Nom de la tache"
            value={newTodo.title}
            onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
          />
        </div>
      )}

      {/* Etape 4 : Description et details */}
      {step === 4 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Etape 4 : Description et details</h3>
          <textarea
            className="w-full p-2 border rounded mb-3"
            placeholder="Description"
            value={newTodo.description}
            onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
          />
          <input
            type="text"
            className="w-full p-2 border rounded mb-3"
            placeholder="Marque : Zangra, Type : L200"
            value={newTodo.piece}
            onChange={(e) => setNewTodo({ ...newTodo, piece: e.target.value })}
          />
          <input
            type="number"
            className="w-full p-2 border rounded mb-3"
            placeholder="Cout (ex: 650EUR)"
            value={newTodo.cost || ''}
            onChange={(e) => setNewTodo({ ...newTodo, cost: e.target.value })}
          />
          <input
            type="date"
            className="w-full p-2 border rounded mb-3"
            value={newTodo.date}
            onChange={(e) => setNewTodo({ ...newTodo, date: e.target.value })}
          />
        </div>
      )}

      {/* Etape 5 : Choisir le responsable parmi les intervenants */}
      {/* Etape 5 : Choisir le responsable parmi les intervenants */}
{step === 5 && (
  <div>
    <h3 className="text-xl font-semibold mb-4 text-center">Etape 5 : Choisir le responsable</h3>
    <div className="flex flex-col space-y-2">
      {intervenants.map((intervenant) => (
        <button
          key={intervenant}
          className={`p-2 rounded ${newTodo.assignees?.includes(intervenant) ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => {
            setNewTodo((prev) => ({
              ...prev,
              assignees: prev.assignees?.includes(intervenant)
                ? prev.assignees.filter((p) => p !== intervenant)
                : [...(prev.assignees || []), intervenant],
            }));
          }}
        >
          {intervenant}
        </button>
      ))}
    </div>
  </div>
)}


      {/* Etape 6 : Apercu de la tache */}
      {step === 6 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Etape 6 : Apercu de la tache</h3>
          <p><strong>Titre :</strong> {newTodo.title}</p>
          <p><strong>Description :</strong> {newTodo.description}</p>
          <p><strong>Type :</strong> {newTodo.interventionType}</p>
          <p><strong>Cout :</strong> {newTodo.cost}EUR</p>
          <p><strong>Date :</strong> {newTodo.date}</p>
          <p><strong>Responsable :</strong> {newTodo.assignees?.join(', ')}</p>
          {newTodo.photo && (
            <div className="mt-4">
              <p>Photo :</p>
              <img src={newTodo.photo} alt="Previsualisation finale" className="w-full h-32 object-cover rounded" />
            </div>
          )}
        </div>
      )}

      {/* Etape 7 : Selectionner une section */}
{step === 7 && (
  <div>
    <h3 className="text-xl font-semibold mb-4 text-center">Etape 7 : Selectionner une section</h3>
    <select
      className="w-full p-2 border rounded mb-3"
      value={newTodo.section}
      onChange={(e) => setNewTodo({ ...newTodo, section: e.target.value })}
    >
      <option value="">Choisissez une section</option>
      {sections.map((section) => (
        <option key={section} value={section}>{section}</option>
      ))}
    </select>
  </div>
)}

{showTaskDetailsModal && taskDetails && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
  <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
    <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowTaskDetailsModal(false)}>X</button>
    <h3 className="text-xl font-semibold mb-4 text-center">Details de la tache</h3>
    <p><strong>Titre :</strong> {taskDetails?.title}</p>
    <p><strong>Description :</strong> {taskDetails?.description}</p>
    <p><strong>Type :</strong> {taskDetails?.interventionType}</p>
    <p><strong>Cout :</strong> {taskDetails?.cost}EUR</p>
    <p><strong>Date :</strong> {taskDetails?.date}</p>
    <p><strong>Responsable :</strong> {taskDetails?.assignees?.join(', ')}</p>
    {taskDetails?.photo && (
      <div className="mt-4">
        <p>Photo :</p>
        <img src={taskDetails.photo} alt="Previsualisation" className="w-full h-32 object-cover rounded" />
      </div>
    )}
  </div>
</div>

)}




      {/* Boutons de navigation */}
      {/* Boutons de navigation */}
{/* Boutons de navigation */}
<div className="flex justify-between mt-4">
  {step > 1 && (
    <button className="bg-gray-500 text-white py-1 px-4 rounded" onClick={() => setStep(step - 1)}>
      Precedent
    </button>
  )}
  {step < 7 ? (
    <button
      className="bg-blue-500 text-white py-1 px-4 rounded"
      onClick={() => {
        console.log("Current Step:", step); // Debug pour verifier l'incrementation
        setStep(step + 1);
      }}
    >
      Suivant
    </button>
  ) : (
    <button className="bg-green-500 text-white py-1 px-4 rounded" onClick={saveTodo}>
      Valider
    </button>
  )}
</div>


    </div>
  </div>
)}



      {showSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-center">Ajouter une nouvelle section</h3>
            <input
              type="text"
              className="w-full p-2 border rounded mb-3"
              placeholder="Nom de la section"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
            />
            <div className="flex justify-end space-x-2 mt-3">
              <button className="bg-gray-500 text-white py-1 px-4 rounded" onClick={() => setShowSectionModal(false)}>
                Annuler
              </button>
              <button className="bg-green-500 text-white py-1 px-4 rounded" onClick={addSection}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Todo;
