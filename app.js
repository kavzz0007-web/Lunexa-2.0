"use strict";

/* =========================================
   LUNEXA AI - COMPLETE FRONTEND
   ========================================= */

const $ = (selector, root = document) => root.querySelector(selector);
const STORAGE_KEY = "lunexa_app_v2";

const pageContainer = $("#pageContainer");
const pageHeading = $("#pageHeading");
const sidebar = $("#sidebar");
const toastElement = $("#toast");

let toastTimer = null;
let currentPage = "chat";
let chatRequestPending = false;
let activeQuiz = 0;
let quizAnswered = false;
let openedGroupId = null;

/* ---------- STORAGE ---------- */

function loadData() {
  const defaults = {
    messages: [],
    notes: [],
    documents: [],
    videos: [],
    groups: [],
    friends: [],
    chats: [],
    theme: "dark"
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    return {
      ...defaults,
      ...saved
    };
  } catch (error) {
    console.error("Lunexa storage error:", error);
    return defaults;
  }
}

const state = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Lunexa could not save data:", error);
    showToast("Storage is full. Remove some saved items.");
  }
}

function makeId() {
  return window.crypto?.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}

function showToast(message) {
  if (!toastElement) {
    console.log(message);
    return;
  }

  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(function () {
    toastElement.classList.remove("show");
  }, 2600);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";

  if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / 1048576).toFixed(1) + " MB";
}

function setBuddyMessage(message) {
  const speech = $("#buddySpeech");

  if (speech) {
    speech.textContent = message;
  }
}

/* ---------- NAVIGATION ---------- */

const pageNames = {
  chat: "AI Chat",
  notes: "Study Notes",
  documents: "My Documents",
  youtube: "YouTube Study",
  quiz: "Quiz & Flashcards",
  groups: "Group Study",
  friends: "Friends",
  history: "Chat History"
};

const buddyMessages = {
  chat: "Ask me anything. I'm here to help! 💙",
  notes: "Let's organise your study notes! 📝",
  documents: "Your study materials, in one place. 📚",
  youtube: "Let's learn from video lectures! 🎬",
  quiz: "Ready to test your knowledge? 🎯",
  groups: "Learning together is more fun! 👥",
  friends: "Build your study circle! ♡",
  history: "Let's revisit your learning journey. ✨"
};

function navigateTo(page) {
  if (!Object.prototype.hasOwnProperty.call(pageNames, page)) {
    return;
  }

  currentPage = page;
  openedGroupId = null;

  if (pageHeading) {
    pageHeading.textContent = pageNames[page];
  }

  document.querySelectorAll(".nav-item").forEach(function (button) {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  sidebar?.classList.remove("open");

  renderPage();

  setBuddyMessage(
    buddyMessages[page] || buddyMessages.chat
  );
}

function renderPage() {
  if (!pageContainer) {
    console.error(
      'Lunexa: Missing element with id="pageContainer". Check index.html.'
    );
    return;
  }

  const renderers = {
    chat: renderChatPage,
    notes: renderNotesPage,
    documents: renderDocumentsPage,
    youtube: renderYoutubePage,
    quiz: renderQuizPage,
    groups: renderGroupsPage,
    friends: renderFriendsPage,
    history: renderHistoryPage
  };

  const renderer = renderers[currentPage] || renderChatPage;

  pageContainer.innerHTML = renderer();
}

/* ---------- CHAT ---------- */

function renderChatPage() {
  const messages = state.messages.map(function (message) {
    const role = message.role === "user" ? "user" : "assistant";
    const label = role === "user" ? "You" : "Lunexa";

    return `
      <div class="message ${role}">
        <span class="message-label">${label}</span>
        <div class="message-text">${escapeHTML(message.text).replace(/\n/g, "<br>")}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="chat-layout">

      <div class="chat-welcome">
        <div class="eyebrow">
          YOUR PERSONAL STUDY COMPANION
        </div>

        <h1>
          Hey there! 👋<br>
          What are we learning
          <span class="gradient-text">today?</span>
        </h1>

        <p>
          I'm Lunexa, your AI study buddy.
          Ask questions, explore concepts, and learn something amazing.
        </p>

        <div class="feature-grid">

          <button
            class="feature-card"
            data-action="prompt"
            data-prompt="Explain artificial intelligence in simple words with an example."
          >
            <span class="feature-icon">🧠</span>
            <strong>Explain a topic</strong>
            <small>Make difficult concepts simple.</small>
          </button>

          <button class="feature-card" data-page="notes">
            <span class="feature-icon">📝</span>
            <strong>Create study notes</strong>
            <small>Organise your learning.</small>
          </button>

          <button class="feature-card" data-page="quiz">
            <span class="feature-icon">🎯</span>
            <strong>Test your knowledge</strong>
            <small>Practise with a quiz.</small>
          </button>

          <button class="feature-card" data-page="groups">
            <span class="feature-icon">👥</span>
            <strong>Study with friends</strong>
            <small>Create a study group.</small>
          </button>

        </div>
      </div>

      <div class="chat-messages" id="chatMessages">
        ${messages}
      </div>

      <form class="chat-composer" id="chatForm">

        <textarea
          id="chatInput"
          rows="1"
          maxlength="4000"
          placeholder="Ask Lunexa anything..."
          required
          aria-label="Your message"
          ${chatRequestPending ? "disabled" : ""}
        ></textarea>

        <button
          class="send-button"
          id="sendButton"
          type="submit"
          aria-label="Send message"
          ${chatRequestPending ? "disabled" : ""}
        >
          ${chatRequestPending ? "…" : "➤"}
        </button>

      </form>

      <div class="chat-footnote">
        Powered by Gemini AI ✨
      </div>

    </div>
  `;
}

function addMessage(role, text) {
  state.messages.push({
    id: makeId(),
    role: role,
    text: String(text),
    createdAt: new Date().toISOString()
  });

  state.messages = state.messages.slice(-100);

  saveData();
}

function replaceThinkingMessage(answer) {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (
      state.messages[i].role === "assistant" &&
      state.messages[i].text === "Thinking... 💙"
    ) {
      state.messages[i].text = answer;
      saveData();
      return;
    }
  }

  addMessage("assistant", answer);
}

async function sendChatMessage(text) {
  const message = String(text || "").trim();

  if (!message) {
    showToast("Please type a message first.");
    return;
  }

  if (chatRequestPending) {
    return;
  }

  chatRequestPending = true;

  addMessage("user", message);
  addMessage("assistant", "Thinking... 💙");

  renderPage();
  setBuddyMessage("Thinking about your question... 💭");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message
      })
    });

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        "Invalid server response. Check your Vercel deployment."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || "Server error (" + response.status + ")."
      );
    }

    if (
      data.success !== true ||
      typeof data.reply !== "string" ||
      !data.reply.trim()
    ) {
      throw new Error(
        data.error || "No AI answer was returned."
      );
    }

    replaceThinkingMessage(data.reply);

    setBuddyMessage("Here's your answer, bestie! 💙");

  } catch (error) {
    console.error("Lunexa chat error:", error);

    replaceThinkingMessage(
      "Sorry bestie! 💙\n\n" +
      (error.message || "Couldn't connect to the AI.") +
      "\n\nCheck the Vercel API deployment and try again."
    );

    setBuddyMessage("Let's check our AI connection. 💙");

  } finally {
    chatRequestPending = false;

    renderPage();

    $("#chatInput")?.focus();
  }
}

function startNewChat() {
  if (state.messages.length) {
    const firstQuestion = state.messages.find(function (item) {
      return item.role === "user";
    });

    state.chats.unshift({
      id: makeId(),
      title: firstQuestion?.text.slice(0, 55) || "Study session",
      messages: state.messages.slice(),
      createdAt: new Date().toISOString()
    });

    state.chats = state.chats.slice(0, 30);
  }

  state.messages = [];

  saveData();
  navigateTo("chat");

  showToast("New chat started! ✨");
}

/* ---------- NOTES ---------- */

function renderNotesPage() {
  const items = state.notes.map(function (note) {
    return `
      <div class="list-item">
        <div class="list-icon">📝</div>

        <div class="list-item-content">
          <strong>${escapeHTML(note.title)}</strong>
          <small>${escapeHTML((note.content || "").slice(0, 150))}</small>
          <small>${formatDate(note.createdAt)}</small>
        </div>

        <button
          class="action-button danger"
          data-action="delete-note"
          data-id="${escapeHTML(note.id)}"
        >
          Delete
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">
      Study <span class="gradient-text">Notes</span>
    </h1>

    <p class="page-subtitle">
      Save and organise your learning.
    </p>

    <div class="card">
      <form id="noteForm" class="form-stack">

        <label class="form-label">
          Note title
          <input
            class="field"
            id="noteTitle"
            maxlength="120"
            placeholder="Example: Machine Learning"
            required
          >
        </label>

        <label class="form-label">
          Notes
          <textarea
            class="textarea-field"
            id="noteContent"
            maxlength="20000"
            placeholder="Write your notes..."
            required
          ></textarea>
        </label>

        <button class="action-button primary" type="submit">
          ＋ Save Notes
        </button>

      </form>
    </div>

    <h2 class="section-title">
      Saved notes (${state.notes.length})
    </h2>

    <div class="list-stack">
      ${items || '<div class="empty-state">📝<br>No saved notes yet.</div>'}
    </div>
  `;
}

function saveNote(event) {
  event.preventDefault();

  const title = $("#noteTitle")?.value.trim();
  const content = $("#noteContent")?.value.trim();

  if (!title || !content) {
    showToast("Enter a title and notes.");
    return;
  }

  state.notes.unshift({
    id: makeId(),
    title: title,
    content: content,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderPage();

  showToast("Notes saved! 💙");
}

function deleteNote(id) {
  state.notes = state.notes.filter(function (note) {
    return note.id !== id;
  });

  saveData();
  renderPage();

  showToast("Note deleted.");
}

/* ---------- DOCUMENTS ---------- */

function renderDocumentsPage() {
  const items = state.documents.map(function (file) {
    return `
      <div class="list-item">
        <div class="list-icon">📄</div>

        <div class="list-item-content">
          <strong>${escapeHTML(file.name)}</strong>
          <small>${escapeHTML(file.size)} · ${formatDate(file.createdAt)}</small>
        </div>

        <button
          class="action-button danger"
          data-action="delete-document"
          data-id="${escapeHTML(file.id)}"
        >
          Remove
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">
      My <span class="gradient-text">Documents</span>
    </h1>

    <p class="page-subtitle">
      Keep your study file list organised.
    </p>

    <div class="card">
      <form id="documentForm" class="form-stack">

        <label class="form-label">
          Choose a file
          <input
            class="field"
            type="file"
            id="documentInput"
            accept=".pdf,.txt,.docx,.pptx"
          >
        </label>

        <p class="small-text muted">
          PDF, TXT, DOCX, PPTX · Maximum 10 MB.
        </p>

        <button class="action-button primary" type="submit">
          ＋ Add Document
        </button>

      </form>
    </div>

    <h2 class="section-title">
      Documents (${state.documents.length})
    </h2>

    <div class="list-stack">
      ${items || '<div class="empty-state">📚<br>No documents added yet.</div>'}
    </div>

    <p class="small-text muted">
      This version saves file details only. AI file reading needs an additional backend feature.
    </p>
  `;
}

function saveDocument(event) {
  event.preventDefault();

  const file = $("#documentInput")?.files?.[0];

  if (!file) {
    showToast("Choose a file first.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast("The maximum file size is 10 MB.");
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();

  if (!["pdf", "txt", "docx", "pptx"].includes(extension)) {
    showToast("Unsupported file type.");
    return;
  }

  state.documents.unshift({
    id: makeId(),
    name: file.name,
    size: formatBytes(file.size),
    createdAt: new Date().toISOString()
  });

  saveData();
  renderPage();

  showToast("Document added.");
}

function deleteDocument(id) {
  state.documents = state.documents.filter(function (file) {
    return file.id !== id;
  });

  saveData();
  renderPage();

  showToast("Document removed.");
}

/* ---------- YOUTUBE ---------- */

function isValidYouTubeURL(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (
      ![
        "youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be"
      ].includes(host)
    ) {
      return false;
    }

    if (host === "youtu.be") {
      return url.pathname.length > 1;
    }

    return (
      (url.pathname === "/watch" && Boolean(url.searchParams.get("v"))) ||
      /^\/(embed|shorts|live)\/[^/]+/.test(url.pathname)
    );

  } catch (error) {
    return false;
  }
}

function renderYoutubePage() {
  const items = state.videos.map(function (video) {
    return `
      <div class="list-item">
        <div class="list-icon">▶️</div>

        <div class="list-item-content">
          <strong>${escapeHTML(video.title)}</strong>
          <small>${escapeHTML(video.url)}</small>
          <small>${formatDate(video.createdAt)}</small>
        </div>

        <button
          class="action-button danger"
          data-action="delete-video"
          data-id="${escapeHTML(video.id)}"
        >
          Remove
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">
      YouTube <span class="gradient-text">Study</span>
    </h1>

    <p class="page-subtitle">
      Save lecture links for later.
    </p>

    <div class="card">
      <form id="youtubeForm" class="form-stack">

        <label class="form-label">
          Lecture title
          <input
            class="field"
            id="videoTitle"
            maxlength="150"
            placeholder="Lecture title"
            required
          >
        </label>

        <label class="form-label">
          YouTube URL
          <input
            class="field"
            id="videoURL"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            required
          >
        </label>

        <button class="action-button primary" type="submit">
          ＋ Save Lecture
        </button>

      </form>
    </div>

    <h2 class="section-title">
      Saved lectures (${state.videos.length})
    </h2>

    <div class="list-stack">
      ${items || '<div class="empty-state">🎬<br>No lectures saved yet.</div>'}
    </div>

    <p class="small-text muted">
      Transcript extraction and AI summaries are not connected in this version.
    </p>
  `;
}

function saveVideo(event) {
  event.preventDefault();

  const title = $("#videoTitle")?.value.trim();
  const url = $("#videoURL")?.value.trim();

  if (!title || !url || !isValidYouTubeURL(url)) {
    showToast("Enter a title and valid YouTube link.");
    return;
  }

  state.videos.unshift({
    id: makeId(),
    title: title,
    url: url,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderPage();

  showToast("Lecture saved! 🎬");
}

function deleteVideo(id) {
  state.videos = state.videos.filter(function (video) {
    return video.id !== id;
  });

  saveData();
  renderPage();

  showToast("Lecture removed.");
}

/* ---------- GROUP STUDY ---------- */

function renderGroupsPage() {
  const items = state.groups.map(function (group) {
    const members = Array.isArray(group.members) ? group.members : [];

    return `
      <div class="list-item">
        <div class="list-icon">👥</div>

        <div class="list-item-content">
          <strong>${escapeHTML(group.name)}</strong>
          <small>${escapeHTML(group.subject)} · ${members.length} member(s)</small>
          <small>Invite code: ${escapeHTML(group.code)}</small>
        </div>

        <div class="button-row">
          <button
            class="action-button"
            data-action="copy-invite"
            data-id="${escapeHTML(group.id)}"
          >
            Invite
          </button>

          <button
            class="action-button"
            data-action="open-group"
            data-id="${escapeHTML(group.id)}"
          >
            Open
          </button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">
      Group <span class="gradient-text">Study</span>
    </h1>

    <p class="page-subtitle">
      Create a study group and set a shared goal.
    </p>

    <div class="card">
      <form id="groupForm" class="form-stack">

        <label class="form-label">
          Group name
          <input class="field" id="groupName" maxlength="80" required>
        </label>

        <label class="form-label">
          Subject
          <input class="field" id="groupSubject" maxlength="100" required>
        </label>

        <label class="form-label">
          Study goal
          <textarea class="textarea-field" id="groupGoal" maxlength="1000"></textarea>
        </label>

        <button class="action-button primary" type="submit">
          ＋ Create Group
        </button>

      </form>
    </div>

    <h2 class="section-title">
      Your groups (${state.groups.length})
    </h2>

    <div class="list-stack">
      ${items || '<div class="empty-state">👥<br>Create your first study group!</div>'}
    </div>

    <div class="card" style="margin-top:20px">
      <h3>Join a group</h3>

      <form id="joinGroupForm" class="form-stack">
        <label class="form-label">
          Invite code
          <input class="field" id="inviteCode" maxlength="30" required>
        </label>

        <button class="action-button" type="submit">
          Join Group
        </button>
      </form>

      <p class="small-text muted">
        Joining works for groups saved in this browser.
        Shared online groups need a database and backend.
      </p>
    </div>
  `;
}

function createGroup(event) {
  event.preventDefault();

  const name = $("#groupName")?.value.trim();
  const subject = $("#groupSubject")?.value.trim();
  const goal = $("#groupGoal")?.value.trim();

  if (!name || !subject) {
    showToast("Enter a group name and subject.");
    return;
  }

  state.groups.unshift({
    id: makeId(),
    name: name,
    subject: subject,
    goal: goal,
    code: "LNX-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
    members: ["You"],
    messages: [],
    createdAt: new Date().toISOString()
  });

  saveData();
  renderPage();

  showToast("Group created! 💙");
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement("textarea");

      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";

      document.body.appendChild(input);
      input.select();

      const copied = document.execCommand("copy");

      input.remove();

      if (!copied) {
        throw new Error("Copy unavailable");
      }
    }

    showToast("Invitation copied! 💙");

  } catch (error) {
    window.prompt("Copy this text:", text);
  }
}

async function inviteGroup(id) {
  const group = state.groups.find(function (item) {
    return item.id === id;
  });

  if (!group) return;

  const text =
    "Join my Lunexa AI study group!\n" +
    "Group: " + group.name + "\n" +
    "Subject: " + group.subject + "\n" +
    "Invite code: " + group.code + "\n" +
    window.location.origin;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Lunexa AI Study Group",
        text: text
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        await copyText(text);
      }
    }
  } else {
    await copyText(text);
  }
}

function joinGroup(event) {
  event.preventDefault();

  const code = $("#inviteCode")?.value.trim().toUpperCase();

  const group = state.groups.find(function (item) {
    return String(item.code).toUpperCase() === code;
  });

  if (!group) {
    showToast("Group not found in this browser.");
    return;
  }

  if (!Array.isArray(group.members)) {
    group.members = [];
  }

  if (!group.members.includes("You")) {
    group.members.push("You");
  }

  saveData();
  openGroup(group.id);
}

function openGroup(id) {
  const group = state.groups.find(function (item) {
    return item.id === id;
  });

  if (!group) {
    showToast("Group not found.");
    return;
  }

  openedGroupId = id;
  currentPage = "groups";

  if (pageHeading) {
    pageHeading.textContent = group.name;
  }

  document.querySelectorAll(".nav-item").forEach(function (button) {
    button.classList.toggle(
      "active",
      button.dataset.page === "groups"
    );
  });

  sidebar?.classList.remove("open");

  const messages = (group.messages || []).map(function (message) {
    return `
      <div class="list-item">
        <div class="list-icon">💬</div>

        <div class="list-item-content">
          <strong>${escapeHTML(message.author)}</strong>
          <small>${escapeHTML(message.text)}</small>
          <small>${formatDate(message.createdAt)}</small>
        </div>
      </div>
    `;
  }).join("");

  pageContainer.innerHTML = `
    <button class="action-button" data-page="groups">
      ← All Groups
    </button>

    <h1 class="page-heading" style="margin-top:20px">
      ${escapeHTML(group.name)}
    </h1>

    <p class="page-subtitle">
      ${escapeHTML(group.subject)} · ${(group.members || []).length} member(s)
    </p>

    <div class="card">
      <h3>Study goal</h3>

      <p>
        ${escapeHTML(group.goal || "Learn together and support each other.")}
      </p>

      <div class="button-row">
        <button
          class="action-button primary"
          data-action="copy-invite"
          data-id="${escapeHTML(group.id)}"
        >
          Invite Friends
        </button>

        <button
          class="action-button danger"
          data-action="delete-group"
          data-id="${escapeHTML(group.id)}"
        >
          Delete Group
        </button>
      </div>
    </div>

    <h2 class="section-title">Group discussion</h2>

    <div class="list-stack">
      ${messages || '<div class="empty-state">💬<br>No messages yet.</div>'}
    </div>

    <div class="card" style="margin-top:20px">
      <form id="groupMessageForm" class="form-stack">

        <label class="form-label">
          Your message
          <textarea
            class="textarea-field"
            id="groupMessage"
            maxlength="2000"
            required
          ></textarea>
        </label>

        <button class="action-button primary" type="submit">
          Send Message
        </button>

      </form>

      <p class="small-text muted">
        Demo discussion is stored locally in this browser.
      </p>
    </div>
  `;

  setBuddyMessage("Let's study together! 💙");
}

function sendGroupMessage(event) {
  event.preventDefault();

  const group = state.groups.find(function (item) {
    return item.id === openedGroupId;
  });

  const text = $("#groupMessage")?.value.trim();

  if (!group || !text) {
    showToast("Write a message first.");
    return;
  }

  if (!Array.isArray(group.messages)) {
    group.messages = [];
  }

  group.messages.push({
    id: makeId(),
    author: "You",
    text: text,
    createdAt: new Date().toISOString()
  });

  saveData();
  openGroup(group.id);
}

function deleteGroup(id) {
  if (!window.confirm("Delete this study group?")) {
    return;
  }

  state.groups = state.groups.filter(function (group) {
    return group.id !== id;
  });

  openedGroupId = null;

  saveData();
  navigateTo("groups");

  showToast("Group deleted.");
}

/* ---------- FRIENDS ---------- */

function renderFriendsPage() {
  const items = state.friends.map(function (friend) {
    const name = friend.name || "?";

    return `
      <div class="list-item">
        <div class="profile-avatar">
          ${escapeHTML(name.charAt(0).toUpperCase())}
        </div>

        <div class="list-item-content">
          <strong>${escapeHTML(name)}</strong>
          <small>${escapeHTML(friend.email || "Lunexa study friend")}</small>
        </div>

        <button
          class="action-button danger"
          data-action="remove-friend"
          data-id="${escapeHTML(friend.id)}"
        >
          Remove
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">
      Study <span class="gradient-text">Friends</span>
    </h1>

    <p class="page-subtitle">
      Build your learning circle.
    </p>

    <div class="card">
      <form id="friendForm" class="form-stack">

        <label class="form-label">
          Friend's name
          <input class="field" id="friendName" maxlength="80" required>
        </label>

        <label class="form-label">
          Email (optional)
          <input
            class="field"
            id="friendEmail"
            type="email"
            maxlength="150"
          >
        </label>

        <button class="action-button primary" type="submit">
          ＋ Add Friend
        </button>

      </form>
    </div>

    <h2 class="section-title">
      My friends (${state.friends.length})
    </h2>

    <div class="list-stack">
      ${items || '<div class="empty-state">♡<br>Add your first study friend!</div>'}
    </div>

    <div class="card" style="margin-top:20px">
      <h3>Invite a friend</h3>

      <button
        class="action-button primary"
        data-action="share-lunexa"
      >
        Share Lunexa
      </button>
    </div>
  `;
}

function addFriend(event) {
  event.preventDefault();

  const name = $("#friendName")?.value.trim();
  const email = $("#friendEmail")?.value.trim();

  if (!name) {
    showToast("Enter a friend's name.");
    return;
  }

  if (
    email &&
    state.friends.some(function (friend) {
      return (friend.email || "").toLowerCase() === email.toLowerCase();
    })
  ) {
    showToast("Friend already exists.");
    return;
  }

  state.friends.unshift({
    id: makeId(),
    name: name,
    email: email,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderPage();

  showToast("Friend added! 💙");
}

function removeFriend(id) {
  state.friends = state.friends.filter(function (friend) {
    return friend.id !== id;
  });

  saveData();
  renderPage();

  showToast("Friend removed.");
}

async function shareLunexa() {
  const url = window.location.origin;
  const text = "Let's study together with Lunexa AI! 💙 " + url;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Lunexa AI",
        text: text,
        url: url
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        await copyText(text);
      }
    }
  } else {
    await copyText(text);
  }
}

/* ---------- QUIZ ---------- */

const quizQuestions = [
  {
    question: "What does AI stand for?",
    options: [
      "Automated Internet",
      "Artificial Intelligence",
      "Advanced Interface",
      "Applied Information"
    ],
    answer: 1,
    explanation: "AI stands for Artificial Intelligence."
  },
  {
    question: "Which language is commonly used for data science?",
    options: [
      "Python",
      "HTML only",
      "CSS only",
      "XML only"
    ],
    answer: 0,
    explanation: "Python is widely used for data analysis and machine learning."
  },
  {
    question: "What is the purpose of HTML?",
    options: [
      "Store passwords",
      "Train neural networks",
      "Structure web pages",
      "Manage operating systems"
    ],
    answer: 2,
    explanation: "HTML defines the structure and content of web pages."
  }
];

function renderQuizPage() {
  const question = quizQuestions[activeQuiz];

  const options = question.options.map(function (option, index) {
    return `
      <button
        class="quiz-option"
        data-action="answer-quiz"
        data-answer="${index}"
      >
        ${String.fromCharCode(65 + index)}. ${escapeHTML(option)}
      </button>
    `;
  }).join("");

  return `
    <h1 class="page-heading">
      Quiz & <span class="gradient-text">Flashcards</span>
    </h1>

    <p class="page-subtitle">
      Practise your knowledge with a sample quiz.
    </p>

    <div class="card">
      <p class="eyebrow">
        QUESTION ${activeQuiz + 1} OF ${quizQuestions.length}
      </p>

      <h3>${escapeHTML(question.question)}</h3>

      <div id="quizOptions">
        ${options}
      </div>

      <div id="quizFeedback"></div>

      <button
        class="action-button primary"
        id="nextQuestion"
        data-action="next-quiz"
        style="display:none;margin-top:15px"
      >
        Next Question →
      </button>
    </div>

    <div class="card" style="margin-top:20px">
      <h3>🃏 Flashcard</h3>

      <p id="flashcardContent" class="feedback">
        Question: What is AI?
      </p>

      <button
        class="action-button"
        data-action="flip-card"
        data-state="question"
      >
        Show answer
      </button>
    </div>
  `;
}

function answerQuiz(value) {
  if (quizAnswered) {
    return;
  }

  const question = quizQuestions[activeQuiz];
  const selected = Number(value);
  const feedback = $("#quizFeedback");

  if (!feedback) {
    return;
  }

  quizAnswered = true;

  document.querySelectorAll(".quiz-option").forEach(function (button, index) {
    button.disabled = true;

    if (index === question.answer) {
      button.classList.add("correct");
    }

    if (index === selected && index !== question.answer) {
      button.classList.add("incorrect");
    }
  });

  feedback.innerHTML = `
    <div class="feedback">
      ${selected === question.answer ? "✅ Correct!" : "💡 Not quite!"}
      ${escapeHTML(question.explanation)}
    </div>
  `;

  const next = $("#nextQuestion");

  if (next) {
    next.style.display = "inline-flex";

    next.textContent =
      activeQuiz === quizQuestions.length - 1
        ? "Restart Quiz ↻"
        : "Next Question →";
  }
}

function nextQuiz() {
  if (!quizAnswered) {
    showToast("Answer the question first.");
    return;
  }

  activeQuiz = (activeQuiz + 1) % quizQuestions.length;
  quizAnswered = false;

  renderPage();
}

function flipFlashcard(button) {
  const content = $("#flashcardContent");

  if (!content) {
    return;
  }

  if (button.dataset.state === "question") {
    content.textContent =
      "Answer: AI stands for Artificial Intelligence. It enables computers to perform tasks that usually require human intelligence.";

    button.dataset.state = "answer";
    button.textContent = "Show question";

  } else {
    content.textContent = "Question: What is AI?";

    button.dataset.state = "question";
    button.textContent = "Show answer";
  }
}

/* ---------- HISTORY ---------- */

function renderHistoryPage() {
  const items = state.chats.map(function (chat) {
    return `
      <div class="list-item">
        <div class="list-icon">◷</div>

        <div class="list-item-content">
          <strong>${escapeHTML(chat.title)}</strong>
          <small>${formatDate(chat.createdAt)}</small>
          <small>${(chat.messages || []).length} messages</small>
        </div>

        <button
          class="action-button"
          data-action="restore-chat"
          data-id="${escapeHTML(chat.id)}"
        >
          Open
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">
      Chat <span class="gradient-text">History</span>
    </h1>

    <p class="page-subtitle">
      Revisit your saved study conversations.
    </p>

    <div class="list-stack">
      ${items || '<div class="empty-state">◷<br>No previous chats yet.</div>'}
    </div>

    <button
      class="action-button primary"
      data-action="new-chat"
      style="margin-top:20px"
    >
      ＋ New Chat
    </button>
  `;
}

function restoreChat(id) {
  const chat = state.chats.find(function (item) {
    return item.id === id;
  });

  if (!chat) {
    showToast("Chat not found.");
    return;
  }

  state.messages = (chat.messages || []).slice();

  saveData();
  navigateTo("chat");

  showToast("Chat restored.");
}

/* ---------- CLICK EVENTS ---------- */

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const pageButton = event.target.closest("[data-page]");

  if (pageButton) {
    event.preventDefault();
    navigateTo(pageButton.dataset.page);
    return;
  }

  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;

  switch (button.dataset.action) {
    case "new-chat":
      startNewChat();
      break;

    case "toggle-theme":
      document.body.classList.toggle("light-theme");

      state.theme = document.body.classList.contains("light-theme")
        ? "light"
        : "dark";

      saveData();
      break;

    case "prompt":
      sendChatMessage(button.dataset.prompt || "");
      break;

    case "delete-note":
      deleteNote(id);
      break;

    case "delete-document":
      deleteDocument(id);
      break;

    case "delete-video":
      deleteVideo(id);
      break;

    case "copy-invite":
      inviteGroup(id);
      break;

    case "open-group":
      openGroup(id);
      break;

    case "delete-group":
      deleteGroup(id);
      break;

    case "remove-friend":
      removeFriend(id);
      break;

    case "share-lunexa":
      shareLunexa();
      break;

    case "answer-quiz":
      answerQuiz(button.dataset.answer);
      break;

    case "next-quiz":
      nextQuiz();
      break;

    case "flip-card":
      flipFlashcard(button);
      break;

    case "restore-chat":
      restoreChat(id);
      break;
  }
});

/* ---------- FORM EVENTS ---------- */

document.addEventListener("submit", function (event) {
  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  switch (form.id) {
    case "chatForm":
      event.preventDefault();

      if (!chatRequestPending) {
        sendChatMessage($("#chatInput")?.value || "");
      }
      break;

    case "noteForm":
      saveNote(event);
      break;

    case "documentForm":
      saveDocument(event);
      break;

    case "youtubeForm":
      saveVideo(event);
      break;

    case "groupForm":
      createGroup(event);
      break;

    case "joinGroupForm":
      joinGroup(event);
      break;

    case "friendForm":
      addFriend(event);
      break;

    case "groupMessageForm":
      sendGroupMessage(event);
      break;
  }
});

/* ---------- MOBILE MENU ---------- */

$("#menuToggle")?.addEventListener("click", function () {
  sidebar?.classList.toggle("open");
});

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (!sidebar?.classList.contains("open")) {
    return;
  }

  if (
    !sidebar.contains(event.target) &&
    !event.target.closest("#menuToggle")
  ) {
    sidebar.classList.remove("open");
  }
});

/* ---------- KEYBOARD ---------- */

document.addEventListener("keydown", function (event) {
  if (
    currentPage === "chat" &&
    event.target?.id === "chatInput" &&
    event.key === "Enter" &&
    !event.shiftKey
  ) {
    event.preventDefault();

    if (!chatRequestPending) {
      $("#chatForm")?.requestSubmit();
    }
  }
});

/* ---------- INITIALISE ---------- */

function initialiseApp() {
  if (!pageContainer) {
    console.error(
      'Lunexa could not start: add id="pageContainer" to index.html.'
    );
    return;
  }

  if (state.theme === "light") {
    document.body.classList.add("light-theme");
  }

  navigateTo("chat");

  console.log("Lunexa AI is ready.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialiseApp, {
    once: true
  });
} else {
  initialiseApp();
}
