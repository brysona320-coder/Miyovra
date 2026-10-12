// Turn Supabase Auth failures into useful, non-sensitive messages for users.
export function isInAppBrowser(userAgent = "") {
  return /Instagram|FBAN|FBAV|TikTok|Snapchat/i.test(String(userAgent));
}

export function authErrorMessage(error, { mode = "login", inAppBrowser = false, online = true } = {}) {
  const message = String(error?.message || "");
  const code = String(error?.code || "").toLowerCase();
  const status = Number(error?.status || 0);

  if (!online) return "You're offline. Connect to the internet and try again.";

  const networkFailure =
    /load failed|failed to fetch|fetch failed|network request failed|networkerror|network error|timed out|timeout/i.test(message) ||
    code === "network_error" || code === "request_timeout";
  if (networkFailure) {
    const retryAdvice = inAppBrowser
      ? "Open Miyovra in Safari or Chrome instead of the Instagram app's browser."
      : "Check your internet connection and try again.";
    const confirmationAdvice = mode === "signup"
      ? " If you receive a confirmation email, follow it instead of signing up again."
      : "";
    return "Couldn't reach Miyovra's account service. " + retryAdvice +
      " If it keeps failing, the site owner should check Supabase." + confirmationAdvice;
  }
  if (status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "Too many account requests. Please wait a little while before trying again.";
  }
  if (code === "email_exists" || code === "user_already_exists") {
    return "An account may already use this email. Try logging in instead.";
  }
  if (code === "email_address_invalid") return "Enter a valid email address.";
  if (code === "signup_disabled") return "New accounts are currently disabled. Contact the site owner.";
  if (code === "weak_password") return message || "Please choose a stronger password.";
  if (/database error saving new user/i.test(message)) {
    return "Miyovra's account database needs attention. Ask the site owner to check its Supabase signup setup.";
  }
  if (status >= 500) return "Miyovra's account service is unavailable right now. Please try again later.";
  return message || "The account request failed. Please try again.";
}
