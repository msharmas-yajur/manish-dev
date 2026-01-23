import { Routes, Route } from 'react-router-dom';
import { Dashboard } from '@features/dashboard';
import { Auth } from '@features/auth';
import { Users } from '@features/users';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/users/*" element={<Users />} />
      </Routes>
    </div>
  );
}

export default App;
