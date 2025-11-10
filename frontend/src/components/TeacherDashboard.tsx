// frontend/src/components/TeacherDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Heading,
  VStack,
  Text,
  Badge,
  Spinner,
  useToast,
  Tabs,
  TabList,
  Tab,
  Container,
  Modal, // Import Modal components
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Textarea, // For message input
  useDisclosure, // Hook for modal control
  Divider, // For separating messages
  Input // For sending message
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react'; // Icon for message button
import { Alert, AlertIcon } from "@chakra-ui/react";
import { Center, Tag, HStack } from "@chakra-ui/react";

const MotionBox = motion(Box);

// --- Interfaces ---
interface Submission {
  id: number;
  title: string;
  group_name: string;
  student: { username: string };
  relevance_score: number;
  feasibility_score: number;
  innovation_score: number;
  abstract_text: string;
  status: 'Submitted' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Archived'; // Added other statuses
  project_id: number | null; // Added project_id
  tags: string[] | null;
}

interface Message {
  id: number;
  sender_username: string;
  recipient_username: string;
  content: string;
  timestamp: string;
}

// --- Main Component ---
const TeacherDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const navigate = useNavigate();
  const toast = useToast();

  // --- State for Messaging Modal ---
  const { isOpen, onOpen, onClose } = useDisclosure(); // Chakra UI modal hook
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const viewType = tabIndex === 0 ? 'appointed' : 'unappointed';
  // Endpoint logic remains the same
  const endpoint =
    viewType === 'appointed'
      ? 'http://127.0.0.1:8000/teacher/appointed/'
      : 'http://127.0.0.1:8000/teacher/unappointed/';

  // Fetch Submissions (remains largely the same)
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(''); // Clear previous errors
      setSubmissions([]); // Clear previous submissions
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/');
          return;
        }
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubmissions(response.data);
      } catch (err) {
        setError('Failed to fetch submissions. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [viewType, navigate, endpoint]);

  // Handle Review (remains the same)
  const handleReview = async (submissionId: number, status: 'Approved' | 'Rejected') => {
      // ... (existing handleReview code) ...
       try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://127.0.0.1:8000/teacher/submissions/${submissionId}/`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: 'Success',
        description: `Project status updated.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top',
      });
      // Refresh the list after review
      setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: 'This project may have already been reviewed.',
        status: 'error',
        duration: 4000,
        isClosable: true,
        position: 'top',
      });
      console.error(err);
    }
  };

  // --- Fetch Messages for Modal ---
  const fetchMessages = useCallback(async (projectId: number) => {
    setLoadingMessages(true);
    setError(''); // Clear message errors
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`http://127.0.0.1:8000/projects/${projectId}/messages/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(response.data);
    } catch (err) {
      setError('Failed to load messages.');
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // --- Handle Opening the Message Modal ---
  const openMessageModal = (projectId: number) => {
    setSelectedProjectId(projectId);
    setMessages([]); // Clear previous messages
    fetchMessages(projectId); // Fetch messages for the selected project
    onOpen(); // Open the modal
  };

  // --- Handle Sending a New Message ---
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProjectId) return;
    setSendingMessage(true);
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
      toast({ title: 'Message Sent', status: 'success', duration: 2000, isClosable: true });
    } catch (err) {
      toast({ title: 'Error Sending Message', status: 'error', duration: 3000, isClosable: true });
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  const scoreColor = (score: number | null | undefined): string => { // Handle potentially null scores
    if (score === null || score === undefined) return 'gray';
    if (score >= 7.5) return 'cyan';
    if (score >= 5) return 'yellow';
    return 'red';
  };

  // --- Render Logic ---
  if (loading) {
    // ... (loading spinner remains the same) ...
     return (
      <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-bl, #060B26, #0A042A)" color="white">
        <Spinner size="xl" color="cyan.400" thickness="4px" />
        <Text ml={4} fontSize="xl">Loading Submissions...</Text>
      </Flex>
    );
  }

  return (
    <Flex
      // ... (existing Flex styles for background, etc.) ...
         w="100%"
      minH="100vh"
      overflowY="auto"
      position="relative"
      justify="center"
      bgGradient="linear(to-bl, #060B26, #0A042A)"
      color="white"
      sx={{
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        'scrollbarWidth': 'none',
        '-ms-overflow-style': 'none',
      }}
    >
      {/* ... (existing background MotionBox elements) ... */}
         <MotionBox position="absolute" top="-10%" left="-5%" w="72" h="72" rounded="full" bgGradient="radial(cyan.500, transparent)" filter="blur(150px)" opacity={0.3} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <MotionBox position="absolute" bottom="-10%" right="-5%" w="80" h="80" rounded="full" bgGradient="radial(blue.500, transparent)" filter="blur(160px)" opacity={0.3} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />

      <Container maxW="container.lg" zIndex={2} py={{ base: 8, md: 16 }}>
        {/* ... (existing Heading) ... */}
        <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <Heading as="h1" size="2xl" mb={8} textAlign="center" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text" fontWeight="extrabold">
            Teacher Review Dashboard
          </Heading>
        </motion.div>

        {/* --- Tabs remain the same --- */}
        <Tabs isFitted variant="unstyled" onChange={(index) => setTabIndex(index)} mb={8}>
            <TabList borderBottom="2px solid" borderColor="rgba(255,255,255,0.2)">
                <Tab fontSize="lg" fontWeight="semibold" color="gray.400" _selected={{ color: 'cyan.300', boxShadow: '0px 2px 0px 0px cyan' }} transition="all 0.2s ease-in-out">
                    Appointed Groups ({viewType === 'appointed' ? submissions.length : ''})
                </Tab>
                <Tab fontSize="lg" fontWeight="semibold" color="gray.400" _selected={{ color: 'cyan.300', boxShadow: '0px 2px 0px 0px cyan' }} transition="all 0.2s ease-in-out">
                    Unappointed Projects ({viewType === 'unappointed' ? submissions.length : ''})
                </Tab>
            </TabList>
        </Tabs>

        {/* --- Display logic --- */}
        {submissions.length === 0 && !error ? (
          // ... (existing empty state) ...
            <MotionBox textAlign="center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Text fontSize="xl" color="gray.300">
              {viewType === 'appointed' ? 'No projects awaiting your review.' : 'No other unappointed projects found.'}
            </Text>
          </MotionBox>
        ) : error ? (
          // ... (existing error state) ...
            <MotionBox textAlign="center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Text fontSize="xl" color="red.400">{error}</Text>
          </MotionBox>
        ) : (
          <VStack spacing={6}>
            {submissions.map((submission: Submission, index: number) => (
              <MotionBox
                key={submission.id}
                // ... (existing MotionBox styles) ...
                     p={6}
                w="full"
                bg="rgba(28, 38, 78, 0.5)"
                border="1px solid"
                borderColor="rgba(255, 255, 255, 0.15)"
                borderRadius="2xl"
                boxShadow="0 10px 30px rgba(0,0,0,0.2)"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{
                  scale: 1.02,
                  borderColor: 'rgba(0, 255, 255, 0.5)',
                }}
              >
                {/* ... (existing Flex for Title, Group) ... */}
                <Flex justify="space-between" align="center" mb={2}>
                  <Heading size="md" color="cyan.300">{submission.title}</Heading>
                  <Text fontSize="sm" color="gray.400">Group: {submission.group_name}</Text>
                </Flex>

                {/* ... (existing Text for Submitted by) ... */}
                 <Text fontSize="sm" color="gray.300" mb={4}>
                  Submitted by: {submission.student?.username || 'N/A'} {/* Handle potential null student */}
                </Text>

                {/* ... (existing Flex for Badges) ... */}
                 <Flex mb={4} gap={3} wrap="wrap">
                  <Badge variant="solid" colorScheme={scoreColor(submission.relevance_score)}>
                    Relevance: {submission.relevance_score?.toFixed(1) ?? 'N/A'}
                  </Badge>
                  <Badge variant="solid" colorScheme={scoreColor(submission.feasibility_score)}>
                    Feasibility: {submission.feasibility_score?.toFixed(1) ?? 'N/A'}
                  </Badge>
                  <Badge variant="solid" colorScheme={scoreColor(submission.innovation_score)}>
                    Innovation: {submission.innovation_score?.toFixed(1) ?? 'N/A'}
                  </Badge>
                </Flex>

                {/* ... (existing Text for Abstract) ... */}
                 <Text mb={5} color="gray.200" noOfLines={4}>
                  <strong>Abstract:</strong> {submission.abstract_text}
                </Text>
                {submission.tags && submission.tags.length > 0 && (
                    <Box mt={3} py={2}>
                      <HStack spacing={2} wrap="wrap">
                        <Text fontSize="sm" fontWeight="bold" color="cyan.200">AI Keywords:</Text>
                        {submission.tags.map((tag, index) => (
                          <Tag key={index} size="sm" colorScheme="cyan" variant="solid">
                            {tag}
                          </Tag>
                        ))}
                      </HStack>
                    </Box>
                  )}
                {/* --- Action Buttons --- */}
                <Flex gap={4}>
                  {viewType === 'appointed' && (
                    <>
                      <Button onClick={() => handleReview(submission.id, 'Approved')} bgGradient="linear(to-r, green.500, green.400)" _hover={{ bgGradient: 'linear(to-r, green.400, green.300)', boxShadow: '0 0 15px rgba(0,255,0,0.4)' }} transition="all 0.3s ease" size="sm">
                        Approve
                      </Button>
                      <Button onClick={() => handleReview(submission.id, 'Rejected')} bgGradient="linear(to-r, red.600, red.500)" _hover={{ bgGradient: 'linear(to-r, red.500, red.400)', boxShadow: '0 0 15px rgba(255,0,0,0.4)' }} transition="all 0.3s ease" size="sm">
                        Reject
                      </Button>
                    </>
                  )}
                  {/* --- ADD MESSAGE BUTTON --- */}
                  {/* Show only if the project is approved and has a project_id */}
                  {submission.project_id && (
                     <Button
                       onClick={() => openMessageModal(submission.project_id!)}
                       leftIcon={<MessageSquare size={16} />}
                       colorScheme="blue"
                       variant="outline"
                       size="sm"
                       _hover={{ bg: 'blue.500', color: 'white' }}
                     >
                       Messages
                     </Button>
                   )}
                </Flex>
              </MotionBox>
            ))}
          </VStack>
        )}
      </Container>

      {/* --- Messaging Modal --- */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
        <ModalContent bg="#1C264E" color="white" border="1px solid rgba(255,255,255,0.2)">
          <ModalHeader borderBottom="1px solid rgba(255,255,255,0.2)">Project Messages</ModalHeader>
          <ModalCloseButton _focus={{ boxShadow: 'none' }} />
          <ModalBody py={6}>
            {loadingMessages ? (
              <Center h="200px"><Spinner /></Center>
            ) : error ? (
                 <Alert status="error" borderRadius="md" bg="rgba(255,0,0,0.1)">
                    <AlertIcon /> {error}
                 </Alert>
             ) : (
              <VStack spacing={4} align="stretch" maxH="400px" overflowY="auto" pr={2} // Add padding for scrollbar
                   sx={{
                     '&::-webkit-scrollbar': { width: '4px' },
                     '&::-webkit-scrollbar-track': { background: 'transparent' },
                     '&::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.2)', borderRadius: '24px' },
                   }}
              >
                {messages.length === 0 ? (
                    <Text textAlign="center" color="gray.400">No messages yet.</Text>
                ) : (
                    messages.map((msg) => (
                      <Box
                        key={msg.id}
                        bg={msg.sender_username === 'You' ? "blue.900" : "rgba(255,255,255,0.08)"} // Differentiate sender (adjust if needed)
                        p={3}
                        borderRadius="lg"
                        alignSelf={msg.sender_username === 'You' ? 'flex-end' : 'flex-start'}
                        maxWidth="80%"
                      >
                        <Text fontWeight="bold" fontSize="sm" color={msg.sender_username === 'You' ? "cyan.200" : "blue.200"}>{msg.sender_username}</Text>
                        <Text fontSize="sm" mt={1}>{msg.content}</Text>
                        <Text fontSize="xs" color="gray.400" mt={2} textAlign="right">{new Date(msg.timestamp).toLocaleString()}</Text>
                      </Box>
                    ))
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid rgba(255,255,255,0.2)">
            <Flex as="form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} width="full" gap={3}>
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                bg="rgba(0,0,0,0.2)"
                borderColor="rgba(255,255,255,0.2)"
                 _hover={{ borderColor: 'cyan.400' }}
                 _focus={{ borderColor: 'cyan.300', boxShadow: '0 0 10px rgba(0,255,255,0.3)' }}
              />
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={sendingMessage}
                loadingText="Sending"
              >
                Send
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default TeacherDashboard;