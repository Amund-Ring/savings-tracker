// --- Constants & storage keys ---
const DEFAULT_STEP = 1000;
const DEFAULT_GOAL = 100000;
const DEFAULT_CONFETTI_INTERVAL = 10000;

const CHECKED_KEY = "savings-tracker-checked-v1";
const SETTINGS_KEY = "savings-tracker-settings-v1";

// These will be updated from settings
let STEP = DEFAULT_STEP;
let GOAL = DEFAULT_GOAL;
let CONFETTI_ENABLED = true;
let CONFETTI_INTERVAL = DEFAULT_CONFETTI_INTERVAL;

const grid = document.getElementById("grid");
const summaryEl = document.getElementById("summary");
const progressBar = document.getElementById("progress-bar");
const goalLabel = document.getElementById("goal-label");
const celebrationMessage = document.getElementById("celebration-message");

// Settings elements
const settingsBtn = document.getElementById("settings-btn");
const overlay = document.getElementById("settings-overlay");
const settingsGoalInput = document.getElementById("settings-goal");
const settingsStepInput = document.getElementById("settings-step");
const settingsConfettiCheckbox = document.getElementById("settings-confetti");
const settingsConfettiIntervalInput = document.getElementById(
  "settings-confetti-interval"
);
const settingsCancelBtn = document.getElementById("settings-cancel");
const settingsSaveBtn = document.getElementById("settings-save");

let previousTotal = 0; // For milestone detection

// ---------- Helpers ----------

function formatAmount(value) {
  // 1000 -> "1.000,-"
  return (
    value
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ",-"
  );
}

// Checked state load/save
function loadChecked() {
  try {
    const raw = localStorage.getItem(CHECKED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChecked(checkedValues) {
  try {
    localStorage.setItem(CHECKED_KEY, JSON.stringify(checkedValues));
  } catch {
    // ignore
  }
}

// Settings load/save
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveSettings() {
  const obj = {
    goal: GOAL,
    step: STEP,
    confettiEnabled: CONFETTI_ENABLED,
    confettiInterval: CONFETTI_INTERVAL,
  };

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

// ---------- Confetti ----------

const CONFETTI_COLORS = ["#2563eb", "#22c55e", "#eab308", "#f97316", "#ec4899"];

function launchConfetti(big = false) {
  if (!CONFETTI_ENABLED) return;

  const count = big ? 180 : 80;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    const left = Math.random() * 100; // vw
    const delay = Math.random() * 0.3;

    piece.style.left = left + "vw";
    piece.style.backgroundColor =
      CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDelay = delay + "s";

    document.body.appendChild(piece);

    piece.addEventListener("animationend", () => {
      piece.remove();
    });
  }
}

function showCelebrationMessage(text) {
  celebrationMessage.textContent = text;
  celebrationMessage.classList.remove("hidden");
}

function hideCelebrationMessage() {
  celebrationMessage.classList.add("hidden");
  celebrationMessage.textContent = "";
}

function maybeCelebrate(prevTotal, newTotal) {
  // Always hide the message if we are below the goal
  if (newTotal < GOAL) {
    hideCelebrationMessage();
  }

  if (newTotal <= prevTotal) return;

  // Small celebrations at interval steps
  if (CONFETTI_ENABLED && CONFETTI_INTERVAL > 0) {
    const prevMilestone = Math.floor(prevTotal / CONFETTI_INTERVAL);
    const newMilestone = Math.floor(newTotal / CONFETTI_INTERVAL);

    if (newMilestone > prevMilestone) {
      launchConfetti(false);
    }
  }

  // Big celebration when reaching or exceeding goal
  if (prevTotal < GOAL && newTotal >= GOAL) {
    launchConfetti(true);
    showCelebrationMessage("Gratulerer! Du nådde sparemålet ditt 🎉");
  }
}

// ---------- UI update ----------

function updateSummary() {
  const checkboxes = grid.querySelectorAll('input[type="checkbox"]');

  let checkedCount = 0;
  checkboxes.forEach((cb) => {
    if (cb.checked) checkedCount++;
  });

  const totalAmount = checkedCount * STEP;
  const formattedTotal = formatAmount(totalAmount);

  // Celebrate if needed
  maybeCelebrate(previousTotal, totalAmount);
  previousTotal = totalAmount;

  summaryEl.textContent =
    "Avkryssede bokser: " +
    checkedCount +
    " / " +
    Math.round(GOAL / STEP) +
    "  •  Totalt: " +
    formattedTotal;

  goalLabel.textContent = "Mål: " + formatAmount(GOAL);

  const percent = Math.min(100, (totalAmount / GOAL) * 100 || 0);
  progressBar.style.width = percent + "%";
}

// ---------- Grid ----------

function buildGrid() {
  grid.innerHTML = "";
  const savedChecked = new Set(loadChecked());

  const boxCount = Math.max(1, Math.round(GOAL / STEP));

  // Ensure saved state is a continuous prefix by using the max saved value
  let maxSavedValue = 0;
  if (savedChecked.size > 0) {
    maxSavedValue = Math.max(...savedChecked);
  }

  for (let i = 1; i <= boxCount; i++) {
    const value = i * STEP;

    const item = document.createElement("div");
    item.className = "saving-item";

    const id = "saving-" + value;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.dataset.value = String(value);

    // Initial state: all boxes up to maxSavedValue are checked
    if (value <= maxSavedValue) {
      input.checked = true;
      item.classList.add("checked");
    }

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = formatAmount(value);

    input.addEventListener("change", () => {
      const allCheckboxes = Array.from(
        grid.querySelectorAll('input[type="checkbox"]')
      );

      const index = allCheckboxes.indexOf(input); // 0-based index
      let newCheckedCount;

      if (input.checked) {
        // If this box was checked, check all up to and including this index
        newCheckedCount = index + 1;
      } else {
        // If this box was unchecked, check all strictly before it
        newCheckedCount = index;
      }

      // Apply prefix rule: first newCheckedCount checked, rest unchecked
      allCheckboxes.forEach((cb, idx) => {
        const parent = cb.closest(".saving-item");
        const checked = idx < newCheckedCount;
        cb.checked = checked;
        parent.classList.toggle("checked", checked);
      });

      // Save based on the new prefix
      const newCheckedValues = [];
      allCheckboxes.forEach((cb) => {
        if (cb.checked) {
          newCheckedValues.push(Number(cb.dataset.value));
        }
      });

      saveChecked(newCheckedValues);
      updateSummary();
    });

    item.appendChild(input);
    item.appendChild(label);
    grid.appendChild(item);
  }
}

// ---------- Settings modal logic ----------

function openSettings() {
  // Prefill inputs with current settings
  settingsGoalInput.value = GOAL;
  settingsStepInput.value = STEP;
  settingsConfettiCheckbox.checked = CONFETTI_ENABLED;
  settingsConfettiIntervalInput.value = CONFETTI_INTERVAL;

  overlay.classList.remove("hidden");
}

function closeSettings() {
  overlay.classList.add("hidden");
}

function applySettingsFromInputs() {
  const newGoal = Number(settingsGoalInput.value) || GOAL;
  const newStep = Number(settingsStepInput.value) || STEP;
  const newInterval = Number(settingsConfettiIntervalInput.value) || DEFAULT_CONFETTI_INTERVAL;
  const newConfettiEnabled = settingsConfettiCheckbox.checked;

  // Basic sanity
  GOAL = Math.max(1000, newGoal);
  STEP = Math.max(1, newStep);
  CONFETTI_INTERVAL = Math.max(1, newInterval);
  CONFETTI_ENABLED = newConfettiEnabled;

  saveSettings();

  // Rebuild grid with new step/goal; keep as many existing checked amounts as still valid
  buildGrid();
  previousTotal = 0; // recalc from scratch in updateSummary
  updateSummary();
}

// ---------- Init ----------

function init() {
  // Load settings if any
  const settings = loadSettings();
  if (settings) {
    if (typeof settings.goal === "number") GOAL = settings.goal;
    if (typeof settings.step === "number") STEP = settings.step;
    if (typeof settings.confettiEnabled === "boolean")
      CONFETTI_ENABLED = settings.confettiEnabled;
    if (typeof settings.confettiInterval === "number")
      CONFETTI_INTERVAL = settings.confettiInterval;
  }

  buildGrid();
  // Compute initial total to initialise previousTotal correctly
  const checked = loadChecked();
  previousTotal = checked.length * STEP;
  updateSummary();

  // Settings events
  settingsBtn.addEventListener("click", openSettings);
  settingsCancelBtn.addEventListener("click", closeSettings);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSettings();
  });
  settingsSaveBtn.addEventListener("click", () => {
    applySettingsFromInputs();
    closeSettings();
  });
}

init();