import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import supabase, { isSupabaseConfigured } from './supabase';
import app from './firebaseApp';

let currentUser = null;
const db = getFirestore(app);

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    uid: user.id,
    email: user.email || '',
    displayName:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.email ||
      'Anonyme',
    photoURL: user.user_metadata?.avatar_url || null,
    providerData: user.identities || [],
    rawUser: user,
  };
};

const upsertSupabaseUser = async (user) => {
  if (!user) return;

  const { error: usersError } = await supabase.from('users').upsert({
    id: user.uid,
    email: user.email,
    display_name: user.displayName,
    updated_at: new Date().toISOString(),
  });

  if (usersError) {
    console.error("Erreur lors de la synchronisation de l'utilisateur Supabase:", usersError);
  }

  const { error: profilesError } = await supabase.from('profiles').upsert({
    user_id: user.uid,
    updated_at: new Date().toISOString(),
  });

  if (profilesError) {
    console.error('Erreur lors de la synchronisation du profil Supabase:', profilesError);
  }
};

const upsertFirebaseUser = async (user) => {
  if (!user) return;

  try {
    const userRef = doc(db, 'Utilisateurs', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        uid: user.uid,
      });
      return;
    }

    await setDoc(
      userRef,
      {
        displayName: user.displayName,
        email: user.email,
        uid: user.uid,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Erreur lors de la synchronisation de l'utilisateur Firebase:", error);
  }
};

export const syncAuthenticatedUser = async (user) => {
  if (!user) return;
  await Promise.allSettled([upsertSupabaseUser(user), upsertFirebaseUser(user)]);
};

const setCurrentUser = (user) => {
  currentUser = normalizeUser(user);
  return currentUser;
};

export const auth = {
  get currentUser() {
    return currentUser;
  },
  onAuthStateChanged(callback) {
    let isActive = true;

    if (!isSupabaseConfigured || !supabase) {
      callback(null);
      return () => {
        isActive = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return;
      callback(setCurrentUser(data.session?.user ?? null));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const normalizedUser = setCurrentUser(session?.user ?? null);
      if (normalizedUser) {
        await syncAuthenticatedUser(normalizedUser);
      }
      if (isActive) {
        callback(normalizedUser);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  },
};

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured || !supabase) return null;
  if (currentUser) return currentUser;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const normalizedUser = setCurrentUser(session?.user ?? null);
  if (normalizedUser) {
    await syncAuthenticatedUser(normalizedUser);
  }

  return normalizedUser;
};

export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Restart the dev server after updating .env.local.');
  }

  const redirectTo =
    process.env.REACT_APP_SUPABASE_REDIRECT_URL || `${window.location.origin}/login`;

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
};

export const signOut = async () => {
  currentUser = null;
  if (!isSupabaseConfigured || !supabase) return;
  return supabase.auth.signOut();
};
