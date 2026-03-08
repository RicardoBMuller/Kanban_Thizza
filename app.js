const STORAGE_KEY = "kanban_fcc_pro_v5";
const THEME_KEY = "kanban_fcc_theme";

const defaultColumns = () => ({
  todo: [],
  doing: [],
  done: []
});

let state = loadState();
let currentProjectId = state.currentProjectId || null;

if (!state.projects.length) {
  const initialProject = createProject("Projeto Inicial");
  state.projects.push(initialProject);
  currentProjectId = initialProject.id;
  saveState();
}

if (!currentProjectId || !state.projects.find((p) => p.id === currentProjectId)) {
  currentProjectId = state.projects[0].id;
  saveState();
}

let currentEditingCardId = null;
let currentTargetColumn = "todo";
let projectModalMode = "create";
let tempChecklist = [];
let tempComments = [];

// DOM
const projectList = document.getElementById("projectList");
const searchInput = document.getElementById("searchInput");
const boardTitle = document.getElementById("boardTitle");
const projectCount = document.getElementById("projectCount");

const countTodo = document.getElementById("count-todo");
const countDoing = document.getElementById("count-doing");
const countDone = document.getElementById("count-done");

const newProjectBtn = document.getElementById("newProjectBtn");
const renameProjectBtn = document.getElementById("renameProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");

const lightBtn = document.getElementById("lightBtn");
const darkBtn = document.getElementById("darkBtn");

// Modal projeto
const projectModalOverlay = document.getElementById("projectModalOverlay");
const projectModalTitle = document.getElementById("projectModalTitle");
const projectNameInput = document.getElementById("projectNameInput");
const closeProjectModalBtn = document.getElementById("closeProjectModalBtn");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const saveProjectBtn = document.getElementById("saveProjectBtn");

// Modal edição do card
const cardModalOverlay = document.getElementById("cardModalOverlay");
const cardModalTitle = document.getElementById("cardModalTitle");
const closeCardModalBtn = document.getElementById("closeCardModalBtn");
const cancelCardBtn = document.getElementById("cancelCardBtn");
const saveCardBtn = document.getElementById("saveCardBtn");
const deleteCardBtn = document.getElementById("deleteCardBtn");

const cardTitleInput = document.getElementById("cardTitleInput");
const cardDescInput = document.getElementById("cardDescInput");
const cardOwnerInput = document.getElementById("cardOwnerInput");
const cardDateInput = document.getElementById("cardDateInput");
const cardLabelsInput = document.getElementById("cardLabelsInput");

const newChecklistItemInput = document.getElementById("newChecklistItemInput");
const addChecklistItemBtn = document.getElementById("addChecklistItemBtn");
const editChecklistList = document.getElementById("editChecklistList");

const newCommentInput = document.getElementById("newCommentInput");
const addCommentBtn = document.getElementById("addCommentBtn");
const editCommentsList = document.getElementById("editCommentsList");

// Modal visualização
const viewCardModalOverlay = document.getElementById("viewCardModalOverlay");
const viewCardTitle = document.getElementById("viewCardTitle");
const viewCardOwner = document.getElementById("viewCardOwner");
const viewCardDate = document.getElementById("viewCardDate");
const viewCardColumn = document.getElementById("viewCardColumn");
const viewCardDescription = document.getElementById("viewCardDescription");
const viewCardLabels = document.getElementById("viewCardLabels");
const viewChecklistCounter = document.getElementById("viewChecklistCounter");
const viewChecklistProgress = document.getElementById("viewChecklistProgress");
const viewChecklistList = document.getElementById("viewChecklistList");
const viewCommentsCounter = document.getElementById("viewCommentsCounter");
const viewCommentsList = document.getElementById("viewCommentsList");
const closeViewCardModalBtn = document.getElementById("closeViewCardModalBtn");
const closeViewCardFooterBtn = document.getElementById("closeViewCardFooterBtn");
const viewEditCardBtn = document.getElementById("viewEditCardBtn");

const addCardButtons = document.querySelectorAll(".add-card-btn");
const columnEls = document.querySelectorAll(".column");

init();

function init() {
  migrateOldData();
  applySavedTheme();
  renderProjects();
  renderBoard();
  bindEvents();
}

function bindEvents() {
  newProjectBtn.addEventListener("click", () => openProjectModal("create"));
  renameProjectBtn.addEventListener("click", () => openProjectModal("rename"));
  deleteProjectBtn.addEventListener("click", handleDeleteProject);

  closeProjectModalBtn.addEventListener("click", closeProjectModal);
  cancelProjectBtn.addEventListener("click", closeProjectModal);
  saveProjectBtn.addEventListener("click", handleSaveProject);

  closeCardModalBtn.addEventListener("click", closeCardModal);
  cancelCardBtn.addEventListener("click", closeCardModal);
  saveCardBtn.addEventListener("click", handleSaveCard);
  deleteCardBtn.addEventListener("click", handleDeleteCard);

  closeViewCardModalBtn.addEventListener("click", closeViewCardModal);
  closeViewCardFooterBtn.addEventListener("click", closeViewCardModal);

  addChecklistItemBtn.addEventListener("click", handleAddChecklistItem);
  addCommentBtn.addEventListener("click", handleAddComment);

  newChecklistItemInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddChecklistItem();
    }
  });

  newCommentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddComment();
    }
  });

  searchInput.addEventListener("input", renderBoard);

  lightBtn.addEventListener("click", () => setTheme("light"));
  darkBtn.addEventListener("click", () => setTheme("dark"));

  addCardButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const col = button.closest(".column").dataset.col;
      openCardModal("create", col);
    });
  });

  projectModalOverlay.addEventListener("click", (e) => {
    if (e.target === projectModalOverlay) closeProjectModal();
  });

  cardModalOverlay.addEventListener("click", (e) => {
    if (e.target === cardModalOverlay) closeCardModal();
  });

  viewCardModalOverlay.addEventListener("click", (e) => {
    if (e.target === viewCardModalOverlay) closeViewCardModal();
  });

  viewEditCardBtn.addEventListener("click", () => {
    const cardId = viewEditCardBtn.dataset.cardId;
    if (!cardId) return;

    const found = findCard(cardId);
    if (!found) return;

    closeViewCardModal();
    setTimeout(() => openCardModal("edit", found.columnId, cardId), 140);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProjectModal();
      closeCardModal();
      closeViewCardModal();
    }
  });

  columnEls.forEach((column) => {
    const cardsContainer = column.querySelector(".cards");

    cardsContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      cardsContainer.classList.add("drag-over");

      const draggingCard = document.querySelector(".card.dragging");
      if (!draggingCard) return;

      const afterElement = getDragAfterElement(cardsContainer, e.clientY);
      if (afterElement == null) {
        cardsContainer.appendChild(draggingCard);
      } else {
        cardsContainer.insertBefore(draggingCard, afterElement);
      }
    });

    cardsContainer.addEventListener("dragleave", () => {
      cardsContainer.classList.remove("drag-over");
    });

    cardsContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      cardsContainer.classList.remove("drag-over");

      const draggedCardId = e.dataTransfer.getData("text/plain");
      if (!draggedCardId) return;

      const targetCol = column.dataset.col;
      moveCardToColumnAtPosition(draggedCardId, targetCol, cardsContainer);
    });
  });
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { currentProjectId: null, projects: [] };
    }
    return JSON.parse(saved);
  } catch {
    return { currentProjectId: null, projects: [] };
  }
}

function saveState() {
  state.currentProjectId = currentProjectId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createProject(name) {
  return {
    id: uid(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    columns: defaultColumns()
  };
}

function getCurrentProject() {
  return state.projects.find((project) => project.id === currentProjectId);
}

function migrateOldData() {
  state.projects.forEach((project) => {
    Object.keys(project.columns).forEach((columnId) => {
      project.columns[columnId] = project.columns[columnId].map((card) => ({
        id: card.id || uid(),
        title: card.title || "Sem título",
        description: card.description || "",
        owner: card.owner || "",
        date: card.date || "",
        labels: Array.isArray(card.labels) ? card.labels : [],
        checklist: Array.isArray(card.checklist) ? card.checklist : [],
        comments: Array.isArray(card.comments) ? card.comments : [],
        createdAt: card.createdAt || new Date().toISOString()
      }));
    });
  });
  saveState();
}

function renderProjects() {
  projectList.innerHTML = "";

  state.projects.forEach((project) => {
    const li = document.createElement("li");
    li.textContent = project.name;

    if (project.id === currentProjectId) {
      li.classList.add("active");
    }

    li.addEventListener("click", () => {
      currentProjectId = project.id;
      saveState();
      renderProjects();
      renderBoard();
    });

    projectList.appendChild(li);
  });
}

function renderBoard() {
  const project = getCurrentProject();
  if (!project) return;

  boardTitle.textContent = project.name;
  projectCount.textContent = `${state.projects.length} projeto(s) no total`;

  renderColumn("todo", project.columns.todo);
  renderColumn("doing", project.columns.doing);
  renderColumn("done", project.columns.done);

  countTodo.textContent = project.columns.todo.length;
  countDoing.textContent = project.columns.doing.length;
  countDone.textContent = project.columns.done.length;
}

function renderColumn(columnId, cards) {
  const container = document.querySelector(`.column[data-col="${columnId}"] .cards`);
  container.innerHTML = "";

  const query = searchInput.value.trim().toLowerCase();

  const filtered = cards.filter((card) => {
    if (!query) return true;

    const searchText = [
      card.title,
      card.description,
      card.owner,
      ...(card.labels || []),
      ...(card.comments || []).map((c) => c.text),
      ...(card.checklist || []).map((i) => i.text)
    ].join(" ").toLowerCase();

    return searchText.includes(query);
  });

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = query ? "Nenhum card encontrado." : "Nenhum card nesta coluna.";
    container.appendChild(empty);
    return;
  }

  filtered.forEach((card) => {
    const cardEl = document.createElement("article");
    cardEl.className = "card";
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;

    const labelsHtml = (card.labels || [])
      .filter(Boolean)
      .map((label) => `<span class="label">${escapeHtml(label)}</span>`)
      .join("");

    const meta = [];
    if (card.owner) meta.push(`<span class="meta-chip">👤 ${escapeHtml(card.owner)}</span>`);
    if (card.date) meta.push(`<span class="meta-chip">Prazo: ${formatDate(card.date)}</span>`);

    const checklist = card.checklist || [];
    const doneItems = checklist.filter((item) => item.done).length;
    const checklistPercent = checklist.length ? Math.round((doneItems / checklist.length) * 100) : 0;

    const checklistPreviewHtml = checklist.length
      ? `
        <div class="card-checklist">
          <div class="card-checklist-title">
            <span>Checklist</span>
            <span>${doneItems}/${checklist.length}</span>
          </div>
          <div class="card-checklist-items">
            ${checklist.slice(0, 3).map((item) => `
              <div class="card-check-item ${item.done ? "done" : ""}">
                <span class="card-check-bullet"></span>
                <span>${escapeHtml(item.text)}</span>
              </div>
            `).join("")}
          </div>
          <div class="card-progress">
            <div class="card-progress-fill" style="width:${checklistPercent}%"></div>
          </div>
        </div>
      `
      : "";

    const commentsCount = (card.comments || []).length;

    cardEl.innerHTML = `
      <h4 class="card-title">${escapeHtml(card.title || "Sem título")}</h4>
      <p class="card-desc">${escapeHtml(truncate(card.description || "Sem descrição.", 140))}</p>
      ${labelsHtml ? `<div class="card-labels">${labelsHtml}</div>` : ""}
      ${meta.length ? `<div class="card-meta">${meta.join("")}</div>` : ""}
      ${checklistPreviewHtml}
      <div class="card-comments-row">
        <span class="card-comments-info">💬 ${commentsCount} comentário(s)</span>
        <div class="card-actions">
          <button class="btn btn-soft btn-sm edit-card-btn" type="button">Editar</button>
        </div>
      </div>
    `;

    cardEl.addEventListener("click", (e) => {
      const clickedEditButton = e.target.closest(".edit-card-btn");
      if (clickedEditButton) return;
      openViewCardModal(card.id);
    });

    const editBtn = cardEl.querySelector(".edit-card-btn");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCardModal("edit", columnId, card.id);
    });

    cardEl.addEventListener("dragstart", (e) => {
      cardEl.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.id);
      e.dataTransfer.effectAllowed = "move";
    });

    cardEl.addEventListener("dragend", () => {
      cardEl.classList.remove("dragging");
      document.querySelectorAll(".cards").forEach((el) => el.classList.remove("drag-over"));
    });

    container.appendChild(cardEl);
  });
}

function openProjectModal(mode) {
  projectModalMode = mode;

  if (mode === "create") {
    projectModalTitle.textContent = "Novo Projeto";
    projectNameInput.value = "";
  } else {
    const project = getCurrentProject();
    if (!project) return;
    projectModalTitle.textContent = "Renomear Projeto";
    projectNameInput.value = project.name;
  }

  openModal(projectModalOverlay);

  setTimeout(() => {
    projectNameInput.focus();
    projectNameInput.select();
  }, 90);
}

function closeProjectModal() {
  closeModal(projectModalOverlay);
}

function handleSaveProject() {
  const name = projectNameInput.value.trim();
  if (!name) {
    alert("Digite um nome para o projeto.");
    projectNameInput.focus();
    return;
  }

  if (projectModalMode === "create") {
    const exists = state.projects.some(
      (project) => project.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      alert("Já existe um projeto com esse nome.");
      return;
    }

    const newProject = createProject(name);
    state.projects.push(newProject);
    currentProjectId = newProject.id;
  } else {
    const currentProject = getCurrentProject();
    if (!currentProject) return;

    const exists = state.projects.some(
      (project) =>
        project.id !== currentProject.id &&
        project.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      alert("Já existe outro projeto com esse nome.");
      return;
    }

    currentProject.name = name;
  }

  saveState();
  renderProjects();
  renderBoard();
  closeProjectModal();
}

function handleDeleteProject() {
  if (state.projects.length <= 1) {
    alert("Você precisa manter pelo menos 1 projeto.");
    return;
  }

  const project = getCurrentProject();
  if (!project) return;

  const ok = confirm(`Deseja excluir o projeto "${project.name}"?`);
  if (!ok) return;

  state.projects = state.projects.filter((p) => p.id !== project.id);
  currentProjectId = state.projects[0].id;
  saveState();
  renderProjects();
  renderBoard();
}

function openCardModal(mode, columnId, cardId = null) {
  currentTargetColumn = columnId;
  currentEditingCardId = null;
  tempChecklist = [];
  tempComments = [];

  if (mode === "create") {
    cardModalTitle.textContent = "Novo Card";
    deleteCardBtn.classList.add("hidden");

    cardTitleInput.value = "";
    cardDescInput.value = "";
    cardOwnerInput.value = "";
    cardDateInput.value = "";
    cardLabelsInput.value = "";
  } else {
    const found = findCard(cardId);
    if (!found) return;

    currentEditingCardId = cardId;
    currentTargetColumn = found.columnId;
    deleteCardBtn.classList.remove("hidden");
    cardModalTitle.textContent = "Editar Card";

    cardTitleInput.value = found.card.title || "";
    cardDescInput.value = found.card.description || "";
    cardOwnerInput.value = found.card.owner || "";
    cardDateInput.value = found.card.date || "";
    cardLabelsInput.value = (found.card.labels || []).join(", ");
    tempChecklist = clone(found.card.checklist || []);
    tempComments = clone(found.card.comments || []);
  }

  renderEditChecklist();
  renderEditComments();
  openModal(cardModalOverlay);

  setTimeout(() => {
    cardTitleInput.focus();
    cardTitleInput.select();
  }, 90);
}

function closeCardModal() {
  closeModal(cardModalOverlay);
}

function handleSaveCard() {
  const title = cardTitleInput.value.trim();
  if (!title) {
    alert("Digite um título para o card.");
    cardTitleInput.focus();
    return;
  }

  const project = getCurrentProject();
  if (!project) return;

  const cardData = {
    id: currentEditingCardId || uid(),
    title,
    description: cardDescInput.value.trim(),
    owner: cardOwnerInput.value.trim(),
    date: cardDateInput.value,
    labels: cardLabelsInput.value
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean),
    checklist: clone(tempChecklist),
    comments: clone(tempComments),
    createdAt: currentEditingCardId ? (findCard(currentEditingCardId)?.card.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (currentEditingCardId) {
    const found = findCard(currentEditingCardId);
    if (!found) return;

    project.columns[found.columnId] = project.columns[found.columnId].filter(
      (card) => card.id !== currentEditingCardId
    );
    project.columns[currentTargetColumn].push(cardData);
  } else {
    project.columns[currentTargetColumn].push(cardData);
  }

  saveState();
  renderBoard();
  closeCardModal();
}

function handleDeleteCard() {
  if (!currentEditingCardId) return;

  const ok = confirm("Deseja excluir este card?");
  if (!ok) return;

  const project = getCurrentProject();
  if (!project) return;

  const found = findCard(currentEditingCardId);
  if (!found) return;

  project.columns[found.columnId] = project.columns[found.columnId].filter(
    (card) => card.id !== currentEditingCardId
  );

  saveState();
  renderBoard();
  closeCardModal();
}

function handleAddChecklistItem() {
  const text = newChecklistItemInput.value.trim();
  if (!text) return;

  tempChecklist.push({
    id: uid(),
    text,
    done: false
  });

  newChecklistItemInput.value = "";
  renderEditChecklist();
}

function handleAddComment() {
  const text = newCommentInput.value.trim();
  if (!text) return;

  tempComments.push({
    id: uid(),
    text,
    createdAt: new Date().toISOString()
  });

  newCommentInput.value = "";
  renderEditComments();
}

function renderEditChecklist() {
  editChecklistList.innerHTML = "";

  if (!tempChecklist.length) {
    editChecklistList.innerHTML = `<div class="empty-state">Nenhum item no checklist.</div>`;
    return;
  }

  tempChecklist.forEach((item) => {
    const row = document.createElement("div");
    row.className = "edit-item";

    row.innerHTML = `
      <div class="edit-item-left">
        <input type="checkbox" ${item.done ? "checked" : ""} />
        <span>${escapeHtml(item.text)}</span>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>
    `;

    const checkbox = row.querySelector('input[type="checkbox"]');
    const removeBtn = row.querySelector("button");

    checkbox.addEventListener("change", () => {
      item.done = checkbox.checked;
    });

    removeBtn.addEventListener("click", () => {
      tempChecklist = tempChecklist.filter((check) => check.id !== item.id);
      renderEditChecklist();
    });

    editChecklistList.appendChild(row);
  });
}

function renderEditComments() {
  editCommentsList.innerHTML = "";

  if (!tempComments.length) {
    editCommentsList.innerHTML = `<div class="empty-state">Nenhum comentário.</div>`;
    return;
  }

  tempComments.forEach((comment) => {
    const row = document.createElement("div");
    row.className = "edit-item";

    row.innerHTML = `
      <div class="edit-item-left">
        <span>${escapeHtml(comment.text)}</span>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      tempComments = tempComments.filter((c) => c.id !== comment.id);
      renderEditComments();
    });

    editCommentsList.appendChild(row);
  });
}

function openViewCardModal(cardId) {
  const found = findCard(cardId);
  if (!found) return;

  const { card, columnId } = found;

  viewCardTitle.textContent = card.title || "Sem título";
  viewCardDescription.textContent = card.description || "Sem descrição.";
  viewCardColumn.textContent = `Coluna: ${columnLabel(columnId)}`;

  if (card.owner) {
    viewCardOwner.textContent = `👤 ${card.owner}`;
    viewCardOwner.classList.remove("hidden");
  } else {
    viewCardOwner.classList.add("hidden");
  }

  if (card.date) {
    viewCardDate.textContent = `Prazo: ${formatDate(card.date)}`;
    viewCardDate.classList.remove("hidden");
  } else {
    viewCardDate.classList.add("hidden");
  }

  viewCardLabels.innerHTML = "";
  if ((card.labels || []).length) {
    card.labels.forEach((label) => {
      const span = document.createElement("span");
      span.className = "label";
      span.textContent = label;
      viewCardLabels.appendChild(span);
    });
  } else {
    viewCardLabels.innerHTML = `<div class="empty-state">Nenhuma label.</div>`;
  }

  const checklist = card.checklist || [];
  const doneItems = checklist.filter((item) => item.done).length;
  const percent = checklist.length ? Math.round((doneItems / checklist.length) * 100) : 0;

  viewChecklistCounter.textContent = `${doneItems}/${checklist.length}`;
  viewChecklistProgress.style.width = `${percent}%`;
  viewChecklistList.innerHTML = "";

  if (checklist.length) {
    checklist.forEach((item) => {
      const row = document.createElement("div");
      row.className = `view-check-item ${item.done ? "done" : ""}`;
      row.innerHTML = `
        <span class="view-check-bullet"></span>
        <span>${escapeHtml(item.text)}</span>
      `;
      viewChecklistList.appendChild(row);
    });
  } else {
    viewChecklistList.innerHTML = `<div class="empty-state">Nenhum item no checklist.</div>`;
  }

  const comments = card.comments || [];
  viewCommentsCounter.textContent = `${comments.length}`;
  viewCommentsList.innerHTML = "";

  if (comments.length) {
    comments.forEach((comment) => {
      const row = document.createElement("div");
      row.className = "view-comment-item";
      row.innerHTML = `
        <div>${escapeHtml(comment.text)}</div>
        <div class="view-comment-meta">${formatDateTime(comment.createdAt)}</div>
      `;
      viewCommentsList.appendChild(row);
    });
  } else {
    viewCommentsList.innerHTML = `<div class="empty-state">Nenhum comentário.</div>`;
  }

  viewEditCardBtn.dataset.cardId = card.id;
  openModal(viewCardModalOverlay);
}

function closeViewCardModal() {
  closeModal(viewCardModalOverlay);
}

function findCard(cardId) {
  const project = getCurrentProject();
  if (!project) return null;

  for (const columnId of Object.keys(project.columns)) {
    const card = project.columns[columnId].find((item) => item.id === cardId);
    if (card) {
      return { card, columnId };
    }
  }

  return null;
}

function moveCardToColumnAtPosition(cardId, targetColumnId, targetContainer) {
  const project = getCurrentProject();
  if (!project) return;

  let draggedCard = null;

  for (const columnId of Object.keys(project.columns)) {
    const index = project.columns[columnId].findIndex((card) => card.id === cardId);
    if (index !== -1) {
      draggedCard = project.columns[columnId].splice(index, 1)[0];
      break;
    }
  }

  if (!draggedCard) return;

  const orderedIds = [...targetContainer.querySelectorAll(".card")]
    .map((el) => el.dataset.cardId)
    .filter(Boolean);

  const insertIndex = orderedIds.indexOf(cardId);

  if (insertIndex === -1) {
    project.columns[targetColumnId].push(draggedCard);
  } else {
    project.columns[targetColumnId].splice(insertIndex, 0, draggedCard);
  }

  saveState();
  renderBoard();
}

function getDragAfterElement(container, mouseY) {
  const draggableCards = [...container.querySelectorAll(".card:not(.dragging)")];

  return draggableCards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = mouseY - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }

      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function openModal(overlay) {
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
}

function closeModal(overlay) {
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  updateThemeButtons(theme);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButtons(savedTheme);
}

function updateThemeButtons(theme) {
  lightBtn.classList.toggle("active", theme === "light");
  darkBtn.classList.toggle("active", theme === "dark");
}

function columnLabel(columnId) {
  const map = {
    todo: "A Fazer",
    doing: "Em Progresso",
    done: "Concluído"
  };
  return map[columnId] || columnId;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("pt-BR");
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
