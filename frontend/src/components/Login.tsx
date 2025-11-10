import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  VStack,
  FormControl,
  FormLabel,
  Text,
  useToast,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const MotionBox = motion(Box);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);

interface UserResponse {
  role: "Teacher" | "HOD/Admin" | string;
}

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const tokenResponse = await axios.post(
        "http://127.0.0.1:8000/auth/jwt/create/",
        { username, password }
      );

      const accessToken = tokenResponse.data.access;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", tokenResponse.data.refresh);

      const userResponse = await axios.get<UserResponse>(
        "http://127.0.0.1:8000/auth/users/me/",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const userRole = userResponse.data.role;
      localStorage.setItem("userRole", userRole);
      window.dispatchEvent(new Event("userRoleChange"));

      if (userRole === "Teacher" || userRole === "HOD/Admin") {
        navigate("/teacher-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err) {
      toast({
        title: "Login Failed",
        description: "Invalid username or password. Try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex
      w="100%"
      minH="100vh"
      overflow="hidden"
      position="relative"
      direction={{ base: "column", md: "row" }}
      justify="center"
      align="center"
      bgGradient="linear(to-bl, #060B26, #0A042A)"
      color="white"
    >
      {/* Animated neon glows */}
      <MotionBox
        position="absolute"
        top="-20%"
        left="-10%"
        w="72"
        h="72"
        rounded="full"
        bgGradient="radial(cyan.500, transparent)"
        filter="blur(130px)"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <MotionBox
        position="absolute"
        bottom="-20%"
        right="-10%"
        w="80"
        h="80"
        rounded="full"
        bgGradient="radial(blue.500, transparent)"
        filter="blur(140px)"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* LEFT SIDE — Title / Tagline */}
      <Flex
        flex="1"
        direction="column"
        justify="center"
        align={{ base: "center", md: "flex-start" }}
        px={{ base: 6, md: 16 }}
        textAlign={{ base: "center", md: "left" }}
        zIndex={2}
      >
        <MotionHeading
          size={{ base: "xl", md: "3xl" }}
          fontWeight="extrabold"
          mb={5}
          lineHeight="1.2"
          bgGradient="linear(to-r, cyan.400, blue.400)"
          bgClip="text"
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
        >
          AI-Based College <br /> Project Management
        </MotionHeading>

        <MotionText
          maxW={{ base: "full", md: "lg" }}
          color="gray.300"
          fontSize={{ base: "sm", md: "lg" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          A next-generation platform that merges collaboration, automation, and
          AI intelligence to simplify your academic project journey.
        </MotionText>
      </Flex>

      {/* RIGHT SIDE — Login Box */}
      <Flex
        flex="1"
        justify="center"
        align="center"
        px={{ base: 6, md: 12 }}
        py={{ base: 10, md: 0 }}
        zIndex={2}
      >
        <MotionBox
          bg="rgba(255, 255, 255, 0.05)"
          border="1px solid rgba(255,255,255,0.15)"
          borderRadius="2xl"
          p={{ base: 8, md: 10 }}
          w={{ base: "full", sm: "80%", md: "sm", lg: "md" }}
          boxShadow="0 0 50px rgba(0,255,255,0.15)"
          backdropFilter="blur(20px)"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Heading
            size="md"
            textAlign="center"
            mb={8}
            bgGradient="linear(to-r, cyan.400, blue.300)"
            bgClip="text"
          >
            Welcome Back
          </Heading>

          <VStack as="form" spacing={5} onSubmit={handleLogin}>
            <FormControl id="username" isRequired>
              <FormLabel color="cyan.300" fontWeight="semibold">
                Username
              </FormLabel>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="filled"
                bg="whiteAlpha.100"
                _focus={{
                  borderColor: "cyan.400",
                  boxShadow: "0 0 12px cyan",
                  bg: "whiteAlpha.200",
                }}
              />
            </FormControl>

            <FormControl id="password" isRequired>
              <FormLabel color="cyan.300" fontWeight="semibold">
                Password
              </FormLabel>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                variant="filled"
                bg="whiteAlpha.100"
                _focus={{
                  borderColor: "cyan.400",
                  boxShadow: "0 0 12px cyan",
                  bg: "whiteAlpha.200",
                }}
              />
            </FormControl>

            <Button
              type="submit"
              isLoading={isLoading}
              w="full"
              size="lg"
              mt={4}
              bgGradient="linear(to-r, cyan.500, blue.500)"
              color="white"
              _hover={{
                bgGradient: "linear(to-r, cyan.400, blue.400)",
                boxShadow: "0 0 25px rgba(0,255,255,0.5)",
                transform: "translateY(-2px)",
              }}
              transition="all 0.3s ease"
              borderRadius="xl"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </VStack>
        </MotionBox>
      </Flex>
    </Flex>
  );
};

export default Login;
