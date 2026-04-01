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
import { Send, Search, User, MoreVertical, Phone, Video, Info, Check, CheckCheck, ArrowLeft, UserPlus, Lock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { sendNotification } from '../services/notificationService';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

import { CryptoService } from '../services/cryptoService';

import EmojiPicker from 'emoji-picker-react';

export function Messages() {
  const { user, profile: currentUserProfile } = useAuthStore();
  const [searchParams] = useSearchParams();
  const chatIdParam = searchParams.get('chatId');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [chatUsers, setChatUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [showChatList, setShowChatList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const sharedKeysRef = useRef<Record<string, CryptoKey>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize E2EE Keys
  useEffect(() => {
    if (!user) return;

    const initKeys = async () => {
      try {
        const storedPrivKey = localStorage.getItem(`privateKey_${user.uid}`);
        if (storedPrivKey) {
          const key = await CryptoService.importPrivateKey(storedPrivKey);
          setPrivateKey(key);
        } else {
          // Generate new key pair
          const keyPair = await CryptoService.generateKeyPair();
          const privKeyBase64 = await CryptoService.exportPrivateKey(keyPair.privateKey);
          const pubKeyBase64 = await CryptoService.exportPublicKey(keyPair.publicKey);
          
          localStorage.setItem(`privateKey_${user.uid}`, privKeyBase64);
          setPrivateKey(keyPair.privateKey);

          // Save public key to profile
          await updateDoc(doc(db, 'users', user.uid), {
            publicKey: pubKeyBase64
          });
        }
      } catch (error) {
        console.error("Error initializing E2EE keys:", error);
      }
    };

    initKeys();
  }, [user?.uid]);

  // Fetch current user's connections
  useEffect(() => {
    if (!user) return;

    const q1 = query(collection(db, 'connections'), where('requesterId', '==', user.uid));
    const q2 = query(collection(db, 'connections'), where('receiverId', '==', user.uid));

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(prev => {
        const otherConns = prev.filter(c => c.requesterId !== user.uid);
        return [...otherConns, ...conns];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'connections');
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(prev => {
        const otherConns = prev.filter(c => c.receiverId !== user.uid);
        return [...otherConns, ...conns];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'connections');
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user?.uid]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const getSharedKey = async (otherUserId: string): Promise<CryptoKey | null> => {
    if (sharedKeysRef.current[otherUserId]) return sharedKeysRef.current[otherUserId];
    if (!privateKey) return null;

    const otherUser = chatUsers[otherUserId];
    if (!otherUser?.publicKey) return null;

    try {
      const otherPubKey = await CryptoService.importPublicKey(otherUser.publicKey);
      const sharedKey = await CryptoService.deriveSharedKey(privateKey, otherPubKey);
      sharedKeysRef.current[otherUserId] = sharedKey;
      return sharedKey;
    } catch (error) {
      console.error("Error deriving shared key:", error);
      return null;
    }
  };

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

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      
      // Decrypt messages
      const decryptedMsgs = await Promise.all(msgs.map(async (msg) => {
        if (msg.iv && msg.content) {
          const otherUserId = msg.senderId === user?.uid ? msg.receiverId : msg.senderId;
          const sharedKey = await getSharedKey(otherUserId);
          if (sharedKey) {
            const decryptedContent = await CryptoService.decryptMessage(msg.content, msg.iv, sharedKey);
            return { ...msg, content: decryptedContent };
          }
        }
        return msg;
      }));

      setMessages(decryptedMsgs);
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
  }, [selectedChat, user, privateKey, chatUsers]);

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

    let finalContent = newMessage.trim();
    let iv = '';

    try {
      const sharedKey = await getSharedKey(receiverId);
      if (sharedKey) {
        const encrypted = await CryptoService.encryptMessage(finalContent, sharedKey);
        finalContent = encrypted.ciphertext;
        iv = encrypted.iv;
      }
    } catch (error) {
      console.error("Encryption failed, sending plain text (fallback)", error);
    }

    const messageData = {
      chatId: selectedChat.id,
      senderId: user.uid,
      receiverId,
      content: finalContent,
      iv,
      read: false,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update chat last message
      const chatRef = doc(db, 'chats', selectedChat.id);
      await updateDoc(chatRef, {
        lastMessage: iv ? '🔒 Encrypted message' : newMessage.trim(),
        lastMessageTime: new Date().toISOString(),
        [`unreadCount.${receiverId}`]: (selectedChat.unreadCount?.[receiverId] || 0) + 1
      });

      // Send notification
      await sendNotification(
        receiverId,
        'new_message',
        'New Message',
        `${currentUserProfile?.displayName || 'Someone'} sent you a message.`,
        `/messages?chatId=${selectedChat.id}`,
        { chatId: selectedChat.id, senderId: user.uid }
      );

      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleConnect = async (receiverId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'connections'), {
        requesterId: user.uid,
        receiverId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Send notification
      await sendNotification(
        receiverId,
        'connection_request',
        'New Connection Request',
        `${currentUserProfile?.displayName || 'Someone'} wants to connect with you.`,
        '/network?tab=requests',
        { requesterId: user.uid }
      );
    } catch (error) {
      console.error("Error sending connection request:", error);
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
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex">
      {/* Chat List */}
      <div className={`${showChatList ? 'w-full md:w-80 lg:w-96' : 'hidden md:flex md:w-80 lg:w-96'} border-r border-slate-200 flex flex-col bg-white`}>
        <div className="p-3 bg-[#f0f2f5] flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img 
              src={currentUserProfile?.photoURL || `https://ui-avatars.com/api/?name=${currentUserProfile?.displayName || 'User'}&background=random`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            <h2 className="text-lg font-semibold text-slate-900">Chats</h2>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M12.072 1.761a10.05 10.05 0 0 0-9.303 5.658l-1.078 2.585a1.695 1.695 0 0 0 1.654 2.34l2.584-.108a10.05 10.05 0 0 0 12.146 12.146l2.584-.108a1.695 1.695 0 0 0 1.654-2.34l-1.078-2.584a10.05 10.05 0 0 0-9.163-17.589zm0 18.101a8.05 8.05 0 1 1 8.05-8.05 8.06 8.06 0 0 1-8.05 8.05z"></path></svg>
            </button>
            <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg>
            </button>
          </div>
        </div>
        <div className="p-2 border-b border-slate-200 bg-white">
          <div className="relative bg-[#f0f2f5] rounded-lg flex items-center px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search or start new chat" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-slate-900 placeholder-slate-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-white">
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
                  className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-[#f5f6f6] transition-colors ${isSelected ? 'bg-[#f0f2f5]' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <img 
                      src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'User'}&background=random`} 
                      alt={otherUser?.displayName} 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {isOnline(otherUser?.lastSeen) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0 border-b border-slate-100 pb-3 -mb-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`font-semibold text-slate-900 truncate ${unreadCount > 0 ? 'font-bold' : ''}`}>
                        {otherUser?.displayName || 'Loading...'}
                      </h3>
                      {chat.lastMessageTime && (
                        <span className={`text-[12px] whitespace-nowrap ${unreadCount > 0 ? 'text-[#00a884] font-medium' : 'text-slate-500'}`}>
                          {format(new Date(chat.lastMessageTime), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate pr-2 ${unreadCount > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-[#00a884] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
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
      <div className={`${!showChatList ? 'w-full' : 'hidden md:flex md:flex-1'} flex flex-col bg-[#efeae2]`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowChatList(true)}
                  className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img 
                  src={getOtherParticipant(selectedChat)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedChat)?.displayName || 'User'}&background=random`} 
                  alt={getOtherParticipant(selectedChat)?.displayName} 
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                />
                <div className="flex flex-col cursor-pointer">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 leading-tight">{getOtherParticipant(selectedChat)?.displayName || 'Loading...'}</h3>
                    {(() => {
                      const otherId = selectedChat.participants.find(id => id !== user?.uid);
                      if (!otherId) return null;
                      
                      const connection = connections.find(c => 
                        (c.requesterId === user?.uid && c.receiverId === otherId) ||
                        (c.receiverId === user?.uid && c.requesterId === otherId)
                      );
                      
                      const isConnected = connection?.status === 'accepted';
                      const isPending = connection?.status === 'pending';
                      
                      if (!isConnected) {
                        return (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleConnect(otherId); }}
                            disabled={isPending}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors flex items-center gap-1 ${
                              isPending
                                ? 'border-slate-300 text-slate-400 bg-slate-50 cursor-not-allowed'
                                : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            {!isPending && <UserPlus className="w-3 h-3" />}
                            {isPending ? 'Pending' : 'Connect'}
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {isOnline(getOtherParticipant(selectedChat)?.lastSeen) ? (
                    <p className="text-[13px] text-slate-500">
                      Online
                    </p>
                  ) : (
                    <p className="text-[13px] text-slate-500">
                      {formatLastSeen(getOtherParticipant(selectedChat)?.lastSeen)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] relative">
              {/* Optional subtle pattern overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
              
              {/* E2EE Notice */}
              <div className="flex justify-center my-4 relative z-10">
                <div className="px-4 py-2 bg-[#ffeecd] text-[#54656f] text-xs rounded-lg shadow-sm flex items-center gap-2 max-w-md text-center leading-relaxed">
                  <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current flex-shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>
                  <span>Messages are end-to-end encrypted. No one outside of this chat, not even us, can read them.</span>
                </div>
              </div>

              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                const showDate = idx === 0 || format(new Date(messages[idx-1].createdAt), 'yyyy-MM-dd') !== format(new Date(msg.createdAt), 'yyyy-MM-dd');

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4 relative z-10">
                        <span className="px-3 py-1 bg-white/80 backdrop-blur-sm text-slate-600 text-xs font-medium rounded-lg shadow-sm">
                          {format(new Date(msg.createdAt), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative z-10`}>
                      <div className={`max-w-[85%] md:max-w-[75%] relative group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-lg shadow-sm relative ${
                          isMe 
                            ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none' 
                            : 'bg-white text-slate-900 rounded-tl-none'
                        }`}>
                          {/* Tail for bubbles */}
                          <div className={`absolute top-0 w-3 h-3 ${
                            isMe 
                              ? '-right-2 bg-[#d9fdd3] [clip-path:polygon(0_0,0%_100%,100%_0)]' 
                              : '-left-2 bg-white [clip-path:polygon(100%_0,0_0,100%_100%)]'
                          }`}></div>
                          
                          <div className="text-[15px] leading-relaxed break-words pr-12 pb-2">
                            {msg.content}
                          </div>
                          
                          <div className="absolute bottom-1 right-2 flex items-center gap-1">
                            {msg.iv && (
                              <Lock className="w-[10px] h-[10px] text-slate-400" />
                            )}
                            <span className="text-[10px] text-slate-500 font-medium">
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </span>
                            {isMe && (
                              msg.read ? <CheckCheck className="w-[14px] h-[14px] text-blue-500" /> : <Check className="w-[14px] h-[14px] text-slate-400" />
                            )}
                          </div>
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
                      <div className="flex justify-start relative z-10">
                        <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm flex items-center gap-1 relative">
                          <div className="absolute top-0 -left-2 w-3 h-3 bg-white [clip-path:polygon(100%_0,0_0,100%_100%)]"></div>
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                          </div>
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
            <div className="p-3 bg-[#f0f2f5] flex flex-col gap-2 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-2 z-50" ref={emojiPickerRef}>
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => {
                      setNewMessage(prev => prev + emojiData.emoji);
                    }}
                  />
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 bg-white rounded-xl flex items-end shadow-sm border border-slate-200 overflow-hidden">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-3 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"></path></svg>
                  </button>
                  <button type="button" className="p-3 text-slate-500 hover:text-slate-700 transition-colors">
                    <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.173 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.57.57 0 0 0-.834.018l-7.205 7.207a5.577 5.577 0 0 0-1.645 3.971z"></path></svg>
                  </button>
                  <form onSubmit={handleSendMessage} className="flex-1 flex items-end">
                    <textarea 
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (!user || !selectedChat) return;
                        // Set typing to true
                        const chatRef = doc(db, 'chats', selectedChat.id);
                        updateDoc(chatRef, { [`typingStatus.${user.uid}`]: true }).catch(console.error);
                        
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                          updateDoc(chatRef, { [`typingStatus.${user.uid}`]: false }).catch(console.error);
                        }, 3000);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as unknown as React.FormEvent);
                        }
                      }}
                      placeholder="Type a message"
                      className="w-full bg-transparent px-2 py-3 text-[15px] focus:outline-none resize-none max-h-32 min-h-[44px]"
                      rows={1}
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                      }}
                    />
                  </form>
                </div>
                {newMessage.trim() ? (
                  <button 
                    onClick={handleSendMessage}
                    className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition-colors shadow-sm flex-shrink-0"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                ) : (
                  <button className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition-colors shadow-sm flex-shrink-0">
                    <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z"></path></svg>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5] border-b-[6px] border-[#00a884]">
            <div className="w-80 h-40 mb-8 flex items-center justify-center">
              {/* ShouldReach Messages style illustration placeholder */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-300" fill="currentColor">
                <path d="M50 10C27.9 10 10 27.9 10 50c0 8.6 2.7 16.6 7.4 23.2L13 87l14.2-4.3c6.4 4.3 14.1 6.8 22.3 6.8 22.1 0 40-17.9 40-40S72.1 10 50 10zm0 73.5c-7.2 0-14-2.3-19.6-6.3l-1.4-.8-10.4 3.1 3.2-10-1-1.6C16.4 62.6 14 56.5 14 50c0-19.9 16.1-36 36-36s36 16.1 36 36-16.1 36-36 36z"></path>
              </svg>
            </div>
            <h3 className="text-3xl font-light text-slate-700 mb-4">ShouldReach Messages</h3>
            <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-8">
              Send and receive messages securely with your network.<br/>
              Your personal messages are end-to-end encrypted.
            </p>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <svg viewBox="0 0 24 24" width="12" height="12" className="fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
