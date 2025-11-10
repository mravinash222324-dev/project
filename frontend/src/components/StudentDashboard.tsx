// frontend/src/components/StudentDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Progress,
  FormControl,
  FormLabel,
  Flex,
  Container,
  Badge,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
} from '@chakra-ui/react';
import { motion, type Transition } from 'framer-motion';
import { ArrowRight, Lock, Plus, MessageSquare, PlayCircle } from 'lucide-react';

// --- Interfaces ---
interface Submission {
  id: number;
  title: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Archived';
  progress: number | null;
  project_id: number | null;
}

interface Message {
  id: number;
  sender_username: string;
  recipient_username: string;
  content: string;
  timestamp: string;
}

interface VivaQuestion {
  id: number;
  question_text: string;
  student_answer: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
}

interface VivaSession {
  id: number;
  questions: VivaQuestion[];
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
const MotionText = motion(Text);

// Typed transition
const pulse: Transition = { duration: 2, repeat: Infinity };

// --- Main Component ---
const StudentDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-submission log text to avoid cross-typing
  const [newLogText, setNewLogText] = useState<{ [submissionId: number]: string }>({});

  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  // --- Messaging State ---
  const { isOpen: isMsgOpen, onOpen: onMsgOpen, onClose: onMsgClose } = useDisclosure();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState('');

  // --- Viva State ---
  const { isOpen: isVivaOpen, onOpen: onVivaOpen, onClose: onVivaClose } = useDisclosure();
  const [vivaSession, setVivaSession] = useState<VivaSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [vivaAnswer, setVivaAnswer] = useState('');
  const [loadingViva, setLoadingViva] = useState(false);
  const [submittingViva, setSubmittingViva] = useState(false);
  const [vivaError, setVivaError] = useState('');

  // --- Fetch Submissions ---
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true); setError(''); setSubmissions([]);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        const response = await axios.get('http://127.0.0.1:8000/student/submissions/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const subs: Submission[] = response.data;
        setSubmissions(subs);

        // Initialize an empty log for each submission
        const initLogs = subs.reduce((acc, sub) => {
          acc[sub.id] = '';
          return acc;
        }, {} as { [id: number]: string });
        setNewLogText(initLogs);
      } catch (err) {
        setError('Failed to fetch submissions.');
        console.error("Fetch Submissions Error:", err);
      } finally { setLoading(false); }
    };
    fetchSubmissions();
  }, [navigate]);

  // --- Progress Log Submit Handler ---
  const handleProgressUpdate = async (
    projectId: number,
    submissionId: number
  ) => {
    const text = (newLogText[submissionId] || '').trim();
    if (!text) {
      toast({
        title: 'Input Required',
        description: 'Please describe what you have implemented.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
      return;
    }

    setIsUpdating(submissionId);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `http://127.0.0.1:8000/projects/${projectId}/log-update/`,
        { update_text: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Expecting { ai_suggested_percentage: number, ... }
      const newPercentage = response.data?.ai_suggested_percentage;

      if (typeof newPercentage === 'number') {
        setSubmissions(prev =>
          prev.map(sub => sub.id === submissionId ? { ...sub, progress: newPercentage } : sub)
        );
      }

      setNewLogText(prev => ({ ...prev, [submissionId]: '' }));

      toast({
        title: 'Progress Log Submitted!',
        description: typeof newPercentage === 'number'
          ? `AI has updated your progress to ${newPercentage}%.`
          : 'Your log was submitted successfully.',
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top'
      });
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: 'Could not submit your progress log.',
        status: 'error',
        duration: 4000,
        isClosable: true,
        position: 'top'
      });
      console.error('Progress Update Error:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // --- Messaging Functions ---
  const fetchMessages = useCallback(async (projectId: number) => {
    setLoadingMessages(true); setMessageError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `http://127.0.0.1:8000/projects/${projectId}/messages/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data);
    } catch (err) {
      setMessageError('Failed to load messages.');
      console.error("Fetch Messages Error:", err);
    } finally { setLoadingMessages(false); }
  }, []);

  const openMessageModal = (projectId: number) => {
    setSelectedProjectId(projectId);
    setMessages([]);
    fetchMessages(projectId);
    onMsgOpen();
  };
  const closeMessageModal = () => {
    onMsgClose();
    setSelectedProjectId(null);
    setNewMessage('');
    setMessageError('');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProjectId) return;
    setSendingMessage(true); setMessageError('');
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
    } catch (err) {
      setMessageError('Failed to send message.');
      console.error("Send Message Error:", err);
    } finally { setSendingMessage(false); }
  };

  // --- Typed submit handler factories (avoids inline param typing on polymorphic components) ---
  const makeOnProgressSubmit =
    (projectId: number, submissionId: number): React.FormEventHandler<HTMLFormElement> =>
    (e) => {
      e.preventDefault();
      handleProgressUpdate(projectId, submissionId);
    };

  const makeOnMessageSubmit = (): React.FormEventHandler<HTMLFormElement> =>
    (e) => {
      e.preventDefault();
      handleSendMessage();
    };

  // --- Viva Functions ---
  const startVivaSession = async (projectId: number) => {
    setLoadingViva(true); setVivaError(''); setVivaSession(null); setCurrentQuestionIndex(0); setVivaAnswer('');
    onVivaOpen();
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        'http://127.0.0.1:8000/ai/viva/',
        { project_id: projectId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVivaSession(response.data);
    } catch (err: any) {
      setVivaError(err.response?.data?.error || 'Failed to start Viva session.');
      console.error("Viva Start Error:", err);
    } finally { setLoadingViva(false); }
  };

  const submitVivaAnswer = async () => {
    if (!vivaSession || !vivaAnswer.trim()) return;
    const currentQuestion = vivaSession.questions[currentQuestionIndex];
    setSubmittingViva(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        'http://127.0.0.1:8000/ai/viva/evaluate/',
        { question_id: currentQuestion.id, answer: vivaAnswer },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedQuestion = response.data;
      setVivaSession(prev => {
        if (!prev) return null;
        const newQuestions = [...prev.questions];
        newQuestions[currentQuestionIndex] = updatedQuestion;
        return { ...prev, questions: newQuestions };
      });
      setVivaAnswer('');
    } catch (err: any) {
      toast({
        title: 'Evaluation Failed',
        description: err.response?.data?.error || 'Could not submit answer.',
        status: 'error',
      });
      console.error("Viva Eval Error:", err);
    } finally { setSubmittingViva(false); }
  };

  const nextQuestion = () => {
    if (vivaSession && currentQuestionIndex < vivaSession.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setVivaAnswer('');
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Helper
  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'Approved': return { colorScheme: 'cyan', text: 'Approved' };
      case 'In Progress': return { colorScheme: 'yellow', text: 'In Progress' };
      case 'Completed': return { colorScheme: 'green', text: 'Completed' };
      case 'Archived': return { colorScheme: 'gray', text: 'Archived' };
      case 'Rejected': return { colorScheme: 'red', text: 'Rejected' };
      default: return { colorScheme: 'gray', text: 'Pending' };
    }
  };

  if (loading) {
    return (
      <Center h="calc(100vh - 72px)" color="white">
        <Spinner size="xl" color="cyan.400" thickness="4px" />
        <Text ml={4} fontSize="xl">Loading Dashboard...</Text>
      </Center>
    );
  }

  return (
    <Flex w="100%" minH="calc(100vh - 72px)" justify="center" position="relative" color="white" bgGradient="linear(to-bl, #060B26, #0A042A)">
      {/* Background glows */}
      <MotionBox position="absolute" top="0" left="0" w="80" h="80" rounded="full" bgGradient="radial(cyan.800, transparent)" filter="blur(200px)" opacity={0.2} zIndex={-1} />
      <MotionBox position="absolute" bottom="0" right="0" w="96" h="96" rounded="full" bgGradient="radial(blue.800, transparent)" filter="blur(200px)" opacity={0.2} zIndex={-1} />

      <Container
        maxW="container.xl"
        h="100%"
        overflowY="auto"
        py={{ base: 6, md: 8 }}
        sx={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.2)', borderRadius: '24px' }
        }}
      >
        <VStack spacing={8}>
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Heading as="h1" size="2xl" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text" fontWeight="extrabold" textAlign="center">
              My Project Dashboard
            </Heading>
          </motion.div>

          <Button
            onClick={() => navigate('/submit')}
            bgGradient="linear(to-r, cyan.500, blue.500)"
            color="white"
            size="lg"
            leftIcon={<Plus size={20} />}
            _hover={{ bgGradient: 'linear(to-r, cyan.400, blue.400)', transform: 'translateY(-2px)' }}
            transition="all 0.3s ease"
          >
            Submit New Project
          </Button>

          {error && (
            <Alert status="error" borderRadius="lg" bg="rgba(255,0,0,0.1)" border="1px solid rgba(255,0,0,0.3)">
              <AlertIcon color="red.300" />
              {error}
            </Alert>
          )}

          {submissions.length === 0 && !error ? (
            <Center h="40vh"><Text fontSize="xl" color="gray.400">You haven't submitted any projects yet.</Text></Center>
          ) : (
            <MotionVStack w="full" spacing={6} variants={containerVariants} initial="hidden" animate="visible">
              {submissions.map((submission) => {
                const statusInfo = getStatusBadge(submission.status);
                const canAction = (submission.status === 'Approved' || submission.status === 'In Progress') && submission.project_id != null;
                return (
                  <MotionBox
                    key={submission.id}
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
                    <VStack align="stretch" spacing={5}>
                      <Flex justify="space-between" align="center" direction={{ base: 'column', md: 'row' }} gap={4}>
                        <VStack align={{ base: 'center', md: 'flex-start' }}>
                          <Heading size="md" color="cyan.300">{submission.title}</Heading>
                          <Badge colorScheme={statusInfo.colorScheme} variant="solid">{statusInfo.text}</Badge>
                        </VStack>
                        <HStack>
                          <Button
                            onClick={() => canAction && startVivaSession(submission.project_id!)}
                            isDisabled={!canAction}
                            rightIcon={canAction ? <PlayCircle size={16} /> : <Lock size={16} />}
                            colorScheme="teal"
                            variant="solid"
                            _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
                          >
                            Start AI Viva
                          </Button>
                          <Button
                            onClick={() => canAction && openMessageModal(submission.project_id!)}
                            isDisabled={!canAction}
                            leftIcon={<MessageSquare size={16} />}
                            colorScheme="purple"
                            variant="outline"
                          >
                            Messages
                          </Button>
                        </HStack>
                      </Flex>

                      {canAction && (
                        <VStack align="stretch" spacing={4} pt={4} borderTop="1px solid" borderColor="rgba(255,255,255,0.1)">
                          {/* Current Progress Bar */}
                          <HStack>
                            <Text fontSize="sm" fontWeight="bold" color="gray.200" minW="80px">Progress:</Text>
                            <Progress value={submission.progress ?? 0} size="sm" colorScheme="cyan" borderRadius="full" flex="1" bg="rgba(255,255,255,0.1)" />
                            <Text fontWeight="bold" color="cyan.300">{submission.progress ?? 0}%</Text>
                          </HStack>

                          {/* New Log-based Update UI */}
                          <form onSubmit={makeOnProgressSubmit(submission.project_id!, submission.id)}>
                            <VStack spacing={3} align="stretch">
                              <FormControl>
                                <FormLabel fontSize="sm" color="cyan.200">
                                  Submit New Progress Update:
                                </FormLabel>
                                <Textarea
                                  placeholder="Describe what you've completed (e.g., 'Finished user login API', 'Deployed database schema')..."
                                  value={newLogText[submission.id] ?? ''}
                                  onChange={(e) =>
                                    setNewLogText(prev => ({ ...prev, [submission.id]: e.target.value }))
                                  }
                                  bg="rgba(0,0,0,0.2)"
                                  borderColor="rgba(255,255,255,0.2)"
                                  _hover={{ borderColor: 'cyan.400' }}
                                  _focus={{ borderColor: 'cyan.300' }}
                                />
                              </FormControl>
                              <Button
                                type="submit"
                                size="sm"
                                colorScheme="green"
                                isLoading={isUpdating === submission.id}
                                loadingText="AI is analyzing..."
                                alignSelf="flex-end"
                              >
                                Submit Log
                              </Button>
                            </VStack>
                          </form>
                        </VStack>
                      )}
                    </VStack>
                  </MotionBox>
                );
              })}
            </MotionVStack>
          )}
        </VStack>
      </Container>

      {/* --- Messaging Modal --- */}
      <Modal isOpen={isMsgOpen} onClose={closeMessageModal} size="xl" scrollBehavior="inside">
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
                ) : messages.map((msg) => (
                  <Box
                    key={msg.id}
                    bg={msg.sender_username === 'You' ? "blue.900" : "rgba(255,255,255,0.08)"}
                    p={3}
                    borderRadius="lg"
                    maxWidth="80%"
                    alignSelf={msg.sender_username === 'You' ? 'flex-end' : 'flex-start'}
                  >
                    <Text fontWeight="bold" fontSize="sm" color={msg.sender_username === 'You' ? "cyan.200" : "blue.200"}>
                      {msg.sender_username}
                    </Text>
                    <Text fontSize="sm" mt={1}>{msg.content}</Text>
                    <Text fontSize="xs" color="gray.400" mt={2} textAlign="right">
                      {new Date(msg.timestamp).toLocaleString()}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid rgba(255,255,255,0.2)">
            <form onSubmit={makeOnMessageSubmit()} style={{ width: '100%' }}>
              <Flex width="full" gap={3}>
                <Textarea
                  placeholder="Type message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  bg="rgba(0,0,0,0.2)"
                  borderColor="rgba(255,255,255,0.2)"
                  _hover={{ borderColor: 'cyan.400' }}
                  _focus={{ borderColor: 'cyan.300' }}
                  rows={1}
                  resize="none"
                />
                <Button type="submit" colorScheme="blue" isLoading={sendingMessage} isDisabled={!newMessage.trim()}>
                  Send
                </Button>
              </Flex>
            </form>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* --- Viva Modal --- */}
      <Modal isOpen={isVivaOpen} onClose={onVivaClose} size="2xl" closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(8px)" />
        <ModalContent bg="#1A202C" color="white" border="1px solid" borderColor="cyan.500" boxShadow="0 0 20px rgba(0, 255, 255, 0.2)">
          <ModalHeader borderBottom="1px solid" borderColor="whiteAlpha.200" color="cyan.300">
            AI Viva Examination Session
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            {loadingViva ? (
              <Center h="300px" flexDirection="column">
                <Spinner size="xl" color="cyan.400" thickness="4px" mb={4} />
                <MotionText
                  fontSize="lg"
                  color="cyan.200"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={pulse}
                >
                  AI Examiner is preparing your questions...
                </MotionText>
              </Center>
            ) : vivaError ? (
              <Alert
                status="error"
                variant="subtle"
                flexDirection="column"
                alignItems="center"
                justifyItems="center"
                textAlign="center"
                height="200px"
                bg="red.900"
                color="red.200"
                borderRadius="md"
              >
                <AlertIcon boxSize="40px" mr={0} />
                <Heading size="md" mt={4} mb={1}>Session Error</Heading>
                <Text>{vivaError}</Text>
              </Alert>
            ) : vivaSession && vivaSession.questions.length > 0 ? (
              <VStack align="stretch" spacing={6}>
                <Flex justify="space-between" align="center">
                  <Text color="gray.400" fontWeight="bold">
                    Question {currentQuestionIndex + 1} of {vivaSession.questions.length}
                  </Text>
                  <Progress
                    value={((currentQuestionIndex + 1) / vivaSession.questions.length) * 100}
                    size="xs"
                    colorScheme="cyan"
                    w="150px"
                    borderRadius="full"
                  />
                </Flex>

                <Box p={5} bg="whiteAlpha.100" borderRadius="lg" borderLeft="4px solid" borderColor="cyan.400">
                  <Text fontSize="xl" fontWeight="medium">
                    {vivaSession.questions[currentQuestionIndex].question_text}
                  </Text>
                </Box>

                {vivaSession.questions[currentQuestionIndex].ai_score !== null ? (
                  <VStack align="stretch" spacing={4} p={4} bg="green.900" borderRadius="md" border="1px solid" borderColor="green.500">
                    <Heading size="sm" color="green.300">Evaluation Complete</Heading>
                    <Box>
                      <Text fontWeight="bold" color="gray.300">Your Answer:</Text>
                      <Text fontStyle="italic" color="whiteAlpha.800" mt={1}>
                        {vivaSession.questions[currentQuestionIndex].student_answer}
                      </Text>
                    </Box>
                    <HStack>
                      <Badge
                        colorScheme={
                          vivaSession.questions[currentQuestionIndex].ai_score! >= 7
                            ? 'green'
                            : vivaSession.questions[currentQuestionIndex].ai_score! >= 5
                            ? 'yellow'
                            : 'red'
                        }
                        fontSize="md"
                        p={2}
                        borderRadius="md"
                      >
                        Score: {vivaSession.questions[currentQuestionIndex].ai_score}/10
                      </Badge>
                    </HStack>
                    <Box>
                      <Text fontWeight="bold" color="cyan.300">AI Feedback:</Text>
                      <Text mt={1}>{vivaSession.questions[currentQuestionIndex].ai_feedback}</Text>
                    </Box>
                  </VStack>
                ) : (
                  <VStack align="stretch" spacing={4}>
                    <Text fontWeight="bold" color="cyan.200">Your Answer:</Text>
                    <Textarea
                      value={vivaAnswer}
                      onChange={(e) => setVivaAnswer(e.target.value)}
                      placeholder="Type your detailed answer here..."
                      size="lg"
                      rows={6}
                      bg="blackAlpha.400"
                      borderColor="whiteAlpha.300"
                      _hover={{ borderColor: "cyan.400" }}
                      _focus={{ borderColor: "cyan.300", boxShadow: "0 0 0 1px var(--chakra-colors-cyan-300)" }}
                    />
                    <Button
                      onClick={submitVivaAnswer}
                      isLoading={submittingViva}
                      loadingText="AI is evaluating..."
                      colorScheme="cyan"
                      size="lg"
                      isDisabled={!vivaAnswer.trim()}
                      alignSelf="flex-end"
                    >
                      Submit Answer
                    </Button>
                  </VStack>
                )}
              </VStack>
            ) : (
              <Text>No questions available for this session.</Text>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="whiteAlpha.200">
            {vivaSession && (
              <Flex w="full" justify="space-between">
                <Button onClick={prevQuestion} isDisabled={currentQuestionIndex === 0} variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
                  Previous
                </Button>
                {currentQuestionIndex < vivaSession.questions.length - 1 ? (
                  <Button onClick={nextQuestion} colorScheme="blue" rightIcon={<ArrowRight />}>
                    Next Question
                  </Button>
                ) : (
                  <Button onClick={onVivaClose} colorScheme="green">
                    Finish Session
                  </Button>
                )}
              </Flex>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default StudentDashboard;
