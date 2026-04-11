import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ThemedDialogHost from './components/ThemedDialogHost';
import FullPageLoader from './components/FullPageLoader';
import RouteDocumentTitle from './components/RouteDocumentTitle';
import { NotificationsProvider } from './context/NotificationsContext';
import { MessagingUnreadProvider } from './context/MessagingUnreadContext';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const LostFoundFeed = lazy(() => import('./pages/LostFoundFeed'));
const SocialFeed = lazy(() => import('./pages/SocialFeed'));
const CreateItem = lazy(() => import('./pages/CreateItem'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const CampusMap = lazy(() => import('./pages/CampusMap'));
const AcademicCalendar = lazy(() => import('./pages/AcademicCalendar'));
const FoodMenu = lazy(() => import('./pages/FoodMenu'));
const FreeRooms = lazy(() => import('./pages/FreeRooms'));
const GradeCalculator = lazy(() => import('./pages/GradeCalculator'));
const Reported = lazy(() => import('./pages/Reported'));
const Appointments = lazy(() => import('./pages/Appointments'));
const CommunityFair = lazy(() => import('./pages/CommunityFair'));
const CommunityProfile = lazy(() => import('./pages/CommunityProfile'));
const CommunityAdminPanel = lazy(() => import('./pages/CommunityAdminPanel'));
const JobApplicationForm = lazy(() => import('./pages/JobApplicationForm'));
const EventApplicationForm = lazy(() => import('./pages/EventApplicationForm'));
const JobBoard = lazy(() => import('./pages/JobBoard'));
const DiscoverFeed = lazy(() => import('./pages/DiscoverFeed'));
const PostPage = lazy(() => import('./pages/PostPage'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Messages = lazy(() => import('./pages/Messages'));
const MainLayout = lazy(() => import('./components/MainLayout'));

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/feed" replace />} />

        <Route path="/feed" element={<PrivateRoute><MainLayout><SocialFeed /></MainLayout></PrivateRoute>} />
        <Route path="/post/:postId" element={<PrivateRoute><MainLayout><PostPage /></MainLayout></PrivateRoute>} />
        <Route path="/lost-found" element={<PrivateRoute><MainLayout><LostFoundFeed /></MainLayout></PrivateRoute>} />
        <Route path="/create-item" element={<PrivateRoute><MainLayout><CreateItem /></MainLayout></PrivateRoute>} />
        <Route path="/edit-item/:type/:id" element={<PrivateRoute><MainLayout><CreateItem /></MainLayout></PrivateRoute>} />
        <Route path="/item/:type/:id" element={<PrivateRoute><MainLayout><ItemDetail /></MainLayout></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
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
        <Route path="/messages" element={<PrivateRoute><MainLayout><Messages /></MainLayout></PrivateRoute>} />
        <Route path="/discover" element={<PrivateRoute><MainLayout><DiscoverFeed /></MainLayout></PrivateRoute>} />
        <Route path="/explore" element={<PrivateRoute><MainLayout><CommunityFair /></MainLayout></PrivateRoute>} />
        <Route path="/community/:communityId" element={<PrivateRoute><MainLayout><CommunityProfile /></MainLayout></PrivateRoute>} />
        <Route path="/community/:communityId/admin" element={<PrivateRoute><MainLayout><CommunityAdminPanel /></MainLayout></PrivateRoute>} />
        <Route path="/community/jobs/applications/:jobApplicationId" element={<PrivateRoute><MainLayout><JobApplicationForm /></MainLayout></PrivateRoute>} />
        <Route path="/community/events/applications/:eventApplicationId" element={<PrivateRoute><MainLayout><EventApplicationForm /></MainLayout></PrivateRoute>} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <RouteDocumentTitle />
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
