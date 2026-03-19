import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lesson/:moduleId" element={<Lesson />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
