import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import LostFoundFeed from './pages/LostFoundFeed';
import CreateItem from './pages/CreateItem';
import ItemDetail from './pages/ItemDetail';

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<PrivateRoute><LostFoundFeed /></PrivateRoute>} />
      <Route path="/create-item" element={<PrivateRoute><CreateItem /></PrivateRoute>} />
      <Route path="/item/:type/:id" element={<PrivateRoute><ItemDetail /></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
