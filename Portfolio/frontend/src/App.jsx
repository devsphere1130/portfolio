import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ContentProvider } from './content/ContentProvider';
import { PreviewBanner } from './content/PreviewBanner';
import { FloatingWhatsApp } from './components/whatsapp/FloatingWhatsApp';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Home } from './pages/Home';
import { Projects } from './pages/Projects';
import './App.css';

// The dashboard is its own chunk: public visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'));

const PublicSite = ({ children }) => (
  <ContentProvider>
    {children}
    <FloatingWhatsApp />
    <PreviewBanner />
  </ContentProvider>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite><Home /></PublicSite>} />
        <Route path="/about" element={<PublicSite><About /></PublicSite>} />
        <Route path="/contact" element={<PublicSite><Contact /></PublicSite>} />
        <Route path="/projects" element={<PublicSite><Projects /></PublicSite>} />
        <Route
          path="/admin/*"
          element={<Suspense fallback={<div className="min-h-screen bg-[#05070a]" />}><AdminApp /></Suspense>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
