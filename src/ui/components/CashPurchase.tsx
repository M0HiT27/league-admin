"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Ticket,
  ChevronDown,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  Gift,
  IndianRupee,
} from "lucide-react";
import { passService, ClientPass } from "@/api/client/services/pass.service";
import { passPurchasesService } from "@/api/client/services/purchase.service";

const COUNTRY_CODES = ["+91", "+1", "+44", "+61", "+971", "+65"];

export type GameDifficulty = "LIGHT" | "MEDIUM" | "HEAVY";
const getDifficultyStyles = (difficulty: GameDifficulty) => {
  switch (difficulty) {
    case "LIGHT":
      return "bg-green-100 text-green-800 border-green-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "HEAVY":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "border-slate-200 text-slate-600 bg-transparent";
  }
};

function useCountdown(endsAtMs: number | undefined | null, active: boolean) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!active || !endsAtMs) {
      setTimeLeft("");
      return;
    }

    function tick() {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      });
      const kolkataNow = new Date(formatter.format(now)).getTime();
      const diff = (endsAtMs as number) - kolkataNow;

      if (diff <= 0) {
        setTimeLeft("Early bird pricing has ended");
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAtMs, active]);

  return timeLeft;
}

export default function CashPurchase() {
  const [passes, setPasses] = useState<ClientPass[]>([]);
  const [isLoadingPasses, setIsLoadingPasses] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPassId, setSelectedPassId] = useState<string>("");

  const [selectedPass, setSelectedPass] = useState<ClientPass | null>(null);
  const [isRevalidatingPass, setIsRevalidatingPass] = useState(false);
  const [revalidateError, setRevalidateError] = useState<string | null>(null);

  const countdown = useCountdown(
    selectedPass?.pricing.discountEndsAtMs,
    !!selectedPass?.pricing.hasActiveDiscount,
  );

  const [selectedGames, setSelectedGames] = useState<number[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await passService.getAll();
        if (!cancelled) {
          setPasses(data);
          if (data.length > 0) setSelectedPassId(String(data[0].id));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load passes",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPasses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPassId) {
      setSelectedPass(null);
      setRevalidateError(null);
      return;
    }

    let cancelled = false;
    setIsRevalidatingPass(true);
    setRevalidateError(null);

    (async () => {
      try {
        const fresh = await passService.getById(selectedPassId);
        if (!cancelled) {
          setSelectedPass(fresh);
          // auto-fill amount paid with discounted or base price if available
          setAmountPaid(
            fresh.pricing.hasActiveDiscount
              ? fresh.pricing.discountedPrice
              : fresh.pricing.basePrice,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setRevalidateError(
            err instanceof Error ? err.message : "Failed to load pass details",
          );
        }
      } finally {
        if (!cancelled) setIsRevalidatingPass(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPassId]);

  useEffect(() => {
    setSelectedGames([]);
  }, [selectedPassId]);

  function toggleGame(id: number, availableSlots: number) {
    if (availableSlots <= 0 || !selectedPass) return;
    setSelectedGames((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= selectedPass.requiredSelectionCount) return prev;
      return [...prev, id];
    });
  }

  const gamesValid =
    !!selectedPass &&
    selectedGames.length === selectedPass.requiredSelectionCount;
  const difficultGamesSelected = selectedPass?.games.filter(
    (g) => selectedGames.includes(g.id) && g.difficulty === "HEAVY",
  ).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: string[] = [];

    if (!selectedPass) newErrors.push("Please select a game pass.");
    if (!fullName.trim()) newErrors.push("Full name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.push("Enter a valid email address.");
    if (!/^\d{7,15}$/.test(mobile))
      newErrors.push("Enter a valid mobile number.");
    if (!address.trim() || address.trim().length < 5)
      newErrors.push("Enter a valid address.");
    if (!city.trim()) newErrors.push("Enter your city.");
    if (!pincode.trim() || pincode.trim().length < 3)
      newErrors.push("Enter a valid pincode / postal code.");
    if (amountPaid === "" || isNaN(Number(amountPaid)))
      newErrors.push("Amount Charged must be a valid number.");

    if (selectedPass && !gamesValid) {
      newErrors.push(
        `Select exactly ${selectedPass.requiredSelectionCount} game${selectedPass.requiredSelectionCount > 1 ? "s" : ""}.`,
      );
    }
    if (
      selectedPass &&
      selectedPass.minimumDifficultGamesToSelect > 0 &&
      (difficultGamesSelected ?? 0) < selectedPass.minimumDifficultGamesToSelect
    ) {
      newErrors.push(
        `Select at least ${selectedPass.minimumDifficultGamesToSelect} Heavy game${selectedPass.minimumDifficultGamesToSelect > 1 ? "s" : ""}.`,
      );
    }

    setErrors(newErrors);
    if (newErrors.length > 0 || !selectedPass) return;

    setIsSubmitting(true);

    try {
      const resultMessage = await passPurchasesService.purchaseCashPass({
        pass_id: selectedPass.id,
        selected_game_ids: selectedGames,
        buyer: {
          name: fullName.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          dial_code: countryCode,
          city: city.trim(),
          pincode: pincode.trim(),
          address: address.trim(),
        },
        amount_paid: Number(amountPaid),
      });

      setSuccessMessage(resultMessage);
      setSubmitted(true);
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : "Failed to register cash purchase",
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setFullName("");
    setEmail("");
    setMobile("");
    setAddress("");
    setCity("");
    setPincode("");
    setSelectedGames([]);
    setAmountPaid(
      selectedPass
        ? selectedPass.pricing.hasActiveDiscount
          ? selectedPass.pricing.discountedPrice
          : selectedPass.pricing.basePrice
        : "",
    );
    setSubmitted(false);
    setSuccessMessage("");
    setErrors([]);
  }

  if (submitted) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center max-w-md w-full"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            Purchase Recorded!
          </h3>
          <p className="text-slate-600 text-sm mb-8">
            {successMessage ||
              `The cash purchase for ${fullName} has been successfully registered.`}
          </p>
          <button
            onClick={resetForm}
            className="w-full bg-blue-600 text-white rounded-md py-3 font-medium hover:bg-blue-700 transition-colors"
          >
            Register Another Purchase
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Cash Purchase</h1>
        <p className="text-slate-500 mt-1">
          Register an offline pass purchase and assign games instantly.
        </p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative"
      >
        {isLoadingPasses ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-slate-500">Loading passes...</p>
          </div>
        ) : loadError ? (
          <div className="py-16 text-center">
            <p className="text-red-600 font-medium text-sm">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {isRevalidatingPass && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            <div className="mb-8 border-b border-slate-100 pb-8">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Select Game Pass
              </label>
              <div className="relative">
                <select
                  value={selectedPassId}
                  onChange={(e) => setSelectedPassId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none px-4 py-3 text-sm font-medium bg-slate-50"
                >
                  {passes.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              </div>

              {revalidateError && (
                <div className="mt-4 bg-red-50 text-red-700 text-sm rounded-lg p-4 border border-red-200">
                  {revalidateError}
                </div>
              )}

              {selectedPass && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedPass.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-slate-50 rounded-xl p-6 border border-slate-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {selectedPass.name}
                        </h3>
                        <p className="text-sm text-slate-600 max-w-sm">
                          {selectedPass.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        {selectedPass.pricing.hasActiveDiscount &&
                          selectedPass.pricing.discountName && (
                            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-md">
                              {selectedPass.pricing.discountName}
                            </span>
                          )}

                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-slate-900">
                            ₹
                            {selectedPass.pricing.hasActiveDiscount
                              ? selectedPass.pricing.discountedPrice
                              : selectedPass.pricing.basePrice}
                          </span>
                          {selectedPass.pricing.hasActiveDiscount && (
                            <span className="text-sm text-slate-400 line-through">
                              ₹{selectedPass.pricing.basePrice}
                            </span>
                          )}
                        </div>

                        {selectedPass.pricing.hasActiveDiscount &&
                          countdown && (
                            <span className="text-xs font-medium text-slate-500">
                              {countdown}
                            </span>
                          )}
                      </div>
                    </div>

                    {selectedPass.kit && (
                      <div className="mt-5 pt-5 border-t border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Gift className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-slate-800">
                            {selectedPass.kit.name}
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPass.kit.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {selectedPass && (
              <>
                {selectedPass.games.length > 0 && (
                  <div className="mb-8 border-b border-slate-100 pb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800">
                        Select Games
                      </h3>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${gamesValid ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {selectedGames.length} /{" "}
                        {selectedPass.requiredSelectionCount} Selected
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {selectedPass.games.map((g) => {
                        const isFull = g.availableSlots <= 0;
                        const isSelected = selectedGames.includes(g.id);
                        const atMax =
                          selectedGames.length >=
                            selectedPass.requiredSelectionCount && !isSelected;
                        const disabled = isFull || atMax;

                        return (
                          <label
                            key={g.id}
                            className={`relative rounded-xl border p-4 flex gap-3 transition-colors ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : disabled
                                  ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                                  : "border-slate-200 hover:border-blue-300 cursor-pointer bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={disabled}
                              onChange={() =>
                                toggleGame(g.id, g.availableSlots)
                              }
                              className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-sm text-slate-900">
                                    {g.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {g.genre}
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${isFull ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                                >
                                  {isFull ? "Full" : `${g.availableSlots} left`}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {g.requiredPlayers && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                    {g.requiredPlayers} players
                                  </span>
                                )}
                                {g.estimatedRuntimeMinutes && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                    {g.estimatedRuntimeMinutes} min
                                  </span>
                                )}
                                {g.difficulty && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyStyles(g.difficulty)}`}
                                  >
                                    {g.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    Player & Payment Details
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Doe"
                          className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pl-10 pr-4 py-2.5 text-sm bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pl-10 pr-4 py-2.5 text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Mobile Number
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="rounded-lg border border-slate-300 focus:border-blue-500 outline-none px-2 py-2.5 text-sm bg-white"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <Phone
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                          />
                          <input
                            type="tel"
                            value={mobile}
                            onChange={(e) =>
                              setMobile(
                                e.target.value.replace(/\D/g, "").slice(0, 15),
                              )
                            }
                            placeholder="9876543210"
                            className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pl-10 pr-4 py-2.5 text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Amount Charged (₹)
                      </label>
                      <div className="relative">
                        <IndianRupee
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          type="number"
                          value={amountPaid}
                          onChange={(e) =>
                            setAmountPaid(
                              e.target.value ? Number(e.target.value) : "",
                            )
                          }
                          placeholder="0"
                          className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pl-10 pr-4 py-2.5 text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Park Street, Apartment 4B"
                        className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pl-10 pr-4 py-2.5 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bhopal"
                        className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-4 py-2.5 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Pincode / Postal Code
                      </label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) =>
                          setPincode(
                            e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""),
                          )
                        }
                        placeholder="462001"
                        className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-4 py-2.5 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="mb-6 bg-red-50 text-red-700 text-sm rounded-lg p-4 border border-red-200 space-y-1">
                    {errors.map((err) => (
                      <p key={err} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{" "}
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedPass || isSubmitting}
                  className="w-full bg-blue-600 text-white rounded-lg py-3.5 font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Purchase...
                    </>
                  ) : (
                    "Record Cash Purchase"
                  )}
                </button>
              </>
            )}
          </>
        )}
      </motion.form>
    </div>
  );
}
