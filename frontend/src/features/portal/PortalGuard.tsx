import { Navigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../stores/portalAuthStore';

/**
 * Equivalente ao ProtectedRoute admin, mas para a sessão do portal do operário.
 * Mantém as duas sessões independentes (uma não vê a outra).
 */
export default function PortalGuard({ children }: { children: React.ReactNode }) {
  const session = usePortalAuthStore((s) => s.session);
  if (!session) return <Navigate to="/meu/login" replace />;
  return <>{children}</>;
}
