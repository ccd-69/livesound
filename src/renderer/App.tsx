import React, { Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './themes/ThemeProvider';
import { PlaybackProvider } from './hooks/usePlayback';
import Layout from './components/Layout';
import Library from './pages/Library';
import Search from './pages/Search';
const Settings = React.lazy(() => import('./pages/Settings'));
const NowPlaying = React.lazy(() => import('./pages/NowPlaying'));

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <PlaybackProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Library />} />
                <Route path="/search" element={<Search />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/now-playing" element={<NowPlaying />} />
              </Route>
            </Routes>
          </Suspense>
        </PlaybackProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
