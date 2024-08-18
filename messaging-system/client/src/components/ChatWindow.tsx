import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios'; // For file uploads

const socket = io('http://localhost:3000');

interface Message {
  id: string;
  content: string;
  isSent: boolean;
  isRead: boolean;
  fileUrls?: string[];
}

interface Chat {
  id: string;
  name: string;
  isOnline?: boolean;
}

interface ChatWindowProps {
  selectedChat: Chat | null;
  messages: Message[];
}

const MessageComponent: React.FC<Message> = ({ content, isSent, fileUrls }) => (
  <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-xs px-4 py-2 rounded-lg ${isSent ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
      {content}
      {fileUrls?.map((url, idx) => (
        <div key={idx}>
          {url.endsWith('.mp4') ? (
            <video src={url} controls className="mt-2 w-full rounded-lg" />
          ) : (
            <img src={url} alt="Uploaded" className="mt-2 w-full rounded-lg" />
          )}
        </div>
      ))}
    </div>
  </div>
);

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedChat }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserId = '1'; // Placeholder for current user ID

  useEffect(() => {
    if (selectedChat) {
      // Fetch initial messages and online status
      loadMessages();
      socket.emit('checkOnlineStatus', { userId: selectedChat.id });
    }

    socket.on('message', (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on('typing', (data: { isTyping: boolean }) => {
      setIsTyping(data.isTyping);
    });

    socket.on('onlineStatus', (status: boolean) => {
      setIsOnline(status);
    });

    return () => {
      socket.off('message');
      socket.off('typing');
      socket.off('onlineStatus');
    };
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() !== '') {
      if (selectedChat) {
        socket.emit('sendMessage', {
          text: inputMessage,
          senderId: currentUserId,
          receiverId: selectedChat.id,
        });
        setInputMessage('');
      } else {
        console.error("No chat selected.");
      }
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    socket.emit('typing', { isTyping: e.target.value.length > 0, receiverId: selectedChat?.id });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && selectedChat) {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const response = await axios.post('/upload', formData);
      const fileUrls = response.data.urls;

      socket.emit('sendMessage', {
        text: inputMessage,
        senderId: currentUserId,
        receiverId: selectedChat.id,
        fileUrls,
      });
      setInputMessage('');
    }
  };

  const loadMessages = async () => {
    const res = await axios.get(`/api/messages?chatId=${selectedChat?.id}&page=${page}`);
    setMessages((prevMessages) => [...res.data.messages, ...prevMessages]);
  };

  const handleScroll = (e: React.UIEvent) => {
    if (e.currentTarget.scrollTop === 0 && selectedChat) {
      setPage((prevPage) => prevPage + 1);
      loadMessages();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b p-4 flex items-center">
        {selectedChat ? (
          <>
            <img src={`https://ui-avatars.com/api/?name=${selectedChat.name}`} alt={selectedChat.name} className="w-10 h-10 rounded-full mr-3" />
            <div>
              <h2 className="font-semibold">{selectedChat.name} {isOnline ? "(Online)" : "(Offline)"}</h2>
              {isTyping && <p className="text-sm text-gray-500">Typing...</p>}
            </div>
          </>
        ) : (
          <h2 className="font-semibold">Select a chat</h2>
        )}
      </div>
      <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 bg-gray-50">
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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple
        />
        <button type="button" className="ml-2 p-2" onClick={() => fileInputRef.current?.click()}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 3a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V3z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
