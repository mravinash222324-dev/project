// frontend/src/components/AIVivaSimulation.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Button,
  Text,
  Spinner,
  Center,
  useToast,
  Container,
  Textarea,
  Progress,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { RefreshCw, Zap, ArrowLeft } from 'lucide-react';

// Motion components
const MotionBox = motion(Box);

// Animation variants
const mainContainerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// --- NEW INTERFACES TO MATCH BACKEND ---
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

const AIVivaSimulation: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const submissionIdStr = projectId;

  // State for the full session data
  const [vivaSession, setVivaSession] = useState<VivaSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [projectProgress, setProjectProgress] = useState(0);
  const [actualProjectId, setActualProjectId] = useState<number | null>(null);

  const navigate = useNavigate();
  const toast = useToast();

  // --- 1. Fetch Project Details & Start Session ---
  useEffect(() => {
    const initSession = async () => {
      if (!submissionIdStr) {
        setError('Submission ID is missing from URL.');
        setIsLoadingSession(false);
        return;
      }

      setIsLoadingSession(true);
      setError('');

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }

        // Treat route param as project_id
        const projId = parseInt(submissionIdStr);
        setActualProjectId(projId);

        // Progress
        const progressResponse = await axios.get(`http://127.0.0.1:8000/projects/progress/${projId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProjectProgress(progressResponse.data.progress_percentage || 0);

        // Start Viva
        const sessionResponse = await axios.post('http://127.0.0.1:8000/ai/viva/', {
          project_id: projId,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setVivaSession(sessionResponse.data);
        setCurrentQuestionIndex(0);

      } catch (err: any) {
        console.error(err);
        const errMsg = err.response?.data?.error || 'Failed to start Viva session.';
        setError(errMsg);
        toast({ title: 'Error', description: errMsg, status: 'error', duration: 5000, isClosable: true });
      } finally {
        setIsLoadingSession(false);
      }
    };

    initSession();
  }, [submissionIdStr, navigate, toast]);

  // --- 2. Handle Answer Evaluation ---
  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vivaSession || !currentAnswer.trim()) return;

    const questionToEvaluate = vivaSession.questions[currentQuestionIndex];

    setIsEvaluating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('http://127.0.0.1:8000/ai/viva/evaluate/', {
        question_id: questionToEvaluate.id,
        answer: currentAnswer,
      }, {
        headers: { Authorization: { toString: () => `Bearer ${token}` } as any }, // keep standard if your setup needs plain string
      });

      const updatedQuestion = response.data;
      setVivaSession(prev => {
        if (!prev) return null;
        const updatedQuestions = [...prev.questions];
        updatedQuestions[currentQuestionIndex] = updatedQuestion;
        return { ...prev, questions: updatedQuestions };
      });

    } catch (err) {
      console.error(err);
      toast({ title: 'Evaluation Failed', description: 'Could not submit answer. Try again.', status: 'error' });
    } finally {
      setIsEvaluating(false);
    }
  };

  // --- Navigation Helpers ---
  const handleNextQuestion = () => {
    if (vivaSession && currentQuestionIndex < vivaSession.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      const nextQ = vivaSession.questions[currentQuestionIndex + 1];
      setCurrentAnswer(nextQ.student_answer || '');
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      if (vivaSession) {
        setCurrentAnswer(vivaSession.questions[currentQuestionIndex - 1].student_answer || '');
      }
    }
  };

  // Current question helpers
  const currentQ = vivaSession?.questions[currentQuestionIndex];
  const isLastQuestion = vivaSession ? currentQuestionIndex >= vivaSession.questions.length - 1 : false;
  const isEvaluated = currentQ?.ai_score !== null && currentQ?.ai_score !== undefined;

  // --- Main Render ---
  return (
    <Flex w="100%" minH="calc(100vh - 72px)" justify="center" align="center" bgGradient="linear(to-bl, #060B26, #0A042A)" color="white" position="relative" overflow="hidden">
      {/* Background Glows */}
      <MotionBox position="fixed" top="0" left="0" w="72" h="72" rounded="full" bgGradient="radial(cyan.600, transparent)" filter="blur(180px)" opacity={0.25} zIndex={0} />
      <MotionBox position="fixed" bottom="0" right="0" w="80" h="80" rounded="full" bgGradient="radial(blue.600, transparent)" filter="blur(180px)" opacity={0.25} zIndex={0} />

      <Container maxW="4xl" zIndex={2} py={{ base: 8, md: 12 }}>
        <MotionBox
          variants={mainContainerVariants}
          initial="hidden"
          animate="visible"
          bg="rgba(10, 15, 40, 0.6)"
          border="1px solid rgba(255, 255, 255, 0.1)"
          borderRadius="3xl"
          boxShadow="0 0 80px rgba(0, 255, 255, 0.1)"
          backdropFilter="blur(20px)"
          p={{ base: 6, md: 10 }}
        >
          {/* Header */}
          <HStack justifyContent="space-between" align="center" borderBottom="1px solid" borderColor="rgba(255,255,255,0.2)" pb={4} mb={6}>
            <HStack>
              <Button onClick={() => navigate(-1)} variant="ghost" size="sm" leftIcon={<ArrowLeft />} color="gray.400" _hover={{ color: "white", bg: "whiteAlpha.200" }}>
                Back
              </Button>
              <Heading as="h1" size="lg" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text">
                AI Viva Simulation
              </Heading>
            </HStack>
            {actualProjectId && <Badge colorScheme="cyan" variant="outline">Project ID: {actualProjectId}</Badge>}
          </HStack>

          {/* Loading State */}
          {isLoadingSession && (
            <Center py={20} flexDirection="column">
              <Spinner size="xl" color="cyan.400" thickness="4px" />
              {/* ✅ Use motion.div around Text to avoid prop-type clashes */}
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <Text mt={4} color="gray.300">
                  AI Examiner is preparing your session...
                </Text>
              </motion.div>
            </Center>
          )}

          {/* Error State */}
          {error && !isLoadingSession && (
            <Center py={20} flexDirection="column">
              <Text fontSize="xl" color="red.400" mb={4}>{error}</Text>
              <Button variant="outline" colorScheme="cyan" onClick={() => navigate(-1)}>Return to Dashboard</Button>
            </Center>
          )}

          {/* Main Viva Content */}
          {!isLoadingSession && !error && vivaSession && currentQ && (
            <VStack spacing={6} align="stretch">
              {/* Progress Bar */}
              <HStack spacing={4}>
                <Text color="gray.400" fontSize="sm" whiteSpace="nowrap">
                  Question {currentQuestionIndex + 1} of {vivaSession.questions.length}
                </Text>
                <Progress value={((currentQuestionIndex + 1) / vivaSession.questions.length) * 100} size="xs" colorScheme="cyan" w="full" borderRadius="full" />
              </HStack>

              {/* Question Box */}
              <MotionBox key={currentQ.id} variants={contentVariants} initial="hidden" animate="visible">
                <VStack bg="rgba(0, 255, 255, 0.05)" p={6} borderRadius="xl" border="1px solid" borderColor="rgba(0, 255, 255, 0.2)" align="stretch">
                  <HStack justifyContent="space-between">
                    <Text fontSize="md" fontWeight="bold" color="cyan.300">CURRENT QUESTION</Text>
                    <Zap size={20} color="#99f6e4" />
                  </HStack>
                  <Text fontSize={{ base: 'lg', md: 'xl' }} color="white" pt={2}>
                    {currentQ.question_text}
                  </Text>
                </VStack>
              </MotionBox>

              {/* Answer Area - Swaps between Input and Result based on isEvaluated */}
              {!isEvaluated ? (
                // --- INPUT STATE ---
                <Box as="form" onSubmit={handleEvaluateAnswer}>
                  <VStack spacing={4} align="stretch">
                    <Textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      rows={6}
                      placeholder="Type your detailed technical answer here..."
                      bg="rgba(10, 20, 50, 0.5)"
                      color="white"
                      borderColor="rgba(255, 255, 255, 0.2)"
                      borderRadius="lg"
                      _hover={{ borderColor: 'cyan.400' }}
                      _focus={{ borderColor: 'cyan.300', boxShadow: '0 0 15px rgba(0,255,255,0.3)', bg: "rgba(10, 20, 50, 0.8)" }}
                      isDisabled={isEvaluating}
                    />
                    <HStack justify="space-between">
                      <Button onClick={handlePrevQuestion} isDisabled={currentQuestionIndex === 0 || isEvaluating} variant="ghost" color="gray.400">
                        Previous
                      </Button>
                      <Button
                        type="submit"
                        bgGradient="linear(to-r, cyan.500, blue.500)"
                        color="white"
                        isLoading={isEvaluating}
                        loadingText="Evaluating..."
                        isDisabled={!currentAnswer.trim()}
                        leftIcon={<Zap size={18} />}
                        _hover={{ bgGradient: "linear(to-r, cyan.400, blue.400)", boxShadow: "0 0 25px rgba(0,255,255,0.4)" }}
                      >
                        Submit Answer
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              ) : (
                // --- EVALUATED STATE ---
                <MotionBox variants={contentVariants} initial="hidden" animate="visible">
                  <VStack spacing={4} align="stretch" p={6} bg="rgba(79, 70, 229, 0.1)" borderRadius="xl" border="1px solid" borderColor="rgba(129, 140, 248, 0.3)">
                    <HStack justify="space-between">
                      <Heading size="md" color="indigo.300">Evaluation Result</Heading>
                      <Badge colorScheme={currentQ.ai_score! >= 7 ? 'green' : currentQ.ai_score! >= 5 ? 'yellow' : 'red'} fontSize="md" px={3} py={1} borderRadius="md">
                        Score: {currentQ.ai_score}/10
                      </Badge>
                    </HStack>

                    <Box>
                      <Text fontWeight="bold" color="gray.400" fontSize="sm" mb={1}>YOUR ANSWER:</Text>
                      <Text color="whiteAlpha.800" fontStyle="italic" bg="blackAlpha.300" p={3} borderRadius="md">
                        "{currentQ.student_answer}"
                      </Text>
                    </Box>

                    <Box>
                      <Text fontWeight="bold" color="cyan.300" fontSize="sm" mb={1}>AI FEEDBACK:</Text>
                      <Text color="white" lineHeight="1.7">
                        {currentQ.ai_feedback}
                      </Text>
                    </Box>

                    <HStack justify="space-between" pt={4}>
                      <Button onClick={handlePrevQuestion} isDisabled={currentQuestionIndex === 0} variant="ghost" color="gray.400" _hover={{ color: "white", bg: "whiteAlpha.200" }}>
                        Previous Question
                      </Button>
                      {isLastQuestion ? (
                        <Button colorScheme="green" onClick={() => navigate(-1)} size="lg" _hover={{ transform: 'scale(1.05)' }}>
                          Finish Session
                        </Button>
                      ) : (
                        <Button onClick={handleNextQuestion} rightIcon={<RefreshCw size={16} />} colorScheme="blue" variant="outline" _hover={{ bg: 'whiteAlpha.100' }}>
                          Next Question
                        </Button>
                      )}
                    </HStack>
                  </VStack>
                </MotionBox>
              )}

            </VStack>
          )}
        </MotionBox>
      </Container>
    </Flex>
  );
};

export default AIVivaSimulation;
