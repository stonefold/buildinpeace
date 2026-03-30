// src/pages/Amis.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDocs, onSnapshot, query, orderBy, where, deleteDoc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faCommentDots, faPaperPlane, faTrash, faUserPlus, faCheck, faTimes, faFileUpload } from '@fortawesome/free-solid-svg-icons';
import { faFolder, faMicrophone, faCamera, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { storage } from '../firebase';
import { uploadBytes, getDownloadURL, ref as storageRef } from "firebase/storage";


const Amis = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [friendProfile, setFriendProfile] = useState(null);
  const messagesEndRef = useRef(null); // Ref to handle scrolling to the last message
  const [activeTab, setActiveTab] = useState('chat'); // Onglet actif, "chat" ou "files"
const [files, setFiles] = useState([]); // Fichiers envoyes
const fileInputRef = useRef(null); // Reference pour l'input de fichier
const cameraInputRef = useRef(null); // Reference pour capture d'image
const videoRef = useRef(null); // Reference pour la camera
const [isFullScreen, setIsFullScreen] = useState(false);
const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
const [isRecording, setIsRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState(null);
const [selectedFile, setSelectedFile] = useState(null); // Fichier selectionne pour l'apercu
const [audioURL, setAudioURL] = useState(null); // URL pour la previsualisation de l'audio

  const currentUser = auth.currentUser;

  // Scroll to the last message
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openFileModal = (file) => {
    setSelectedFile(file);
  };
  
  const closeFileModal = () => {
    setSelectedFile(null);
  };
  
  // Fonction pour gerer la capture photo
  const handleCapturePhoto = async (e) => {
    const file = e.target.files[0];
    if (file && currentConversationId) {
      const storageReference = storageRef(storage, `conversations/${currentConversationId}/${file.name}`);
      await uploadBytes(storageReference, file);
      const downloadURL = await getDownloadURL(storageReference);
  
      await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), {
        createdAt: new Date(),
        uploadedAt: new Date(), // Ajoute cette ligne pour garantir la presence d'une date
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        fileUrl: downloadURL,
        fileName: file.name,
        fileType: file.type,
      });
      
    }
  };
  

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
  
      setMediaRecorder(recorder);
      setIsRecording(true);
  
      recorder.start();
  
      recorder.ondataavailable = async (event) => {
        const audioBlob = event.data;
        const audioFile = new File([audioBlob], 'audio-message.webm', { type: 'audio/webm' });
  
        if (audioFile && currentConversationId) {
          const storageReference = storageRef(storage, `conversations/${currentConversationId}/${audioFile.name}`);
          await uploadBytes(storageReference, audioFile);
          const downloadURL = await getDownloadURL(storageReference);
  
          await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), {
            createdAt: new Date(),
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            fileUrl: downloadURL,
            fileName: audioFile.name,
            fileType: 'audio/webm',
          });
        }
      };
  
      recorder.onstop = () => setIsRecording(false);
    } catch (error) {
      console.error("Erreur d'acces au microphone :", error);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder) mediaRecorder.stop();
  };
  

  const fetchFiles = async () => {
    if (currentConversationId) {
      const filesCollectionRef = collection(db, 'conversations', currentConversationId, 'messages');
      const filesSnapshot = await getDocs(filesCollectionRef);
  
      // Filtrer pour obtenir uniquement les fichiers
      const fetchedFiles = filesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(file => file.fileUrl); // Filtrer uniquement les messages contenant des fichiers
  
      setFiles(fetchedFiles);
    }
  };
  
  
  
  useEffect(() => {
    if (activeTab === 'files') {
      fetchFiles();
    }
  }, [activeTab, currentConversationId]);
  

  // Scroll to bottom whenever messages update
  useEffect(() => {
    setTimeout(scrollToBottom, 200); // Delai pour assurer le rendu complet avant de scroller
  }, [messages,activeTab, files]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
  
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (isMobile && selectedFriend) {
      setIsFullScreen(true);
    }
  }, [isMobile, selectedFriend]);
  
  
  // Fetch friends and friend requests
  useEffect(() => {
    const fetchFriends = async () => {
      if (currentUser) {
        try {
          const friendsRef = collection(db, 'Utilisateurs', currentUser.uid, 'amis');
          const unsubscribeFriends = onSnapshot(friendsRef, (snapshot) => {
            const friendsList = snapshot.docs
              .filter((doc) => doc.data().status === 'accepted')
              .map((doc) => ({
                uid: doc.id,
                ...doc.data(),
              }));
            setFriends(friendsList);
          });

          const friendRequestsRef = collection(db, 'Utilisateurs', currentUser.uid, 'amis');
          const unsubscribeRequests = onSnapshot(friendRequestsRef, (snapshot) => {
            const requestsList = snapshot.docs
              .filter((doc) => doc.data().status === 'pending')
              .map((doc) => ({
                uid: doc.id,
                ...doc.data(),
              }));
            setFriendRequests(requestsList);
          });

          return () => {
            unsubscribeFriends();
            unsubscribeRequests();
          };
        } catch (error) {
          console.error('Erreur lors de la recuperation des amis:', error);
        }
      }
    };

    fetchFriends();
  }, [currentUser]);

  // Invite friend function
  const inviteFriend = async () => {
    if (invitedEmail.trim()) {
      try {
        const friendUid = await getUserUid(invitedEmail);
        if (friendUid) {
          const friendRef = doc(db, 'Utilisateurs', friendUid, 'amis', currentUser.uid);
          await setDoc(friendRef, {
            email: currentUser.email,
            addedAt: new Date(),
            status: 'pending',
          });

          alert('Invitation envoyee avec succes!');
          setShowInviteModal(false);
          setInvitedEmail('');
        } else {
          alert('Utilisateur non trouve.');
        }
      } catch (error) {
        console.error('Erreur lors de l\'invitation de l\'ami:', error);
      }
    } else {
      alert("Veuillez entrer un email valide.");
    }
  };

  // Get user UID from email
  const getUserUid = async (email) => {
    try {
      const usersCollection = collection(db, 'Utilisateurs');
      const q = query(usersCollection, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return userDoc.id;
      }
    } catch (error) {
      console.error('Erreur lors de la recuperation de l\'UID de l\'utilisateur:', error);
    }
    return null;
  };

  // Accept friend request
  const acceptFriendRequest = async (friendUid) => {
    try {
      const currentUserRef = doc(db, 'Utilisateurs', currentUser.uid, 'amis', friendUid);
      await updateDoc(currentUserRef, { status: 'accepted' });

      const friendRef = doc(db, 'Utilisateurs', friendUid, 'amis', currentUser.uid);
      await setDoc(friendRef, {
        email: currentUser.email,
        addedAt: new Date(),
        status: 'accepted',
      });

      const acceptedFriend = friendRequests.find(request => request.uid === friendUid);
      setFriends([...friends, acceptedFriend]);
      setFriendRequests(friendRequests.filter(request => request.uid !== friendUid));

      const participantIds = [currentUser.uid, friendUid].sort();
      const conversationsRef = collection(db, 'conversations');

      const q = query(conversationsRef, where('participants', '==', participantIds));
      const existingConversations = await getDocs(q);

      if (existingConversations.empty) {
        const newConversation = await addDoc(conversationsRef, {
          participants: participantIds,
          createdAt: new Date(),
        });
        setCurrentConversationId(newConversation.id);
      }

      alert('Demande d\'ami acceptee, conversation creee.');

    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la demande d\'ami:', error);
    }
  };

  // Decline friend request
  const declineFriendRequest = async (friendUid) => {
    try {
      await deleteDoc(doc(db, 'Utilisateurs', currentUser.uid, 'amis', friendUid));
      setFriendRequests(friendRequests.filter(request => request.uid !== friendUid));
      alert('Demande d\'ami refusee');
    } catch (error) {
      console.error('Erreur lors du refus de la demande d\'ami:', error);
    }
  };

  // Delete a friend
  const deleteFriend = async (friendUid) => {
    try {
      await deleteDoc(doc(db, 'Utilisateurs', currentUser.uid, 'amis', friendUid));
      await deleteDoc(doc(db, 'Utilisateurs', friendUid, 'amis', currentUser.uid));

      setFriends(friends.filter(friend => friend.uid !== friendUid));
      alert('Ami supprime');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'ami:', error);
    }
  };

  // Display friend profile
  const fetchFriendProfile = async (friendUid) => {
    try {
      const profileRef = doc(db, 'Utilisateurs', friendUid, 'Profiles', 'profileData');
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        setFriendProfile(profileSnap.data());
      } else {
        alert('Profil non trouve');
      }
    } catch (error) {
      console.error('Erreur lors de la recuperation du profil de l\'ami:', error);
    }
  };

  // Start a conversation
  const startConversation = async (friend) => {
    setSelectedFriend(friend);
    const friendUid = await getUserUid(friend.email);
    const participantIds = [currentUser.uid, friendUid];
    participantIds.sort();

    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(conversationsRef, where('participants', '==', participantIds));
      const existingConversations = await getDocs(q);

      if (!existingConversations.empty) {
        const existingConversation = existingConversations.docs[0];
        listenToMessages(existingConversation.id);
        setCurrentConversationId(existingConversation.id);
        setTimeout(scrollToBottom, 100); // Ensure that it scrolls to the latest message
      }
    } catch (error) {
      console.error("Erreur lors de la creation ou recuperation de la conversation :", error);
    }
  };

  // Listen to messages in the conversation
  const listenToMessages = (conversationId) => {
    const conversationRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(conversationRef, orderBy('createdAt', 'asc')); // Display messages from oldest to newest
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(messagesData);
      setTimeout(scrollToBottom, 100); // Scroll automatically to the last message
    });

    return unsubscribe;
  };

  // Send a message
  const sendMessage = async () => {
    if (newMessage.trim() && currentConversationId) {
      try {
        const messagesRef = collection(db, 'conversations', currentConversationId, 'messages');
        await addDoc(messagesRef, {
          text: newMessage,
          createdAt: new Date(),
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
        });

        setNewMessage('');
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && currentConversationId) {
      const storageReference = storageRef(storage, `conversations/${currentConversationId}/${file.name}`);
      await uploadBytes(storageReference, file);
      const downloadURL = await getDownloadURL(storageReference);
  
      // Enregistrer le fichier dans la collection de messages pour l'afficher dans la conversation
      await addDoc(collection(db, 'conversations', currentConversationId, 'messages'), {
        createdAt: new Date(),
        uploadedAt: new Date(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        fileUrl: downloadURL,
        fileName: file.name,
        fileType: file.type,
      });
  
      alert('Fichier telecharge avec succes');
    }
  };
  
  

  // Delete a message
  const deleteMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'conversations', currentConversationId, 'messages', messageId);
      await deleteDoc(messageRef);
      alert('Message supprime');
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-1/3 bg-white p-4 border-r overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Amis</h2>
        <button onClick={() => setShowInviteModal(true)} className="bg-blue-500 text-white py-1 px-2 rounded mb-4 hover:bg-blue-600 flex items-center">
          <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
          Ajouter un ami
        </button>

        <ul className="space-y-3">
          {friendRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Demandes d'ami</h3>
              {friendRequests.map((request, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200 cursor-pointer">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faUserCircle} className="text-gray-600 w-8 h-8" />
                    <div className="ml-3">
                      <p className="text-sm font-semibold">{request.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => acceptFriendRequest(request.uid)} className="text-green-500 hover:text-green-700">
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button onClick={() => declineFriendRequest(request.uid)} className="text-red-500 hover:text-red-700">
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                </li>
              ))}
            </div>
          )}

          <h3 className="text-sm font-semibold mt-4">Liste d'amis</h3>
          {friends.length > 0 ? (
            friends.map((friend, index) => (
              <li key={index} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200">
                <div className="flex items-center" onClick={() => fetchFriendProfile(friend.uid)}>
                  <FontAwesomeIcon icon={faUserCircle} className="text-gray-600 w-8 h-8" />
                  <div className="ml-3">
                    <p className="text-sm font-semibold cursor-pointer">{friend.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button onClick={() => startConversation(friend)} className="text-blue-500 hover:text-blue-600 mr-2">
                    <FontAwesomeIcon icon={faCommentDots} />
                  </button>
                  <button onClick={() => deleteFriend(friend.uid)} className="text-red-500 hover:text-red-700">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="text-gray-500">Aucun ami trouve</li>
          )}
        </ul>
      </div>

      <div className="w-full md:w-2/3 bg-gray-50 flex flex-col">
      <div className={`${isFullScreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-full md:w-2/3'} bg-gray-50 flex flex-col`}>
  {selectedFriend ? (
    <>
      <div className="p-4 bg-white shadow-md flex justify-between items-center">
        <button onClick={() => { setSelectedFriend(null); setIsFullScreen(false); }} className="text-red-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="flex-grow text-center">
          <p className="text-lg font-semibold">{selectedFriend.email}</p>
        </div>
      </div>

      <div className="flex justify-center space-x-1 bg-white p-1">
  <button onClick={() => setActiveTab('files')} className={`flex items-center px-1 py-0.5 rounded ${activeTab === 'files' ? 'bg-blue-100 text-blue-600 font-bold' : 'text-gray-600'} text-sm`}>
    <FontAwesomeIcon icon={faFolder} className="mr-1 w-3 h-3" />
    Fichiers
  </button>
  <button onClick={() => setActiveTab('chat')} className={`flex items-center px-1 py-0.5 rounded ${activeTab === 'chat' ? 'bg-blue-100 text-blue-600 font-bold' : 'text-gray-600'} text-sm`}>
    <FontAwesomeIcon icon={faCommentDots} className="mr-1 w-3 h-3" />
    Chat
  </button>
</div>



<div className="flex-grow overflow-y-auto p-4 space-y-2">
  {activeTab === 'chat' ? (
    // Afficher tous les types de messages dans l'onglet Chat
    messages.length > 0 ? (
      messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`p-3 rounded-lg shadow-md text-xs max-w-xs ${msg.senderId === currentUser.uid ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-200 text-black mr-auto'}`}
          style={{ alignSelf: msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start' }}
        >
          {/* Affiche le nom de l'expediteur uniquement si ce n'est pas le message de l'utilisateur actuel */}
          {msg.senderId !== currentUser.uid && (
            <p className="font-medium">{msg.senderName}</p>
          )}

          {/* Affichage pour texte, images, audio et autres fichiers */}
          {msg.fileUrl ? (
            msg.fileType && msg.fileType.startsWith('image/') ? (
              <img 
                src={msg.fileUrl} 
                alt="Previsualisation" 
                className="rounded-lg mt-2 max-w-full h-auto cursor-pointer"
                onClick={() => openFileModal(msg)} // Ouvrir le fichier en grand au clic
              />
            ) : msg.fileType && msg.fileType.startsWith('audio/') ? (
              <audio controls className="mt-2 w-full">
                <source src={msg.fileUrl} type={msg.fileType} />
                Votre navigateur ne supporte pas la lecture audio.
              </audio>
            ) : (
              <a 
                href={msg.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 underline mt-2 cursor-pointer"
              >
                {msg.fileName || "Telecharger le fichier"}
              </a>
            )
          ) : (
            <p>{msg.text}</p>
          )}

          {/* Affichage de l'heure et bouton de suppression pour l'expediteur */}
          <div className="flex justify-between items-center mt-1 text-xs">
            <span>
              {msg.createdAt && msg.createdAt.seconds 
                ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString() 
                : 'Heure non disponible'}
            </span>
            {msg.senderId === currentUser.uid && (
              <button onClick={() => deleteMessage(msg.id)} className="ml-2 text-white hover:text-red-600">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        </div>
      ))
    ) : (
      <p className="text-gray-500 text-center">Aucun message pour l'instant.</p>
    )
  ) : (
    // Afficher uniquement les fichiers tries dans l'onglet Fichiers
    files.length > 0 ? (
      files
      .sort((a, b) => {
        const dateA = a.uploadedAt && a.uploadedAt.seconds ? new Date(a.uploadedAt.seconds * 1000) : new Date(0);
        const dateB = b.uploadedAt && b.uploadedAt.seconds ? new Date(b.uploadedAt.seconds * 1000) : new Date(0);
        return dateB - dateA;
      })
      .map((file) => (
        <div key={file.id} className="p-3 bg-gray-200 rounded-lg shadow-md max-w-xs mx-auto cursor-pointer" onClick={() => openFileModal(file)}>
          {file.fileType && file.fileType.startsWith('image/') ? (
            <img src={file.fileUrl} alt={file.fileName} className="rounded-lg mt-2 max-w-full h-auto" />
          ) : (
            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              {file.fileName || "Telecharger le fichier"}
            </a>
          )}
          <p className="text-xs mt-2 text-gray-500">
            {file.uploadedAt && file.uploadedAt.seconds 
              ? new Date(file.uploadedAt.seconds * 1000).toLocaleTimeString() 
              : ''}
          </p>
        </div>
      ))

    ) : (
      <p className="text-gray-500 text-center">Aucun fichier disponible.</p>
    )
  )}
  <div ref={messagesEndRef} />
</div>





<div className="p-4 bg-white flex items-center border-t sticky bottom-0 space-x-2">
  {/* Bouton pour telecharger un fichier */}
  <button onClick={() => fileInputRef.current.click()} className="text-gray-500 hover:text-gray-700">
    <FontAwesomeIcon icon={faFileUpload} />
  </button>
  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

  {/* Champ de texte pour les messages */}
  <input
    type="text"
    value={newMessage}
    onChange={(e) => setNewMessage(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
    placeholder="Ecrire un message..."
    className="flex-grow p-2 border border-gray-300 rounded-md"
  />

  {/* Bouton pour capturer une photo */}
  <input 
    type="file" 
    accept="image/*" 
    capture="environment" 
    ref={cameraInputRef} 
    className="hidden" 
    onChange={handleCapturePhoto}
  />
  <button onClick={() => cameraInputRef.current.click()} className="text-gray-500 hover:text-gray-700">
    <FontAwesomeIcon icon={faCamera} />
  </button>

  {/* Ajout d'un element video cache pour l'apercu de la camera */}
  <video ref={videoRef} className="hidden" />

  {/* Bouton pour enregistrer l'audio */}
  {isRecording ? (
    <button onClick={stopRecording} className="text-red-500">
      <FontAwesomeIcon icon={faMicrophone} />
    </button>
  ) : (
    <button onClick={startRecording} className="text-gray-500 hover:text-gray-700">
      <FontAwesomeIcon icon={faMicrophone} />
    </button>
  )}

  {/* Bouton pour envoyer un message */}
  <button onClick={sendMessage} className="text-blue-500 hover:text-blue-600 ml-2">
    <FontAwesomeIcon icon={faPaperPlane} />
  </button>
</div>


    </>
  ) : (
    <div className="flex items-center justify-center h-full text-gray-500">Selectionnez un ami pour commencer une conversation</div>
  )}
</div>

      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm md:max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center">Ajouter un ami</h3>
            <input
              type="email"
              className="w-full p-2 border rounded mb-2"
              placeholder="Email de l'ami"
              value={invitedEmail}
              onChange={(e) => setInvitedEmail(e.target.value)}
            />
            <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500 w-full" onClick={inviteFriend}>
              Ajouter
            </button>
            <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 w-full mt-2" onClick={() => setShowInviteModal(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

{friendProfile && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl overflow-y-auto max-h-screen">
      <h3 className="text-2xl font-bold mb-4 text-center">Profil de l'ami</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(friendProfile).map(([key, value]) => (
          <p key={key} className="border-b py-2"><strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}</p>
        ))}
      </div>
      <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 w-full mt-6" onClick={() => setFriendProfile(null)}>Fermer</button>
    </div>
  </div>
)}

{selectedFile && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl">
      <button onClick={closeFileModal} className="text-red-500 hover:text-red-700 absolute top-4 right-4">Fermer</button>
      {selectedFile.fileType && selectedFile.fileType.startsWith('image/') ? (
        <img src={selectedFile.url} alt={selectedFile.name} className="rounded-lg max-w-full h-auto" />
      ) : (
        <a href={selectedFile.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-lg">
          {selectedFile.name || "Telecharger le fichier"}
        </a>
      )}
    </div>
  </div>
)}

    </div>
  );
};

export default Amis;
