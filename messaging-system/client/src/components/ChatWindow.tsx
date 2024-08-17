import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

interface Message {
    content: string;
    isSent: boolean;
}

interface Chat {
    id: string; // Ensure this matches the type used in your database
    name: string;
}

interface ChatWindowProps {
    selectedChat: Chat | null; // Accept the entire chat object or null
    messages: Message[];
}

const MessageComponent: React.FC<Message> = ({ content, isSent }) => (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs px-4 py-2 rounded-lg ${isSent ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
            {content}
        </div>
    </div>
);

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedChat }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const currentUserId = 2; // Replace with actual user ID logic

    useEffect(() => {
        // Listen for incoming messages
        socket.on('message', (message: Message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        // Listen for typing status
        socket.on('typing', (data: { isTyping: boolean }) => {
            setIsTyping(data.isTyping);
        });

        return () => {
            socket.off('message');
            socket.off('typing');
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async (senderId: number, receiverId: string) => {
        try {
            const response = await fetch(`/api/messages/${senderId}/${receiverId}`);
            const data = await response.json();
            setMessages(data); // Store fetched messages in state
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        if (selectedChat) {
            // Join the chat room when a chat is selected
            socket.emit('joinChat', selectedChat.id);
            fetchMessages(currentUserId, selectedChat.id); // Fetch messages when chat is selected
        }
    }, [selectedChat]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputMessage.trim() !== '') {
            if (selectedChat) { // Check if selectedChat is not null
                // Emit the message to the server
                socket.emit('sendMessage', {
                    text: inputMessage,
                    senderId: currentUserId, // Ensure this is set to the correct user ID
                    receiverId: selectedChat.id // Access id only if selectedChat is not null
                });
                setInputMessage(''); // Clear the input field
            } else {
                console.error("No chat selected.");
                // Optionally, you can display a message to the user
            }
        }
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);
        socket.emit('typing', { isTyping: e.target.value.length > 0, receiverId: selectedChat?.id });
    };

    return (
        <div className="flex-1 flex flex-col">
            <div className="bg-white border-b p-4 flex items-center">
                {selectedChat ? (
                    <>
                        <img src={`https://ui-avatars.com/api/?name=${selectedChat.name}`} alt={selectedChat.name} className="w-10 h-10 rounded-full mr-3" />
                        <div>
                            <h2 className="font-semibold">{selectedChat.name}</h2>
                            {isTyping && <p className="text-sm text-gray-500">Typing...</p>}
                        </div>
                    </>
                ) : (
                    <h2 className="font-semibold">Select a chat</h2>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.map((message, index) => (
                    <MessageComponent key={index} {...message} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="bg-white p-4 flex items-center">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={handleTyping}
                    className="flex-1 p-2 border rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Type your message here"
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded-r-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;