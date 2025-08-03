import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SharePage } from './pages/SharePage';
import { HomePage } from './pages/HomePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/share/:documentId" element={<SharePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;