import React, { useState, useEffect, useCallback } from "react";
import { fetchExpenses, createExpense, deleteExpenseApi } from "../api";
import ExpenseForm from "./ExpenseForm";
import BalancesPanel from "./BalancesPanel";
import ExpenseHistory from "./ExpenseHistory";

export default function DashboardPage({
  activeGroup,
  availableCurrencies,
  tripDetails,
  onBack,
  onRefresh,
}) {
  const [currentExpenses, setCurrentExpenses] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchExpenses(activeGroup.id);
      setCurrentExpenses(data.expenses || []);
    } catch {
      /* ignore */
    }
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
    await createExpense(payload);
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
          Change Group
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          {activeGroup.name}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <ExpenseForm
          activeGroup={activeGroup}
          currencies={filteredCurrencies}
          currentExpenses={currentExpenses}
          onSubmit={handleSubmit}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BalancesPanel activeGroup={activeGroup} />
          <ExpenseHistory
            currentExpenses={currentExpenses}
            onEdit={null}
            onDelete={handleDelete}
            onRefresh={() => loadHistory()}
          />
        </div>
      </div>
    </div>
  );
}
