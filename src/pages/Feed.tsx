import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Post, PostMedia } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Send, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Link as LinkIcon,
  MoreHorizontal,
  Globe,
  Users as UsersIcon,
  Repeat,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { sendNotification } from '../services/notificationService';
import { PostCard } from '../components/PostCard';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function Feed() {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Media upload state
  const [mediaItems, setMediaItems] = useState<PostMedia[]>([]);
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaTypeInput, setMediaTypeInput] = useState<'image' | 'video'>('image');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Share state
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user || !profile) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
        authorRole: profile.role,
        content: newPostContent,
        media: mediaItems,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString()
      });
      setNewPostContent('');
      setMediaItems([]);
      setIsAddingMedia(false);
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMedia = () => {
    if (!mediaUrlInput.trim()) return;
    setMediaItems([...mediaItems, { url: mediaUrlInput, type: mediaTypeInput }]);
    setMediaUrlInput('');
    setIsAddingMedia(false);
  };

  const toggleMediaInput = (type: 'image' | 'video') => {
    if (isAddingMedia && mediaTypeInput === type) {
      setIsAddingMedia(false);
    } else {
      setIsAddingMedia(true);
      setMediaTypeInput(type);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) { // ~800KB limit for Firestore safety
      alert("File is too large. Please use a URL for larger media or upload a smaller image (under 800KB).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setMediaItems([...mediaItems, { 
        url: base64String, 
        type: file.type.startsWith('video') ? 'video' : 'image' 
      }]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const handleLike = async (postId: string, authorId: string) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: increment(1)
      });

      if (authorId !== user.uid) {
        await sendNotification(
          authorId,
          'post_like',
          'New Like',
          `${profile?.displayName || 'Someone'} liked your post.`,
          '/feed',
          { postId, likerId: user.uid }
        );
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return posts;
    const term = searchTerm.toLowerCase();
    return posts.filter(post => 
      post.content.toLowerCase().includes(term) || 
      post.authorName.toLowerCase().includes(term)
    );
  }, [posts, searchTerm]);

  const handleShare = async (postId: string, type: 'internal' | 'external') => {
    const postUrl = `${window.location.origin}/feed?post=${postId}`;
    
    if (type === 'external') {
      if (navigator.share) {
        navigator.share({
          title: 'Check out this post on the network',
          url: postUrl
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(postUrl);
        alert('Link copied to clipboard!');
      }
    } else {
      // Internal share logic - Repost
      if (!user || !profile) return;
      
      const originalPost = posts.find(p => p.id === postId);
      if (!originalPost) return;

      try {
        await addDoc(collection(db, 'posts'), {
          authorId: user.uid,
          authorName: profile.displayName,
          authorPhoto: profile.photoURL || '',
          authorRole: profile.role,
          content: `Reposted from ${originalPost.authorName}`,
          repostOf: postId,
          likesCount: 0,
          commentsCount: 0,
          repostsCount: 0,
          createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, 'posts', postId), {
          repostsCount: increment(1)
        });

        if (originalPost.authorId !== user.uid) {
          await sendNotification(
            originalPost.authorId,
            'post_repost',
            'Post Reposted',
            `${profile.displayName} reposted your post.`,
            '/feed',
            { postId, reposterId: user.uid }
          );
        }
        alert('Post shared to your network!');
      } catch (error) {
        console.error("Error reposting:", error);
      }
    }
    setSharingPostId(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="sticky top-16 z-10 bg-slate-50/80 backdrop-blur-md py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search posts by content or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Create Post Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex gap-4">
          <img 
            src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
            alt="Profile" 
            className="w-12 h-12 rounded-full border border-slate-100 shadow-sm"
          />
          <form onSubmit={handleCreatePost} className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's on your mind? Share an update or achievement..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none min-h-[120px] transition-all"
            />
            
            {/* Media Previews */}
            {mediaItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {mediaItems.map((item, idx) => (
                  <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                    {item.type === 'image' ? (
                      <img src={item.url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <VideoIcon className="w-8 h-8 text-white opacity-50" />
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Media Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,video/*" 
              className="hidden" 
            />
            <AnimatePresence>
              {isAddingMedia && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                >
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setMediaTypeInput('image')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mediaTypeInput === 'image' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                      <ImageIcon className="w-4 h-4" /> Image
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMediaTypeInput('video')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mediaTypeInput === 'video' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                      <VideoIcon className="w-4 h-4" /> Video
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="Paste media URL here..."
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                      type="button"
                      onClick={handleAddMedia}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                <button 
                  type="button"
                  onClick={() => toggleMediaInput('image')}
                  className={`p-2 rounded-xl transition-colors ${isAddingMedia && mediaTypeInput === 'image' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title="Add Image URL"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => toggleMediaInput('video')}
                  className={`p-2 rounded-xl transition-colors ${isAddingMedia && mediaTypeInput === 'video' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title="Add Video URL"
                >
                  <VideoIcon className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddingMedia(!isAddingMedia)}
                  className={`p-2 rounded-xl transition-colors ${isAddingMedia ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title="Link Media"
                >
                  <LinkIcon className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                  title="Upload Media"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
              <button
                type="submit"
                disabled={(!newPostContent.trim() && mediaItems.length === 0) || isSubmitting}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Post
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {filteredPosts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onShareClick={() => setSharingPostId(post.id)}
          />
        ))}
        
        {filteredPosts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No posts found</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">
              We couldn't find any posts matching your search. Try different keywords.
            </p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {sharingPostId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Share Post</h3>
                  <button onClick={() => setSharingPostId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => handleShare(sharingPostId, 'internal')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                      <Repeat className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Share to Network</p>
                      <p className="text-sm text-slate-500">Post this to your feed</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => handleShare(sharingPostId, 'external')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                      <LinkIcon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Copy Link</p>
                      <p className="text-sm text-slate-500">Share externally</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
