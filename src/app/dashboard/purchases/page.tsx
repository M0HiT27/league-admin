'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { passService, PurchaseSummaryDTO } from '@/api/client/services/pass.service';
import { Search, Mail, Ticket, Calendar, User, ArrowRight, AlertCircle, Loader2, RefreshCw , Phone} from 'lucide-react';

interface PurchasesSearchPageProps {
  searchParams?: Promise<{ email?: string }>;
}

export default function PurchasesSearchPage({ searchParams }: PurchasesSearchPageProps) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const initialEmail = resolvedSearchParams?.email ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [searchedEmail, setSearchedEmail] = useState('');
  const [purchases, setPurchases] = useState<PurchaseSummaryDTO[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter a valid email address to search.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await passService.getPurchasesByEmail(trimmedEmail);
      setPurchases(response?.purchases || []);
      setSearchedEmail(trimmedEmail);
      setHasSearched(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to find purchases for this email.');
      setPurchases([]);
      setHasSearched(true);
      setSearchedEmail(trimmedEmail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (purchaseId: number) => {
    router.push(`/dashboard/edit-selected-games/${purchaseId}`);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'CONFIRMED' || s === 'SUCCESS' || s === 'PAID') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s === 'PENDING') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (s === 'CANCELLED' || s === 'FAILED') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-10 px-4">
      {/* Search Header and Input */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Search Customer Purchases</h2>
        <p className="text-sm text-slate-500 mb-5">
          Enter a customer's email address to retrieve all associated pass purchases and manage their selected games.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search Purchases
              </>
            )}
          </button>
        </form>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>Quick test:</span>
          <button
            type="button"
            onClick={() => {
              setEmail('alex@example.com');
            }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            alex@example.com
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setEmail('john@example.com');
            }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            john@example.com
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Search Failed</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Initial Empty State (When no search has been made) */}
      {!hasSearched && !isLoading && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No purchases displayed</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Please enter an email in the search bar above to look up linked passes and customer purchase history.
          </p>
        </div>
      )}

      {/* Search Results List */}
      {hasSearched && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-700">
              Purchases for <span className="text-blue-600 font-bold">{searchedEmail}</span> ({purchases.length})
            </h3>
            <button
              onClick={() => handleSearch()}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-base font-semibold text-slate-800">No Purchases Found</h4>
              <p className="text-sm text-slate-500 mt-1">
                There are no active or historic pass purchases associated with <span className="font-medium">{searchedEmail}</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => {
                const formattedDate = purchase.purchase_time
                  ? new Date(purchase.purchase_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A';

                return (
                  <div
                    key={purchase.purchase_id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Ticket className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{purchase.pass_name}</h4>
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            ID: #{purchase.purchase_id}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadge(
                              purchase.status
                            )}`}
                          >
                            {purchase.status || 'CONFIRMED'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {purchase.person_name || 'Guest'}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {purchase.mobile || 'Guest'}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleEdit(purchase.purchase_id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm w-full sm:w-auto justify-center"
                      >
                        Edit Selected Games
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}