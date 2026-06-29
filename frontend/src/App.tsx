import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import LotesListPage from './features/lotes/LotesListPage';
import LoteFormPage from './features/lotes/LoteFormPage';
import OperariosListPage from './features/operarios/OperariosListPage';
import OperarioFormPage from './features/operarios/OperarioFormPage';
import GerenciadorPage from './features/alocacoes/GerenciadorPage';
import FacilitadorPage from './features/facilitador/FacilitadorPage';
import RelatoriosPage from './features/relatorios/RelatoriosPage';
import JornadasListPage from './features/jornada/JornadasListPage';
import JornadaFormPage from './features/jornada/JornadaFormPage';
import DiasEspeciaisPage from './features/jornada/DiasEspeciaisPage';
import AusenciasPage from './features/ausencias/AusenciasPage';
import SenhaPage from './features/configuracoes/SenhaPage';
import UsuariosListPage from './features/usuarios/UsuariosListPage';
import PortalLoginPage from './features/portal/PortalLoginPage';
import PortalHomePage from './features/portal/PortalHomePage';
import PortalSemanaPage from './features/portal/PortalSemanaPage';
import PortalChangePinPage from './features/portal/PortalChangePinPage';
import PortalGuard from './features/portal/PortalGuard';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const session = useAuthStore((s) => s.session);
  const homeFor = session?.role === 'OPERADOR' ? '/facilitador' : '/facilitador';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Portal do operário — fora do Layout admin (sem nav, sem sync badge) */}
      <Route path="/meu/login" element={<PortalLoginPage />} />
      <Route
        path="/meu"
        element={
          <PortalGuard>
            <PortalHomePage />
          </PortalGuard>
        }
      />
      <Route
        path="/meu/semana"
        element={
          <PortalGuard>
            <PortalSemanaPage />
          </PortalGuard>
        }
      />
      <Route
        path="/meu/pin"
        element={
          <PortalGuard>
            <PortalChangePinPage />
          </PortalGuard>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to={homeFor} replace />} />
        <Route path="/facilitador" element={<FacilitadorPage />} />
        <Route
          path="/gerenciador"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <GerenciadorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lotes"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <LotesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lotes/novo"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <LoteFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lotes/:id"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <LoteFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operarios"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <OperariosListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operarios/novo"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <OperarioFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operarios/:id"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <OperarioFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <RelatoriosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <UsuariosListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ausencias"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <AusenciasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes/jornada"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <JornadasListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes/jornada/nova"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <JornadaFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes/jornada/:id"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <JornadaFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="/configuracoes/senha" element={<SenhaPage />} />
        <Route
          path="/configuracoes/dias-especiais"
          element={
            <ProtectedRoute roles={['ADMIN', 'GERENTE']}>
              <DiasEspeciaisPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
