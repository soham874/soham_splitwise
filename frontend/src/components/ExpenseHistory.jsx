import React from "react";

export default function ExpenseHistory({
  currentExpenses,
  onDelete,
  onRefresh,
}) {
  const handleEdit = (id) => {
    if (window.__editExpense) window.__editExpense(id);
  };

  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-base md:text-lg font-bold text-gray-800">
          Expense History
        </h3>
        <button
          onClick={onRefresh}
          className="text-[10px] md:text-xs text-emerald-600 hover:underline font-bold uppercase tracking-wider"
        >
          Refresh
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="table-container overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm min-w-[800px]">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4 border-b">Date &amp; Description</th>
                <th className="p-4 border-b">Split Details</th>
                <th className="p-4 border-b text-right">Cost</th>
                <th className="p-4 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentExpenses.map((e) => {
                const payers = e.users.filter(
                  (u) => parseFloat(u.paid_share) > 0
                );
                const owers = e.users.filter(
                  (u) => parseFloat(u.owed_share) > 0
                );
                return (
                  <tr
                    key={e.id}
                    className="hover:bg-gray-50 border-b border-gray-50 text-[13px] align-top"
                  >
                    <td className="p-4">
                      <div className="text-[10px] text-gray-400 mb-1">
                        {new Date(e.created_at).toLocaleDateString()}
                      </div>
                      <div className="font-bold text-gray-800 mb-1">
                        {e.description}
                      </div>
                      {e.details && (
                        <div className="text-[11px] text-emerald-600 italic bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          Note: {e.details}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Paid:
                        </span>
                        <span className="text-gray-600 ml-1">
                          {payers
                            .map(
                              (p) =>
                                `${p.user.first_name} (${p.paid_share})`
                            )
                            .join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Owes:
                        </span>
                        <span className="text-gray-600 ml-1">
                          {owers
                            .map(
                              (o) =>
                                `${o.user.first_name} (${o.owed_share})`
                            )
                            .join(", ")}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-600">
                      {e.currency_code} {e.cost}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleEdit(e.id)}
                          className="text-emerald-600 px-2 py-1 hover:bg-emerald-50 rounded text-xs font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(e.id)}
                          className="text-red-500 px-2 py-1 hover:bg-red-50 rounded text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {currentExpenses.map((e) => (
          <div
            key={e.id}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  {e.description}
                </h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-tighter">
                  {new Date(e.created_at).toLocaleDateString()}
                </p>
              </div>
              <p className="font-mono font-bold text-emerald-600 text-sm">
                {e.currency_code} {e.cost}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleEdit(e.id)}
                className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(e.id)}
                className="flex-1 py-1.5 bg-red-50 text-red-600 rounded text-[10px] font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
