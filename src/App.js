import { useEffect, useState } from 'react';
import WorkspaceV2 from './pages/WorkspaceV2';
import WorkspaceLoader from './components/WorkspaceLoader';
import { auth, signInWithGoogle, signOut } from './auth';
import { isSupabaseConfigured } from './supabase';
import './App.css';

const APRIL_FOOLS_MESSAGES = [
  'Salut les nazes',
  "Vous avez vraiment cru que j'avais refais Build In Peace",
  "Poisson d'avril",
  "C'est des",
  "C'est des",
  "C'est des",
  'FDP',
  'Haha non je rigole continue',
  "En fait non je rigolais pas",
  'Bon allez je suppose que c est plus marrant',
  'Allez une derniere',
];

function PreloginShowcase() {
  return (
    <div className="prelogin-scene" aria-hidden="true">
      <div className="prelogin-stage-glow prelogin-stage-glow-left" />
      <div className="prelogin-stage-glow prelogin-stage-glow-right" />

      <section className="prelogin-module prelogin-module-messages" style={{ animationDelay: '1.6s' }}>
        <div className="prelogin-module-topline">
          <span>Messages</span>
          <strong>Discussion chantier</strong>
        </div>
        <article className="prelogin-message-row">
          <strong>Sarah</strong>
          <p>Le client valide la variante facade B.</p>
        </article>
        <article className="prelogin-message-row is-own">
          <strong>Vous</strong>
          <p>Je publie les plans mis a jour avant 14h.</p>
        </article>
        <article className="prelogin-message-row">
          <strong>Nico</strong>
          <p>Top, je mets aussi les photos du releve.</p>
        </article>
      </section>

      <section className="prelogin-module prelogin-module-documents" style={{ animationDelay: '2.1s' }}>
        <div className="prelogin-module-topline">
          <span>Administratif</span>
          <strong>Suivi des pieces</strong>
        </div>
        <article className="prelogin-doc-row">
          <strong>Contrat menuiserie</strong>
          <small>Envoye au client - Version 3</small>
        </article>
        <article className="prelogin-doc-row">
          <strong>Assurance decennale</strong>
          <small>Document actif - Verifie</small>
        </article>
        <article className="prelogin-doc-row">
          <strong>Situation d'avancement</strong>
          <small>Semaine 14 - En validation</small>
        </article>
      </section>

      <section className="prelogin-module prelogin-module-plan" style={{ animationDelay: '2.5s' }}>
        <div className="prelogin-module-topline">
          <span>Plan</span>
          <strong>Niveau R+1</strong>
        </div>
        <div className="prelogin-plan-canvas">
          <span className="prelogin-plan-line line-a" />
          <span className="prelogin-plan-line line-b" />
          <span className="prelogin-plan-line line-c" />
          <span className="prelogin-plan-pin pin-a" />
          <span className="prelogin-plan-pin pin-b" />
          <span className="prelogin-plan-pin pin-c" />
        </div>
      </section>
    </div>
  );
}

function AprilFoolsIntro({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLastMessage = currentIndex === APRIL_FOOLS_MESSAGES.length - 1;

  const handleContinue = () => {
    if (isLastMessage) {
      onComplete();
      return;
    }

    setCurrentIndex((value) => Math.min(value + 1, APRIL_FOOLS_MESSAGES.length - 1));
  };

  return (
    <main className="april-fools-screen">
      <div className="april-fools-backdrop" />
      <div className="april-fools-stack" aria-live="polite">
        <article className={`april-fools-popup${currentIndex === 2 ? ' is-fish' : ''} is-latest`}>
          {currentIndex === 2 ? <span className="april-fools-fish" aria-hidden="true" /> : null}
          <strong>{APRIL_FOOLS_MESSAGES[currentIndex]}</strong>
          <button type="button" className="action-button april-fools-continue" onClick={handleContinue}>
            Continuer
          </button>
        </article>
      </div>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(undefined);
  const [isSessionLoaderReady, setIsSessionLoaderReady] = useState(false);
  const [isAprilFoolsDone, setIsAprilFoolsDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncViewport = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsSessionLoaderReady(true);
    }, 1800);

    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
    });

    return () => {
      unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsAprilFoolsDone(true);
      return;
    }

    setIsAprilFoolsDone(false);
  }, [isMobile]);

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

  if (isMobile && !user && !isAprilFoolsDone) {
    return <AprilFoolsIntro onComplete={() => setIsAprilFoolsDone(true)} />;
  }

  if (typeof user === 'undefined') {
    return <main className="auth-boot-screen" aria-hidden="true" />;
  }

  if (user && !isSessionLoaderReady) {
    return (
      <WorkspaceLoader
        eyebrow="Authentification"
        title="Build In Peace"
        message="Chargement de la session..."
        detail="Connexion securisee et restauration de votre acces chantier."
      />
    );
  }

  if (!user) {
    return (
      <main className="workspace-auth-screen workspace-login-screen">
        <PreloginShowcase />
        <section className="workspace-auth-card workspace-login-card">
          <div className="workspace-login-hero">
            <div className="workspace-login-logo-shell">
              <img src="/assets/logo.jfif" alt="Build In Peace" className="workspace-login-logo" />
            </div>
            <div className="workspace-login-copy">
              <h1>Build In Peace</h1>
              <span className="workspace-login-badge">Coordination de chantier</span>
              <p>
                Build In Peace a ete cree par des gestionnaires de chantiers afin de faciliter la communication entre
                les differents intervenants: clients, ouvriers, gestionnaires et architectes, de maniere simple et
                efficace.
              </p>
            </div>
          </div>
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
