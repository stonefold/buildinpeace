// Profile.jsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';

const Profile = () => {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    occupation: '',
    phoneNumber: '',
    vatNumber: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    website: '',
    companyName: '',
    bankAccount: '',
    iban: '',
    bic: '',
  });

  const currentUser = auth.currentUser;

  // Fetch the user's existing profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (currentUser) {
        const profileRef = doc(db, 'Utilisateurs', currentUser.uid, 'Profiles', 'profileData');
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfileData(profileSnap.data());
        }
      }
    };
    fetchProfileData();
  }, [currentUser]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  // Save profile data to Firestore
  const saveProfile = async () => {
    try {
      if (currentUser) {
        const profileRef = doc(db, 'Utilisateurs', currentUser.uid, 'Profiles', 'profileData');
        await setDoc(profileRef, profileData);
        alert('Profil enregistré avec succès !');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil : ', error);
      alert('Une erreur est survenue lors de l\'enregistrement du profil.');
    }
  };

  return (
    <div className="profile-container p-4 max-w-screen-lg mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Mon Profil</h2>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Prénom</label>
              <input
                type="text"
                name="firstName"
                value={profileData.firstName}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <input
                type="text"
                name="lastName"
                value={profileData.lastName}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse e-mail</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Métier</label>
              <input
                type="text"
                name="occupation"
                value={profileData.occupation}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Numéro de téléphone</label>
              <input
                type="text"
                name="phoneNumber"
                value={profileData.phoneNumber}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Numéro de TVA</label>
              <input
                type="text"
                name="vatNumber"
                value={profileData.vatNumber}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse</label>
              <input
                type="text"
                name="address"
                value={profileData.address}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ville</label>
              <input
                type="text"
                name="city"
                value={profileData.city}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Code Postal</label>
              <input
                type="text"
                name="postalCode"
                value={profileData.postalCode}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pays</label>
              <input
                type="text"
                name="country"
                value={profileData.country}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Site Web</label>
              <input
                type="text"
                name="website"
                value={profileData.website}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom de l'entreprise</label>
              <input
                type="text"
                name="companyName"
                value={profileData.companyName}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Compte Bancaire</label>
              <input
                type="text"
                name="bankAccount"
                value={profileData.bankAccount}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">IBAN</label>
              <input
                type="text"
                name="iban"
                value={profileData.iban}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">BIC</label>
              <input
                type="text"
                name="bic"
                value={profileData.bic}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <button
            type="button"
            className="bg-blue-500 text-white py-2 px-4 rounded mt-4 hover:bg-blue-600 transition duration-300 w-full md:w-auto"
            onClick={saveProfile}
          >
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
