// src/pages/ToDoList.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faPencilAlt, faTrash, faPlus, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionOpen, setSectionOpen] = useState({});
  const [activeTab, setActiveTab] = useState('Taches assignees');
  const [newSectionName, setNewSectionName] = useState('');
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    piece: '',
    interventionType: '',
    date: '',
    type: '',
    assignees: [],
    section: '',
    comments: []
  });
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showAssignedModal, setShowAssignedModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState('');

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      const userTasksRef = collection(db, 'Utilisateurs', currentUser.uid, 'tasks');
      const unsubscribeUserTasks = onSnapshot(userTasksRef, (snapshot) => {
        const fetchedTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: 'personal' }));
        setTodos(fetchedTasks);
      });

      const chantierRef = collection(db, 'chantiers');
      const unsubscribeChantiers = onSnapshot(chantierRef, (snapshot) => {
        const fetchedAssignedTasks = [];
        snapshot.docs.forEach((chantierDoc) => {
          const chantierId = chantierDoc.id;
          const chantierData = chantierDoc.data();
          const todosRef = collection(db, 'chantiers', chantierId, 'todos');
          onSnapshot(todosRef, (todosSnapshot) => {
            todosSnapshot.docs.forEach((todoDoc) => {
              const todoData = todoDoc.data();
              if (todoData.assignees && todoData.assignees.includes(currentUser.email)) {
                fetchedAssignedTasks.push({
                  ...todoData,
                  id: todoDoc.id,
                  chantierId: chantierId,
                  chantierName: chantierData.name,
                  type: 'assigned',
                });
              }
            });
            setAssignedTasks(fetchedAssignedTasks);
          });
        });
      });

      return () => {
        unsubscribeUserTasks();
        unsubscribeChantiers();
      };
    }
  }, [currentUser]);

  const tabs = [
    { name: 'Taches assignees' },
    { name: 'Taches personnelles' },
    { name: 'Taches terminees' },
  ];

  const handleTabClick = (tabName) => setActiveTab(tabName);

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'Taches assignees':
        return assignedTasks;
      case 'Taches personnelles':
        return todos.filter(task => !task.completed);
      case 'Taches terminees':
        return todos.filter(task => task.completed);
      default:
        return [];
    }
  };

  const addSection = async () => {
    if (newSectionName.trim()) {
      try {
        const userRef = doc(db, 'Utilisateurs', currentUser.uid);
        await updateDoc(userRef, {
          sections: arrayUnion(newSectionName),
        });
        setSections([...sections, newSectionName]);
        setNewSectionName('');
        setShowSectionModal(false);
      } catch (error) {
        console.error("Erreur lors de l'ajout de la section : ", error);
        alert("Une erreur est survenue lors de l'ajout de la section.");
      }
    } else {
      alert("Veuillez indiquer un nom pour la section.");
    }
  };

  const toggleSection = (section) => {
    setSectionOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const deleteSection = async (section) => {
    const hasTodos = todos.some((todo) => todo.section === section);
    if (hasTodos) {
      alert("Vous ne pouvez pas supprimer une section contenant des taches.");
      return;
    }

    if (window.confirm(`Etes-vous sur de vouloir supprimer la section "${section}" ?`)) {
      try {
        const userRef = doc(db, 'Utilisateurs', currentUser.uid);
        await updateDoc(userRef, {
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

  const addTodo = async () => {
    try {
      if (newTodo.title.trim()) {
        const tasksRef = collection(db, 'Utilisateurs', currentUser.uid, 'tasks');
        await addDoc(tasksRef, {
          ...newTodo,
          creator: currentUser.email,
          createdAt: new Date(),
          completed: false,
        });
        setNewTodo({ title: '', description: '', piece: '', interventionType: '', date: '', status: '', assignees: [], section: '' });
        setShowTodoModal(false);
      } else {
        alert("Veuillez remplir au moins le champ 'Titre'.");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de la tache : ", error);
    }
  };

  const updateTodo = async () => {
    try {
      const todoRef = selectedTodo.type === 'personal'
        ? doc(db, 'Utilisateurs', currentUser.uid, 'tasks', selectedTodo.id)
        : doc(db, 'chantiers', selectedTodo.chantierId, 'todos', selectedTodo.id);

      await updateDoc(todoRef, {
        title: selectedTodo.title,
        description: selectedTodo.description,
        piece: selectedTodo.piece,
        interventionType: selectedTodo.interventionType,
        date: selectedTodo.date,
        type: selectedTodo.interventionType,
        section: selectedTodo.section,
        comments: selectedTodo.comments || [],
      });

      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === selectedTodo.id ? { ...todo, ...selectedTodo } : todo
        )
      );

      setSelectedTodo(null);
      setIsEditing(false);
      setShowTodoModal(false);
      alert("La tache a ete mise a jour avec succes.");
    } catch (error) {
      console.error("Erreur lors de la mise a jour de la tache : ", error);
      alert("Une erreur est survenue lors de la mise a jour de la tache.");
    }
  };

  const deleteTodo = async (taskId, taskType) => {
    if (window.confirm('Etes-vous sur de vouloir supprimer cette tache ?')) {
      try {
        const taskRef = taskType === 'personal'
          ? doc(db, 'Utilisateurs', currentUser.uid, 'tasks', taskId)
          : doc(db, 'chantiers', selectedTodo.chantierId, 'todos', taskId);

        await deleteDoc(taskRef);
        setTodos(todos.filter((task) => task.id !== taskId));
      } catch (error) {
        console.error("Erreur lors de la suppression de la tache : ", error);
      }
    }
  };

  const addCommentToTask = async () => {
    if (comment.trim()) {
      try {
        const updatedComments = [...(selectedTodo.comments || []), { author: currentUser.email, text: comment }];
        
        const todoRef = selectedTodo.type === 'assigned'
          ? doc(db, 'chantiers', selectedTodo.chantierId, 'todos', selectedTodo.id)
          : doc(db, 'Utilisateurs', currentUser.uid, 'tasks', selectedTodo.id);

        await updateDoc(todoRef, { comments: updatedComments });

        if (selectedTodo.type === 'assigned') {
          setAssignedTasks((prevAssignedTasks) =>
            prevAssignedTasks.map((task) =>
              task.id === selectedTodo.id ? { ...task, comments: updatedComments } : task
            )
          );
        } else {
          setTodos((prevTodos) =>
            prevTodos.map((task) =>
              task.id === selectedTodo.id ? { ...task, comments: updatedComments } : task
            )
          );
        }

        setSelectedTodo({ ...selectedTodo, comments: updatedComments });
        setComment('');
      } catch (error) {
        console.error("Erreur lors de l'ajout du commentaire :", error);
        alert("Une erreur est survenue lors de l'ajout du commentaire.");
      }
    }
  };

  const deleteComment = async (commentIndex) => {
    try {
      const updatedComments = selectedTodo.comments.filter((_, index) => index !== commentIndex);
      const todoRef = selectedTodo.type === 'assigned'
        ? doc(db, 'chantiers', selectedTodo.chantierId, 'todos', selectedTodo.id)
        : doc(db, 'Utilisateurs', currentUser.uid, 'tasks', selectedTodo.id);

      await updateDoc(todoRef, { comments: updatedComments });
      setSelectedTodo({ ...selectedTodo, comments: updatedComments });
    } catch (error) {
      console.error("Erreur lors de la suppression du commentaire :", error);
    }
  };

  return (
    <div className="todo-container p-4 w-full container mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap md:flex-nowrap">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab.name)}
              className={`py-1 px-4 rounded-full font-medium text-sm ${
                activeTab === tab.name ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {activeTab === 'Taches personnelles' && (
          <div className="flex space-x-2 mt-2 md:mt-0">
            <button
              className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-600 transition duration-300 text-sm"
              onClick={() => { setShowTodoModal(true); setIsEditing(false); setSelectedTodo(null); }}
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
        {/* Mode liste pour les ecrans moyens et grands */}
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-300 p-2">Ndeg</th>
              <th className="border border-gray-300 p-2">Titre</th>
              <th className="border border-gray-300 p-2">Responsable</th>
              <th className="border border-gray-300 p-2">Type</th>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredTasks().map((task, index) => (
              <tr key={task.id} className="hover:bg-gray-100">
                <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-300 p-2">{task.title}</td>
                <td className="border border-gray-300 p-2">{task.assignees ? task.assignees.join(', ') : 'Non assigne'}</td>
                <td className="border border-gray-300 p-2 text-center">{task.interventionType}</td>
                <td className="border border-gray-300 p-2 text-center">
                  {task.date ? new Date(task.date).toLocaleDateString() : '-'}
                </td>
                <td className="border border-gray-300 p-2 text-center">
  <div className="flex space-x-2 justify-center">
    <button
      className="bg-gray-600 text-white p-1 rounded hover:bg-gray-500"
      onClick={() => { setSelectedTodo(task); setShowAssignedModal(true); }} // Affiche le modal de detail
      title="Voir les details"
    >
      <FontAwesomeIcon icon={faEye} />
    </button>
    <button
      className="bg-red-600 text-white p-1 rounded hover:bg-red-500"
      onClick={() => deleteTodo(task.id, task.type)}
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
      </div>

      <div className="block md:hidden grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Mode carte pour les petits ecrans */}
        {getFilteredTasks().map((task, index) => (
          <div key={task.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
            <h4 className="text-lg font-semibold mb-2">{task.title}</h4>
            <p className="text-sm text-gray-700 mb-1">{task.description}</p>
            <p className="text-xs text-gray-500 mb-1">Responsable: {task.assignees ? task.assignees.join(', ') : 'Non assigne'}</p>
            <p className="text-xs text-gray-500 mb-1">Date: {task.date ? new Date(task.date).toLocaleDateString() : '-'}</p>
            <p className={`text-xs font-bold ${task.status === 'Termine' ? 'text-green-600' : 'text-yellow-500'}`}>Type {task.interventionType}</p>
            <div className="flex space-x-2 justify-end mt-2">
              <button
                className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500"
                onClick={() => { setSelectedTodo(task); setIsEditing(true); setShowTodoModal(true); }}
                title="Modifier"
              >
                <FontAwesomeIcon icon={faPencilAlt} />
              </button>
              <button
                className="bg-red-600 text-white p-1 rounded hover:bg-red-500"
                onClick={() => deleteTodo(task.id, task.type)}
                title="Supprimer"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal pour ajouter ou modifier une tache */}
      {showTodoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowTodoModal(false)}>X</button>
            <h3 className="text-xl font-semibold mb-4 text-center">
              {isEditing ? 'Modifier la tache' : 'Ajouter une nouvelle tache'}
            </h3>
            <input
              type="text"
              className="w-full p-2 border rounded mb-3"
              placeholder="Titre"
              value={isEditing ? selectedTodo?.title : newTodo.title}
              onChange={(e) => {
                if (isEditing) {
                  setSelectedTodo({ ...selectedTodo, title: e.target.value });
                } else {
                  setNewTodo({ ...newTodo, title: e.target.value });
                }
              }}
            />
            <textarea
              className="w-full p-2 border rounded mb-3"
              placeholder="Description"
              value={isEditing ? selectedTodo?.description : newTodo.description}
              onChange={(e) => {
                if (isEditing) {
                  setSelectedTodo({ ...selectedTodo, description: e.target.value });
                } else {
                  setNewTodo({ ...newTodo, description: e.target.value });
                }
              }}
            />
            <input
              type="text"
              className="w-full p-2 border rounded mb-3"
              placeholder="Piece"
              value={isEditing ? selectedTodo?.piece : newTodo.piece}
              onChange={(e) => {
                if (isEditing) {
                  setSelectedTodo({ ...selectedTodo, piece: e.target.value });
                } else {
                  setNewTodo({ ...newTodo, piece: e.target.value });
                }
              }}
            />
            <input
              type="text"
              className="w-full p-2 border rounded mb-3"
              placeholder="Type d'intervention"
              value={isEditing ? selectedTodo?.interventionType : newTodo.interventionType}
              onChange={(e) => {
                if (isEditing) {
                  setSelectedTodo({ ...selectedTodo, interventionType: e.target.value });
                } else {
                  setNewTodo({ ...newTodo, interventionType: e.target.value });
                }
              }}
            />
            <input
              type="date"
              className="w-full p-2 border rounded mb-3"
              value={isEditing ? selectedTodo?.date : newTodo.date}
              onChange={(e) => {
                if (isEditing) {
                  setSelectedTodo({ ...selectedTodo, date: e.target.value });
                } else {
                  setNewTodo({ ...newTodo, date: e.target.value });
                }
              }}
            />
            <select
              className="w-full p-2 border rounded mb-3"
              value={isEditing ? selectedTodo?.section : newTodo.section}
              onChange={(e) => {
                if (isEditing) {
                  setSelectedTodo({ ...selectedTodo, section: e.target.value });
                } else {
                  setNewTodo({ ...newTodo, section: e.target.value });
                }
              }}
            >
              <option value="">Selectionner une section</option>
              {sections.map((section, index) => (
                <option key={index} value={section}>{section}</option>
              ))}
            </select>

            <div className="flex justify-end space-x-2 mt-3">
              <button className="bg-gray-500 text-white py-1 px-4 rounded" onClick={() => setShowTodoModal(false)}>
                Annuler
              </button>
              <button
                className="bg-green-500 text-white py-1 px-4 rounded"
                onClick={isEditing ? updateTodo : addTodo}
              >
                {isEditing ? 'Mettre a jour' : 'Ajouter'}
              </button>
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

      {showAssignedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowAssignedModal(false)}>X</button>
            <h3 className="text-xl font-semibold mb-4 text-center">Details de la tache</h3>
            <p><strong>Titre:</strong> {selectedTodo?.title}</p>
            <p><strong>Description:</strong> {selectedTodo?.description}</p>
            <p><strong>Piece:</strong> {selectedTodo?.piece}</p>
            <p><strong>Type d'intervention:</strong> {selectedTodo?.interventionType}</p>
            <p><strong>Date:</strong> {new Date(selectedTodo?.date).toLocaleDateString()}</p>
            <p><strong>Statut:</strong> {selectedTodo?.interventionType}</p>

            <div className="comments mt-5 overflow-y-auto max-h-64">
              <h4 className="font-semibold mb-2">Commentaires :</h4>
              {selectedTodo?.comments?.map((comment, index) => (
                <div key={index} className="border p-2 mt-2 rounded bg-gray-100 flex justify-between">
                  <span><strong>{comment.author}:</strong> {comment.text}</span>
                  <FontAwesomeIcon icon={faTrash} className="cursor-pointer text-red-500 ml-2" onClick={() => deleteComment(index)} />
                </div>
              ))}
              <textarea
                className="w-full p-2 border rounded mt-3"
                placeholder="Ajouter un commentaire"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="bg-blue-500 text-white py-1 px-4 rounded mt-2"
                onClick={addCommentToTask}
              >
                Ajouter un commentaire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoList;
