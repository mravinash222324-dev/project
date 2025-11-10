// frontend/src/components/AdminDashboard.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Heading,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  useDisclosure,
  TableContainer,
} from '@chakra-ui/react';
import axios from 'axios';
import UpdateRoleModal from './UpdateRoleModal';
import ManageGroupModal from './ManageGroupModal';

// ---- Shared-ish Types ----
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

// The modal may return numbers, strings, or objects for members:
type GroupUserRef = number | string | { id: number | string };

interface Group {
  id: number;
  name: string;
  description?: string;
  teachers: GroupUserRef[]; // accept wide shapes
  students: GroupUserRef[];
}

interface DashboardData {
  users: User[];
  groups: Group[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helpers to normalize to numeric IDs for internal state consistency
const toNumericId = (v: GroupUserRef): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  const raw = v?.id as number | string | undefined;
  return typeof raw === 'number' ? raw : Number(raw);
};
const normalizeIds = (arr: GroupUserRef[] | undefined): number[] =>
  (arr ?? []).map(toNumericId).filter((n) => Number.isFinite(n)) as number[];

const normalizeGroup = (g: Group): Group => ({
  ...g,
  teachers: normalizeIds(g.teachers),
  students: normalizeIds(g.students),
});

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({ users: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- User Role modal state ---
  const {
    isOpen: isRoleModalOpen,
    onOpen: onRoleModalOpen,
    onClose: onRoleModalClose,
  } = useDisclosure();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // --- Group Manage modal state ---
  const {
    isOpen: isGroupModalOpen,
    onOpen: onGroupModalOpen,
    onClose: onGroupModalClose,
  } = useDisclosure();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const isMounted = useRef(true);

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken') || '';
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await axios.get<DashboardData>(`${API_URL}/admin/dashboard/`, {
        headers,
      });

      if (!isMounted.current) return;

      const payload = response.data || { users: [], groups: [] };
      const groups = Array.isArray(payload.groups) ? payload.groups.map(normalizeGroup) : [];
      setData({
        users: Array.isArray(payload.users) ? payload.users : [],
        groups,
      });
    } catch (err: unknown) {
      console.error('Failed to fetch admin data:', err);
      if (!isMounted.current) return;
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.message || 'Failed to load dashboard data.'
          : 'Failed to load dashboard data.'
      );
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers: Role Modal ---
  const handleEditRoleClick = (user: User) => {
    setSelectedUser(user);
    onRoleModalOpen();
  };

  const handleUserUpdated = (updatedUser: User) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    }));
  };

  // --- Handlers: Group Modal ---
  const handleManageGroupClick = (group: Group) => {
    console.log('--- 1. CLICK --- Correct data should be here:', group);
    console.log('Opening modal for group:', group);
    setSelectedGroup(group);
    onGroupModalOpen();
  };

  // Accept the wide shape from the modal, then normalize before storing
  const handleGroupUpdated = (updatedGroup: Group) => {
    const normalized = normalizeGroup(updatedGroup);
    setData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === normalized.id ? normalized : g)),
    }));
    setSelectedGroup(normalized); // keep modal in sync
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="50vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" m={5}>
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <Heading mb={6} bgGradient="linear(to-r, cyan.400, blue.600)" bgClip="text">
        Admin Dashboard
      </Heading>

      <Tabs variant="soft-rounded" colorScheme="blue">
        <TabList>
          <Tab>Users</Tab>
          <Tab>Groups</Tab>
        </TabList>

        <TabPanels>
          {/* Users */}
          <TabPanel px={0}>
            <Heading size="md" mb={4} px={2}>
              User Management
            </Heading>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th color="gray.600">ID</Th>
                    <Th color="gray.600">Username</Th>
                    <Th color="gray.600">Email</Th>
                    <Th color="gray.600">Role</Th>
                    <Th color="gray.600">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.users.length > 0 ? (
                    data.users.map((user) => (
                      <Tr key={user.id}>
                        <Td>{user.id}</Td>
                        <Td>{user.username}</Td>
                        <Td>{user.email}</Td>
                        <Td>{user.role}</Td>
                        <Td>
                          <Button size="sm" colorScheme="yellow" onClick={() => handleEditRoleClick(user)}>
                            Edit Role
                          </Button>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={5} color="gray.500">
                        No users found
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Groups */}
          <TabPanel px={0}>
            <Heading size="md" mb={4} px={2}>
              Group Management
            </Heading>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th color="gray.600">ID</Th>
                    <Th color="gray.600">Name</Th>
                    <Th color="gray.600">Teachers</Th>
                    <Th color="gray.600">Students</Th>
                    <Th color="gray.600">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.groups.length > 0 ? (
                    data.groups.map((group) => {
                      const tCount = normalizeIds(group.teachers).length;
                      const sCount = normalizeIds(group.students).length;
                      return (
                        <Tr key={group.id}>
                          <Td>{group.id}</Td>
                          <Td>{group.name}</Td>
                          <Td>{tCount}</Td>
                          <Td>{sCount}</Td>
                          <Td>
                            <Button size="sm" colorScheme="teal" onClick={() => handleManageGroupClick(group)}>
                              Manage Users
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })
                  ) : (
                    <Tr>
                      <Td colSpan={5} color="gray.500">
                        No groups found
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Modals */}
      {selectedUser && (
        <UpdateRoleModal
          isOpen={isRoleModalOpen}
          onClose={onRoleModalClose}
          user={selectedUser}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {selectedGroup && data.users && (
        <ManageGroupModal
          isOpen={isGroupModalOpen}
          onClose={onGroupModalClose}
          group={selectedGroup}
          allUsers={data.users}
          onGroupUpdated={handleGroupUpdated}
        />
      )}
    </Box>
  );
};

export default AdminDashboard;
