// PureFlow Plumbing Co. — front-end logic
// =====================================================
// TO CONNECT QUOTES TO CLIENT EMAIL:
// 1. Change CONFIG.QUOTE_EMAIL to the real inbox (e.g. quotes@pureflowplumbing.com)
// 2. Deploy the site, submit the form ONCE, then click the
//    "Activate Form" email FormSubmit sends to that inbox.
// 3. Done — every future quote lands directly in that inbox.
//    No backend, no API keys needed.
// Alternative: swap FORM_ENDPOINT to Formspree/Web3Forms if preferred.

const CONFIG = {
  QUOTE_EMAIL: "quotes@pureflowplumbing.com", // <-- REPLACE with client email
  USE_AJAX: true,
};

function formEndpoint() {
  return `https://formsubmit.co/ajax/${CONFIG.QUOTE_EMAIL}`;
}

// Mobile nav
const toggle = document.getElementById("navToggle");
const menu = document.getElementById("mobileMenu");
if (toggle && menu) {
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));
}

// Pre-fill service from card links (hero mini -> main form, service cards -> main form)
function wireServiceLinks() {
  document.querySelectorAll('[data-service]').forEach((el) => {
    el.addEventListener("click", () => {
      const v = el.getAttribute("data-service");
      const sel = document.getElementById("serviceSelect");
      if (sel && v) sel.value = v;
    });
  });
}
wireServiceLinks();

// Hero mini form -> scrolls to full quote form with values carried over
const mini = document.getElementById("heroMiniForm");
if (mini) {
  mini.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(mini);
    const service = fd.get("service") || "";
    const suburb = fd.get("suburb") || "";
    const phone = fd.get("phone") || "";
    const main = document.getElementById("quoteForm");
    if (main) {
      if (service) main.querySelector('[name="service"]').value = service;
      if (suburb) main.querySelector('[name="suburb"]').value = suburb;
      if (phone) main.querySelector('[name="phone"]').value = phone;
    }
    document.getElementById("quote").scrollIntoView({ behavior: "smooth" });
  });
}

// Main quote form -> sends directly to client email via FormSubmit AJAX
const form = document.getElementById("quoteForm");
const status = document.getElementById("formStatus");
const submitBtn = document.getElementById("quoteSubmit");

function setStatus(msg, kind) {
  if (!status) return;
  status.textContent = msg;
  status.className = "form-status " + (kind || "");
}

function mailtoFallback(data) {
  const subject = encodeURIComponent(`Quote request — ${data.service} — ${data.suburb}`);
  const body = encodeURIComponent(
    `Name: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email}\nSuburb: ${data.suburb}\nService: ${data.service}\nUrgency: ${data.urgency}\nPreferred time: ${data.preferred_time}\n\nDetails:\n${data.message}`
  );
  window.location.href = `mailto:${CONFIG.QUOTE_EMAIL}?subject=${subject}&body=${body}`;
}

if (form) {
  // Show dispatch email in UI from single source of truth
  const label = document.getElementById("dispatchEmailLabel");
  if (label) label.textContent = CONFIG.QUOTE_EMAIL;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    if (fd.get("_honey")) return; // bot trap

    const data = Object.fromEntries(fd.entries());

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    setStatus("Sending your request…", "");

    try {
      if (!CONFIG.USE_AJAX) {
        mailtoFallback(data);
        setStatus("Opening your email app to complete the request.", "ok");
        return;
      }
      const res = await fetch(formEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          email: data.email,
          suburb: data.suburb,
          service: data.service,
          urgency: data.urgency,
          preferred_time: data.preferred_time,
          message: data.message,
          _subject: `🔧 New Quote: ${data.service} — ${data.suburb} (${data.urgency})`,
          _template: "table",
          _captcha: "false",
          _autoresponse: `Hi ${data.name}, thanks for contacting PureFlow Plumbing Co. We received your ${data.service} request for ${data.suburb} and will reply within 1 business hour. For emergencies call 0487 231 480.`,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("✅ Request sent! Check your inbox for confirmation — we'll reply within 1 business hour.", "ok");
      form.reset();
    } catch (err) {
      console.error(err);
      setStatus("Couldn't auto-send just now. We'll open your email app instead — just hit Send.", "err");
      setTimeout(() => mailtoFallback(data), 800);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Quote Request →";
    }
  });
}
