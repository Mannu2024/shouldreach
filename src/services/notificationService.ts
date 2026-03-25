import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Notification } from '../types';

export const sendNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  content: string,
  link?: string,
  metadata?: Record<string, any>
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      content,
      link,
      read: false,
      createdAt: new Date().toISOString(),
      metadata
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
