import React, { useState, useEffect, useCallback } from "react";
import { fetchExpenses, createExpense, deleteExpenseApi, syncExpenses, fetchPersonalExpenses, getLocationCoordsApi, flushOfflineQueue, getOfflineQueueCount } from "../api";
import ExpenseForm from "./ExpenseForm";
import BalancesPanel from "./BalancesPanel";
import ExpenseHistory from "./ExpenseHistory";

export default function DashboardPage({
  activeGroup,
  availableCurrencies,
  tripDetails,
  currentUser,
  onBack,
  onRefresh,
}) {
  const [currentExpenses, setCurrentExpenses] = useState([]);
  const [locationCoords, setLocationCoords] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getOfflineQueueCount());

  // Track online/offline status and flush queued expenses on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const synced = await flushOfflineQueue();
      setPendingCount(getOfflineQueueCount());
      if (synced.length > 0) {
        console.log(`[Offline] Synced ${synced.length} queued expense(s)`);
        await onRefresh(activeGroup.id);
        await loadHistory();
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Also try flushing on mount in case we're already online with a stale queue
    if (navigator.onLine && getOfflineQueueCount() > 0) handleOnline();
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup.id]);

  // Fetch and cache location coordinates for trip locations (lazy backfill)
  const locationsKey = (tripDetails?.locations || []).join(",");
  useEffect(() => {
    const locs = tripDetails?.locations || [];
    if (locs.length === 0) return;
    console.log("[GeoDebug] Fetching coords for locations:", locs);
    getLocationCoordsApi(locs)
      .then((data) => {
        console.log("[GeoDebug] Got location coords:", data.coords);
        setLocationCoords(data.coords || []);
      })
      .catch((err) => console.warn("[GeoDebug] Failed to fetch location coords:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsKey]);

  const loadHistory = useCallback(async () => {
    await syncExpenses(activeGroup.id).catch(() => {});
    const [swData, personalData] = await Promise.all([
      fetchExpenses(activeGroup.id).catch(() => ({ expenses: [] })),
      fetchPersonalExpenses(activeGroup.id).catch(() => ({ expenses: [] })),
    ]);
    const swExpenses = (swData.expenses || []).map((e) => ({ ...e, personal: false }));
    const personalExpenses = (personalData.expenses || []).map((e) => ({ ...e, personal: true }));
    const all = [...swExpenses, ...personalExpenses].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    setCurrentExpenses(all);
  }, [activeGroup.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredCurrencies = (() => {
    if (
      tripDetails?.currencies &&
      tripDetails.currencies.length > 0
    ) {
      return availableCurrencies.filter(
        (c) =>
          tripDetails.currencies.includes(c.currency_code) ||
          c.currency_code === "INR" ||
          c.currency_code === "USD"
      );
    }
    return availableCurrencies;
  })();

  const handleSubmit = async (payload) => {
    const result = await createExpense(payload);
    setPendingCount(getOfflineQueueCount());
    if (result._offline) {
      // Queued locally — no server refresh needed
      return;
    }
    await onRefresh(activeGroup.id);
    await loadHistory();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete expense?")) return;
    await deleteExpenseApi(id);
    await onRefresh(activeGroup.id);
    await loadHistory();
  };

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-emerald-600 font-semibold hover:translate-x-[-4px] transition-transform"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Trip
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            {activeGroup.name}
          </h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center bg-amber-100 text-amber-800 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
              {pendingCount} pending sync
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <ExpenseForm
          activeGroup={activeGroup}
          currencies={filteredCurrencies}
          currentExpenses={currentExpenses}
          currentUser={currentUser}
          tripLocations={tripDetails?.locations || []}
          locationCoords={locationCoords}
          onSubmit={handleSubmit}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BalancesPanel activeGroup={activeGroup} />
          <ExpenseHistory
            currentExpenses={currentExpenses}
            onEdit={null}
            onDelete={handleDelete}
            onRefresh={async () => { await onRefresh(activeGroup.id); await loadHistory(); }}
          />
        </div>
      </div>
    </div>
  );
}
