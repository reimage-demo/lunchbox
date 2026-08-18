(function () {
  const page = document.body.dataset.page;
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");

  function setMenu(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
  }

  toggle?.addEventListener("click", () =>
    setMenu(!nav.classList.contains("open")),
  );
  nav
    ?.querySelectorAll("a, button")
    .forEach((control) =>
      control.addEventListener("click", () => setMenu(false)),
    );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) setMenu(false);
  });

  document.querySelectorAll("[data-nav] a").forEach((link) => {
    if (link.dataset.page === page) link.classList.add("active");
  });

  const reveal = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        reveal.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );
  document
    .querySelectorAll("[data-reveal]")
    .forEach((element) => reveal.observe(element));

  const footerBottom = document.querySelector(".site-footer .footer-bottom");
  if (footerBottom && !document.querySelector(".legal-links")) {
    const legalLinks = document.createElement("nav");
    legalLinks.className = "legal-links";
    legalLinks.setAttribute("aria-label", "Legal and accessibility");
    legalLinks.innerHTML =
      '<a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="cookie-policy.html">Cookies</a><a href="accessibility.html">Accessibility</a><a href="refund-policy.html">Refunds</a><button type="button" data-cookie-settings>Cookie settings</button>';
    footerBottom.before(legalLinks);
  }

  if (footerBottom && !document.querySelector(".footer-credit")) {
    const footerCredit = document.createElement("p");
    footerCredit.className = "footer-credit";
    footerCredit.innerHTML =
      'Powered by <a href="https://www.reimagebs.com" target="_blank" rel="noopener noreferrer">REIMAGE BUSINESS SOLUTIONS</a>';
    footerBottom.before(footerCredit);
  }

  const consentKey = "lunchbox_cookie_preference_v1";
  let consentBanner;
  function readConsent() {
    try {
      return (
        JSON.parse(localStorage.getItem(consentKey) || "null")?.choice || null
      );
    } catch {
      return null;
    }
  }
  function saveConsent(choice) {
    try {
      localStorage.setItem(
        consentKey,
        JSON.stringify({
          choice,
          version: 1,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {}
    document.documentElement.dataset.cookieConsent = choice;
    consentBanner?.setAttribute("hidden", "");
  }
  function showConsent() {
    if (!consentBanner) return;
    consentBanner.removeAttribute("hidden");
  }
  function setupConsent() {
    consentBanner = document.createElement("section");
    consentBanner.className = "cookie-banner";
    consentBanner.setAttribute("role", "dialog");
    consentBanner.setAttribute("aria-label", "Cookie choices");
    consentBanner.setAttribute("aria-live", "polite");
    consentBanner.setAttribute("hidden", "");
    consentBanner.innerHTML =
      '<div><h2>Your privacy choices</h2><p>We use necessary browser storage to operate this website and remember your preference. We do not currently use analytics or advertising cookies. <a href="cookie-policy.html">Read the cookie policy</a>.</p></div><div class="cookie-actions"><button type="button" class="cookie-deny" data-cookie-choice="denied">Deny optional cookies</button><button type="button" class="cookie-accept" data-cookie-choice="accepted">Accept optional cookies</button></div>';
    document.body.append(consentBanner);
    consentBanner
      .querySelectorAll("[data-cookie-choice]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          saveConsent(button.dataset.cookieChoice),
        ),
      );
    const savedChoice = readConsent();
    document.documentElement.dataset.cookieConsent = savedChoice || "unset";
    if (!savedChoice) showConsent();
  }
  setupConsent();
  document
    .querySelectorAll("[data-cookie-settings]")
    .forEach((button) => button.addEventListener("click", showConsent));

  const moneyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  function money(cents) {
    return moneyFormatter.format(cents / 100);
  }

  function escapeHtml(value = "") {
    return String(value).replace(
      /[&<>'"]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[char],
    );
  }

  function displayDate(value) {
    if (!value) return "";
    return dateFormatter.format(new Date(`${value}T12:00:00Z`));
  }

  function resolveAssetUrl(value = "") {
    if (!value || /^(?:https?:|blob:|data:)/i.test(value)) return value;
    const base =
      window.LUNCHBOX_CONFIG?.publicSiteUrl || document.baseURI;
    return new URL(String(value).replace(/^\.\//, "").replace(/^\//, ""), base)
      .href;
  }

  window.LunchBoxUtils = { money, escapeHtml, displayDate, resolveAssetUrl };
})();
