import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ResumePage from './pages/ResumePage';
import CoverLetterPage from './pages/CoverLetterPage';
import SettingsPage from './pages/SettingsPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import RouteProtect from './components/RouteProtect';
import ArchivedPage from './pages/ArchivedPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <RouteProtect>
              <DashboardPage />
            </RouteProtect>
          }
        />
        <Route
          path="/archived"
          element={
            <RouteProtect>
              <ArchivedPage />
            </RouteProtect>
          }
        />
        <Route
          path="/profile"
          element={
            <RouteProtect>
              <ProfilePage />
            </RouteProtect>
          }
        />
        <Route
          path="/resume"
          element={
            <RouteProtect>
              <ResumePage />
            </RouteProtect>
          }
        />
        <Route
          path="/cover-letter"
          element={
            <RouteProtect>
              <CoverLetterPage />
            </RouteProtect>
          }
        />
        <Route
          path="/settings"
          element={
            <RouteProtect>
              <SettingsPage />
            </RouteProtect>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
