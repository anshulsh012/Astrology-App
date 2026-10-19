import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from '../components/Layout';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../auth/AuthProvider';
import { roleArea, type AuthUser } from '../hooks/useAuth';

export default function LoginPage(): ReactNode {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSuccess = (user: AuthUser): void => {
    signIn(user);
    navigate(roleArea(user.role), { replace: true });
  };

  return (
    <Layout>
      <section className="cosmic-bg min-h-[70vh] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg">
          <LoginForm onSuccess={handleSuccess} />
        </div>
      </section>
    </Layout>
  );
}
