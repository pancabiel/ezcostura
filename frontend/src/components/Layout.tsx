import { useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import SyncStatusBadge from './SyncStatusBadge';
import { useAuthStore, type AuthSession } from '../stores/authStore';
import {
  GROUP_LABELS,
  NAV_ITEMS,
  isPathActive,
  pageTitle,
  type NavItem,
} from './nav-config';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Layout() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = session?.role;

  const logout = () => {
    setSession(null);
    navigate('/login');
  };

  const visible = NAV_ITEMS.filter((i) => i.show(role));
  const bottomTabs = visible.filter((i) => i.bottomTab);
  const moreItems = visible.filter((i) => !i.bottomTab);
  const moreActive = moreItems.some((i) => isPathActive(pathname, i.to));

  return (
    <div className="min-h-full flex flex-col">
      <DesktopBar
        visible={visible}
        session={session}
        pathname={pathname}
        onLogout={logout}
      />

      {/* Barra superior do mobile/tablet: título da tela + status de sync */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground shadow">
        <h1 className="truncate text-lg font-semibold">{pageTitle(pathname)}</h1>
        <SyncStatusBadge />
      </header>

      <main className="flex-1 px-4 pt-4 pb-24 md:px-6 md:pt-6 lg:pb-6">
        <Outlet />
      </main>

      {/* Barra inferior do mobile/tablet (até lg) */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {bottomTabs.map((item) => (
          <BottomTab
            key={item.to}
            item={item}
            active={isPathActive(pathname, item.to)}
          />
        ))}
        <MoreSheet
          items={moreItems}
          session={session}
          pathname={pathname}
          active={moreActive}
          onLogout={logout}
        />
      </nav>
    </div>
  );
}

/* ===================== Desktop (lg+) ===================== */

function DesktopBar({
  visible,
  session,
  pathname,
  onLogout,
}: {
  visible: NavItem[];
  session: AuthSession | null;
  pathname: string;
  onLogout: () => void;
}) {
  const primary = visible.filter((i) => i.desktopPrimary);
  const configItems = visible.filter(
    (i) => i.group && !i.desktopPrimary && !i.desktopUserMenu,
  );
  const userMenuItems = visible.filter((i) => i.desktopUserMenu);
  const configActive = configItems.some((i) => isPathActive(pathname, i.to));

  return (
    <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between gap-4 bg-primary px-6 py-3 text-primary-foreground shadow">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold">ezcostura</h1>
        <nav className="flex items-center gap-1">
          {primary.map((item) => (
            <DesktopNavLink key={item.to} to={item.to} label={item.label} />
          ))}

          {configItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors outline-none',
                  configActive
                    ? 'bg-primary-foreground/20'
                    : 'hover:bg-primary-foreground/10',
                )}
              >
                Configurações
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuGroup>
                  {configItems.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to}>
                        <item.icon />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <SyncStatusBadge />
        {session && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors outline-none',
                'hover:bg-primary-foreground/10',
              )}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-primary-foreground/15 text-xs font-semibold">
                {initials(session.username)}
              </span>
              <span className="hidden xl:inline">{session.username}</span>
              <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {session.username}
                </span>
                <span className="font-normal">
                  {session.tenantId} · {session.role}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userMenuItems.length > 0 && (
                <>
                  <DropdownMenuGroup>
                    {userMenuItems.map((item) => (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to}>
                          <item.icon />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onSelect={onLogout}>
                  <LogOut />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

function DesktopNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary-foreground/20'
            : 'hover:bg-primary-foreground/10',
        )
      }
    >
      {label}
    </NavLink>
  );
}

/* ===================== Mobile/tablet (<lg) ===================== */

function BottomTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className="size-5" />
      <span className="max-w-full truncate px-1">{item.label}</span>
    </NavLink>
  );
}

function MoreSheet({
  items,
  session,
  pathname,
  active,
  onLogout,
}: {
  items: NavItem[];
  session: AuthSession | null;
  pathname: string;
  active: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const gestao = items.filter((i) => i.group === 'gestao');
  const config = items.filter((i) => i.group === 'config');
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors outline-none',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <Menu className="size-5" />
        <span>Mais</span>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="flex-row items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials(session?.username)}
          </span>
          <div className="flex min-w-0 flex-col">
            <SheetTitle className="truncate">
              {session?.username ?? 'Conta'}
            </SheetTitle>
            <SheetDescription className="truncate">
              {session ? `${session.tenantId} · ${session.role}` : ''}
            </SheetDescription>
          </div>
        </SheetHeader>

        {gestao.length > 0 && (
          <MoreGroup
            label={GROUP_LABELS.gestao}
            items={gestao}
            pathname={pathname}
            onNavigate={close}
          />
        )}
        {config.length > 0 && (
          <MoreGroup
            label={GROUP_LABELS.config}
            items={config}
            pathname={pathname}
            onNavigate={close}
          />
        )}

        <SheetFooter>
          <Button
            variant="destructive"
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <LogOut data-icon="inline-start" />
            Sair
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function MoreGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col px-2 pb-2">
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isPathActive(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              active
                ? 'bg-accent font-medium text-accent-foreground'
                : 'hover:bg-accent/50',
            )}
          >
            <Icon className="size-5 text-muted-foreground" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function initials(name?: string) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}
