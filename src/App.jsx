import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import RedactApp from './pages/RedactApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<RedactApp />} />
      </Routes>
    </BrowserRouter>
  );
}
