import { useEffect, useState } from 'react';
import WorkspaceV2 from './pages/WorkspaceV2';
import { auth, signInWithGoogle, signOut } from './auth';
import { isSupabaseConfigured } from './supabase';
import './App.css';

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
    });

    return unsubscribe;
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <main className="workspace-auth-screen">
        <section className="workspace-auth-card">
          <h1>Build In Peace</h1>
          <p>Configure `REACT_APP_SUPABASE_URL` et `REACT_APP_SUPABASE_ANON_KEY` pour demarrer l'application.</p>
        </section>
      </main>
    );
  }

  if (typeof user === 'undefined') {
    return (
      <main className="workspace-auth-screen">
        <section className="workspace-auth-card">
          <h1>Build In Peace</h1>
          <p>Chargement de la session...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="workspace-auth-screen">
        <section className="workspace-auth-card">
          <h1>Build In Peace</h1>
          <p>Gestion de chantiers, collaboration projet et messagerie temps reel avec Supabase.</p>
          <button type="button" className="action-button" onClick={() => signInWithGoogle()}>
            Connexion avec Google
          </button>
        </section>
      </main>
    );
  }

  return <WorkspaceV2 onSignOut={signOut} />;
}

export default App;
