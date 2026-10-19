import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { roleArea } from '../hooks/useAuth';

export default function AuthLinks(): ReactNode {
  const { status, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await signOut();
    navigate('/', { replace: true });
  };

  if (status === 'loading') {
    return null;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          to={roleArea(user.role)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
        >
          <User className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
          {user.email}
        </Link>
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
        >
          <LogOut className="h-3.5 w-3.5 text-white/60" aria-hidden="true" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      to="/login"
      className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/60 bg-gold-400/10 px-4 py-1.5 text-sm font-medium text-gold-300 transition hover:bg-gold-400/20"
    >
      Sign in
    </Link>
  );
}
