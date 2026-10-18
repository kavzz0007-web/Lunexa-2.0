"use strict";

/* ==========================================
   LUNEXA AI — FRONTEND APPLICATION
========================================== */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);


/* ==========================================
   STATE
========================================== */

const state = {
    currentPage: "chat",
    messages: [],
    selectedFile: null,
    toastTimer: null,
    speechTimer: null,
    savedItems: [],
    activities: []
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
    "pdf",
    "txt",
    "docx",
    "pptx"
];

const PAGE_INFO = {
    chat: {
        title: "AI Assistant",
        heading: "Your AI Study Assistant",
        description: "Chat with Luna and explore your ideas.",
        icon: "✦"
    },

    documents: {
        title: "My Documents",
        heading: "Your Study Documents",
        description: "Choose a document to prepare it for your study workflow.",
        icon: "▤"
    },

    notes: {
        title: "Smart Notes",
        heading: "Let's Create Smart Notes",
        description: "Organize topics into clear, structured study notes.",
        icon: "✎"
    },

    youtube: {
        title: "YouTube Study",
        heading: "Turn Lectures Into Study Material",
        description: "Prepare a YouTube lecture for transcript-based summarization.",
        icon: "▷"
    },

    quiz: {
        title: "Quiz & Flashcards",
        heading: "Practice Makes Progress",
        description: "Prepare a topic for quizzes and revision flashcards.",
        icon: "◎"
    },

    library: {
        title: "Study Library",
        heading: "Your Personal Study Library",
        description: "Keep track of your study material in this browser.",
        icon: "▣"
    },

    history: {
        title: "Recent Chats",
        heading: "Your Recent Conversations",
        description: "Review the conversations stored during this session.",
        icon: "◷"
    }
};


/* ==========================================
   DOM REFERENCES
========================================== */

const sidebar = $("#sidebar");
const overlay = $("#overlay");
const menuButton = $("#menuButton");
const closeSidebar = $("#closeSidebar");

const pageTitle = $("#pageTitle");
const pageContent = $("#pageContent");

const chatInput = $("#chatInput");
const sendButton = $("#sendButton");
const conversation = $("#conversation");

const assistantCharacter = $("#assistantCharacter");
const assistantSpeech = $("#assistantSpeech");
const speechTitle = $("#speechTitle");
const speechText = $("#speechText");
const characterMouth = $("#characterMouth");

const fileInput = $("#fileInput");
const attachButton = $("#attachButton");

const characterCount = $("#characterCount");
const toastElement = $("#toast");


/* ==========================================
   UTILITIES
========================================== */

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}


function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(() => {
        toastElement.classList.remove("show");
    }, 3000);
}


function closeMobileSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
}


function openMobileSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
}


function isMobile() {
    return window.matchMedia("(max-width: 760px)").matches;
}


function saveActivity(message) {
    state.activities.unshift({
        message,
        time: new Date().toLocaleString()
    });

    state.activities = state.activities.slice(0, 30);
}


function formatBytes(bytes) {
    if (bytes < 1024) {
        return bytes + " B";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


/* ==========================================
   ASSISTANT ANIMATIONS
========================================== */

function setAssistantState(mode, title, message) {
    assistantCharacter.classList.remove(
        "thinking",
        "typing",
        "success",
        "error"
    );

    if (mode && mode !== "idle") {
        assistantCharacter.classList.add(mode);
    }

    speechTitle.textContent = title;
    speechText.textContent = message;
}


function resetAssistant() {
    setAssistantState(
        "idle",
        "Hi, bestie!",
        "What are we learning today? 💙"
    );
}


function assistantThinking() {
    setAssistantState(
        "thinking",
        "Thinking...",
        "Let me organize my thoughts! ✨"
    );
}


function assistantTyping() {
    setAssistantState(
        "typing",
        "I'm listening!",
        "Tell me what you want to learn. 💙"
    );
}


/* ==========================================
   CHAT MESSAGES
========================================== */

function createMessage(role, message, fileName) {
    const wrapper = document.createElement("div");

    wrapper.className = "message " +
        (role === "user" ? "user-message" : "assistant-message");

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "K" : "L";

    const content = document.createElement("div");
    content.className = "message-content";

    const name = document.createElement("div");
    name.className = "message-name";

    if (role === "assistant") {
        name.innerHTML =
            'Luna <span class="ai-label">AI COMPANION</span>';
    } else {
        name.textContent = "You";
    }

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    bubble.textContent = message;

    if (fileName) {
        const fileChip = document.createElement("div");
        fileChip.className = "file-chip";
        fileChip.textContent = "📎 " + fileName;
        bubble.appendChild(document.createElement("br"));
        bubble.appendChild(fileChip);
    }

    content.appendChild(name);
    content.appendChild(bubble);

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    conversation.appendChild(wrapper);

    wrapper.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

    return wrapper;
}


function addUserMessage(message, fileName) {
    createMessage("user", message, fileName);

    state.messages.push({
        role: "user",
        content: message,
        fileName: fileName || null,
        time: new Date().toISOString()
    });

    saveActivity("Sent a message");
}


function addAssistantMessage(message) {
    createMessage("assistant", message);

    state.messages.push({
        role: "assistant",
        content: message,
        time: new Date().toISOString()
    });
}


/* ==========================================
   CHAT PREVIEW
========================================== */

function getPreviewResponse(message) {
    const lower = message.toLowerCase();

    if (
        lower.includes("hello") ||
        lower.includes("hi ") ||
        lower === "hi" ||
        lower.includes("hey")
    ) {
        return "Heyyy! 💙 I'm Luna, your study companion. " +
            "Our chat interface is working! Once the AI backend " +
            "is connected, I'll be able to generate real answers.";
    }

    if (lower.includes("note")) {
        return "Your Smart Notes workspace is ready! ✨ " +
            "We'll connect the AI backend to generate actual notes " +
            "from your topics and study documents.";
    }

    if (lower.includes("quiz") || lower.includes("flashcard")) {
        return "Your quiz workspace is ready! 🧠 " +
            "In the next stages, we'll connect an AI model to " +
            "generate questions, answers and flashcards.";
    }

    if (
        lower.includes("document") ||
        lower.includes("pdf") ||
        lower.includes("file")
    ) {
        return "I can see you're interested in study documents! 📚 " +
            "File selection is available in this preview. " +
            "We'll implement secure server-side text extraction next.";
    }

    return "I received your message! 💙 " +
        "The Lunexa interface is working, but real AI responses " +
        "are not connected yet. Our next stage will connect the " +
        "backend so I can answer your questions using an AI model.";
}


function sendMessage(customMessage) {
    const message = typeof customMessage === "string"
        ? customMessage.trim()
        : chatInput.value.trim();

    if (!message && !state.selectedFile) {
        showToast("Type a message or select a document first. 💙");
        chatInput.focus();
        return;
    }

    if (message.length > 5000) {
        showToast("Your message is too long.");
        return;
    }

    const fileName = state.selectedFile
        ? state.selectedFile.name
        : null;

    const userMessage = message ||
        "I selected a document: " + fileName;

    addUserMessage(userMessage, fileName);

    chatInput.value = "";
    chatInput.style.height = "auto";

    characterCount.textContent = "0 / 5000";

    state.selectedFile = null;
    fileInput.value = "";

    attachButton.textContent = "＋";
    attachButton.title = "Attach a document";

    assistantThinking();

    sendButton.disabled = true;

    window.setTimeout(() => {
        const response = getPreviewResponse(userMessage);

        addAssistantMessage(response);

        setAssistantState(
            "success",
            "There we go! ✨",
            "Your message reached the interface!"
        );

        sendButton.disabled = false;
        chatInput.focus();
    }, 800);
}


/* ==========================================
   NEW CHAT
========================================== */

function newChat() {
    conversation.innerHTML = `
        <div class="conversation-divider">
            <span>YOUR CONVERSATION</span>
        </div>
    `;

    state.messages = [];
    state.selectedFile = null;

    chatInput.value = "";
    fileInput.value = "";

    characterCount.textContent = "0 / 5000";

    setAssistantState(
        "idle",
        "Fresh start! 🦋",
        "A new conversation, a new adventure."
    );

    closeMobileSidebar();

    if (state.currentPage !== "chat") {
        navigateTo("chat");
    }

    chatInput.focus();
}


/* ==========================================
   FILE SELECTION
========================================== */

function handleFileSelection(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        showToast("Choose a PDF, TXT, DOCX or PPTX file.");
        fileInput.value = "";
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showToast("The file must be smaller than 10 MB.");
        fileInput.value = "";
        return;
    }

    if (file.size === 0) {
        showToast("This file appears to be empty.");
        fileInput.value = "";
        return;
    }

    state.selectedFile = file;

    attachButton.textContent = "✓";
    attachButton.title = file.name;

    assistantTyping();

    showToast(
        "Selected: " + file.name +
        " (" + formatBytes(file.size) + ")"
    );

    chatInput.focus();
}


/* ==========================================
   NAVIGATION
========================================== */

function navigateTo(page) {
    if (!PAGE_INFO[page]) {
        return;
    }

    state.currentPage = page;

    pageTitle.textContent = PAGE_INFO[page].title;

    $$(".nav-item").forEach((item) => {
        item.classList.toggle(
            "active",
            item.dataset.page === page
        );
    });

    closeMobileSidebar();

    if (page === "chat") {
        renderChatPage();
        return;
    }

    renderFeaturePage(page);
}


function renderChatPage() {
    pageContent.innerHTML = `
        <section class="chat-page" id="chatPage">

            <div class="welcome-section">
                <div class="welcome-badge">
                    <span>✦</span>
                    YOUR PERSONAL AI STUDY COMPANION
                </div>

                <h1>
                    Welcome back, learner!<br>
                    <span>What shall we explore today?</span>
                </h1>

                <p class="welcome-description">
                    Ask questions, explore topics and make
                    learning a little more magical.
                </p>
            </div>

            <div class="feature-panel">
                <strong>Chat workspace</strong>

                <p class="feature-hint">
                    Your previous messages remain available
                    in this session through Recent Chats.
                    Start a new conversation to clear this view.
                </p>

                <button class="primary-button" id="returnToChat">
                    Continue conversation
                </button>
            </div>

        </section>
    `;

    $("#returnToChat").addEventListener("click", () => {
        navigateTo("chat");
        showToast("You're in your chat workspace. 💙");
    });
}


/* ==========================================
   FEATURE PAGES
========================================== */

function renderFeaturePage(page) {
    const info = PAGE_INFO[page];

    let panel = "";

    if (page === "documents") {
        panel = `
            <div class="feature-panel">
                <label for="documentUpload">
                    Select a study document
                </label>

                <input
                    type="file"
                    id="documentUpload"
                    accept=".pdf,.txt,.docx,.pptx"
                >

                <p class="feature-hint">
                    Maximum file size: 10 MB.
                    Real text extraction and document Q&A
                    will be added with the backend.
                </p>

                <div class="result-box" id="documentResult" hidden></div>
            </div>
        `;
    }

    if (page === "notes") {
        panel = `
            <div class="feature-panel">
                <label for="noteTopic">What topic are you studying?</label>

                <input
                    id="noteTopic"
                    type="text"
                    maxlength="200"
                    placeholder="e.g. Machine Learning"
                >

                <label for="noteFormat">Notes format</label>

                <select id="noteFormat">
                    <option value="Exam-ready notes">Exam-ready notes</option>
                    <option value="Short summary">Short summary</option>
                    <option value="Detailed explanation">Detailed explanation</option>
                    <option value="Revision points">Revision points</option>
                </select>

                <button class="primary-button" id="createNotes">
                    Prepare notes request
                </button>

                <div class="result-box" id="notesResult" hidden></div>

                <p class="feature-hint">
                    This preview prepares your request.
                    AI-generated notes will be enabled after
                    backend integration.
                </p>
            </div>
        `;
    }

    if (page === "youtube") {
        panel = `
            <div class="feature-panel">
                <label for="youtubeUrl">YouTube video URL</label>

                <input
                    id="youtubeUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                >

                <button class="primary-button" id="prepareVideo">
                    Prepare video request
                </button>

                <div class="result-box" id="videoResult" hidden></div>

                <p class="feature-hint">
                    A video link alone does not provide its transcript.
                    We'll implement transcript retrieval and summarization
                    where access is available.
                </p>
            </div>
        `;
    }

    if (page === "quiz") {
        panel = `
            <div class="feature-panel">
                <label for="quizTopic">Quiz topic</label>

                <input
                    id="quizTopic"
                    type="text"
                    maxlength="200"
                    placeholder="Enter a topic to practice"
                >

                <label for="quizCount">Number of questions</label>

                <select id="quizCount">
                    <option value="5">5 questions</option>
                    <option value="10">10 questions</option>
                    <option value="15">15 questions</option>
                </select>

                <button class="primary-button" id="prepareQuiz">
                    Prepare quiz request
                </button>

                <div class="result-box" id="quizResult" hidden></div>

                <p class="feature-hint">
                    Real question generation and answer checking
                    will be connected to the AI backend.
                </p>
            </div>
        `;
    }

    if (page === "library") {
        const items = state.savedItems.map((item) => `
            <div class="result-box">
                <strong>${escapeHTML(item.type)}</strong>
                <p>${escapeHTML(item.title)}</p>
                <small>${escapeHTML(item.time)}</small>
            </div>
        `).join("");

        panel = items || `
            <div class="library-empty">
                <div style="font-size: 30px;">▣</div>
                <strong>Your library is waiting!</strong>
                <p>Items you save in this session will appear here.</p>
            </div>
        `;
    }

    if (page === "history") {
        const items = state.activities.map((item) => `
            <div class="result-box">
                <strong>${escapeHTML(item.message)}</strong>
                <p>${escapeHTML(item.time)}</p>
            </div>
        `).join("");

        panel = items || `
            <div class="library-empty">
                <div style="font-size: 30px;">◷</div>
                <strong>No recent activities yet.</strong>
                <p>Start chatting to see activity here.</p>
            </div>
        `;
    }

    pageContent.innerHTML = `
        <section class="feature-page">

            <div class="feature-icon">${info.icon}</div>

            <h1>${info.heading}</h1>

            <p>${info.description}</p>

            ${panel}

        </section>
    `;

    bindFeatureEvents(page);
}


/* ==========================================
   FEATURE EVENT HANDLERS
========================================== */

function bindFeatureEvents(page) {

    if (page === "documents") {
        const input = $("#documentUpload");

        input.addEventListener("change", () => {
            const file = input.files[0];

            if (!file) {
                return;
            }

            const extension = file.name
                .split(".")
                .pop()
                .toLowerCase();

            const result = $("#documentResult");

            result.hidden = false;

            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                result.textContent =
                    "Unsupported file type. Choose PDF, TXT, DOCX or PPTX.";

                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                result.textContent =
                    "This file is too large. Maximum size is 10 MB.";

                return;
            }

            result.textContent =
                "Selected: " + file.name +
                " (" + formatBytes(file.size) + "). " +
                "The file is selected locally. Server-side text " +
                "extraction is not implemented yet.";

            saveActivity("Selected a study document");

            showToast("Document selected successfully. 💙");
        });
    }


    if (page === "notes") {
        $("#createNotes").addEventListener("click", () => {
            const topic = $("#noteTopic").value.trim();
            const format = $("#noteFormat").value;

            const result = $("#notesResult");

            result.hidden = false;

            if (!topic) {
                result.textContent = "Please enter a study topic.";
                return;
            }

            result.textContent =
                "Notes request prepared!\n\n" +
                "Topic: " + topic + "\n" +
                "Format: " + format + "\n\n" +
                "AI generation will be connected in Stage 2.";

            state.savedItems.push({
                type: "Notes request",
                title: topic + " — " + format,
                time: new Date().toLocaleString()
            });

            saveActivity("Prepared a notes request");

            setAssistantState(
                "success",
                "Great choice! ✨",
                "Let's make your notes easy to revise."
            );

            showToast("Notes request prepared.");
        });
    }


    if (page === "youtube") {
        $("#prepareVideo").addEventListener("click", () => {
            const url = $("#youtubeUrl").value.trim();
            const result = $("#videoResult");

            result.hidden = false;

            let parsedUrl;

            try {
                parsedUrl = new URL(url);
            } catch {
                result.textContent = "Please enter a valid YouTube URL.";
                return;
            }

            const hostname = parsedUrl.hostname
                .toLowerCase()
                .replace(/^www\./, "")
                .replace(/^m\./, "");

            const validHost = [
                "youtube.com",
                "youtu.be",
                "music.youtube.com"
            ].includes(hostname);

            if (!validHost) {
                result.textContent =
                    "Please enter a YouTube video URL.";
                return;
            }

            let videoId = "";

            if (hostname === "youtu.be") {
                videoId = parsedUrl.pathname
                    .split("/")
                    .filter(Boolean)[0] || "";
            } else if (parsedUrl.pathname === "/watch") {
                videoId = parsedUrl.searchParams.get("v") || "";
            } else {
                const parts = parsedUrl.pathname.split("/")
                    .filter(Boolean);

                if (
                    ["embed", "shorts", "live"].includes(parts[0])
                ) {
                    videoId = parts[1] || "";
                }
            }

            if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                result.textContent =
                    "We couldn't identify a valid video ID in that URL.";
                return;
            }

            result.textContent =
                "Video link accepted!\n\n" +
                "Video ID: " + videoId + "\n\n" +
                "Next step: retrieve an accessible transcript " +
                "and send it for summarization.";

            state.savedItems.push({
                type: "YouTube request",
                title: url,
                time: new Date().toLocaleString()
            });

            saveActivity("Prepared a YouTube study request");

            setAssistantState(
                "success",
                "Video found! 🎬",
                "Let's prepare your lecture for studying."
            );

            showToast("YouTube link accepted.");
        });
    }


    if (page === "quiz") {
        $("#prepareQuiz").addEventListener("click", () => {
            const topic = $("#quizTopic").value.trim();
            const count = $("#quizCount").value;

            const result = $("#quizResult");

            result.hidden = false;

            if (!topic) {
                result.textContent = "Please enter a quiz topic.";
                return;
            }

            result.textContent =
                "Quiz request prepared!\n\n" +
                "Topic: " + topic + "\n" +
                "Questions requested: " + count + "\n\n" +
                "Actual quiz generation will be implemented " +
                "after connecting the AI backend.";

            state.savedItems.push({
                type: "Quiz request",
                title: topic + " — " + count + " questions",
                time: new Date().toLocaleString()
            });

            saveActivity("Prepared a quiz request");

            setAssistantState(
                "success",
                "You got this! 💙",
                "Every question is a chance to learn."
            );

            showToast("Quiz request prepared.");
        });
    }
}


/* ==========================================
   EVENT LISTENERS
========================================== */

sendButton.addEventListener("click", () => {
    sendMessage();
});


chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";

    chatInput.style.height =
        Math.min(chatInput.scrollHeight, 140) + "px";

    characterCount.textContent =
        chatInput.value.length + " / 5000";

    if (chatInput.value.trim()) {
        assistantTyping();
    } else {
        resetAssistant();
    }
});


chatInput.addEventListener("keydown", (event) => {
    if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
    ) {
        event.preventDefault();
        sendMessage();
    }
});


attachButton.addEventListener("click", () => {
    fileInput.click();
});


fileInput.addEventListener("change", handleFileSelection);


$("#newChat").addEventListener("click", newChat);


menuButton.addEventListener("click", openMobileSidebar);


closeSidebar.addEventListener("click", closeMobileSidebar);


overlay.addEventListener("click", closeMobileSidebar);


$("#themeButton").addEventListener("click", () => {
    document.body.classList.toggle("light-theme");

    const isLight = document.body.classList.contains("light-theme");

    $("#themeButton").textContent = isLight ? "☾" : "☼";

    showToast(
        isLight
            ? "Light theme enabled."
            : "Dark theme enabled. 🌙"
    );
});


$$(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
        navigateTo(item.dataset.page);
    });
});


$$(".quick-card").forEach((card) => {
    card.addEventListener("click", () => {
        navigateTo("chat");

        const prompt = card.dataset.prompt;

        chatInput.value = prompt;

        chatInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        chatInput.focus();

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });
    });
});


/* Keyboard escape closes the mobile menu */

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeMobileSidebar();
    }
});


/* ==========================================
   INITIALIZATION
========================================== */

function initializeApp() {
    navigateTo("chat");

    resetAssistant();

    saveActivity("Opened Lunexa AI");

    console.log("Lunexa AI frontend initialized successfully.");
}

initializeApp();
