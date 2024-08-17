import { useState, useEffect } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import axios from 'axios';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: boolean;
}

function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null); // Update to store the entire chat object
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const [messages, setMessages] = useState<any[]>([]); // State to store messages

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true); // Set loading to true before fetching
      try {
        const response = await axios.get('http://localhost:3000/api/users'); 
        const userList = response.data.map((user: any) => ({
          id: user.id.toString(),
          name: user.username,
          lastMessage: 'No messages yet', // You can update this based on actual messages
          time: 'Just now', // Modify this with actual timestamps from messages
          unread: false, // Set this dynamically based on unread messages
        }));
        setChats(userList);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users'); // Set error message
      } finally {
        setLoading(false); // Set loading to false after fetching
      }
    };

    fetchUsers();
  }, []);

  // Fetch messages when a chat is selected
  useEffect(() => {
    const fetchMessages = async (senderId: number, receiverId: string) => {
      try {
        const response = await axios.get(`http://localhost:3000/api/messages/${senderId}/${receiverId}`);
        setMessages(response.data); // Store fetched messages in state
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    if (selectedChat) {
      fetchMessages(1, selectedChat.id); // Replace 1 with the actual current user ID
    }
  }, [selectedChat]);

  return (
    <div className="flex h-screen bg-white">
      {loading && <div>Loading chats...</div>} {/* Show loading state */}
      {error && <div>{error}</div>} {/* Show error message */}
      <ChatList 
        chats={chats} 
        onSelectChat={setSelectedChat} // Pass the entire chat object
        selectedChat={selectedChat} 
      />
      <ChatWindow selectedChat={selectedChat} messages={messages} /> {/* Pass the entire selected chat and messages */}
    </div>
  );
}

export default App;