// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useNavigate,
} from 'react-router-dom';
import {
  Box,
  HStack,
  Button,
  Flex,
  IconButton,
  useDisclosure,
  VStack,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';

import Login from './components/Login';
import Register from './components/Register';
import ProjectSubmission from './components/ProjectSubmission';
import AIChatbot from './components/AIChatbot';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AIVivaSimulation from './components/AIVivaSimulation';
import ProjectArchiving from './components/ProjectArchiving';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AlumniPortal from './components/AlumniPortal';
import AdminDashboard from './components/AdminDashboard';
import TopAlumniProjects from './components/TopAlumniProjects';
import TeacherApprovedProjects from './components/TeacherApprovedProjects';
import TeacherVivaHistory from './components/TeacherVivaHistory';
import AIProjectAssistant from './components/AIProjectAssistant';
import TeacherProgressLog from './components/TeacherProgressLog';
// ----------------------------------------------------------------------
// 🌌 Responsive Transparent Navbar
// ----------------------------------------------------------------------
const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const updateRole = () => setUserRole(localStorage.getItem('userRole'));
    window.addEventListener('storage', updateRole);
    window.addEventListener('userRoleChange', updateRole);
    return () => {
      window.removeEventListener('storage', updateRole);
      window.removeEventListener('userRoleChange', updateRole);
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event('userRoleChange'));
    navigate('/');
    onClose();
  };

  const navItems = [
    { path: '/student-dashboard', label: 'My Projects', roles: ['Student'] },
    { path: '/teacher-dashboard', label: 'Review Submissions', roles: ['Teacher', 'HOD/Admin'] },
    { path: '/submit', label: 'New Submission', roles: ['Student'] },
    { path: '/ai-chat', label: 'AI Assistant', roles: ['Student', 'Teacher', 'HOD/Admin'] },
    { path: '/analytics', label: 'Analytics', roles: ['Teacher', 'HOD/Admin'] },
    { path: '/admin', label: 'Admin Panel', roles: ['HOD/Admin'] },
    { path: '/top-projects', label: 'Alumni', roles: ['Student', 'Teacher', 'HOD/Admin'] },
    { path: '/teacher/approved-projects' , label: 'Progress', roles: ['Teacher', 'HOD/Admin'] },
  ];

  const LinkStyle: React.CSSProperties = {
    padding: '10px 18px',
    color: 'rgba(255,255,255,0.9)',
    textDecoration: 'none',
    borderRadius: '12px',
    transition: 'all 0.35s ease',
    margin: '0 5px',
    fontWeight: 500,
    fontSize: 15,
  };

  const ActiveLinkStyle: React.CSSProperties = {
    ...LinkStyle,
    background: 'linear-gradient(90deg, #00f5ff, #006eff)',
    color: '#fff',
    boxShadow: '0 0 25px rgba(0,245,255,0.5)',
    transform: 'scale(1.05)',
  };

  return (
    <>
      <Box
        position="fixed"
        top={0}
        left={0}
        zIndex={200}
        w="100%"
        px={{ base: 4, md: 10 }}
        py={3}
        bg="rgba(10, 15, 35, 0.55)"
        backdropFilter="blur(12px)"
        borderBottom="1px solid rgba(255,255,255,0.15)"
        boxShadow="0 0 25px rgba(0,0,0,0.4)"
      >
        <Flex justify="space-between" align="center">
          {/* Logo */}
          <Box
            fontWeight="extrabold"
            fontSize={{ base: 'xl', md: '2xl' }}
            bgGradient="linear(to-r, cyan.400, blue.400, purple.400)"
            bgClip="text"
            textShadow="0 0 25px rgba(0,245,255,0.6)"
            letterSpacing="wider"
            cursor="pointer"
            onClick={() => navigate('/')}
            _hover={{
              transform: 'scale(1.08)',
              textShadow: '0 0 35px rgba(0,245,255,0.9)',
              transition: '0.3s',
            }}
          >
            AI-PMS
          </Box>

          {/* Desktop Menu */}
          <HStack spacing={2} display={{ base: 'none', md: 'flex' }} align="center">
            {userRole ? (
              <>
                {navItems.map(
                  (item) =>
                    item.roles.includes(userRole) && (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) =>
                          isActive ? ActiveLinkStyle : LinkStyle
                        }
                      >
                        {item.label}
                      </NavLink>
                    )
                )}
                <Button
                  borderRadius="full"
                  px={5}
                  py={2}
                  bgGradient="linear(to-r, red.400, pink.500)"
                  _hover={{
                    transform: 'scale(1.05)',
                    boxShadow: '0 0 20px rgba(255,80,120,0.6)',
                  }}
                  color="white"
                  fontWeight="semibold"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/" style={LinkStyle}>
                  Login
                </NavLink>
                <NavLink to="/register" style={LinkStyle}>
                  Register
                </NavLink>
              </>
            )}
          </HStack>

          {/* Mobile Hamburger */}
          <IconButton
            aria-label="Open Menu"
            icon={<HamburgerIcon />}
            display={{ base: 'flex', md: 'none' }}
            onClick={onOpen}
            color="white"
            variant="ghost"
            _hover={{ bg: 'rgba(255,255,255,0.1)' }}
          />
        </Flex>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent
          bg="rgba(10,10,25,0.95)"
          backdropFilter="blur(10px)"
          borderLeft="1px solid rgba(255,255,255,0.15)"
        >
          <DrawerCloseButton color="white" />
          <VStack mt={16} spacing={5}>
            {userRole ? (
              <>
                {navItems.map(
                  (item) =>
                    item.roles.includes(userRole) && (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        style={({ isActive }) =>
                          isActive ? ActiveLinkStyle : LinkStyle
                        }
                      >
                        {item.label}
                      </NavLink>
                    )
                )}
                <Button
                  colorScheme="red"
                  size="md"
                  borderRadius="full"
                  px={10}
                  py={3}
                  bgGradient="linear(to-r, red.400, pink.500)"
                  _hover={{
                    transform: 'scale(1.05)',
                    boxShadow: '0 0 15px rgba(255,100,100,0.6)',
                  }}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/" onClick={onClose} style={LinkStyle}>
                  Login
                </NavLink>
                <NavLink to="/register" onClick={onClose} style={LinkStyle}>
                  Register
                </NavLink>
              </>
            )}
          </VStack>
        </DrawerContent>
      </Drawer>
    </>
  );
};

// ----------------------------------------------------------------------
// 🌌 App Component — Fixed Layout & Background
// ----------------------------------------------------------------------
const App: React.FC = () => {
  return (
    <Router>
      <Flex
        direction="column"
        minH="100vh"
        w="100%"
        bgGradient="linear(to-b, #0a0f1a, #000814, #001233)"
        color="white"
        overflowX="hidden"
        overflowY="auto"
      >
        {/* ✅ Padding to prevent content hiding behind Navbar */}
        <Box as="header" h="70px">
          <Navbar />
        </Box>

        {/* ✅ Add top margin equal to navbar height */}
        <Box as="main" flex="1" mt="70px" p={0} m={0}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/student-dashboard" element={<StudentDashboard />} />
              <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
              <Route path="/submit" element={<ProjectSubmission />} />
              <Route path="/ai-chat" element={<AIChatbot />} />
              <Route path="/ai-viva" element={<AIVivaSimulation />} />
              <Route path="/archive" element={<ProjectArchiving />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/alumni" element={<AlumniPortal />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/ai-viva/:projectId" element={<AIVivaSimulation />} />
              <Route path="/top-projects" element={<TopAlumniProjects />} />
              <Route path="/teacher/approved-projects" element={<TeacherApprovedProjects />} />
              <Route path="/teacher/projects/:projectId/viva-history" element={<TeacherVivaHistory />} />
              <Route path="/teacher/projects/:projectId/progress-logs" element={<TeacherProgressLog />} />
              <Route path="/teacher/project-assistant/:projectId" element={<AIProjectAssistant />} />
            </Route>
          </Routes>
        </Box>
      </Flex>
    </Router>
  );
};

export default App;
