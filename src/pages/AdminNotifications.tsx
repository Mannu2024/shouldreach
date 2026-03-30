import React, { useState } from 'react';
import { Bell, Send, Users, MessageSquare, AlertTriangle } from 'lucide-react';

export function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [type, setType] = useState('info');

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to Firestore and trigger a Cloud Function
    alert(`Notification sent to ${target} users!`);
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Notification Management</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Send New Notification
          </h3>
          
          <form onSubmit={handleSendNotification} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
                <select 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                  <option value="professors">Professors Only</option>
                  <option value="alumni">Alumni Only</option>
                  <option value="active">Active Users (Last 30 days)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notification Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="info">Information</option>
                  <option value="success">Success / Update</option>
                  <option value="warning">Warning / Alert</option>
                  <option value="promotional">Promotional</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notification Title</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Platform Update: New Features Available!"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Message Content</label>
              <textarea 
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Enter the notification message here..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Notification
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-500" />
            Recent Broadcasts
          </h3>
          
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider">
                    All Users
                  </span>
                  <span className="text-xs text-slate-400">2 days ago</span>
                </div>
                <h4 className="font-medium text-slate-900 text-sm mb-1">System Maintenance Complete</h4>
                <p className="text-xs text-slate-600 line-clamp-2">The scheduled maintenance has been completed successfully. All services are now fully operational.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
