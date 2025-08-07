import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SharePage } from './pages/SharePage';
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';
import { ViewPage } from './pages/ViewPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/view/:documentId" element={<ViewPage />} />
          <Route path="/share/:documentId" element={<SharePage />} />
          <Route path="/editor/:documentId" element={<EditorPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;