import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";  // Pour Firebase Storage
import { getMessaging, getToken, onMessage } from "firebase/messaging";  // Pour Firebase Cloud Messaging
import app from './firebaseApp';
import { auth } from './auth';

// Initialiser Firebase
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);  // Initialisation Firebase Storage

// Initialiser Firebase Cloud Messaging (FCM)
const messaging = getMessaging(app);

// Fonction pour demander le token FCM
export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: process.env.REACT_APP_VAPID_KEY });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('Aucun token disponible. Demander la permission pour les notifications.');
    }
  } catch (error) {
    console.error('Erreur lors de la recuperation du token FCM:', error);
  }
};

// Fonction pour ecouter les notifications en temps reel
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export { auth, db, analytics, storage };
