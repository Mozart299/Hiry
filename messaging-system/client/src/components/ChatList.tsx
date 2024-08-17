import ChatListItem from "./ChatListItem";

interface Chat {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: boolean;
}

interface ChatListProps {
    chats: Chat[];
    onSelectChat: (chat: Chat) => void; // Updated to accept the entire chat object
    selectedChat: Chat | null; // Updated to accept the entire chat object or null
}

const ChatList = ({ chats, onSelectChat, selectedChat }: ChatListProps) => {
    return (
        <div className="w-1/3 border-r">
            <div className="p-4">
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full p-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
            </div>
            <div className="flex space-x-2 px-4 py-2 border-b">
                <button className="px-3 py-1 rounded-full bg-red-500 text-white text-sm">All</button>
                <button className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-sm">Unread</button>
                <button className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-sm">Archived</button>
                <button className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-sm">Blocked</button>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-120px)]">
                {chats.map((chat) => (
                    <ChatListItem
                        key={chat.id}
                        {...chat}
                        selected={selectedChat?.id === chat.id} // Compare IDs to determine selection
                        onClick={() => onSelectChat(chat)} // Pass the entire chat object
                    />
                ))}
            </div>
        </div>
    );
};

export default ChatList;