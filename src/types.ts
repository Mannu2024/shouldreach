export type UserRole = 'student' | 'professor' | 'alumni' | 'admin';
export type ProfileVisibility = 'public' | 'connections' | 'private';

export interface Education {
  id: string;
  university: string;
  college: string;
  city?: string;
  state?: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade: string;
  description: string;
}

export interface Experience {
  id: string;
  organization: string;
  role: string;
  type: string; // Internship / Job / Research
  startDate: string;
  endDate: string;
  description: string;
  achievements: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  issuer: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string;
  link: string;
  duration: string;
  imageUrl?: string;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  date: string;
  link: string;
}

export interface Publication {
  id: string;
  title: string;
  journal: string;
  date: string;
  link: string;
  abstract: string;
}

export interface Extracurricular {
  id: string;
  organization: string;
  role: string;
  duration: string;
  description: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  googleScholar?: string;
  twitter?: string;
}

export interface ProfileAnalytics {
  views: number;
  connections: number;
  followers: number;
  postEngagement: number;
}

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  messagingPermissions: 'anyone' | 'connections';
  emailVisibility: 'public' | 'connections' | 'private';
  whoCanConnect: 'anyone' | 'nobody';
}

export interface UserProfile {
  uid: string;
  role: UserRole;
  email: string;
  phoneNumber?: string;
  displayName: string;
  photoURL?: string;
  coverURL?: string;
  headline?: string;
  city?: string;
  state?: string;
  currentYear?: string;
  university?: string;
  collegeCity?: string;
  collegeState?: string;
  department?: string;
  bio?: string;
  about?: string;
  skills?: string[];
  interests?: string[];
  connectionsCount: number;
  isVerified: boolean;
  isProfileComplete?: boolean;
  isOpenToWork?: boolean;
  aiAdvice?: string;
  visibility: ProfileVisibility;
  createdAt: string;
  lastSeen?: string;

  education?: Education[];
  experience?: Experience[];
  achievements?: Achievement[];
  projects?: Project[];
  certifications?: Certification[];
  publications?: Publication[];
  extracurriculars?: Extracurricular[];
  socialLinks?: SocialLinks;
  analytics?: ProfileAnalytics;
  privacy?: PrivacySettings;
  followedCompanies?: string[];
}

export interface PostMedia {
  url: string;
  type: 'image' | 'video';
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorRole?: string;
  content: string;
  mediaUrl?: string;
  media?: PostMedia[];
  likesCount: number;
  commentsCount: number;
  repostsCount?: number;
  repostOf?: string; // ID of the original post if this is a repost
  originalPost?: Post; // Populated for UI if it's a repost
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
}

export type ReactionType = 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'funny';

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
}

export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface SuccessStory {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'post' | 'profile' | 'story';
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: Record<string, number>;
  typingStatus?: Record<string, boolean>;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'connection_request' | 'connection_accepted' | 'new_message' | 'post_like' | 'post_comment' | 'post_repost' | 'system';
  title: string;
  content: string;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  invoiceId?: string;
  createdAt: string;
}

export interface AdminActivity {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  createdAt: string;
}


