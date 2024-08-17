import { useState, useEffect } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import axios from 'axios';

interface Chat {
  id: string; // Ensure the id matches with the database
  name: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  selected: boolean;
}

function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/users'); // Adjust this URL to your backend
        const userList = response.data.map((user: any) => ({
          id: user.id.toString(),
          name: user.username,
          lastMessage: 'No messages yet', // You can update this based on actual messages
          time: 'Just now', // Modify this with actual timestamps from messages
          unread: false, // Set this dynamically based on unread messages
          selected: false,
        }));
        setChats(userList);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="flex h-screen bg-white">
      <ChatList chats={chats} onSelectChat={setSelectedChat} selectedChat={selectedChat} />
      <ChatWindow selectedChat={chats.find(chat => chat.id === selectedChat) || null} />
    </div>
  );
}

export default App;
