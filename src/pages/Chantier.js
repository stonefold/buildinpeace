// Chantier.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTrash, faClipboardList, faComments, faFileAlt,
  faEnvelope, faEye, faArrowLeft, faUserPlus, faUsers
} from '@fortawesome/free-solid-svg-icons';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, getDoc, getDocs, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { auth } from '../auth';

import Offres from './Offres';
import Factures from './Factures';
import Contrat from './Contrat';
import Avancement from './Avancement';
import Assurance from './Assurance';
import Conversations from './Conversations';
import Documents from './Documents';
import Todo from './Todo'
import Acteurs from './Acteurs'
import Plan from './Plan';


// Définition des permissions pour chaque rôle
const rolePermissions = {
  'Entrepreneur': {
    mainMenus: ['Administratif', 'Documents','Plan', 'Tâches', 'Acteurs'],
    adminSubMenus: ['Offres', 'Factures', 'Contrat', 'Avancement', 'Assurance'],
  },
  'Gestionnaire': {
    mainMenus: ['Administratif', 'Documents' ,'Plan', 'Tâches', 'Acteurs'],
    adminSubMenus: ['Offres', 'Factures', 'Contrat', 'Avancement', 'Assurance'],
  },
  'Client': {
    mainMenus: ['Administratif', 'Documents',,'Plan', 'Acteurs'],
    adminSubMenus: ['Offres', 'Factures', 'Contrat', 'Avancement', 'Assurance'], // Pas d'accès aux sous-menus d'Administratif
  },
  'Architecte': {
    mainMenus: ['Administratif','Documents','Plan',  'Tâches', 'Acteurs'],
    adminSubMenus: ['Offres', 'Factures', 'Contrat', 'Avancement', 'Assurance'], // Pas d'accès aux sous-menus d'Administratif
  },
  'Ouvrier': {
    mainMenus: ['Documents', 'Tâches', 'Acteurs','Plan'],
    adminSubMenus: [], // Pas d'accès aux sous-menus d'Administratif
  },
  'Sous-Traitants': {
    mainMenus: ['Documents', 'Tâches', 'Acteurs','Plan'],
    adminSubMenus: [], // Pas d'accès aux sous-menus d'Administratif
  },
  // Ajoutez d'autres rôles si nécessaire
};


const Chantier = () => {
  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState(null);
  const [selectedChantierDetails, setSelectedChantierDetails] = useState(null);
  const [showClientInfoModal, setShowClientInfoModal] = useState(false);

  const [newChantier, setNewChantier] = useState({
    name: '',
    client: '',
    startDate: '',
    endDate: '',
  });
  const [selectedMenu, setSelectedMenu] = useState('Administratif');
  const [selectedSubMenu, setSelectedSubMenu] = useState('Offres'); 
  const [gestionnaire, setGestionnaire] = useState('');
  const [showChantierModal, setShowChantierModal] = useState(false); 
  const [showInviteModal, setShowInviteModal] = useState(false); 
  const [showIntervenantsModal, setShowIntervenantsModal] = useState(false); 
  const [invitedEmail, setInvitedEmail] = useState('');
  const [role, setRole] = useState('');
  
  const [intervenants, setIntervenants] = useState([]);
  const [allowedSubMenus, setAllowedSubMenus] = useState([]); 
  const [allowedAdminSubMenus, setAllowedAdminSubMenus] = useState([]); // Sous-menus autorisés pour 'Administratif'
// Sous-menus autorisés


useEffect(() => {
  const fetchUserRole = async () => {
    const currentUser = auth.currentUser;

    if (currentUser && selectedChantierId) {
      try {
        // Accéder à la sous-collection "participants" pour l'ID du chantier actuel
        const participantsCollectionRef = collection(db, `chantiers/${selectedChantierId}/participants`);
        const participantsSnapshot = await getDocs(participantsCollectionRef);

        // Rechercher le rôle de l'utilisateur connecté dans les participants
        let roleUtilisateur = '';
        participantsSnapshot.forEach((doc) => {
          const participantData = doc.data();
          if (participantData.email === currentUser.email) {
            roleUtilisateur = participantData.role;
          }
        });

        if (roleUtilisateur) {
          console.log('Rôle utilisateur récupéré:', roleUtilisateur); // Affiche le rôle récupéré
          setRole(roleUtilisateur);
        } else {
          console.error('Rôle utilisateur non trouvé dans les participants');
          setRole(''); // Aucun rôle attribué si non trouvé
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du rôle utilisateur : ', error);
        setRole(''); // Aucun rôle attribué en cas d'erreur
      }
    }
  };

  fetchUserRole();
}, [selectedChantierId]);

  
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setGestionnaire(user.email);
  
        // Access the centralized "chantiers" collection
        const chantiersCollection = collection(db, 'chantiers');
  
        // Listen to changes in the "chantiers" collection
        const unsubscribeChantiers = onSnapshot(chantiersCollection, (snapshot) => {
          const fetchedChantiers = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() })) // Fetch all chantiers
            .filter(chantier => 
              chantier.gestionnaire === user.email || // If the current user is the gestionnaire
              chantier.participants?.some(participant => participant.email === user.email) // Or the current user is a participant
            );
  
          // Update the state with chantiers relevant to the current user
          setChantiers(fetchedChantiers);
          console.log("Tous les chantiers récupérés :", fetchedChantiers);
        });
  
        // Clean up the listener when the component unmounts or the user changes
        return () => unsubscribeChantiers();
      } else {
        setChantiers([]); // Clear the list if no user is logged in
      }
    });
  
    // Cleanup the authentication listener when the component unmounts
    return () => unsubscribeAuth();
  }, []);
  

  const addChantier = async () => {
    const { name, client, startDate, endDate } = newChantier;
    if (name.trim() && client.trim() && startDate && endDate) {
        try {
            // Récupérer l'utilisateur connecté
            const currentUser = auth.currentUser;

            if (currentUser) {
                // Créer un nouveau chantier avec l'utilisateur actuel en tant qu'Entrepreneur
                const chantierRef = await addDoc(collection(db, 'chantiers'), {
                    name,
                    client,
                    gestionnaire,
                    startDate,
                    endDate,
                    participants: [
                        { email: gestionnaire, role: 'Gestionnaire' }, // Gestionnaire ajouté
                        { email: currentUser.email, role: 'Entrepreneur' } // Utilisateur connecté ajouté comme Entrepreneur
                    ],
                });

                // Ajouter les participants à la sous-collection "participants"
                const participantsCollectionRef = collection(chantierRef, 'participants');

                // Ajouter le gestionnaire dans la sous-collection "participants"
                await setDoc(doc(participantsCollectionRef, gestionnaire), {
                    email: gestionnaire,
                    role: 'Gestionnaire'
                });

                // Ajouter l'utilisateur connecté en tant qu'Entrepreneur dans la sous-collection "participants"
                await setDoc(doc(participantsCollectionRef, currentUser.email), {
                    email: currentUser.email,
                    role: 'Entrepreneur'
                });

                setNewChantier({ name: '', client: '', startDate: '', endDate: '' });
                setShowChantierModal(false);
            } else {
                console.error("Aucun utilisateur connecté.");
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout du chantier : ', error);
        }
    } else {
        alert("Veuillez remplir tous les champs.");
    }
};


  const inviteIntervenant = async () => {
    if (invitedEmail.trim() && role.trim() && selectedChantierId) {
        try {
            const currentUserUid = auth.currentUser?.uid;
            const chantierRef = doc(db, 'chantiers', selectedChantierId); // Centralized collection

            // Afficher dans la console l'UID de l'utilisateur actuel et l'ID du chantier sélectionné
            console.log(`UID de l'utilisateur actuel : ${currentUserUid}, ID du chantier sélectionné : ${selectedChantierId}`);

            // Ajouter l'intervenant à la sous-collection 'participants' du chantier actuel
            const participantDocRef = collection(chantierRef, 'participants');
            await addDoc(participantDocRef, {
                email: invitedEmail,
                role: role,
            });

            // Récupérer les détails du chantier
            const chantierSnapshot = await getDoc(chantierRef);
            if (!chantierSnapshot.exists()) {
                throw new Error("Chantier introuvable");
            }

            const chantierData = chantierSnapshot.data();

            // Rechercher l'utilisateur invité dans Firestore par son e-mail
            const usersCollection = collection(db, 'Utilisateurs');
            const userSnapshot = await getDocs(usersCollection);
            let invitedUserId = null;

            userSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.email === invitedEmail) {
                    invitedUserId = doc.id; // ID de l'utilisateur invité
                }
            });

            if (!invitedUserId) {
                throw new Error("Utilisateur invité introuvable");
            }

            // Log de l'UID de l'utilisateur invité trouvé
            console.log(`UID de l'utilisateur invité trouvé : ${invitedUserId}`);

            // Ajouter le chantier à la collection 'chantiers' de l'utilisateur invité en utilisant son UID
            // Directly update the centralized chantier with the new participant
await updateDoc(chantierRef, {
  participants: arrayUnion({ email: invitedEmail, role }) // Add the new participant
});


            // Log de confirmation que le chantier a été ajouté
            console.log(`Chantier ajouté avec succès pour l'utilisateur invité avec l'UID ${invitedUserId}`);

            // Mettre à jour l'état local
            setIntervenants([...intervenants, { email: invitedEmail, role }]);
            setInvitedEmail('');
            setRole('Entrepreneur'); // Réinitialiser le rôle par défaut
            setShowInviteModal(false);

            // Mettre à jour la liste des participants dans les détails du chantier actuel
            const updatedParticipants = chantierData.participants || [];
            updatedParticipants.push({ email: invitedEmail, role });

            await updateDoc(chantierRef, { participants: updatedParticipants });
            setSelectedChantierDetails({ ...chantierData, participants: updatedParticipants });

        } catch (error) {
            console.error('Erreur lors de l\'invitation de l\'intervenant : ', error);
            alert("Erreur lors de l'invitation de l'intervenant. Veuillez vérifier les informations saisies.");
        }
    } else {
        alert("Veuillez remplir tous les champs.");
    }
};



  const deleteChantier = async (chantierId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce chantier ?')) {
      try {
        await deleteDoc(doc(db, 'chantiers', chantierId)); // Centralized "chantiers" collection
        setChantiers(chantiers.filter((chantier) => chantier.id !== chantierId));
      } catch (error) {
        console.error('Erreur lors de la suppression du chantier : ', error);
      }
    }
  };

  const selectChantier = async (chantierId) => {
    setSelectedChantierId(chantierId);
    try {
      const currentUserUid = auth.currentUser?.uid;
      const chantierRef = doc(db, 'chantiers', chantierId); // Centralized collection
  
      // Récupérer les détails du chantier
      const chantierDoc = await getDoc(chantierRef);
      if (chantierDoc.exists()) {
        const chantierDetails = chantierDoc.data();
        setSelectedChantierDetails(chantierDetails);
  
        // Récupérer tous les intervenants à partir de la sous-collection 'participants'
        const participantsCollection = collection(chantierRef, 'participants');
        const participantsSnapshot = await getDocs(participantsCollection);
  
        const participantsList = participantsSnapshot.docs.map((doc) => doc.data());
  
        // Ajouter le gestionnaire à la liste des intervenants
      // Mise à jour de la liste des intervenants
setIntervenants(participantsList);

  
        // Mettre à jour l'état avec la liste des intervenants
        setIntervenants(participantsList);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du chantier : ', error);
    }
  };

  useEffect(() => {
    if (role && rolePermissions[role]) {
      const permissions = rolePermissions[role];
      setAllowedSubMenus(permissions.mainMenus || []);
      setAllowedAdminSubMenus(permissions.adminSubMenus || []);
      console.log(`Menus autorisés pour le rôle ${role}:`, permissions); // Log des permissions récupérées
    } else {
      // Si aucun rôle n'est défini ou reconnu, pas d'accès aux menus
      setAllowedSubMenus([]);
      setAllowedAdminSubMenus([]);
      console.error(`Rôle ${role} non reconnu ou permissions manquantes.`);
    }
  }, [role]);
  
  
  
  
  const renderSelectedMenu = () => {
    switch (selectedMenu) {
      case 'Administratif':
        return (
          <div className="bg-white p-2 rounded shadow-sm">
            <div className="relative">
              {allowedAdminSubMenus.length > 0 ? (
                <select
                  className="w-full p-2 bg-gray-200 rounded border border-gray-300 text-xs sm:text-sm"
                  value={selectedSubMenu}
                  onChange={(e) => setSelectedSubMenu(e.target.value)}
                >
                  {allowedAdminSubMenus.map((submenu) => (
                    <option key={submenu} value={submenu}>{submenu}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-600"></p>
              )}
            </div>
            <div className="mt-2">
              {selectedSubMenu === 'Offres' && <Offres chantierId={selectedChantierId} chantierName={selectedChantierDetails?.name} />}
              {selectedSubMenu === 'Factures' && <Factures chantierId={selectedChantierId} chantierName={selectedChantierDetails?.name} />}
              {selectedSubMenu === 'Contrat' && <Contrat chantierId={selectedChantierId} chantierName={selectedChantierDetails?.name} />}
              {selectedSubMenu === 'Avancement' && <Avancement chantierId={selectedChantierId} chantierName={selectedChantierDetails?.name} />}
              {selectedSubMenu === 'Assurance' && <Assurance chantierId={selectedChantierId} chantierName={selectedChantierDetails?.name} />}
            </div>
          </div>
        );
      case 'Conversations':
        return <Conversations />;
      case 'Tâches':
        return <Todo chantierId={selectedChantierId} />;
      case 'Acteurs':
        return <Acteurs chantierId={selectedChantierId} />;
      case 'Documents':
        return <Documents chantierId={selectedChantierId} />;
        case 'Plan':
          return <Plan chantierId={selectedChantierId} />;
        
      default:
        return <p>Veuillez sélectionner une section à afficher.</p>;
    }
  };

  const handleRoleChange = async (email, newRole) => {
    try {
      const chantierRef = doc(db, 'chantiers', selectedChantierId);
      const participantsCollectionRef = collection(chantierRef, 'participants');
      const participantSnapshot = await getDocs(participantsCollectionRef);
  
      let participantId = null;
      participantSnapshot.forEach(doc => {
        if (doc.data().email === email) {
          participantId = doc.id;
        }
      });
  
      if (participantId) {
        const participantDocRef = doc(participantsCollectionRef, participantId);
        await updateDoc(participantDocRef, {
          role: newRole
        });
  
        // Mise à jour locale de l'état des intervenants après modification
        const updatedIntervenants = intervenants.map(intervenant =>
          intervenant.email === email ? { ...intervenant, role: newRole } : intervenant
        );
        setIntervenants(updatedIntervenants);
  
        alert("Rôle modifié avec succès !");
      } else {
        alert("Erreur lors de la modification du rôle : Participant introuvable.");
      }
    } catch (error) {
      console.error("Erreur lors de la modification du rôle : ", error);
      alert("Erreur lors de la modification du rôle.");
    }
  };

  const deleteParticipant = async (email) => {
    try {
      const chantierRef = doc(db, 'chantiers', selectedChantierId);
      const participantsCollectionRef = collection(chantierRef, 'participants');
      const participantSnapshot = await getDocs(participantsCollectionRef);
  
      let participantId = null;
      participantSnapshot.forEach(doc => {
        if (doc.data().email === email) {
          participantId = doc.id;
        }
      });
  
      if (participantId) {
        const participantDocRef = doc(participantsCollectionRef, participantId);
        await deleteDoc(participantDocRef);
  
        // Mise à jour locale de l'état des intervenants après suppression
        const updatedIntervenants = intervenants.filter(intervenant => intervenant.email !== email);
        setIntervenants(updatedIntervenants);
  
        alert("Participant supprimé avec succès !");
      } else {
        alert("Erreur lors de la suppression : Participant introuvable.");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du participant : ", error);
      alert("Erreur lors de la suppression du participant.");
    }
  };
  
  
  

  return (
    <div className="flex flex-col p-2 lg:p-4 bg-white rounded-lg shadow-md">
      {!selectedChantierId ? (
        <div className="w-full">
          <button
            onClick={() => setShowChantierModal(true)}
            className="bg-gray-600 text-white py-1 px-3 rounded hover:bg-gray-500 mb-4"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Ajouter un chantier
          </button>

          <div className="block md:hidden space-y-2">
            {chantiers.map((chantier, index) => (
              <div key={chantier.id} className="bg-white p-3 mb-2 shadow-md rounded border border-gray-300">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-sm">{`${index + 1}. ${chantier.name}`}</h3>
                  <div className="flex space-x-2">
                    <button onClick={() => selectChantier(chantier.id)} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500" title="Voir">
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button onClick={() => deleteChantier(chantier.id)} className="bg-red-600 text-white p-1 rounded hover:bg-red-500" title="Supprimer">
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
                <p className="text-xs"><strong>Client:</strong> {chantier.client}</p>
                <p className="text-xs"><strong>Gestionnaire:</strong> {chantier.gestionnaire}</p>
                <p className="text-xs"><strong>Début:</strong> {chantier.startDate}</p>
                <p className="text-xs"><strong>Fin:</strong> {chantier.endDate}</p>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-auto border-collapse border border-gray-300 text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-200 text-gray-600">
                  <th className="border border-gray-300 p-1 sm:p-2">N°</th>
                  <th className="border border-gray-300 p-1 sm:p-2">Titre</th>
                  <th className="border border-gray-300 p-1 sm:p-2">Client</th>
                  <th className="border border-gray-300 p-1 sm:p-2">Gestionnaire</th>
                  <th className="border border-gray-300 p-1 sm:p-2">Début</th>
                  <th className="border border-gray-300 p-1 sm:p-2">Fin</th>
                  <th className="border border-gray-300 p-1 sm:p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chantiers.map((chantier, index) => (
                  <tr key={chantier.id} className="hover:bg-gray-100 cursor-pointer">
                    <td className="border border-gray-300 p-1 sm:p-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-1 sm:p-2">{chantier.name}</td>
                    <td className="border border-gray-300 p-1 sm:p-2">{chantier.client}</td>
                    <td className="border border-gray-300 p-1 sm:p-2">{chantier.gestionnaire}</td>
                    <td className="border border-gray-300 p-1 sm:p-2 text-center">{chantier.startDate}</td>
                    <td className="border border-gray-300 p-1 sm:p-2 text-center">{chantier.endDate}</td>
                    <td className="border border-gray-300 p-1 sm:p-2 text-center flex justify-center space-x-1">
                      <button onClick={() => selectChantier(chantier.id)} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500" title="Voir">
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button onClick={() => deleteChantier(chantier.id)} className="bg-red-600 text-white p-1 rounded hover:bg-red-500" title="Supprimer">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setSelectedChantierId(null)} className="bg-gray-600 text-white py-1 px-2 rounded hover:bg-gray-500">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Retour
            </button>
            <div className="flex space-x-1">
            {["Gestionnaire", "Entrepreneur"].includes(role) && (
  <button onClick={() => setShowIntervenantsModal(true)} className="bg-green-600 text-white py-1 px-2 rounded hover:bg-green-500 text-xs flex items-center">
    <FontAwesomeIcon icon={faUsers} className="mr-1" />
    Gérer accès
  </button>
)}

{/* Afficher le bouton "Inviter" uniquement si le rôle est "Gestionnaire" ou "Entrepreneur" */}
{["Gestionnaire", "Entrepreneur"].includes(role) && (
  <button onClick={() => setShowInviteModal(true)} className="bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-500 text-xs flex items-center">
    <FontAwesomeIcon icon={faEnvelope} className="mr-1" />
    Inviter
  </button>
)}

              <button onClick={() => setShowClientInfoModal(true)} className="bg-orange-600 text-white py-1 px-2 rounded hover:bg-orange-500 text-xs flex items-center">
                <FontAwesomeIcon icon={faClipboardList} className="mr-1" />
              </button>
            </div>
          </div>

          <div className="flex space-x-1 overflow-x-auto mb-2">
          {allowedSubMenus.map((menu) => (
  <button
    key={menu}
    className={`py-1 px-2 text-xs rounded ${selectedMenu === menu ? 'bg-gray-700 text-white' : 'bg-gray-300'} flex-shrink-0`}
    onClick={() => setSelectedMenu(menu)}
  >
    {menu}
  </button>
))}


          </div>

          <div className="mt-2">
            {renderSelectedMenu()}
          </div>
        </div>
      )}

      {/* Modal "Ajouter un Chantier" */}
      {showChantierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm md:max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center">Ajouter un Chantier</h3>
            <input type="text" className="w-full p-2 border rounded mb-2" placeholder="Nom du chantier" value={newChantier.name} onChange={(e) => setNewChantier({ ...newChantier, name: e.target.value })} />
            <input type="text" className="w-full p-2 border rounded mb-2" placeholder="Client" value={newChantier.client} onChange={(e) => setNewChantier({ ...newChantier, client: e.target.value })} />
            <input type="date" className="w-full p-2 border rounded mb-2" value={newChantier.startDate} onChange={(e) => setNewChantier({ ...newChantier, startDate: e.target.value })} />
            <input type="date" className="w-full p-2 border rounded mb-2" value={newChantier.endDate} onChange={(e) => setNewChantier({ ...newChantier, endDate: e.target.value })} />
            <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500 w-full" onClick={addChantier}>Ajouter</button>
            <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 w-full mt-2" onClick={() => setShowChantierModal(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Modal "Inviter Intervenant" */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm md:max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center">Inviter un Intervenant</h3>
            <input type="email" className="w-full p-2 border rounded mb-2" placeholder="Email de l'intervenant" value={invitedEmail} onChange={(e) => setInvitedEmail(e.target.value)} />
            <select className="w-full p-2 border rounded mb-2" value={role} onChange={(e) => setRole(e.target.value)}>
  <option value="">Sélectionner un rôle</option>
  <option value="Entrepreneur">Entrepreneur</option>
  <option value="Architecte">Architecte</option>
  <option value="Ouvrier">Ouvrier</option>
  <option value="Client">Client</option>
  <option value="Sous-Traitants"></option>

</select>
            <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-500 w-full" onClick={inviteIntervenant}>Inviter</button>
            <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 w-full mt-2" onClick={() => setShowInviteModal(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Modal "Visualiser Intervenants" */}
      {showIntervenantsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm md:max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center">Liste des Intervenants</h3>
            {intervenants.length > 0 ? intervenants.map((intervenant, index) => (
  <div key={index} className="mb-4">
    <div className="bg-gray-100 p-2 rounded shadow-md">
      <p className="font-bold text-sm">Email: {intervenant.email}</p>
      <label className="block mt-2">
        <span className="text-sm">Rôle:</span>
        <div className="flex items-center space-x-2">
          <select
            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm p-2"
            value={intervenant.role}
            onChange={(e) => handleRoleChange(intervenant.email, e.target.value)}
          >
            <option value="Entrepreneur">Entrepreneur</option>
            <option value="Architecte">Architecte</option>
            <option value="Ouvrier">Ouvrier</option>
            <option value="Client">Client</option>
            <option value="Gestionnaire">Gestionnaire</option>
            <option value="Sous-Traitants">Sous-Traitants</option>
          </select>

          {/* Bouton poubelle pour suppression */}
          <button
            onClick={() => deleteParticipant(intervenant.email)}
            className="text-red-600 hover:text-red-800"
            title="Supprimer cet intervenant"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </label>
    </div>
  </div>
)) : (
  <p>Aucun intervenant pour l'instant.</p>
)}


            <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 w-full mt-2" onClick={() => setShowIntervenantsModal(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chantier;
