import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  VStack,
  Heading,
  Text,
  Spinner,
  Center,
  Container,
  Flex,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

// --- Interfaces & Animation Variants ---
interface Project {
  id: number;
  title: string;
  student: {
    username: string;
  };
  innovation_score: number;
  abstract_text: string;
  submitted_at: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

// --- Main Component ---
const TopAlumniProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTopProjects = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/alumni/top-projects/');
        setProjects(response.data);
      } catch (err) {
        setError('Failed to fetch top projects. The server may be offline.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopProjects();
  }, []);

  // --- Loading State ---
  if (loading) {
    return (
      <Center h="calc(100vh - 72px)" color="white">
        <Spinner size="xl" color="cyan.400" thickness="4px" />
        <Text ml={4} fontSize="xl">Loading Top Projects...</Text>
      </Center>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Center h="calc(100vh - 72px)" color="red.400" fontSize="xl">
        <Text>{error}</Text>
      </Center>
    );
  }

  return (
    <Flex
      w="100%"
      position="relative"
      justify="center"
      color="white"
      pt={{ base: 8, md: 16 }}
      pb={{ base: 16, md: 24 }}
    >
      {/* Background Glows */}
      <MotionBox position="absolute" top="0" right="0" w="80" h="80" rounded="full" bgGradient="radial(cyan.800, transparent)" filter="blur(200px)" opacity={0.25} zIndex={-1} />
      <MotionBox position="absolute" bottom="10%" left="0" w="96" h="96" rounded="full" bgGradient="radial(blue.800, transparent)" filter="blur(200px)" opacity={0.25} zIndex={-1} />

      <Container maxW="container.lg" zIndex={2}>
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Heading as="h1" size="2xl" mb={12} textAlign="center" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text" fontWeight="extrabold">
            Top Alumni Projects Showcase
          </Heading>
        </motion.div>

        {projects.length === 0 ? (
          <Center h="30vh">
            <Text fontSize="xl" color="gray.400">
              No completed projects are available to display.
            </Text>
          </Center>
        ) : (
          <MotionVStack
            spacing={6}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {projects.map((project: Project) => (
              <MotionBox
                key={project.id}
                variants={itemVariants}
                w="full"
                p={6}
                bg="rgba(28, 38, 78, 0.5)"
                border="1px solid"
                borderColor="rgba(255, 255, 255, 0.15)"
                borderRadius="2xl"
                boxShadow="0 10px 30px rgba(0,0,0,0.2)"
                transition="all 0.3s ease-in-out"
                whileHover={{
                  transform: 'translateY(-5px)',
                  borderColor: 'rgba(0, 255, 255, 0.5)',
                  boxShadow: '0 15px 40px rgba(0,255,255,0.15)',
                }}
              >
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between" align="center">
                    <Heading size="md" color="cyan.300">{project.title}</Heading>
                    <Badge
                      variant="solid"
                      colorScheme="cyan"
                      fontSize="sm"
                      display="flex"
                      alignItems="center"
                    >
                      <Star size={12} style={{ marginRight: '6px' }} />
                      Innovation: {project.innovation_score.toFixed(1)}
                    </Badge>
                  </HStack>

                  <Text fontSize="sm" color="gray.300">
                    By: <strong>{project.student.username}</strong>
                  </Text>

                  <Text color="gray.200" noOfLines={3}>
                    {project.abstract_text}
                  </Text>

                  <Text fontSize="xs" color="gray.400" alignSelf="flex-end">
                    Submitted: {new Date(project.submitted_at).toLocaleDateString()}
                  </Text>
                </VStack>
              </MotionBox>
            ))}
          </MotionVStack>
        )}
      </Container>
    </Flex>
  );
};

export default TopAlumniProjects;