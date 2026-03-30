import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Post, PostMedia, Comment, Reaction, ReactionType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  Award,
  Heart as HeartIcon,
  Lightbulb,
  Laugh,
  Handshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { sendNotification } from '../services/notificationService';

interface PostCardProps {
  post: Post;
  onShareClick: () => void;
}

const REACTION_TYPES: { type: ReactionType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: 'like', icon: <ThumbsUp className="w-4 h-4" />, label: 'Like', color: 'text-blue-600' },
  { type: 'celebrate', icon: <Award className="w-4 h-4" />, label: 'Celebrate', color: 'text-green-600' },
  { type: 'support', icon: <Handshake className="w-4 h-4" />, label: 'Support', color: 'text-purple-600' },
  { type: 'love', icon: <HeartIcon className="w-4 h-4" />, label: 'Love', color: 'text-red-600' },
  { type: 'insightful', icon: <Lightbulb className="w-4 h-4" />, label: 'Insightful', color: 'text-amber-600' },
  { type: 'funny', icon: <Laugh className="w-4 h-4" />, label: 'Funny', color: 'text-sky-600' },
];

export function PostCard({ post, onShareClick }: PostCardProps) {
  const { user, profile } = useAuthStore();
  const [showReactions, setShowReactions] = useState(false);
  const [userReaction, setUserReaction] = useState<Reaction | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [originalPost, setOriginalPost] = useState<Post | null>(null);

  const media = post.media || (post.mediaUrl ? [{ url: post.mediaUrl, type: 'image' as const }] : []);

  // Fetch original post if it's a repost
  useEffect(() => {
    if (post.repostOf) {
      const fetchOriginal = async () => {
        const docRef = doc(db, 'posts', post.repostOf!);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOriginalPost({ id: docSnap.id, ...docSnap.data() } as Post);
        }
      };
      fetchOriginal();
    }
  }, [post.repostOf]);

  // Fetch user's reaction
  useEffect(() => {
    if (!user || !post.id) return;
    const q = query(
      collection(db, 'reactions'),
      where('postId', '==', post.id),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setUserReaction({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Reaction);
      } else {
        setUserReaction(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reactions');
    });
    return () => unsubscribe();
  }, [user?.uid, post.id]);

  // Fetch comments
  useEffect(() => {
    if (!showComments || !post.id) return;
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', post.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });
    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleReaction = async (type: ReactionType) => {
    if (!user || !profile) return;
    setShowReactions(false);

    try {
      if (userReaction) {
        if (userReaction.type === type) {
          // Remove reaction
          await deleteDoc(doc(db, 'reactions', userReaction.id));
          await updateDoc(doc(db, 'posts', post.id), {
            likesCount: increment(-1)
          });
        } else {
          // Update reaction
          await updateDoc(doc(db, 'reactions', userReaction.id), {
            type,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Add new reaction
        await addDoc(collection(db, 'reactions'), {
          postId: post.id,
          userId: user.uid,
          type,
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'posts', post.id), {
          likesCount: increment(1)
        });

        if (post.authorId !== user.uid) {
          await sendNotification(
            post.authorId,
            'post_like',
            'New Reaction',
            `${profile.displayName} reacted with ${type} to your post.`,
            '/feed',
            { postId: post.id, userId: user.uid, reactionType: type }
          );
        }
      }
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !profile) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
        content: newComment,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });

      if (post.authorId !== user.uid) {
        await sendNotification(
          post.authorId,
          'post_comment',
          'New Comment',
          `${profile.displayName} commented on your post.`,
          '/feed',
          { postId: post.id, userId: user.uid }
        );
      }

      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const currentReaction = REACTION_TYPES.find(r => r.type === userReaction?.type);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
      {/* Repost Header */}
      {post.repostOf && (
        <div className="px-5 pt-3 flex items-center gap-2 text-slate-500 text-sm border-b border-slate-50 pb-2">
          <Share2 className="w-4 h-4" />
          <span className="font-medium">{post.authorName} reposted this</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img 
              src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}&background=random`} 
              alt={post.authorName} 
              className="w-12 h-12 rounded-full border border-slate-100 shadow-sm"
            />
            <div>
              <h3 className="font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer">{post.authorName}</h3>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <span className="capitalize px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{post.authorRole}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              </p>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed mb-4 break-words">{post.content}</p>

        {/* Original Post Content for Reposts */}
        {post.repostOf && originalPost && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={originalPost.authorPhoto || `https://ui-avatars.com/api/?name=${originalPost.authorName}&background=random`} 
                alt={originalPost.authorName} 
                className="w-6 h-6 rounded-full"
              />
              <span className="font-bold text-sm">{originalPost.authorName}</span>
              <span className="text-xs text-slate-500">• {formatDistanceToNow(new Date(originalPost.createdAt), { addSuffix: true })}</span>
            </div>
            <p className="text-sm text-slate-700 line-clamp-3">{originalPost.content}</p>
          </div>
        )}
      </div>
      
      {media.length > 0 && (
        <MediaCarousel media={media} />
      )}
      
      <div className="px-5 py-2 flex items-center justify-between border-t border-slate-50 relative">
        <div className="flex items-center gap-1">
          {/* Reaction Button with Hover Menu */}
          <div 
            className="relative"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            <button 
              onClick={() => handleReaction('like')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all group ${userReaction ? currentReaction?.color : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
            >
              {userReaction ? currentReaction?.icon : <ThumbsUp className="w-5 h-5 group-active:scale-125 transition-transform" />}
              <span className="text-sm font-bold">{userReaction ? currentReaction?.label : 'Like'}</span>
              {post.likesCount > 0 && <span className="ml-1 text-xs">{post.likesCount}</span>}
            </button>

            <AnimatePresence>
              {showReactions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border border-slate-100 p-1 flex gap-1 z-20"
                >
                  {REACTION_TYPES.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleReaction(r.type)}
                      className="p-2 hover:bg-slate-50 rounded-full transition-all hover:scale-125 group relative"
                      title={r.label}
                    >
                      <span className={r.color}>{r.icon}</span>
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {r.label}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${showComments ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-bold">Comment</span>
            {post.commentsCount > 0 && <span className="ml-1 text-xs">{post.commentsCount}</span>}
          </button>
        </div>

        <button 
          onClick={onShareClick}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-bold">Share</span>
          {post.repostsCount && post.repostsCount > 0 ? <span className="ml-1 text-xs">{post.repostsCount}</span> : null}
        </button>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-50 bg-slate-50/50 overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-3">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
                  alt="My Profile" 
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-white border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-indigo-600 hover:bg-indigo-50 rounded-full disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img 
                      src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}&background=random`} 
                      alt={comment.authorName} 
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900">{comment.authorName}</span>
                          <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-slate-700">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MediaCarousel({ media }: { media: PostMedia[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % media.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);

  return (
    <div className="relative group aspect-video bg-slate-900 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          {media[currentIndex].type === 'image' ? (
            <img 
              src={media[currentIndex].url} 
              alt={`Media ${currentIndex + 1}`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <video 
              src={media[currentIndex].url} 
              controls 
              className="w-full h-full object-contain"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {media.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/40'}`}
              />
            ))}
          </div>
          
          <div className="absolute top-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-widest">
            {currentIndex + 1} / {media.length}
          </div>
        </>
      )}
    </div>
  );
}
