import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDocs,
  limit,
  Timestamp,
  getDoc,
  setDoc,
  or
} from 'firebase/firestore';
import { Chat, Message, UserProfile } from '../types';
import { Send, Search, User, MoreVertical, Phone, Video, Info, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { sendNotification } from '../services/notificationService';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function Messages() {
  const { user, profile: currentUserProfile } = useAuthStore();
  const [searchParams] = useSearchParams();
  const chatIdParam = searchParams.get('chatId');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatUsers, setChatUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [showChatList, setShowChatList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update lastSeen status
  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating last seen:", error);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user?.uid]);

  const handleTyping = async (isTyping: boolean) => {
    if (!selectedChat || !user) return;

    const chatRef = doc(db, 'chats', selectedChat.id);
    try {
      await updateDoc(chatRef, {
        [`typingStatus.${user.uid}`]: isTyping
      });
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  // Select chat from URL param
  useEffect(() => {
    if (chatIdParam && chats.length > 0) {
      const chat = chats.find(c => c.id === chatIdParam);
      if (chat) {
        setSelectedChat(chat);
        setShowChatList(false);
      }
    }
  }, [chatIdParam, chats]);

  // Cleanup typing status on unmount or chat change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (selectedChat && user) {
        handleTyping(false);
      }
    };
  }, [selectedChat?.id, user?.uid]);

  // Fetch chats
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chat[];
      setChats(chatsData);
      
      // Fetch user profiles for participants
      const userIds = new Set<string>();
      chatsData.forEach(chat => {
        chat.participants.forEach(id => {
          if (id !== user.uid) userIds.add(id);
        });
      });

      const newUserProfiles: Record<string, UserProfile> = { ...chatUsers };
      for (const id of userIds) {
        if (!newUserProfiles[id]) {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            newUserProfiles[id] = userDoc.data() as UserProfile;
          }
        }
      }
      setChatUsers(newUserProfiles);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Listen to other participant's profile for real-time status
  useEffect(() => {
    if (!selectedChat || !user) return;
    
    const otherId = selectedChat.participants.find(id => id !== user.uid);
    if (!otherId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', otherId), (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as UserProfile;
        setChatUsers(prev => ({
          ...prev,
          [otherId]: userData
        }));
      }
    });

    return () => unsubscribe();
  }, [selectedChat?.id, user?.uid]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', selectedChat.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      scrollToBottom();

      // Mark messages as read
      msgs.forEach(async (msg) => {
        if (msg.receiverId === user?.uid && !msg.read) {
          await updateDoc(doc(db, 'messages', msg.id), { read: true });
        }
      });

      // Reset unread count for current user in this chat
      if (user && selectedChat.unreadCount && selectedChat.unreadCount[user.uid] > 0) {
        updateDoc(doc(db, 'chats', selectedChat.id), {
          [`unreadCount.${user.uid}`]: 0
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [selectedChat, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    // Set typing to false immediately
    handleTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const receiverId = selectedChat.participants.find(id => id !== user.uid);
    if (!receiverId) return;

    const messageData = {
      chatId: selectedChat.id,
      senderId: user.uid,
      receiverId,
      content: newMessage.trim(),
      read: false,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update chat last message
      const chatRef = doc(db, 'chats', selectedChat.id);
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageTime: new Date().toISOString(),
        [`unreadCount.${receiverId}`]: (selectedChat.unreadCount?.[receiverId] || 0) + 1
      });

      // Send notification
      await sendNotification(
        receiverId,
        'new_message',
        'New Message',
        `${currentUserProfile?.displayName || 'Someone'} sent you a message: "${newMessage.trim().substring(0, 50)}${newMessage.trim().length > 50 ? '...' : ''}"`,
        `/messages?chatId=${selectedChat.id}`,
        { chatId: selectedChat.id, senderId: user.uid }
      );

      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!user || !selectedChat) return;

    // Set typing to true
    handleTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to set typing to false after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 3000);
  };

  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(id => id !== user?.uid);
    return otherId ? chatUsers[otherId] : null;
  };

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    // Consider online if last seen within the last 3 minutes
    return (now.getTime() - lastSeenDate.getTime()) < 3 * 60 * 1000;
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Offline';
    try {
      const date = new Date(lastSeen);
      return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch (e) {
      return 'Offline';
    }
  };

  const filteredChats = chats.filter(chat => {
    const other = getOtherParticipant(chat);
    if (!other) return false;
    return other.displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-14rem)] md:h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
      {/* Chat List */}
      <div className={`${showChatList ? 'w-full md:w-80 lg:w-96' : 'hidden md:flex md:w-80 lg:w-96'} border-r border-slate-200 flex flex-col`}>
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => {
              const otherUser = getOtherParticipant(chat);
              const isSelected = selectedChat?.id === chat.id;
              const unreadCount = user ? chat.unreadCount?.[user.uid] || 0 : 0;

              return (
                <button
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat);
                    setShowChatList(false);
                  }}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${isSelected ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className="relative">
                    <img 
                      src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'User'}&background=random`} 
                      alt={otherUser?.displayName} 
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                    {isOnline(otherUser?.lastSeen) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`font-semibold text-slate-900 truncate ${unreadCount > 0 ? 'font-bold' : ''}`}>
                        {otherUser?.displayName || 'Loading...'}
                      </h3>
                      {chat.lastMessageTime && (
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {format(new Date(chat.lastMessageTime), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${unreadCount > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${!showChatList ? 'w-full' : 'hidden md:flex md:flex-1'} flex flex-col bg-slate-50`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowChatList(true)}
                  className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img 
                  src={getOtherParticipant(selectedChat)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedChat)?.displayName || 'User'}&background=random`} 
                  alt={getOtherParticipant(selectedChat)?.displayName} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-slate-900 leading-none mb-1">{getOtherParticipant(selectedChat)?.displayName || 'Loading...'}</h3>
                  {isOnline(getOtherParticipant(selectedChat)?.lastSeen) ? (
                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      Online
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatLastSeen(getOtherParticipant(selectedChat)?.lastSeen)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                const showDate = idx === 0 || format(new Date(messages[idx-1].createdAt), 'yyyy-MM-dd') !== format(new Date(msg.createdAt), 'yyyy-MM-dd');

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {format(new Date(msg.createdAt), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] group relative ${isMe ? 'order-1' : 'order-2'}`}>
                        <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                          isMe 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                          {isMe && (
                            msg.read ? <CheckCheck className="w-3 h-3 text-indigo-500" /> : <Check className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              
              {/* Typing Indicator */}
              {selectedChat && (
                (() => {
                  const otherId = selectedChat.participants.find(id => id !== user?.uid);
                  const isTyping = otherId && selectedChat.typingStatus?.[otherId];
                  if (isTyping) {
                    return (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium ml-1">typing...</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={onInputChange}
                  placeholder="Type a message..." 
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <Send className="w-10 h-10 -rotate-45" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Your Messages</h3>
            <p className="text-slate-500 max-w-sm">
              Select a conversation from the list to start chatting with your connections securely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
