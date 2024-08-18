import { useState, useEffect, useRef, useCallback } from 'react';
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
  messages: Message[],
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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserId = '1'; // Placeholder for current user ID

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
      socket.emit('checkOnlineStatus', { userId: selectedChat.id });
    }

    const messageHandler = (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    const typingHandler = (data: { isTyping: boolean }) => {
      setIsTyping(data.isTyping);
    };

    const onlineStatusHandler = (status: boolean) => {
      setIsOnline(status);
    };

    socket.on('message', messageHandler);
    socket.on('typing', typingHandler);
    socket.on('onlineStatus', onlineStatusHandler);

    return () => {
      socket.off('message', messageHandler);
      socket.off('typing', typingHandler);
      socket.off('onlineStatus', onlineStatusHandler);
    };
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() !== '' && selectedChat) {
      socket.emit('sendMessage', {
        content: inputMessage,
        senderId: currentUserId,
        receiverId: selectedChat.id,
      });
      setInputMessage('');
    }
  };

  const handleTyping = useCallback(
    debounce((e) => {
      setInputMessage(e.target.value);
      if (selectedChat) {
        socket.emit('typing', { isTyping: e.target.value.length > 0, receiverId: selectedChat.id });
      }
    }, 300),
    [selectedChat]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && selectedChat) {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));

      try {
        const response = await axios.post('/upload', formData);
        const fileUrls = response.data.urls;

        socket.emit('sendMessage', {
          content: inputMessage || 'File(s) sent',
          senderId: currentUserId,
          receiverId: selectedChat.id,
          fileUrls,
        });
        setInputMessage('');
      } catch (error) {
        console.error('Error uploading files:', error);
        alert('Failed to upload files. Please try again.');
      }
    }
  };

  const loadMessages = useCallback(async () => {
    if (selectedChat) {
      try {
        setLoadingMessages(true);
        const res = await axios.get(`/api/messages?chatId=${selectedChat.id}&page=${page}`);

        if (Array.isArray(res.data.messages)) {
          setMessages((prevMessages) => [...res.data.messages, ...prevMessages]);
        } else {
          console.error('Error: messages data is not an array', res.data);
          setError('Failed to load messages. Please try again later.');
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setError('Failed to load messages. Please try again later.');
      } finally {
        setLoadingMessages(false);
      }
    }
  }, [selectedChat, page]);

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
        {error && <p className="text-red-500">{error}</p>}
        {loadingMessages && <p>Loading messages...</p>}
        {messages.map((message, index) => (
          <MessageComponent key={index} {...message} />
        ))}
        {messages.length === 0 && !loadingMessages && <p>No messages found.</p>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="bg-white p-4 flex items-center">
        <input
          type="text"
          value={inputMessage}
          onChange={handleTyping}
          className="flex-1 p-2 border rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Type your message here"
          aria-label="Message input"
        />
        <button type="submit" aria-label="Send message" className="bg-blue-500 text-white p-2 rounded-r-full">
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
          aria-label="File input"
        />
        <button type="button" className="ml-2 p-2" onClick={() => fileInputRef.current?.click()} aria-label="Upload file">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 3a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V3z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;

// Debounce function
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}