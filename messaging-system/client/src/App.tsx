import { useState } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';

interface Chat {
  id: string; // Change this to string if you want to match the ChatWindowProps
  name: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  selected: boolean;
}

const mockChats: Chat[] = [
  { id: "1", name: 'Claire', lastMessage: '2nd Hello, I wanted to know more about...', time: '2m ago', unread: true, selected: false },
  { id: "2", name: 'Parik', lastMessage: '3rd Hello, I wanted to know more about...', time: '11 days ago', unread: false, selected: false },
  { id: "3", name: 'Naina', lastMessage: '4th Hello, I wanted to know more about...', time: '11 days ago', unread: false, selected: false },
  { id: "4", name: 'John', lastMessage: '5th Hello, I wanted to know more about...', time: '11 days ago', unread: false, selected: false },
  { id: "5", name: 'Kristine', lastMessage: '4th Hello, I wanted to know more about...', time: '11 days ago', unread: false, selected: false },
];

function App() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-white">
      <ChatList chats={mockChats} onSelectChat={setSelectedChat} selectedChat={selectedChat} />
      <ChatWindow selectedChat={mockChats.find(chat => chat.id === selectedChat) || null} />
    </div>
  );
}

export default App;