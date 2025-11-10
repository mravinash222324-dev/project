// frontend/src/components/ManageGroupModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useToast,
  Box,
  Heading,
  VStack,
  Text,
  IconButton,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  List,
  ListItem,
} from '@chakra-ui/react';
import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons';
import axios from 'axios';

// Define types
interface User {
  id: number;
  username: string;
  role: string;
}

// group can contain numbers, strings, or user objects
type GroupUserRef = number | string | { id: number | string };

interface Group {
  id: number;
  name: string;
  teachers: GroupUserRef[]; // Array of user IDs or user objects
  students: GroupUserRef[];
}

interface ManageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  allUsers: User[]; // Pass all users as a prop
  onGroupUpdated: (updatedGroup: Group) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper: normalize anything (number|string|{id}) -> finite number id
const toNumericId = (val: GroupUserRef): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val);
  // object with id
  const raw = (val as { id?: number | string })?.id;
  return typeof raw === 'number' ? raw : Number(raw);
};

const normalizeIds = (arr: GroupUserRef[] | undefined): number[] =>
  (arr ?? [])
    .map(toNumericId)
    .filter((n) => Number.isFinite(n)) as number[];

const ManageGroupModal: React.FC<ManageGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  allUsers,
  onGroupUpdated,
}) => {
  console.log('--- 2. RENDER --- Data received by modal:', group);
  console.log('--- 3. ALL USERS --- List of all users received:', allUsers);

  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  if (!group) return null;

  // Normalize group members -> numeric ids (works for numbers/strings/objects)
  const teacherIds = normalizeIds(group.teachers);
  const studentIds = normalizeIds(group.students);

  const teachersInGroup = allUsers.filter((u) => teacherIds.includes(Number(u.id)));
  const studentsInGroup = allUsers.filter((u) => studentIds.includes(Number(u.id)));

  const members = [...teachersInGroup, ...studentsInGroup];
  const memberIds = members.map((m) => Number(m.id));
  const nonMembers = allUsers.filter((u) => !memberIds.includes(Number(u.id)));

  // --- API Call Function ---
  const handleUserAction = async (
    userId: number,
    action: 'add_student' | 'remove_student' | 'add_teacher' | 'remove_teacher'
  ) => {
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await axios.patch(
        `${API_URL}/admin/dashboard/groups/${group.id}/manage-users/`,
        { user_id: userId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onGroupUpdated(response.data); // Update parent state
      toast({
        title: 'Group Updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to update group:', error);
      toast({
        title: 'Error',
        description: 'Failed to update group.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Decide action based on user role & current membership
  const getAction = (
    user: User,
    type: 'add' | 'remove'
  ): 'add_student' | 'remove_student' | 'add_teacher' | 'remove_teacher' => {
    if (type === 'add') {
      return user.role === 'Teacher' || user.role === 'HOD/Admin' ? 'add_teacher' : 'add_student';
    }
    // remove
    if (teacherIds.includes(Number(user.id))) return 'remove_teacher';
    return 'remove_student';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="3xl">
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>Manage Group: {group.name}</ModalHeader>
        <ModalCloseButton />
        {isLoading && <Spinner pos="absolute" top="1rem" right="3rem" />}
        <ModalBody>
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList>
              <Tab>Members ({members.length})</Tab>
              <Tab>Add Users ({nonMembers.length})</Tab>
            </TabList>
            <TabPanels>
              {/* --- Panel 1: Current Members --- */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Heading size="sm" mb={2}>
                      Teachers ({teachersInGroup.length})
                    </Heading>
                    <List spacing={3}>
                      {teachersInGroup.length > 0 ? (
                        teachersInGroup.map((user) => (
                          <ListItem
                            key={user.id}
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text>
                              {user.username} ({user.role})
                            </Text>
                            <IconButton
                              aria-label="Remove user"
                              icon={<ArrowBackIcon />}
                              colorScheme="red"
                              size="sm"
                              onClick={() => handleUserAction(user.id, getAction(user, 'remove'))}
                            />
                          </ListItem>
                        ))
                      ) : (
                        <Text color="gray.400">No teachers in this group.</Text>
                      )}
                    </List>
                  </Box>
                  <Box>
                    <Heading size="sm" mb={2}>
                      Students ({studentsInGroup.length})
                    </Heading>
                    <List spacing={3}>
                      {studentsInGroup.length > 0 ? (
                        studentsInGroup.map((user) => (
                          <ListItem
                            key={user.id}
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text>
                              {user.username} ({user.role})
                            </Text>
                            <IconButton
                              aria-label="Remove user"
                              icon={<ArrowBackIcon />}
                              colorScheme="red"
                              size="sm"
                              onClick={() => handleUserAction(user.id, getAction(user, 'remove'))}
                            />
                          </ListItem>
                        ))
                      ) : (
                        <Text color="gray.400">No students in this group.</Text>
                      )}
                    </List>
                  </Box>
                </VStack>
              </TabPanel>

              {/* --- Panel 2: Users Not in Group --- */}
              <TabPanel>
                <List spacing={3}>
                  {nonMembers.length > 0 ? (
                    nonMembers.map((user) => (
                      <ListItem
                        key={user.id}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Text>
                          {user.username} ({user.role})
                        </Text>
                        <IconButton
                          aria-label="Add user"
                          icon={<ArrowForwardIcon />}
                          colorScheme="green"
                          size="sm"
                          onClick={() => handleUserAction(user.id, getAction(user, 'add'))}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <Text color="gray.400">No users to add.</Text>
                  )}
                </List>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ManageGroupModal;
