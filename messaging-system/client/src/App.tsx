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

  useEffect(() => {
    const fetchUsers = async () => {
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
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="flex h-screen bg-white">
      <ChatList 
        chats={chats} 
        onSelectChat={setSelectedChat} // Pass the entire chat object
        selectedChat={selectedChat} 
      />
      <ChatWindow selectedChat={selectedChat} /> {/* Pass the entire selected chat */}
    </div>
  );
}

export default App;