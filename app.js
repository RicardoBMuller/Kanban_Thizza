document.addEventListener("DOMContentLoaded", () => {
const SUPABASE_URL = "https://ymskzxssjnvhsqhymzbq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltc2t6eHNzam52aHNxaHltemJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTAyMzYsImV4cCI6MjA4ODY2NjIzNn0.nsXZ62padaByJNZqJogVyUxW8hqD0oxzl70p2D4sfOs";

const STORAGE_KEY = "kanban_fcc_pro_v5";
const THEME_KEY = "kanban_fcc_theme";
const SIDEBAR_KEY = "kanban_fcc_sidebar_collapsed";
const LOGIN_WELCOME_PENDING_KEY = "kanban_login_welcome_pending";

const defaultColumns = () => ({
  todo: [],
  doing: [],
  done: []
});

let state = loadState();
let currentProjectId = state.currentProjectId || null;

if (currentProjectId && !state.projects.find((p) => p.id === currentProjectId)) {
  currentProjectId = state.projects[0]?.id || null;
  saveState();
}

let currentEditingCardId = null;
let currentTargetColumn = "todo";
let projectModalMode = "create";
let tempChecklist = [];
let tempComments = [];
const modalCloseTimers = new WeakMap();

let supabase = null;
let authUser = null;
let profileRecord = null;
let tempParticipants = [];
let participantSearchResults = [];
let suspendCloudSync = false;
let cloudSyncTimer = null;
let isSyncingCloud = false;

// DOM
const projectList = document.getElementById("projectList");
const searchInput = document.getElementById("searchInput");
const boardTitle = document.getElementById("boardTitle");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const appShell = document.querySelector(".app-shell");
const mainArea = document.querySelector(".main-area");
const dashTotalCards = document.getElementById("dashTotalCards");
const dashCompletedCards = document.getElementById("dashCompletedCards");
const dashOverdueCards = document.getElementById("dashOverdueCards");
const dashChecklistDone = document.getElementById("dashChecklistDone");
const projectCount = document.getElementById("projectCount");

const countTodo = document.getElementById("count-todo");
const countDoing = document.getElementById("count-doing");
const countDone = document.getElementById("count-done");

const newProjectBtn = document.getElementById("newProjectBtn");
const renameProjectBtn = document.getElementById("renameProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");

const lightBtn = document.getElementById("lightBtn");
const darkBtn = document.getElementById("darkBtn");

const loginOpenBtn = document.getElementById("loginOpenBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const brandUserName = document.getElementById("brandUserName");
const brandAvatar = document.getElementById("brandAvatar");
const brandMark = document.getElementById("brandMark");
const authModalOverlay = document.getElementById("authModalOverlay");
const closeAuthModalBtn = document.getElementById("closeAuthModalBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const authConfigHint = document.getElementById("authConfigHint");
const profileModalOverlay = document.getElementById("profileModalOverlay");
const closeProfileModalBtn = document.getElementById("closeProfileModalBtn");
const closeProfileFooterBtn = document.getElementById("closeProfileFooterBtn");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileAvatar = document.getElementById("profileAvatar");
const profileAvatarFallback = document.getElementById("profileAvatarFallback");
const profilePhoneInput = document.getElementById("profilePhoneInput");
const profileSectorInput = document.getElementById("profileSectorInput");
const profileBioInput = document.getElementById("profileBioInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const projectActionsMenu = document.getElementById("projectActionsMenu");
const projectActionRenameBtn = document.getElementById("projectActionRenameBtn");
const projectActionDeleteBtn = document.getElementById("projectActionDeleteBtn");
let projectActionsOpen = false;

function on(el, eventName, handler) {
  if (el) el.addEventListener(eventName, handler);
}

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
const cardParticipantsInput = document.getElementById("cardParticipantsInput");
const cardCheckParticipantBtn = document.getElementById("cardCheckParticipantBtn");
const participantSearchResultsEl = document.getElementById("participantSearchResults");
const selectedParticipantsList = document.getElementById("selectedParticipantsList");

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
const viewCardParticipants = document.getElementById("viewCardParticipants");
const viewParticipantsCounter = document.getElementById("viewParticipantsCounter");
const viewNewCommentInput = document.getElementById("viewNewCommentInput");
const viewAddCommentBtn = document.getElementById("viewAddCommentBtn");
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

function requireAuth(actionLabel = "continuar") {
  if (authUser) return true;
  alert(`Faça login com Google para ${actionLabel}.`);
  openAuthModal();
  return false;
}

function updateCreationAccess() {
  const canCreateProjects = Boolean(authUser);
  const hasProject = Boolean(getCurrentProject());

  newProjectBtn.disabled = !canCreateProjects;
  newProjectBtn.title = canCreateProjects ? "Criar projeto" : "Faça login com Google para criar projetos";

  addCardButtons.forEach((button) => {
    const canCreateCards = Boolean(authUser && hasProject);
    button.disabled = !canCreateCards;
    button.title = canCreateCards ? "Criar card" : "Faça login com Google e selecione/crie um projeto";
  });
}

async function init() {
  migrateOldData();
  applySavedTheme();
  applySavedSidebar();
  renderProjects();
  renderBoard();
  bindEvents();
  await initAuth();
  runIntroSplash();
}

function hasPendingLoginWelcome() {
  try {
    return sessionStorage.getItem(LOGIN_WELCOME_PENDING_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function runIntroSplash() {
  const splash = document.getElementById("introSplash");
  if (!splash) return;

  requestAnimationFrame(() => {
    document.body.classList.add("is-app-ready");
  });

  if (hasPendingLoginWelcome()) {
    splash.remove();
    return;
  }

  setTimeout(() => {
    splash.classList.add("is-hidden");
  }, 1900);

  setTimeout(() => {
    splash.remove();
  }, 3000);
}

function bindEvents() {
  on(newProjectBtn, "click", () => openProjectModal("create"));

  on(closeProjectModalBtn, "click", closeProjectModal);
  on(cancelProjectBtn, "click", closeProjectModal);
  on(saveProjectBtn, "click", handleSaveProject);

  on(closeCardModalBtn, "click", closeCardModal);
  on(cancelCardBtn, "click", closeCardModal);
  on(saveCardBtn, "click", handleSaveCard);
  on(deleteCardBtn, "click", handleDeleteCard);

  on(closeViewCardModalBtn, "click", closeViewCardModal);
  on(closeViewCardFooterBtn, "click", closeViewCardModal);

  on(addChecklistItemBtn, "click", handleAddChecklistItem);
  on(addCommentBtn, "click", handleAddComment);

  on(newChecklistItemInput, "keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddChecklistItem();
    }
  });

  on(newCommentInput, "keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddComment();
    }
  });

  on(searchInput, "input", renderBoard);

  on(lightBtn, "click", () => setTheme("light"));
  on(darkBtn, "click", () => setTheme("dark"));
  on(sidebarToggleBtn, "click", (e) => { e.stopPropagation(); toggleSidebar(); });
  window.addEventListener("resize", handleResponsiveLayout);
  on(mainArea, "click", () => { if (isMobileViewport() && appShell.classList.contains("mobile-sidebar-open")) closeMobileSidebar(); });
  on(document, "click", (e) => {
    if (!isMobileViewport() || !appShell.classList.contains("mobile-sidebar-open")) return;
    if (sidebarToggleBtn.contains(e.target)) return;
    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl && sidebarEl.contains(e.target)) return;
    closeMobileSidebar();
  });

  on(loginOpenBtn, "click", openAuthModal);
  on(profileBtn, "click", openProfileModal);
  on(logoutBtn, "click", handleLogout);
  on(projectActionRenameBtn, "click", () => { closeProjectActionsMenu(); openProjectModal("rename"); });
  on(projectActionDeleteBtn, "click", () => { closeProjectActionsMenu(); handleDeleteProject(); });
  on(closeAuthModalBtn, "click", closeAuthModal);
  on(googleLoginBtn, "click", handleGoogleLogin);
  on(closeProfileModalBtn, "click", closeProfileModal);
  on(closeProfileFooterBtn, "click", closeProfileModal);
  on(saveProfileBtn, "click", handleSaveProfile);
  on(cardCheckParticipantBtn, "click", handleCheckParticipant);
  on(cardParticipantsInput, "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); handleCheckParticipant(); } });

  addCardButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const col = button.closest(".column").dataset.col;
      openCardModal("create", col);
    });
  });

  on(projectModalOverlay, "click", (e) => {
    if (e.target === projectModalOverlay) closeProjectModal();
  });

  on(cardModalOverlay, "click", (e) => {
    if (e.target === cardModalOverlay) closeCardModal();
  });

  on(viewCardModalOverlay, "click", (e) => {
    if (e.target === viewCardModalOverlay) closeViewCardModal();
  });

  on(authModalOverlay, "click", (e) => {
    if (e.target === authModalOverlay) closeAuthModal();
  });

  on(profileModalOverlay, "click", (e) => {
    if (e.target === profileModalOverlay) closeProfileModal();
  });

  on(viewEditCardBtn, "click", () => {
    const cardId = viewEditCardBtn.dataset.cardId;
    if (!cardId) return;

    const found = findCard(cardId);
    if (!found) return;

    closeViewCardModal();
    setTimeout(() => openCardModal("edit", found.columnId, cardId), 140);
  });

  on(viewAddCommentBtn, "click", handleViewAddComment);
  on(viewNewCommentInput, "keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleViewAddComment();
    }
  });

  document.addEventListener("click", (e) => {
    if (!projectActionsOpen) return;
    if (e.target.closest("#projectActionsMenu") || e.target.closest(".project-edit-btn")) return;
    closeProjectActionsMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProjectModal();
      closeCardModal();
      closeViewCardModal();
      closeAuthModal();
      closeProfileModal();
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

function isSupabaseConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes("COLE_AQUI")
    && !SUPABASE_ANON_KEY.includes("COLE_AQUI");
}

async function initAuth() {
  if (!isSupabaseConfigured()) {
    authConfigHint.classList.remove("hidden");
    clearDataForSignedOutUser();
    updateAuthUI(null);
    return;
  }

  try {
    if (!window.supabase || !window.supabase.createClient) {
      updateAuthUI(null);
      authConfigHint.classList.remove("hidden");
      return;
    }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    await handleSessionUser(data.session?.user || null, { showWelcome: true });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSessionUser(session?.user || null, { showWelcome: true });
    });
  } catch (error) {
    console.error("Erro ao iniciar Supabase Auth:", error);
    updateAuthUI(null);
  }
}

async function handleSessionUser(sessionUser, { showWelcome = false } = {}) {
  if (!sessionUser) {
    profileRecord = null;
    clearDataForSignedOutUser();
    authUser = null;
    try { sessionStorage.removeItem(LOGIN_WELCOME_PENDING_KEY); } catch (_) {}
    updateAuthUI(null);
    return;
  }

  await refreshAuthUser(sessionUser);
  await ensureProfileRecord();
  await loadCloudData();
  updateAuthUI(authUser);
  closeAuthModal();
  if (showWelcome) maybeShowLoginWelcome(authUser);
}

function getIdentityData(user) {
  if (!user) return {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const firstIdentity = identities.find((item) => item?.identity_data) || null;
  return firstIdentity?.identity_data || {};
}

function getUserPresentation(user) {
  const metadata = user?.user_metadata || {};
  const identityData = getIdentityData(user);
  const fullName = profileRecord?.full_name || metadata.full_name || metadata.name || identityData.full_name || identityData.name || user?.email?.split("@")[0] || "Usuário";
  const email = profileRecord?.email || user?.email || metadata.email || identityData.email || "";
  const avatarUrl = profileRecord?.avatar_url || metadata.avatar_url || metadata.picture || identityData.avatar_url || identityData.picture || "";
  return { fullName, email, avatarUrl };
}

async function refreshAuthUser(baseUser = null) {
  let nextUser = baseUser || null;
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) nextUser = data.user;
    } catch (error) {
      console.warn("Não foi possível hidratar o usuário autenticado:", error);
    }
  }
  authUser = nextUser;
  updateAuthUI(authUser);
  return authUser;
}

async function ensureProfileRecord() {
  if (!supabase || !authUser) return null;

  const presentation = getUserPresentation(authUser);
  const payload = {
    user_id: authUser.id,
    full_name: presentation.fullName,
    email: presentation.email,
    avatar_url: presentation.avatarUrl
  };

  const upsertRes = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select().single();
  if (upsertRes.error && upsertRes.error.code !== "PGRST116") {
    console.error("Erro ao criar/atualizar perfil:", upsertRes.error);
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle();
  if (error) {
    console.error("Erro ao carregar perfil:", error);
    return null;
  }
  profileRecord = data || payload;
  fillProfileForm();
  return profileRecord;
}

function fillProfileForm() {
  if (!profilePhoneInput || !profileSectorInput || !profileBioInput) return;
  profilePhoneInput.value = profileRecord?.phone || "";
  profileSectorInput.value = profileRecord?.sector || "";
  profileBioInput.value = profileRecord?.bio || "";
}

async function handleSaveProfile() {
  if (!requireAuth("salvar o perfil")) return;
  if (!supabase || !authUser) return;

  const presentation = getUserPresentation(authUser);
  const payload = {
    user_id: authUser.id,
    full_name: presentation.fullName,
    email: presentation.email,
    avatar_url: presentation.avatarUrl,
    phone: profilePhoneInput?.value.trim() || null,
    sector: profileSectorInput?.value.trim() || null,
    bio: profileBioInput?.value.trim() || null
  };

  const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select().single();
  if (error) {
    console.error("Erro ao salvar perfil:", error);
    alert("Não foi possível salvar o perfil.");
    return;
  }
  profileRecord = data;
  updateAuthUI(authUser);
  
  // Feedback visual no padrão do sistema
  alert("Perfil atualizado com sucesso!");
}

async function loadCloudData() {
  if (!supabase || !authUser) return;

  const [projectsRes, cardsRes] = await Promise.all([
    supabase.from("projects").select("id,name,created_at").eq("owner_id", authUser.id).order("created_at", { ascending: true }),
    supabase.from("cards").select("*").eq("owner_id", authUser.id).order("position", { ascending: true })
  ]);

  if (projectsRes.error) {
    console.error("Erro ao carregar projetos:", projectsRes.error);
    return;
  }
  if (cardsRes.error) {
    console.error("Erro ao carregar cards:", cardsRes.error);
    return;
  }

  const nextState = { currentProjectId: null, projects: [] };
  const projectMap = new Map();

  (projectsRes.data || []).forEach((project) => {
    const item = {
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
      columns: defaultColumns()
    };
    projectMap.set(project.id, item);
    nextState.projects.push(item);
  });

  (cardsRes.data || []).forEach((row) => {
    const targetProject = projectMap.get(row.project_id);
    if (!targetProject) return;
    const columnKey = row.column_key || "todo";
    const card = {
      id: row.id,
      title: row.title || "Sem título",
      description: row.description || "",
      owner: row.owner || "",
      date: row.due_date || "",
      labels: Array.isArray(row.labels) ? row.labels : [],
      participants: normalizeParticipants(Array.isArray(row.participants) ? row.participants : []),
      checklist: Array.isArray(row.checklist) ? row.checklist : [],
      comments: Array.isArray(row.comments) ? row.comments : [],
      createdAt: row.created_at || new Date().toISOString()
    };
    if (!targetProject.columns[columnKey]) targetProject.columns[columnKey] = [];
    targetProject.columns[columnKey].push(card);
  });

  suspendCloudSync = true;
  state = nextState;
  currentProjectId = nextState.projects.find((project) => project.id === currentProjectId)?.id || nextState.projects[0]?.id || null;
  saveState();
  suspendCloudSync = false;
  renderProjects();
  renderBoard();
}

function clearDataForSignedOutUser() {
  suspendCloudSync = true;
  state = { currentProjectId: null, projects: [] };
  currentProjectId = null;
  saveState();
  suspendCloudSync = false;
  renderProjects();
  renderBoard();
}

function queueCloudSync() {
  if (!supabase || !authUser || suspendCloudSync) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    syncAllToCloud().catch((error) => console.error("Erro ao sincronizar com o Supabase:", error));
  }, 400);
}

function flattenCardsForCloud() {
  const rows = [];
  state.projects.forEach((project) => {
    Object.entries(project.columns || {}).forEach(([columnKey, cards]) => {
      (cards || []).forEach((card, index) => {
        rows.push({
          id: String(card.id),
          owner_id: authUser.id,
          project_id: String(project.id),
          column_key: columnKey,
          position: index,
          title: card.title || "Sem título",
          description: card.description || "",
          owner: card.owner || "",
          due_date: card.date || null,
          labels: Array.isArray(card.labels) ? card.labels : [],
          participants: normalizeParticipants(card.participants || []),
          checklist: Array.isArray(card.checklist) ? card.checklist : [],
          comments: Array.isArray(card.comments) ? card.comments : [],
          created_at: card.createdAt || new Date().toISOString()
        });
      });
    });
  });
  return rows;
}

function flattenParticipantLinks() {
  const rows = [];
  state.projects.forEach((project) => {
    Object.values(project.columns || {}).flat().forEach((card) => {
      normalizeParticipants(card.participants || []).forEach((participant) => {
        if (!participant.user_id) return;
        rows.push({
          card_id: String(card.id),
          participant_user_id: participant.user_id,
          owner_id: authUser.id,
          project_id: String(project.id),
          participant_name: participantDisplayName(participant),
          participant_email: participantEmail(participant),
          participant_avatar_url: participant.avatar_url || null
        });
      });
    });
  });
  return rows;
}

async function syncAllToCloud() {
  if (!supabase || !authUser || suspendCloudSync || isSyncingCloud) return;
  isSyncingCloud = true;

  try {
    const projectRows = state.projects.map((project) => ({
      id: String(project.id),
      owner_id: authUser.id,
      name: project.name,
      created_at: project.createdAt || new Date().toISOString()
    }));

    const remoteProjectsRes = await supabase.from("projects").select("id").eq("owner_id", authUser.id);
    if (remoteProjectsRes.error) throw remoteProjectsRes.error;
    const remoteProjectIds = (remoteProjectsRes.data || []).map((row) => row.id);
    const localProjectIds = projectRows.map((row) => row.id);

    if (projectRows.length) {
      const upsertProjects = await supabase.from("projects").upsert(projectRows, { onConflict: "id" });
      if (upsertProjects.error) throw upsertProjects.error;
    }

    const projectsToDelete = remoteProjectIds.filter((id) => !localProjectIds.includes(id));
    if (projectsToDelete.length) {
      const delProjects = await supabase.from("projects").delete().eq("owner_id", authUser.id).in("id", projectsToDelete);
      if (delProjects.error) throw delProjects.error;
    }

    const cardRows = flattenCardsForCloud();
    const remoteCardsRes = await supabase.from("cards").select("id").eq("owner_id", authUser.id);
    if (remoteCardsRes.error) throw remoteCardsRes.error;
    const remoteCardIds = (remoteCardsRes.data || []).map((row) => row.id);
    const localCardIds = cardRows.map((row) => row.id);

    if (cardRows.length) {
      const upsertCards = await supabase.from("cards").upsert(cardRows, { onConflict: "id" });
      if (upsertCards.error) throw upsertCards.error;
    }

    const cardsToDelete = remoteCardIds.filter((id) => !localCardIds.includes(id));
    if (cardsToDelete.length) {
      const delCards = await supabase.from("cards").delete().eq("owner_id", authUser.id).in("id", cardsToDelete);
      if (delCards.error) throw delCards.error;
    }

    const participantRows = flattenParticipantLinks();
    if (participantRows.length) {
      await supabase.from("card_participants").upsert(participantRows, { onConflict: "card_id,participant_user_id" });
    }
  } finally {
    isSyncingCloud = false;
  }
}

function maybeShowLoginWelcome(user) {
  if (!user) return;
  let shouldShow = false;
  try {
    shouldShow = hasPendingLoginWelcome();
    if (shouldShow) sessionStorage.removeItem(LOGIN_WELCOME_PENDING_KEY);
  } catch (_) {
    shouldShow = false;
  }
  if (!shouldShow) return;

  const { fullName, avatarUrl } = getUserPresentation(user);
  showWelcomeSplash(fullName, avatarUrl);
}

function showWelcomeSplash(fullName, avatarUrl) {
  const existing = document.getElementById("welcomeSplash");
  if (existing) existing.remove();

  const splash = document.createElement("div");
  splash.id = "welcomeSplash";
  splash.className = "intro-splash intro-splash-welcome";
  splash.setAttribute("aria-hidden", "true");

  const initials = getInitials(fullName);
  const safeName = escapeHtml(fullName);
  const safeAvatar = escapeHtml(avatarUrl);
  const mark = avatarUrl
    ? `<img class="intro-splash-mark intro-splash-avatar" src="${safeAvatar}" alt="Avatar de ${safeName}">`
    : `<div class="intro-splash-mark intro-splash-avatar-fallback">${escapeHtml(initials)}</div>`;

  splash.innerHTML = `
    <div class="intro-splash-glow"></div>
    <div class="intro-splash-card">
      ${mark}
      <div class="intro-splash-copy">
        <strong>Olá ${safeName}, seja bem-vindo ao seu Kanban!</strong>
        <span>Seu espaço já está pronto para começar.</span>
      </div>
    </div>
  `;

  document.body.appendChild(splash);
  setTimeout(() => splash.classList.add("is-hidden"), 2900);
  setTimeout(() => splash.remove(), 4100);
}

function updateAuthUI(user) {
  const isLogged = Boolean(user);
  const loginLabel = isLogged ? "Conta conectada" : "Entrar com Google";
  loginOpenBtn.innerHTML = `<span class="google-mark" aria-hidden="true"><svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M9 7.363v3.49h4.85c-.213 1.122-.853 2.072-1.812 2.711l2.928 2.273C16.674 14.266 17.5 11.916 17.5 9c0-.554-.05-1.087-.143-1.637H9z"/><path fill="#34A853" d="M9 17.5c2.43 0 4.469-.805 5.958-2.184l-2.928-2.273c-.812.544-1.852.866-3.03.866-2.33 0-4.303-1.574-5.008-3.69H.964v2.319A8.998 8.998 0 009 17.5z"/><path fill="#4A90E2" d="M3.992 10.219A5.396 5.396 0 013.712 9c0-.423.1-.83.28-1.219V5.462H.964A8.998 8.998 0 00.5 9c0 1.45.348 2.82.964 4.038l2.528-1.962z"/><path fill="#FBBC05" d="M9 4.091c1.321 0 2.507.455 3.441 1.348l2.58-2.58C13.464 1.412 11.427.5 9 .5A8.998 8.998 0 00.964 5.462L3.992 7.78C4.697 5.665 6.67 4.091 9 4.091z"/></svg></span><span class="btn-google-text">${loginLabel}</span>`;
  profileBtn.classList.toggle("hidden", !isLogged);
  logoutBtn.classList.toggle("hidden", !isLogged);
  loginOpenBtn.disabled = isLogged;
  loginOpenBtn.classList.toggle("is-locked", isLogged);
  loginOpenBtn.setAttribute("aria-disabled", isLogged ? "true" : "false");
  loginOpenBtn.title = isLogged ? "Conta já conectada" : "Entrar com Google";

  if (user) {
    const { fullName, email, avatarUrl } = getUserPresentation(user);
    const initials = getInitials(fullName);
    profileName.textContent = fullName;
    profileEmail.textContent = email;
    profileAvatarFallback.textContent = initials;
    brandUserName.textContent = fullName;
    brandMark.textContent = initials;
    fillProfileForm();

    if (avatarUrl) {
      profileAvatar.src = avatarUrl;
      profileAvatar.classList.remove("hidden");
      profileAvatarFallback.classList.add("hidden");
      brandAvatar.src = avatarUrl;
      brandAvatar.classList.remove("hidden");
      brandMark.classList.add("hidden");
    } else {
      profileAvatar.removeAttribute("src");
      profileAvatar.classList.add("hidden");
      profileAvatarFallback.classList.remove("hidden");
      brandAvatar.removeAttribute("src");
      brandAvatar.classList.add("hidden");
      brandMark.classList.remove("hidden");
    }
  } else {
    profileName.textContent = "Visitante";
    profileEmail.textContent = "Faça login para conectar sua conta.";
    profileAvatarFallback.textContent = "KQ";
    profileAvatar.removeAttribute("src");
    profileAvatar.classList.add("hidden");
    profileAvatarFallback.classList.remove("hidden");
    brandUserName.textContent = "Kanban Quest";
    brandMark.textContent = "KQ";
    brandAvatar.removeAttribute("src");
    brandAvatar.classList.add("hidden");
    brandMark.classList.remove("hidden");
    if (profilePhoneInput) profilePhoneInput.value = "";
    if (profileSectorInput) profileSectorInput.value = "";
    if (profileBioInput) profileBioInput.value = "";
  }

  updateCreationAccess();
  renderProjects();
  renderBoard();
}

function getInitials(name) {
  return String(name || "KQ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "KQ";
}

function openAuthModal() {
  if (authUser) return;
  authConfigHint.classList.toggle("hidden", isSupabaseConfigured());
  googleLoginBtn.disabled = !isSupabaseConfigured();
  openModal(authModalOverlay);
}

function closeAuthModal() {
  closeModal(authModalOverlay);
}

function openProfileModal() {
  if (profileRecord) fillProfileForm();
  openModal(profileModalOverlay);
}

function closeProfileModal() {
  closeModal(profileModalOverlay);
}

async function handleGoogleLogin() {
  if (!supabase) {
    authConfigHint.classList.remove("hidden");
    return;
  }

  try {
    try { sessionStorage.setItem(LOGIN_WELCOME_PENDING_KEY, "1"); } catch (_) {}
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href.split("#")[0]
      }
    });
  } catch (error) {
    console.error("Erro no login com Google:", error);
    alert("Não foi possível iniciar o login com Google.");
  }
}

async function handleLogout() {
  if (!supabase) return;

  // Alteração solicitada: Confirmação Sim/Não
  const confirmar = confirm("Você realmente deseja sair do Kanban Quest?");
  if (!confirmar) return;

  try {
    try { sessionStorage.removeItem(LOGIN_WELCOME_PENDING_KEY); } catch (_) {}
    await supabase.auth.signOut();
    closeProfileModal();
  } catch (error) {
    console.error("Erro ao sair:", error);
  }
}

function participantDisplayName(participant) {
  if (!participant) return "";
  return participant.full_name || participant.name || participant.email || String(participant);
}

function participantEmail(participant) {
  if (!participant || typeof participant === "string") return "";
  return participant.email || "";
}

function normalizeParticipant(participant) {
  if (!participant) return null;
  if (typeof participant === "string") return { user_id: null, full_name: participant, email: "", avatar_url: "" };
  return {
    user_id: participant.user_id || participant.id || null,
    full_name: participant.full_name || participant.name || participant.email || "Participante",
    email: participant.email || "",
    avatar_url: participant.avatar_url || participant.picture || ""
  };
}

function normalizeParticipants(participants) {
  return (Array.isArray(participants) ? participants : []).map(normalizeParticipant).filter(Boolean);
}

function renderSelectedParticipants() {
  if (!selectedParticipantsList) return;
  selectedParticipantsList.innerHTML = "";
  if (!tempParticipants.length) {
    selectedParticipantsList.innerHTML = `<div class="participant-search-empty">Nenhum participante selecionado.</div>`;
    return;
  }

  tempParticipants.forEach((participant) => {
    const row = document.createElement("div");
    row.className = "selected-participant-item";
    const initials = getInitials(participantDisplayName(participant));
    row.innerHTML = `
      <div class="selected-participant-main">
        ${participant.avatar_url ? `<img class="selected-participant-avatar" src="${escapeHtml(participant.avatar_url)}" alt="${escapeHtml(participantDisplayName(participant))}">` : `<div class="selected-participant-avatar">${escapeHtml(initials)}</div>`}
        <div class="selected-participant-copy">
          <strong>${escapeHtml(participantDisplayName(participant))}</strong>
          <span>${escapeHtml(participantEmail(participant) || "Participante adicionado")}</span>
        </div>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>
    `;
    row.querySelector("button").addEventListener("click", () => removeParticipantFromTemp(participant.user_id || participant.email || participantDisplayName(participant)));
    selectedParticipantsList.appendChild(row);
  });
}

function renderParticipantSearchResults() {
  if (!participantSearchResultsEl) return;
  participantSearchResultsEl.innerHTML = "";
  if (!participantSearchResults.length) return;

  participantSearchResults.forEach((participant) => {
    const row = document.createElement("div");
    row.className = "participant-result-item";
    const initials = getInitials(participantDisplayName(participant));
    row.innerHTML = `
      <div class="participant-result-main">
        ${participant.avatar_url ? `<img class="participant-result-avatar" src="${escapeHtml(participant.avatar_url)}" alt="${escapeHtml(participantDisplayName(participant))}">` : `<div class="participant-result-avatar">${escapeHtml(initials)}</div>`}
        <div class="participant-result-copy">
          <strong>${escapeHtml(participantDisplayName(participant))}</strong>
          <span>${escapeHtml(participantEmail(participant) || "Usuário cadastrado")}</span>
        </div>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Adicionar</button>
    `;
    row.querySelector("button").addEventListener("click", () => addParticipantToTemp(participant));
    participantSearchResultsEl.appendChild(row);
  });
}

function addParticipantToTemp(participant) {
  const normalized = normalizeParticipant(participant);
  const key = normalized.user_id || normalized.email || participantDisplayName(normalized);
  const exists = tempParticipants.some((item) => (item.user_id || item.email || participantDisplayName(item)) === key);
  if (exists) return;
  tempParticipants.push(normalized);
  renderSelectedParticipants();
}

function removeParticipantFromTemp(key) {
  tempParticipants = tempParticipants.filter((item) => (item.user_id || item.email || participantDisplayName(item)) !== key);
  renderSelectedParticipants();
}

async function handleCheckParticipant() {
  if (!requireAuth("buscar participantes")) return;
  const term = cardParticipantsInput?.value.trim();
  if (!term) {
    participantSearchResults = [];
    renderParticipantSearchResults();
    return;
  }
  if (!supabase) {
    alert("Configure o Supabase para buscar participantes.");
    return;
  }

  let data = null;
  const rpcResult = await supabase.rpc("search_profiles", { search_term: term });
  if (!rpcResult.error) {
    data = rpcResult.data;
  } else {
    const fallback = await supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(8);
    if (fallback.error) {
      console.error("Erro ao buscar participantes:", fallback.error);
      return;
    }
    data = fallback.data;
  }

  participantSearchResults = normalizeParticipants(data || []).filter((participant) => participant.user_id !== authUser.id);
  if (!participantSearchResults.length) {
    participantSearchResultsEl.innerHTML = `<div class="participant-search-empty">Nenhum usuário encontrado para "${escapeHtml(term)}".</div>`;
    return;
  }
  renderParticipantSearchResults();
}

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function loadState() {
  try {
    const saved = safeGetItem(STORAGE_KEY);
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
  safeSetItem(STORAGE_KEY, JSON.stringify(state));
  if (!suspendCloudSync) queueCloudSync();
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
        participants: normalizeParticipants(Array.isArray(card.participants) ? card.participants : []),
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

  if (!authUser) {
    const empty = document.createElement("li");
    empty.className = "project-empty-state";
    empty.textContent = "Faça login para ver e criar projetos.";
    projectList.appendChild(empty);
    return;
  }

  if (!state.projects.length) {
    const empty = document.createElement("li");
    empty.className = "project-empty-state";
    empty.textContent = authUser ? "Nenhum projeto criado ainda." : "Faça login para criar projetos.";
    projectList.appendChild(empty);
    return;
  }

  state.projects.forEach((project) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="project-item-name">${escapeHtml(project.name)}</span>
      <button class="project-edit-btn" type="button" aria-label="Editar projeto" title="Editar projeto">⋯</button>
    `;

    if (project.id === currentProjectId) {
      li.classList.add("active");
    }

    li.addEventListener("click", () => {
      currentProjectId = project.id;
      saveState();
      renderProjects();
      renderBoard();
      closeProjectActionsMenu();
    });

    const editBtn = li.querySelector(".project-edit-btn");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      currentProjectId = project.id;
      saveState();
      renderProjects();
      renderBoard();
      toggleProjectActionsMenu(editBtn);
    });

    projectList.appendChild(li);
  });
}

function toggleProjectActionsMenu(anchorEl) {
  if (projectActionsOpen) {
    closeProjectActionsMenu();
  }

  const rect = anchorEl.getBoundingClientRect();
  projectActionsMenu.style.top = `${rect.bottom + 10}px`;
  projectActionsMenu.style.left = `${Math.max(16, rect.right - 220)}px`;
  projectActionsMenu.classList.remove("hidden");
  projectActionsMenu.setAttribute("aria-hidden", "false");
  projectActionsOpen = true;
}

function closeProjectActionsMenu() {
  projectActionsMenu.classList.add("hidden");
  projectActionsMenu.setAttribute("aria-hidden", "true");
  projectActionsOpen = false;
}

function renderBoard() {
  const project = authUser ? getCurrentProject() : null;

  if (!project) {
    boardTitle.textContent = authUser ? "Nenhum projeto" : "Faça login para começar";
    projectCount.textContent = authUser ? "0 projeto(s) no total" : "Entre com Google para criar seu primeiro projeto";

    renderColumn("todo", []);
    renderColumn("doing", []);
    renderColumn("done", []);

    countTodo.textContent = 0;
    countDoing.textContent = 0;
    countDone.textContent = 0;

    updateDashboard({ columns: defaultColumns() });
    updateCreationAccess();
    return;
  }

  boardTitle.textContent = project.name;
  projectCount.textContent = `${state.projects.length} projeto(s) no total`;

  renderColumn("todo", project.columns.todo);
  renderColumn("doing", project.columns.doing);
  renderColumn("done", project.columns.done);

  countTodo.textContent = project.columns.todo.length;
  countDoing.textContent = project.columns.doing.length;
  countDone.textContent = project.columns.done.length;

  updateDashboard(project);
  updateCreationAccess();
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
      ...normalizeParticipants(card.participants || []).map((participant) => `${participantDisplayName(participant)} ${participantEmail(participant)}`),
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
          <div class="card-progress">
            <div class="card-progress-fill" style="width:${checklistPercent}%"></div>
          </div>
        </div>
      `
      : "";

    const commentsCount = (card.comments || []).length;
    const participants = normalizeParticipants(card.participants || []);
    const participantsHtml = participants.length
      ? `<div class="card-participants">${participants.slice(0, 3).map((participant) => `<span class="participant-chip">${escapeHtml(participantDisplayName(participant))}</span>`).join("")}${participants.length > 3 ? `<span class="participant-chip participant-chip-more">+${participants.length - 3}</span>` : ""}</div>`
      : "";

    cardEl.innerHTML = `
      <h4 class="card-title">${escapeHtml(card.title || "Sem título")}</h4>
      <p class="card-desc">${escapeHtml(truncate(card.description || "Sem descrição.", 140))}</p>
      ${labelsHtml ? `<div class="card-labels">${labelsHtml}</div>` : ""}
      ${meta.length ? `<div class="card-meta">${meta.join("")}</div>` : ""}
      ${checklistPreviewHtml}
      ${participantsHtml}
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
  if (!requireAuth(mode === "create" ? "criar projetos" : "editar projetos")) return;
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
  if (!requireAuth("salvar projetos")) return;
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
  if (!requireAuth("excluir projetos")) return;

  const project = getCurrentProject();
  if (!project) return;

  const ok = confirm(`Deseja excluir o projeto "${project.name}"?`);
  if (!ok) return;

  state.projects = state.projects.filter((p) => p.id !== project.id);
  currentProjectId = state.projects[0]?.id || null;
  saveState();
  renderProjects();
  renderBoard();
}

function openCardModal(mode, columnId, cardId = null) {
  if (!requireAuth(mode === "create" ? "criar cards" : "editar cards")) return;
  if (!getCurrentProject()) {
    alert("Crie um projeto antes de adicionar cards.");
    return;
  }
  currentTargetColumn = columnId;
  currentEditingCardId = null;
  tempChecklist = [];
  tempComments = [];

  tempParticipants = [];
  participantSearchResults = [];

  if (mode === "create") {
    cardModalTitle.textContent = "Novo Card";
    deleteCardBtn.classList.add("hidden");

    cardTitleInput.value = "";
    cardDescInput.value = "";
    cardOwnerInput.value = authUser ? getUserPresentation(authUser).fullName : "";
    cardDateInput.value = "";
    cardLabelsInput.value = "";
    if (cardParticipantsInput) cardParticipantsInput.value = "";
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
    if (cardParticipantsInput) cardParticipantsInput.value = "";
    tempParticipants = normalizeParticipants(found.card.participants || []);
    tempChecklist = clone(found.card.checklist || []);
    tempComments = clone(found.card.comments || []);
  }

  renderSelectedParticipants();
  renderParticipantSearchResults();
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
  if (!requireAuth("salvar cards")) return;
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
    owner: cardOwnerInput.value.trim() || (authUser ? getUserPresentation(authUser).fullName : ""),
    date: cardDateInput.value,
    labels: cardLabelsInput.value
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean),
    participants: clone(tempParticipants),
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
  if (!requireAuth("excluir cards")) return;
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
    author: authUser ? getUserPresentation(authUser).fullName : "",
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
        <span>${escapeHtml(comment.text)}${comment.author ? ` — ${escapeHtml(comment.author)}` : ""}</span>
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

  const participants = normalizeParticipants(card.participants || []);
  viewParticipantsCounter.textContent = `${participants.length}`;
  viewCardParticipants.innerHTML = "";
  if (participants.length) {
    participants.forEach((participant) => {
      const chip = document.createElement("span");
      chip.className = "participant-chip";
      chip.textContent = participantDisplayName(participant);
      viewCardParticipants.appendChild(chip);
    });
  } else {
    viewCardParticipants.innerHTML = `<div class="empty-state">Nenhum participante.</div>`;
  }

  const checklist = card.checklist || [];
  const doneItems = checklist.filter((item) => item.done).length;
  const percent = checklist.length ? Math.round((doneItems / checklist.length) * 100) : 0;

  viewChecklistCounter.textContent = `${doneItems}/${checklist.length}`;
  viewChecklistProgress.style.width = `${percent}%`;
  viewChecklistList.innerHTML = "";

  if (checklist.length) {
    checklist.forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `view-check-item is-clickable ${item.done ? "done" : ""}`;
      row.innerHTML = `
        <span class="view-check-bullet"></span>
        <span>${escapeHtml(item.text)}</span>
      `;
      row.addEventListener("click", () => {
        item.done = !item.done;
        saveState();
        openViewCardModal(card.id);
        renderBoard();
      });
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
        <div class="view-comment-text">${escapeHtml(comment.text)}</div>
        <div class="view-comment-meta-row">
          <div class="view-comment-meta">${comment.author ? `${escapeHtml(comment.author)} · ` : ""}${formatDateTime(comment.createdAt)}</div>
          <button type="button" class="btn btn-soft btn-sm">Remover</button>
        </div>
      `;
      row.querySelector("button").addEventListener("click", () => {
        card.comments = (card.comments || []).filter((c) => c.id !== comment.id);
        saveState();
        openViewCardModal(card.id);
        renderBoard();
      });
      viewCommentsList.appendChild(row);
    });
  } else {
    viewCommentsList.innerHTML = `<div class="empty-state">Nenhum comentário.</div>`;
  }

  viewEditCardBtn.dataset.cardId = card.id;
  openModal(viewCardModalOverlay);
}

function closeViewCardModal() {
  viewNewCommentInput.value = "";
  closeModal(viewCardModalOverlay);
}

function handleViewAddComment() {
  const cardId = viewEditCardBtn.dataset.cardId;
  const text = viewNewCommentInput.value.trim();
  if (!cardId || !text) return;

  const found = findCard(cardId);
  if (!found) return;

  if (!Array.isArray(found.card.comments)) found.card.comments = [];
  found.card.comments.push({
    id: uid(),
    text,
    author: authUser ? getUserPresentation(authUser).fullName : "",
    createdAt: new Date().toISOString()
  });

  viewNewCommentInput.value = "";
  saveState();
  openViewCardModal(cardId);
  renderBoard();
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
  if (!overlay) return;

  const activeTimer = modalCloseTimers.get(overlay);
  if (activeTimer) {
    clearTimeout(activeTimer);
    modalCloseTimers.delete(overlay);
  }

  overlay.classList.remove("hidden", "is-closing");
  overlay.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    overlay.classList.add("is-active");
  });
}

function closeModal(overlay) {
  if (!overlay || overlay.classList.contains("hidden")) return;

  overlay.classList.remove("is-active");
  overlay.classList.add("is-closing");
  overlay.setAttribute("aria-hidden", "true");

  const timer = setTimeout(() => {
    overlay.classList.remove("is-closing");
    overlay.classList.add("hidden");
    modalCloseTimers.delete(overlay);
  }, 280);

  modalCloseTimers.set(overlay, timer);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  safeSetItem(THEME_KEY, theme);
  updateThemeButtons(theme);
}

function applySavedTheme() {
  const savedTheme = safeGetItem(THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButtons(savedTheme);
}

function updateThemeButtons(theme) {
  lightBtn.classList.toggle("active", theme === "light");
  darkBtn.classList.toggle("active", theme === "dark");
}

function updateDashboard(project) {
  if (!project) return;

  const columns = project.columns || {};
  const cards = Object.values(columns).flat();
  const totalCards = cards.length;
  const completedCards = (columns.done || []).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCards = cards.filter((card) => {
    if (!card.date) return false;
    const deadline = new Date(`${card.date}T00:00:00`);
    return deadline < today && !((columns.done || []).some((doneCard) => doneCard.id === card.id));
  }).length;

  const checklistItems = cards.flatMap((card) => Array.isArray(card.checklist) ? card.checklist : []);
  const checklistDone = checklistItems.filter((item) => item.done).length;
  const checklistPercent = checklistItems.length ? Math.round((checklistDone / checklistItems.length) * 100) : 0;

  dashTotalCards.textContent = String(totalCards);
  dashCompletedCards.textContent = String(completedCards);
  dashOverdueCards.textContent = String(overdueCards);
  dashChecklistDone.textContent = `${checklistPercent}%`;
}

function isMobileViewport() {
  return window.innerWidth <= 980;
}

function openMobileSidebar() {
  appShell.classList.add("mobile-sidebar-open");
  appShell.classList.remove("sidebar-collapsed");
  updateSidebarToggleButton(false);
}

function closeMobileSidebar() {
  appShell.classList.remove("mobile-sidebar-open");
  updateSidebarToggleButton(true);
}

function toggleSidebar() {
  if (isMobileViewport()) {
    if (appShell.classList.contains("mobile-sidebar-open")) closeMobileSidebar();
    else openMobileSidebar();
    return;
  }

  const collapsed = appShell.classList.toggle("sidebar-collapsed");
  safeSetItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  updateSidebarToggleButton(collapsed);
}

function applySavedSidebar() {
  if (isMobileViewport()) {
    appShell.classList.remove("sidebar-collapsed");
    appShell.classList.remove("mobile-sidebar-open");
    updateSidebarToggleButton(true);
    return;
  }

  const collapsed = safeGetItem(SIDEBAR_KEY) === "1";
  appShell.classList.remove("mobile-sidebar-open");
  appShell.classList.toggle("sidebar-collapsed", collapsed);
  updateSidebarToggleButton(collapsed);
}

function handleResponsiveLayout() {
  if (isMobileViewport()) {
    appShell.classList.remove("sidebar-collapsed");
    if (!appShell.classList.contains("mobile-sidebar-open")) updateSidebarToggleButton(true);
  } else {
    appShell.classList.remove("mobile-sidebar-open");
    const collapsed = safeGetItem(SIDEBAR_KEY) === "1";
    appShell.classList.toggle("sidebar-collapsed", collapsed);
    updateSidebarToggleButton(collapsed);
  }
}

function updateSidebarToggleButton(collapsed) {
  sidebarToggleBtn.textContent = collapsed ? "☰" : "✕";
  sidebarToggleBtn.setAttribute("aria-label", collapsed ? "Mostrar menu lateral" : "Esconder menu lateral");
  sidebarToggleBtn.setAttribute("title", collapsed ? "Mostrar menu lateral" : "Esconder menu lateral");
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
});
