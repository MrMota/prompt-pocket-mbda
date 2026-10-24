"use strict";

const STORAGE_KEY = "prompt-pocket-v1";

const promptList = document.getElementById("promptList");
const promptCount = document.getElementById("promptCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const favoritesButton = document.getElementById("favoritesButton");
const editorDialog = document.getElementById("editorDialog");
const promptForm = document.getElementById("promptForm");
const titleInput = document.getElementById("titleInput");
const categoryInput = document.getElementById("categoryInput");
const bodyInput = document.getElementById("bodyInput");
const toast = document.getElementById("toast");

let prompts = loadPrompts();
let editingId = null;
let favoritesOnly = false;
let toastTimer;

function loadPrompts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidPrompt) : [];
  } catch {
    return [];
  }
}

function isValidPrompt(item) {
  return item &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.category === "string" &&
    typeof item.body === "string";
}

function savePrompts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch {
    showToast("Could not save. Your browser storage may be full.");
  }
}

function makeId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function openEditor(prompt = null) {
  editingId = prompt ? prompt.id : null;
  document.getElementById("dialogTitle").textContent =
    prompt ? "Edit prompt" : "Add a prompt";

  titleInput.value = prompt?.title || "";
  bodyInput.value = prompt?.body || "";
  categoryInput.value = prompt?.category || "Image";

  editorDialog.showModal();
  setTimeout(() => (prompt ? bodyInput : titleInput).focus(), 50);
}

function closeEditor() {
  editorDialog.close();
  promptForm.reset();
  editingId = null;
}

function createActionButton(label, action, className = "small-button") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  const visible = prompts
    .filter(prompt => {
      const matchesText =
        prompt.title.toLowerCase().includes(query) ||
        prompt.body.toLowerCase().includes(query) ||
        prompt.category.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "all" || prompt.category === selectedCategory;

      return matchesText &&
        matchesCategory &&
        (!favoritesOnly || prompt.favorite);
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  promptCount.textContent =
    `${visible.length} ${visible.length === 1 ? "prompt" : "prompts"}`;
  promptList.replaceChildren();

  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = prompts.length === 0
      ? "No prompts yet. Tap “Add prompt” to save your first one."
      : "No prompts match your search or filters.";
    promptList.appendChild(empty);
    return;
  }

  for (const prompt of visible) {
    const card = document.createElement("article");
    card.className = "prompt-card";

    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = prompt.category;

    const top = document.createElement("div");
    top.className = "card-top";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = prompt.title || "Untitled prompt";

    top.append(title);

    const text = document.createElement("p");
    text.className = "prompt-text";
    text.textContent = prompt.body;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    actions.appendChild(createActionButton("Copy", () => copyPrompt(prompt.body)));
    actions.appendChild(createActionButton("Edit", () => openEditor(prompt)));
    actions.appendChild(createActionButton("Delete", () => deletePrompt(prompt.id)));

    const favorite = createActionButton(
      prompt.favorite ? "★ Favorite" : "☆ Favorite",
      () => toggleFavorite(prompt.id),
      "small-button favorite-button"
    );
    favorite.setAttribute("aria-pressed", String(Boolean(prompt.favorite)));
    actions.appendChild(favorite);

    card.append(badge, top, text, actions);
    promptList.appendChild(card);
  }
}

promptForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!body) {
    showToast("Please enter the prompt text.");
    return;
  }

  if (editingId) {
    const existing = prompts.find(prompt => prompt.id === editingId);
    if (existing) {
      existing.title = title;
      existing.category = categoryInput.value;
      existing.body = body;
      existing.updatedAt = Date.now();
    }
    showToast("Prompt updated.");
  } else {
    prompts.unshift({
      id: makeId(),
      title,
      category: categoryInput.value,
      body,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    showToast("Prompt saved.");
  }

  savePrompts();
  closeEditor();
  render();
});

function deletePrompt(id) {
  const prompt = prompts.find(item => item.id === id);
  if (!prompt) return;

  if (!window.confirm(`Delete “${prompt.title || "Untitled prompt"}”?`)) return;

  prompts = prompts.filter(item => item.id !== id);
  savePrompts();
  render();
  showToast("Prompt deleted.");
}

function toggleFavorite(id) {
  const prompt = prompts.find(item => item.id === id);
  if (!prompt) return;

  prompt.favorite = !prompt.favorite;
  prompt.updatedAt = Date.now();
  savePrompts();
  render();
}

async function copyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Prompt copied.");
  } catch {
    const temporary = document.createElement("textarea");
    temporary.value = text;
    temporary.style.position = "fixed";
    temporary.style.opacity = "0";
    document.body.appendChild(temporary);
    temporary.select();

    const copied = document.execCommand("copy");
    temporary.remove();
    showToast(copied ? "Prompt copied." : "Could not copy the prompt.");
  }
}

document.getElementById("addButton").addEventListener("click", () => openEditor());
document.getElementById("closeDialog").addEventListener("click", closeEditor);
document.getElementById("cancelButton").addEventListener("click", closeEditor);

editorDialog.addEventListener("click", event => {
  if (event.target === editorDialog) closeEditor();
});

searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);

favoritesButton.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  favoritesButton.setAttribute("aria-pressed", String(favoritesOnly));
  favoritesButton.textContent = favoritesOnly ? "★ Favorites" : "☆ Favorites";
  render();
});

document.getElementById("exportButton").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(prompts, null, 2)], {
    type: "application/json"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "prompt-pocket-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Backup downloaded.");
});

const importFile = document.getElementById("importFile");

document.getElementById("importButton").addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error("Expected a list of prompts.");

    const imported = parsed
      .filter(item => item && typeof item.body === "string")
      .map(item => ({
        id: makeId(),
        title: typeof item.title === "string" ? item.title : "",
        category: typeof item.category === "string" ? item.category : "Other",
        body: item.body,
        favorite: Boolean(item.favorite),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));

    if (imported.length === 0) throw new Error("No valid prompts found.");

    if (window.confirm(`Import ${imported.length} prompts? They will be added to your library.`)) {
      prompts = [...imported, ...prompts];
      savePrompts();
      render();
      showToast(`${imported.length} prompts imported.`);
    }
  } catch (error) {
    showToast(`Import failed: ${error.message}`);
  }

  importFile.value = "";
});

render();

// A service worker needs HTTPS or localhost. It may not work in every editor preview.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.log("Service worker registration failed:", error);
    });
  });
}

// Show an install button on browsers that provide the install prompt.
let installPrompt = null;
const installButton = document.getElementById("installButton");

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.classList.remove("hidden");
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.classList.add("hidden");
});
