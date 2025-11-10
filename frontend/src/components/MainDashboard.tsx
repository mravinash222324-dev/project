import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Center,
    Spinner,
    Text,
    Button,
    VStack,
    Heading,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';

const MotionBox = motion(Box);

const MainDashboard: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const userRole = location.state?.userRole || localStorage.getItem('userRole');

    useEffect(() => {
        if (!userRole) {
            const timer = setTimeout(() => {
                navigate('/', { replace: true });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [userRole, navigate]);

    if (!userRole) {
        return (
            <Center h="100vh" bg="gray.900">
                <VStack spacing={4}>
                    <Spinner
                        size="xl"
                        thickness="4px"
                        color="teal.400"
                        emptyColor="gray.700"
                    />
                    <Text fontSize="lg" color="gray.400">
                        Verifying authentication and user role...
                    </Text>
                </VStack>
            </Center>
        );
    }

    let DashboardComponent: React.ComponentType | null = null;
    if (userRole === 'Teacher' || userRole === 'HOD/Admin') {
        DashboardComponent = TeacherDashboard;
    } else if (userRole === 'Student') {
        DashboardComponent = StudentDashboard;
    }

    if (!DashboardComponent) {
        return (
            <Center h="100vh" bg="gray.900">
                <VStack
                    spacing={6}
                    p={8}
                    bg="rgba(79, 209, 197, 0.05)"
                    border="1px solid rgba(79, 209, 197, 0.2)"
                    borderRadius="xl"
                    backdropFilter="blur(12px)"
                    boxShadow="0 4px 30px rgba(79,209,197,0.2)"
                >
                    <Heading size="xl" color="teal.400">
                        Access Restricted
                    </Heading>
                    <Text color="gray.200" fontSize="lg">
                        The role "{userRole}" is not authorized to view this dashboard.
                    </Text>
                    <Button
                        colorScheme="teal"
                        variant="solid"
                        onClick={() => navigate('/', { replace: true })}
                    >
                        Go to Login
                    </Button>
                </VStack>
            </Center>
        );
    }

    return (
        <MotionBox
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            minH="100vh"
            bg="gray.900"
            p={6}
        >
            <Box
                bg="rgba(255,255,255,0.05)"
                border="1px solid rgba(79,209,197,0.2)"
                borderRadius="2xl"
                backdropFilter="blur(12px)"
                boxShadow="0 6px 40px rgba(79,209,197,0.2)"
                p={6}
            >
                <DashboardComponent />
            </Box>
        </MotionBox>
    );
};

export default MainDashboard;
