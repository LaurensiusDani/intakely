const baseUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://jensenhuang.stei.fun"
).replace(/\/$/, "");

const users = "/api/collections/users";
const entries = "/api/collections/diary_entries/records";
const water = "/api/collections/water_entries/records";
const onboarding = "/api/intakely/onboarding";

/**
 * @param {string} path
 * @param {{ method?: string, body?: object, token?: string }} options
 */
async function request(path, { method = "GET", body, token } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(baseUrl + path, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body && { "Content-Type": "application/json" }),
        ...(token && { Authorization: token }),
      },
      body: body && JSON.stringify(body),
    });

    if (response.status === 429) {
      throw new Error("Too many requests. Wait a moment and try again.");
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const fieldError = Object.values(data?.data ?? {}).find(
        (field) => field?.message,
      );
      throw new Error(fieldError?.message ?? data?.message ?? "The service is unavailable. Try again.");
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The request timed out. Try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** @param {{name: string, email: string, password: string}} account */
export function signUp({ name, email, password }) {
  return request(users + "/records", {
    method: "POST",
    body: { name, email, password, passwordConfirm: password },
  });
}

/** @param {string} email @param {string} password */
export async function signIn(email, password) {
  const session = await request(users + "/auth-with-password", {
    method: "POST",
    body: { identity: email, password },
  });
  const status = await request(onboarding, { token: session.token });
  return { ...session, onboardingComplete: status.completed };
}

/** @param {string} token @param {object} body */
export function estimateTargets(token, body) {
  return request(onboarding + "/estimate", { method: "POST", token, body });
}

/** @param {string} token @param {object} body */
export function finishOnboarding(token, body) {
  return request(onboarding, { method: "POST", token, body });
}

/** @param {string} token @param {string} firstDay @param {string} nextMonth */
export async function listDiaryMonth(token, firstDay, nextMonth) {
  return listDiaryRecords(token, entries, `loggedOn >= "${firstDay}" && loggedOn < "${nextMonth}"`);
}

/** @param {string} token @param {string} day */
export function listWaterEntries(token, day) {
  return listDiaryRecords(token, water, `loggedOn = "${day}"`);
}

/** @param {string} token @param {string} path @param {string} filter */
async function listDiaryRecords(token, path, filter) {
  const items = [];
  let page = 1;
  let totalPages;
  do {
    const data = await request(`${path}?filter=${encodeURIComponent(filter)}&sort=loggedOn,id&perPage=200&page=${page}`, { token });
    items.push(...data.items);
    totalPages = data.totalPages;
    page++;
  } while (page <= totalPages);
  return items;
}

/** @param {string} token @param {{id: string, [field: string]: string | number}} entry */
export async function createEntry(token, entry) {
  return createDiaryRecord(token, entries, entry);
}

/** @param {string} token @param {{id: string, loggedOn: string, owner: string, amountMl: number}} entry */
export function createWaterEntry(token, entry) {
  return createDiaryRecord(token, water, entry);
}

/** @param {string} token @param {string} path @param {{id: string, [field: string]: string | number}} entry */
async function createDiaryRecord(token, path, entry) {
  try {
    return await request(path, { method: "POST", token, body: entry });
  } catch (saveError) {
    const existing = await request(`${path}/${entry.id}`, { token }).catch(() => null);
    if (existing && Object.entries(entry).every(([key, value]) => existing[key] === value)) {
      return existing;
    }
    throw saveError;
  }
}

/** @param {string} token @param {string} id */
export function getDiaryEntry(token, id) {
  return request(`${entries}/${encodeURIComponent(id)}`, { token });
}

/** @param {string} token @param {string} id @param {number} quantity */
export function updateDiaryServing(token, id, quantity) {
  return request(`${entries}/${encodeURIComponent(id)}`, { method: "PATCH", token, body: { quantity } });
}

/** @param {string} token @param {string} id */
export function deleteDiaryEntry(token, id) {
  return request(`${entries}/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

/** @param {string} token @param {string} id @param {number} amountMl */
export function updateWaterEntry(token, id, amountMl) {
  return request(`${water}/${encodeURIComponent(id)}`, { method: "PATCH", token, body: { amountMl } });
}

/** @param {string} token @param {string} id */
export function deleteWaterEntry(token, id) {
  return request(`${water}/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

/** @param {string} token @param {string} day */
export async function getDiaryTarget(token, day) {
  const data = await request(`/api/intakely/diary-targets?day=${encodeURIComponent(day)}`, { token });
  return data.target;
}
