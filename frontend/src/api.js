const generateRequestId = () =>
  `fe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const apiFetch = (url, options = {}) => {
  const requestId = generateRequestId();
  const headers = { ...(options.headers || {}), "X-Request-ID": requestId };
  console.log(`[API] ${options.method || "GET"} /api${url}  rid=${requestId}`);
  return fetch(`/api${url}`, { credentials: "include", ...options, headers }).then(
    (res) => {
      console.log(`[API] ${options.method || "GET"} /api${url}  rid=${requestId}  status=${res.status}`);
      return res;
    },
    (err) => {
      console.error(`[API] ${options.method || "GET"} /api${url}  rid=${requestId}  ERROR:`, err);
      throw err;
    }
  );
};

export async function checkLogin() {
  const res = await apiFetch("/check_login");
  return res.json();
}

export async function fetchGroups() {
  const res = await apiFetch(`/get_groups?t=${Date.now()}`);
  if (res.status === 401) {
    return { groups: [] };
  }
  return res.json();
}

export async function fetchExpenses(groupId) {
  const res = await apiFetch(`/get_expenses/${groupId}?t=${Date.now()}`);
  return res.json();
}

export async function createExpense(payload) {
  const res = await apiFetch("/create_expense", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteExpenseApi(expenseId) {
  const res = await apiFetch(`/delete_expense/${expenseId}`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchCurrencies() {
  const res = await apiFetch("/get_currencies");
  return res.json();
}

export async function createTripApi(details) {
  const res = await apiFetch("/create_trip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return res.json();
}

export async function updateTripApi(tripId, details) {
  const res = await apiFetch(`/update_trip/${tripId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return res.json();
}

export async function deleteTripApi(tripId) {
  const res = await apiFetch(`/delete_trip/${tripId}`, { method: "POST" });
  return res.json();
}

export async function getTripsApi() {
  const res = await apiFetch("/get_trips");
  return res.json();
}

export async function fetchMyExpenses(groupId) {
  const res = await apiFetch(`/get_my_expenses/${groupId}?t=${Date.now()}`);
  return res.json();
}

export async function fetchPersonalExpenses(groupId) {
  const res = await apiFetch(`/get_personal_expenses/${groupId}?t=${Date.now()}`);
  return res.json();
}

export async function syncExpenses(groupId) {
  const res = await apiFetch(`/sync_expenses/${groupId}`, { method: "POST" });
  return res.json();
}

export async function convertCurrency(from, to, amount) {
  const res = await apiFetch(`/convert/${from}/${to}/${amount}`);
  return res.json();
}

export async function convertBatch(base, targets) {
  const res = await apiFetch("/convert_batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base, targets }),
  });
  return res.json();
}

export async function updateStayDates(id, startDate, endDate, location) {
  const res = await apiFetch("/update_stay_dates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, start_date: startDate, end_date: endDate, location }),
  });
  return res.json();
}

export async function updateExpenseDetails(id, location, category) {
  const res = await apiFetch("/update_expense_details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, location, category }),
  });
  return res.json();
}
