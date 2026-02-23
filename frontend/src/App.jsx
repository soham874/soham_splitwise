import React, { useState, useEffect, useCallback } from "react";
import { checkLogin, fetchGroups, fetchCurrencies, saveTripDetailsApi, getTripDetailsApi } from "./api";
import Navbar from "./components/Navbar";
import LoadingOverlay from "./components/LoadingOverlay";
import TripSetupPage from "./components/TripSetupPage";
import MyTripsPage from "./components/MyTripsPage";
import TripDetailPage from "./components/TripDetailPage";
import DashboardPage from "./components/DashboardPage";
import AnalyticsPage from "./components/AnalyticsPage";

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
  const [tripDetails, setTripDetails] = useState(null);

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

  useEffect(() => {
    (async () => {
      try {
        const data = await checkLogin();
        if (data.logged_in) {
          const [, , tripData] = await Promise.all([
            loadCurrencies(),
            loadGroups(),
            getTripDetailsApi(),
          ]);
          if (tripData.trip) {
            setTripDetails(tripData.trip);
          }
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
    const result = await saveTripDetailsApi(details);
    const saved = result.trip || details;
    setTripDetails(saved);
    setPage(PAGES.MY_TRIPS);
  };

  const openTripDetail = () => {
    setPage(PAGES.TRIP_DETAIL);
  };

  const openDashboard = () => {
    if (!tripDetails?.groupId) return;
    const gid = parseInt(tripDetails.groupId);
    const group = allGroups.find((g) => g.id === gid);
    if (group) {
      setActiveGroup(group);
      setPage(PAGES.DASHBOARD);
    }
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
          tripDetails={tripDetails}
          allGroups={allGroups}
          onSelectTrip={openTripDetail}
          onCreateTrip={() => setPage(PAGES.TRIP_SETUP)}
        />
      )}

      {page === PAGES.TRIP_SETUP && (
        <TripSetupPage
          allGroups={allGroups}
          availableCurrencies={availableCurrencies}
          tripDetails={tripDetails}
          onSave={saveTripDetails}
          onCancel={tripDetails ? () => setPage(PAGES.MY_TRIPS) : null}
        />
      )}

      {page === PAGES.TRIP_DETAIL && tripDetails && (
        <TripDetailPage
          tripDetails={tripDetails}
          allGroups={allGroups}
          onManageExpenses={openDashboard}
          onViewAnalytics={() => setPage(PAGES.ANALYTICS)}
          onEditTrip={() => setPage(PAGES.TRIP_SETUP)}
          onBack={() => setPage(PAGES.MY_TRIPS)}
        />
      )}

      {page === PAGES.DASHBOARD && activeGroup && (
        <DashboardPage
          activeGroup={activeGroup}
          availableCurrencies={availableCurrencies}
          tripDetails={tripDetails}
          onBack={() => setPage(PAGES.TRIP_DETAIL)}
          onRefresh={refreshAndShowDashboard}
        />
      )}

      {page === PAGES.ANALYTICS && tripDetails && (
        <AnalyticsPage
          tripDetails={tripDetails}
          onBack={() => setPage(PAGES.TRIP_DETAIL)}
        />
      )}
    </div>
  );
}
