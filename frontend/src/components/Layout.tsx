import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import SyncStatusBadge from './SyncStatusBadge';
import { useAuthStore, canGerir, canVerRelatorios } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Layout() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const isAdmin = session?.role === 'ADMIN';
  const gerir = canGerir(session?.role);
  const relatorios = canVerRelatorios(session?.role);

  const logout = () => {
    setSession(null);
    navigate('/login');
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 md:px-6 py-3 flex items-center justify-between gap-4 shadow flex-wrap">
        <div className="flex items-center gap-4 md:gap-6 flex-wrap">
          <h1 className="text-xl font-semibold">ezcostura</h1>
          <nav className="flex gap-1 flex-wrap">
            <NavItem to="/facilitador">Facilitador</NavItem>
            {gerir && <NavItem to="/gerenciador">Gerenciador</NavItem>}
            {gerir && <NavItem to="/lotes">Lotes</NavItem>}
            {gerir && <NavItem to="/operarios">Funcionários</NavItem>}
            {gerir && <NavItem to="/ausencias">Ausências</NavItem>}
            {relatorios && <NavItem to="/relatorios">Relatórios</NavItem>}
            {gerir && <NavItem to="/configuracoes/jornada">Jornadas</NavItem>}
            {gerir && <NavItem to="/configuracoes/dias-especiais">Dias especiais</NavItem>}
            {isAdmin && <NavItem to="/usuarios">Usuários</NavItem>}
            <NavItem to="/configuracoes/senha">Senha</NavItem>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatusBadge />
          {session && (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden md:inline text-primary-foreground/70">
                {session.username} · {session.tenantId} · {session.role}
              </span>
              <Button
                size="sm"
                onClick={logout}
                className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
              >
                Sair
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'px-3 py-2 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-primary-foreground/20'
            : 'hover:bg-primary-foreground/10',
        )
      }
    >
      {children}
    </NavLink>
  );
}
