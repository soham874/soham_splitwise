const apiFetch = (url, options = {}) =>
  fetch(url, { credentials: "include", ...options });

export async function checkLogin() {
  const res = await apiFetch("/check_login");
  return res.json();
}

export async function fetchGroups() {
  const res = await apiFetch(`/get_groups?t=${Date.now()}`);
  if (res.status === 401) {
    window.location.href = "/login";
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

export async function saveTripDetailsApi(details) {
  const res = await apiFetch("/save_trip_details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return res.json();
}

export async function getTripDetailsApi() {
  const res = await apiFetch("/get_trip_details");
  return res.json();
}
