import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { Users, UserPlus, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { UserProfile, Post, Report, SuccessStory } from '../types';
import { formatDistanceToNow } from 'date-fns';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newSignups: 0,
    revenue: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch users
        const usersQ = query(collection(db, 'users'));
        const usersSnap = await getDocs(usersQ);
        const users = usersSnap.docs.map(d => d.data() as UserProfile);
        
        // Calculate stats
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        
        const newSignups = users.filter(u => new Date(u.createdAt) > thirtyDaysAgo).length;
        const activeUsers = users.filter(u => u.lastSeen && new Date(u.lastSeen) > thirtyDaysAgo).length;

        setStats({
          totalUsers: users.length,
          activeUsers: activeUsers || Math.floor(users.length * 0.7), // Fallback if lastSeen not widely used
          newSignups,
          revenue: 12450, // Mock revenue
        });

        // Fetch recent activities (combining posts, reports, stories for a feed)
        const postsQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(5));
        const postsSnap = await getDocs(postsQ);
        const recentPosts = postsSnap.docs.map(d => ({ ...d.data(), type: 'post', id: d.id }));

        const reportsQ = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(5));
        const reportsSnap = await getDocs(reportsQ);
        const recentReports = reportsSnap.docs.map(d => ({ ...d.data(), type: 'report', id: d.id }));

        const storiesQ = query(collection(db, 'success_stories'), orderBy('createdAt', 'desc'), limit(5));
        const storiesSnap = await getDocs(storiesQ);
        const recentStories = storiesSnap.docs.map(d => ({ ...d.data(), type: 'story', id: d.id }));

        const combined = [...recentPosts, ...recentReports, ...recentStories] as any[];
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentActivities(combined.slice(0, 8));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, trend: '+12%', isPositive: true },
    { title: 'Active Users (30d)', value: stats.activeUsers.toLocaleString(), icon: Activity, trend: '+5%', isPositive: true },
    { title: 'New Signups (30d)', value: stats.newSignups.toLocaleString(), icon: UserPlus, trend: '-2%', isPositive: false },
    { title: 'Monthly Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, trend: '+18%', isPositive: true },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm">
                {stat.isPositive ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={stat.isPositive ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                  {stat.trend}
                </span>
                <span className="text-slate-500">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area (Placeholder) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">User Growth Overview</h3>
          <div className="h-64 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
            <p className="text-slate-400 font-medium">Chart Visualization (Recharts/D3 would go here)</p>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full shrink-0 bg-indigo-500"></div>
                <div>
                  <p className="text-sm text-slate-800">
                    {activity.type === 'post' && <span className="font-medium">{activity.authorName}</span>}
                    {activity.type === 'report' && <span className="font-medium">New report</span>}
                    {activity.type === 'story' && <span className="font-medium">{activity.authorName}</span>}
                    {' '}
                    {activity.type === 'post' && 'created a new post.'}
                    {activity.type === 'report' && ` submitted against a ${activity.targetType}.`}
                    {activity.type === 'story' && ' submitted a success story.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
