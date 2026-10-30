
"use strict";

/* =========================================
   NEXUS AI — APPLICATION ENGINE
   Version 1.0.0
========================================= */

const STORAGE_KEYS = {
  tasks: "nexus_tasks",
  notes: "nexus_notes",
  research: "nexus_research",
  activity: "nexus_activity"
};

const $ = (selector) => document.querySelector(selector);

function loadData(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let tasks = loadData(STORAGE_KEYS.tasks);
let notes = loadData(STORAGE_KEYS.notes);
let research = loadData(STORAGE_KEYS.research);
let activity = loadData(STORAGE_KEYS.activity);

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function recordActivity(message) {
  activity.unshift({
    id: createId(),
    message,
    date: new Date().toLocaleString()
  });

  activity = activity.slice(0, 8);
  saveData(STORAGE_KEYS.activity, activity);
  renderActivity();
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* =========================================
   NAVIGATION
========================================= */

function openPage(pageId) {
  const page = document.getElementById(pageId);
  if (!page) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.remove("active");
  });

  page.classList.add("active");

  document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageId
    );
  });

  const activeButton = document.querySelector(
    `.nav-item[data-page="${pageId}"]`
  );

  $("#pageLabel").textContent = activeButton
    ? activeButton.textContent.trim()
    : "Dashboard";

  $("#sidebar").classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
  refreshIcons();
}

document.querySelectorAll(".nav-item[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-open]").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.open);
  });
});

$("#menuBtn").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

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
    taskMatches.length +
    noteMatches.length +
    researchMatches.length;

  alert(
    `SEARCH RESULTS\n\n` +
    `Tasks: ${taskMatches.length}\n` +
    `Notes: ${noteMatches.length}\n` +
    `Research sources: ${researchMatches.length}\n\n` +
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

  const today = new Date();

  $("#currentDate").textContent = today.toLocaleDateString(
    undefined,
    { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  );

  $("#plannerDate").textContent = today.toLocaleDateString(
    undefined,
    { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  );
}

function renderActivity() {
  const container = $("#activityList");

  if (!activity.length) {
    container.className = "empty-state";
    container.textContent = "No activity yet. Start using NEXUS AI!";
    return;
  }

  container.className = "item-list";
  container.replaceChildren();

  activity.forEach(item => {
    const row = document.createElement("div");
    row.className = "list-item";

    const icon = document.createElement("span");
    icon.textContent = "✦";

    const message = document.createElement("span");
    message.className = "item-text";
    message.textContent = item.message;

    const date = document.createElement("small");
    date.textContent = item.date;
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
    container.textContent = "No tasks yet. Add your first task above.";
    container.className = "empty-state";
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
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Complete task");

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
    priority.textContent = task.priority;

    const remove = document.createElement("button");
    remove.setAttribute("aria-label", "Delete task");
    remove.innerHTML = '<i data-lucide="trash-2"></i>';

    remove.addEventListener("click", () => {
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

  const task = {
    id: createId(),
    text,
    priority: $("#taskPriority").value,
    done: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  saveData(STORAGE_KEYS.tasks, tasks);

  input.value = "";

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

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = note.text;

    const remove = document.createElement("button");
    remove.setAttribute("aria-label", "Delete note");
    remove.innerHTML = '<i data-lucide="trash-2"></i>';

    remove.addEventListener("click", () => {
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

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.url;
    link.className = "item-text";
    link.style.color = "var(--cyan)";
    link.style.overflowWrap = "anywhere";

    const remove = document.createElement("button");
    remove.setAttribute("aria-label", "Delete source");
    remove.innerHTML = '<i data-lucide="trash-2"></i>';

    remove.addEventListener("click", () => {
      research = research.filter(source => source.id !== item.id);
      saveData(STORAGE_KEYS.research, research);
      recordActivity("Removed a research source.");
      renderResearch();
    });

    row.append(link, remove);
    container.append(row);
  });

  refreshIcons();
}

$("#saveResearch").addEventListener("click", () => {
  const input = $("#researchInput");
  let url;

  try {
    url = new URL(input.value.trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    alert("Please enter a valid website URL starting with https://");
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
});

/* =========================================
   AI ASSISTANT
========================================= */

$("#chatForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("#chatInput");
  const message = input.value.trim();

  if (!message) return;

  const container = $("#chatMessages");

  const userMessage = document.createElement("div");
  userMessage.className = "list-item";
  userMessage.style.marginBottom = "15px";

  const userText = document.createElement("span");
  userText.className = "item-text";
  userText.textContent = message;

  userMessage.append(userText);
  container.append(userMessage);

  const response = document.createElement("div");
  response.className = "list-item";

  const responseText = document.createElement("span");
  responseText.className = "item-text";
  responseText.textContent =
    "Your message is ready, but the real AI engine has not been connected yet. We will connect it through a secure backend in a later step. Your API key will never be placed in this public JavaScript file.";

  response.append(responseText);
  container.append(response);

  input.value = "";
  container.scrollTop = container.scrollHeight;
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

    let value;

    if (input[position] === "(") {
      position++;
      value = parseExpression();

      if (input[position] !== ")") {
        throw new Error("Missing closing bracket.");
      }

      position++;
    } else {
      const start = position;

      while (/[0-9.]/.test(input[position] || "")) {
        position++;
      }

      const number = input.slice(start, position);

      if (!number || !/^(?:\d+\.?\d*|\.\d+)$/.test(number)) {
        throw new Error("Invalid expression.");
      }

      value = Number(number);
    }

    return value;
  }

  const result = parseExpression();

  if (position !== input.length || !Number.isFinite(result)) {
    throw new Error("Invalid calculation.");
  }

  return result;
}

$("#calculateBtn").addEventListener("click", () => {
  try {
    const result = calculateExpression($("#calcInput").value);
    $("#calcResult").textContent = `Result: ${result}`;
  } catch (error) {
    $("#calcResult").textContent = error.message;
  }
});

/* =========================================
   WORD COUNTER
========================================= */

$("#wordInput").addEventListener("input", () => {
  const text = $("#wordInput").value.trim();

  const words = text
    ? text.split(/\s+/).filter(Boolean).length
    : 0;

  const characters = $("#wordInput").value.length;

  $("#wordResult").textContent =
    `${words} words · ${characters} characters`;
});

/* =========================================
   DATA EXPORT
========================================= */

$("#exportData").addEventListener("click", () => {
  const backup = {
    application: "NEXUS AI",
    version: "1.0.0",
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
  link.click();

  URL.revokeObjectURL(url);
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
    localStorage.removeItem(key);
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
