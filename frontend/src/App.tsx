import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import LostFoundFeed from './pages/LostFoundFeed';
import SocialFeed from './pages/SocialFeed';
import CreateItem from './pages/CreateItem';
import ItemDetail from './pages/ItemDetail';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import CampusMap from './pages/CampusMap';
import AcademicCalendar from './pages/AcademicCalendar';
import FoodMenu from './pages/FoodMenu';
import FreeRooms from './pages/FreeRooms';
import GradeCalculator from './pages/GradeCalculator';
import Reported from './pages/Reported';
import Appointments from './pages/Appointments';
import MainLayout from './components/MainLayout';
import { ThemeProvider } from './context/ThemeContext';
import CommunityFair from './pages/CommunityFair';
import CommunityProfile from './pages/CommunityProfile';
import CommunityAdminPanel from './pages/CommunityAdminPanel';
import JobApplicationForm from './pages/JobApplicationForm';
import EventApplicationForm from './pages/EventApplicationForm';
import Notifications from './pages/Notifications';
import ThemedDialogHost from './components/ThemedDialogHost';
import JobBoard from './pages/JobBoard';
import DiscoverFeed from './pages/DiscoverFeed';
import Messages from './pages/Messages';
import PostPage from './pages/PostPage';
import { NotificationsProvider } from './context/NotificationsContext';
import { MessagingUnreadProvider } from './context/MessagingUnreadContext';

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
      
      {/* Protected Routes with MainLayout */}
      <Route path="/feed" element={<PrivateRoute><MainLayout><SocialFeed /></MainLayout></PrivateRoute>} />
      <Route path="/post/:postId" element={<PrivateRoute><MainLayout><PostPage /></MainLayout></PrivateRoute>} />
      <Route path="/lost-found" element={<PrivateRoute><MainLayout><LostFoundFeed /></MainLayout></PrivateRoute>} />
      <Route path="/create-item" element={<PrivateRoute><MainLayout><CreateItem /></MainLayout></PrivateRoute>} />
      <Route path="/edit-item/:type/:id" element={<PrivateRoute><MainLayout><CreateItem /></MainLayout></PrivateRoute>} />
      <Route path="/item/:type/:id" element={<PrivateRoute><MainLayout><ItemDetail /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      <Route path="/profile/edit" element={<PrivateRoute><MainLayout><Settings /></MainLayout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><MainLayout><Settings /></MainLayout></PrivateRoute>} />
      <Route path="/profile/edit" element={<PrivateRoute><MainLayout><EditProfile /></MainLayout></PrivateRoute>} />
      <Route path="/profile/change-password" element={<PrivateRoute><MainLayout><ChangePassword /></MainLayout></PrivateRoute>} />
      <Route path="/profile/:id" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      <Route path="/campus-map" element={<PrivateRoute><MainLayout><CampusMap /></MainLayout></PrivateRoute>} />
      <Route path="/reported" element={<PrivateRoute><MainLayout><Reported /></MainLayout></PrivateRoute>} />
      <Route path="/academic-calendar" element={<PrivateRoute><MainLayout><AcademicCalendar /></MainLayout></PrivateRoute>} />
      <Route path="/food-menu" element={<PrivateRoute><MainLayout><FoodMenu /></MainLayout></PrivateRoute>} />
      <Route path="/free-rooms" element={<PrivateRoute><MainLayout><FreeRooms /></MainLayout></PrivateRoute>} />
      <Route path="/appointments" element={<PrivateRoute><MainLayout><Appointments /></MainLayout></PrivateRoute>} />
      <Route path="/job-board" element={<PrivateRoute><MainLayout><JobBoard /></MainLayout></PrivateRoute>} />
      <Route path="/grade-calculator" element={<PrivateRoute><MainLayout><GradeCalculator /></MainLayout></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><MainLayout><Notifications /></MainLayout></PrivateRoute>} />
      <Route path="/discover" element={<PrivateRoute><MainLayout><DiscoverFeed /></MainLayout></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><MainLayout><Messages /></MainLayout></PrivateRoute>} />
      <Route path="/explore" element={<PrivateRoute><MainLayout><CommunityFair /></MainLayout></PrivateRoute>} />
      <Route path="/community/:communityId" element={<PrivateRoute><MainLayout><CommunityProfile /></MainLayout></PrivateRoute>} />
      <Route path="/community/:communityId/admin" element={<PrivateRoute><MainLayout><CommunityAdminPanel /></MainLayout></PrivateRoute>} />
      <Route path="/community/jobs/applications/:jobApplicationId" element={<PrivateRoute><MainLayout><JobApplicationForm /></MainLayout></PrivateRoute>} />
      <Route path="/community/events/applications/:eventApplicationId" element={<PrivateRoute><MainLayout><EventApplicationForm /></MainLayout></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <MessagingUnreadProvider>
              <AppRoutes />
              <ThemedDialogHost />
            </MessagingUnreadProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
