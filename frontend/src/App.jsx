import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import ImportFlowPage from './pages/ImportFlowPage/ImportFlowPage';

export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<HomePage />} />
      <Route path="/import" element={<ImportFlowPage />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
