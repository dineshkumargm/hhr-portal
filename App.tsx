import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Page, User } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import JobManagement from './pages/JobManagement';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ResumeScore from './pages/ResumeScore';
import Chat from './pages/Chat';
import Plugins from './pages/Plugins';
import Community from './pages/Community';
import { db } from './services/db';



const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(db.getUser());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await db.logout();
    setUser(null);
    navigate('/');
  };

  const handleAuthSuccess = () => {
    setUser(db.getUser());
    navigate('/dashboard');
  };

  const refreshUser = async () => {
    const freshUser = await db.refreshUser();
    setUser(freshUser);
  };

  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);

  if (!user && !isPublicPage) {
    return <Navigate to="/login" replace />;
  }

  if (user && isPublicPage) {
    return <Navigate to="/dashboard" replace />;
  }

  const getActivePage = () => {
    const path = location.pathname.substring(1);
    if (!path || path === '') return Page.Dashboard;
    return path as Page;
  };

  return (
    <div className="flex h-screen w-full bg-[#EAEAEA] md:p-2 lg:p-3 overflow-y-auto md:overflow-hidden">
      {!isPublicPage && user ? (
        <div className="flex h-full w-full max-w-[1600px] bg-background-main md:rounded-[1.5rem] overflow-hidden shadow-2xl mx-auto border border-white/20 relative">
          <Sidebar
            activePage={getActivePage()}
            onNavigate={(page) => navigate(`/${page}`)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onLogout={handleLogout}
            user={user}
          />

          <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
            <Header
              title={getActivePage().replace('-', ' ').toUpperCase()}
              onMenuClick={() => setIsSidebarOpen(true)}
              user={user}
            />
            <main className="flex-1 overflow-y-auto px-5 md:px-6 lg:px-8 pb-8 no-scrollbar">
              <Routes>
                <Route path="/dashboard" element={<Dashboard onJobClick={(id) => navigate(`/candidates?jobId=${id}`)} />} />
                <Route path="/jobs" element={<JobManagement />} />
                <Route path="/candidates" element={<Candidates onCandidateClick={(id) => navigate(`/candidate-detail/${id}`)} />} />
                <Route path="/candidate-detail/:id" element={<CandidateDetail />} />
                <Route path="/profile" element={<Profile onUserUpdate={refreshUser} />} />
                <Route path="/settings" element={<Settings onUserUpdate={refreshUser} />} />
                <Route path="/resume-score" element={<ResumeScore />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/plugins" element={<Plugins />} />
                <Route path="/community" element={<Community />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        <div className="w-full h-full overflow-y-auto no-scrollbar">
          <Routes>
            <Route path="/" element={<Landing onRegisterClick={() => navigate('/register')} onLoginClick={() => navigate('/login')} />} />
            <Route path="/register" element={<Register onSuccess={handleAuthSuccess} onLoginClick={() => navigate('/login', { replace: true })} />} />
            <Route path="/login" element={<Login onSuccess={handleAuthSuccess} onRegisterClick={() => navigate('/register', { replace: true })} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
