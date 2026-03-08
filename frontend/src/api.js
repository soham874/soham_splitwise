const generateRequestId = () =>
  `fe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ── Offline queue helpers ──────────────────────────────────────────────
const OFFLINE_QUEUE_KEY = "offline_expense_queue";
const CACHED_RATES_KEY = "cached_conversion_rates";

function getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); }
  catch { return []; }
}

function saveOfflineQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueueCount() {
  return getOfflineQueue().length;
}

export async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return [];
  const results = [];
  const remaining = [];
  for (const item of queue) {
    try {
      const { _offlineId, _queuedAt, ...payload } = item;
      const res = await apiFetch("/create_expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      results.push({ offlineId: _offlineId, result: await res.json() });
    } catch {
      remaining.push(item);
    }
  }
  saveOfflineQueue(remaining);
  return results;
}

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
  if (!navigator.onLine) {
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const queue = getOfflineQueue();
    queue.push({ ...payload, _offlineId: tempId, _queuedAt: new Date().toISOString() });
    saveOfflineQueue(queue);
    return { expenses: [{ id: tempId, description: payload.description }], _offline: true };
  }
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
  if (!navigator.onLine) {
    const cached = getCachedRates();
    const key = `${from}_${to}`;
    if (cached[key]) return { rate: cached[key], result: Math.round(amount * cached[key] * 100) / 100, _offline: true };
  }
  const res = await apiFetch(`/convert/${from}/${to}/${amount}`);
  const data = await res.json();
  if (data.rate) cacheRate(from, to, data.rate);
  return data;
}

export async function convertBatch(base, targets) {
  if (!navigator.onLine) {
    const cached = getCachedRates();
    const rates = {};
    for (const t of targets) {
      const key = `${base}_${t}`;
      if (cached[key]) rates[t] = cached[key];
    }
    if (Object.keys(rates).length === targets.length) return { base, rates, _offline: true };
  }
  const res = await apiFetch("/convert_batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base, targets }),
  });
  const data = await res.json();
  if (data.rates) {
    for (const [t, r] of Object.entries(data.rates)) cacheRate(base, t, r);
  }
  return data;
}

// ── Conversion rate cache ──────────────────────────────────────────────
function getCachedRates() {
  try { return JSON.parse(localStorage.getItem(CACHED_RATES_KEY) || "{}"); }
  catch { return {}; }
}

function cacheRate(from, to, rate) {
  const cached = getCachedRates();
  cached[`${from}_${to}`] = rate;
  localStorage.setItem(CACHED_RATES_KEY, JSON.stringify(cached));
}

export async function updateStayDates(id, startDate, endDate, location) {
  const res = await apiFetch("/update_stay_dates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, start_date: startDate, end_date: endDate, location }),
  });
  return res.json();
}

export async function getLocationCoordsApi(names) {
  const res = await apiFetch(`/location_coords?names=${encodeURIComponent(names.join(","))}`);
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

export async function fetchEmergencyServices(location, category = "all") {
  const res = await apiFetch(
    `/emergency_services?location=${encodeURIComponent(location)}&category=${encodeURIComponent(category)}`
  );
  return res.json();
}
