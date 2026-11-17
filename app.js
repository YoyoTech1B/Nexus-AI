"use strict";

/* =========================================
   NEXUS AI — APPLICATION ENGINE
   Version 1.0.0
========================================= */

const APP_VERSION = "1.0.0";
const AI_ENDPOINT = "https://nexus-ai-backend.yoyoblue30.workers.dev";
const AI_TIMEOUT_MS = 60000;
const MAX_ACTIVITY = 8;

const STORAGE_KEYS = {
  tasks: "nexus_tasks",
  notes: "nexus_notes",
  research: "nexus_research",
  activity: "nexus_activity"
};

const $ = (selector, root = document) => root.querySelector(selector);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================
   STORAGE
========================================= */

let storageWarningShown = false;

function loadData(key, isValid) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn("NEXUS AI could not save data:", error);

    if (!storageWarningShown) {
      storageWarningShown = true;
      alert(
        "NEXUS AI couldn't save your data on this device. " +
        "Your browser storage may be full or disabled (for example in private mode)."
      );
    }
  }
}

const isTextItem = item =>
  item && typeof item === "object" && typeof item.text === "string";

const isResearchItem = item =>
  item && typeof item === "object" && typeof item.url === "string";

const isActivityItem = item =>
  item && typeof item === "object" && typeof item.message === "string";

let tasks = loadData(STORAGE_KEYS.tasks, isTextItem);
let notes = loadData(STORAGE_KEYS.notes, isTextItem);
let research = loadData(STORAGE_KEYS.research, isResearchItem);
let activity = loadData(STORAGE_KEYS.activity, isActivityItem);

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatLongDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function recordActivity(message) {
  activity.unshift({
    id: createId(),
    message,
    date: new Date().toLocaleString()
  });

  activity = activity.slice(0, MAX_ACTIVITY);
  saveData(STORAGE_KEYS.activity, activity);
  renderActivity();
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/** Only allow http(s) links, even if stored data was tampered with. */
function safeHref(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function makeDeleteButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>';
  button.addEventListener("click", onClick);
  return button;
}

/* =========================================
   NAVIGATION
========================================= */

const sidebar = $("#sidebar");
const menuButton = $("#menuBtn");

function setSidebar(open) {
  sidebar.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function openPage(pageId) {
  const page = document.getElementById(pageId);
  if (!page || !page.classList.contains("page")) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.remove("active");
  });

  page.classList.add("active");

  document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    const isActive = button.dataset.page === pageId;
    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const activeButton = document.querySelector(
    `.nav-item[data-page="${pageId}"]`
  );

  $("#pageLabel").textContent = activeButton
    ? activeButton.textContent.trim()
    : "Dashboard";

  setSidebar(false);

  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? "auto" : "smooth"
  });

  refreshIcons();
}

document.querySelectorAll(".nav-item[data-page]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});

document.querySelectorAll("[data-open]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.open));
});

menuButton.setAttribute("aria-expanded", "false");

menuButton.addEventListener("click", () => {
  setSidebar(!sidebar.classList.contains("open"));
});

// Close the mobile menu when tapping outside it, or pressing Escape
document.addEventListener("click", event => {
  if (!sidebar.classList.contains("open")) return;
  if (sidebar.contains(event.target) || menuButton.contains(event.target)) return;
  setSidebar(false);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && sidebar.classList.contains("open")) {
    setSidebar(false);
    menuButton.focus();
  }
});

/* =========================================
   WORKSPACE SEARCH
========================================= */

function summarizeMatches(title, items, getText) {
  if (!items.length) return `${title}: 0`;

  const preview = items
    .slice(0, 3)
    .map(item => {
      const text = getText(item);
      return `   • ${text.length > 60 ? text.slice(0, 57) + "…" : text}`;
    })
    .join("\n");

  const more = items.length > 3 ? `\n   …and ${items.length - 3} more` : "";
  return `${title}: ${items.length}\n${preview}${more}`;
}

$("#searchBtn").addEventListener("click", () => {
  const query = prompt("Search your NEXUS workspace:");

  if (!query || !query.trim()) return;

  const term = query.trim().toLowerCase();

  const taskMatches = tasks.filter(task =>
    task.text.toLowerCase().includes(term)
  );

  const noteMatches = notes.filter(note =>
    note.text.toLowerCase().includes(term)
  );

  const researchMatches = research.filter(item =>
    item.url.toLowerCase().includes(term)
  );

  const total =
    taskMatches.length + noteMatches.length + researchMatches.length;

  alert(
    `SEARCH RESULTS FOR "${query.trim()}"\n\n` +
    `${summarizeMatches("Tasks", taskMatches, item => item.text)}\n\n` +
    `${summarizeMatches("Notes", noteMatches, item => item.text)}\n\n` +
    `${summarizeMatches("Research sources", researchMatches, item => item.url)}\n\n` +
    `Total matches: ${total}`
  );
});

/* =========================================
   DASHBOARD
========================================= */

function updateDashboard() {
  const active = tasks.filter(task => !task.done).length;
  const completed = tasks.filter(task => task.done).length;

  $("#taskCount").textContent = active;
  $("#completedCount").textContent = completed;
  $("#noteCount").textContent = notes.length;

  $("#analyticsTasks").textContent = tasks.length;
  $("#analyticsCompleted").textContent = completed;
  $("#analyticsNotes").textContent = notes.length;

  const today = formatLongDate(new Date());

  $("#currentDate").textContent = today;
  $("#plannerDate").textContent = today;
}

function renderActivity() {
  const container = $("#activityList");
  container.replaceChildren();

  if (!activity.length) {
    container.className = "empty-state";
    container.textContent = "No activity yet. Start using NEXUS AI!";
    return;
  }

  container.className = "item-list";

  activity.forEach(item => {
    const row = document.createElement("div");
    row.className = "list-item";

    const icon = document.createElement("span");
    icon.textContent = "✦";
    icon.setAttribute("aria-hidden", "true");

    const message = document.createElement("span");
    message.className = "item-text";
    message.textContent = item.message;

    const date = document.createElement("small");
    date.textContent = item.date || "";
    date.style.color = "var(--muted)";

    row.append(icon, message, date);
    container.append(row);
  });
}

/* =========================================
   TASK MANAGER
========================================= */

function renderTasks() {
  const container = $("#taskList");
  container.replaceChildren();

  if (!tasks.length) {
    container.className = "empty-state";
    container.textContent = "No tasks yet. Add your first task above.";
    updateDashboard();
    return;
  }

  container.className = "item-list";

  tasks.forEach(task => {
    const row = document.createElement("div");
    row.className = "list-item";

    if (task.done) row.classList.add("done");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);
    checkbox.setAttribute("aria-label", `Complete task: ${task.text}`);

    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveData(STORAGE_KEYS.tasks, tasks);

      recordActivity(
        task.done
          ? `Completed task: ${task.text}`
          : `Reopened task: ${task.text}`
      );

      renderTasks();
    });

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = task.text;

    const priority = document.createElement("span");
    priority.className = "priority";
    priority.textContent = task.priority || "Normal";

    const remove = makeDeleteButton(`Delete task: ${task.text}`, () => {
      tasks = tasks.filter(item => item.id !== task.id);
      saveData(STORAGE_KEYS.tasks, tasks);
      recordActivity(`Deleted task: ${task.text}`);
      renderTasks();
    });

    row.append(checkbox, text, priority, remove);
    container.append(row);
  });

  updateDashboard();
  refreshIcons();
}

$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("#taskInput");
  const text = input.value.trim();

  if (!text) return;

  tasks.unshift({
    id: createId(),
    text,
    priority: $("#taskPriority").value,
    done: false,
    createdAt: new Date().toISOString()
  });

  saveData(STORAGE_KEYS.tasks, tasks);

  input.value = "";
  input.focus();

  recordActivity(`Created task: ${text}`);
  renderTasks();
});

/* =========================================
   NOTES WORKSPACE
========================================= */

function renderNotes() {
  const container = $("#noteList");
  container.replaceChildren();

  if (!notes.length) {
    container.className = "empty-state";
    container.textContent = "Your notes will appear here.";
    updateDashboard();
    return;
  }

  container.className = "item-list";

  notes.forEach(note => {
    const row = document.createElement("div");
    row.className = "list-item";

    const icon = document.createElement("span");
    icon.textContent = "▤";
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = note.text;

    const preview = note.text.length > 40
      ? note.text.slice(0, 37) + "…"
      : note.text;

    const remove = makeDeleteButton(`Delete note: ${preview}`, () => {
      notes = notes.filter(item => item.id !== note.id);
      saveData(STORAGE_KEYS.notes, notes);
      recordActivity("Deleted a workspace note.");
      renderNotes();
    });

    row.append(icon, text, remove);
    container.append(row);
  });

  updateDashboard();
  refreshIcons();
}

$("#noteForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("#noteInput");
  const text = input.value.trim();

  if (!text) return;

  notes.unshift({
    id: createId(),
    text,
    createdAt: new Date().toISOString()
  });

  saveData(STORAGE_KEYS.notes, notes);

  input.value = "";
  input.focus();

  recordActivity("Saved a new workspace note.");
  renderNotes();
});

/* =========================================
   RESEARCH CENTER
========================================= */

function renderResearch() {
  const container = $("#researchList");
  container.replaceChildren();

  if (!research.length) {
    container.className = "empty-state";
    container.textContent = "No research sources saved yet.";
    return;
  }

  container.className = "item-list";

  research.forEach(item => {
    const row = document.createElement("div");
    row.className = "list-item";

    const href = safeHref(item.url);
    let label;

    if (href) {
      label = document.createElement("a");
      label.href = href;
      label.target = "_blank";
      label.rel = "noopener noreferrer";
      label.style.color = "var(--cyan)";
    } else {
      label = document.createElement("span");
    }

    label.className = "item-text";
    label.textContent = item.url;
    label.style.overflowWrap = "anywhere";

    const remove = makeDeleteButton(`Delete source: ${item.url}`, () => {
      research = research.filter(source => source.id !== item.id);
      saveData(STORAGE_KEYS.research, research);
      recordActivity("Removed a research source.");
      renderResearch();
    });

    row.append(label, remove);
    container.append(row);
  });

  refreshIcons();
}

function saveResearchSource() {
  const input = $("#researchInput");
  const raw = input.value.trim();

  if (!raw) return;

  let url;

  try {
    // Be forgiving: "example.com" becomes "https://example.com"
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    alert("Please enter a valid website URL, for example https://example.com");
    return;
  }

  if (research.some(item => item.url === url.href)) {
    alert("That source is already saved.");
    return;
  }

  research.unshift({
    id: createId(),
    url: url.href,
    createdAt: new Date().toISOString()
  });

  saveData(STORAGE_KEYS.research, research);

  input.value = "";

  recordActivity("Saved a research source.");
  renderResearch();
}

$("#saveResearch").addEventListener("click", saveResearchSource);

$("#researchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveResearchSource();
  }
});

/* =========================================
   AI ASSISTANT — RESPONSE FORMATTER
========================================= */

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();

  try {
    document.execCommand("copy");
  } finally {
    helper.remove();
  }
}

function buildCodeBlock(code, language) {
  const block = document.createElement("div");
  block.className = "nexus-code-block";

  const toolbar = document.createElement("div");
  toolbar.className = "nexus-code-toolbar";

  const label = document.createElement("span");
  label.textContent = language || "code";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "nexus-copy-code";
  copyButton.textContent = "Copy";

  copyButton.addEventListener("click", async () => {
    try {
      await copyText(code);
      copyButton.textContent = "Copied!";
    } catch {
      copyButton.textContent = "Copy failed";
    }

    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1800);
  });

  toolbar.append(label, copyButton);

  const pre = document.createElement("pre");
  const codeElement = document.createElement("code");
  codeElement.textContent = code;

  pre.append(codeElement);
  block.append(toolbar, pre);

  return block;
}

function renderNexusMarkdown(target, markdown) {
  target.replaceChildren();
  target.classList.add("nexus-ai-response");

  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");

  let paragraph = [];
  let list = null;
  let codeLines = [];
  let codeLanguage = "";
  let inCode = false;

  function appendInline(parent, value) {
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(value)) !== null) {
      parent.append(document.createTextNode(value.slice(last, match.index)));

      const token = match[0];
      const isBold = token.startsWith("**");
      const element = document.createElement(isBold ? "strong" : "code");

      element.textContent = isBold ? token.slice(2, -2) : token.slice(1, -1);

      parent.append(element);
      last = pattern.lastIndex;
    }

    parent.append(document.createTextNode(value.slice(last)));
  }

  function flushParagraph() {
    if (!paragraph.length) return;

    const p = document.createElement("p");
    appendInline(p, paragraph.join(" "));
    target.append(p);

    paragraph = [];
  }

  function closeList() {
    if (list) {
      target.append(list);
      list = null;
    }
  }

  function flushCode() {
    target.append(buildCodeBlock(codeLines.join("\n"), codeLanguage));
    codeLines = [];
    codeLanguage = "";
    inCode = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeList();

      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeLanguage = trimmed.slice(3).trim();
      }

      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      flushParagraph();
      closeList();

      const h = document.createElement("h" + heading[1].length);
      appendInline(h, heading[2]);
      target.append(h);

      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (bullet || numbered) {
      flushParagraph();

      const tag = bullet ? "ul" : "ol";

      if (!list || list.tagName.toLowerCase() !== tag) {
        closeList();
        list = document.createElement(tag);
      }

      const li = document.createElement("li");
      appendInline(li, (bullet || numbered)[1]);
      list.append(li);

      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  // An unclosed code fence at the end of the reply is still shown
  if (inCode) flushCode();

  flushParagraph();
  closeList();
}

/* =========================================
   AI ASSISTANT — CHAT CONNECTION
========================================= */

function scrollChatToBottom() {
  const container = $("#chatMessages");
  container.scrollTop = container.scrollHeight;
}

let chatBusy = false;

$("#chatForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (chatBusy) return;

  const input = $("#chatInput");
  const sendButton = $("#chatForm button[type='submit']");
  const message = input.value.trim();

  if (!message) return;

  const container = $("#chatMessages");

  // Display the user's message
  const userMessage = document.createElement("div");
  userMessage.className = "list-item";

  const userText = document.createElement("span");
  userText.className = "item-text";
  userText.textContent = message;

  userMessage.append(userText);
  container.append(userMessage);

  // Create the AI response area
  const response = document.createElement("div");
  response.className = "list-item";

  const responseText = document.createElement("span");
  responseText.className = "item-text";
  responseText.textContent = "NEXUS AI is thinking...";

  response.append(responseText);
  container.append(response);

  input.value = "";
  chatBusy = true;
  sendButton.disabled = true;
  container.setAttribute("aria-busy", "true");
  scrollChatToBottom();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    if (!navigator.onLine) {
      throw new Error("You appear to be offline. Check your connection and try again.");
    }

    // Get the signed-in user's Firebase token
    if (!window.nexusAuth || typeof window.nexusAuth.getIdToken !== "function") {
      throw new Error("Please sign in again.");
    }

    const token = await window.nexusAuth.getIdToken();

    if (!token) {
      throw new Error("Please sign in again.");
    }

    // Send the message to the secure Cloudflare backend
    const aiResponse = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ message }),
      signal: controller.signal
    });

    const data = await aiResponse.json().catch(() => ({}));

    if (!aiResponse.ok) {
      throw new Error(data.error || `The AI request failed (${aiResponse.status}).`);
    }

    renderNexusMarkdown(
      responseText,
      data.reply || "NEXUS AI returned an empty response."
    );

  } catch (error) {
    console.error("NEXUS AI error:", error);

    const reason = error.name === "AbortError"
      ? "The request took too long. Please try again."
      : error.message;

    responseText.textContent = "Sorry, NEXUS AI couldn't respond: " + reason;
  } finally {
    clearTimeout(timeout);
    chatBusy = false;
    sendButton.disabled = false;
    container.removeAttribute("aria-busy");
    scrollChatToBottom();
    input.focus();
  }
});

/* =========================================
   CALCULATOR
========================================= */

function calculateExpression(expression) {
  const input = expression.replace(/\s+/g, "");

  if (!input || !/^[0-9+\-*/().%]+$/.test(input)) {
    throw new Error("Only basic arithmetic is supported.");
  }

  let position = 0;

  function parseExpression() {
    let value = parseTerm();

    while (input[position] === "+" || input[position] === "-") {
      const operator = input[position++];
      const next = parseTerm();

      value = operator === "+" ? value + next : value - next;
    }

    return value;
  }

  function parseTerm() {
    let value = parseFactor();

    while (
      input[position] === "*" ||
      input[position] === "/" ||
      input[position] === "%"
    ) {
      const operator = input[position++];
      const next = parseFactor();

      if ((operator === "/" || operator === "%") && next === 0) {
        throw new Error("Cannot divide by zero.");
      }

      if (operator === "*") value *= next;
      if (operator === "/") value /= next;
      if (operator === "%") value %= next;
    }

    return value;
  }

  function parseFactor() {
    if (input[position] === "+") {
      position++;
      return parseFactor();
    }

    if (input[position] === "-") {
      position++;
      return -parseFactor();
    }

    if (input[position] === "(") {
      position++;
      const value = parseExpression();

      if (input[position] !== ")") {
        throw new Error("Missing closing bracket.");
      }

      position++;
      return value;
    }

    const start = position;

    while (/[0-9.]/.test(input[position] || "")) {
      position++;
    }

    const number = input.slice(start, position);

    if (!number || !/^(?:\d+\.?\d*|\.\d+)$/.test(number)) {
      throw new Error("Invalid expression.");
    }

    return Number(number);
  }

  const result = parseExpression();

  if (position !== input.length || !Number.isFinite(result)) {
    throw new Error("Invalid calculation.");
  }

  // Trim floating-point noise, e.g. 0.1 + 0.2 → 0.3
  return Number(result.toPrecision(12));
}

function runCalculator() {
  try {
    const result = calculateExpression($("#calcInput").value);
    $("#calcResult").textContent = `Result: ${result}`;
  } catch (error) {
    $("#calcResult").textContent = error.message;
  }
}

$("#calculateBtn").addEventListener("click", runCalculator);

$("#calcInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    runCalculator();
  }
});

/* =========================================
   WORD COUNTER
========================================= */

$("#wordInput").addEventListener("input", () => {
  const value = $("#wordInput").value;
  const trimmed = value.trim();

  const words = trimmed ? trimmed.split(/\s+/).length : 0;

  $("#wordResult").textContent =
    `${words} ${words === 1 ? "word" : "words"} · ` +
    `${value.length} ${value.length === 1 ? "character" : "characters"}`;
});

/* =========================================
   DATA EXPORT
========================================= */

$("#exportData").addEventListener("click", () => {
  const backup = {
    application: "NEXUS AI",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    notes,
    research,
    activity
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "nexus-ai-backup.json";
  link.style.display = "none";

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  recordActivity("Exported a workspace backup.");
});

/* =========================================
   CLEAR WORKSPACE
========================================= */

$("#clearData").addEventListener("click", () => {
  const confirmed = confirm(
    "Are you sure? This will permanently clear your locally saved NEXUS tasks, notes, research and activity."
  );

  if (!confirmed) return;

  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Could not clear", key, error);
    }
  });

  tasks = [];
  notes = [];
  research = [];
  activity = [];

  renderTasks();
  renderNotes();
  renderResearch();
  renderActivity();
  updateDashboard();

  alert("Your local workspace data has been cleared.");
});

/* =========================================
   INITIALIZE APPLICATION
========================================= */

function initializeNexus() {
  updateDashboard();
  renderTasks();
  renderNotes();
  renderResearch();
  renderActivity();
  refreshIcons();

  console.log("NEXUS AI application initialized.");
}

initializeNexus();

/* =========================================
   NEXUS AI — APP INSTALL EXPERIENCE
========================================= */

let nexusInstallPrompt = null;

function nexusIsInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.navigator.standalone === true
  );
}

function nexusUpdateInstallButtons() {
  const installed = nexusIsInstalled();

  document.querySelectorAll("[data-install-app]").forEach(button => {
    button.textContent = installed
      ? "✓ APP INSTALLED"
      : button.classList.contains("top-download-btn")
        ? "↓ DOWNLOAD APP"
        : "↓ DOWNLOAD NEXUS AI";

    button.disabled = installed;
    button.classList.toggle("is-installed", installed);
  });

  const hint = document.getElementById("installHint");

  if (hint) {
    hint.textContent = installed
      ? "NEXUS AI is installed on this device."
      : "Install NEXUS AI on your device.";
  }
}

function nexusShowInstallHelp() {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    alert(
      "To install NEXUS AI:\n\n" +
      "1. Open this website in Safari.\n" +
      "2. Tap Share.\n" +
      "3. Choose Add to Home Screen.\n" +
      "4. Tap Add."
    );
  } else if (/Android/i.test(ua)) {
    alert(
      "To install NEXUS AI:\n\n" +
      "Open this website in Chrome, tap the menu (⋮), then choose Install app or Add to Home screen."
    );
  } else {
    alert(
      "Your browser has not offered the install prompt yet.\n\n" +
      "Open NEXUS AI over HTTPS in Chrome or Edge and use the browser's Install option."
    );
  }
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  nexusInstallPrompt = event;
});

document.querySelectorAll("[data-install-app]").forEach(button => {
  button.addEventListener("click", async () => {
    if (nexusIsInstalled()) {
      nexusUpdateInstallButtons();
      return;
    }

    if (!nexusInstallPrompt) {
      nexusShowInstallHelp();
      return;
    }

    try {
      nexusInstallPrompt.prompt();
      await nexusInstallPrompt.userChoice;
    } catch (error) {
      console.warn("Install prompt failed:", error);
    } finally {
      nexusInstallPrompt = null;
    }
  });
});

window.addEventListener("appinstalled", () => {
  nexusInstallPrompt = null;
  nexusUpdateInstallButtons();
});

// Keep the buttons correct if the display mode changes while the page is open
const standaloneQuery = window.matchMedia("(display-mode: standalone)");

if (typeof standaloneQuery.addEventListener === "function") {
  standaloneQuery.addEventListener("change", nexusUpdateInstallButtons);
}

nexusUpdateInstallButtons();
