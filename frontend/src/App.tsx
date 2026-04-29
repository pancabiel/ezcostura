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
import ConfiguracaoJornadaPage from './features/jornada/ConfiguracaoJornadaPage';
import AusenciasPage from './features/ausencias/AusenciasPage';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const session = useAuthStore((s) => s.session);
  const homeFor = session?.role === 'OPERADOR' ? '/facilitador' : '/facilitador';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
            <ProtectedRoute roles={['ADMIN']}>
              <GerenciadorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lotes"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <LotesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lotes/novo"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <LoteFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lotes/:id"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <LoteFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operarios"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <OperariosListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operarios/novo"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <OperarioFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operarios/:id"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <OperarioFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <RelatoriosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ausencias"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AusenciasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes/jornada"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <ConfiguracaoJornadaPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
