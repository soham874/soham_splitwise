import React, { useState, useEffect, useCallback } from "react";
import { checkLogin, fetchGroups, fetchCurrencies, createTripApi, updateTripApi, deleteTripApi, getTripsApi, flushOfflineQueue, getOfflineQueueCount } from "./api";
import Navbar from "./components/Navbar";
import LoadingOverlay from "./components/LoadingOverlay";
import TripSetupPage from "./components/TripSetupPage";
import MyTripsPage from "./components/MyTripsPage";
import TripDetailPage from "./components/TripDetailPage";
import DashboardPage from "./components/DashboardPage";
import AnalyticsPage from "./components/AnalyticsPage";
import ConfirmDialog from "./components/ConfirmDialog";
import LandingPage from "./components/LandingPage";
import CurrencyConverterPage from "./components/CurrencyConverterPage";

// ── Offline cache helpers ────────────────────────────────────────────
const CACHE_KEYS = { user: "cached_user", trips: "cached_trips", groups: "cached_groups", currencies: "cached_currencies" };

function cacheSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function cacheGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

const PAGES = {
  LOADING: "loading",
  LANDING: "landing",
  MY_TRIPS: "my_trips",
  TRIP_SETUP: "trip_setup",
  TRIP_DETAIL: "trip_detail",
  DASHBOARD: "dashboard",
  ANALYTICS: "analytics",
  CURRENCY_CONVERTER: "currency_converter",
};

export default function App() {
  const [page, setPage] = useState(PAGES.LOADING);
  const [allGroups, setAllGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [allTrips, setAllTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadGroups = useCallback(async () => {
    try {
      const data = await fetchGroups();
      const groups = data.groups || [];
      setAllGroups(groups);
      cacheSet(CACHE_KEYS.groups, groups);
      return groups;
    } catch {
      return [];
    }
  }, []);

  const loadCurrencies = useCallback(async () => {
    try {
      const data = await fetchCurrencies();
      const currencies = data.currencies || [];
      const favorites = ["INR", "USD", "EUR", "GBP"];
      currencies.sort((a, b) => {
        const aF = favorites.indexOf(a.currency_code);
        const bF = favorites.indexOf(b.currency_code);
        if (aF !== -1 && bF !== -1) return aF - bF;
        if (aF !== -1) return -1;
        if (bF !== -1) return 1;
        return a.currency_code.localeCompare(b.currency_code);
      });
      setAvailableCurrencies(currencies);
      cacheSet(CACHE_KEYS.currencies, currencies);
    } catch {
      const cached = cacheGet(CACHE_KEYS.currencies);
      setAvailableCurrencies(cached || [
        { currency_code: "INR", unit: "₹" },
        { currency_code: "USD", unit: "$" },
      ]);
    }
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      const data = await getTripsApi();
      const trips = data.trips || [];
      setAllTrips(trips);
      cacheSet(CACHE_KEYS.trips, trips);
      return trips;
    } catch {
      return [];
    }
  }, []);

  // Try to resume from cached data when offline
  const tryOfflineResume = useCallback(() => {
    const cachedUser = cacheGet(CACHE_KEYS.user);
    const cachedTrips = cacheGet(CACHE_KEYS.trips);
    const cachedGroups = cacheGet(CACHE_KEYS.groups);
    const cachedCurrencies = cacheGet(CACHE_KEYS.currencies);
    const lastTripId = localStorage.getItem("lastTripId");

    if (!cachedUser || !lastTripId) return false;

    const trip = (cachedTrips || []).find((t) => String(t.id) === lastTripId);
    if (!trip) return false;

    const gid = parseInt(trip.groupId);
    const group = (cachedGroups || []).find((g) => g.id === gid);
    if (!group) return false;

    // Restore all state from cache
    setCurrentUser(cachedUser);
    setAllTrips(cachedTrips || []);
    setAllGroups(cachedGroups || []);
    setAvailableCurrencies(cachedCurrencies || [{ currency_code: "INR", unit: "\u20b9" }, { currency_code: "USD", unit: "$" }]);
    setSelectedTrip(trip);
    setActiveGroup(group);
    setPage(PAGES.DASHBOARD);
    return true;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await checkLogin();
        if (data.logged_in) {
          if (data.user) {
            setCurrentUser(data.user);
            cacheSet(CACHE_KEYS.user, data.user);
          }
          const [, groups, trips] = await Promise.all([loadCurrencies(), loadGroups(), loadTrips()]);

          // Auto-resume last opened trip
          const lastTripId = localStorage.getItem("lastTripId");
          if (lastTripId && trips.length > 0 && groups.length > 0) {
            const trip = trips.find((t) => String(t.id) === lastTripId);
            if (trip) {
              setSelectedTrip(trip);
              const gid = parseInt(trip.groupId);
              const group = groups.find((g) => g.id === gid);
              if (group) {
                setActiveGroup(group);
                setPage(PAGES.DASHBOARD);
              } else {
                setPage(PAGES.TRIP_DETAIL);
              }
            } else {
              localStorage.removeItem("lastTripId");
              setPage(PAGES.MY_TRIPS);
            }
          } else {
            setPage(PAGES.MY_TRIPS);
          }
        } else {
          setPage(PAGES.LANDING);
        }
      } catch {
        // Offline or network error — try resuming from cache
        if (!tryOfflineResume()) {
          setPage(PAGES.LANDING);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTripDetails = async (details) => {
    let result;
    if (editingTrip?.id) {
      result = await updateTripApi(editingTrip.id, details);
    } else {
      result = await createTripApi(details);
    }
    const saved = result.trip || details;
    // Refresh the trips list
    await loadTrips();
    setSelectedTrip(saved);
    setPage(PAGES.MY_TRIPS);
  };

  const openTripDetail = (trip) => {
    setSelectedTrip(trip);
    setPage(PAGES.TRIP_DETAIL);
    try { localStorage.setItem("lastTripId", String(trip.id)); } catch {}
  };

  const openDashboard = () => {
    if (!selectedTrip?.groupId) return;
    const gid = parseInt(selectedTrip.groupId);
    const group = allGroups.find((g) => g.id === gid);
    if (group) {
      setActiveGroup(group);
      setPage(PAGES.DASHBOARD);
    }
  };

  const handleDeleteTrip = (tripId) => {
    setConfirmDialog({
      title: "Delete Trip",
      message: "This will permanently delete this trip and all its expenses. This cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog(null);
        await deleteTripApi(tripId);
        await loadTrips();
        setSelectedTrip(null);
        setPage(PAGES.MY_TRIPS);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const refreshAndShowDashboard = async (groupId) => {
    let groups;
    try {
      groups = await loadGroups();
    } catch {
      // Offline — use current state
      groups = allGroups;
    }
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setActiveGroup(group);
      setPage(PAGES.DASHBOARD);
    }
  };

  if (page === PAGES.LOADING) return <LoadingOverlay />;
  if (page === PAGES.LANDING) return <LandingPage />;

  return (
    <div>
      <Navbar onHome={() => { localStorage.removeItem("lastTripId"); setPage(PAGES.MY_TRIPS); }} />

      {page === PAGES.MY_TRIPS && (
        <MyTripsPage
          allTrips={allTrips}
          allGroups={allGroups}
          onSelectTrip={openTripDetail}
          onCreateTrip={() => { setEditingTrip(null); setPage(PAGES.TRIP_SETUP); }}
        />
      )}

      {page === PAGES.TRIP_SETUP && (
        <TripSetupPage
          allGroups={allGroups}
          availableCurrencies={availableCurrencies}
          tripDetails={editingTrip}
          onSave={saveTripDetails}
          onCancel={() => setPage(PAGES.MY_TRIPS)}
        />
      )}

      {page === PAGES.TRIP_DETAIL && selectedTrip && (
        <TripDetailPage
          tripDetails={selectedTrip}
          allGroups={allGroups}
          onManageExpenses={openDashboard}
          onViewAnalytics={() => setPage(PAGES.ANALYTICS)}
          onCurrencyConverter={() => setPage(PAGES.CURRENCY_CONVERTER)}
          onEditTrip={() => { setEditingTrip(selectedTrip); setPage(PAGES.TRIP_SETUP); }}
          onDeleteTrip={() => handleDeleteTrip(selectedTrip.id)}
          onBack={() => { localStorage.removeItem("lastTripId"); setPage(PAGES.MY_TRIPS); }}
          isOwner={currentUser && selectedTrip.created_by === currentUser.id}
        />
      )}

      {page === PAGES.DASHBOARD && activeGroup && (
        <DashboardPage
          activeGroup={activeGroup}
          availableCurrencies={availableCurrencies}
          tripDetails={selectedTrip}
          currentUser={currentUser}
          onBack={() => setPage(PAGES.TRIP_DETAIL)}
          onRefresh={refreshAndShowDashboard}
        />
      )}

      {page === PAGES.CURRENCY_CONVERTER && selectedTrip && (
        <CurrencyConverterPage
          tripDetails={selectedTrip}
          onBack={() => setPage(PAGES.TRIP_DETAIL)}
        />
      )}

      {page === PAGES.ANALYTICS && selectedTrip && (
        <AnalyticsPage
          tripDetails={selectedTrip}
          currentUser={currentUser}
          onBack={() => setPage(PAGES.TRIP_DETAIL)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}
