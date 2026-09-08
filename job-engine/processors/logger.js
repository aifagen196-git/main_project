// processors/logger.js
//
// Thin, consistent console logger for collectors/scripts — a prefixed,
// leveled wrapper so output looks the same whether it comes from
// greenhouse.js, linkedin.js, or a cleanup script.

function ts() {
  return new Date().toISOString().slice(11, 19);
}

export function createLogger(scope) {
  const prefix = scope ? `[${scope}]` : "";
  return {
    info: (...args) => console.log(`${ts()} ${prefix}`, ...args),
    success: (...args) => console.log(`${ts()} ${prefix} ✅`, ...args),
    warn: (...args) => console.warn(`${ts()} ${prefix} ⚠`, ...args),
    error: (...args) => console.error(`${ts()} ${prefix} ❌`, ...args),
    table: (data) => console.table(data),
  };
}

export default createLogger;
