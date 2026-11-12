(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const cleanups = [];
  const motionUpdates = [];
  let disposed = false;

  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  }

  function listenMedia(query, handler) {
    if (query.addEventListener) {
      query.addEventListener("change", handler);
      cleanups.push(() => query.removeEventListener("change", handler));
    } else {
      query.addListener(handler);
      cleanups.push(() => query.removeListener(handler));
    }
  }

  function initializeMenu() {
    const button = document.querySelector("[data-menu-toggle]");
    const nav = document.getElementById("site-nav");
    if (!button || !nav) return;
    const label = button.querySelector("[data-menu-label]");
    let open = false;

    function setOpen(next, returnFocus = false) {
      open = next;
      document.body.classList.toggle("menu-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      if (label) label.textContent = open ? "Close" : "Menu";
      if (returnFocus) button.focus({ preventScroll: true });
    }

    setOpen(false);
    listen(button, "click", () => setOpen(!open));
    listen(nav, "click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    listen(document, "keydown", (event) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        setOpen(false, true);
      }
    });
    listen(document, "click", (event) => {
      if (open && !nav.contains(event.target) && !button.contains(event.target)) {
        setOpen(false);
      }
    });
    listen(window, "resize", () => {
      if (open && getComputedStyle(button).display === "none") setOpen(false);
    }, { passive: true });
  }

  function initializeReveals() {
    const elements = [...document.querySelectorAll("[data-reveal]")];
    if (!elements.length) return;

    const showAll = () => {
      elements.forEach((element) => element.classList.add("is-visible"));
    };

    if (!("IntersectionObserver" in window)) {
      showAll();
      return;
    }

    let observer;
    try {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -28px 0px" });

      elements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (reducedMotion.matches || bounds.top < window.innerHeight * 0.96) {
          element.classList.add("is-visible");
        } else {
          observer.observe(element);
        }
      });

      // Content is hidden only after a working reveal observer exists.
      root.classList.add("motion-ready");
      cleanups.push(() => observer.disconnect());
      motionUpdates.push(() => {
        if (reducedMotion.matches) {
          showAll();
          observer.disconnect();
        }
      });
    } catch {
      if (observer) observer.disconnect();
      root.classList.remove("motion-ready");
      showAll();
    }
  }

  function initializeScroll() {
    const header = document.querySelector(".site-header");
    const progress = document.querySelector("[data-scroll-progress]");
    const links = [...document.querySelectorAll("[data-nav-link]")];
    const sections = links.map((link) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return null;
      return document.getElementById(href.slice(1));
    }).filter(Boolean);
    let frame = 0;

    function update() {
      frame = 0;
      const scroll = Math.max(0, window.scrollY);
      const distance = Math.max(0, root.scrollHeight - window.innerHeight);
      if (header) header.classList.toggle("is-scrolled", scroll > 24);
      if (progress) {
        progress.style.transform = `scaleX(${distance ? Math.min(1, scroll / distance) : 0})`;
      }

      // Choosing the last crossed section avoids losing the active link
      // when a section is taller than the viewport.
      const boundary = Math.min(180, window.innerHeight * 0.28);
      let current = null;
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= boundary) current = section.id;
      });
      if (distance > 0 && scroll >= distance - 8 && sections.length) {
        current = sections[sections.length - 1].id;
      }
      links.forEach((link) => {
        const active = link.getAttribute("href") === `#${current}`;
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }

    function queue() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    listen(window, "scroll", queue, { passive: true });
    listen(window, "resize", queue, { passive: true });
    listen(document, "site:filterchange", queue);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(queue);
      observer.observe(document.body);
      cleanups.push(() => observer.disconnect());
    }
    cleanups.push(() => {
      if (frame) window.cancelAnimationFrame(frame);
    });
    update();
  }

  function initializeFilters() {
    const buttons = [...document.querySelectorAll("[data-filter]")];
    const publications = [...document.querySelectorAll("[data-publication]")];
    const status = document.getElementById("filter-status");
    if (!buttons.length || !publications.length) return;

    function applyFilter(value, announce = true) {
      let count = 0;
      publications.forEach((publication) => {
        const categories = (publication.dataset.category || "").split(/\s+/);
        const visible = value === "all" || categories.includes(value);
        publication.hidden = !visible;
        if (visible) {
          count += 1;
          if (announce) publication.classList.add("is-visible");
        }
      });
      buttons.forEach((button) => {
        const selected = button.dataset.filter === value;
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("is-active", selected);
      });
      if (status && announce) {
        const selected = buttons.find((button) => button.dataset.filter === value);
        const category = value === "all" ? "all research" : selected?.textContent.trim() || value;
        status.textContent = `${count} ${count === 1 ? "publication" : "publications"} shown for ${category}.`;
      }
      document.dispatchEvent(new Event("site:filterchange"));
    }

    buttons.forEach((button) => {
      listen(button, "click", () => applyFilter(button.dataset.filter || "all"));
    });
    const selected = buttons.find((button) => button.getAttribute("aria-pressed") === "true");
    applyFilter(selected?.dataset.filter || "all", false);
  }

  function initializePointerEffects() {
    const magnets = [...document.querySelectorAll("[data-magnetic]")];
    const enabled = () => finePointer.matches && !reducedMotion.matches;
    const reset = () => {
      magnets.forEach((element) => {
        element.style.setProperty("--magnetic-x", "0px");
        element.style.setProperty("--magnetic-y", "0px");
      });
    };

    magnets.forEach((element) => {
      listen(element, "pointermove", (event) => {
        if (!enabled() || event.pointerType === "touch") return;
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) * 0.08;
        const y = (event.clientY - bounds.top - bounds.height / 2) * 0.08;
        element.style.setProperty("--magnetic-x", `${Math.max(-5, Math.min(5, x)).toFixed(2)}px`);
        element.style.setProperty("--magnetic-y", `${Math.max(-5, Math.min(5, y)).toFixed(2)}px`);
      }, { passive: true });
      listen(element, "pointerleave", () => {
        element.style.setProperty("--magnetic-x", "0px");
        element.style.setProperty("--magnetic-y", "0px");
      }, { passive: true });
    });

    motionUpdates.push(reset);
    listenMedia(finePointer, reset);
    listen(window, "blur", reset);
    cleanups.push(reset);
  }

  function initializeEmailCopy() {
    const button = document.querySelector("[data-copy-email]");
    if (!button) return;
    const label = button.querySelector("[data-copy-label]");
    const status = document.getElementById("copy-status");
    const originalLabel = label ? label.textContent : "";
    const email = button.dataset.copyEmail || "a2soni@uwaterloo.ca";
    let resetTimer = 0;
    let busy = false;

    function fallbackCopy() {
      const selection = window.getSelection();
      const ranges = selection
        ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
        : [];
      const focused = document.activeElement;
      const input = document.createElement("textarea");
      input.value = email;
      input.setAttribute("readonly", "");
      input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      document.body.append(input);
      input.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      } finally {
        input.remove();
        if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
        if (selection) {
          selection.removeAllRanges();
          ranges.forEach((range) => selection.addRange(range));
        }
      }
      return copied;
    }

    listen(button, "click", async () => {
      if (busy) return;
      busy = true;
      window.clearTimeout(resetTimer);
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(email);
          copied = true;
        } catch {
          copied = fallbackCopy();
        }
      } else {
        copied = fallbackCopy();
      }
      if (disposed) return;
      if (label) label.textContent = copied ? "Copied!" : "Copy unavailable";
      if (status) {
        status.textContent = copied
          ? "Email address copied to clipboard."
          : `Copying is unavailable. You can select the email address ${email}, or use the email link.`;
      }
      if (copied) document.dispatchEvent(new Event("site:emailcopied"));
      busy = false;
      resetTimer = window.setTimeout(() => {
        if (label) label.textContent = originalLabel;
      }, 2600);
    });
    cleanups.push(() => window.clearTimeout(resetTimer));
  }

  function initializeDemo() {
    const dialog = document.getElementById("demo-dialog");
    const video = document.getElementById("demo-video");
    const openers = [...document.querySelectorAll("[data-open-demo]")];
    if (!dialog || typeof dialog.showModal !== "function" ||
        !(video instanceof HTMLVideoElement) || !openers.length) return;
    let invokingLink = null;

    function stopVideo() {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // An unloaded media file may not yet have a seekable timeline.
      }
    }

    openers.forEach((opener) => {
      listen(opener, "click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey ||
            event.shiftKey || event.altKey) return;
        try {
          if (!dialog.open) dialog.showModal();
        } catch {
          // Preserve the direct video link if the dialog cannot open.
          return;
        }
        event.preventDefault();
        invokingLink = opener;
        if (!video.getAttribute("src")) {
          video.src = video.dataset.src || opener.getAttribute("href") || "";
        }
        const playback = video.play();
        if (playback && typeof playback.catch === "function") {
          playback.catch(() => {
            // Native controls remain available if autoplay is blocked.
          });
        }
      });
    });
    dialog.querySelectorAll("[data-close-demo]").forEach((button) => {
      listen(button, "click", () => dialog.close());
    });
    listen(dialog, "click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) {
        dialog.close();
      }
    });
    listen(dialog, "close", () => {
      stopVideo();
      if (invokingLink && invokingLink.isConnected) {
        invokingLink.focus({ preventScroll: true });
      }
    });
    listen(video, "playing", () => {
      if (!dialog.open) video.pause();
    });
    cleanups.push(() => {
      stopVideo();
      if (dialog.open) dialog.close();
    });
  }

  function initializeField() {
    const canvas = document.getElementById("field-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const container = canvas.parentElement;
    if (!container) return;
    const art = canvas.closest(".hero-art");

    let width = 0;
    let height = 0;
    let ink = "#626c7b";
    let accent = "#b9442b";
    let frame = 0;
    let lastFrame = 0;
    let phase = 0;
    let intersecting = true;
    let userPaused = false;
    const pauseButton = document.querySelector("[data-pause-field]");
    const pauseLabel = pauseButton?.querySelector("[data-pause-label]");
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
    const interval = 1000 / 30;

    function colors() {
      const style = getComputedStyle(canvas);
      ink = style.getPropertyValue("--canvas-ink").trim() || "#626c7b";
      accent = style.getPropertyValue("--canvas-accent").trim() || "#b9442b";
    }

    function point(u, v, time) {
      const angle = u * Math.PI * 2;
      const latitude = v * Math.PI * 0.48;
      const contour = (
        1 +
        Math.sin(angle * 3 + latitude * 2 + time * 0.14) * 0.065 +
        Math.cos(latitude * 5 - angle + time * 0.09) * 0.045
      );
      const sphereX = Math.cos(latitude) * Math.cos(angle) * contour;
      const sphereY = Math.sin(latitude) * contour;
      const sphereZ = Math.cos(latitude) * Math.sin(angle) * contour;
      const rotation = 0.6 + time * 0.035;
      const rotatedX = sphereX * Math.cos(rotation) + sphereZ * Math.sin(rotation);
      const rotatedZ = -sphereX * Math.sin(rotation) + sphereZ * Math.cos(rotation);
      const tilt = 0.43 + Math.sin(time * 0.07) * 0.07;
      const rotatedY = sphereY * Math.cos(tilt) - rotatedZ * Math.sin(tilt);
      const depth = sphereY * Math.sin(tilt) + rotatedZ * Math.cos(tilt);
      const roll = -0.26;
      const radius = Math.min(width * 0.405, height * 0.405);
      const perspective = 1 + depth * 0.07;
      let x = width * 0.49 + (
        rotatedX * Math.cos(roll) - rotatedY * Math.sin(roll)
      ) * radius * perspective;
      let y = height * 0.46 + (
        rotatedX * Math.sin(roll) + rotatedY * Math.cos(roll)
      ) * radius * perspective;
      if (pointer.active && !reducedMotion.matches) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const radius = Math.min(width, height) * 0.38;
        const force = Math.exp(-(dx * dx + dy * dy) / (radius * radius));
        x += dx * force * 0.055;
        y += dy * force * 0.075;
      }
      return [x, y, depth];
    }

    function draw(time) {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      pointer.x += (pointer.targetX - pointer.x) * 0.09;
      pointer.y += (pointer.targetY - pointer.y) * 0.09;
      const lines = width < 500 ? 36 : 48;
      const steps = width < 500 ? 76 : 112;

      for (let line = 0; line < lines; line += 1) {
        const v = (line / (lines - 1)) * 2 - 1;
        const emphasized = line % 7 === 0;
        context.beginPath();
        context.strokeStyle = emphasized ? accent : ink;
        context.globalAlpha = emphasized ? 0.52 : 0.17 + (1 - Math.abs(v)) * 0.15;
        context.lineWidth = emphasized ? 0.9 : 0.65;
        for (let step = 0; step <= steps; step += 1) {
          const u = step / steps;
          const [x, y] = point(u, v, time);
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }

      // Widely spaced meridians give the contour field a quiet sense of depth.
      context.strokeStyle = ink;
      context.globalAlpha = 0.1;
      context.lineWidth = 0.65;
      for (let line = 0; line < 14; line += 1) {
        context.beginPath();
        for (let step = 0; step <= 60; step += 1) {
          const v = (step / 60) * 2 - 1;
          const [x, y] = point(line / 14, v, time);
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }

      context.fillStyle = accent;
      for (let index = 0; index < 10; index += 1) {
        const v = Math.sin(index * 2.399) * 0.94;
        const travel = (index * 0.173 + time * 0.012) % 1;
        const [x, y, depth] = point(travel, v, time);
        context.globalAlpha = 0.3 + (depth + 1) * 0.15;
        context.beginPath();
        context.arc(x, y, index % 4 === 0 ? 2.2 : 1.25, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      if (art) art.classList.add("canvas-ready");
    }

    function shouldAnimate() {
      return !disposed && !document.hidden && intersecting &&
        !userPaused && !reducedMotion.matches;
    }

    function animate(timestamp) {
      if (!shouldAnimate()) {
        frame = 0;
        lastFrame = 0;
        return;
      }
      if (!lastFrame || timestamp - lastFrame >= interval) {
        const elapsed = lastFrame ? Math.min(timestamp - lastFrame, 80) : interval;
        phase += elapsed / 1000;
        draw(phase);
        lastFrame = timestamp;
      }
      frame = window.requestAnimationFrame(animate);
    }

    function stop() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    }

    function synchronize() {
      if (pauseButton) {
        pauseButton.hidden = reducedMotion.matches;
        pauseButton.setAttribute("aria-pressed", String(userPaused));
        const label = userPaused ? "Resume animation" : "Pause animation";
        pauseButton.setAttribute("aria-label", label);
        if (pauseLabel) pauseLabel.textContent = label;
      }
      if (shouldAnimate()) {
        if (!frame) frame = window.requestAnimationFrame(animate);
      } else {
        stop();
        draw(reducedMotion.matches ? 0 : phase);
      }
    }

    function resize() {
      const bounds = container.getBoundingClientRect();
      width = Math.max(0, bounds.width);
      height = Math.max(0, bounds.height);
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      pointer.x = pointer.targetX = width * 0.5;
      pointer.y = pointer.targetY = height * 0.5;
      colors();
      draw(reducedMotion.matches ? 0 : phase);
      synchronize();
    }

    listen(container, "pointermove", (event) => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType === "touch") return;
      const bounds = container.getBoundingClientRect();
      pointer.targetX = event.clientX - bounds.left;
      pointer.targetY = event.clientY - bounds.top;
      pointer.active = true;
    }, { passive: true });
    listen(container, "pointerleave", () => {
      pointer.active = false;
    }, { passive: true });
    listen(document, "visibilitychange", synchronize);
    listen(window, "pagehide", stop);
    listen(window, "pageshow", synchronize);
    motionUpdates.push(() => {
      pointer.active = false;
      synchronize();
    });
    if (pauseButton) {
      listen(pauseButton, "click", () => {
        userPaused = !userPaused;
        pointer.active = false;
        synchronize();
      });
    }

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      cleanups.push(() => resizeObserver.disconnect());
    } else {
      listen(window, "resize", resize, { passive: true });
    }
    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver((entries) => {
        intersecting = entries[0]?.isIntersecting ?? false;
        synchronize();
      }, { threshold: 0.01 });
      visibilityObserver.observe(canvas);
      cleanups.push(() => visibilityObserver.disconnect());
    }
    cleanups.push(stop);
    resize();
  }

  function initialize() {
    initializeMenu();
    initializeReveals();
    initializeScroll();
    initializeFilters();
    initializePointerEffects();
    initializeEmailCopy();
    initializeDemo();
    initializeField();
    const year = document.getElementById("current-year");
    if (year) year.textContent = String(new Date().getFullYear());

    listenMedia(reducedMotion, () => {
      motionUpdates.forEach((update) => update());
    });
    listen(window, "pagehide", (event) => {
      if (event.persisted) return;
      disposed = true;
      cleanups.splice(0).forEach((cleanup) => cleanup());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
