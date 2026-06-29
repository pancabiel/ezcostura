import {
  LayoutGrid,
  CalendarDays,
  BarChart3,
  Boxes,
  Users,
  CalendarOff,
  Clock,
  CalendarCog,
  UserCog,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/stores/authStore';
import { canGerir, canVerRelatorios } from '@/stores/authStore';

export type NavGroup = 'gestao' | 'config';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Visível para este papel? */
  show: (role: Role | undefined) => boolean;
  /** Aba fixa na barra inferior (mobile). */
  bottomTab?: boolean;
  /** Link inline na barra primária do desktop. */
  desktopPrimary?: boolean;
  /** Agrupamento no painel "Mais" e no dropdown Configurações. */
  group?: NavGroup;
  /** No desktop vive no menu do usuário, não no dropdown Configurações. */
  desktopUserMenu?: boolean;
}

const isAdmin = (role: Role | undefined) => role === 'ADMIN';

/**
 * Fonte única da navegação. Cada superfície (barra inferior, painel "Mais",
 * barra do desktop, dropdown Configurações, menu do usuário) é derivada daqui.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/facilitador', label: 'Facilitador', icon: LayoutGrid, show: () => true, bottomTab: true, desktopPrimary: true },
  { to: '/gerenciador', label: 'Gerenciador', icon: CalendarDays, show: canGerir, bottomTab: true, desktopPrimary: true },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, show: canVerRelatorios, bottomTab: true, desktopPrimary: true },
  { to: '/lotes', label: 'Lotes', icon: Boxes, show: canGerir, desktopPrimary: true, group: 'gestao' },
  { to: '/operarios', label: 'Funcionários', icon: Users, show: canGerir, group: 'gestao' },
  { to: '/ausencias', label: 'Ausências', icon: CalendarOff, show: canGerir, group: 'gestao' },
  { to: '/configuracoes/jornada', label: 'Jornadas', icon: Clock, show: canGerir, group: 'config' },
  { to: '/configuracoes/dias-especiais', label: 'Dias especiais', icon: CalendarCog, show: canGerir, group: 'config' },
  { to: '/usuarios', label: 'Usuários', icon: UserCog, show: isAdmin, group: 'config' },
  { to: '/configuracoes/senha', label: 'Senha', icon: KeyRound, show: () => true, group: 'config', desktopUserMenu: true },
];

export const GROUP_LABELS: Record<NavGroup, string> = {
  gestao: 'Gestão',
  config: 'Configuração',
};

/** Um caminho está ativo se for exato ou um filho (`/lotes` casa `/lotes/novo`). */
export function isPathActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(to + '/');
}

/** Título da tela atual para a barra superior do mobile. */
export function pageTitle(pathname: string): string {
  const match = NAV_ITEMS.filter((i) => isPathActive(pathname, i.to)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  return match?.label ?? 'ezcostura';
}
