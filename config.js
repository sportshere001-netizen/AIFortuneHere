// config.js
// Intentionally left blank. Engine will automatically cascade to the Free Open-Source AI Network.
const GEMINI_API_KEY = "";

// Global Security: Neutralize malicious code injections (XSS Protection)
window.escapeHTML = function(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, function(tag) {
        const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return chars[tag] || tag;
    });
};
