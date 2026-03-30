import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Ticket } from '../types';
import { Search, Filter, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const ticketsQ = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
        const ticketsSnap = await getDocs(ticketsQ);
        setTickets(ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Ticket[]);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleStatusChange = async (ticketId: string, newStatus: 'open' | 'in-progress' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    return statusFilter === 'all' || ticket.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Customer Support Tickets</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map(ticket => (
          <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                  ticket.priority === 'high' ? 'bg-red-100 text-red-700' :
                  ticket.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {ticket.priority} Priority
                </span>
                <span className="text-sm font-medium text-slate-500">#{ticket.id.slice(0, 8)}</span>
                <span className="text-sm text-slate-400">• {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{ticket.category}</h3>
              <p className="text-slate-600 text-sm mb-4">{ticket.description}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-medium text-xs">
                    {ticket.userName.charAt(0)}
                  </div>
                  <span className="font-medium text-slate-700">{ticket.userName}</span>
                  <span className="text-slate-400">({ticket.userEmail})</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-between md:items-end gap-4 md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
              <div className="w-full">
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select 
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(ticket.id, e.target.value as any)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none ${
                    ticket.status === 'open' ? 'bg-red-50 border-red-200 text-red-700' :
                    ticket.status === 'in-progress' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                <MessageSquare className="w-4 h-4" />
                Reply / Notes
              </button>
            </div>
          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
            <p className="text-slate-500 mt-1">Your support queue is empty!</p>
          </div>
        )}
      </div>
    </div>
  );
}
