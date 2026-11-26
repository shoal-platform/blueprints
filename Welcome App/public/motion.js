// Motion for the welcome page: scroll reveals, the ticker band and the AI prompt demo.
// Loaded in <head> so the "motion" class is set before the first paint.
// Without JavaScript, or when the visitor prefers reduced motion, the page stays static.

const MARQUEE_MAX_REPEATS = 10;
const TYPE_DELAY_MS = 45;
const TYPE_JITTER_MS = 40;
const CHIP_DELAY_MS = 220;
const HOLD_MS = 3500;
const RESET_MS = 400;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function observeReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px" },
  );

  document.querySelectorAll("[data-reveal]").forEach((target) => observer.observe(target));
}

function hiddenClone(node) {
  const clone = node.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  return clone;
}

// Turns the static band list into a seamless scrolling ticker. The original items stay
// readable by screen readers; the repeats added for the loop are hidden from them.
function startMarquee() {
  const list = document.querySelector(".band__list");
  if (!list) return;

  const marquee = document.createElement("div");
  const track = document.createElement("div");
  marquee.className = "marquee";
  track.className = "marquee__track";
  list.replaceWith(marquee);
  marquee.append(track);
  track.append(list);

  const items = [...list.children];
  const minWidth = Math.max(window.innerWidth, window.screen.width);
  for (let repeat = 0; repeat < MARQUEE_MAX_REPEATS && list.scrollWidth < minWidth; repeat++) {
    items.forEach((item) => list.append(hiddenClone(item)));
  }

  track.append(hiddenClone(list));
}

async function typeText(element, text) {
  element.textContent = "";
  for (const char of text) {
    element.textContent += char;
    await wait(TYPE_DELAY_MS + Math.random() * TYPE_JITTER_MS);
  }
}

async function showChips(chips) {
  for (const chip of chips) {
    chip.classList.add("is-visible");
    await wait(CHIP_DELAY_MS);
  }
}

async function playPromptCycle({ prompt, typed, text, chips }) {
  prompt.classList.add("is-typing");
  await typeText(typed, text);
  prompt.classList.remove("is-typing");

  await wait(300);
  prompt.classList.add("is-sending");
  await wait(250);
  prompt.classList.remove("is-sending");

  await showChips(chips);
  await wait(HOLD_MS);

  prompt.classList.add("is-resetting");
  chips.forEach((chip) => chip.classList.remove("is-visible"));
  await wait(RESET_MS);
  typed.textContent = "";
  prompt.classList.remove("is-resetting");
  await wait(RESET_MS);
}

// Types the example prompt, "sends" it, then pops in the nodes it would create. Loops while
// the prompt is on screen and pauses when it scrolls away.
function startPromptDemo() {
  const prompt = document.querySelector(".prompt");
  if (!prompt) return;

  const demo = {
    prompt,
    typed: prompt.querySelector(".prompt__typed"),
    text: prompt.querySelector(".prompt__ghost").textContent.trim(),
    chips: [...prompt.querySelectorAll(".chip")],
  };
  let isVisible = false;
  let isRunning = false;

  const run = async () => {
    isRunning = true;
    prompt.classList.add("is-animating");
    while (isVisible) {
      await playPromptCycle(demo);
    }
    isRunning = false;
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && !isRunning) run();
    },
    { threshold: 0.4 },
  );
  observer.observe(prompt);
}

if (!prefersReducedMotion) {
  document.documentElement.classList.add("motion");
  document.addEventListener("DOMContentLoaded", () => {
    observeReveals();
    startMarquee();
    startPromptDemo();
  });
}
