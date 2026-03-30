import React, { useState } from 'react';
import { Settings, Shield, Key, Palette, Save } from 'lucide-react';

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Platform Settings</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'general' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-5 h-5" />
              General
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'security' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Shield className="w-5 h-5" />
              Security & Access
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'api' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Key className="w-5 h-5" />
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'branding' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Palette className="w-5 h-5" />
              Branding
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6 md:p-8">
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-6">General Configuration</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Platform Name</label>
                <input 
                  type="text" 
                  defaultValue="ShouldReach"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
                <input 
                  type="email" 
                  defaultValue="support@shouldreach.com"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Maintenance Mode</label>
                <div className="flex items-center gap-3">
                  <div className="relative inline-block w-12 h-6 rounded-full bg-slate-200 transition-colors">
                    <input type="checkbox" className="peer sr-only" id="maintenance" />
                    <label htmlFor="maintenance" className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-6 cursor-pointer"></label>
                  </div>
                  <span className="text-sm text-slate-600">Enable maintenance mode (only admins can login)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Security Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Two-Factor Authentication (Admins)</label>
                <div className="flex items-center gap-3">
                  <div className="relative inline-block w-12 h-6 rounded-full bg-indigo-600 transition-colors">
                    <input type="checkbox" className="peer sr-only" id="2fa" defaultChecked />
                    <label htmlFor="2fa" className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform translate-x-6 cursor-pointer"></label>
                  </div>
                  <span className="text-sm text-slate-600">Require 2FA for all admin accounts</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Session Timeout</label>
                <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="1440">24 Hours</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Automatically log out inactive admin sessions.</p>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-6">API Keys & Integrations</h3>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-6">
                <strong>Warning:</strong> Keep your API keys secure. Do not share them or expose them in client-side code.
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Stripe Secret Key</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    defaultValue="sk_test_1234567890abcdef"
                    className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                    Reveal
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SendGrid API Key</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    defaultValue="SG.1234567890abcdef"
                    className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                    Reveal
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Branding & Appearance</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">Primary Brand Color</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-600 border-2 border-slate-200 shadow-sm"></div>
                  <input 
                    type="text" 
                    defaultValue="#4F46E5"
                    className="w-32 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">Platform Logo</label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    Logo
                  </div>
                  <div className="space-y-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                      Upload New Logo
                    </button>
                    <p className="text-xs text-slate-500">Recommended size: 256x256px (PNG or SVG)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
