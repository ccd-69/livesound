import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './themes/ThemeProvider';
import { PlaybackProvider } from './hooks/usePlayback';
import Layout from './components/Layout';
import Library from './pages/Library';
import Search from './pages/Search';
import Settings from './pages/Settings';

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <PlaybackProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Library />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </PlaybackProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
