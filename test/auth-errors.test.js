import test from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage, isInAppBrowser } from "../src/auth-errors.js";

test("recognizes in-app browsers including Instagram", () => {
  assert.equal(isInAppBrowser("Instagram 350.0.0 iPhone"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 Safari/605.1.15"), false);
});

test("explains the iOS Load failed signup error and offers external browser recovery", () => {
  const text = authErrorMessage(new TypeError("Load failed"), {
    mode: "signup", inAppBrowser: true
  });
  assert.match(text, /Safari or Chrome/);
  assert.match(text, /confirmation email/);
  assert.doesNotMatch(text, /^Load failed$/);
});

test("does not wrongly identify all signup failures as network problems", () => {
  assert.match(authErrorMessage({ code: "email_exists", message: "User already registered" }), /logging in/);
  assert.match(authErrorMessage({ code: "over_email_send_rate_limit", status: 429 }), /wait/);
  assert.match(authErrorMessage({ code: "signup_disabled" }), /disabled/);
  assert.match(authErrorMessage({ message: "Database error saving new user" }), /database/);
  assert.equal(authErrorMessage({ message: "Invalid login credentials" }), "Invalid login credentials");
});

test("handles offline clients and general service outages", () => {
  assert.match(authErrorMessage(new TypeError("Failed to fetch"), { online: false }), /offline/);
  assert.match(authErrorMessage({ status: 503 }), /unavailable/);
  assert.match(authErrorMessage(new Error("Failed to fetch")), /Check your internet connection/);
});
