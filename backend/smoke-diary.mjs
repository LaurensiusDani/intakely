import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const base = process.argv[2]?.replace(/\/$/, "");
assert(base, "Usage: node backend/smoke-diary.mjs https://YOUR-HOST");

const accounts = "/api/collections/users";
const diary = "/api/collections/diary_entries/records";
const onboarding = "/api/intakely/onboarding";
const water = "/api/collections/water_entries/records";

async function call(path, { method = "GET", token, body, expect = 200 } = {}) {
  const response = await fetch(base + path, {
    method,
    signal: AbortSignal.timeout(10000),
    headers: {
      ...(token && { Authorization: token }),
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body && JSON.stringify(body),
  });
  assert.equal(response.status, expect, `${method} ${path}`);
  return response.status === 204 ? null : response.json();
}

async function createAccount(name) {
  const email = `intakely-smoke-${randomBytes(8).toString("hex")}@example.com`;
  const password = randomBytes(18).toString("hex");
  await call(accounts + "/records", {
    method: "POST",
    body: { name, email, password, passwordConfirm: password },
  });
  return call(accounts + "/auth-with-password", {
    method: "POST",
    body: { identity: email, password },
  });
}

const { token, record } = await createAccount("Diary Smoke Owner");
const other = await createAccount("Diary Smoke Other");
assert.equal((await call(onboarding, { token })).completed, false);
const body = { age: 24, heightCm: 175, weightKg: 68, sex: "male", activity: "moderate", goal: "bulking" };
await call(onboarding + "/estimate", { method: "POST", token, body: { ...body, age: 17 }, expect: 400 });
const estimate = await call(onboarding + "/estimate", { method: "POST", token, body });
assert.deepEqual(estimate, { caloriesKcal: 2770, proteinPct: 30, carbsPct: 45, fatPct: 25 });
await call(onboarding, { method: "POST", token, body: { ...estimate, proteinPct: 5 }, expect: 400 });
await call(onboarding, { method: "POST", token, body: { ...estimate, body } });
await call(onboarding, { method: "POST", token, body: { ...estimate, body } });
assert.equal((await call(onboarding, { token })).completed, true);
assert.equal((await call(onboarding, { token: other.token })).completed, false);
await call(onboarding, { method: "POST", token: other.token, body: { ...estimate, waterMl: 2000 } });
assert.equal((await call(onboarding, { token: other.token })).completed, true);

const id = randomBytes(8).toString("hex").slice(0, 15);
const path = `${diary}/${id}`;
const food = {
  id,
  owner: record.id,
  loggedOn: new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10),
  meal: "breakfast",
  name: "Smoke test food",
  quantity: 1,
  unit: "serving",
  caloriesKcal: 22,
};

const targets = `/api/intakely/diary-targets?day=${food.loggedOn}`;
assert.deepEqual((await call(targets, { token })).target, { caloriesKcal: 2770, proteinGrams: 207.75, waterMl: null });
assert.equal((await call(targets, { token: other.token })).target.waterMl, 2000);

await call(diary, { method: "POST", token: other.token, body: food, expect: 400 });
await call(diary, { method: "POST", token, body: { ...food, loggedOn: "2099-01-01" }, expect: 400 });
await call(diary, { method: "POST", token, body: food });
try {
  await call(diary, { method: "POST", token, body: food, expect: 400 });
  assert.equal((await call(path, { token })).referenceProteinG, -1);
  const updated = await call(path, { method: "PATCH", token, body: { quantity: 2 } });
  assert.equal(updated.caloriesKcal, 44);
  assert.equal(updated.referenceCaloriesKcal, 22);
  await call(path, { method: "PATCH", token, body: { quantity: 3, caloriesKcal: 20 }, expect: 400 });
  assert.deepEqual((await call(diary, { token })).items.map((item) => item.id), [id]);
  assert.deepEqual((await call(diary, { token: other.token })).items, []);
  await call(path, { token: other.token, expect: 404 });
  await call(path, { method: "PATCH", token: other.token, body: { name: "Changed" }, expect: 404 });
  await call(path, { method: "PATCH", token, body: { owner: other.record.id }, expect: 404 });
} finally {
  await call(path, { method: "DELETE", token, expect: 204 });
}

const drink = { owner: record.id, loggedOn: food.loggedOn, amountMl: 250 };
const saved = await call(water, { method: "POST", token, body: drink });
const waterPath = `${water}/${saved.id}`;
try {
  assert.equal(saved.amountMl, 250);
  await call(waterPath, { token: other.token, expect: 404 });
  assert.equal((await call(waterPath, { method: "PATCH", token, body: { amountMl: 400 } })).amountMl, 400);
} finally {
  await call(waterPath, { method: "DELETE", token, expect: 204 });
}

console.log("Signup, onboarding, dated targets, food serving edits, and private water logging passed.");
