// frontend/src/components/TeacherApprovedProjects.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
  Container,
  Badge,
  Flex,
  Center,
  HStack,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
// ADDED: Bot icon
import { BookCopy, User, MessageSquare, History, Bot, BarChart } from 'lucide-react';

interface ApprovedProject {
  id: number;
  submission_id: number;
  title: string;
  student_name: string;
  status: 'In Progress' | 'Completed' | 'Archived';
  progress_percentage: number;
  category: string;
}

interface Message {
  id: number;
  sender_username: string;
  recipient_username: string;
  content: string;
  timestamp: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

const TeacherApprovedProjects: React.FC = () => {
  const [projects, setProjects] = useState<ApprovedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  // --- Messaging State ---
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState('');

  // --- Fetch Projects ---
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        const response = await axios.get('http://127.0.0.1:8000/teacher/approved-projects/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProjects(response.data);
      } catch (err) {
        setError('Failed to fetch approved projects.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [navigate]);

  // --- Messaging Functions ---
  const fetchMessages = useCallback(async (projectId: number) => {
    setLoadingMessages(true);
    setMessageError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`http://127.0.0.1:8000/projects/${projectId}/messages/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    setMessages(response.data);
    } catch (err) {
      setMessageError('Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openMessageModal = (projectId: number) => {
    setSelectedProjectId(projectId);
    setMessages([]);
    fetchMessages(projectId);
    onOpen();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProjectId) return;
    setSendingMessage(true);
    setMessageError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `http://127.0.0.1:8000/projects/${selectedProjectId}/messages/`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const addedMessages = Array.isArray(response.data) ? response.data : [response.data];
      setMessages((prev) => [...prev, ...addedMessages]);
      setNewMessage('');
      toast({ title: 'Message Sent', status: 'success', duration: 2000, isClosable: true, position: 'top' });
    } catch (err) {
      setMessageError('Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: ApprovedProject['status']) => {
    switch (status) {
      case 'In Progress': return { colorScheme: 'yellow', text: 'In Progress' };
      case 'Completed': return { colorScheme: 'green', text: 'Completed' };
      case 'Archived': return { colorScheme: 'gray', text: 'Archived' };
      default: return { colorScheme: 'cyan', text: 'Approved' };
    }
  };

  if (loading) return (
    <Center h="calc(100vh - 72px)" color="white">
      <Spinner size="xl" color="cyan.400" thickness="4px" />
      <Text ml={4} fontSize="xl">Loading...</Text>
    </Center>
  );

  return (
    <Flex w="100%" minH="calc(100vh - 72px)" justify="center" position="relative" color="white" bgGradient="linear(to-bl, #060B26, #0A042A)">
      <MotionBox position="absolute" top="0" left="0" w="80" h="80" rounded="full" bgGradient="radial(cyan.800, transparent)" filter="blur(200px)" opacity={0.2} zIndex={-1} />
      <MotionBox position="absolute" bottom="0" right="0" w="96" h="96" rounded="full" bgGradient="radial(blue.800, transparent)" filter="blur(200px)" opacity={0.2} zIndex={-1} />

      <Container maxW="container.xl" h="100%" overflowY="auto" py={{ base: 6, md: 8 }} sx={{ '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-track': { background: 'transparent' }, '&::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.2)', borderRadius: '24px' } }}>
        <VStack spacing={8}>
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Heading as="h1" size="2xl" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text" fontWeight="extrabold" textAlign="center">
              Approved Projects Monitor
            </Heading>
          </motion.div>

          {error && (
            <Alert status="error" bg="rgba(255,0,0,0.1)" border="1px solid rgba(255,0,0,0.3)">
              <AlertIcon color="red.300" />
              {error}
            </Alert>
          )}

          {projects.length === 0 && !error ? (
            <Center h="50vh">
              <Text fontSize="xl" color="gray.400">No active projects.</Text>
            </Center>
          ) : (
            <MotionVStack w="full" spacing={6} variants={containerVariants} initial="hidden" animate="visible">
              {projects.map((project) => {
                const status = getStatusBadge(project.status);
                return (
                  <MotionBox
                    key={project.id}
                    variants={itemVariants}
                    w="full"
                    p={6}
                    bg="rgba(28, 38, 78, 0.5)"
                    border="1px solid rgba(255,255,255,0.15)"
                    borderRadius="2xl"
                    boxShadow="0 10px 30px rgba(0,0,0,0.2)"
                    whileHover={{ transform: 'translateY(-5px)', borderColor: 'rgba(0, 255, 255, 0.5)' }}
                    transition={{ duration: 0.2 }}
                  >
                    <VStack align="stretch" spacing={4}>
                      <Flex justify="space-between" align="center" gap={3} direction={{ base: 'column', md: 'row' }}>
                        <Heading size="md" color="cyan.300">{project.title}</Heading>
                        <Badge colorScheme={status.colorScheme} variant="solid">{status.text}</Badge>
                      </Flex>

                      <HStack spacing={6} color="gray.300" divider={<Text mx={2}>|</Text>} flexWrap="wrap">
                        <HStack>
                          <User size={16} />
                          <Text fontSize="sm">Student: <strong>{project.student_name}</strong></Text>
                        </HStack>
                        <HStack>
                          <BookCopy size={16} />
                          <Text fontSize="sm">Category: <strong>{project.category}</strong></Text>
                        </HStack>
                      </HStack>

                      <VStack align="stretch" spacing={2} pt={2}>
                        <HStack justify="space-between">
                          <Text fontSize="sm" fontWeight="bold" color="gray.200">Progress</Text>
                          <Text fontWeight="bold" color="cyan.300">{project.progress_percentage}%</Text>
                        </HStack>
                        <Progress value={project.progress_percentage} size="sm" colorScheme="cyan" borderRadius="full" bg="rgba(255,255,255,0.1)" />
                      </VStack>

                      {/* --- ACTION BUTTONS --- */}
                      <Flex pt={4} borderTop="1px solid" borderColor="rgba(255,255,255,0.1)" justify="flex-end" gap={3}>
                        {/* NEW AI ASSISTANT BUTTON (exact logic) */}
                        <Button
                          onClick={() => navigate(`/teacher/project-assistant/${project.id}`)}
                          leftIcon={<Bot size={18} />}
                          bgGradient="linear(to-r, purple.500, pink.500)"
                          color="white"
                          size="sm"
                          _hover={{ bgGradient: 'linear(to-r, purple.600, pink.600)', transform: 'scale(1.05)' }}
                        >
                          AI Assistant
                        </Button>

                        {/* Existing Button Group */}
                        <Button
                          onClick={() => navigate(`/teacher/projects/${project.id}/viva-history`)}
                          leftIcon={<History size={16} />}
                          colorScheme="teal"
                          variant="outline"
                          size="sm"
                          _hover={{ bg: 'teal.500', color: 'white' }}
                        >
                          Viva History
                        </Button>
                        {/* --- ADD THIS NEW BUTTON --- */}
                        <Button
                          onClick={() => navigate(`/teacher/projects/${project.id}/progress-logs`)}
                          leftIcon={<BarChart size={16} />}
                          colorScheme="yellow"
                          variant="outline"
                          size="sm"
                          _hover={{ bg: 'yellow.500', color: 'black' }}
                        >
                          Progress Logs
                        </Button>
                        <Button
                          onClick={() => openMessageModal(project.id)}
                          leftIcon={<MessageSquare size={16} />}
                          colorScheme="blue"
                          variant="outline"
                          size="sm"
                          _hover={{ bg: 'blue.500', color: 'white' }}
                        >
                          Messages
                        </Button>
                      </Flex>
                    </VStack>
                  </MotionBox>
                );
              })}
            </MotionVStack>
          )}
        </VStack>
      </Container>

      {/* Message Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
        <ModalContent bg="#1C264E" color="white" border="1px solid rgba(255,255,255,0.2)">
          <ModalHeader borderBottom="1px solid rgba(255,255,255,0.2)">Project Messages</ModalHeader>
          <ModalCloseButton _focus={{ boxShadow: 'none' }} />
          <ModalBody py={6}>
            {loadingMessages ? (
              <Center h="200px"><Spinner /></Center>
            ) : messageError ? (
              <Alert status="error" bg="rgba(255,0,0,0.1)"><AlertIcon /> {messageError}</Alert>
            ) : (
              <VStack
                spacing={4}
                align="stretch"
                maxH="400px"
                overflowY="auto"
                pr={2}
                sx={{
                  '&::-webkit-scrollbar': { width: '4px' },
                  '&::-webkit-scrollbar-track': { background: 'transparent' },
                  '&::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.2)', borderRadius: '24px' }
                }}
              >
                {messages.length === 0 ? (
                  <Text textAlign="center" color="gray.400">No messages yet.</Text>
                ) : (
                  messages.map((msg) => (
                    <Box
                      key={msg.id}
                      bg="rgba(255,255,255,0.08)"
                      p={3}
                      borderRadius="lg"
                      maxWidth="80%"
                      alignSelf={msg.sender_username === 'You' ? 'flex-end' : 'flex-start'}
                    >
                      <Text fontWeight="bold" fontSize="sm" color="blue.200">{msg.sender_username}</Text>
                      <Text fontSize="sm" mt={1}>{msg.content}</Text>
                      <Text fontSize="xs" color="gray.400" mt={2} textAlign="right">
                        {new Date(msg.timestamp).toLocaleString()}
                      </Text>
                    </Box>
                  ))
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid rgba(255,255,255,0.2)">
            <Flex as="form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} width="full" gap={3}>
              <Input
                placeholder="Type message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                bg="rgba(0,0,0,0.2)"
                borderColor="rgba(255,255,255,0.2)"
                _hover={{ borderColor: 'cyan.400' }}
                _focus={{ borderColor: 'cyan.300' }}
              />
              <Button type="submit" colorScheme="blue" isLoading={sendingMessage} isDisabled={!newMessage.trim()}>
                Send
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default TeacherApprovedProjects;
