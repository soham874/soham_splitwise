import React, { useState, useEffect, useCallback } from "react";
import { checkLogin, fetchGroups, fetchCurrencies, createTripApi, updateTripApi, deleteTripApi, getTripsApi } from "./api";
import Navbar from "./components/Navbar";
import LoadingOverlay from "./components/LoadingOverlay";
import TripSetupPage from "./components/TripSetupPage";
import MyTripsPage from "./components/MyTripsPage";
import TripDetailPage from "./components/TripDetailPage";
import DashboardPage from "./components/DashboardPage";
import AnalyticsPage from "./components/AnalyticsPage";
import ConfirmDialog from "./components/ConfirmDialog";

const PAGES = {
  LOADING: "loading",
  MY_TRIPS: "my_trips",
  TRIP_SETUP: "trip_setup",
  TRIP_DETAIL: "trip_detail",
  DASHBOARD: "dashboard",
  ANALYTICS: "analytics",
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
      setAllGroups(data.groups || []);
      return data.groups || [];
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
    } catch {
      setAvailableCurrencies([
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
      return trips;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await checkLogin();
        if (data.logged_in) {
          if (data.user) setCurrentUser(data.user);
          await Promise.all([loadCurrencies(), loadGroups(), loadTrips()]);
          setPage(PAGES.MY_TRIPS);
        } else {
          window.location.href = "/login";
        }
      } catch {
        window.location.href = "/login";
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
    const groups = await loadGroups();
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setActiveGroup(group);
      setPage(PAGES.DASHBOARD);
    }
  };

  if (page === PAGES.LOADING) return <LoadingOverlay />;

  return (
    <div>
      <Navbar onHome={() => setPage(PAGES.MY_TRIPS)} />

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
          onEditTrip={() => { setEditingTrip(selectedTrip); setPage(PAGES.TRIP_SETUP); }}
          onDeleteTrip={() => handleDeleteTrip(selectedTrip.id)}
          onBack={() => setPage(PAGES.MY_TRIPS)}
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

      {page === PAGES.ANALYTICS && selectedTrip && (
        <AnalyticsPage
          tripDetails={selectedTrip}
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
