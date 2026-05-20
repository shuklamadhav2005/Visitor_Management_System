import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminReports from './pages/AdminReports.jsx';
import AdminSecurityGuards from './pages/AdminSecurityGuards.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Visitors from './pages/Visitors.jsx';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="visitors" element={<Navigate to="/visitors/logs" replace />} />
        <Route path="visitors/add" element={<Visitors />} />
        <Route path="visitors/requests" element={<Visitors />} />
        <Route path="visitors/all" element={<Visitors />} />
        <Route path="visitors/logs" element={<Visitors />} />
        <Route path="approved" element={<Dashboard />} />
        <Route path="rejected" element={<Dashboard />} />
        <Route path="approved" element={<Dashboard />} />
        <Route path="rejected" element={<Dashboard />} />
        <Route path="history" element={<Navigate to="/approved" replace />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/security-guards" element={<AdminSecurityGuards />} />
        <Route path="admin/reports" element={<AdminReports />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
