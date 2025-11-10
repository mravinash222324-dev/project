import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  Input,
  Textarea,
  Button,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  Text,
  useToast,
  Flex,
  Container,
  HStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FileText, Mic, Send, AlertTriangle } from 'lucide-react';

const MotionBox = motion(Box);

// --- Main Component ---
const ProjectSubmission: React.FC = () => {
  const [title, setTitle] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [abstractFile, setAbstractFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [similarProject, setSimilarProject] = useState<any>(null);

  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmissionError('');
    setSimilarProject(null);

    if (!title.trim() || !abstractText.trim()) {
      setError('Project Title and Abstract Text are required.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('abstract_text', abstractText);
    if (abstractFile) formData.append('abstract_file', abstractFile);
    if (audioFile) formData.append('audio_file', audioFile);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/');
        return;
      }

      await axios.post('http://127.0.0.1:8000/projects/submit/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      toast({
        title: 'Submission Successful!',
        description: 'Your project has been sent for review.',
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top',
      });
      setTimeout(() => navigate('/student-dashboard'), 2000);
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        const responseData = err.response.data;
        setSubmissionError(responseData.detail || 'High similarity detected with an existing project.');
        if (responseData.similar_project) setSimilarProject(responseData.similar_project);
      } else {
        setError('Submission failed. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyles = {
    bg: "rgba(0,0,0,0.2)",
    color: "white",
    borderColor: "rgba(255,255,255,0.2)",
    _hover: { borderColor: 'cyan.400' },
    _focus: { borderColor: 'cyan.300', boxShadow: '0 0 15px rgba(0,255,255,0.3)' },
  };

  return (
    <Flex
      w="100%"
      h="calc(100vh - 72px)"
      justify="center"
      align="center"
      position="relative"
      color="white"
    >
      <MotionBox position="absolute" top="0" left="0" w="80" h="80" rounded="full" bgGradient="radial(cyan.800, transparent)" filter="blur(200px)" opacity={0.2} zIndex={-1} />
      <MotionBox position="absolute" bottom="0" right="0" w="96" h="96" rounded="full" bgGradient="radial(blue.800, transparent)" filter="blur(200px)" opacity={0.2} zIndex={-1} />
      
      <Container maxW="container.md" h="100%" overflowY="auto" py={{ base: 6, md: 8 }} 
        sx={{
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.2)', borderRadius: '24px' },
        }}>
        <MotionBox
          bg="rgba(10, 15, 40, 0.6)"
          border="1px solid rgba(255, 255, 255, 0.1)"
          borderRadius="3xl"
          boxShadow="0 0 80px rgba(0, 255, 255, 0.1)"
          backdropFilter="blur(20px)"
          p={{ base: 6, md: 10 }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <VStack as="form" onSubmit={handleSubmit} spacing={6} align="stretch">
            <Heading as="h1" size="xl" textAlign="center" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text" fontWeight="extrabold">
              Submit New Project Idea
            </Heading>

            {error && (
              <Alert status="error" borderRadius="lg" bg="rgba(255,0,0,0.1)" border="1px solid rgba(255,0,0,0.3)">
                <AlertIcon color="red.300"/>{error}
              </Alert>
            )}

            {submissionError && (
              <Box border="1px solid" borderColor="red.400" borderRadius="xl" p={4} bg="rgba(255,0,0,0.1)" boxShadow="0 0 15px rgba(255,0,0,0.4)">
                <HStack mb={2}>
                  <AlertTriangle color="#f97373" />
                  <Heading size="md" color="red.300">Submission Blocked</Heading>
                </HStack>
                <Text color="white">{submissionError}</Text>
                {similarProject && (
                  <Box mt={3} p={3} bg="rgba(0,0,0,0.3)" borderRadius="md">
                    <Text color="gray.300" fontWeight="bold">Most Similar Project:</Text>
                    <Text color="white" mt={1}><strong>Title:</strong> {similarProject.title}</Text>
                    <Text color="gray.400" noOfLines={2}><strong>Abstract:</strong> "{similarProject.abstract_text}"</Text>
                  </Box>
                )}
              </Box>
            )}

            <FormControl isRequired>
              <FormLabel color="cyan.200">Project Title</FormLabel>
              <Input placeholder="e.g., AI-Powered Project Management System" value={title} onChange={(e) => setTitle(e.target.value)} {...inputStyles} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="cyan.200">Abstract (Text)</FormLabel>
              <Textarea placeholder="Describe your project's goals, methods, and technologies..." rows={6} value={abstractText} onChange={(e) => setAbstractText(e.target.value)} {...inputStyles} />
            </FormControl>

            <FormControl>
              <FormLabel color="cyan.200">Upload Abstract (PDF)</FormLabel>
              <HStack>
                <FileText size={20} />
                <Input type="file" name="abstract_file" accept=".pdf" onChange={(e) => setAbstractFile(e.target.files ? e.target.files[0] : null)} p={1.5} {...inputStyles} />
              </HStack>
            </FormControl>

            <FormControl>
              <FormLabel color="cyan.200">Upload Audio Summary (MP3, WAV)</FormLabel>
              <HStack>
                <Mic size={20} />
                <Input type="file" name="audio_file" accept=".mp3,.wav" onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)} p={1.5} {...inputStyles} />
              </HStack>
            </FormControl>

            <Button
              type="submit"
              size="lg"
              mt={4}
              isLoading={isSubmitting}
              loadingText="Analyzing & Submitting..."
              bgGradient="linear(to-r, cyan.500, blue.500)"
              color="white"
              leftIcon={<Send size={18} />}
              _hover={{
                bgGradient: "linear(to-r, cyan.400, blue.400)",
                boxShadow: "0 0 25px rgba(0,255,255,0.4)",
                transform: 'translateY(-2px)'
              }}
              transition="all 0.3s ease"
            >
              Submit Idea
            </Button>
          </VStack>
        </MotionBox>
      </Container>
    </Flex>
  );
};

export default ProjectSubmission;