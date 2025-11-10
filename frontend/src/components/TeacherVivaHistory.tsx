// frontend/src/components/TeacherVivaHistory.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Container,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  HStack,
  Button,
  Divider,
  Flex,
} from '@chakra-ui/react';
import { ArrowLeft, Calendar, User } from 'lucide-react';

// --- Interfaces matching Django Serializers ---
interface VivaQuestion {
  id: number;
  question_text: string;
  student_answer: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
}

interface VivaSession {
  id: number;
  student_name: string;
  created_at: string;
  questions: VivaQuestion[];
}

const TeacherVivaHistory: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [sessions, setSessions] = useState<VivaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
           navigate('/');
           return;
        }
        // Use the new endpoint we created
        const response = await axios.get(`http://127.0.0.1:8000/teacher/projects/${projectId}/viva-history/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSessions(response.data);
      } catch (err) {
        setError('Failed to load viva history.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
        fetchHistory();
    }
  }, [projectId, navigate]);

  const getScoreColor = (score: number | null) => {
      if (score === null) return 'gray';
      if (score >= 7) return 'green';
      if (score >= 5) return 'yellow';
      return 'red';
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-bl, #060B26, #0A042A)" color="white">
        <Spinner size="xl" color="cyan.400" thickness="4px" />
        <Text ml={4} fontSize="xl">Loading History...</Text>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bgGradient="linear(to-bl, #060B26, #0A042A)" color="white" py={8}>
      <Container maxW="container.xl">
        <Button onClick={() => navigate(-1)} leftIcon={<ArrowLeft />} variant="ghost" color="cyan.300" mb={6} _hover={{ bg: 'whiteAlpha.100' }}>
          Back to Dashboard
        </Button>
        
        <Heading mb={8} bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text">
          Viva Examination History (Project ID: {projectId})
        </Heading>

        {error && (
          <Alert status="error" bg="red.900" color="red.200" borderRadius="md" mb={6}>
            <AlertIcon color="red.200" /> {error}
          </Alert>
        )}

        {sessions.length === 0 && !error ? (
          <Text color="gray.400" fontSize="lg" textAlign="center" py={10} border="1px dashed" borderColor="gray.600" borderRadius="md">
            No viva sessions have been recorded for this project yet.
          </Text>
        ) : (
          <Accordion allowMultiple defaultIndex={[0]}>
            {sessions.map((session) => (
              <AccordionItem key={session.id} border="1px solid" borderColor="whiteAlpha.200" borderRadius="lg" mb={4} bg="rgba(255,255,255,0.05)">
                <h2>
                  <AccordionButton _expanded={{ bg: 'whiteAlpha.100', color: 'cyan.300' }}>
                    <Box flex="1" textAlign="left">
                      <HStack spacing={6}>
                        <HStack color={session.questions.length > 0 ? "cyan.300" : "gray.400"}>
                             <Calendar size={18} />
                             <Text fontWeight="bold">
                                 {new Date(session.created_at).toLocaleString()}
                             </Text>
                        </HStack>
                        <HStack color="gray.300">
                            <User size={18} />
                            <Text>{session.student_name}</Text>
                        </HStack>
                        <Badge colorScheme="purple" variant="solid" borderRadius="full" px={3}>
                            {session.questions.length} Questions
                        </Badge>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4} px={6}>
                    <VStack spacing={6} align="stretch" mt={4}>
                        {session.questions.map((q, index) => (
                            <Box key={q.id} p={4} bg="blackAlpha.300" borderRadius="md" borderLeft="4px solid" borderColor={getScoreColor(q.ai_score) + ".400"}>
                                <Heading size="sm" color="gray.200" mb={2}>Question {index + 1}</Heading>
                                <Text fontSize="md" fontWeight="medium" mb={4}>{q.question_text}</Text>
                                
                                <Divider borderColor="whiteAlpha.200" mb={4} />
                                
                                <Text fontSize="sm" fontWeight="bold" color="cyan.500" mb={1}>STUDENT ANSWER:</Text>
                                <Text color="whiteAlpha.800" fontStyle={q.student_answer ? "normal" : "italic"} mb={4} pl={4} borderLeft="2px solid" borderColor="whiteAlpha.200">
                                    {q.student_answer || "No answer recorded."}
                                </Text>

                                {q.ai_score !== null && (
                                    <>
                                        <HStack mb={2}>
                                            <Text fontSize="sm" fontWeight="bold" color="purple.300">AI EVALUATION:</Text>
                                            <Badge colorScheme={getScoreColor(q.ai_score)} variant="solid">
                                                Score: {q.ai_score}/10
                                            </Badge>
                                        </HStack>
                                        <Text color="gray.300" bg="whiteAlpha.100" p={3} borderRadius="md" fontSize="sm">
                                            {q.ai_feedback}
                                        </Text>
                                    </>
                                )}
                            </Box>
                        ))}
                    </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Container>
    </Box>
  );
};

export default TeacherVivaHistory;