'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  passService,
  GetSelectedGamesResponse,
  ClientPass,
  ClientGame,
  SelectedGameDTO,
} from '@/api/client/services/pass.service';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Save,
  Gamepad2,
  ShieldAlert,
  Info,
  Clock,
  Users,
  RefreshCw,
} from 'lucide-react';

export type GameDifficulty = 'LIGHT' | 'MEDIUM' | 'HEAVY';

const getDifficultyStyles = (difficulty: GameDifficulty | string | null | undefined) => {
  switch (difficulty) {
    case 'LIGHT':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'HEAVY':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'border-slate-200 text-slate-600 bg-slate-100';
  }
};

interface EditSelectedGamesPageProps {
  params: Promise<{ purchaseId: string }>;
}

export default function EditSelectedGamesPage({ params }: EditSelectedGamesPageProps) {
  const { purchaseId: purchaseIdParam } = use(params);
  const purchaseId = Number(purchaseIdParam);

  const router = useRouter();

  const [purchaseData, setPurchaseData] = useState<GetSelectedGamesResponse | null>(null);
  const [passDetails, setPassDetails] = useState<ClientPass | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const [unavailableGames, setUnavailableGames] = useState<SelectedGameDTO[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrors([]);
    setSuccessMessage(null);

    try {
      // 1. Call get selected games in purchase
      const purchase = await passService.getSelectedGamesInPurchase(purchaseId);
      setPurchaseData(purchase);

      const passId = purchase.pass?.id;
      if (!passId) {
        throw new Error('No pass associated with this purchase.');
      }

      // 2. Call get pass by ID to retrieve the active pass and games available in it
      const pass = await passService.getById(passId.toString());
      setPassDetails(pass);

      // 3. Identify games that are part of the pass vs discontinued/unavailable games
      const availablePassGameMap = new Map<number, ClientGame>();
      (pass.games || []).forEach((g) => availablePassGameMap.set(g.id, g));

      const validSelectedIds: number[] = [];
      const notInPassGames: SelectedGameDTO[] = [];

      (purchase.selected_games || []).forEach((purchasedGame) => {
        if (availablePassGameMap.has(purchasedGame.id)) {
          validSelectedIds.push(purchasedGame.id);
        } else {
          notInPassGames.push(purchasedGame);
        }
      });

      // Set only valid games from the pass into the selected state
      setSelectedGameIds(validSelectedIds);
      setUnavailableGames(notInPassGames);
    } catch (err: any) {
      setErrors([err?.message || 'Failed to load purchase and pass details.']);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId]);

  // Constraints from the active pass / purchase
  const requiredCount =
    passDetails?.requiredSelectionCount ?? purchaseData?.pass?.required_selection_count ?? 0;
  const minDifficultCount =
    passDetails?.minimumDifficultGamesToSelect ??
    purchaseData?.pass?.minimum_difficult_games_to_select ??
    0;

  // Games available in this pass
  const availableGames: ClientGame[] = passDetails?.games || [];

  // Currently selected games among available pass games
  const selectedGamesList = availableGames.filter((g) => selectedGameIds.includes(g.id));
  const difficultGamesSelected = selectedGamesList.filter((g) => g.difficulty === 'HEAVY').length;

  const isCountValid = selectedGameIds.length === requiredCount;
  const isHeavyValid = minDifficultCount === 0 || difficultGamesSelected >= minDifficultCount;

  // Toggle game selection with slot and max selection checks
  const toggleGame = (gameId: number, availableSlots: number) => {
    if (!passDetails) return;
    const isCurrentlySelected = selectedGameIds.includes(gameId);

    // If game is full and not currently selected, do not allow selecting
    if (availableSlots <= 0 && !isCurrentlySelected) return;

    setSelectedGameIds((prev) => {
      if (prev.includes(gameId)) {
        return prev.filter((id) => id !== gameId);
      }
      if (prev.length >= requiredCount) {
        return prev;
      }
      return [...prev, gameId];
    });

    // Clear any previous validation errors when user alters selection
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Submit and perform checks
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const validationErrors: string[] = [];

    if (!isCountValid) {
      validationErrors.push(
        `Select exactly ${requiredCount} game${requiredCount > 1 ? 's' : ''}. (Currently selected: ${selectedGameIds.length})`
      );
    }

    if (minDifficultCount > 0 && difficultGamesSelected < minDifficultCount) {
      validationErrors.push(
        `Select at least ${minDifficultCount} Heavy game${minDifficultCount > 1 ? 's' : ''}. (Currently selected: ${difficultGamesSelected})`
      );
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setErrors([]);
    setSuccessMessage(null);

    try {
      const response = await passService.updateSelectedGamesInPurchase(purchaseId, selectedGameIds);
      setSuccessMessage(response?.message || 'Selected games updated successfully!');

      // If there were unavailable games, they have now been replaced
      setUnavailableGames([]);

      setTimeout(() => {
        router.push('/dashboard/purchases');
      }, 1200);
    } catch (err: any) {
      setErrors([err?.message || 'Failed to update selected games for this purchase.']);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 text-center max-w-3xl mx-auto shadow-sm mt-10">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">Loading purchase details & pass rules...</p>
      </div>
    );
  }

  if (errors.length > 0 && !purchaseData && !passDetails) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-3xl mx-auto shadow-sm mt-10">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">Error Loading Purchase</h3>
        <div className="space-y-1 my-3">
          {errors.map((err, idx) => (
            <p key={idx} className="text-sm text-red-600">
              {err}
            </p>
          ))}
        </div>
        <button
          onClick={() => router.push('/dashboard/purchases')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchases
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-10 px-4">
      {/* Top Header & Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/purchases')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchases
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
            Purchase ID #{purchaseId}
          </span>
          <button
            type="button"
            onClick={loadData}
            title="Reload data"
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        {/* Pass Info Header */}
        <div className="border-b border-slate-100 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">{passDetails?.name || purchaseData?.pass?.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Pass #{passDetails?.id || purchaseData?.pass?.id}
                </span>
              </div>
              {passDetails?.description && (
                <p className="text-sm text-slate-500 mt-1">{passDetails.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                  isCountValid
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {selectedGameIds.length} / {requiredCount} Selected
              </span>

              {minDifficultCount > 0 && (
                <span
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                    isHeavyValid
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  Heavy: {difficultGamesSelected} / {minDifficultCount}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Pass Selection Rules:</p>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                <li>
                  Requires exactly <span className="font-bold text-slate-900">{requiredCount}</span> games.
                </li>
                {minDifficultCount > 0 && (
                  <li>
                    Must include at least <span className="font-bold text-slate-900">{minDifficultCount}</span> Heavy
                    difficulty game{minDifficultCount > 1 ? 's' : ''}.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Unavailable / Discontinued Games in Purchase Warning */}
        {unavailableGames.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Previously Selected Games Not in This Pass ({unavailableGames.length})
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  The following games were previously recorded in this purchase, but are no longer available in{' '}
                  <strong>{passDetails?.name}</strong>. They cannot be kept and will be replaced upon saving your new
                  selection below.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              {unavailableGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 line-through truncate">{game.name}</p>
                    <p className="text-[11px] text-slate-400">{game.genre || 'Legacy Game'}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 whitespace-nowrap shrink-0">
                    Not Available Now
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Banners */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-red-800 font-semibold text-sm mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Please resolve the following issues:
            </div>
            {errors.map((err, idx) => (
              <p key={idx} className="text-xs text-red-700 flex items-center gap-1.5 pl-6">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-sm text-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Main Selection Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-blue-600" />
                Available Pass Games ({availableGames.length})
              </h3>
              <span className="text-xs text-slate-500">
                Only games configured in this pass are shown
              </span>
            </div>

            {availableGames.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Gamepad2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No games found for this pass</p>
                <p className="text-xs text-slate-500 mt-1">Please check pass configuration.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3.5">
                {availableGames.map((game) => {
                  const isFull = game.availableSlots <= 0;
                  const isSelected = selectedGameIds.includes(game.id);
                  const isMaxReached = selectedGameIds.length >= requiredCount && !isSelected;
                  // If full and not currently selected in this purchase, disable
                  const disabled = (isFull && !isSelected) || isMaxReached;

                  return (
                    <label
                      key={game.id}
                      className={`relative rounded-xl border p-4 flex gap-3 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                          : disabled
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 hover:border-blue-300 cursor-pointer bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => toggleGame(game.id, game.availableSlots)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-slate-900 truncate">{game.name}</p>
                            <p className="text-xs text-slate-500">{game.genre}</p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                              isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {isFull ? 'Full' : `${game.availableSlots} left`}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {game.requiredPlayers && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {game.requiredPlayers} players
                            </span>
                          )}
                          {game.estimatedRuntimeMinutes && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {game.estimatedRuntimeMinutes} min
                            </span>
                          )}
                          {game.difficulty && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyStyles(
                                game.difficulty
                              )}`}
                            >
                              {game.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Validation Warning Hint */}
          {!isHeavyValid && selectedGameIds.length > 0 && minDifficultCount > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Please include at least <strong>{minDifficultCount} Heavy</strong> difficulty game{minDifficultCount > 1 ? 's' : ''} to meet this pass's requirements.
              </span>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push('/dashboard/purchases')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || !isCountValid || !isHeavyValid}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Games...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Game Selection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}