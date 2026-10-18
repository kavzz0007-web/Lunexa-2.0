"use strict";

/* =========================================
   LUNEXA AI - APPLICATION
   Frontend demo with local storage
========================================= */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const STORAGE_KEY = "lunexa_app_v2";

const pageContainer = $("#pageContainer");
const pageHeading = $("#pageHeading");
const sidebar = $("#sidebar");
const toastElement = $("#toast");

let toastTimer = null;
let currentPage = "chat";
let selectedFile = null;
let activeQuiz = 0;
let quizAnswered = false;


/* ---------- SAFE STORAGE ---------- */

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
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return defaults;

    const parsed = JSON.parse(saved);

    return {
      ...defaults,
      ...parsed
    };
  } catch (error) {
    console.error("Could not load saved data:", error);
    return defaults;
  }
}

const state = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);

    showToast(
      "Storage is full. Try removing large documents."
    );

    return false;
  }
}


/* ---------- HELPERS ---------- */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[char];
  });
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function showToast(message) {
  if (!toastElement) return;

  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(function () {
    toastElement.classList.remove("show");
  }, 2600);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function setBuddyMessage(message) {
  const speech = $("#buddySpeech");
  const description = $("#buddyDescription");

  if (speech) speech.textContent = message;
  if (description) description.textContent = message;
}

function setBuddyForPage(page) {
  const messages = {
    chat: "Hey bestie! Ask me anything. 💙",
    notes: "Let's turn your ideas into beautiful notes! 📝",
    documents: "Let's organise your study materials! 📚",
    youtube: "Ready to learn from your favourite lectures? 🎬",
    quiz: "Time to test what you've learned! 🎯",
    groups: "Studying together makes learning fun! 💙",
    friends: "Invite your friends and learn together! ♡",
    history: "Your previous study sessions are right here. ✨"
  };

  setBuddyMessage(messages[page] || messages.chat);
}


/* ---------- NAVIGATION ---------- */

const pageNames = {
  chat: "AI Chat",
  notes: "Study Notes",
  documents: "Documents",
  youtube: "YouTube Study",
  quiz: "Quiz & Flashcards",
  groups: "Group Study",
  friends: "Friends",
  history: "Chat History"
};

function navigateTo(page) {
  if (!Object.prototype.hasOwnProperty.call(pageNames, page)) {
    showToast("This page is not available.");
    return;
  }

  currentPage = page;

  if (pageHeading) {
    pageHeading.textContent = pageNames[page];
  }

  document.querySelectorAll(".nav-item").forEach(function (item) {
    item.classList.toggle(
      "active",
      item.dataset.page === page
    );
  });

  if (sidebar) sidebar.classList.remove("open");

  renderPage();
  setBuddyForPage(page);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderPage() {
  if (!pageContainer) return;

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
  const messagesHTML = state.messages.map(function (message) {
    return `
      <div class="message ${message.role === "user" ? "user" : "assistant"}">
        <span class="message-label">
          ${message.role === "user" ? "You" : "Lunexa"}
        </span>
        ${escapeHTML(message.text)}
      </div>
    `;
  }).join("");

  return `
    <div class="chat-layout">

      <div class="chat-welcome">
        <div class="eyebrow">YOUR PERSONAL STUDY COMPANION</div>

        <h1>
          Hey there! 👋<br>
          What are we learning
          <span class="gradient-text">today?</span>
        </h1>

        <p>
          I'm Lunexa, your study buddy. Explore new concepts,
          organise your notes, and make studying easier.
        </p>

        <div class="feature-grid">

          <button class="feature-card" data-action="prompt"
                  data-prompt="Explain machine learning in simple words.">
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
            <small>Create a group and invite friends.</small>
          </button>

        </div>
      </div>

      <div class="chat-messages" id="chatMessages">
        ${messagesHTML}
      </div>

      <form class="chat-composer" id="chatForm">

        <textarea
          id="chatInput"
          rows="1"
          maxlength="4000"
          placeholder="Ask Lunexa anything..."
          aria-label="Your message"
          required
        ></textarea>

        <button class="send-button" type="submit"
                aria-label="Send message">➤</button>

      </form>

      <div class="chat-footnote">
        Lunexa currently uses demo replies. Connect an AI backend
        for real AI-generated answers.
      </div>

    </div>
  `;
}

function getDemoReply(message) {
  const text = message.toLowerCase();

  if (text.includes("hello") || text.includes("hi ")) {
    return "Hey bestie! 💙 What would you like to learn today?";
  }

  if (text.includes("machine learning")) {
    return [
      "🧠 Machine Learning — Simple Explanation",
      "",
      "Machine Learning (ML) is a branch of AI that helps computers learn patterns from data.",
      "",
      "Example: An email app can learn to identify spam by examining examples of spam and normal emails.",
      "",
      "Main types:",
      "1. Supervised learning — learns from labelled examples.",
      "2. Unsupervised learning — discovers patterns in data.",
      "3. Reinforcement learning — learns through rewards and penalties.",
      "",
      "Exam tip: Include a definition, types, and one real-life example."
    ].join("\n");
  }

  if (text.includes("study plan")) {
    return [
      "📚 Your sample study plan",
      "",
      "1. Study for 25 minutes.",
      "2. Take a 5-minute break.",
      "3. Revise the important points.",
      "4. Practise five questions.",
      "5. Review what you learned before sleeping.",
      "",
      "Tell me your subjects and available time to customise this plan."
    ].join("\n");
  }

  if (text.includes("note")) {
    return "📝 Let's create your study notes! Open Study Notes from the sidebar, enter your topic, and save your notes. I can provide demo guidance until the real AI backend is connected.";
  }

  if (text.includes("quiz")) {
    return "🎯 Ready to practise? Open Quiz & Flashcards from the sidebar to try the sample interactive quiz.";
  }

  return [
    "Hey bestie! 💙",
    "",
    "I received your message:",
    '"' + message + '"',
    "",
    "This version is running in demo mode, so I can't generate a real AI answer yet.",
    "",
    "You can still explore Study Notes, Documents, YouTube Study, Quizzes, and Group Study.",
    "",
    "Our next backend step will connect Lunexa to an AI model for real answers."
  ].join("\n");
}

function addMessage(role, text) {
  state.messages.push({
    id: makeId(),
    role: role,
    text: text,
    createdAt: new Date().toISOString()
  });

  if (state.messages.length > 100) {
    state.messages = state.messages.slice(-100);
  }

  saveData();
}

function sendChatMessage(text) {
  const message = String(text || "").trim();

  if (!message) {
    showToast("Please type a message first.");
    return;
  }

  addMessage("user", message);
  addMessage("assistant", getDemoReply(message));

  renderPage();
  setBuddyMessage("Nice question! Keep being curious. 💙");

  const input = $("#chatInput");

  if (input) input.focus();
}

function startNewChat() {
  if (state.messages.length) {
    state.chats.unshift({
      id: makeId(),
      title: state.messages.find(function (m) {
        return m.role === "user";
      })?.text.slice(0, 55) || "Study session",
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


/* ---------- STUDY NOTES ---------- */

function renderNotesPage() {
  const list = state.notes.map(function (note) {
    return `
      <div class="list-item">
        <div class="list-icon">📝</div>

        <div class="list-item-content">
          <strong>${escapeHTML(note.title)}</strong>
          <small>${escapeHTML(note.content.slice(0, 130))}</small>
          <small>Saved ${formatDate(note.createdAt)}</small>
        </div>

        <button class="action-button danger"
                data-action="delete-note"
                data-id="${escapeHTML(note.id)}">
          Delete
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">Study <span class="gradient-text">Notes</span></h1>
    <p class="page-subtitle">
      Capture your ideas and keep your study material organised.
    </p>

    <div class="card">
      <form id="noteForm" class="form-stack">

        <label class="form-label">
          Note title
          <input class="field" id="noteTitle"
                 maxlength="120"
                 placeholder="Example: Machine Learning Basics"
                 required>
        </label>

        <label class="form-label">
          Your notes
          <textarea class="textarea-field" id="noteContent"
                    maxlength="20000"
                    placeholder="Write your study notes here..."
                    required></textarea>
        </label>

        <button class="action-button primary" type="submit">
          ＋ Save Notes
        </button>

      </form>
    </div>

    <h2 class="section-title">Your saved notes (${state.notes.length})</h2>

    <div class="list-stack">
      ${list || '<div class="empty-state">📝<br>No notes yet.<br>Create your first study note above!</div>'}
    </div>
  `;
}

function saveNote(event) {
  event.preventDefault();

  const title = $("#noteTitle")?.value.trim();
  const content = $("#noteContent")?.value.trim();

  if (!title || !content) {
    showToast("Please enter a title and notes.");
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
  showToast("Your notes have been saved! 💙");
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
  const list = state.documents.map(function (file) {
    return `
      <div class="list-item">
        <div class="list-icon">📄</div>

        <div class="list-item-content">
          <strong>${escapeHTML(file.name)}</strong>
          <small>${escapeHTML(file.size)} · ${formatDate(file.createdAt)}</small>
        </div>

        <button class="action-button danger"
                data-action="delete-document"
                data-id="${escapeHTML(file.id)}">
          Remove
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">My <span class="gradient-text">Documents</span></h1>
    <p class="page-subtitle">
      Select your study files and keep track of them here.
    </p>

    <div class="card">
      <form id="documentForm" class="form-stack">

        <label class="form-label">
          Choose a document
          <input class="field" type="file" id="documentInput"
                 accept=".pdf,.txt,.docx,.pptx">
        </label>

        <p class="small-text muted">
          Supported formats: PDF, TXT, DOCX and PPTX. Maximum 10 MB per file.
        </p>

        <button class="action-button primary" type="submit">
          ＋ Add Document
        </button>

      </form>
    </div>

    <h2 class="section-title">Your documents (${state.documents.length})</h2>

    <div class="list-stack">
      ${list || '<div class="empty-state">📂<br>No documents added yet.</div>'}
    </div>

    <p class="small-text muted">
      This demo saves document names only. Actual document reading and AI analysis require a backend.
    </p>
  `;
}

function saveDocument(event) {
  event.preventDefault();

  const input = $("#documentInput");
  const file = input?.files?.[0];

  if (!file) {
    showToast("Choose a file first.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast("File must be smaller than 10 MB.");
    return;
  }

  const allowed = ["pdf", "txt", "docx", "pptx"];
  const extension = file.name.split(".").pop().toLowerCase();

  if (!allowed.includes(extension)) {
    showToast("That file format is not supported.");
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

  showToast("Document added to your list. 📚");
}

function deleteDocument(id) {
  state.documents = state.documents.filter(function (file) {
    return file.id !== id;
  });

  saveData();
  renderPage();
  showToast("Document removed.");
}


/* ---------- YOUTUBE STUDY ---------- */

function isValidYouTubeURL(value) {
  try {
    const url = new URL(value);

    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    const validHost = [
      "youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtu.be"
    ].includes(host);

    if (!validHost) return false;

    if (host === "youtu.be") {
      return url.pathname.length > 1;
    }

    return (
      url.pathname === "/watch" && Boolean(url.searchParams.get("v"))
    ) || /^\/(embed|shorts|live)\/[^/]+/.test(url.pathname);

  } catch (error) {
    return false;
  }
}

function renderYoutubePage() {
  const list = state.videos.map(function (video) {
    return `
      <div class="list-item">
        <div class="list-icon">▶️</div>

        <div class="list-item-content">
          <strong>${escapeHTML(video.title)}</strong>
          <small>${escapeHTML(video.url)}</small>
          <small>Added ${formatDate(video.createdAt)}</small>
        </div>

        <button class="action-button danger"
                data-action="delete-video"
                data-id="${escapeHTML(video.id)}">
          Remove
        </button>
      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">YouTube <span class="gradient-text">Study</span></h1>
    <p class="page-subtitle">
      Organise lecture links for your study sessions.
    </p>

    <div class="card">
      <form id="youtubeForm" class="form-stack">

        <label class="form-label">
          Lecture title
          <input class="field" id="videoTitle"
                 maxlength="150"
                 placeholder="Example: Java Programming Lecture 1"
                 required>
        </label>

        <label class="form-label">
          YouTube link
          <input class="field" id="videoURL"
                 type="url"
                 placeholder="https://www.youtube.com/watch?v=..."
                 required>
        </label>

        <button class="action-button primary" type="submit">
          ＋ Save Lecture
        </button>

      </form>
    </div>

    <h2 class="section-title">Saved lectures (${state.videos.length})</h2>

    <div class="list-stack">
      ${list || '<div class="empty-state">🎬<br>No lectures saved yet.</div>'}
    </div>

    <p class="small-text muted">
      Transcript extraction and automatic notes are not enabled in this frontend demo.
    </p>
  `;
}

function saveVideo(event) {
  event.preventDefault();

  const title = $("#videoTitle")?.value.trim();
  const url = $("#videoURL")?.value.trim();

  if (!title || !url) {
    showToast("Enter a title and YouTube link.");
    return;
  }

  if (!isValidYouTubeURL(url)) {
    showToast("Please enter a valid YouTube video link.");
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
  const groups = state.groups.map(function (group) {
    return `
      <div class="list-item">

        <div class="list-icon">👥</div>

        <div class="list-item-content">
          <strong>${escapeHTML(group.name)}</strong>
          <small>${escapeHTML(group.subject)} · ${group.members.length} member(s)</small>
          <small>Invite code: ${escapeHTML(group.code)}</small>
        </div>

        <div class="button-row">
          <button class="action-button"
                  data-action="copy-invite"
                  data-id="${escapeHTML(group.id)}">
            Invite
          </button>

          <button class="action-button"
                  data-action="open-group"
                  data-id="${escapeHTML(group.id)}">
            Open
          </button>
        </div>

      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">Group <span class="gradient-text">Study</span></h1>

    <p class="page-subtitle">
      Create a study group, invite friends, and organise your learning together.
    </p>

    <div class="card">
      <h3>✨ Create a new study group</h3>

      <p class="small-text">
        Start a group for your classmates, a subject, or an exam.
      </p>

      <form id="groupForm" class="form-stack">

        <label class="form-label">
          Group name
          <input class="field" id="groupName"
                 maxlength="80"
                 placeholder="Example: AI & Data Science Squad"
                 required>
        </label>

        <label class="form-label">
          Subject
          <input class="field" id="groupSubject"
                 maxlength="100"
                 placeholder="Example: Machine Learning"
                 required>
        </label>

        <label class="form-label">
          Study goal
          <textarea class="textarea-field" id="groupGoal"
                    maxlength="1000"
                    placeholder="What will your group study?"></textarea>
        </label>

        <button class="action-button primary" type="submit">
          ＋ Create Study Group
        </button>

      </form>
    </div>

    <h2 class="section-title">Your groups (${state.groups.length})</h2>

    <div class="list-stack">
      ${groups || '<div class="empty-state">👥<br>You have no study groups yet.<br>Create your first group above!</div>'}
    </div>

    <div class="card" style="margin-top:20px">
      <h3>🔗 Join with an invite code</h3>

      <p class="small-text">
        Enter a code from a group invitation. In this frontend demo,
        codes work only for groups saved in this browser.
      </p>

      <form id="joinGroupForm" class="form-stack">
        <label class="form-label">
          Invite code
          <input class="field" id="inviteCode"
                 maxlength="30"
                 placeholder="Enter invite code"
                 required>
        </label>

        <button class="action-button" type="submit">
          Join Group
        </button>
      </form>
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

  const code = "LNX-" +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 5).toUpperCase();

  const group = {
    id: makeId(),
    name: name,
    subject: subject,
    goal: goal,
    code: code,
    members: ["You"],
    messages: [],
    createdAt: new Date().toISOString()
  };

  state.groups.unshift(group);

  saveData();
  renderPage();

  setBuddyMessage("Your study group is ready! Invite your friends. 💙");
  showToast("Study group created successfully!");
}

function createInviteMessage(group) {
  return [
    "💙 You're invited to study with me on Lunexa AI!",
    "",
    "📚 Group: " + group.name,
    "📖 Subject: " + group.subject,
    group.goal ? "🎯 Goal: " + group.goal : "",
    "",
    "🔑 Invite code: " + group.code,
    "",
    "Open Lunexa AI and use Group Study to join.",
    "",
    "Note: This is a demo invite. Online joining requires a shared backend."
  ].filter(Boolean).join("\n");
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");

      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";

      document.body.appendChild(area);
      area.select();

      const success = document.execCommand("copy");

      area.remove();

      if (!success) throw new Error("Copy failed");
    }

    showToast("Invitation copied! Share it with your friends. 💙");

  } catch (error) {
    window.prompt("Copy this invitation:", text);
  }
}

function inviteGroup(id) {
  const group = state.groups.find(function (item) {
    return item.id === id;
  });

  if (!group) {
    showToast("Group not found.");
    return;
  }

  const message = createInviteMessage(group);

  if (navigator.share) {
    navigator.share({
      title: "Lunexa AI Study Group",
      text: message
    }).then(function () {
      showToast("Invitation shared!");
    }).catch(function (error) {
      if (error.name !== "AbortError") {
        copyText(message);
      }
    });

  } else {
    copyText(message);
  }
}

function joinGroup(event) {
  event.preventDefault();

  const code = $("#inviteCode")?.value.trim().toUpperCase();

  if (!code) {
    showToast("Enter an invite code.");
    return;
  }

  const group = state.groups.find(function (item) {
    return item.code.toUpperCase() === code;
  });

  if (!group) {
    showToast(
      "Group not found in this browser. Online group joining needs a backend."
    );
    return;
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

  currentPage = "groups";

  pageHeading.textContent = group.name;

  document.querySelectorAll(".nav-item").forEach(function (item) {
    item.classList.toggle(
      "active",
      item.dataset.page === "groups"
    );
  });

  if (sidebar) sidebar.classList.remove("open");

  const messagesHTML = group.messages.map(function (message) {
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
      ${escapeHTML(group.subject)} · ${group.members.length} member(s)
    </p>

    <div class="card">
      <h3>🎯 Study goal</h3>
      <p>${escapeHTML(group.goal || "Learn together and support each other.")}</p>

      <div class="button-row">
        <button class="action-button primary"
                data-action="copy-invite"
                data-id="${escapeHTML(group.id)}">
          🔗 Invite Friends
        </button>

        <button class="action-button"
                data-action="delete-group"
                data-id="${escapeHTML(group.id)}">
          Delete Group
        </button>
      </div>
    </div>

    <h2 class="section-title">Group discussion</h2>

    <div class="list-stack" style="margin-bottom:20px">
      ${messagesHTML || '<div class="empty-state">💬<br>No messages yet.<br>Start the discussion below.</div>'}
    </div>

    <div class="card">
      <form id="groupMessageForm" class="form-stack">

        <label class="form-label">
          Write a message
          <textarea class="textarea-field" id="groupMessage"
                    maxlength="2000"
                    placeholder="Share a question or study tip..."
                    required></textarea>
        </label>

        <button class="action-button primary" type="submit">
          Send Message
        </button>

      </form>

      <p class="small-text muted">
        Demo messages are saved in this browser only.
        Other users cannot see them until online accounts and a backend are added.
      </p>
    </div>
  `;

  setBuddyMessage("Let's make this group study session productive! 💙");
}

function sendGroupMessage(event) {
  event.preventDefault();

  const group = state.groups.find(function (item) {
    return pageHeading.textContent === item.name;
  });

  if (!group) {
    showToast("Open a group before sending a message.");
    return;
  }

  const input = $("#groupMessage");
  const text = input?.value.trim();

  if (!text) {
    showToast("Write a message first.");
    return;
  }

  group.messages.push({
    id: makeId(),
    author: "You",
    text: text,
    createdAt: new Date().toISOString()
  });

  saveData();
  openGroup(group.id);

  showToast("Message added to the demo discussion.");
}

function deleteGroup(id) {
  const group = state.groups.find(function (item) {
    return item.id === id;
  });

  if (!group) return;

  if (!window.confirm("Delete this study group?")) return;

  state.groups = state.groups.filter(function (item) {
    return item.id !== id;
  });

  saveData();
  navigateTo("groups");
  showToast("Study group deleted.");
}


/* ---------- FRIENDS ---------- */

function renderFriendsPage() {
  const friendsHTML = state.friends.map(function (friend) {
    return `
      <div class="list-item">

        <div class="profile-avatar">
          ${escapeHTML(friend.name.charAt(0).toUpperCase())}
        </div>

        <div class="list-item-content">
          <strong>${escapeHTML(friend.name)}</strong>
          <small>${escapeHTML(friend.email || "Lunexa study friend")}</small>
        </div>

        <button class="action-button danger"
                data-action="remove-friend"
                data-id="${escapeHTML(friend.id)}">
          Remove
        </button>

      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">Study <span class="gradient-text">Friends</span></h1>

    <p class="page-subtitle">
      Create your study circle and keep your learning organised.
    </p>

    <div class="card">
      <h3>♡ Add a friend</h3>

      <p class="small-text">
        Save a friend's name and email in your local study list.
      </p>

      <form id="friendForm" class="form-stack">

        <label class="form-label">
          Friend's name
          <input class="field" id="friendName"
                 maxlength="80"
                 placeholder="Enter their name"
                 required>
        </label>

        <label class="form-label">
          Email (optional)
          <input class="field" id="friendEmail"
                 type="email"
                 maxlength="150"
                 placeholder="friend@example.com">
        </label>

        <button class="action-button primary" type="submit">
          ＋ Add Friend
        </button>

      </form>
    </div>

    <h2 class="section-title">My friends (${state.friends.length})</h2>

    <div class="list-stack">
      ${friendsHTML || '<div class="empty-state">♡<br>Your study circle starts here.<br>Add a friend above!</div>'}
    </div>

    <div class="card" style="margin-top:20px">
      <h3>🔗 Invite a friend to Lunexa</h3>

      <p class="small-text">
        Share an invitation so your friend can learn about Lunexa AI.
      </p>

      <button class="action-button primary"
              data-action="share-lunexa">
        Share Lunexa Invite
      </button>
    </div>
  `;
}

function addFriend(event) {
  event.preventDefault();

  const name = $("#friendName")?.value.trim();
  const email = $("#friendEmail")?.value.trim();

  if (!name) {
    showToast("Enter your friend's name.");
    return;
  }

  if (email && state.friends.some(function (friend) {
    return friend.email.toLowerCase() === email.toLowerCase();
  })) {
    showToast("This friend is already in your list.");
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

  showToast("Friend added to your study list! 💙");
}

function removeFriend(id) {
  state.friends = state.friends.filter(function (friend) {
    return friend.id !== id;
  });

  saveData();
  renderPage();
  showToast("Friend removed.");
}

function shareLunexa() {
  const text = [
    "💙 Let's study together!",
    "",
    "I'm organising my study sessions with Lunexa AI.",
    "Create a study group, save notes, and practise quizzes together!",
    "",
    "Join me on Lunexa AI."
  ].join("\n");

  if (navigator.share) {
    navigator.share({
      title: "Lunexa AI",
      text: text,
      url: window.location.href
    }).catch(function (error) {
      if (error.name !== "AbortError") {
        copyText(text + "\n" + window.location.href);
      }
    });
  } else {
    copyText(text + "\n" + window.location.href);
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
    question: "What is the main purpose of HTML?",
    options: [
      "Store passwords",
      "Train neural networks",
      "Structure web pages",
      "Manage operating systems"
    ],
    answer: 2,
    explanation: "HTML defines the structure and content of a web page."
  }
];

function renderQuizPage() {
  const question = quizQuestions[activeQuiz];

  if (!question) {
    activeQuiz = 0;
    return renderQuizPage();
  }

  const optionsHTML = question.options.map(function (option, index) {
    return `
      <button class="quiz-option"
              data-action="answer-quiz"
              data-answer="${index}">
        ${String.fromCharCode(65 + index)}. ${escapeHTML(option)}
      </button>
    `;
  }).join("");

  return `
    <h1 class="page-heading">Quiz & <span class="gradient-text">Flashcards</span></h1>

    <p class="page-subtitle">
      Practise with this sample quiz. More subjects can be added later.
    </p>

    <div class="card">
      <p class="eyebrow">QUESTION ${activeQuiz + 1} OF ${quizQuestions.length}</p>

      <h3>${escapeHTML(question.question)}</h3>

      <div id="quizOptions">
        ${optionsHTML}
      </div>

      <div id="quizFeedback"></div>

      <button class="action-button primary"
              id="nextQuestion"
              data-action="next-quiz"
              style="display:none;margin-top:15px">
        Next Question →
      </button>
    </div>

    <div class="card" style="margin-top:18px">
      <h3>🃏 Flashcards</h3>

      <p>Use this card to remember an important concept.</p>

      <button class="action-button"
              data-action="flip-card"
              data-state="question">
        Show flashcard answer
      </button>

      <p id="flashcardContent" class="feedback">
        Question: What is AI?
      </p>
    </div>
  `;
}

function answerQuiz(answer) {
  if (quizAnswered) return;

  const question = quizQuestions[activeQuiz];
  const feedback = $("#quizFeedback");

  if (!question || !feedback) return;

  quizAnswered = true;

  const correct = Number(answer) === question.answer;

  const buttons = document.querySelectorAll(".quiz-option");

  buttons.forEach(function (button, index) {
    button.disabled = true;

    if (index === question.answer) {
      button.classList.add("correct");
    } else if (index === Number(answer)) {
      button.classList.add("incorrect");
    }
  });

  feedback.innerHTML = `
    <div class="feedback">
      ${correct ? "✅ Correct!" : "💡 Not quite!"}
      ${escapeHTML(question.explanation)}
    </div>
  `;

  const nextButton = $("#nextQuestion");

  if (nextButton) {
    nextButton.style.display = "inline-flex";
    nextButton.textContent =
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

  if (activeQuiz === quizQuestions.length - 1) {
    activeQuiz = 0;
  } else {
    activeQuiz++;
  }

  quizAnswered = false;
  renderPage();
}

function flipFlashcard(button) {
  const content = $("#flashcardContent");

  if (!content) return;

  const showingQuestion = button.dataset.state === "question";

  if (showingQuestion) {
    content.textContent =
      "Answer: AI stands for Artificial Intelligence. It enables computers to perform tasks that usually require human intelligence.";

    button.dataset.state = "answer";
    button.textContent = "Show question ↻";

  } else {
    content.textContent = "Question: What is AI?";

    button.dataset.state = "question";
    button.textContent = "Show flashcard answer";
  }
}


/* ---------- CHAT HISTORY ---------- */

function renderHistoryPage() {
  const historyHTML = state.chats.map(function (chat) {
    return `
      <div class="list-item">

        <div class="list-icon">◷</div>

        <div class="list-item-content">
          <strong>${escapeHTML(chat.title)}</strong>
          <small>${formatDate(chat.createdAt)}</small>
          <small>${chat.messages.length} messages</small>
        </div>

        <button class="action-button"
                data-action="restore-chat"
                data-id="${escapeHTML(chat.id)}">
          Open
        </button>

      </div>
    `;
  }).join("");

  return `
    <h1 class="page-heading">Chat <span class="gradient-text">History</span></h1>

    <p class="page-subtitle">
      Revisit your saved study conversations.
    </p>

    <div class="list-stack">
      ${historyHTML || '<div class="empty-state">◷<br>No previous chats yet.<br>Start a chat and create a new session to save it here.</div>'}
    </div>

    <button class="action-button primary"
            data-action="new-chat"
            style="margin-top:20px">
      ＋ Start New Chat
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

  state.messages = chat.messages.slice();

  saveData();
  navigateTo("chat");

  showToast("Previous chat restored.");
}


/* ---------- EVENT DELEGATION ---------- */

/*
  Important:
  These listeners are attached to stable elements.
  Replacing pageContainer.innerHTML will not remove them.
*/

document.addEventListener("click", function (event) {
  const pageButton = event.target.closest("[data-page]");

  if (pageButton) {
    event.preventDefault();
    navigateTo(pageButton.dataset.page);
    return;
  }

  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) return;

  const action = actionButton.dataset.action;
  const id = actionButton.dataset.id;

  switch (action) {

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
      sendChatMessage(actionButton.dataset.prompt || "");
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

    case "share-lunexa":
      shareLunexa();
      break;

    case "remove-friend":
      removeFriend(id);
      break;

    case "answer-quiz":
      answerQuiz(actionButton.dataset.answer);
      break;

    case "next-quiz":
      nextQuiz();
      break;

    case "flip-card":
      flipFlashcard(actionButton);
      break;

    case "restore-chat":
      restoreChat(id);
      break;
  }
});


/* ---------- FORM SUBMISSION ---------- */

document.addEventListener("submit", function (event) {
  const form = event.target;

  switch (form.id) {

    case "chatForm":
      event.preventDefault();

      sendChatMessage($("#chatInput")?.value || "");
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

const menuToggle = $("#menuToggle");

if (menuToggle) {
  menuToggle.addEventListener("click", function () {
    sidebar?.classList.toggle("open");
  });
}

document.addEventListener("click", function (event) {
  if (!sidebar || !sidebar.classList.contains("open")) return;

  if (
    !sidebar.contains(event.target) &&
    !event.target.closest("#menuToggle")
  ) {
    sidebar.classList.remove("open");
  }
});


/* ---------- KEYBOARD SHORTCUT ---------- */

document.addEventListener("keydown", function (event) {
  if (
    currentPage === "chat" &&
    event.key === "Enter" &&
    !event.shiftKey &&
    event.target?.id === "chatInput"
  ) {
    event.preventDefault();

    const form = $("#chatForm");

    if (form && typeof form.requestSubmit === "function") {
      form.requestSubmit();
    }
  }
});


/* ---------- INITIALISE ---------- */

function initialiseApp() {
  if (state.theme === "light") {
    document.body.classList.add("light-theme");
  }

  navigateTo("chat");

  console.log("Lunexa AI initialised successfully.");
}

initialiseApp();
