import { Navigate, Route, Routes } from 'react-router-dom';
import './admin.css';
import { AdminLayout } from './AdminLayout';
import { AuthProvider } from './AuthProvider';
import { FeedbackProvider } from './components/Feedback';
import { ResourcePage } from './components/ResourcePage';
import { AccountPage } from './pages/AccountPage';
import { ActivityPage } from './pages/ActivityPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsTab } from './pages/whatsapp/LeadsTab';
import { OverviewTab } from './pages/whatsapp/OverviewTab';
import { SettingsTab } from './pages/whatsapp/SettingsTab';
import { WhatsAppSection } from './pages/whatsapp/WhatsAppSection';
import { LoginPage } from './pages/LoginPage';
import { MediaPage } from './pages/MediaPage';
import { PageEditor, PagesPage } from './pages/PagesPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { RESOURCES } from './resources';

// Loaded lazily from App.jsx, so none of this ships in the public site's bundle.
const AdminApp = () => (
  <div className="admin-app">
    <AuthProvider>
      <FeedbackProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pages" element={<PagesPage />} />
            <Route path="pages/:id" element={<PageEditor />} />
            {Object.entries(RESOURCES).map(([path, config]) => (
              <Route key={path} path={path} element={<ResourcePage key={path} config={config} />} />
            ))}
            <Route path="media" element={<MediaPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
          <Route element={<AdminLayout adminOnly />}>
            <Route path="whatsapp" element={<WhatsAppSection />}>
              <Route index element={<OverviewTab />} />
              <Route path="inquiries" element={<LeadsTab />} />
              <Route path="settings" element={<SettingsTab />} />
            </Route>
            <Route path="inquiries" element={<Navigate to="/admin/whatsapp/inquiries" replace />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="activity" element={<ActivityPage />} />
          </Route>
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </FeedbackProvider>
    </AuthProvider>
  </div>
);

export default AdminApp;
