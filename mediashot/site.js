// MediaShot site interactions: scroll reveal, count-up stats,
// card tilt and the animated language switch.
(() => {
  const root = document.documentElement;
  root.classList.remove("no-js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal elements as they scroll into view, staggered within each group.
  const revealables = document.querySelectorAll(".reveal");
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    [...group.children].forEach((child, index) => child.style.setProperty("--delay", `${index * 0.08}s`));
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach((el) => observer.observe(el));
  }

  // Count the stats up from zero once they become visible.
  const counters = document.querySelectorAll("[data-count]");
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => counterObserver.observe(el));
  } else {
    counters.forEach(runCounter);
  }

  // Tilt feature cards toward the pointer and move their highlight.
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--mx", `${x * 100}%`);
        card.style.setProperty("--my", `${y * 100}%`);
        card.style.transform = `rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg) translateZ(0)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  // Tell the view transition which way to slide: English → German slides
  // left, German → English slides right.
  window.addEventListener("pageswap", (event) => {
    const url = event.activation?.entry?.url;
    if (!event.viewTransition || !url) return;
    const toGerman = /\/de\//.test(new URL(url).pathname);
    event.viewTransition.types.add(toGerman ? "to-de" : "to-en");
  });
  window.addEventListener("pagereveal", (event) => {
    if (!event.viewTransition || !window.navigation?.activation?.from) return;
    event.viewTransition.types.add(root.lang === "de" ? "to-de" : "to-en");
  });

  // Slide the switch thumb right away; browsers without cross-page view
  // transitions also get a short exit animation before navigating.
  const supportsCrossDocument = "onpagereveal" in window;
  document.querySelectorAll(".lang-switch a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (link.getAttribute("aria-current") === "page") { event.preventDefault(); return; }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const toGerman = link.hreflang === "de";
      link.parentElement.classList.add(toGerman ? "to-de" : "to-en");
      if (supportsCrossDocument || reduceMotion) return;
      event.preventDefault();
      document.querySelector("main").classList.add(toGerman ? "leaving-left" : "leaving-right");
      setTimeout(() => { window.location.href = link.href; }, 320);
    });
  });

  // Restored from the back/forward cache: undo the exit state.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.querySelector("main")?.classList.remove("leaving-left", "leaving-right");
    document.querySelectorAll(".lang-switch").forEach((el) => el.classList.remove("to-de", "to-en"));
  });
})();
