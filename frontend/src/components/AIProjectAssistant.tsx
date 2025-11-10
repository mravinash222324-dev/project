// frontend/src/components/AIProjectAssistant.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Input,
  Text,
  Spinner,
  Center,
  useToast,
  IconButton,
  InputGroup,
  InputRightElement,
  Container,
  Flex,
  Button,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Send, ArrowLeft, Bot } from 'lucide-react';

// --- Interfaces & Animation Variants ---
interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const messageVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const MotionBox = motion(Box);

// --- Chat Message Component ---
const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.sender === 'user';
  return (
    <MotionBox
      initial="hidden"
      animate="visible"
      variants={messageVariants}
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxW={{ base: '90%', md: '75%' }}
    >
      <Box
        bg={isUser ? 'rgba(0, 255, 255, 0.1)' : 'rgba(79, 70, 229, 0.1)'}
        color="white"
        px={4}
        py={2}
        borderRadius="xl"
        border="1px solid"
        borderColor={isUser ? 'rgba(0, 255, 255, 0.2)' : 'rgba(129, 140, 248, 0.2)'}
      >
        <Text whiteSpace="pre-wrap" wordBreak="break-word">
          {message.text}
        </Text>
      </Box>
    </MotionBox>
  );
};

// --- Main Chatbot Component ---
const AIProjectAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { projectId } = useParams<{ projectId: string }>(); // Get project ID from URL

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  // Set initial welcome message
  useEffect(() => {
    setMessages([
      { sender: 'ai', text: `I am ready to answer questions about Project ID: ${projectId}. \n\nAsk me about this project's status, viva scores, or student details.` }
    ]);
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading || !projectId) return;

    setLoading(true);
    const userMessage: Message = { sender: 'user', text: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/');
        return;
      }

      // Use the NEW project-inquiry endpoint
      const response = await axios.post(
        'http://127.0.0.1:8000/ai/project-inquiry/',
        { 
          prompt: userMessage.text,
          project_id: projectId // Send the project ID
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage: Message = { sender: 'ai', text: response.data.response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      const errorText = err.response?.data?.error || 'Could not get a response from the server.';
      toast({
        title: 'AI Connection Failed',
        description: errorText,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      // Add error message to chat
      setMessages(prev => [...prev, {sender: 'ai', text: `Sorry, I encountered an error: ${errorText}`}]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      w="100%"
      h="calc(100vh - 72px)" // Assumes 72px navbar height
      position="relative"
      justify="center"
      align="center"
      color="white"
    >
      {/* Background Glows */}
      <MotionBox position="absolute" top="-15%" left="-10%" w="80" h="80" rounded="full" bgGradient="radial(purple.700, transparent)" filter="blur(200px)" opacity={0.3} zIndex={-1} />
      <MotionBox position="absolute" bottom="-15%" right="-10%" w="96" h="96" rounded="full" bgGradient="radial(pink.700, transparent)" filter="blur(200px)" opacity={0.3} zIndex={-1} />

      <Container maxW="4xl" h="100%" py={{ base: 4, md: 6 }}>
        <Flex
          direction="column"
          h="100%" 
          bg="rgba(10, 15, 40, 0.6)"
          border="1px solid rgba(255, 255, 255, 0.1)"
          borderRadius={{ base: '2xl', md: '3xl' }}
          boxShadow="0 0 80px rgba(128, 90, 213, 0.1)"
          backdropFilter="blur(20px)"
        >
          {/* Header */}
          <Flex p={4} borderBottom="1px solid" borderColor="rgba(255, 255, 255, 0.15)" align="center" justify="space-between">
            <Button onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={18} />} variant="ghost" color="gray.300" _hover={{ bg: 'whiteAlpha.100' }}>
              Back
            </Button>
            <Heading as="h1" size="lg" textAlign="center" bgGradient="linear(to-r, purple.300, pink.300)" bgClip="text">
              <HStack justify="center">
                <Bot /> <Text>Project AI Assistant</Text>
              </HStack>
            </Heading>
            <Box w="80px" /> {/* Spacer */}
          </Flex>

          {/* Chat Window */}
          <VStack
            flex="1"
            spacing={5}
            p={6}
            overflowY="auto"
            sx={{
              '&::-webkit-scrollbar': { width: '4px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.2)', borderRadius: '24px' },
            }}
          >
            {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
            {loading && (
              <HStack alignSelf="flex-start" spacing={3} p={2}>
                <Spinner size="sm" color="purple.300" />
                <Text color="gray.400" fontStyle="italic">AI is analyzing project data...</Text>
              </HStack>
            )}
            <div ref={messagesEndRef} />
          </VStack>

          {/* Input Form */}
          <Box as="form" onSubmit={handleSendMessage} p={6} borderTop="1px solid" borderColor="rgba(255, 255, 255, 0.15)">
            <InputGroup size="lg">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Ask about Project ${projectId}...`}
                bg="rgba(0,0,0,0.2)"
                color="white"
                borderColor="rgba(255,255,255,0.2)"
                borderRadius="xl"
                _placeholder={{ color: 'gray.400' }}
                _hover={{ borderColor: 'purple.400' }}
                _focus={{ borderColor: 'purple.300', boxShadow: '0 0 15px rgba(128, 90, 213, 0.3)' }}
                isDisabled={loading}
                transition="all 0.2s ease"
              />
              <InputRightElement>
                <IconButton
                  type="submit"
                  icon={<Send size={20} />}
                  colorScheme="purple"
                  variant="ghost"
                  isRound
                  isLoading={loading}
                  isDisabled={!prompt.trim()}
                  aria-label="Send Message"
                  _hover={{ bg: "rgba(128, 90, 213, 0.2)" }}
                />
              </InputRightElement>
            </InputGroup>
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
};

export default AIProjectAssistant;