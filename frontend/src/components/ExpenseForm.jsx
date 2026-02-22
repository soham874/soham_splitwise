import React, { useState, useEffect, useCallback, useRef } from "react";

export default function ExpenseForm({
  activeGroup,
  currencies,
  currentExpenses,
  onSubmit,
}) {
  const [editId, setEditId] = useState("");
  const [description, setDescription] = useState("");
  const [totalCost, setTotalCost] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState(currencies[0]?.currency_code || "INR");
  const [splitEqually, setSplitEqually] = useState(true);
  const [payerId, setPayerId] = useState(
    activeGroup.members[0]?.id?.toString() || ""
  );
  const [memberSplits, setMemberSplits] = useState([]);
  const formRef = useRef(null);

  // Initialize member splits when group changes
  useEffect(() => {
    setMemberSplits(
      activeGroup.members.map((m) => ({
        id: m.id.toString(),
        name: m.first_name,
        paid: "0.00",
        percent: "0",
        owedAmt: "0.00",
      }))
    );
    setPayerId(activeGroup.members[0]?.id?.toString() || "");
  }, [activeGroup]);

  const recalculate = useCallback(
    (cost, splits, equally, payer) => {
      const total = parseFloat(cost || 0);
      const count = splits.length;
      const updated = splits.map((s, i) => {
        const newS = { ...s };
        // Paid
        if (payer !== "multiple") {
          newS.paid = s.id === payer ? total.toFixed(2) : "0.00";
        }
        // Owed
        if (equally && count > 0) {
          const share = (total / count).toFixed(2);
          newS.owedAmt =
            i === count - 1
              ? (total - parseFloat(share) * (count - 1)).toFixed(2)
              : share;
          newS.percent = (100 / count).toFixed(1);
        }
        return newS;
      });
      return updated;
    },
    []
  );

  // Recalculate on cost / payer / split-mode change
  useEffect(() => {
    if (memberSplits.length === 0) return;
    setMemberSplits((prev) => recalculate(totalCost, prev, splitEqually, payerId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCost, splitEqually, payerId]);

  const handleSplitChange = (index, field, value) => {
    setMemberSplits((prev) => {
      const total = parseFloat(totalCost || 0);
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "percent" && total > 0) {
        updated[index].owedAmt = (
          total *
          (parseFloat(value || 0) / 100)
        ).toFixed(2);
      } else if (field === "owedAmt" && total > 0) {
        updated[index].percent = (
          (parseFloat(value || 0) / total) *
          100
        ).toFixed(1);
      }
      return updated;
    });
  };

  const sumPaid = memberSplits.reduce(
    (acc, s) => acc + parseFloat(s.paid || 0),
    0
  );
  const sumOwed = memberSplits.reduce(
    (acc, s) => acc + parseFloat(s.owedAmt || 0),
    0
  );
  const total = parseFloat(totalCost || 0);
  const isDisabled = Math.abs(sumPaid - total) > 0.05 || total <= 0;

  const handleSubmit = async () => {
    const payload = {
      cost: totalCost,
      description,
      details: notes,
      currency_code: currency,
      group_id: activeGroup.id,
    };
    if (editId) payload.id = editId;
    memberSplits.forEach((s, i) => {
      payload[`users__${i}__user_id`] = s.id;
      payload[`users__${i}__paid_share`] = s.paid;
      payload[`users__${i}__owed_share`] = s.owedAmt;
    });
    await onSubmit(payload);
    resetForm();
  };

  const resetForm = () => {
    setEditId("");
    setDescription("");
    setTotalCost("0.00");
    setNotes("");
    setSplitEqually(true);
    setCurrency(currencies[0]?.currency_code || "INR");
    setPayerId(activeGroup.members[0]?.id?.toString() || "");
    setMemberSplits(
      activeGroup.members.map((m) => ({
        id: m.id.toString(),
        name: m.first_name,
        paid: "0.00",
        percent: "0",
        owedAmt: "0.00",
      }))
    );
  };

  const editExpense = (id) => {
    const exp = currentExpenses.find((e) => e.id === id);
    if (!exp) return;
    setEditId(id.toString());
    setDescription(exp.description);
    setTotalCost(exp.cost);
    setNotes(exp.details || "");
    setCurrency(exp.currency_code);
    setSplitEqually(false);
    setMemberSplits(
      activeGroup.members.map((m) => {
        const userData = exp.users.find(
          (u) => u.user_id.toString() === m.id.toString()
        );
        return {
          id: m.id.toString(),
          name: m.first_name,
          paid: userData?.paid_share || "0.00",
          percent: "0",
          owedAmt: userData?.owed_share || "0.00",
        };
      })
    );
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Expose editExpense via a ref-like approach on window for ExpenseHistory
  useEffect(() => {
    window.__editExpense = editExpense;
    return () => {
      delete window.__editExpense;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExpenses, activeGroup]);

  return (
    <section
      ref={formRef}
      className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200"
    >
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">
            {editId ? "Update Expense" : "Create Expense"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <input
              type="checkbox"
              id="split_equally"
              checked={splitEqually}
              onChange={(e) => setSplitEqually(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600"
            />
            <label
              htmlFor="split_equally"
              className="ml-2 text-xs md:text-sm font-semibold text-emerald-800 cursor-pointer whitespace-nowrap"
            >
              Split Equally
            </label>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border rounded-full px-3 py-1.5 text-xs bg-white font-medium outline-none border-gray-200"
          >
            {currencies.map((c) => (
              <option key={c.currency_code} value={c.currency_code}>
                {c.currency_code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="What was it for?"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Total Cost
          </label>
          <input
            type="number"
            step="0.01"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 font-mono text-base focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Who Paid?
          </label>
          <select
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {activeGroup.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name}
              </option>
            ))}
            <option value="multiple">Multiple...</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Notes / Details
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            rows="1"
            style={{ minHeight: "42px" }}
            placeholder="Add notes..."
          />
        </div>
      </div>

      <div className="table-container overflow-x-auto -mx-4 md:mx-0 border-t border-gray-100">
        <table className="w-full text-left text-xs md:text-sm min-w-[500px]">
          <thead>
            <tr className="text-gray-400 uppercase text-[10px] tracking-wider">
              <th className="p-4 font-bold">Member</th>
              <th className="p-4 font-bold w-32">Paid</th>
              <th className="p-4 font-bold w-24">Owed (%)</th>
              <th className="p-4 font-bold w-32 text-right">Owed (Amount)</th>
            </tr>
          </thead>
          <tbody>
            {memberSplits.map((s, i) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="p-4 font-bold text-gray-700 text-xs">
                  {s.name}
                </td>
                <td
                  className={`p-4 ${splitEqually ? "disabled-row" : ""}`}
                >
                  <input
                    type="number"
                    step="0.01"
                    value={s.paid}
                    onChange={(e) =>
                      handleSplitChange(i, "paid", e.target.value)
                    }
                    className="w-full p-2 border rounded text-xs font-mono"
                    disabled={splitEqually && payerId !== "multiple"}
                  />
                </td>
                <td
                  className={`p-4 ${splitEqually ? "disabled-row" : ""}`}
                >
                  <input
                    type="number"
                    step="0.1"
                    value={s.percent}
                    onChange={(e) =>
                      handleSplitChange(i, "percent", e.target.value)
                    }
                    className="w-full p-2 border rounded text-xs font-mono"
                    disabled={splitEqually}
                  />
                </td>
                <td
                  className={`p-4 text-right ${splitEqually ? "disabled-row" : ""}`}
                >
                  <input
                    type="number"
                    step="0.01"
                    value={s.owedAmt}
                    onChange={(e) =>
                      handleSplitChange(i, "owedAmt", e.target.value)
                    }
                    className="w-full p-2 border rounded text-xs text-right font-mono bg-gray-50"
                    disabled={splitEqually}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t pt-6">
        <div className="flex items-center w-full md:w-auto justify-between md:justify-start">
          <div className="text-xs md:text-sm space-x-4">
            <span className="text-gray-400 font-medium">
              Paid:{" "}
              <span className="text-gray-900 font-bold">
                {sumPaid.toFixed(2)}
              </span>
            </span>
            <span className="text-gray-400 font-medium">
              Owed:{" "}
              <span className="text-gray-900 font-bold">
                {sumOwed.toFixed(2)}
              </span>
            </span>
          </div>
          {editId && (
            <button
              onClick={resetForm}
              className="ml-4 text-xs text-red-600 font-bold hover:underline uppercase"
            >
              Cancel
            </button>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:bg-gray-300"
        >
          {editId ? "Update Expense" : "Create Expense"}
        </button>
      </div>
    </section>
  );
}
