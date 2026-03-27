import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, onSnapshot, orderBy, getDocs, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus, faPaperPlane, faUpload, faUserPlus, faThumbtack } from '@fortawesome/free-solid-svg-icons';

const Chat = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const user = auth.currentUser;

  // Récupérer les sujets où l'utilisateur est créateur ou invité
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'subjects'),
        where('participants', 'array-contains', user.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Récupérer les messages pour le sujet sélectionné
  useEffect(() => {
    if (selectedSubject) {
      const messagesRef = collection(db, 'subjects', selectedSubject.id, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(messagesData);

        const pinned = messagesData.filter(msg => selectedSubject.pinnedMessages?.includes(msg.id));
        setPinnedMessages(pinned);
      });
      return () => unsubscribe();
    }
  }, [selectedSubject]);

  // Ajouter un nouveau sujet
  const addSubject = async () => {
    if (user && newSubject.trim()) {
      try {
        await addDoc(collection(db, 'subjects'), {
          title: newSubject,
          participants: [user.uid],
          closed: false,
          pinnedMessages: [],
          createdAt: new Date(),
        });
        setNewSubject('');
      } catch (error) {
        console.error("Erreur lors de la création du sujet:", error);
      }
    }
  };

  // Envoyer un message ou un fichier
  const sendMessage = async () => {
    if (user && selectedSubject && !selectedSubject.closed) {
      try {
        if (file) {
          setUploading(true);
          const storageRef = ref(storage, `documents/${user.uid}/${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);

          await addDoc(collection(db, 'subjects', selectedSubject.id, 'messages'), {
            text: `Document : ${downloadURL}`,
            createdAt: new Date(),
            uid: user.uid,
            displayName: user.displayName,
            fileUrl: downloadURL,
          });

          setFile(null);
          setUploading(false);
        } else if (newMessage.trim()) {
          await addDoc(collection(db, 'subjects', selectedSubject.id, 'messages'), {
            text: newMessage,
            createdAt: new Date(),
            uid: user.uid,
            displayName: user.displayName,
          });
          setNewMessage('');
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi du message ou du fichier:", error);
        setUploading(false);
      }
    }
  };

  // Inviter un participant à un sujet
  const inviteParticipant = async () => {
    if (!user || !inviteEmail.trim() || !selectedSubject) return;
    try {
      const usersRef = collection(db, 'Utilisateurs');
      const q = query(usersRef, where('email', '==', inviteEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const invitedUser = querySnapshot.docs[0].data();
        const updatedParticipants = [...selectedSubject.participants, invitedUser.uid];
        const subjectDocRef = doc(db, 'subjects', selectedSubject.id);
        await updateDoc(subjectDocRef, { participants: updatedParticipants });
        setInviteEmail('');
      } else {
        alert('Utilisateur non trouvé');
      }
    } catch (error) {
      console.error("Erreur lors de l'invitation de l'utilisateur:", error);
    }
  };

  // Épingler un message
  const pinMessage = async (messageId) => {
    if (selectedSubject && (selectedSubject.pinnedMessages || []).length < 2) {
      try {
        const updatedPinned = [...(selectedSubject.pinnedMessages || []), messageId];
        const subjectDocRef = doc(db, 'subjects', selectedSubject.id);
        await updateDoc(subjectDocRef, { pinnedMessages: updatedPinned });
        setSelectedSubject({ ...selectedSubject, pinnedMessages: updatedPinned });
      } catch (error) {
        console.error("Erreur lors de l'épinglage du message:", error);
      }
    } else {
      alert("Vous pouvez épingler jusqu'à 2 messages maximum.");
    }
  };

  // Désépingler un message
  const unpinMessage = async (messageId) => {
    if (selectedSubject) {
      try {
        const updatedPinned = (selectedSubject.pinnedMessages || []).filter((msgId) => msgId !== messageId);
        const subjectDocRef = doc(db, 'subjects', selectedSubject.id);
        await updateDoc(subjectDocRef, { pinnedMessages: updatedPinned });
        setSelectedSubject({ ...selectedSubject, pinnedMessages: updatedPinned });
      } catch (error) {
        console.error("Erreur lors du désépinglage du message:", error);
      }
    }
  };

  // Gestion du fichier à uploader
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Formater l'heure du message
  const formatTime = (date) => {
    return date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Liste des sujets */}
      <div className="w-full lg:w-1/4 bg-gray-50 p-3 border-r">
        <h2 className="text-lg font-light text-gray-800 mb-4">Sujets</h2>

        {/* Ajouter un nouveau sujet */}
        <div className="flex mb-3">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Nouveau sujet"
            className="flex-grow p-2 border border-gray-300 rounded-md text-sm shadow-sm bg-white"
          />
          <button
            onClick={addSubject}
            className="ml-2 text-gray-600 hover:text-gray-500"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        {/* Liste des sujets */}
        <ul className="space-y-2">
          {subjects.map(subject => (
            <li
              key={subject.id}
              className={`p-2 flex items-center cursor-pointer rounded-md text-sm ${selectedSubject?.id === subject.id ? 'bg-gray-600 text-white' : 'bg-white text-black'}`}
              onClick={() => setSelectedSubject(subject)}
            >
              {subject.title}
              {/* Bouton pour inviter à côté du sujet */}
              <button className="ml-2" onClick={() => setInviteEmail('')}>
                <FontAwesomeIcon icon={faUserPlus} className="text-gray-600 hover:text-gray-500" />
              </button>
              <button className="ml-auto text-red-500 hover:text-red-700 focus:outline-none" onClick={() => deleteDoc(doc(db, 'subjects', subject.id))}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Vue de la conversation */}
      <div className="w-full lg:w-3/4 flex flex-col">
        {selectedSubject ? (
          <>
            <h2 className="text-lg font-light text-gray-800 p-4">
              {selectedSubject.title}
              {/* Bouton d'invitation à côté du sujet */}
              <button onClick={() => setInviteEmail('')} className="ml-4">
                <FontAwesomeIcon icon={faUserPlus} className="text-gray-600 hover:text-gray-500" />
              </button>
            </h2>

            {/* Affichage des messages épinglés */}
            {pinnedMessages.length > 0 && (
              <div className="pinned-messages px-4 py-2 bg-yellow-50 rounded-lg">
                <h3 className="font-light text-gray-800">Messages épinglés</h3>
                {pinnedMessages.map((msg) => (
                  <div key={msg.id} className="p-2 shadow-md text-xs mb-2">
                    <p className="font-light text-gray-700">
                      {msg.displayName} <span className="text-gray-400">{formatTime(msg.createdAt)}</span>
                    </p>
                    <p className="text-gray-700">{msg.text}</p>
                    {msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                        Ouvrir le document
                      </a>
                    )}
                    <button
                      onClick={() => unpinMessage(msg.id)}
                      className="text-red-500 hover:text-red-700 mt-2"
                    >
                      Désépingler
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Messages de la conversation */}
            <div className="flex-grow overflow-y-auto px-4 py-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-md shadow-sm text-xs mb-2 ${msg.uid === user.uid ? 'bg-gray-100 self-end' : 'bg-gray-50 self-start'}`}
                >
                  <p className="font-light text-gray-800">{msg.displayName} <span className="text-gray-400">{formatTime(msg.createdAt)}</span></p>
                  <p className="text-gray-700">{msg.text}</p>
                  {msg.fileUrl && (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                      Ouvrir le document
                    </a>
                  )}
                  <button
                    onClick={() => pinMessage(msg.id)}
                    className="text-gray-500 hover:text-gray-700 mt-2"
                    disabled={selectedSubject.pinnedMessages?.includes(msg.id)}
                  >
                    <FontAwesomeIcon icon={faThumbtack} /> Épingler
                  </button>
                </div>
              ))}
            </div>

            {/* Formulaire d'envoi de message et fichier */}
            <div className="p-4 bg-gray-50 flex items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Votre message"
                className="flex-grow p-2 border border-gray-300 rounded-md text-sm shadow-sm bg-white"
                disabled={selectedSubject.closed}
              />

              <label className="ml-2 cursor-pointer">
                <FontAwesomeIcon icon={faUpload} />
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={selectedSubject.closed || uploading}
                />
              </label>

              <button
                onClick={sendMessage}
                className={`ml-2 ${selectedSubject.closed || uploading ? 'text-gray-400' : 'text-gray-600 hover:text-gray-500'}`}
                disabled={selectedSubject.closed || uploading}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>

            {/* Formulaire d'invitation de participant */}
            <div className="flex mt-4 p-4 bg-gray-50">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Inviter par email"
                className="flex-grow p-2 border border-gray-300 rounded-md text-sm shadow-sm bg-white"
                disabled={selectedSubject.closed}
              />
              <button
                onClick={inviteParticipant}
                className={`ml-2 ${selectedSubject.closed ? 'text-gray-400' : 'text-gray-600 hover:text-gray-500'}`}
                disabled={selectedSubject.closed}
              >
                <FontAwesomeIcon icon={faUserPlus} />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 p-4">
            Sélectionnez un sujet pour commencer à discuter
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
