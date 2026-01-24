import { Routes, Route } from 'react-router-dom';

export function Users() {
  return (
    <div className="users">
      <h1>Users</h1>
      <Routes>
        <Route path="/" element={<UserList />} />
      </Routes>
    </div>
  );
}

function UserList() {
  return (
    <div>
      <h2>User List</h2>
      <p>User management coming soon...</p>
    </div>
  );
}
