import React, { useState, useEffect, useCallback, useRef } from "react";

const EXPENSE_CATEGORIES = [
  "Important Documents",
  "Preparation",
  "Currency Conversion",
  "Local Transit",
  "Food",
  "Leisure",
  "Memento",
  "Sight Seeing",
  "Misc",
  "Transit - Flight",
  "Transit - Train",
  "Stays - Hotel",
  "Stays - Hostel"
];

export default function ExpenseForm({
  activeGroup,
  currencies,
  currentExpenses,
  currentUser,
  tripLocations = [],
  onSubmit,
}) {
  const [editId, setEditId] = useState("");
  const [description, setDescription] = useState("");
  const [totalCost, setTotalCost] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState(currencies[0]?.currency_code || "INR");
  const [splitEqually, setSplitEqually] = useState(true);
  const [personalExpense, setPersonalExpense] = useState(false);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const skipRecalcRef = useRef(false);

  // Resolve the default payer to the logged-in user if they are a group member
  const resolveDefaultPayer = () => {
    if (currentUser?.name) {
      const match = activeGroup.members.find(
        (m) => m.first_name === currentUser.name.split(" ")[0]
      );
      if (match) return match.id.toString();
    }
    return activeGroup.members[0]?.id?.toString() || "";
  };

  const [payerId, setPayerId] = useState(resolveDefaultPayer);
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
    setPayerId(resolveDefaultPayer());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (skipRecalcRef.current) {
      skipRecalcRef.current = false;
      return;
    }
    setMemberSplits((prev) => recalculate(totalCost, prev, splitEqually, payerId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCost, splitEqually, payerId]);

  const handleSplitChange = (index, field, value) => {
    setMemberSplits((prev) => {
      const total = parseFloat(totalCost || 0);
      const updated = prev.map((s) => ({ ...s }));
      updated[index][field] = value;

      if (field === "paid") {
        if (splitEqually) {
          // Auto-balance paid across other members only when splitting equally
          const editedPaid = parseFloat(value || 0);
          const otherCount = updated.length - 1;
          if (otherCount > 0) {
            const remainder = Math.max(0, total - editedPaid);
            const each = (remainder / otherCount).toFixed(2);
            let distributed = 0;
            updated.forEach((s, i) => {
              if (i !== index) {
                if (i === updated.length - 1 || (i > index && distributed + parseFloat(each) > remainder)) {
                  s.paid = (remainder - distributed).toFixed(2);
                } else {
                  s.paid = each;
                  distributed += parseFloat(each);
                }
              }
            });
          }
        }
      } else if (field === "percent" && total > 0) {
        updated[index].owedAmt = (total * (parseFloat(value || 0) / 100)).toFixed(2);
        if (splitEqually) {
          // Auto-balance owed across other members only when splitting equally
          const editedOwed = parseFloat(updated[index].owedAmt);
          const otherCount = updated.length - 1;
          if (otherCount > 0) {
            const remainder = Math.max(0, total - editedOwed);
            const each = (remainder / otherCount).toFixed(2);
            let distributed = 0;
            updated.forEach((s, i) => {
              if (i !== index) {
                if (i === updated.length - 1 || (i > index && distributed + parseFloat(each) > remainder)) {
                  s.owedAmt = (remainder - distributed).toFixed(2);
                } else {
                  s.owedAmt = each;
                  distributed += parseFloat(each);
                }
                s.percent = total > 0 ? ((parseFloat(s.owedAmt) / total) * 100).toFixed(1) : "0";
              }
            });
          }
        }
      } else if (field === "owedAmt" && total > 0) {
        updated[index].percent = ((parseFloat(value || 0) / total) * 100).toFixed(1);
        if (splitEqually) {
          // Auto-balance owed across other members only when splitting equally
          const editedOwed = parseFloat(value || 0);
          const otherCount = updated.length - 1;
          if (otherCount > 0) {
            const remainder = Math.max(0, total - editedOwed);
            const each = (remainder / otherCount).toFixed(2);
            let distributed = 0;
            updated.forEach((s, i) => {
              if (i !== index) {
                if (i === updated.length - 1 || (i > index && distributed + parseFloat(each) > remainder)) {
                  s.owedAmt = (remainder - distributed).toFixed(2);
                } else {
                  s.owedAmt = each;
                  distributed += parseFloat(each);
                }
                s.percent = total > 0 ? ((parseFloat(s.owedAmt) / total) * 100).toFixed(1) : "0";
              }
            });
          }
        }
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
      location,
      category,
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
    setPersonalExpense(false);
    setCurrency(currencies[0]?.currency_code || "INR");
    setLocation("");
    setCategory("");
    setPayerId(resolveDefaultPayer());
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

    // Determine the actual payer(s) from the record
    const payers = exp.users.filter((u) => parseFloat(u.paid_share) > 0);
    const resolvedPayer =
      payers.length === 1 ? payers[0].user_id.toString() : "multiple";

    // Build splits from the record as-is
    const loadedSplits = activeGroup.members.map((m) => {
      const userData = exp.users.find(
        (u) => u.user_id.toString() === m.id.toString()
      );
      const total = parseFloat(exp.cost || 0);
      const owed = parseFloat(userData?.owed_share || 0);
      return {
        id: m.id.toString(),
        name: m.first_name,
        paid: userData?.paid_share || "0.00",
        percent: total > 0 ? ((owed / total) * 100).toFixed(1) : "0",
        owedAmt: userData?.owed_share || "0.00",
      };
    });

    // Skip the next recalculate effect so it doesn't overwrite paid/owed values
    skipRecalcRef.current = true;

    setEditId(id.toString());
    setDescription(exp.description);
    setTotalCost(exp.cost);
    setNotes(exp.details || "");
    setCurrency(exp.currency_code);
    setLocation(exp.location || "");
    setCategory(exp.category || "");
    setPayerId(resolvedPayer);
    setSplitEqually(false);
    setMemberSplits(loadedSplits);
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
              onChange={(e) => {
                setSplitEqually(e.target.checked);
                if (e.target.checked) setPersonalExpense(false);
              }}
              className="w-4 h-4 rounded text-emerald-600"
            />
            <label
              htmlFor="split_equally"
              className="ml-2 text-xs md:text-sm font-semibold text-emerald-800 cursor-pointer whitespace-nowrap"
            >
              Split Equally
            </label>
          </div>
          <div className="flex items-center bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <input
              type="checkbox"
              id="personal_expense"
              checked={personalExpense}
              onChange={(e) => {
                const checked = e.target.checked;
                setPersonalExpense(checked);
                if (checked) {
                  setSplitEqually(false);
                  skipRecalcRef.current = true;
                  const total = parseFloat(totalCost || 0);
                  setMemberSplits((prev) =>
                    prev.map((s) => {
                      const isCurrentUser =
                        currentUser?.name &&
                        s.name === currentUser.name.split(" ")[0];
                      return {
                        ...s,
                        percent: isCurrentUser ? "100.0" : "0.0",
                        owedAmt: isCurrentUser ? total.toFixed(2) : "0.00",
                      };
                    })
                  );
                }
              }}
              className="w-4 h-4 rounded text-blue-600"
            />
            <label
              htmlFor="personal_expense"
              className="ml-2 text-xs md:text-sm font-semibold text-blue-800 cursor-pointer whitespace-nowrap"
            >
              Personal Expense
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Location
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">{tripLocations.length === 0 ? "No locations set" : "Select location..."}</option>
            {tripLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Expense Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Select category...</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Notes / Details
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Add notes..."
          />
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 md:mx-0 border-t border-gray-100">
        <table className="w-full text-left text-[11px] md:text-xs">
          <thead>
            <tr className="text-gray-400 uppercase text-[9px] md:text-[10px] tracking-wider">
              <th className="px-1.5 py-1 md:p-3 font-bold">Member</th>
              <th className="px-1.5 py-1 md:p-3 font-bold w-20 md:w-32">Paid</th>
              <th className="px-1.5 py-1 md:p-3 font-bold w-16 md:w-24">%</th>
              <th className="px-1.5 py-1 md:p-3 font-bold w-20 md:w-32 text-right">Owed</th>
            </tr>
          </thead>
          <tbody>
            {memberSplits.map((s, i) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="px-1.5 py-1 md:p-3 font-bold text-gray-700 text-[11px] md:text-xs">
                  {s.name}
                </td>
                <td className={`px-1.5 py-1 md:p-3 ${splitEqually ? "disabled-row" : ""}`}>
                  <input
                    type="number"
                    step="0.01"
                    value={s.paid}
                    onChange={(e) => handleSplitChange(i, "paid", e.target.value)}
                    className="w-full p-1 md:p-2 border rounded text-[11px] md:text-xs font-mono"
                    disabled={splitEqually && payerId !== "multiple"}
                  />
                </td>
                <td className={`px-1.5 py-1 md:p-3 ${splitEqually ? "disabled-row" : ""}`}>
                  <input
                    type="number"
                    step="0.1"
                    value={s.percent}
                    onChange={(e) => handleSplitChange(i, "percent", e.target.value)}
                    className="w-full p-1 md:p-2 border rounded text-[11px] md:text-xs font-mono"
                    disabled={splitEqually}
                  />
                </td>
                <td className={`px-1.5 py-1 md:p-3 text-right ${splitEqually ? "disabled-row" : ""}`}>
                  <input
                    type="number"
                    step="0.01"
                    value={s.owedAmt}
                    onChange={(e) => handleSplitChange(i, "owedAmt", e.target.value)}
                    className="w-full p-1 md:p-2 border rounded text-[11px] md:text-xs text-right font-mono bg-gray-50"
                    disabled={splitEqually}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 md:mt-6 flex flex-row justify-between items-center gap-2 md:gap-4 border-t pt-2 md:pt-6">
        <div className="text-[10px] md:text-sm space-x-2 md:space-x-4">
          <span className="text-gray-400 font-medium">
            Paid: <span className="text-gray-900 font-bold">{sumPaid.toFixed(2)}</span>
          </span>
          <span className="text-gray-400 font-medium">
            Owed: <span className="text-gray-900 font-bold">{sumOwed.toFixed(2)}</span>
          </span>
        </div>
        <div className="flex gap-2">
          {editId && (
            <button
              onClick={resetForm}
              className="bg-red-500 text-white px-4 py-2 md:px-8 md:py-3 rounded-xl text-xs md:text-sm font-bold hover:bg-red-600 transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            className="bg-emerald-600 text-white px-4 py-2 md:px-8 md:py-3 rounded-xl text-xs md:text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50 disabled:bg-gray-300"
          >
            {editId ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </section>
  );
}
