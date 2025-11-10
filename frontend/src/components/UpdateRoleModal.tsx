// frontend/src/components/UpdateRoleModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Select,
  useToast,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import axios from 'axios';

// Define a type for the User object
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface UpdateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null; // The user being edited
  onUserUpdated: (updatedUser: User) => void; // Callback to update the list
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UpdateRoleModal: React.FC<UpdateRoleModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}) => {
  const [newRole, setNewRole] = useState(user?.role || 'Student');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Update local state if the user prop changes
  useEffect(() => {
    if (user) {
      setNewRole(user.role);
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await axios.patch(
        `${API_URL}/admin/dashboard/users/${user.id}/update-role/`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      onUserUpdated(response.data); // Pass updated user back to parent
      toast({
        title: 'Role Updated',
        description: `${user.username}'s role updated to ${newRole}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>Update Role for {user.username}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>User Role</FormLabel>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              bg="gray.700"
              borderColor="gray.600"
            >
              <option style={{ color: 'black' }} value="Student">Student</option>
              <option style={{ color: 'black' }} value="Teacher">Teacher</option>
              <option style={{ color: 'black' }} value="HOD/Admin">HOD/Admin</option>
            </Select>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Save Role
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpdateRoleModal;