import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDocs, onSnapshot, query, orderBy, where, deleteDoc, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faCommentDots, faPaperPlane, faTrash, faUsers, faTimes, faFolder } from '@fortawesome/free-solid-svg-icons';
import { storage } from '../firebase';
import { uploadBytes, getDownloadURL, ref as storageRef } from "firebase/storage";
import { faFileUpload, faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { faArrowLeft, faCamera } from '@fortawesome/free-solid-svg-icons';



const Acteurs = ({ chantierId }) => {
  const [members, setMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [generalConversationId, setGeneralConversationId] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null); // Conversation active
  const currentUser = auth.currentUser;
  const messagesEndRef = useRef(null); // Ref pour défiler vers le dernier message
  const [memberProfile, setMemberProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // Onglet actif ('chat' ou 'fichiers')
  const [files, setFiles] = useState([]); // Stocker les fichiers uploadés
  const fileInputRef = useRef(null); // Référence pour l'input de fichier
  const [selectedFile, setSelectedFile] = useState(null); // État pour le fichier sélectionné
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const videoRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const cameraInputRef = useRef(null);
  

  const handleCapturePhoto = async (e) => {
    const file = e.target.files[0];
    if (file && currentConversationId) {
      const storageReference = storageRef(storage, `conversations/${currentConversationId}/${file.name}`);
      await uploadBytes(storageReference, file);
      const downloadURL = await getDownloadURL(storageReference);
  
      // Enregistrer l'URL de l'image comme message
      const messageData = {
        createdAt: new Date(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        fileUrl: downloadURL,
        fileName: file.name,
        fileType: file.type,
      };
  
      await addDoc(collection(db, 'chantiers', chantierId, 'conversations', currentConversationId, 'messages'), messageData);
    }
  };

  


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    } catch (error) {
      console.error("Erreur d'accès à la caméra :", error);
    }
  };
  
  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  
    // Convertir l'image en URL et l'envoyer
    const photoDataUrl = canvas.toDataURL("image/png");
    // Utilisez photoDataUrl pour envoyer l'image dans un message
  };
  const startRecording = async () => {
    try {
      // Vérifier la compatibilité et demander la permission
      const hasPermissions = await navigator.permissions.query({ name: 'microphone' });
      if (hasPermissions.state === 'denied') {
        alert("Permission pour le microphone refusée. Veuillez l'autoriser dans les paramètres.");
        return;
      }
  
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
  
          // Enregistrer l'URL de l'audio comme message
          const messageData = {
            createdAt: new Date(),
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            fileUrl: downloadURL,
            fileName: audioFile.name,
            fileType: 'audio/webm',
          };
  
          await addDoc(collection(db, 'chantiers', chantierId, 'conversations', currentConversationId, 'messages'), messageData);
        }
      };
  
      recorder.onstop = () => {
        setIsRecording(false);
      };
    } catch (error) {
      console.error("Erreur d'accès au microphone :", error);
    }
  };
  
  
  
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  };
  
    

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Forcer le plein écran sur mobile lors de l'ouverture de la conversation
useEffect(() => {
  if (isMobile && selectedUser) {
    setIsFullScreen(true);
  }
}, [isMobile, selectedUser]);



// Fonction pour ouvrir le fichier en modale
const openFileModal = (file) => {
  setSelectedFile(file);
};

// Fonction pour fermer la modale
const closeFileModal = () => {
  setSelectedFile(null);
};

  // Scroll automatique vers le dernier message
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll à chaque mise à jour des messages
// Scroll automatique vers le bas lorsque l'onglet change ou que les fichiers sont chargés
useEffect(() => {
  setTimeout(scrollToBottom, 200); // Délai pour assurer le rendu complet avant de scroller
}, [messages,activeTab, files]);



  // Récupérer les participants et créer la conversation générale
  useEffect(() => {
    const fetchParticipants = async () => {
      if (chantierId) {
        try {
          const chantierRef = doc(db, 'chantiers', chantierId);
          const chantierSnapshot = await getDoc(chantierRef);

          if (chantierSnapshot.exists()) {
            const chantierData = chantierSnapshot.data();
            const gestionnaireEmail = chantierData.gestionnaire;

            const participantsCollection = collection(chantierRef, 'participants');
            const participantsSnapshot = await getDocs(participantsCollection);

            let participantsList = [];
            if (!participantsSnapshot.empty) {
              participantsList = participantsSnapshot.docs.map((doc) => ({
                uid: doc.id,
                ...doc.data(),
              }));
            }

            if (gestionnaireEmail && !participantsList.some(member => member.email === gestionnaireEmail)) {
              const uid = await getUserUid(gestionnaireEmail);  // Utilisez la fonction getUserUid pour récupérer l'UID correct
              participantsList.push({
                email: gestionnaireEmail,
                role: 'Gestionnaire',
                uid: uid || 'gestionnaire', // Assurez-vous d'utiliser l'UID correct
              });
            }
            

            setMembers(participantsList);
            createOrFetchGeneralConversation(participantsList);
          } else {
            console.warn("Le chantier n'existe pas.");
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des intervenants:', error);
        }
      }
    };

    fetchParticipants();
  }, [chantierId]);

  // Création ou récupération de la conversation générale
  const createOrFetchGeneralConversation = async (participantsList) => {
    const allParticipantIds = [currentUser.uid];
    for (const participant of participantsList) {
      const uid = await getUserUid(participant.email);
      if (uid) {
        allParticipantIds.push(uid);
      }
    }

    const uniqueParticipantIds = [...new Set(allParticipantIds)].sort();

    try {
      const conversationsRef = collection(db, 'chantiers', chantierId, 'conversations');
      const q = query(conversationsRef, where('participants', '==', uniqueParticipantIds));
      const existingConversations = await getDocs(q);

      if (!existingConversations.empty) {
        const existingConversation = existingConversations.docs[0];
        setGeneralConversationId(existingConversation.id);
      } else {
        const newConversationRef = await addDoc(conversationsRef, {
          participants: uniqueParticipantIds,
          createdAt: new Date(),
          name: 'Conversation générale',
        });
        setGeneralConversationId(newConversationRef.id);
      }
    } catch (error) {
      console.error("Erreur lors de la création ou récupération de la conversation générale :", error);
    }
  };

  // Récupérer l'UID d'un utilisateur via son email
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
      console.error('Erreur lors de la récupération de l\'UID de l\'utilisateur:', error);
    }
    return null;
  };

  const fetchMemberProfile = async (uid) => {
    try {
      const profileRef = doc(db, 'Utilisateurs', uid, 'Profiles', 'profileData'); // Chemin vers les données du profil
      const profileSnap = await getDoc(profileRef);
  
      if (profileSnap.exists()) {
        setMemberProfile(profileSnap.data()); // Stocker le profil récupéré
      } else {
        alert('Profil non trouvé');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    }
  };

  // Chargement des fichiers lorsque l'onglet "files" est actif
useEffect(() => {
  if (activeTab === 'files') {
    fetchFiles();
  }
}, [activeTab, currentConversationId]);
  
  
  // Démarrer une conversation
  const startConversation = async (user) => {
    setSelectedUser(user);
    setMessages([]); // Réinitialiser les messages au changement de conversation

    if (user.type === 'general') {
      listenToMessages(generalConversationId);
      setCurrentConversationId(generalConversationId); // Mettre à jour l'ID de la conversation active
      setTimeout(scrollToBottom, 100); // Scroller vers le dernier message
    } else {
      const selectedUserUid = await getUserUid(user.email);
      const participantIds = [currentUser.uid, selectedUserUid];
      participantIds.sort();

      try {
        const conversationsRef = collection(db, 'chantiers', chantierId, 'conversations');
        const q = query(conversationsRef, where('participants', '==', participantIds));
        const existingConversations = await getDocs(q);

        if (!existingConversations.empty) {
          const existingConversation = existingConversations.docs[0];
          listenToMessages(existingConversation.id);
          setCurrentConversationId(existingConversation.id); // Mettre à jour l'ID de la conversation active
          setTimeout(scrollToBottom, 100); // Scroller vers le dernier message
        } else {
          const newConversationRef = await addDoc(conversationsRef, {
            participants: participantIds,
            createdAt: new Date(),
          });
          setCurrentConversationId(newConversationRef.id);
          listenToMessages(newConversationRef.id); // Écouter les messages de cette nouvelle conversation
        }
      } catch (error) {
        console.error("Erreur lors de la création ou récupération de la conversation privée :", error);
      }
    }
  };

  // Écouter les messages de la conversation active
  const listenToMessages = (conversationId) => {
    const conversationRef = collection(db, 'chantiers', chantierId, 'conversations', conversationId, 'messages');
    const q = query(conversationRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(messagesData);
      setTimeout(scrollToBottom, 100); // Scroller automatiquement vers le dernier message
    });

    return unsubscribe;
  };

  // Envoyer un message
  const sendMessage = async () => {
    if ((newMessage.trim() || fileInputRef.current.files[0]) && currentConversationId) {
      const messageData = {
        createdAt: new Date(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
      };
  
      // Ajoutez un fichier s'il y en a un
      const file = fileInputRef.current.files[0];
      if (file) {
        const storageReference = storageRef(storage, `conversations/${currentConversationId}/${file.name}`);
        await uploadBytes(storageReference, file);
        const downloadURL = await getDownloadURL(storageReference);
  
        messageData.fileUrl = downloadURL;
        messageData.fileName = file.name;
        messageData.fileType = file.type;
      } else {
        messageData.text = newMessage;
      }
  
      await addDoc(collection(db, 'chantiers', chantierId, 'conversations', currentConversationId, 'messages'), messageData);
  
      setNewMessage('');
      fileInputRef.current.value = ''; // Réinitialiser l'input de fichier
    }
  };
  

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && currentConversationId) {
      const storageReference = storageRef(storage, `conversations/${currentConversationId}/${file.name}`);
      await uploadBytes(storageReference, file);
      const downloadURL = await getDownloadURL(storageReference);
  
      // Ajout du fichier dans Firestore
      await addDoc(collection(db, 'chantiers', chantierId, 'conversations', currentConversationId, 'files'), {
        url: downloadURL,
        name: file.name,
        uploadedAt: new Date(),
        fileType: file.type,
      });
  
      alert('Fichier téléchargé avec succès');
    }
  };
  
  const fetchFiles = async () => {
    if (currentConversationId) {
      const filesCollectionRef = collection(db, 'chantiers', chantierId, 'conversations', currentConversationId, 'files');
      const filesSnapshot = await getDocs(filesCollectionRef);
      const fetchedFiles = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFiles(fetchedFiles); // Mettez à jour l'état des fichiers
    }
  };
  

  

  // Envoi de message avec la touche Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Supprimer un message
  const deleteMessage = async (messageId) => {
    try {
      const messageRef = doc(db, 'chantiers', chantierId, 'conversations', currentConversationId, 'messages', messageId);
      await deleteDoc(messageRef);
      alert('Message supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Liste des participants */}
      <div className="w-full md:w-1/3 bg-white p-4 border-r overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Intervenants</h2>
        <ul className="space-y-3">
          <li
            className="flex items-center justify-between p-3 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200 cursor-pointer"
            onClick={() => startConversation({ type: 'general' })}
          >
            <div className="flex items-center">
              <FontAwesomeIcon icon={faUsers} className="text-gray-600 w-8 h-8" />
              <div className="ml-3">
                <p className="text-sm font-semibold">Conversation générale</p>
              </div>
            </div>
          </li>

          {members.length > 0 ? (
            members.map((member, index) => (
              <li key={index} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200 cursor-pointer">
              <div className="flex items-center" onClick={() => fetchMemberProfile(member.uid)}>
                <FontAwesomeIcon icon={faUserCircle} className="text-gray-600 w-8 h-8" />
                <div className="ml-3">
                  <p className="text-sm font-semibold cursor-pointer">{member.email}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
              </div>
              <button onClick={() => startConversation(member)} className="text-blue-500 hover:text-blue-600">
                <FontAwesomeIcon icon={faCommentDots} />
              </button>
            </li>
            
            ))
          ) : (
            <li className="text-gray-500">Aucun intervenant trouvé</li>
          )}
        </ul>
      </div>

 

{/* Chat de la conversation */}
<div className={`${isFullScreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-full md:w-2/3'} bg-gray-50 flex flex-col`}>

  {selectedUser ? (
    <>
      {/* En-tête de la conversation avec flèche de retour, nom et onglets Photos/Chat */}
      {/* En-tête de la conversation avec flèche de retour, nom et onglets Fichiers/Chat */}
      <div className="p-2 bg-white shadow-md flex flex-col items-center space-y-1">
  <div className="flex items-center w-full">
    {/* Bouton de retour, toujours aligné à gauche */}
    <button 
      onClick={() => {
        if (isFullScreen && isMobile) {
          setSelectedUser(null); // Ferme la conversation
          setIsFullScreen(false); // Désactive le mode plein écran
        } else {
          setSelectedUser(null); // Retourne à la liste des utilisateurs
        }
      }} 
      className="text-blue-500 hover:text-blue-600 mr-2"
      style={{ position: 'absolute', left: '10px' }} // Position fixe pour rester à gauche
    >
      <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
    </button>

    {/* Nom de l'utilisateur avec icône, centré */}
    <div className="flex-grow flex items-center justify-center">
      <FontAwesomeIcon icon={faUserCircle} className="text-gray-600 w-5 h-5 mr-2" />
      <div className="text-center">
        <p className="text-sm font-semibold">{selectedUser.name || selectedUser.email || "Conversation générale"}</p>
        <p className="text-xs text-gray-500">{selectedUser.role}</p>
      </div>
    </div>
  </div>

  {/* Onglets Fichiers et Chat */}
  <div className="flex justify-center space-x-2 w-full mt-1">
    <button onClick={() => setActiveTab('files')} className={`flex items-center px-2 py-1 rounded-full ${activeTab === 'files' ? 'bg-blue-100 text-blue-600 font-bold' : 'text-gray-600'}`}>
      <FontAwesomeIcon icon={faFolder} className="mr-1 w-4 h-4" /> {/* Icône Fichiers */}
      <span className="text-xs">Fichiers</span>
    </button>
    <button onClick={() => setActiveTab('chat')} className={`flex items-center px-2 py-1 rounded-full ${activeTab === 'chat' ? 'bg-blue-100 text-blue-600 font-bold' : 'text-gray-600'}`}>
      <FontAwesomeIcon icon={faCommentDots} className="mr-1 w-4 h-4" /> {/* Icône Chat */}
      <span className="text-xs">Chat</span>
    </button>
  </div>
</div>




      

      {/* Contenu de la conversation (Chat ou Photos) */}
{/* Contenu de la conversation (Chat ou Fichiers) */}
<div className="flex-grow overflow-y-auto p-4 space-y-2">
  {activeTab === 'chat' ? (
    messages.length > 0 ? (
      messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`p-3 rounded-lg shadow-md text-xs max-w-xs ${msg.senderId === currentUser.uid ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-200 text-black mr-auto'}`}
          style={{ alignSelf: msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start' }}
        >
          {/* Affiche le nom de l'expéditeur uniquement si ce n'est pas le message de l'utilisateur actuel */}
          {msg.senderId !== currentUser.uid && (
            <p className="font-medium">{msg.senderName}</p>
          )}

          {/* Vérification pour l'affichage de la prévisualisation des fichiers */}
          {msg.fileUrl ? (
  msg.fileType && msg.fileType.startsWith('image/') ? (
    <img 
      src={msg.fileUrl} 
      alt="Prévisualisation" 
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
      {msg.fileName || "Télécharger le fichier"}
    </a>
  )
) : (
  <p>{msg.text}</p>
)}


          
          <div className="flex justify-between items-center mt-1 text-xs">
            <span>{new Date(msg.createdAt.seconds * 1000).toLocaleTimeString()}</span>
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
    files.length > 0 ? (
      files.map((file, index) => (
        <div key={file.id} className="p-3 bg-gray-200 rounded-lg shadow-md max-w-xs mx-auto cursor-pointer" onClick={() => openFileModal(file)}>

        {/* Vérification pour l'affichage de la prévisualisation des fichiers */}
          {file.fileType && file.fileType.startsWith('image/') ? (
            <img src={file.url} alt={file.name} className="rounded-lg mt-2 max-w-full h-auto" />
          ) : (
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              {file.name || "Télécharger le fichier"}
            </a>
          )}
          <p className="text-xs mt-2 text-gray-500">{new Date(file.uploadedAt.seconds * 1000).toLocaleTimeString()}</p>
        </div>
      ))
    ) : (
      <p className="text-gray-500 text-center">Aucun fichier disponible.</p>
    )
  )}
  <div ref={messagesEndRef} />
</div>



      {/* Barre de saisie de message avec les icônes de fichier, caméra et microphone */}
      <div className="p-4 bg-white flex items-center border-t sticky bottom-0 space-x-2">
  {/* Bouton pour télécharger un fichier */}
  <button onClick={() => fileInputRef.current.click()} className="text-gray-500 hover:text-gray-700">
    <FontAwesomeIcon icon={faFileUpload} />
  </button>
  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

  {/* Champ de texte pour les messages */}
  <input
    type="text"
    value={newMessage}
    onChange={(e) => setNewMessage(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="Aa"
    className="flex-grow p-2 border border-gray-300 rounded-md"
  />

  {/* Bouton pour capturer une photo */}
 {/* Bouton pour capturer une photo */}

<input 
  type="file" 
  accept="image/*" 
  capture="environment" 
  ref={cameraInputRef} 
  className="hidden" 
  onChange={handleCapturePhoto}
/>


  {/* Ajout d'un élément vidéo caché pour l'aperçu de la caméra */}
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
  ) : ( null )}
</div>





      {memberProfile && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl overflow-y-auto max-h-screen">
      <h3 className="text-2xl font-bold mb-4 text-center">Profil de l'intervenant</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(memberProfile).map(([key, value]) => (
          <p key={key} className="border-b py-2"><strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}</p>
        ))}
      </div>
      <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 w-full mt-6" onClick={() => setMemberProfile(null)}>Fermer</button>
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
          {selectedFile.name || "Télécharger le fichier"}
        </a>
      )}
    </div>
  </div>
)}


    </div>
  );
};

export default Acteurs;
