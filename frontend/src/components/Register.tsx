import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  VStack,
  Alert,
  AlertIcon,
  Flex,
  Text,
  useToast,
} from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);
const MotionHeading = motion(Heading);

const Register: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await axios.post("http://127.0.0.1:8000/auth/users/", {
        username,
        email,
        password,
        role: "Student",
      });

      toast({
        title: "Registration Successful!",
        description: "Your account has been created. Please log in.",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });

      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data
        ? Object.entries(err.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" | ")
        : "Registration failed. Please check your details.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Neon-glow input style
  const inputStyle = {
    bg: "rgba(255,255,255,0.05)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "md",
    _hover: {
      bg: "rgba(255,255,255,0.1)",
      borderColor: "cyan.400",
      boxShadow: "0 0 10px rgba(0,255,255,0.6)",
    },
    _focus: {
      bg: "rgba(255,255,255,0.1)",
      borderColor: "cyan.400",
      boxShadow: "0 0 15px rgba(0,255,255,0.9)",
    },
  };

  return (
    <Flex
      w="100%"
      minH="100vh"
      overflow="hidden"
      position="relative"
      align="center"
      justify="center"
      bgGradient="linear(to-bl, #060B26, #0A042A)"
      color="white"
    >
      {/* Animated Background Glows */}
      <motion.div
        style={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,255,0.4), transparent)",
          filter: "blur(130px)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,150,255,0.4), transparent)",
          filter: "blur(140px)",
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Registration Card */}
      <MotionBox
        bg="rgba(255,255,255,0.05)"
        border="1px solid rgba(255,255,255,0.15)"
        borderRadius="2xl"
        p={{ base: 8, md: 10 }}
        w={{ base: "90%", sm: "400px", md: "450px" }}
        boxShadow="0 0 40px rgba(0,255,255,0.1)"
        backdropFilter="blur(20px)"
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8 }}
        zIndex={2}
      >
        <MotionHeading
          size="lg"
          textAlign="center"
          mb={6}
          bgGradient="linear(to-r, cyan.400, blue.300)"
          bgClip="text"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Create Your Account
        </MotionHeading>

        {error && (
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleRegister}>
          <VStack spacing={5} align="stretch">
            <FormControl id="username" isRequired>
              <FormLabel color="cyan.300" fontWeight="bold">
                Full Name
              </FormLabel>
              <Input
                type="text"
                placeholder="John Doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                size="lg"
                {...inputStyle}
              />
            </FormControl>

            <FormControl id="email" isRequired>
              <FormLabel color="cyan.300" fontWeight="bold">
                Email Address
              </FormLabel>
              <Input
                type="email"
                placeholder="user@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="lg"
                {...inputStyle}
              />
            </FormControl>

            <FormControl id="password" isRequired>
              <FormLabel color="cyan.300" fontWeight="bold">
                Password
              </FormLabel>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="lg"
                {...inputStyle}
              />
            </FormControl>

            <Button
              type="submit"
              size="lg"
              mt={2}
              isLoading={loading}
              loadingText="Creating..."
              bgGradient="linear(to-r, cyan.500, blue.500)"
              color="white"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "0 0 25px rgba(0,255,255,0.6)",
                bgGradient: "linear(to-r, cyan.400, blue.400)",
              }}
              borderRadius="xl"
              transition="all 0.3s ease"
              shadow="md"
            >
              Register
            </Button>
          </VStack>
        </form>

        <Text
          fontSize="sm"
          textAlign="center"
          color="gray.400"
          pt={4}
          mt={2}
        >
          Already have an account?{" "}
          <RouterLink
            to="/"
            style={{
              color: "#00ffff",
              fontWeight: "bold",
              textShadow: "0 0 10px rgba(0,255,255,0.5)",
            }}
          >
            Sign In
          </RouterLink>
        </Text>
      </MotionBox>
    </Flex>
  );
};

export default Register;
