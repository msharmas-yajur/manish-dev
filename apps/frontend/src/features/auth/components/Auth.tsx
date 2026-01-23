import { Routes, Route } from 'react-router-dom';
import { Login } from './Login';
import { Register } from './Register';

export function Auth() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
