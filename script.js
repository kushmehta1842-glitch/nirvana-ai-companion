// =======================
// CONFIG
// =======================

// Google Apps Script Web App URL (logging only)
const API_URL =
  "https://script.google.com/macros/s/AKfycbwFsvz4da0YLFYRYexQk4Raz9Opgm2cicPnA1gr_DpPW9MrY79KzTtAQJjR4s_zWMmx/exec";

// Ordered list of screen IDs
const screensOrder = [
  "access",   // Access code screen first
  "welcome",
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q11",
  "q12",
  "q13",
  "q14",
  "q15",
  "q16",
  "q17",
  "q18",
  "q19",
  "q20",
  "creating",
  "chat",
];

const TOTAL_QUESTIONS = 20;

// List of valid access codes (you can change/add your real codes here)
const VALID_CODES = 
[
"0007",
"8016",
"0102",
"0324",
"0342",
"0380",
"0519",
"0728",
"0882",
"1010",
"1115",
"1166",
"1182",
"1354",
"1380",
"1432",
"1496",
"1573",
"1661",
"1780",
"1835",
"1852",
"1902",
"2047",
"2141",
"2179",
"2245",
"2321",
"2388",
"2413",
"2536",
"2567",
"2734",
"2833",
"2859",
"2891",
"2962",
"3077",
"3155",
"3221",
"3273",
"3286",
"3414",
"3457",
"3564",
"3655",
"3720",
"3834",
"3867",
"3912",
"4089",
"4179",
"4238",
"4374",
"4431",
"4581",
"4627",
"4730",
"4892",
"4923",
"5072",
"5183",
"5274",
"5370",
"5421",
"5488",
"5569",
"5632",
"5741",
"5893",
"5906",
"6042",
"6129",
"6275",
"6381",
"6419",
"6520",
"6680",
"6749",
"6885",
"6973",
"7031",
"7146",
"7214",
"7332",
"7449",
"7593",
"7651",
"7784",
"7892",
"8035",
"8179",
"8294",
"8427",
"8590",
"8673",
"8785",
"8892",
"8994",
"9128",
"9234",
"9346",
"9455",
"9550",
"9584",
"9675",
"9791",
"9929",
"9963"
];

// The code the current user entered (once validated)
let currentAccessCode = null;

// Stored profile for the current access code (if available)
let currentProfile = null;

// All answers for this user
let answers = {
  userId: generateUserId(),
};

let currentIndex = 0;

// Chat state
let currentMode = null; // "calm" | "happy" | "sad" | "stressed" | "angry" | null
let typingRow = null;

// =======================
// ELEMENTS
// =======================

const progressBarEl = document.getElementById("progressBar");
const progressLabelEl = document.getElementById("progressLabel");

const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const moodOptions = document.getElementById("moodOptions");

const companionNamePreviewEl = document.getElementById("companionNamePreview");
const userNameDisplayEl = document.getElementById("userNameDisplay");
const companionNameDisplayEl = document.getElementById("companionNameDisplay");
const companionSubtitleEl = document.getElementById("companionSubtitle");

// Access + Welcome elements
const accessCodeInput = document.getElementById("accessCodeInput");
const accessCodeError = document.getElementById("accessCodeError");
const btnAccessContinue = document.getElementById("btnAccessContinue");
const btnSkipMain = document.getElementById("btnSkipMain");

// =======================
// UTILITIES
// =======================

function generateUserId() {
  return (
    "nirvana-" +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

function getUserDisplayName() {
  const name = (answers.user_display_name || "").trim();
  return name || "there";
}

function getCompanionName() {
  const pref = answers.companion_name_pref || { choice: "generate", name: "" };
  if (pref.choice === "custom" && pref.name && pref.name.trim().length > 0) {
    return pref.name.trim();
  }
  return "Nirvana";
}

function showValidationToast(message) {
  alert(message);
}

// -----------------------
// Profile storage helpers
// -----------------------

function getProfileStorageKey(code) {
  return "nirvana_user_" + code;
}

function loadProfileForCode(code) {
  if (!code) return null;
  try {
    const raw = localStorage.getItem(getProfileStorageKey(code));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveProfileForCurrentCode() {
  if (!currentAccessCode) return;

  const profile = {
    onboardingDone: true,
    user_display_name: getUserDisplayName(),
    companion_name: getCompanionName(),
  };

  currentProfile = profile;

  try {
    localStorage.setItem(
      getProfileStorageKey(currentAccessCode),
      JSON.stringify(profile)
    );
  } catch (e) {
    console.error("Failed to save profile to localStorage:", e);
  }
}

function updateSkipMainVisibility() {
  if (!btnSkipMain) return;

  if (currentProfile && currentProfile.onboardingDone) {
    btnSkipMain.style.display = "inline-block";
  } else {
    btnSkipMain.style.display = "none";
  }
}

// =======================
// SCREEN NAVIGATION
// =======================

function showScreenByIndex(index) {
  if (index < 0 || index >= screensOrder.length) return;

  const targetId = screensOrder[index];
  currentIndex = index;

  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.toggle("active", s.dataset.screen === targetId);
  });

  updateProgress(targetId);
}

function updateProgress(screenId) {
  let label = "Welcome";
  let percent = 0;

  if (screenId.startsWith("q")) {
    const step = parseInt(screenId.slice(1), 10);
    const clamped = Math.max(1, Math.min(TOTAL_QUESTIONS, step));
    label = `Step ${clamped} of ${TOTAL_QUESTIONS}`;
    percent = (clamped / TOTAL_QUESTIONS) * 100;
  } else if (screenId === "creating") {
    label = "Companion ready";
    percent = 100;
  } else if (screenId === "chat") {
    label = "Chat";
    percent = 100;
  } else if (screenId === "access") {
    label = "Access";
    percent = 0;
  } else {
    label = "Welcome";
    percent = 0;
  }

  if (progressLabelEl) progressLabelEl.textContent = label;
  if (progressBarEl) progressBarEl.style.width = percent + "%";
}

// =======================
// ANSWER COLLECTION
// =======================

function collectCurrentScreenAnswers() {
  const activeScreen = document.querySelector(".screen.active");
  if (!activeScreen) return true;

  const screenId = activeScreen.dataset.screen;
  const form = activeScreen.querySelector(".options-group");

  // Q3 is the "What would you like me to call you?" text input
  if (screenId === "q3") {
    const inputEl = document.getElementById("userNameInput");
    const val = inputEl ? inputEl.value.trim() : "";
    if (!val) {
      showValidationToast("Please enter what you’d like me to call you.");
      return false;
    }
    answers.user_display_name = val;
    return true;
  }

  if (!form) {
    // access / welcome / creating / chat screens
    return true;
  }

  const questionKey = form.dataset.questionKey;
  const type = form.dataset.type;

  if (!questionKey || !type) return true;

  if (type === "single") {
    const checked = form.querySelector("input[type=radio]:checked");
    if (!checked) {
      showValidationToast("Please choose one option to continue.");
      return false;
    }
    answers[questionKey] = checked.value;
    return true;
  }

  if (type === "single-with-input") {
    const checked = form.querySelector("input[type=radio]:checked");
    if (!checked) {
      showValidationToast("Please choose an option to continue.");
      return false;
    }

    const choice = checked.value;
    const result = { choice, name: "" };

    if (choice === "custom") {
      const inputEl = document.getElementById("companionNameText");
      const val = inputEl ? inputEl.value.trim() : "";
      if (!val) {
        showValidationToast("Please enter a name for your companion.");
        return false;
      }
      result.name = val;
    }

    answers[questionKey] = result;
    return true;
  }

  if (type === "text") {
    const inputEl = form.querySelector("input[type=text], textarea");
    const val = inputEl ? inputEl.value.trim() : "";
    if (!val) {
      showValidationToast("Please fill in this field before continuing.");
      return false;
    }
    answers[questionKey] = val;
    return true;
  }

  return true;
}

// =======================
// BACKEND LOGGING
// =======================

function sendOnboardingToBackend() {
  const payload = {
    userId: answers.userId,
    accessCode: currentAccessCode || "",
    gender: answers.gender || "",
    age_group: answers.age_group || "",
    user_display_name: answers.user_display_name || "",
    companion_name_choice: (answers.companion_name_pref || {}).choice || "",
    companion_name_custom: (answers.companion_name_pref || {}).name || "",
    companion_reason: answers.companion_reason || "",
    companion_role: answers.companion_role || "",
    tone_preference: answers.tone_preference || "",
    conversation_depth: answers.conversation_depth || "",
    emotional_comfort: answers.emotional_comfort || "",
    topics_avoid: answers.topics_avoid || "",
    companion_personality: answers.companion_personality || "",
    human_likeness: answers.human_likeness || "",
    expressiveness: answers.expressiveness || "",
    initiative_level: answers.initiative_level || "",
    support_type: answers.support_type || "",
    guidance_style: answers.guidance_style || "",
    low_mood_response_style: answers.low_mood_response_style || "",
    personalization_level: answers.personalization_level || "",
    conversation_pace: answers.conversation_pace || "",
    decisiveness_level: answers.decisiveness_level || "",
  };

  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      type: "onboarding",
      payload,
    }),
  }).catch((err) => {
    console.error("Onboarding log failed:", err);
  });
}

function logChatToBackend(sender, messageText) {
  const payload = {
    userId: answers.userId,
    accessCode: currentAccessCode || "",
    sender,
    message: messageText,
    messageId: "msg-" + Date.now(),
  };

  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      type: "chat",
      payload,
    }),
  }).catch((err) => {
    console.error("Chat log failed:", err);
  });
}

// =======================
// CHAT UI HELPERS
// =======================

function appendMessage(sender, text) {
  if (!chatWindow) return;
  const row = document.createElement("div");
  row.className = "message-row " + (sender === "user" ? "user" : "companion");

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
  if (!chatWindow || typingRow) return;
  typingRow = document.createElement("div");
  typingRow.className = "message-row companion";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble typing";
  bubble.textContent = "Typing...";

  typingRow.appendChild(bubble);
  chatWindow.appendChild(typingRow);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideTypingIndicator() {
  if (typingRow && chatWindow) {
    chatWindow.removeChild(typingRow);
    typingRow = null;
  }
}

function sendCompanionMessage(text, callback) {
  showTypingIndicator();
  setTimeout(() => {
    hideTypingIndicator();
    appendMessage("companion", text);
    logChatToBackend("companion", text);
    if (typeof callback === "function") callback();
  }, 650);
}

// =======================
// MODES CONFIG
// =======================

const MODE_EMPATHY_LINES = {
  calm: [
    "Thank you for sharing that in this calm moment. Even simple thoughts matter here.",
    "I’m here with you, even in the quiet in-between spaces. You don’t need a big emotion to be heard.",
  ],
  happy: [
    "I really love hearing this brighter side of you. You’re allowed to enjoy it fully.",
    "That sounds genuinely nice. I’m glad you let me be part of this moment by sharing it.",
  ],
  sad: [
    "I’m really glad you trusted me with that. It sounds heavy, and your feelings make sense.",
    "That does sound painful. You don’t have to rush through this—just being honest is already a big step.",
  ],
  stressed: [
    "That sounds like a lot to carry at once. It makes sense that you’d feel stretched thin.",
    "You’ve been under a lot of mental pressure. I’m glad you’re not holding it completely alone right now.",
  ],
  angry: [
    "I can feel how strong this is for you. You’re allowed to feel angry here without being judged.",
    "Given what you’ve shared, your reaction makes sense. You’re not ‘too much’ for having a big feeling.",
  ],
  generic: [
    "Thank you for telling me that. I’m here with you, and you don’t have to filter yourself with me.",
    "I hear you. You don’t need to make it sound perfect or logical—this space is for how it truly feels.",
  ],
};

const MODE_CLOSING_LINES = {
  calm: "Thank you for spending a calm moment with me. Even quiet check-ins like this help you stay connected to yourself.",
  happy:
    "I’m really glad you shared this lighter side with me. Remember that you’re not only your heavy days—you’re also this version of you.",
  sad: "Thank you for letting me sit with you in this. Even if nothing is ‘fixed’ yet, you didn’t face this feeling entirely alone.",
  stressed:
    "You’ve been carrying a lot, and still chose to reflect on it. That matters. We can always come back to this one small step at a time.",
  angry:
    "Thank you for letting me see this side of you too. Your anger doesn’t make you a bad person—it just means something important was touched.",
};

// =======================
// MODES UI
// =======================

function showModeSelection() {
  if (!moodOptions) return;
  moodOptions.innerHTML = "";

  const modes = [
    { key: "calm", label: "Calm / Neutral" },
    { key: "happy", label: "Happy / Excited" },
    { key: "sad", label: "Sad / Low" },
    { key: "stressed", label: "Stressed / Overwhelmed" },
    { key: "angry", label: "Angry / Irritated" },
  ];

  modes.forEach((m) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mood-chip";
    chip.textContent = m.label;
    chip.dataset.mode = m.key;
    chip.addEventListener("click", () => {
      handleModeSelect(m.key, m.label);
    });
    moodOptions.appendChild(chip);
  });
}

function handleModeSelect(modeKey, label) {
  currentMode = modeKey || null;

  appendMessage("user", label);
  logChatToBackend("user", `[Selected mode: ${label}]`);

  let intro = "";
  switch (modeKey) {
    case "calm":
      intro =
        "Okay, let’s stay in a gentle, calm space for a bit. You don’t need a big emotion for us to be here together.";
      break;
    case "happy":
      intro =
        "I love that you’re in a brighter space right now. Let’s make a little room for that feeling—you deserve it.";
      break;
    case "sad":
      intro =
        "Thank you for being honest about feeling low. You don’t have to be ‘okay’ with me—I’m here to sit with you in it.";
      break;
    case "stressed":
      intro =
        "When everything feels like a lot, you don’t have to hold it all at once here. We can slow down together.";
      break;
    case "angry":
      intro =
        "I appreciate your honesty. You’re allowed to feel angry or irritated here—I won’t judge you for it.";
      break;
    default:
      intro =
        "I’m here with you, whatever this moment looks like. We can take it one piece at a time.";
  }

  sendCompanionMessage(intro, () => {
    showModeMenuForCurrentMode();
  });
}

function showModeMenuForCurrentMode() {
  if (!moodOptions) return;

  if (!currentMode) {
    showModeSelection();
    return;
  }

  moodOptions.innerHTML = "";

  const baseOptions = [
    {
      id: "write",
      label: "I want to write freely about this",
    },
    {
      id: "question",
      label: "Ask me a gentle question",
    },
    {
      id: "done",
      label: "I’m done for now",
    },
  ];

  baseOptions.forEach((opt) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mood-chip";
    chip.textContent = opt.label;
    chip.dataset.optionId = opt.id;
    chip.addEventListener("click", () => {
      handleModeOptionClick(opt.id, opt.label);
    });
    moodOptions.appendChild(chip);
  });
}

function handleModeOptionClick(optionId, label) {
  appendMessage("user", label);
  logChatToBackend("user", `[Selected mode option: ${label}]`);

  if (!currentMode) {
    sendCompanionMessage(
      "Let’s start by choosing how you’re feeling right now.",
      () => {
        showModeSelection();
      }
    );
    return;
  }

  if (optionId === "write") {
    const line =
      getEmpathyLineForCurrentMode() +
      " You can write whatever comes up, and I’ll stay with you while you put it into words.";
    sendCompanionMessage(line, () => {
      showModeMenuForCurrentMode();
    });
    return;
  }

  if (optionId === "question") {
    const q = getGentleQuestionForCurrentMode();
    sendCompanionMessage(q, () => {
      showModeMenuForCurrentMode();
    });
    return;
  }

  if (optionId === "done") {
    const closing = MODE_CLOSING_LINES[currentMode] || MODE_CLOSING_LINES.calm;
    sendCompanionMessage(closing, () => {
      currentMode = null;
      showModeSelection();
    });
    return;
  }
}

function getEmpathyLineForCurrentMode() {
  const lines =
    MODE_EMPATHY_LINES[currentMode] || MODE_EMPATHY_LINES.generic;
  if (!Array.isArray(lines) || lines.length === 0) {
    return MODE_EMPATHY_LINES.generic[0];
  }
  const idx = Math.floor(Math.random() * lines.length);
  return lines[idx];
}

function getGentleQuestionForCurrentMode() {
  switch (currentMode) {
    case "calm":
      return "Right now, what feels most true for you—even if it’s something small or simple?";
    case "happy":
      return "What part of this happiness or excitement feels the most meaningful or special to you?";
    case "sad":
      return "If your sadness could speak, what do you think it might want you to know right now?";
    case "stressed":
      return "If you had to name one thing that’s weighing on you the most, what would it be?";
    case "angry":
      return "If you’re comfortable sharing, what do you feel your anger is trying to protect or defend?";
    default:
      return "What feels most important for you to express or explore in this moment?";
  }
}

function handleUserFreeText() {
  const line = getEmpathyLineForCurrentMode();
  sendCompanionMessage(
    line +
      " You can keep sharing if that feels right, or use the options below whenever you’d like.",
    () => {
      if (currentMode) {
        showModeMenuForCurrentMode();
      } else {
        showModeSelection();
      }
    }
  );
}

// =======================
// CHAT INIT
// =======================

function initChatIntro() {
  const userName = getUserDisplayName();
  const companionName = getCompanionName();

  if (userNameDisplayEl) userNameDisplayEl.textContent = userName;
  if (companionNameDisplayEl)
    companionNameDisplayEl.textContent = companionName;

  if (companionSubtitleEl) {
    companionSubtitleEl.textContent =
      "Be yourself with me and consider this as your safe space.";
  }

  if (chatWindow) {
    chatWindow.innerHTML = "";
  }
  if (moodOptions) {
    moodOptions.innerHTML = "";
  }

  currentMode = null;

  sendCompanionMessage("I’m really glad you’re here!", () => {
    sendCompanionMessage("Tell me how you’re feeling today?", () => {
      showModeSelection();
    });
  });
}

// =======================
// EVENT LISTENERS
// =======================

// Access Code "Continue" button
if (btnAccessContinue) {
  btnAccessContinue.addEventListener("click", () => {
    if (!accessCodeInput) return;

    const code = accessCodeInput.value.trim();

    const isValid =
      code.length === 4 && VALID_CODES.includes(code);

    if (!isValid) {
      if (accessCodeError) {
        accessCodeError.style.display = "block";
      }
      return;
    }

    currentAccessCode = code;
    if (accessCodeError) {
      accessCodeError.style.display = "none";
    }

    // Load existing profile for this code (if any)
    currentProfile = loadProfileForCode(currentAccessCode);
    updateSkipMainVisibility();

    // Go to Welcome screen
    showScreenByIndex(screensOrder.indexOf("welcome"));
  });
}

// Start button from welcome (go to Q1)
const btnStart = document.getElementById("btnStart");
if (btnStart) {
  btnStart.addEventListener("click", () => {
    showScreenByIndex(screensOrder.indexOf("q1"));
  });
}

// "Skip to MAIN PART" button on Welcome
if (btnSkipMain) {
  btnSkipMain.addEventListener("click", () => {
    if (!currentProfile || !currentProfile.onboardingDone) {
      return;
    }

    const storedUserName =
      (currentProfile.user_display_name || "").trim() || "there";
    const storedCompanionName =
      (currentProfile.companion_name || "").trim() || "Nirvana";

    answers.user_display_name = storedUserName;
    answers.companion_name_pref = {
      choice: "custom",
      name: storedCompanionName,
    };

    showScreenByIndex(screensOrder.indexOf("chat"));
    initChatIntro();
  });
}

// Logo click -> reload / reset
const logoLink = document.getElementById("logoLink");
if (logoLink) {
  logoLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.reload();
  });
}

// Companion name text input toggle (Q4)
document.querySelectorAll("[data-toggle-input]").forEach((radio) => {
  radio.addEventListener("change", () => {
    const targetId = radio.dataset.toggleInput;
    const inputEl = document.getElementById(targetId);
    if (!inputEl) return;

    const screen = radio.closest(".screen");
    if (screen) {
      screen.querySelectorAll(".text-input").forEach((el) => {
        if (el.id !== targetId) {
          el.classList.add("hidden");
        }
      });
    }

    inputEl.classList.remove("hidden");
    const innerInput = inputEl.querySelector("input");
    if (innerInput) innerInput.focus();
  });
});

// Global Next buttons
document.querySelectorAll(".btn-next").forEach((btn) => {
  btn.addEventListener("click", () => {
    const ok = collectCurrentScreenAnswers();
    if (!ok) return;

    const activeScreen = document.querySelector(".screen.active");
    const screenId = activeScreen ? activeScreen.dataset.screen : "";

    if (screenId === "q20") {
      const compName = getCompanionName();
      if (companionNamePreviewEl) {
        companionNamePreviewEl.textContent = compName;
      }

      // Save profile so future visits with same code can skip
      saveProfileForCurrentCode();
      updateSkipMainVisibility();

      sendOnboardingToBackend();
      showScreenByIndex(screensOrder.indexOf("creating"));
      return;
    }

    const nextIndex = currentIndex + 1;
    showScreenByIndex(nextIndex);
  });
});

// Global Back buttons
document.querySelectorAll(".btn-back").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      showScreenByIndex(prevIndex);
    }
  });
});

// "Meet My Companion" from creating screen
const btnMeetCompanion = document.getElementById("btnMeetCompanion");
if (btnMeetCompanion) {
  btnMeetCompanion.addEventListener("click", () => {
    showScreenByIndex(screensOrder.indexOf("chat"));
    initChatIntro();
  });
}

// Chat form submit
if (chatForm) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage("user", text);
    logChatToBackend("user", text);
    chatInput.value = "";

    handleUserFreeText();
  });
}

// =======================
// INITIAL
// =======================

showScreenByIndex(0);
console.log("Nirvana script loaded OK");
