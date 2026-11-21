// Gentle reveal-on-scroll. Content is visible without this script: html.reveal-on (set in <head> only
// when motion is allowed) pre-hides [data-reveal] elements, and this observer fades them in once.
const root = document.documentElement;
root.classList.add("reveal-ready");

if (root.classList.contains("reveal-on")) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
}
