import React from 'react';
import { BarChart3, TrendingUp, Users, Download, Calendar } from 'lucide-react';

export function AdminReports() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Analytics & Reports</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Last 30 Days</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">User Growth</h3>
          </div>
          <div className="h-48 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Line Chart Placeholder</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Conversion Rate</h3>
          </div>
          <div className="h-48 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Bar Chart Placeholder</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Engagement Metrics</h3>
          </div>
          <div className="h-48 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Pie Chart Placeholder</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Detailed Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Metric</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Current Period</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Previous Period</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">New Signups</td>
                <td className="px-6 py-4 text-slate-600">1,245</td>
                <td className="px-6 py-4 text-slate-600">1,100</td>
                <td className="px-6 py-4 text-emerald-600 font-medium">+13.1%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">Active Users</td>
                <td className="px-6 py-4 text-slate-600">8,432</td>
                <td className="px-6 py-4 text-slate-600">7,950</td>
                <td className="px-6 py-4 text-emerald-600 font-medium">+6.0%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">Posts Created</td>
                <td className="px-6 py-4 text-slate-600">3,210</td>
                <td className="px-6 py-4 text-slate-600">3,400</td>
                <td className="px-6 py-4 text-red-600 font-medium">-5.5%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">Support Tickets</td>
                <td className="px-6 py-4 text-slate-600">145</td>
                <td className="px-6 py-4 text-slate-600">120</td>
                <td className="px-6 py-4 text-red-600 font-medium">+20.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
