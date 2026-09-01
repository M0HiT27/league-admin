'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { passService, InvalidPurchaseDTO } from '@/api/client/services/pass.service';
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Search,
  User,
  Mail,
  Ticket,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Phone
} from 'lucide-react';

export default function InvalidPurchasesPage() {
  const router = useRouter();

  const [purchases, setPurchases] = useState<InvalidPurchaseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvalidPurchases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await passService.getInvalidPurchases();
      console.log('Fetched invalid purchases:', data);
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invalid purchases.');
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvalidPurchases();
  }, []);

  const handleEdit = (purchaseId: number) => {
    router.push(`/dashboard/edit-selected-games/${purchaseId}`);
  };

  const filteredPurchases = purchases.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.id?.toString().includes(q) ||
      item.name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.pass_name?.toLowerCase().includes(q) ||
      item.mobile?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-10 px-4">
      {/* Header card with explanation & search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">Invalid Purchases</h2>
                {!isLoading && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {purchases.length} require review
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Purchases where the selected game allocations do not meet the pass requirements or contain discontinued games. Use the button below to re-assign valid games.
              </p>
            </div>
          </div>

          <button
            onClick={fetchInvalidPurchases}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
        </div>

        {/* Filter input */}
        <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by buyer name, email, pass, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Failed to fetch invalid purchases</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchInvalidPurchases}
            className="text-xs font-semibold text-red-700 underline hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading invalid purchases...</p>
          <p className="text-xs text-slate-400 mt-1">Checking purchase allocations against pass rules</p>
        </div>
      )}

      {/* Empty State: No invalid purchases at all */}
      {!isLoading && !error && purchases.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All Purchases Valid!</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            There are currently no purchases with invalid game selections or discontinued game conflicts.
          </p>
        </div>
      )}

      {/* Search No Results */}
      {!isLoading && !error && purchases.length > 0 && filteredPurchases.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">No matching invalid purchases</h4>
          <p className="text-xs text-slate-500 mt-1">
            No purchases match the query &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Content Table / Cards */}
      {!isLoading && !error && filteredPurchases.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Responsive Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3.5">Purchase ID</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Pass Name</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
                        #{purchase.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{purchase.name || 'Guest'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {purchase.email}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {purchase.mobile}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <Ticket className="w-4 h-4 text-blue-500" />
                        {purchase.pass_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Action Required
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(purchase.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        Edit Selected Games
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredPurchases.map((purchase) => (
              <div key={purchase.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    ID #{purchase.id}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    Invalid Games
                  </span>
                </div>

                <div>
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {purchase.name || 'Guest'}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {purchase.email}
                  </div>
                </div>

                <div className="text-xs text-slate-700 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <Ticket className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium">{purchase.pass_name}</span>
                </div>

                <button
                  onClick={() => handleEdit(purchase.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Edit Selected Games
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}