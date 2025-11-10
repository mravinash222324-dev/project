// frontend/src/components/AIChatbot.tsx
// THIS CODE IS CLEANED UP AND READY.
// Backend contract unchanged.

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

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

// --- Chat Message Component (Redesigned) ---
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
const AIChatbot: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

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

      // Smart AIChatbotView
      const response = await axios.post(
        'http://127.0.0.1:8000/ai/chat/',
        { prompt: userMessage.text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage: Message = { sender: 'ai', text: response.data.response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      toast({
        title: 'AI Connection Failed',
        description: 'Could not get a response from the server.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      // Remove the just-added user message on failure (optional)
      setMessages((prev) => prev.slice(0, prev.length - 1));
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
      <MotionBox
        position="absolute"
        top="-15%"
        left="-10%"
        w="80"
        h="80"
        rounded="full"
        bgGradient="radial(cyan.700, transparent)"
        filter="blur(200px)"
        opacity={0.3}
        zIndex={-1}
      />
      <MotionBox
        position="absolute"
        bottom="-15%"
        right="-10%"
        w="96"
        h="96"
        rounded="full"
        bgGradient="radial(blue.700, transparent)"
        filter="blur(200px)"
        opacity={0.3}
        zIndex={-1}
      />

      <Container maxW="4xl" h="100%" py={{ base: 4, md: 6 }}>
        <Flex
          direction="column"
          h="100%"
          bg="rgba(10, 15, 40, 0.6)"
          border="1px solid rgba(255, 255, 255, 0.1)"
          borderRadius={{ base: '2xl', md: '3xl' }}
          boxShadow="0 0 80px rgba(0, 255, 255, 0.1)"
          backdropFilter="blur(20px)"
        >
          {/* Header */}
          <Box p={6} borderBottom="1px solid" borderColor="rgba(255, 255, 255, 0.15)">
            <Heading as="h1" size="lg" textAlign="center" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text">
              AI Technical Assistant
            </Heading>
          </Box>

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
            {messages.length === 0 ? (
              <Center h="100%" flexDirection="column" p={10} textAlign="center" color="gray.300">
                <Text mb={2}>
                  Note: This is the context-aware chat.
                </Text>
                <Text>
                  If you are logged in as a <b>Teacher</b>, you can ask about specific projects or students
                  (e.g., “What is Avinash&apos;s project progress?”).
                </Text>
                <Text mt={2}>
                  If you are a <b>Student</b>, this will act as a general-purpose AI assistant.
                </Text>
              </Center>
            ) : (
              messages.map((msg, index) => <ChatMessage key={index} message={msg} />)
            )}

            {loading && (
              <HStack alignSelf="flex-start" spacing={3} p={2}>
                <Spinner size="sm" />
                <Text>Thinking…</Text>
              </HStack>
            )}

            <div ref={messagesEndRef} />
          </VStack>

          {/* Composer */}
          <Box as="form" onSubmit={handleSendMessage} p={4} borderTop="1px solid" borderColor="rgba(255,255,255,0.15)">
            <InputGroup size="lg">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about code, projects, or students..."
                bg="rgba(0,0,0,0.2)"
                _hover={{ borderColor: 'cyan.400' }}
                _focus={{ borderColor: 'cyan.300', boxShadow: '0 0 15px rgba(0,255,255,0.3)' }}
                isDisabled={loading}
                transition="all 0.2s ease"
                pr="4rem" // space for the button
              />
              <InputRightElement width="3.5rem">
                <IconButton
                  aria-label="Send Message"
                  type="submit"
                  icon={<Send size={20} />}
                  colorScheme="cyan"
                  variant="ghost"
                  isRound
                  isDisabled={!prompt.trim() || loading}
                />
              </InputRightElement>
            </InputGroup>
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
};

export default AIChatbot;
