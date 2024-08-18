interface ChatListItemProps {
  name: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  selected: boolean;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  name,
  lastMessage,
  time,
  unread,
  selected,
  onClick,
}) => (
  <div 
      onClick={onClick}
      className={`flex items-center p-3 cursor-pointer ${selected ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
  >
      <img src={`https://ui-avatars.com/api/?name=${name}`} alt={name} className="w-10 h-10 rounded-full mr-3" />
      <div className="flex-1">
          <div className="flex justify-between items-center">
              <h3 className="font-semibold">{name}</h3>
              <span className="text-xs text-gray-500">{time}</span>
          </div>
          <p className="text-sm text-gray-600 truncate">{lastMessage}</p>
      </div>
      {unread && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
  </div>
);

export default ChatListItem;