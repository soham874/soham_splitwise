import React, { useState, useEffect, useCallback } from "react";
import { checkLogin, fetchGroups, fetchCurrencies, saveTripDetailsApi, getTripDetailsApi } from "./api";
import Navbar from "./components/Navbar";
import LoadingOverlay from "./components/LoadingOverlay";
import TripSetupPage from "./components/TripSetupPage";
import TripSummaryPage from "./components/TripSummaryPage";
import GroupsPage from "./components/GroupsPage";
import DashboardPage from "./components/DashboardPage";

const PAGES = {
  LOADING: "loading",
  TRIP_SETUP: "trip_setup",
  TRIP_SUMMARY: "trip_summary",
  GROUPS: "groups",
  DASHBOARD: "dashboard",
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
            localStorage.setItem("default_group_id", tripData.trip.groupId);
            setPage(PAGES.TRIP_SUMMARY);
          } else {
            setPage(PAGES.TRIP_SETUP);
          }
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
    localStorage.setItem("default_group_id", saved.groupId);
    setPage(PAGES.TRIP_SUMMARY);
  };

  const showDashboard = (groupId) => {
    const group = allGroups.find((g) => g.id === groupId);
    if (!group) return;
    localStorage.setItem("default_group_id", groupId);
    setActiveGroup(group);
    setPage(PAGES.DASHBOARD);
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
      <Navbar
        onSwitchGroup={() => {
          loadGroups();
          setPage(PAGES.GROUPS);
        }}
      />

      {page === PAGES.TRIP_SETUP && (
        <TripSetupPage
          allGroups={allGroups}
          availableCurrencies={availableCurrencies}
          tripDetails={tripDetails}
          onSave={saveTripDetails}
        />
      )}

      {page === PAGES.TRIP_SUMMARY && (
        <TripSummaryPage
          tripDetails={tripDetails}
          allGroups={allGroups}
          onManageExpenses={() => {
            if (tripDetails?.groupId) showDashboard(parseInt(tripDetails.groupId));
          }}
          onEditTrip={() => setPage(PAGES.TRIP_SETUP)}
        />
      )}

      {page === PAGES.GROUPS && (
        <GroupsPage
          allGroups={allGroups}
          onSelectGroup={showDashboard}
          onRefresh={loadGroups}
        />
      )}

      {page === PAGES.DASHBOARD && activeGroup && (
        <DashboardPage
          activeGroup={activeGroup}
          availableCurrencies={availableCurrencies}
          tripDetails={tripDetails}
          onBack={() => {
            loadGroups();
            setPage(PAGES.GROUPS);
          }}
          onRefresh={refreshAndShowDashboard}
        />
      )}
    </div>
  );
}
