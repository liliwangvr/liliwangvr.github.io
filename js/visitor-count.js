(function () {
  "use strict";
  function start() {
    var value = document.getElementById("busuanzi_value_site_uv");
    if (!value) return;
    var key = "site-visitor-count";
    var last = "";
    try { last = localStorage.getItem(key) || ""; } catch (_) {}
    function isCount(text) { return /^\d+$/.test(text.trim()); }
    function remember() {
      var text = value.textContent.trim();
      if (!isCount(text)) return false;
      value.removeAttribute("title");
      try { localStorage.setItem(key, text); } catch (_) {}
      return true;
    }
    if (!remember()) {
      if (isCount(last)) {
        value.textContent = last;
        value.title = "Last successfully loaded count";
      } else {
        value.textContent = "Loading…";
      }
    }
    var observer = new MutationObserver(function () {
      remember();
    });
    observer.observe(value, { childList: true, characterData: true, subtree: true });
    setTimeout(function () {
      if (isCount(value.textContent) && !value.title) return;
      var retry = document.createElement("script");
      retry.src = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
      retry.async = true;
      document.head.appendChild(retry);
    }, 8000);
    setTimeout(function () {
      if (!isCount(value.textContent)) value.textContent = "Unavailable";
    }, 20000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}());
