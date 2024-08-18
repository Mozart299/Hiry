import { useState, useEffect } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

interface Chat {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: boolean;
    isOnline?: boolean;
}

function App() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number>(1); // Simulate logged-in user

    useEffect(() => {
        // Fetch users (chats) from the backend
        const fetchUsers = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/users');
                const userList = response.data.map((user: any) => ({
                    id: user.id.toString(),
                    name: user.username,
                    lastMessage: 'No messages yet',
                    time: 'Just now',
                    unread: false,
                    isOnline: false, // Initialize with offline status
                }));
                setChats(userList);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedChat) {
            // Join the selected chat room and fetch messages
            socket.emit('joinChat', selectedChat.id);
            const fetchMessages = async () => {
                try {
                    const response = await axios.get(`http://localhost:3000/api/messages/${currentUserId}/${selectedChat.id}`);
                    setMessages(response.data);
                } catch (error) {
                    console.error('Error fetching messages:', error);
                }
            };

            fetchMessages();
        }
    }, [selectedChat, currentUserId]);

    useEffect(() => {
        // Listen for new messages and user status changes
        socket.on('message', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
            updateLastMessage(message);
        });

        socket.on('userStatus', (data: { userId: string; status: string }) => {
            setChats((prevChats) =>
                prevChats.map((chat) =>
                    chat.id === data.userId ? { ...chat, isOnline: data.status === 'online' } : chat
                )
            );
        });

        return () => {
            socket.off('message');
            socket.off('userStatus');
        };
    }, [chats]);

    const updateLastMessage = (message: any) => {
        setChats((prevChats) =>
            prevChats.map((chat) =>
                chat.id === message.senderId || chat.id === message.receiverId
                    ? {
                          ...chat,
                          lastMessage: message.text,
                          time: new Date().toLocaleTimeString(),
                          unread: message.senderId !== currentUserId,
                      }
                    : chat
            )
        );
    };

    return (
        <div className="flex h-screen bg-white">
            <ChatList 
                chats={chats} 
                onSelectChat={(chat) => setSelectedChat(chat)} 
                selectedChat={selectedChat} 
            />
            <ChatWindow selectedChat={selectedChat} messages={messages} />
        </div>
    );
}

export default App;
