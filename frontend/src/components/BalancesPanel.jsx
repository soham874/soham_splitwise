import React from "react";

export default function BalancesPanel({ activeGroup }) {
  const balancesHtml = activeGroup.members.map((member) => {
    const balances = member.balance || [];
    const net = balances.reduce((acc, b) => acc + parseFloat(b.amount), 0);
    const colorClass =
      net > 0 ? "text-emerald-600" : net < 0 ? "text-red-500" : "text-gray-400";
    return (
      <div
        key={member.id}
        className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0"
      >
        <span className="text-xs font-medium text-gray-700">
          {member.first_name}
        </span>
        <span className={`text-xs font-mono font-bold ${colorClass}`}>
          {net > 0 ? "+" : ""}
          {net.toFixed(2)}
        </span>
      </div>
    );
  });

  const debts = activeGroup.simplified_debts || [];

  return (
    <div className="lg:col-span-1 space-y-4">
      <h3 className="text-base md:text-lg font-bold text-gray-800 px-1">
        Summary
      </h3>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">
            Current Balances
          </p>
          <div className="space-y-2 mb-6">{balancesHtml}</div>
        </div>
        <div className="border-t border-gray-50 pt-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">
            Suggested Settlements
          </p>
          <div className="space-y-3">
            {debts.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">
                No pending settlements
              </p>
            ) : (
              debts.map((debt, i) => {
                const from =
                  activeGroup.members.find((m) => m.id === debt.from)
                    ?.first_name || "...";
                const to =
                  activeGroup.members.find((m) => m.id === debt.to)
                    ?.first_name || "...";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100"
                  >
                    <span className="text-[11px] font-bold text-gray-700 truncate flex-1">
                      {from}
                    </span>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-mono font-bold text-emerald-600">
                        {parseFloat(debt.amount).toFixed(2)}
                      </span>
                      <svg
                        className="w-3 h-3 text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M14 5l7 7-7 7M3 12h18"
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 truncate flex-1 text-right">
                      {to}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
