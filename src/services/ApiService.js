const baseUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://jensenhuang.stei.fun"
).replace(/\/$/, "");

const users = "/api/collections/users";
const entries = "/api/collections/diary_entries/records";
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

/** @param {string} token @param {string} day A YYYY-MM-DD date. */
export async function listEntries(token, day) {
  const filter = encodeURIComponent(`loggedOn = "${day}"`);
  const data = await request(`${entries}?filter=${filter}&perPage=500`, { token });
  return data.items;
}

/** @param {string} token @param {{id: string, [field: string]: string | number}} entry */
export async function createEntry(token, entry) {
  try {
    return await request(entries, { method: "POST", token, body: entry });
  } catch (saveError) {
    const existing = await request(`${entries}/${entry.id}`, { token }).catch(() => null);
    if (existing && Object.entries(entry).every(([key, value]) => existing[key] === value)) {
      return existing;
    }
    throw saveError;
  }
}
