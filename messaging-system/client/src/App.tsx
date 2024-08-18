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
}

function App() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/users');
                const userList = response.data.map((user: any) => ({
                    id: user.id.toString(),
                    name: user.username,
                    lastMessage: 'No messages yet',
                    time: 'Just now',
                    unread: false,
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
            socket.emit('joinChat', selectedChat.id); // Join the chat room

            const fetchMessages = async (senderId: number, receiverId: string) => {
                try {
                    const response = await axios.get(`http://localhost:3000/api/messages/${senderId}/${receiverId}`);
                    setMessages(response.data);
                } catch (error) {
                    console.error('Error fetching messages:', error);
                }
            };

            fetchMessages(1, selectedChat.id); // Replace 1 with the actual current user ID
        }
    }, [selectedChat]);

    useEffect(() => {
        socket.on('message', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        socket.on('userStatus', (data) => {
            console.log(`${data.userId} is now ${data.status}`);
        });

        return () => {
            socket.off('message');
            socket.off('userStatus');
        };
    }, []);

    return (
        <div className="flex h-screen bg-white">
            <ChatList 
                chats={chats} 
                onSelectChat={setSelectedChat} 
                selectedChat={selectedChat} 
            />
            <ChatWindow selectedChat={selectedChat} messages={messages} />
        </div>
    );
}

export default App;