import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import LostFoundFeed from './pages/LostFoundFeed';
import CreateItem from './pages/CreateItem';
import ItemDetail from './pages/ItemDetail';
<<<<<<< Updated upstream
=======
import Profile from './pages/Profile';
import CampusMap from './pages/CampusMap';
import FreeRooms from './pages/FreeRooms';
import MainLayout from './components/MainLayout';
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
      <Route path="/feed" element={<PrivateRoute><LostFoundFeed /></PrivateRoute>} />
      <Route path="/create-item" element={<PrivateRoute><CreateItem /></PrivateRoute>} />
      <Route path="/item/:type/:id" element={<PrivateRoute><ItemDetail /></PrivateRoute>} />
=======
      
      {/* Protected Routes with MainLayout */}
      <Route path="/feed" element={<PrivateRoute><MainLayout><SocialFeed /></MainLayout></PrivateRoute>} />
      <Route path="/lost-found" element={<PrivateRoute><MainLayout><LostFoundFeed /></MainLayout></PrivateRoute>} />
      <Route path="/create-item" element={<PrivateRoute><MainLayout><CreateItem /></MainLayout></PrivateRoute>} />
      <Route path="/edit-item/:type/:id" element={<PrivateRoute><MainLayout><CreateItem /></MainLayout></PrivateRoute>} />
      <Route path="/item/:type/:id" element={<PrivateRoute><MainLayout><ItemDetail /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      <Route path="/profile/:id" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      <Route path="/campus-map" element={<PrivateRoute><MainLayout><CampusMap /></MainLayout></PrivateRoute>} />
      <Route path="/free-rooms" element={<PrivateRoute><MainLayout><FreeRooms /></MainLayout></PrivateRoute>} />
>>>>>>> Stashed changes
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
