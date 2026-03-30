import supabase, { isSupabaseConfigured } from './supabase';

let currentUser = null;

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) {
        callback(setCurrentUser(session?.user ?? null));
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

  return setCurrentUser(session?.user ?? null);
};

export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Restart the dev server after updating .env.local.');
  }

  const redirectTo =
    process.env.REACT_APP_SUPABASE_REDIRECT_URL || `${window.location.origin}/`;

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
