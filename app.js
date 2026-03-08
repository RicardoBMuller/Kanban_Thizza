const STORAGE_KEY = "fcc_kanban_graphite_rose_v3";

const defaultColumns = () => ({
  todo: [],
  doing: [],
  done: []
});

let state = loadState();
let currentProjectId = state.currentProjectId || null;

if (!state.projects.length) {
  const initialProject = createProjectObject("Projeto Inicial");
  state.projects.push(initialProject);
  currentProjectId = initialProject.id;
  saveState();
}

if (!currentProjectId || !state.projects.find(project => project.id === currentProjectId)) {
  currentProjectId = state.projects[0].id;
  saveState();
}

let currentModalColumn = "todo";
let editingCardId = null;
let tempChecklist = [];
let tempComments = [];
let closingTimers = new WeakMap();

const projectList = document.getElementById("projectList");
const addProjectBtn = document.getElementById("addProjectBtn");
const renameProjectBtn = document.getElementById("renameProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");
const boardTitle = document.getElementById("boardTitle");
const boardSubtitle = document.getElementById("boardSubtitle");
const searchInput = document.getElementById("searchInput");

const todoList = document.getElementById("todoList");
const doingList = document.getElementById("doingList");
const doneList = document.getElementById("doneList");

const countTodo = document.getElementById("count-todo");
const countDoing = document.getElementById("count-doing");
const countDone = document.getElementById("count-done");

const cardModalOverlay = document.getElementById("cardModalOverlay");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const saveCardBtn = document.getElementById("saveCardBtn");
const deleteCardBtn = document.getElementById("deleteCardBtn");

const cardTitleInput = document.getElementById("cardTitleInput");
const cardDescriptionInput = document.getElementById("cardDescriptionInput");
const cardResponsibleInput = document.getElementById("cardResponsibleInput");
const cardDateInput = document.getElementById("cardDateInput");
const cardLabelsInput = document.getElementById("cardLabelsInput");

const checkItemInput = document.getElementById("checkItemInput");
const addCheckItemBtn = document.getElementById("addCheckItemBtn");
const checklistEditor = document.getElementById("checklistEditor");

const commentInput = document.getElementById("commentInput");
const addCommentBtn = document.getElementById("addCommentBtn");
const commentsEditor = document.getElementById("commentsEditor");

const projectModalOverlay = document.getElementById("projectModalOverlay");
const projectNameInput = document.getElementById("projectNameInput");
const closeProjectModalBtn = document.getElementById("closeProjectModalBtn");
const cancelProjectModalBtn = document.getElementById("cancelProjectModalBtn");
const saveProjectBtn = document.getElementById("saveProjectBtn");

const addCardButtons = document.querySelectorAll("[data-add-card]");
const cardLists = {
  todo: todoList,
  doing: doingList,
  done: doneList
};

renderProjects();
renderBoard();
attachEvents();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { currentProjectId: null, projects: [] };
    const parsed = JSON.parse(raw);
    return {
      currentProjectId: parsed.currentProjectId || null,
      projects: Array.isArray(parsed.projects) ? parsed.projects : []
    };
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

function createProjectObject(name) {
  return {
    id: uid(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    columns: defaultColumns()
  };
}

function getCurrentProject() {
  return state.projects.find(project => project.id === currentProjectId);
}

function getCardById(cardId) {
  const project = getCurrentProject();
  if (!project) return null;

  for (const columnId of Object.keys(project.columns)) {
    const card = project.columns[columnId].find(item => item.id === cardId);
    if (card) return { card, columnId };
  }

  return null;
}

function attachEvents() {
  addProjectBtn.addEventListener("click", openProjectModal);
  renameProjectBtn.addEventListener("click", handleRenameProject);
  deleteProjectBtn.addEventListener("click", handleDeleteProject);
  searchInput.addEventListener("input", renderBoard);

  addCardButtons.forEach(button => {
    button.addEventListener("click", () => openModalForNewCard(button.dataset.addCard));
  });

  closeModalBtn.addEventListener("click", () => closeModal(cardModalOverlay));
  cancelModalBtn.addEventListener("click", () => closeModal(cardModalOverlay));
  saveCardBtn.addEventListener("click", handleSaveCard);
  deleteCardBtn.addEventListener("click", handleDeleteCard);

  addCheckItemBtn.addEventListener("click", addChecklistItemFromInput);
  addCommentBtn.addEventListener("click", addCommentFromInput);

  checkItemInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addChecklistItemFromInput();
    }
  });

  commentInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCommentFromInput();
    }
  });

  closeProjectModalBtn.addEventListener("click", () => closeModal(projectModalOverlay));
  cancelProjectModalBtn.addEventListener("click", () => closeModal(projectModalOverlay));
  saveProjectBtn.addEventListener("click", handleAddProjectFromModal);
  projectNameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddProjectFromModal();
    }
  });

  [cardModalOverlay, projectModalOverlay].forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (projectModalOverlay.classList.contains("showing")) closeModal(projectModalOverlay);
      if (cardModalOverlay.classList.contains("showing")) closeModal(cardModalOverlay);
    }
  });

  Object.entries(cardLists).forEach(([columnId, listEl]) => {
    listEl.addEventListener("dragover", e => {
      e.preventDefault();
      listEl.classList.add("drag-over");

      const draggingCardEl = document.querySelector(".card.dragging");
      if (!draggingCardEl) return;

      const afterElement = getDragAfterElement(listEl, e.clientY);
      if (afterElement == null) listEl.appendChild(draggingCardEl);
      else listEl.insertBefore(draggingCardEl, afterElement);
    });

    listEl.addEventListener("dragleave", () => {
      listEl.classList.remove("drag-over");
    });

    listEl.addEventListener("drop", e => {
      e.preventDefault();
      listEl.classList.remove("drag-over");
      const cardId = e.dataTransfer.getData("text/plain");
      if (!cardId) return;
      moveCardToColumnAndPosition(cardId, columnId, listEl);
    });
  });
}

function openModal(overlay) {
  clearTimeout(closingTimers.get(overlay));
  overlay.classList.remove("hidden", "closing");
  overlay.classList.add("showing");
  overlay.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    if (overlay === cardModalOverlay) cardTitleInput.focus();
    if (overlay === projectModalOverlay) projectNameInput.focus();
  });
}

function closeModal(overlay) {
  if (overlay.classList.contains("hidden") || overlay.classList.contains("closing")) return;
  overlay.classList.remove("showing");
  overlay.classList.add("closing");
  overlay.setAttribute("aria-hidden", "true");

  const timer = setTimeout(() => {
    overlay.classList.add("hidden");
    overlay.classList.remove("closing");
  }, 220);

  closingTimers.set(overlay, timer);
}

function openProjectModal() {
  projectNameInput.value = "";
  openModal(projectModalOverlay);
}

function handleAddProjectFromModal() {
  const name = projectNameInput.value.trim();
  if (!name) {
    projectNameInput.focus();
    return;
  }

  const exists = state.projects.some(
    project => project.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    alert("Já existe um projeto com esse nome.");
    projectNameInput.focus();
    return;
  }

  const newProject = createProjectObject(name);
  state.projects.push(newProject);
  currentProjectId = newProject.id;
  saveState();
  renderProjects();
  renderBoard();
  closeModal(projectModalOverlay);
}

function handleRenameProject() {
  const project = getCurrentProject();
  if (!project) return;

  const newName = prompt("Novo nome do projeto:", project.name);
  if (!newName || !newName.trim()) return;

  const exists = state.projects.some(
    p => p.id !== project.id && p.name.toLowerCase() === newName.trim().toLowerCase()
  );

  if (exists) {
    alert("Já existe outro projeto com esse nome.");
    return;
  }

  project.name = newName.trim();
  saveState();
  renderProjects();
  renderBoard();
}

function handleDeleteProject() {
  if (state.projects.length === 1) {
    alert("Você precisa manter pelo menos 1 projeto.");
    return;
  }

  const project = getCurrentProject();
  if (!project) return;

  const confirmed = confirm(`Deseja realmente excluir o projeto "${project.name}"?`);
  if (!confirmed) return;

  state.projects = state.projects.filter(p => p.id !== project.id);
  currentProjectId = state.projects[0].id;
  saveState();
  renderProjects();
  renderBoard();
}

function renderProjects() {
  const project = getCurrentProject();
  if (project) boardTitle.textContent = project.name;

  projectList.innerHTML = "";

  state.projects.forEach(projectItem => {
    const li = document.createElement("li");
    li.textContent = projectItem.name;

    if (projectItem.id === currentProjectId) li.classList.add("active");

    li.addEventListener("click", () => {
      currentProjectId = projectItem.id;
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
  boardSubtitle.textContent = `${state.projects.length} projeto(s) no total`;

  const term = searchInput.value.trim().toLowerCase();
  renderColumn("todo", project.columns.todo, todoList, term);
  renderColumn("doing", project.columns.doing, doingList, term);
  renderColumn("done", project.columns.done, doneList, term);
  updateCounts(project);
}

function renderColumn(columnId, cards, targetEl, term = "") {
  targetEl.innerHTML = "";

  const filteredCards = cards.filter(card => {
    if (!term) return true;
    const searchable = [
      card.title,
      card.description,
      card.responsible,
      ...(card.labels || []),
      ...(card.comments || []).map(c => c.text)
    ].join(" ").toLowerCase();
    return searchable.includes(term);
  });

  if (!filteredCards.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = term ? "Nenhum card encontrado." : "Nenhum card nesta coluna.";
    targetEl.appendChild(empty);
    return;
  }

  filteredCards.forEach(card => targetEl.appendChild(createCardElement(card, columnId)));
}

function updateCounts(project) {
  countTodo.textContent = project.columns.todo.length;
  countDoing.textContent = project.columns.doing.length;
  countDone.textContent = project.columns.done.length;
}

function createCardElement(card, columnId) {
  const cardEl = document.createElement("div");
  cardEl.className = "card";
  cardEl.draggable = true;
  cardEl.dataset.cardId = card.id;
  cardEl.dataset.columnId = columnId;

  const labelsHtml = (card.labels || [])
    .map(label => `<span class="label-pill">${escapeHtml(label)}</span>`)
    .join("");

  const descPreview = card.description ? escapeHtml(truncate(card.description, 110)) : "Sem descrição";
  const checklist = card.checklist || [];
  const doneCount = checklist.filter(item => item.done).length;
  const totalCount = checklist.length;
  const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const metaChips = [];
  if (card.responsible) metaChips.push(`<span class="meta-chip">👤 ${escapeHtml(card.responsible)}</span>`);
  if (card.date) metaChips.push(`<span class="meta-chip">📅 ${formatDate(card.date)}</span>`);

  cardEl.innerHTML = `
    <h4 class="card-title">${escapeHtml(card.title)}</h4>
    <p class="card-desc">${descPreview}</p>
    ${labelsHtml ? `<div class="card-labels">${labelsHtml}</div>` : ""}
    ${metaChips.length ? `<div class="card-meta">${metaChips.join("")}</div>` : ""}
    ${
      totalCount
        ? `
      <div class="card-progress">
        <div class="progress-top">
          <span>Checklist</span>
          <span>${doneCount}/${totalCount}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>`
        : ""
    }
    <div class="card-footer">
      <span class="card-comments">💬 ${(card.comments || []).length} comentário(s)</span>
      <div class="card-actions">
        <button class="card-btn" data-action="edit">Editar</button>
      </div>
    </div>
  `;

  cardEl.querySelector('[data-action="edit"]').addEventListener("click", e => {
    e.stopPropagation();
    openModalForEdit(card.id);
  });

  cardEl.addEventListener("dblclick", () => openModalForEdit(card.id));

  cardEl.addEventListener("dragstart", e => {
    cardEl.classList.add("dragging");
    e.dataTransfer.setData("text/plain", card.id);
    e.dataTransfer.effectAllowed = "move";
  });

  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("dragging");
    Object.values(cardLists).forEach(list => list.classList.remove("drag-over"));
  });

  return cardEl;
}

function openModalForNewCard(columnId) {
  currentModalColumn = columnId;
  editingCardId = null;
  tempChecklist = [];
  tempComments = [];

  modalTitle.textContent = "Novo Card";
  deleteCardBtn.classList.add("hidden");

  cardTitleInput.value = "";
  cardDescriptionInput.value = "";
  cardResponsibleInput.value = "";
  cardDateInput.value = "";
  cardLabelsInput.value = "";

  renderChecklistEditor();
  renderCommentsEditor();
  openModal(cardModalOverlay);
}

function openModalForEdit(cardId) {
  const found = getCardById(cardId);
  if (!found) return;

  const { card, columnId } = found;
  currentModalColumn = columnId;
  editingCardId = card.id;
  tempChecklist = structuredCloneSafe(card.checklist || []);
  tempComments = structuredCloneSafe(card.comments || []);

  modalTitle.textContent = "Editar Card";
  deleteCardBtn.classList.remove("hidden");

  cardTitleInput.value = card.title || "";
  cardDescriptionInput.value = card.description || "";
  cardResponsibleInput.value = card.responsible || "";
  cardDateInput.value = card.date || "";
  cardLabelsInput.value = (card.labels || []).join(", ");

  renderChecklistEditor();
  renderCommentsEditor();
  openModal(cardModalOverlay);
}

function handleSaveCard() {
  const title = cardTitleInput.value.trim();
  if (!title) {
    cardTitleInput.focus();
    return;
  }

  const found = editingCardId ? getCardById(editingCardId) : null;

  const cardData = {
    id: editingCardId || uid(),
    title,
    description: cardDescriptionInput.value.trim(),
    responsible: cardResponsibleInput.value.trim(),
    date: cardDateInput.value || "",
    labels: cardLabelsInput.value.split(",").map(item => item.trim()).filter(Boolean),
    checklist: tempChecklist,
    comments: tempComments,
    createdAt: found?.card?.createdAt || new Date().toISOString()
  };

  const project = getCurrentProject();
  if (!project) return;

  if (editingCardId && found) {
    project.columns[found.columnId] = project.columns[found.columnId].filter(c => c.id !== editingCardId);
  }

  project.columns[currentModalColumn].push(cardData);
  saveState();
  renderBoard();
  closeModal(cardModalOverlay);
}

function handleDeleteCard() {
  if (!editingCardId) return;

  const confirmed = confirm("Deseja realmente excluir este card?");
  if (!confirmed) return;

  const project = getCurrentProject();
  if (!project) return;

  const found = getCardById(editingCardId);
  if (!found) return;

  const cardEl = document.querySelector(`[data-card-id="${editingCardId}"]`);
  const removeCard = () => {
    project.columns[found.columnId] = project.columns[found.columnId].filter(card => card.id !== editingCardId);
    saveState();
    renderBoard();
    closeModal(cardModalOverlay);
  };

  if (cardEl) {
    cardEl.classList.add("removing");
    setTimeout(removeCard, 170);
  } else {
    removeCard();
  }
}

function addChecklistItemFromInput() {
  const text = checkItemInput.value.trim();
  if (!text) return;

  tempChecklist.push({ id: uid(), text, done: false });
  checkItemInput.value = "";
  renderChecklistEditor();
}

function addCommentFromInput() {
  const text = commentInput.value.trim();
  if (!text) return;

  tempComments.push({ id: uid(), text, createdAt: new Date().toISOString() });
  commentInput.value = "";
  renderCommentsEditor();
}

function renderChecklistEditor() {
  checklistEditor.innerHTML = "";

  if (!tempChecklist.length) {
    checklistEditor.innerHTML = `<li class="empty-state">Nenhum item no checklist.</li>`;
    return;
  }

  tempChecklist.forEach(item => {
    const li = document.createElement("li");
    li.className = "editable-item";
    li.innerHTML = `
      <div class="editable-item-left">
        <input type="checkbox" ${item.done ? "checked" : ""} />
        <span>${escapeHtml(item.text)}</span>
      </div>
      <button type="button">Remover</button>
    `;

    li.querySelector('input[type="checkbox"]').addEventListener("change", e => {
      item.done = e.target.checked;
    });

    li.querySelector("button").addEventListener("click", () => {
      tempChecklist = tempChecklist.filter(check => check.id !== item.id);
      renderChecklistEditor();
    });

    checklistEditor.appendChild(li);
  });
}

function renderCommentsEditor() {
  commentsEditor.innerHTML = "";

  if (!tempComments.length) {
    commentsEditor.innerHTML = `<li class="empty-state">Nenhum comentário.</li>`;
    return;
  }

  tempComments.forEach(comment => {
    const li = document.createElement("li");
    li.className = "editable-item";
    li.innerHTML = `
      <div class="editable-item-left">
        <span>${escapeHtml(comment.text)}</span>
      </div>
      <button type="button">Remover</button>
    `;

    li.querySelector("button").addEventListener("click", () => {
      tempComments = tempComments.filter(c => c.id !== comment.id);
      renderCommentsEditor();
    });

    commentsEditor.appendChild(li);
  });
}

function moveCardToColumnAndPosition(cardId, targetColumnId, targetListEl) {
  const project = getCurrentProject();
  if (!project) return;

  let draggedCard = null;
  let sourceColumnId = null;

  for (const columnId of Object.keys(project.columns)) {
    const index = project.columns[columnId].findIndex(card => card.id === cardId);
    if (index !== -1) {
      draggedCard = project.columns[columnId][index];
      sourceColumnId = columnId;
      project.columns[columnId].splice(index, 1);
      break;
    }
  }

  if (!draggedCard) return;

  const cardElementsOrder = [...targetListEl.querySelectorAll(".card")]
    .map(el => el.dataset.cardId)
    .filter(Boolean);

  const insertIndex = cardElementsOrder.indexOf(cardId);
  if (insertIndex === -1) project.columns[targetColumnId].push(draggedCard);
  else project.columns[targetColumnId].splice(insertIndex, 0, draggedCard);

  saveState();
  renderBoard();

  if (sourceColumnId !== targetColumnId) {
    boardSubtitle.textContent = `Card movido para "${columnName(targetColumnId)}"`;
    setTimeout(() => {
      const project = getCurrentProject();
      if (project) boardSubtitle.textContent = `${state.projects.length} projeto(s) no total`;
    }, 1500);
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".card:not(.dragging)")];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function columnName(columnId) {
  return { todo: "A Fazer", doing: "Em Progresso", done: "Concluído" }[columnId] || columnId;
}

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");
}

function structuredCloneSafe(data) {
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
