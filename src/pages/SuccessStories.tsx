import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../firebase';
import { collection, query, getDocs, where, orderBy, addDoc } from 'firebase/firestore';
import { SuccessStory } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Star, TrendingUp, Plus, X } from 'lucide-react';

export function SuccessStories() {
  const { user, profile } = useAuthStore();
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'Placement' });

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const q = query(
          collection(db, 'success_stories'), 
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const storiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SuccessStory[];
        setStories(storiesData);
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };

    fetchStories();
  }, []);

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      await addDoc(collection(db, 'success_stories'), {
        authorId: user.uid,
        authorName: profile.displayName,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({ title: '', content: '', category: 'Placement' });
      alert('Story submitted successfully! It will be visible after admin approval.');
    } catch (error) {
      console.error("Error submitting story:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Inspiring Journeys</h1>
            <p className="text-lg text-indigo-100 leading-relaxed">
              Read success stories from students and alumni across India. Learn from their experiences in placements, research, startups, and higher education.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Share Your Story
          </button>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stories.map((story) => (
          <div key={story.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {story.authorName.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{story.authorName}</h3>
                <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}</p>
              </div>
              <span className="ml-auto px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                {story.category}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">{story.title}</h2>
            <p className="text-slate-600 leading-relaxed flex-1 whitespace-pre-wrap line-clamp-4">
              {story.content}
            </p>
            
            <button className="mt-6 text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
              Read full story <TrendingUp className="w-4 h-4 ml-1" />
            </button>
          </div>
        ))}
        
        {stories.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No stories yet</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">Be the first to share your success story and inspire thousands of students across India.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900">Share Your Success Story</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitStory} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Story Title</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., How I cracked my dream job at Google"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Placement">Placement / Job</option>
                  <option value="Internship">Internship</option>
                  <option value="Startup">Startup / Entrepreneurship</option>
                  <option value="Research">Research / Publication</option>
                  <option value="Higher Education">Higher Education (Masters/PhD)</option>
                  <option value="Scholarship">Scholarship</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Story</label>
                <textarea 
                  required
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="Share your journey, challenges faced, and advice for others..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[200px] resize-y"
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
