import type { Role } from '../stores/authStore';

/** Papéis que o admin pode criar/gerir pela tela de usuários. */
export type RoleGerenciavel = 'GERENTE' | 'SUPERVISOR';

export interface UsuarioWire {
  id: string;
  username: string;
  role: Role;
  ativo: boolean;
  createdAt: string;
}

export interface CreateUsuarioPayload {
  username: string;
  role: RoleGerenciavel;
  password: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  SUPERVISOR: 'Supervisor',
  OPERADOR: 'Operador',
};
