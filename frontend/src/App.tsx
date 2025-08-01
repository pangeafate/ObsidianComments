import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SharedNote } from './components/SharedNote';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/share/:shareId" element={<SharedNote />} />
          <Route path="/" element={
            <div className="home-page">
              <h1>Obsidian Comments</h1>
              <p>Share your notes and collaborate with others.</p>
              <p>To view a shared note, use a URL like: <code>/share/your-share-id</code></p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
