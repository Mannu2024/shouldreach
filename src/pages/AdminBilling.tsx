import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Transaction } from '../types';
import { Search, Filter, Download, CreditCard, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AdminBilling() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const transQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
        const transSnap = await getDocs(transQ);
        setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    return statusFilter === 'all' || t.status === statusFilter;
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
        <h2 className="text-2xl font-bold text-slate-900">Billing & Payments</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Transaction ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">User</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Amount</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500">{t.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{t.userName}</p>
                    <p className="text-xs text-slate-500">{t.userId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">{t.currency} {t.amount.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      t.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'failed' ? 'bg-red-100 text-red-800' :
                      t.status === 'refunded' ? 'bg-slate-100 text-slate-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status === 'success' && <CheckCircle className="w-3 h-3" />}
                      {t.status === 'failed' && <XCircle className="w-3 h-3" />}
                      {t.status === 'pending' && <Clock className="w-3 h-3" />}
                      {t.status === 'refunded' && <RefreshCw className="w-3 h-3" />}
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {t.status === 'success' && (
                        <button className="text-sm font-medium text-amber-600 hover:text-amber-700">
                          Refund
                        </button>
                      )}
                      <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 ml-3">
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p>No transactions found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
