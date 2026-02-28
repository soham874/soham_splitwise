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
                const isSettlement = e.description?.trim().toLowerCase() === "payment";
                const isPersonal = !!e.personal;
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-gray-50 text-[13px] align-top ${
                      isSettlement
                        ? "bg-amber-50/60 hover:bg-amber-50"
                        : isPersonal
                        ? "bg-indigo-50/60 hover:bg-indigo-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="p-4">
                      <div className="text-[10px] text-gray-400 mb-1">
                        {new Date(e.created_at).toLocaleDateString()}
                      </div>
                      {isSettlement ? (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            Settlement
                          </span>
                          <span className="font-semibold text-amber-800">
                            {payers.map((p) => p.user.first_name).join(", ")} paid {owers.map((o) => o.user.first_name).join(", ")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">
                            {e.description}
                          </span>
                          {isPersonal && (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                              Personal
                            </span>
                          )}
                        </div>
                      )}
                      {e.details && (
                        <div className="text-[11px] text-emerald-600 italic bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          Note: {e.details}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {!isSettlement && (
                        <>
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
                        </>
                      )}
                      {isSettlement && (
                        <span className="text-xs text-amber-600 italic">Debt settlement</span>
                      )}
                    </td>
                    <td className={`p-4 text-right font-mono font-bold ${
                      isSettlement ? "text-amber-600" : isPersonal ? "text-indigo-600" : "text-emerald-600"
                    }`}>
                      {e.currency_code} {e.cost}
                    </td>
                    <td className="p-4 text-center">
                      {!isSettlement && (
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
                      )}
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
        {currentExpenses.map((e) => {
          const payers = e.users.filter(
            (u) => parseFloat(u.paid_share) > 0
          );
          const owers = e.users.filter(
            (u) => parseFloat(u.owed_share) > 0
          );
          const isSettlement = e.description?.trim().toLowerCase() === "payment";
          const isPersonal = !!e.personal;
          return (
            <div
              key={e.id}
              className={`p-4 rounded-xl border shadow-sm space-y-3 ${
                isSettlement
                  ? "bg-amber-50 border-amber-200"
                  : isPersonal
                  ? "bg-indigo-50 border-indigo-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  {isSettlement ? (
                    <>
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        Settlement
                      </span>
                      <h4 className="font-semibold text-amber-800 text-sm">
                        {payers.map((p) => p.user.first_name).join(", ")} paid {owers.map((o) => o.user.first_name).join(", ")}
                      </h4>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">
                          {e.description}
                        </h4>
                        {isPersonal && (
                          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                            Personal
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  <p className="text-[10px] text-gray-400 uppercase tracking-tighter">
                    {new Date(e.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className={`font-mono font-bold text-sm ${
                  isSettlement ? "text-amber-600" : isPersonal ? "text-indigo-600" : "text-emerald-600"
                }`}>
                  {e.currency_code} {e.cost}
                </p>
              </div>
              {e.details && (
                <div className="text-[11px] text-emerald-600 italic bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  Note: {e.details}
                </div>
              )}
              {!isSettlement && (
                <div className="border-t border-gray-100 pt-2 space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Paid:
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {payers.map((p) => (
                        <div key={p.user_id} className="text-xs text-gray-700 flex justify-between">
                          <span>{p.user.first_name}</span>
                          <span className="font-mono font-semibold">{e.currency_code} {p.paid_share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Owes:
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {owers.map((o) => (
                        <div key={o.user_id} className="text-xs text-gray-700 flex justify-between">
                          <span>{o.user.first_name}</span>
                          <span className="font-mono font-semibold">{e.currency_code} {o.owed_share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!isSettlement && (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
