// frontend/src/components/TeacherProgressLog.tsx
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
  Button,
  Divider,
  Flex,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { ArrowLeft, Calendar, BarChart } from 'lucide-react';

// --- Interface for the new model ---
interface ProgressUpdate {
  id: number;
  author_username: string;
  update_text: string;
  ai_suggested_percentage: number;
  created_at: string;
}

const TeacherProgressLog: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [logs, setLogs] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        
        // Fetch from our new endpoint
        const response = await axios.get(
          `http://127.0.0.1:8000/projects/${projectId}/progress-logs/`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLogs(response.data);
      } catch (err) {
        setError('Failed to load progress logs.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
        fetchLogs();
    }
  }, [projectId, navigate]);


  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-bl, #060B26, #0A042A)" color="white">
        <Spinner size="xl" color="cyan.400" thickness="4px" />
        <Text ml={4} fontSize="xl">Loading Progress History...</Text>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bgGradient="linear(to-bl, #060B26, #0A042A)" color="white" py={8}>
      <Container maxW="container.lg">
        <Button onClick={() => navigate(-1)} leftIcon={<ArrowLeft />} variant="ghost" color="cyan.300" mb={6} _hover={{ bg: 'whiteAlpha.100' }}>
          Back to Projects
        </Button>
        
        <Heading mb={8} bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text">
          Progress Log (Project ID: {projectId})
        </Heading>

        {error && (
          <Alert status="error" bg="red.900" color="red.200" borderRadius="md" mb={6}>
            <AlertIcon color="red.200" /> {error}
          </Alert>
        )}

        {logs.length === 0 && !error ? (
          <Text color="gray.400" fontSize="lg" textAlign="center" py={10} border="1px dashed" borderColor="gray.600" borderRadius="md">
            No progress logs have been submitted for this project yet.
          </Text>
        ) : (
          <VStack spacing={6} align="stretch">
            {logs.map((log) => (
              <Box key={log.id} p={5} bg="rgba(255,255,255,0.05)" border="1px solid" borderColor="whiteAlpha.200" borderRadius="lg">
                <Flex justify="space-between" align="center" mb={3}>
                  <HStack color="cyan.300">
                    <Calendar size={18} />
                    <Text fontWeight="bold">{new Date(log.created_at).toLocaleString()}</Text>
                  </HStack>
                  <Badge colorScheme="green" variant="solid" fontSize="md" px={3} py={1} borderRadius="md">
                    AI Progress: {log.ai_suggested_percentage}%
                  </Badge>
                </Flex>
                
                <Divider borderColor="whiteAlpha.200" my={3} />
                
                <Text fontWeight="bold" color="gray.300" mb={2}>Student's Update:</Text>
                <Text color="white" whiteSpace="pre-wrap" p={4} bg="blackAlpha.300" borderRadius="md">
                  {log.update_text}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Container>
    </Box>
  );
};

export default TeacherProgressLog;