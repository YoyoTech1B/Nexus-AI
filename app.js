
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

$("#chatForm").addEventListener("submit", async event => {
  event.preventDefault();

  const input = $("#chatInput");
  const message = input.value.trim();

  if (!message) return;

  const container = $("#chatMessages");

  // Display the user's message
  const userMessage = document.createElement("div");
  userMessage.className = "list-item";
  userMessage.style.marginBottom = "15px";

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
  container.scrollTop = container.scrollHeight;

  try {
    // Get the signed-in user's Firebase token
    if (!window.nexusAuth || !window.nexusAuth.getIdToken) {
      throw new Error("Please sign in again.");
    }

    const token = await window.nexusAuth.getIdToken();

    // Send the message to the secure Cloudflare backend
    const aiResponse = await fetch(
      "https://nexus-ai-backend.yoyoblue30.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      }
    );

    
/* =========================================
   NEXUS AI — MESSAGE FORMATTING
========================================= */

function renderNexusMarkdown(element, markdown) {
  element.replaceChildren();

  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");

  let codeLines = [];
  let inCode = false;
  let list = null;
  let paragraph = [];

  function inlineFormat(parent, text) {
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      parent.append(document.createTextNode(text.slice(last, match.index)));

      const token = match[0];
      const node = token.startsWith("`")
        ? document.createElement("code")
        : token.startsWith("**")
          ? document.createElement("strong")
          : document.createElement("em");

      node.textContent = token.startsWith("`")
        ? token.slice(1, -1)
        : token.startsWith("**")
          ? token.slice(2, -2)
          : token.slice(1, -1);

      parent.append(node);
      last = pattern.lastIndex;
    }

    parent.append(document.createTextNode(text.slice(last)));
  }

  function closeList() {
    if (list) {
      element.append(list);
      list = null;
    }
  }

  function closeParagraph() {
    if (paragraph.length) {
      const p = document.createElement("p");
      inlineFormat(p, paragraph.join(" "));
      element.append(p);
      paragraph = [];
    }
  }

  function addCodeBlock() {
    const wrapper = document.createElement("div");
    wrapper.className = "nexus-code-block";

    const toolbar = document.createElement("div");
    toolbar.className = "nexus-code-toolbar";

    const label = document.createElement("span");
    label.textContent = "CODE";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "nexus-copy-code";
    copy.textContent = "Copy";

    const pre = document.createElement("pre");
    const code = document.createElement("code");

    code.textContent = codeLines.join("\n");
    pre.append(code);

    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        copy.textContent = "Copied!";
        setTimeout(() => copy.textContent = "Copy", 1500);
      } catch {
        copy.textContent = "Copy unavailable";
      }
    });

    toolbar.append(label, copy);
    wrapper.append(toolbar, pre);
    element.append(wrapper);
    codeLines = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      closeParagraph();
      closeList();

      if (inCode) {
        addCodeBlock();
        inCode = false;
      } else {
        inCode = true;
      }

      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      closeParagraph();
      closeList();

      const h = document.createElement("h" + heading[1].length);
      inlineFormat(h, heading[2]);
      element.append(h);
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (bullet || numbered) {
      closeParagraph();

      const type = bullet ? "ul" : "ol";

      if (!list || list.tagName.toLowerCase() !== type) {
        closeList();
        list = document.createElement(type);
      }

      const item = document.createElement("li");
      inlineFormat(item, (bullet || numbered)[1]);
      list.append(item);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  closeParagraph();
  closeList();

  if (inCode) addCodeBlock();
}

/* =========================================
   NEXUS AI — CHAT CONNECTION
========================================= */

$("#chatForm").addEventListener("submit", async event => {
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
  response.className = "list-item nexus-ai-response";

  const responseText = document.createElement("div");
  responseText.className = "item-text";
  responseText.textContent = "NEXUS AI is thinking...";

  response.append(responseText);
  container.append(response);

  input.value = "";
  container.scrollTop = container.scrollHeight;

  try {
    if (!window.nexusAuth || !window.nexusAuth.getIdToken) {
      throw new Error("Please sign in again.");
    }

    const token = await window.nexusAuth.getIdToken();

    const aiResponse = await fetch(
      "https://nexus-ai-backend.yoyoblue30.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      }
    );

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      throw new Error(data.error || "The AI request failed.");
    }

    renderNexusMarkdown(
      responseText,
      data.reply || "NEXUS AI returned an empty response."
    );

  } catch (error) {
    console.error("NEXUS AI error:", error);
    responseText.textContent =
      "Sorry, NEXUS AI couldn't respond: " + error.message;
  }

  container.scrollTop = container.scrollHeight;
});
