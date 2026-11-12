(() => {
  "use strict";

  // Keep previews out of the existing production property's reports.
  const optedOut = [navigator.doNotTrack, window.doNotTrack, navigator.msDoNotTrack]
    .some((value) => value === "1" || value === "yes");
  if (location.hostname !== "trickyjustice.github.io" ||
      location.protocol !== "https:" || optedOut ||
      navigator.globalPrivacyControl === true) return;

  const measurementId = "G-GHV25TEYFL";
  let available = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  let referrer = "";
  try {
    if (document.referrer) referrer = new URL(document.referrer).origin;
  } catch {
    // An invalid referrer should not affect the page or analytics setup.
  }
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    page_location: location.origin + location.pathname,
    page_referrer: referrer,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const tag = document.createElement("script");
  tag.id = "site-google-tag";
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  tag.addEventListener("error", () => { available = false; });
  document.head.append(tag);

  function track(name, parameters) {
    if (available) {
      window.gtag("event", name, { ...parameters, send_to: measurementId });
    }
  }

  const researchIds = new Set([
    "locatedit", "videoagent", "thesis", "mental_health", "videoscore", "vae",
  ]);
  const contentTypes = new Set(["paper", "thesis", "article"]);
  const platforms = new Set(["github", "linkedin", "scholar", "x"]);
  const topics = new Set(["all", "generation", "representation", "applied"]);

  function recordClick(event) {
    if (event.type === "auxclick" ? event.button !== 1 : event.button !== 0) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest("a[data-analytics-event]");
    if (link) {
      const { analyticsEvent, contentId, contentType, platform } = link.dataset;
      switch (analyticsEvent) {
        case "research_open":
          if (researchIds.has(contentId) && contentTypes.has(contentType)) {
            track("research_open", { content_id: contentId, content_type: contentType });
          }
          break;
        case "cv_open":
          track("cv_open", { content_id: "cv", content_type: "cv" });
          break;
        case "contact_click":
          track("contact_click", { contact_method: "email" });
          break;
        case "social_click":
          if (platforms.has(platform)) track("social_click", { platform });
          break;
      }
    }

    const filter = event.target.closest("button[data-filter]");
    if (event.type === "click" && filter && topics.has(filter.dataset.filter)) {
      const results = document.querySelectorAll("[data-publication]:not([hidden])");
      track("research_filter", {
        filter_topic: filter.dataset.filter,
        results_count: results.length,
      });
    }
    // Navigation stays native: no preventDefault, waiting, or link rewriting.
  }

  document.addEventListener("click", recordClick);
  document.addEventListener("auxclick", recordClick);
  document.addEventListener("site:emailcopied", () => {
    track("email_copy", { contact_method: "email_copy" });
  });

  const dialog = document.getElementById("demo-dialog");
  const video = document.getElementById("demo-video");
  if (dialog && video) {
    let started = false;
    let completed = false;
    const demo = { content_id: "locatedit", content_type: "research_demo" };
    video.addEventListener("playing", () => {
      if (dialog.open && !started) {
        started = true;
        track("demo_start", demo);
      }
    });
    video.addEventListener("ended", () => {
      if (dialog.open && started && !completed) {
        completed = true;
        track("demo_complete", demo);
      }
    });
    dialog.addEventListener("close", () => {
      started = false;
      completed = false;
    });
  }

  // Observe headings, since a long research section may never be half visible.
  if ("IntersectionObserver" in window) {
    const sections = new Set(["home", "about", "research", "updates", "contact"]);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
        const sectionId = entry.target.closest("section")?.id;
        if (sections.delete(sectionId)) {
          track("section_view", { section_id: sectionId });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    sections.forEach((id) => {
      const heading = document.querySelector(`#${id} h1, #${id} h2`);
      if (heading) observer.observe(heading);
    });
  }
})();
