import React, { useState, useEffect } from 'react';
import { FileText, Image, Edit3, Plus, Trash2, Eye, Save, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { defaultWebsiteContent } from '../lib/defaultContent';

function HomepageEditor() {
  const [content, setContent] = useState(defaultWebsiteContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [jsonText, setJsonText] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'website_content', 'home');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { ...defaultWebsiteContent, ...docSnap.data() } as typeof defaultWebsiteContent;
          setContent(data);
          setJsonText(JSON.stringify(data, null, 2));
        } else {
          setJsonText(JSON.stringify(defaultWebsiteContent, null, 2));
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      let finalContent = content;
      try {
        finalContent = JSON.parse(jsonText);
      } catch (e) {
        // If JSON is invalid, use the last valid content state
        console.warn("Invalid JSON, saving last valid state");
      }

      const docRef = doc(db, 'website_content', 'home');
      await setDoc(docRef, {
        ...finalContent,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid
      });
      setContent(finalContent);
      setJsonText(JSON.stringify(finalContent, null, 2));
      setMessage('Content saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error saving content:", error);
      setMessage('Error saving content.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section: string, field: string, value: any) => {
    const newContent = {
      ...content,
      [section]: {
        ...(content as any)[section],
        [field]: value
      }
    };
    setContent(newContent);
    setJsonText(JSON.stringify(newContent, null, 2));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Homepage Content</h3>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Hero Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tagline</label>
          <input type="text" value={content.hero.tagline} onChange={e => handleChange('hero', 'tagline', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.hero.title} onChange={e => handleChange('hero', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.hero.subtitle} onChange={e => handleChange('hero', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary CTA</label>
            <input type="text" value={content.hero.ctaPrimary} onChange={e => handleChange('hero', 'ctaPrimary', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Secondary CTA</label>
            <input type="text" value={content.hero.ctaSecondary} onChange={e => handleChange('hero', 'ctaSecondary', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Features Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.features.title} onChange={e => handleChange('features', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.features.subtitle} onChange={e => handleChange('features', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
      </div>

      {/* Students Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Students Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.students.title} onChange={e => handleChange('students', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.students.subtitle} onChange={e => handleChange('students', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
      </div>

      {/* Professors Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Professors Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.professors.title} onChange={e => handleChange('professors', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Button Text</label>
          <input type="text" value={content.professors.cta} onChange={e => handleChange('professors', 'cta', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Points (comma separated)</label>
          <textarea 
            value={content.professors.points.join(', ')} 
            onChange={e => handleChange('professors', 'points', e.target.value.split(',').map(s => s.trim()))} 
            className="w-full p-2 border border-slate-300 rounded-lg h-24" 
          />
        </div>
      </div>

      {/* Stories Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Stories Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.stories.title} onChange={e => handleChange('stories', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.stories.subtitle} onChange={e => handleChange('stories', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Testimonials Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.testimonials.title} onChange={e => handleChange('testimonials', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.testimonials.subtitle} onChange={e => handleChange('testimonials', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
      </div>

      {/* Community Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Community Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.community.title} onChange={e => handleChange('community', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.community.subtitle} onChange={e => handleChange('community', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
      </div>

      {/* Opportunities Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Opportunities Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.opportunities.title} onChange={e => handleChange('opportunities', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.opportunities.subtitle} onChange={e => handleChange('opportunities', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
      </div>

      {/* Universities Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Universities Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.universities.title} onChange={e => handleChange('universities', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.universities.subtitle} onChange={e => handleChange('universities', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Universities List (comma separated)</label>
          <textarea 
            value={content.universities.list.join(', ')} 
            onChange={e => handleChange('universities', 'list', e.target.value.split(',').map(s => s.trim()))} 
            className="w-full p-2 border border-slate-300 rounded-lg h-24" 
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Bottom CTA Section</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={content.cta.title} onChange={e => handleChange('cta', 'title', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <textarea value={content.cta.subtitle} onChange={e => handleChange('cta', 'subtitle', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg h-24" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Button Text</label>
          <input type="text" value={content.cta.button} onChange={e => handleChange('cta', 'button', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </div>
      </div>
      
      {/* Advanced JSON Editor for the rest */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="font-semibold text-slate-900 text-lg border-b border-slate-200 pb-2">Advanced Content (JSON)</h4>
        <p className="text-sm text-slate-500 mb-2">Edit other sections directly in JSON format.</p>
        <textarea 
          value={jsonText} 
          onChange={e => {
            setJsonText(e.target.value);
            try {
              const parsed = JSON.parse(e.target.value);
              setContent(parsed);
            } catch (err) {
              // Ignore parse errors while typing
            }
          }}
          className="w-full p-4 border border-slate-300 rounded-lg h-96 font-mono text-sm bg-slate-900 text-green-400" 
        />
      </div>

    </div>
  );
}

export function AdminContent() {
  const [activeTab, setActiveTab] = useState('homepage');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Content Management</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('homepage')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'homepage' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Image className="w-5 h-5" />
              Homepage Content
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'pages' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-5 h-5" />
              Static Pages
            </button>
            <button
              onClick={() => setActiveTab('blog')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'blog' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Edit3 className="w-5 h-5" />
              Blog / Articles
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[800px]">
          {activeTab === 'homepage' && <HomepageEditor />}

          {activeTab === 'pages' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Manage Static Pages</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">Page Title</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">URL Slug</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">Last Updated</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {['About Us', 'Terms of Service', 'Privacy Policy', 'Contact', 'Guidelines'].map((page, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{page}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-sm">/{page.toLowerCase().replace(/ /g, '-')}</td>
                        <td className="px-6 py-4 text-slate-600 text-sm">2 days ago</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="View">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                              <Edit3 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Blog & Articles</h3>
              
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No articles yet</h3>
                <p className="text-slate-500 mt-1 mb-6">Start writing to engage your audience.</p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Write First Article
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
