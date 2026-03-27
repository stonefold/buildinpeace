import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, signInWithGoogle, syncAuthenticatedUser } from '../auth';

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          await syncAuthenticatedUser(user);
          navigate('/dashboard/chantiers');
          return;
        }
      } catch (error) {
        console.error('Erreur lors de la restauration de session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const { error } = await signInWithGoogle();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la connexion Supabase:', error.message || error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-500 shadow-sm transition duration-300 disabled:opacity-60"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? 'Connexion...' : 'Connexion avec Google'}
      </button>
    </div>
  );
};

export default Login;
