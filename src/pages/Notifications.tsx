import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { Notification } from '../types';
import { Bell, Check, Trash2, MessageSquare, UserPlus, Heart, Info, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_message': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'connection_request': return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case 'connection_accepted': return <Check className="w-5 h-5 text-emerald-500" />;
      case 'post_like': return <Heart className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Stay updated with your network activity.</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 sm:p-6 flex gap-4 transition-colors ${notification.read ? 'bg-white' : 'bg-indigo-50/30'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notification.read ? 'bg-slate-100' : 'bg-white shadow-sm border border-indigo-100'
                }`}>
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`text-sm font-bold text-slate-900 ${notification.read ? '' : 'text-indigo-900'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {notification.content}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mt-1">
                      {format(new Date(notification.createdAt), 'MMM d, HH:mm')}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    {notification.link && (
                      <Link 
                        to={notification.link}
                        onClick={() => markAsRead(notification.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                      >
                        View details
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {!notification.read && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-wider"
                      >
                        Mark as read
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs font-bold text-slate-400 hover:text-red-600 uppercase tracking-wider ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No notifications yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              When you have activity like new messages or connection requests, they'll show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
