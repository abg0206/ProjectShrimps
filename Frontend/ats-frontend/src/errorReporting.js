// Call initErrorReporting() once, early, in your app's entry point (e.g. index.js / main.jsx).
export function initErrorReporting() {
  window.addEventListener('error', (e) => {
    reportError({
      message: e.message,
      stack: e.error?.stack,
      url: window.location.href,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    reportError({
      message: 'Unhandled promise rejection',
      stack: e.reason?.stack || String(e.reason),
      url: window.location.href,
    });
  });
}

function reportError(payload) {
  fetch('/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Swallow — don't let error reporting itself throw.
  });
}
