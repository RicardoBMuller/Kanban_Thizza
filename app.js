document.addEventListener("DOMContentLoaded", () => {
// ============================================================
// CONFIGURAÇÃO — preencha com suas credenciais do Supabase
// ============================================================
const SUPABASE_URL  = "https://ymskzxssjnvhsqhymzbq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltc2t6eHNzam52aHNxaHltemJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTAyMzYsImV4cCI6MjA4ODY2NjIzNn0.nsXZ62padaByJNZqJogVyUxW8hqD0oxzl70p2D4sfOs";

// ============================================================
// CONSTANTES
// ============================================================
const STORAGE_KEY              = "kanban_fcc_pro_v5";
const THEME_KEY                = "kanban_fcc_theme";
const SIDEBAR_KEY              = "kanban_fcc_sidebar_collapsed";
const LOGIN_WELCOME_PENDING_KEY = "kanban_login_welcome_pending";

const defaultColumns = () => ({ todo: [], doing: [], done: [] });

// ============================================================
// ESTADO GLOBAL
// ============================================================
let state          = loadState();
let currentProjectId = state.currentProjectId || null;

if (currentProjectId && !state.projects.find(p => p.id === currentProjectId)) {
  currentProjectId = state.projects[0]?.id || null;
  saveState();
}

let currentEditingCardId = null;
let currentTargetColumn  = "todo";
let projectModalMode     = "create";
let tempChecklist        = [];
let tempComments         = [];
const modalCloseTimers   = new WeakMap();

let supabase             = null;
let authUser             = null;
let profileRecord        = null;
let tempParticipants     = [];
let participantSearchResults = [];
let suspendCloudSync     = false;
let cloudSyncTimer       = null;
let isSyncingCloud       = false;

// Shared cards — cards where the logged user is a participant (not owner)
let sharedCardsState     = []; // [{card, columnId, projectId, projectName, ownerId}]
let isViewingSharedProject = false; // true when user selected "Compartilhados comigo"
const SHARED_PROJECT_VIRTUAL_ID = "__shared__";

// ============================================================
// DOM REFS
// ============================================================
const projectList       = document.getElementById("projectList");
const searchInput       = document.getElementById("searchInput");
const boardTitle        = document.getElementById("boardTitle");
const sidebarToggleBtn  = document.getElementById("sidebarToggleBtn");
const appShell          = document.querySelector(".app-shell");
const mainArea          = document.querySelector(".main-area");
const dashTotalCards    = document.getElementById("dashTotalCards");
const dashCompletedCards = document.getElementById("dashCompletedCards");
const dashOverdueCards  = document.getElementById("dashOverdueCards");
const dashChecklistDone = document.getElementById("dashChecklistDone");
const projectCount      = document.getElementById("projectCount");
const countTodo         = document.getElementById("count-todo");
const countDoing        = document.getElementById("count-doing");
const countDone         = document.getElementById("count-done");
const newProjectBtn     = document.getElementById("newProjectBtn");
const lightBtn          = document.getElementById("lightBtn");
const darkBtn           = document.getElementById("darkBtn");
const loginOpenBtn      = document.getElementById("loginOpenBtn");
const profileBtn        = document.getElementById("profileBtn");
const logoutBtn         = document.getElementById("logoutBtn");
const brandUserName     = document.getElementById("brandUserName");
const brandAvatar       = document.getElementById("brandAvatar");
const brandMark         = document.getElementById("brandMark");
const authModalOverlay  = document.getElementById("authModalOverlay");
const closeAuthModalBtn = document.getElementById("closeAuthModalBtn");
const googleLoginBtn    = document.getElementById("googleLoginBtn");
const authConfigHint    = document.getElementById("authConfigHint");
const profileModalOverlay    = document.getElementById("profileModalOverlay");
const closeProfileModalBtn   = document.getElementById("closeProfileModalBtn");
const closeProfileFooterBtn  = document.getElementById("closeProfileFooterBtn");
const profileName            = document.getElementById("profileName");
const profileEmail           = document.getElementById("profileEmail");
const profileAvatar          = document.getElementById("profileAvatar");
const profileAvatarFallback  = document.getElementById("profileAvatarFallback");
const profilePhoneInput      = document.getElementById("profilePhoneInput");
const profileSectorInput     = document.getElementById("profileSectorInput");
const profileBioInput        = document.getElementById("profileBioInput");
const saveProfileBtn         = document.getElementById("saveProfileBtn");
const projectActionsMenu     = document.getElementById("projectActionsMenu");
const projectActionRenameBtn = document.getElementById("projectActionRenameBtn");
const projectActionDeleteBtn = document.getElementById("projectActionDeleteBtn");
let   projectActionsOpen     = false;

// Modal projeto
const projectModalOverlay  = document.getElementById("projectModalOverlay");
const projectModalTitle    = document.getElementById("projectModalTitle");
const projectNameInput     = document.getElementById("projectNameInput");
const closeProjectModalBtn = document.getElementById("closeProjectModalBtn");
const cancelProjectBtn     = document.getElementById("cancelProjectBtn");
const saveProjectBtn       = document.getElementById("saveProjectBtn");

// Modal edição do card
const cardModalOverlay   = document.getElementById("cardModalOverlay");
const cardModalTitle     = document.getElementById("cardModalTitle");
const closeCardModalBtn  = document.getElementById("closeCardModalBtn");
const cancelCardBtn      = document.getElementById("cancelCardBtn");
const saveCardBtn        = document.getElementById("saveCardBtn");
const deleteCardBtn      = document.getElementById("deleteCardBtn");
const cardTitleInput     = document.getElementById("cardTitleInput");
const cardDescInput      = document.getElementById("cardDescInput");
const cardOwnerInput     = document.getElementById("cardOwnerInput");
const cardDateInput      = document.getElementById("cardDateInput");
const cardLabelsInput    = document.getElementById("cardLabelsInput");
const cardParticipantsInput    = document.getElementById("cardParticipantsInput");
const cardCheckParticipantBtn  = document.getElementById("cardCheckParticipantBtn");
const participantSearchResultsEl = document.getElementById("participantSearchResults");
const selectedParticipantsList   = document.getElementById("selectedParticipantsList");
const newChecklistItemInput = document.getElementById("newChecklistItemInput");
const addChecklistItemBtn   = document.getElementById("addChecklistItemBtn");
const editChecklistList     = document.getElementById("editChecklistList");
const newCommentInput       = document.getElementById("newCommentInput");
const addCommentBtn         = document.getElementById("addCommentBtn");
const editCommentsList      = document.getElementById("editCommentsList");

// Modal visualização
const viewCardModalOverlay   = document.getElementById("viewCardModalOverlay");
const viewCardTitle          = document.getElementById("viewCardTitle");
const viewCardOwner          = document.getElementById("viewCardOwner");
const viewCardDate           = document.getElementById("viewCardDate");
const viewCardColumn         = document.getElementById("viewCardColumn");
const viewCardDescription    = document.getElementById("viewCardDescription");
const viewCardLabels         = document.getElementById("viewCardLabels");
const viewCardParticipants   = document.getElementById("viewCardParticipants");
const viewParticipantsCounter = document.getElementById("viewParticipantsCounter");
const viewNewCommentInput    = document.getElementById("viewNewCommentInput");
const viewAddCommentBtn      = document.getElementById("viewAddCommentBtn");
const viewChecklistCounter   = document.getElementById("viewChecklistCounter");
const viewChecklistProgress  = document.getElementById("viewChecklistProgress");
const viewChecklistList      = document.getElementById("viewChecklistList");
const viewCommentsCounter    = document.getElementById("viewCommentsCounter");
const viewCommentsList       = document.getElementById("viewCommentsList");
const closeViewCardModalBtn  = document.getElementById("closeViewCardModalBtn");
const closeViewCardFooterBtn = document.getElementById("closeViewCardFooterBtn");
const viewEditCardBtn        = document.getElementById("viewEditCardBtn");

const addCardButtons = document.querySelectorAll(".add-card-btn");
const columnEls      = document.querySelectorAll(".column");

init();

// ============================================================
// INIT
// ============================================================
function on(el, eventName, handler) { if (el) el.addEventListener(eventName, handler); }

function requireAuth(actionLabel = "continuar") {
  if (authUser) return true;
  alert(`Faça login com Google para ${actionLabel}.`);
  openAuthModal();
  return false;
}

function updateCreationAccess() {
  const canCreateProjects = Boolean(authUser);
  const hasProject = Boolean(getCurrentProject()) && !isViewingSharedProject;
  newProjectBtn.disabled = !canCreateProjects;
  newProjectBtn.title = canCreateProjects ? "Criar projeto" : "Faça login com Google para criar projetos";
  addCardButtons.forEach(button => {
    const canCreateCards = Boolean(authUser && hasProject);
    button.disabled = !canCreateCards;
    button.title = canCreateCards ? "Criar card" : isViewingSharedProject ? "Não é possível criar cards em projetos compartilhados" : "Faça login com Google e selecione/crie um projeto";
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
  try { return sessionStorage.getItem(LOGIN_WELCOME_PENDING_KEY) === "1"; } catch(_) { return false; }
}

function runIntroSplash() {
  const splash = document.getElementById("introSplash");
  if (!splash) return;
  requestAnimationFrame(() => document.body.classList.add("is-app-ready"));
  if (hasPendingLoginWelcome()) { splash.remove(); return; }
  setTimeout(() => splash.classList.add("is-hidden"), 1900);
  setTimeout(() => splash.remove(), 3000);
}

// ============================================================
// EVENTS
// ============================================================
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
  on(newChecklistItemInput, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistItem(); }});
  on(newCommentInput, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); }});
  on(searchInput, "input", renderBoard);
  on(lightBtn, "click", () => setTheme("light"));
  on(darkBtn, "click", () => setTheme("dark"));
  on(sidebarToggleBtn, "click", e => { e.stopPropagation(); toggleSidebar(); });
  window.addEventListener("resize", handleResponsiveLayout);
  on(mainArea, "click", () => { if (isMobileViewport() && appShell.classList.contains("mobile-sidebar-open")) closeMobileSidebar(); });
  on(document, "click", e => {
    if (!isMobileViewport() || !appShell.classList.contains("mobile-sidebar-open")) return;
    if (sidebarToggleBtn.contains(e.target)) return;
    const sidebarEl = document.querySelector(".sidebar");
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
  on(cardParticipantsInput, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); handleCheckParticipant(); }});

  addCardButtons.forEach(button => {
    button.addEventListener("click", () => {
      const col = button.closest(".column").dataset.col;
      openCardModal("create", col);
    });
  });

  on(projectModalOverlay, "click", e => { if (e.target === projectModalOverlay) closeProjectModal(); });
  on(cardModalOverlay, "click", e => { if (e.target === cardModalOverlay) closeCardModal(); });
  on(viewCardModalOverlay, "click", e => { if (e.target === viewCardModalOverlay) closeViewCardModal(); });
  on(authModalOverlay, "click", e => { if (e.target === authModalOverlay) closeAuthModal(); });
  on(profileModalOverlay, "click", e => { if (e.target === profileModalOverlay) closeProfileModal(); });

  on(viewEditCardBtn, "click", () => {
    const cardId = viewEditCardBtn.dataset.cardId;
    if (!cardId) return;
    const found = findCard(cardId);
    if (!found) return;
    closeViewCardModal();
    setTimeout(() => openCardModal("edit", found.columnId, cardId), 140);
  });

  on(viewAddCommentBtn, "click", handleViewAddComment);
  on(viewNewCommentInput, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); handleViewAddComment(); }});

  document.addEventListener("click", e => {
    if (!projectActionsOpen) return;
    if (e.target.closest("#projectActionsMenu") || e.target.closest(".project-edit-btn")) return;
    closeProjectActionsMenu();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeProjectModal(); closeCardModal(); closeViewCardModal();
      closeAuthModal(); closeProfileModal();
    }
  });

  columnEls.forEach(column => {
    const cardsContainer = column.querySelector(".cards");
    cardsContainer.addEventListener("dragover", e => {
      e.preventDefault();
      cardsContainer.classList.add("drag-over");
      const draggingCard = document.querySelector(".card.dragging");
      if (!draggingCard) return;
      const afterElement = getDragAfterElement(cardsContainer, e.clientY);
      afterElement == null ? cardsContainer.appendChild(draggingCard) : cardsContainer.insertBefore(draggingCard, afterElement);
    });
    cardsContainer.addEventListener("dragleave", () => cardsContainer.classList.remove("drag-over"));
    cardsContainer.addEventListener("drop", e => {
      e.preventDefault();
      cardsContainer.classList.remove("drag-over");
      const draggedCardId = e.dataTransfer.getData("text/plain");
      if (!draggedCardId) return;
      const targetCol = column.dataset.col;
      moveCardToColumnAtPosition(draggedCardId, targetCol, cardsContainer);
    });
  });
}

// ============================================================
// AUTH
// ============================================================
function isSupabaseConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes("COLE_AQUI") && !SUPABASE_URL.includes("SUPABASE_URL")
    && !SUPABASE_ANON_KEY.includes("COLE_AQUI") && !SUPABASE_ANON_KEY.includes("SUPABASE_KEY");
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
      updateAuthUI(null); authConfigHint.classList.remove("hidden"); return;
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
    try { sessionStorage.removeItem(LOGIN_WELCOME_PENDING_KEY); } catch(_) {}
    updateAuthUI(null);
    return;
  }
  await refreshAuthUser(sessionUser);
  await ensureProfileRecord();
  await loadCloudData();
  await loadSharedCards();
  updateAuthUI(authUser);
  closeAuthModal();
  if (showWelcome) maybeShowLoginWelcome(authUser);
}

function getIdentityData(user) {
  if (!user) return {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const firstIdentity = identities.find(item => item?.identity_data) || null;
  return firstIdentity?.identity_data || {};
}

function getUserPresentation(user) {
  const metadata = user?.user_metadata || {};
  const identityData = getIdentityData(user);
  const fullName = profileRecord?.full_name || metadata.full_name || metadata.name || identityData.full_name || identityData.name || user?.email?.split("@")[0] || "Usuário";
  const email    = profileRecord?.email || user?.email || metadata.email || identityData.email || "";
  const avatarUrl = profileRecord?.avatar_url || metadata.avatar_url || metadata.picture || identityData.avatar_url || identityData.picture || "";
  return { fullName, email, avatarUrl };
}

async function refreshAuthUser(baseUser = null) {
  let nextUser = baseUser || null;
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) nextUser = data.user;
    } catch(error) { console.warn("Não foi possível hidratar o usuário autenticado:", error); }
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
  if (upsertRes.error && upsertRes.error.code !== "PGRST116") console.error("Erro ao criar/atualizar perfil:", upsertRes.error);
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle();
  if (error) { console.error("Erro ao carregar perfil:", error); return null; }
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
  const originalText = saveProfileBtn.textContent;
  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Salvando...";
  const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select().single();
  if (error) {
    console.error("Erro ao salvar perfil:", error);
    saveProfileBtn.disabled = false; saveProfileBtn.textContent = originalText; return;
  }
  profileRecord = data;
  updateAuthUI(authUser);
  saveProfileBtn.textContent = "✅ Salvo!";
  setTimeout(() => { saveProfileBtn.textContent = originalText; saveProfileBtn.disabled = false; }, 2200);
}

function showSystemConfirmModal(title, message, onConfirm) {
  projectModalTitle.textContent = title;
  const modalBody = projectModalOverlay.querySelector(".modal-body");
  const originalContent = modalBody.innerHTML;
  modalBody.innerHTML = `<p class="view-text">${message}</p>`;
  const newSaveBtn   = saveProjectBtn.cloneNode(true);
  const newCancelBtn = cancelProjectBtn.cloneNode(true);
  saveProjectBtn.parentNode.replaceChild(newSaveBtn, saveProjectBtn);
  cancelProjectBtn.parentNode.replaceChild(newCancelBtn, cancelProjectBtn);
  const restore = () => {
    modalBody.innerHTML = originalContent;
    newSaveBtn.parentNode.replaceChild(saveProjectBtn, newSaveBtn);
    newCancelBtn.parentNode.replaceChild(cancelProjectBtn, newCancelBtn);
    closeProjectModal();
  };
  newSaveBtn.textContent = "Sim"; newCancelBtn.textContent = "Não";
  newSaveBtn.onclick = () => { onConfirm(); restore(); };
  newCancelBtn.onclick = restore;
  openModal(projectModalOverlay);
}

async function handleLogout() {
  if (!supabase || !authUser) return;
  showSystemConfirmModal("Confirmação", "Você realmente deseja sair do Kanban Quest?", async () => {
    try {
      const presentation = getUserPresentation(authUser);
      await supabase.auth.signOut();
      authUser = null; profileRecord = null;
      clearDataForSignedOutUser();
      closeProfileModal();
      showGoodbyeSplash(presentation.fullName, presentation.avatarUrl);
      setTimeout(() => { window.location.href = window.location.origin + window.location.pathname; }, 3200);
    } catch(e) { console.error("Falha no logout:", e); window.location.reload(); }
  });
}

function showGoodbyeSplash(fullName, avatarUrl) {
  const splash = document.createElement("div");
  splash.id = "goodbyeSplash"; splash.className = "intro-splash intro-splash-welcome";
  const initials = getInitials(fullName);
  const mark = avatarUrl
    ? `<img class="intro-splash-mark intro-splash-avatar" src="${escapeHtml(avatarUrl)}">`
    : `<div class="intro-splash-mark intro-splash-avatar-fallback">${escapeHtml(initials)}</div>`;
  splash.innerHTML = `<div class="intro-splash-glow"></div><div class="intro-splash-card">${mark}<div class="intro-splash-copy"><strong>Até logo, ${escapeHtml(fullName)}!</strong><span>Sua sessão foi encerrada com sucesso.</span></div></div>`;
  document.body.appendChild(splash);
  setTimeout(() => splash.classList.add("is-hidden"), 2400);
}

// ============================================================
// CLOUD DATA — OWNED CARDS
// ============================================================
async function loadCloudData() {
  if (!supabase || !authUser) return;
  const [projectsRes, cardsRes] = await Promise.all([
    supabase.from("projects").select("id,name,created_at").eq("owner_id", authUser.id).order("created_at", { ascending: true }),
    supabase.from("cards").select("*").eq("owner_id", authUser.id).order("position", { ascending: true })
  ]);
  if (projectsRes.error) { console.error("Erro ao carregar projetos:", projectsRes.error); return; }
  if (cardsRes.error)    { console.error("Erro ao carregar cards:", cardsRes.error); return; }

  const nextState  = { currentProjectId: null, projects: [] };
  const projectMap = new Map();

  (projectsRes.data || []).forEach(project => {
    const item = { id: project.id, name: project.name, createdAt: project.created_at, columns: defaultColumns() };
    projectMap.set(project.id, item);
    nextState.projects.push(item);
  });

  (cardsRes.data || []).forEach(row => {
    const targetProject = projectMap.get(row.project_id);
    if (!targetProject) return;
    const columnKey = row.column_key || "todo";
    const card = {
      id: row.id, title: row.title || "Sem título", description: row.description || "",
      owner: row.owner || "", date: row.due_date || "",
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
  currentProjectId = nextState.projects.find(p => p.id === currentProjectId)?.id || nextState.projects[0]?.id || null;
  saveState();
  suspendCloudSync = false;
  renderProjects(); renderBoard();
}

// ============================================================
// SHARED CARDS — cards where user is participant (not owner)
// ============================================================
async function loadSharedCards() {
  if (!supabase || !authUser) { sharedCardsState = []; return; }

  // Load card_ids where I'm a participant
  const { data: participations, error: partErr } = await supabase
    .from("card_participants")
    .select("card_id")
    .eq("participant_user_id", authUser.id);

  if (partErr) { console.error("Erro ao carregar participações:", partErr); sharedCardsState = []; return; }
  if (!participations?.length) { sharedCardsState = []; renderProjects(); return; }

  const cardIds = participations.map(p => p.card_id);

  // Load the cards (RLS policy will allow this for participants)
  const { data: cards, error: cardsErr } = await supabase
    .from("cards")
    .select("*")
    .in("id", cardIds)
    .neq("owner_id", authUser.id); // exclude cards I already own

  if (cardsErr) { console.error("Erro ao carregar cards compartilhados:", cardsErr); sharedCardsState = []; return; }

  // Load projects info for those cards
  const projectIds = [...new Set((cards || []).map(c => c.project_id))];
  let projectNames = {};
  if (projectIds.length) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id,name,owner_id")
      .in("id", projectIds);
    (projects || []).forEach(p => { projectNames[p.id] = { name: p.name, ownerId: p.owner_id }; });
  }

  sharedCardsState = (cards || []).map(row => ({
    card: {
      id: row.id, title: row.title || "Sem título", description: row.description || "",
      owner: row.owner || "", date: row.due_date || "",
      labels: Array.isArray(row.labels) ? row.labels : [],
      participants: normalizeParticipants(Array.isArray(row.participants) ? row.participants : []),
      checklist: Array.isArray(row.checklist) ? row.checklist : [],
      comments: Array.isArray(row.comments) ? row.comments : [],
      createdAt: row.created_at || new Date().toISOString()
    },
    columnId: row.column_key || "todo",
    projectId: row.project_id,
    projectName: projectNames[row.project_id]?.name || "Projeto",
    ownerId: row.owner_id
  }));

  renderProjects();
  if (isViewingSharedProject) renderBoard();
}

// Helper: detect if a card is a shared card (user is participant, not owner)
function isSharedCard(cardId) {
  return sharedCardsState.some(sc => sc.card.id === cardId);
}

function findSharedCard(cardId) {
  return sharedCardsState.find(sc => sc.card.id === cardId) || null;
}

// ============================================================
// PARTICIPANT CARD ACTIONS — save directly to Supabase
// ============================================================

/**
 * Participant can update: title, description, checklist, comments, column_key
 * Participant CANNOT change: labels, owner, due_date, participants, delete card
 */
async function saveSharedCardUpdate(cardId, updates) {
  if (!supabase || !authUser) return false;
  const allowedFields = ["title", "description", "checklist", "comments", "column_key"];
  const payload = {};
  for (const key of allowedFields) {
    if (key in updates) payload[key] = updates[key];
  }
  const { error } = await supabase.from("cards").update(payload).eq("id", cardId);
  if (error) { console.error("Erro ao salvar card compartilhado:", error); return false; }
  return true;
}

async function moveSharedCardToColumn(cardId, newColumnKey) {
  const ok = await saveSharedCardUpdate(cardId, { column_key: newColumnKey });
  if (ok) {
    const sc = findSharedCard(cardId);
    if (sc) sc.columnId = newColumnKey;
    renderBoard();
  }
}

async function toggleSharedChecklistItem(cardId, itemId) {
  const sc = findSharedCard(cardId);
  if (!sc) return;
  const checklist = sc.card.checklist.map(item =>
    item.id === itemId ? { ...item, done: !item.done } : item
  );
  const ok = await saveSharedCardUpdate(cardId, { checklist });
  if (ok) {
    sc.card.checklist = checklist;
    renderBoard();
  }
  return ok;
}

async function addSharedCardComment(cardId, text) {
  const sc = findSharedCard(cardId);
  if (!sc) return false;
  const comments = [...sc.card.comments, {
    id: uid(), text,
    author: authUser ? getUserPresentation(authUser).fullName : "",
    createdAt: new Date().toISOString()
  }];
  const ok = await saveSharedCardUpdate(cardId, { comments });
  if (ok) sc.card.comments = comments;
  return ok;
}

async function handleSharedCardSave(cardId) {
  const title = cardTitleInput.value.trim();
  if (!title) { alert("Digite um título para o card."); cardTitleInput.focus(); return; }

  const updates = {
    title,
    description: cardDescInput.value.trim(),
    checklist: clone(tempChecklist),
    comments: clone(tempComments)
  };
  const ok = await saveSharedCardUpdate(cardId, updates);
  if (ok) {
    const sc = findSharedCard(cardId);
    if (sc) {
      sc.card.title = updates.title;
      sc.card.description = updates.description;
      sc.card.checklist = updates.checklist;
      sc.card.comments = updates.comments;
    }
    renderBoard();
    closeCardModal();
  } else {
    alert("Não foi possível salvar o card. Tente novamente.");
  }
}

// ============================================================
// CLOUD DATA — OWNED CARDS SYNC
// ============================================================
function clearDataForSignedOutUser() {
  suspendCloudSync = true;
  state = { currentProjectId: null, projects: [] };
  currentProjectId = null;
  sharedCardsState = [];
  isViewingSharedProject = false;
  saveState();
  suspendCloudSync = false;
  renderProjects(); renderBoard();
}

function queueCloudSync() {
  if (!supabase || !authUser || suspendCloudSync) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    syncAllToCloud().catch(error => console.error("Erro ao sincronizar com o Supabase:", error));
  }, 400);
}

function flattenCardsForCloud() {
  const rows = [];
  state.projects.forEach(project => {
    Object.entries(project.columns || {}).forEach(([columnKey, cards]) => {
      (cards || []).forEach((card, index) => {
        rows.push({
          id: String(card.id), owner_id: authUser.id, project_id: String(project.id),
          column_key: columnKey, position: index,
          title: card.title || "Sem título", description: card.description || "",
          owner: card.owner || "", due_date: card.date || null,
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
  state.projects.forEach(project => {
    Object.values(project.columns || {}).flat().forEach(card => {
      normalizeParticipants(card.participants || []).forEach(participant => {
        if (!participant.user_id) return;
        rows.push({
          card_id: String(card.id), participant_user_id: participant.user_id,
          owner_id: authUser.id, project_id: String(project.id),
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
    const projectRows = state.projects.map(project => ({
      id: String(project.id), owner_id: authUser.id,
      name: project.name, created_at: project.createdAt || new Date().toISOString()
    }));

    const remoteProjectsRes = await supabase.from("projects").select("id").eq("owner_id", authUser.id);
    if (remoteProjectsRes.error) throw remoteProjectsRes.error;
    const remoteProjectIds = (remoteProjectsRes.data || []).map(r => r.id);
    const localProjectIds  = projectRows.map(r => r.id);

    if (projectRows.length) {
      const up = await supabase.from("projects").upsert(projectRows, { onConflict: "id" });
      if (up.error) throw up.error;
    }
    const projectsToDelete = remoteProjectIds.filter(id => !localProjectIds.includes(id));
    if (projectsToDelete.length) {
      const d = await supabase.from("projects").delete().eq("owner_id", authUser.id).in("id", projectsToDelete);
      if (d.error) throw d.error;
    }
    if (!localProjectIds.length && remoteProjectIds.length) {
      const d = await supabase.from("projects").delete().eq("owner_id", authUser.id);
      if (d.error) throw d.error;
    }

    const cardRows = flattenCardsForCloud();
    const remoteCardsRes = await supabase.from("cards").select("id").eq("owner_id", authUser.id);
    if (remoteCardsRes.error) throw remoteCardsRes.error;
    const remoteCardIds = (remoteCardsRes.data || []).map(r => r.id);
    const localCardIds  = cardRows.map(r => r.id);

    if (cardRows.length) {
      const up = await supabase.from("cards").upsert(cardRows, { onConflict: "id" });
      if (up.error) throw up.error;
    }
    const cardsToDelete = remoteCardIds.filter(id => !localCardIds.includes(id));
    if (cardsToDelete.length) {
      const d = await supabase.from("cards").delete().eq("owner_id", authUser.id).in("id", cardsToDelete);
      if (d.error) throw d.error;
    }
    if (!localCardIds.length && remoteCardIds.length) {
      const d = await supabase.from("cards").delete().eq("owner_id", authUser.id);
      if (d.error) throw d.error;
    }

    const participantRows = flattenParticipantLinks();
    const remoteParticipantsRes = await supabase.from("card_participants").select("card_id,participant_user_id").eq("owner_id", authUser.id);
    if (remoteParticipantsRes.error) throw remoteParticipantsRes.error;
    const remoteKeys = (remoteParticipantsRes.data || []).map(r => `${r.card_id}::${r.participant_user_id}`);
    const localKeys  = participantRows.map(r => `${r.card_id}::${r.participant_user_id}`);

    if (participantRows.length) {
      const up = await supabase.from("card_participants").upsert(participantRows, { onConflict: "card_id,participant_user_id" });
      if (up.error) throw up.error;
    }
    const participantDeletes = remoteKeys.filter(key => !localKeys.includes(key));
    for (const key of participantDeletes) {
      const [card_id, participant_user_id] = key.split("::");
      const d = await supabase.from("card_participants").delete()
        .eq("owner_id", authUser.id).eq("card_id", card_id).eq("participant_user_id", participant_user_id);
      if (d.error) throw d.error;
    }
  } finally { isSyncingCloud = false; }
}

// ============================================================
// WELCOME SPLASH
// ============================================================
function maybeShowLoginWelcome(user) {
  if (!user) return;
  let shouldShow = false;
  try { shouldShow = hasPendingLoginWelcome(); if (shouldShow) sessionStorage.removeItem(LOGIN_WELCOME_PENDING_KEY); } catch(_) {}
  if (!shouldShow) return;
  const { fullName, avatarUrl } = getUserPresentation(user);
  showWelcomeSplash(fullName, avatarUrl);
}

function showWelcomeSplash(fullName, avatarUrl) {
  const existing = document.getElementById("welcomeSplash");
  if (existing) existing.remove();
  const splash = document.createElement("div");
  splash.id = "welcomeSplash"; splash.className = "intro-splash intro-splash-welcome";
  splash.setAttribute("aria-hidden", "true");
  const initials = getInitials(fullName);
  const safeName  = escapeHtml(fullName);
  const safeAvatar = escapeHtml(avatarUrl);
  const mark = avatarUrl
    ? `<img class="intro-splash-mark intro-splash-avatar" src="${safeAvatar}" alt="Avatar de ${safeName}">`
    : `<div class="intro-splash-mark intro-splash-avatar-fallback">${escapeHtml(initials)}</div>`;
  splash.innerHTML = `<div class="intro-splash-glow"></div><div class="intro-splash-card">${mark}<div class="intro-splash-copy"><strong>Olá ${safeName}, seja bem-vindo ao seu Kanban!</strong><span>Seu espaço já está pronto para começar.</span></div></div>`;
  document.body.appendChild(splash);
  setTimeout(() => splash.classList.add("is-hidden"), 2900);
  setTimeout(() => splash.remove(), 4100);
}

// ============================================================
// AUTH UI
// ============================================================
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
    profileName.textContent = fullName; profileEmail.textContent = email;
    profileAvatarFallback.textContent = initials;
    brandUserName.textContent = fullName; brandMark.textContent = initials;
    fillProfileForm();
    if (avatarUrl) {
      profileAvatar.src = avatarUrl; profileAvatar.classList.remove("hidden"); profileAvatarFallback.classList.add("hidden");
      brandAvatar.src = avatarUrl; brandAvatar.classList.remove("hidden"); brandMark.classList.add("hidden");
    } else {
      profileAvatar.removeAttribute("src"); profileAvatar.classList.add("hidden"); profileAvatarFallback.classList.remove("hidden");
      brandAvatar.removeAttribute("src"); brandAvatar.classList.add("hidden"); brandMark.classList.remove("hidden");
    }
  } else {
    profileName.textContent = "Visitante"; profileEmail.textContent = "Faça login para conectar sua conta.";
    profileAvatarFallback.textContent = "KQ";
    profileAvatar.removeAttribute("src"); profileAvatar.classList.add("hidden"); profileAvatarFallback.classList.remove("hidden");
    brandUserName.textContent = "Kanban Quest"; brandMark.textContent = "KQ";
    brandAvatar.removeAttribute("src"); brandAvatar.classList.add("hidden"); brandMark.classList.remove("hidden");
    if (profilePhoneInput) profilePhoneInput.value = "";
    if (profileSectorInput) profileSectorInput.value = "";
    if (profileBioInput) profileBioInput.value = "";
  }
  updateCreationAccess(); renderProjects(); renderBoard();
}

function getInitials(name) {
  return String(name || "KQ").trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join("") || "KQ";
}

function openAuthModal() {
  if (authUser) return;
  authConfigHint.classList.toggle("hidden", isSupabaseConfigured());
  googleLoginBtn.disabled = !isSupabaseConfigured();
  openModal(authModalOverlay);
}
function closeAuthModal()    { closeModal(authModalOverlay); }
function openProfileModal()  { if (profileRecord) fillProfileForm(); openModal(profileModalOverlay); }
function closeProfileModal() { closeModal(profileModalOverlay); }

async function handleGoogleLogin() {
  if (!supabase) { authConfigHint.classList.remove("hidden"); return; }
  try {
    try { sessionStorage.setItem(LOGIN_WELCOME_PENDING_KEY, "1"); } catch(_) {}
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href.split("#")[0] }});
  } catch(error) { console.error("Erro no login com Google:", error); alert("Não foi possível iniciar o login com Google."); }
}

// ============================================================
// PARTICIPANTS HELPERS
// ============================================================
function participantDisplayName(p) { if (!p) return ""; return p.full_name || p.name || p.email || String(p); }
function participantEmail(p)        { if (!p || typeof p === "string") return ""; return p.email || ""; }

function normalizeParticipant(p) {
  if (!p) return null;
  if (typeof p === "string") return { user_id: null, full_name: p, email: "", avatar_url: "" };
  return {
    user_id: p.user_id || p.id || null,
    full_name: p.full_name || p.name || p.email || "Participante",
    email: p.email || "", avatar_url: p.avatar_url || p.picture || ""
  };
}
function normalizeParticipants(participants) {
  return (Array.isArray(participants) ? participants : []).map(normalizeParticipant).filter(Boolean);
}

function renderSelectedParticipants() {
  if (!selectedParticipantsList) return;
  selectedParticipantsList.innerHTML = "";
  if (!tempParticipants.length) {
    selectedParticipantsList.innerHTML = `<div class="participant-search-empty">Nenhum participante selecionado.</div>`; return;
  }
  tempParticipants.forEach(p => {
    const row = document.createElement("div");
    row.className = "selected-participant-item";
    const initials = getInitials(participantDisplayName(p));
    row.innerHTML = `
      <div class="selected-participant-main">
        ${p.avatar_url ? `<img class="selected-participant-avatar" src="${escapeHtml(p.avatar_url)}" alt="${escapeHtml(participantDisplayName(p))}">` : `<div class="selected-participant-avatar">${escapeHtml(initials)}</div>`}
        <div class="selected-participant-copy">
          <strong>${escapeHtml(participantDisplayName(p))}</strong>
          <span>${escapeHtml(participantEmail(p) || "Participante adicionado")}</span>
        </div>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>`;
    row.querySelector("button").addEventListener("click", () => removeParticipantFromTemp(p.user_id || p.email || participantDisplayName(p)));
    selectedParticipantsList.appendChild(row);
  });
}

function renderParticipantSearchResults() {
  if (!participantSearchResultsEl) return;
  participantSearchResultsEl.innerHTML = "";
  if (!participantSearchResults.length) return;
  participantSearchResults.forEach(p => {
    const row = document.createElement("div");
    row.className = "participant-result-item";
    const initials = getInitials(participantDisplayName(p));
    row.innerHTML = `
      <div class="participant-result-main">
        ${p.avatar_url ? `<img class="participant-result-avatar" src="${escapeHtml(p.avatar_url)}" alt="${escapeHtml(participantDisplayName(p))}">` : `<div class="participant-result-avatar">${escapeHtml(initials)}</div>`}
        <div class="participant-result-copy">
          <strong>${escapeHtml(participantDisplayName(p))}</strong>
          <span>${escapeHtml(participantEmail(p) || "Usuário cadastrado")}</span>
        </div>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Adicionar</button>`;
    row.querySelector("button").addEventListener("click", () => addParticipantToTemp(p));
    participantSearchResultsEl.appendChild(row);
  });
}

function addParticipantToTemp(p) {
  const normalized = normalizeParticipant(p);
  const key = normalized.user_id || normalized.email || participantDisplayName(normalized);
  const exists = tempParticipants.some(item => (item.user_id || item.email || participantDisplayName(item)) === key);
  if (exists) return;
  tempParticipants.push(normalized);
  renderSelectedParticipants();
}

function removeParticipantFromTemp(key) {
  tempParticipants = tempParticipants.filter(item => (item.user_id || item.email || participantDisplayName(item)) !== key);
  renderSelectedParticipants();
}

async function handleCheckParticipant() {
  if (!requireAuth("buscar participantes")) return;
  const term = cardParticipantsInput?.value.trim();
  if (!term) { participantSearchResults = []; renderParticipantSearchResults(); return; }
  if (!supabase) { alert("Configure o Supabase para buscar participantes."); return; }
  let data = null;
  const rpcResult = await supabase.rpc("search_profiles", { search_term: term });
  if (!rpcResult.error) {
    data = rpcResult.data;
  } else {
    const fallback = await supabase.from("profiles").select("user_id,full_name,email,avatar_url")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(8);
    if (fallback.error) { console.error("Erro ao buscar participantes:", fallback.error); alert("Não foi possível buscar participantes."); return; }
    data = fallback.data;
  }
  participantSearchResults = normalizeParticipants(data || []).filter(p => p.user_id !== authUser.id);
  if (!participantSearchResults.length) {
    participantSearchResultsEl.innerHTML = `<div class="participant-search-empty">Nenhum usuário encontrado para "${escapeHtml(term)}".</div>`; return;
  }
  renderParticipantSearchResults();
}

// ============================================================
// LOCAL STATE
// ============================================================
function safeGetItem(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSetItem(key, value) { try { localStorage.setItem(key, value); } catch {} }

function loadState() {
  try {
    const saved = safeGetItem(STORAGE_KEY);
    if (!saved) return { currentProjectId: null, projects: [] };
    return JSON.parse(saved);
  } catch { return { currentProjectId: null, projects: [] }; }
}

function saveState() {
  state.currentProjectId = currentProjectId;
  safeSetItem(STORAGE_KEY, JSON.stringify(state));
  if (!suspendCloudSync) queueCloudSync();
}

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

function createProject(name) {
  return { id: uid(), name: name.trim(), createdAt: new Date().toISOString(), columns: defaultColumns() };
}

function getCurrentProject() {
  if (isViewingSharedProject) return null;
  return state.projects.find(p => p.id === currentProjectId);
}

function migrateOldData() {
  state.projects.forEach(project => {
    Object.keys(project.columns).forEach(columnId => {
      project.columns[columnId] = project.columns[columnId].map(card => ({
        id: card.id || uid(), title: card.title || "Sem título", description: card.description || "",
        owner: card.owner || "", date: card.date || "",
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

// ============================================================
// RENDER PROJECTS (with "Shared" section)
// ============================================================
function renderProjects() {
  projectList.innerHTML = "";
  if (!authUser) {
    const empty = document.createElement("li");
    empty.className = "project-empty-state";
    empty.textContent = "Faça login para ver e criar projetos.";
    projectList.appendChild(empty); return;
  }

  if (!state.projects.length && !sharedCardsState.length) {
    const empty = document.createElement("li");
    empty.className = "project-empty-state";
    empty.textContent = "Nenhum projeto criado ainda.";
    projectList.appendChild(empty); return;
  }

  // Own projects
  state.projects.forEach(project => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="project-item-name">${escapeHtml(project.name)}</span>
      <button class="project-edit-btn" type="button" aria-label="Editar projeto" title="Editar projeto">⋯</button>`;
    if (project.id === currentProjectId && !isViewingSharedProject) li.classList.add("active");
    li.addEventListener("click", () => {
      currentProjectId = project.id;
      isViewingSharedProject = false;
      saveState(); renderProjects(); renderBoard(); closeProjectActionsMenu();
    });
    const editBtn = li.querySelector(".project-edit-btn");
    editBtn.addEventListener("click", e => {
      e.stopPropagation();
      currentProjectId = project.id; isViewingSharedProject = false;
      saveState(); renderProjects(); renderBoard(); toggleProjectActionsMenu(editBtn);
    });
    projectList.appendChild(li);
  });

  // Shared cards section
  if (sharedCardsState.length) {
    const sep = document.createElement("li");
    sep.className = "shared-project-separator";
    sep.textContent = "📤 Compartilhados comigo";
    projectList.appendChild(sep);

    const sharedLi = document.createElement("li");
    sharedLi.innerHTML = `<span class="project-item-name">🤝 Cards compartilhados (${sharedCardsState.length})</span>`;
    if (isViewingSharedProject) sharedLi.classList.add("active");
    sharedLi.addEventListener("click", () => {
      isViewingSharedProject = true;
      currentProjectId = null;
      saveState(); renderProjects(); renderBoard();
    });
    projectList.appendChild(sharedLi);
  }
}

// ============================================================
// RENDER BOARD
// ============================================================
function renderBoard() {
  if (isViewingSharedProject) {
    renderSharedBoard();
    return;
  }

  const project = authUser ? getCurrentProject() : null;
  if (!project) {
    boardTitle.textContent = authUser ? "Nenhum projeto" : "Faça login para começar";
    projectCount.textContent = authUser ? "0 projeto(s) no total" : "Entre com Google para criar seu primeiro projeto";
    renderColumn("todo", []); renderColumn("doing", []); renderColumn("done", []);
    countTodo.textContent = 0; countDoing.textContent = 0; countDone.textContent = 0;
    updateDashboard({ columns: defaultColumns() }); updateCreationAccess(); return;
  }

  boardTitle.textContent = project.name;
  projectCount.textContent = `${state.projects.length} projeto(s) no total`;
  renderColumn("todo",  project.columns.todo);
  renderColumn("doing", project.columns.doing);
  renderColumn("done",  project.columns.done);
  countTodo.textContent  = project.columns.todo.length;
  countDoing.textContent = project.columns.doing.length;
  countDone.textContent  = project.columns.done.length;
  updateDashboard(project); updateCreationAccess();
}

function renderSharedBoard() {
  boardTitle.textContent = "Cards compartilhados comigo";
  projectCount.textContent = `${sharedCardsState.length} card(s) compartilhado(s)`;

  // Group by column
  const byColumn = { todo: [], doing: [], done: [] };
  sharedCardsState.forEach(sc => {
    const col = sc.columnId || "todo";
    if (!byColumn[col]) byColumn[col] = [];
    byColumn[col].push(sc.card);
  });

  renderColumn("todo",  byColumn.todo,  true);
  renderColumn("doing", byColumn.doing, true);
  renderColumn("done",  byColumn.done,  true);
  countTodo.textContent  = byColumn.todo.length;
  countDoing.textContent = byColumn.doing.length;
  countDone.textContent  = byColumn.done.length;

  // Dashboard for shared
  const fakeProject = { columns: byColumn };
  updateDashboard(fakeProject);
  updateCreationAccess();
}

function renderColumn(columnId, cards, isShared = false) {
  const container = document.querySelector(`.column[data-col="${columnId}"] .cards`);
  container.innerHTML = "";
  const query = searchInput.value.trim().toLowerCase();

  const filtered = cards.filter(card => {
    if (!query) return true;
    const searchText = [
      card.title, card.description, card.owner,
      ...(card.labels || []),
      ...normalizeParticipants(card.participants || []).map(p => `${participantDisplayName(p)} ${participantEmail(p)}`),
      ...(card.comments || []).map(c => c.text),
      ...(card.checklist || []).map(i => i.text)
    ].join(" ").toLowerCase();
    return searchText.includes(query);
  });

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = query ? "Nenhum card encontrado." : "Nenhum card nesta coluna.";
    container.appendChild(empty); return;
  }

  filtered.forEach(card => {
    const cardEl = document.createElement("article");
    cardEl.className = "card";
    cardEl.draggable = !isShared; // participants can't drag-drop (they use the dropdown in view)
    cardEl.dataset.cardId = card.id;

    const labelsHtml = (card.labels || []).filter(Boolean).map(l => `<span class="label">${escapeHtml(l)}</span>`).join("");
    const meta = [];
    if (card.owner) meta.push(`<span class="meta-chip">👤 ${escapeHtml(card.owner)}</span>`);
    if (card.date)  meta.push(`<span class="meta-chip">Prazo: ${formatDate(card.date)}</span>`);

    const checklist  = card.checklist || [];
    const doneItems  = checklist.filter(i => i.done).length;
    const checkPct   = checklist.length ? Math.round((doneItems / checklist.length) * 100) : 0;
    const checkHtml  = checklist.length ? `
      <div class="card-checklist">
        <div class="card-checklist-title"><span>Checklist</span><span>${doneItems}/${checklist.length}</span></div>
        <div class="card-checklist-items">
          ${checklist.slice(0, 3).map(i => `<div class="card-check-item ${i.done ? "done" : ""}"><span class="card-check-bullet"></span><span>${escapeHtml(i.text)}</span></div>`).join("")}
        </div>
        <div class="card-progress"><div class="card-progress-fill" style="width:${checkPct}%"></div></div>
      </div>` : "";

    const commentsCount = (card.comments || []).length;
    const participants  = normalizeParticipants(card.participants || []);
    const participantsHtml = participants.length
      ? `<div class="card-participants">${participants.slice(0, 3).map(p => `<span class="participant-chip">${escapeHtml(participantDisplayName(p))}</span>`).join("")}${participants.length > 3 ? `<span class="participant-chip participant-chip-more">+${participants.length - 3}</span>` : ""}</div>` : "";

    const sharedBadge = isShared ? `<span class="card-shared-badge">🤝 Compartilhado</span><br>` : "";

    cardEl.innerHTML = `
      ${sharedBadge}
      <h4 class="card-title">${escapeHtml(card.title || "Sem título")}</h4>
      <p class="card-desc">${escapeHtml(truncate(card.description || "Sem descrição.", 140))}</p>
      ${labelsHtml ? `<div class="card-labels">${labelsHtml}</div>` : ""}
      ${meta.length ? `<div class="card-meta">${meta.join("")}</div>` : ""}
      ${checkHtml}
      ${participantsHtml}
      <div class="card-comments-row">
        <span class="card-comments-info">💬 ${commentsCount} comentário(s)</span>
        <div class="card-actions">
          <button class="btn btn-soft btn-sm edit-card-btn" type="button">${isShared ? "Editar (participante)" : "Editar"}</button>
        </div>
      </div>`;

    cardEl.addEventListener("click", e => {
      if (e.target.closest(".edit-card-btn")) return;
      openViewCardModal(card.id);
    });

    cardEl.querySelector(".edit-card-btn").addEventListener("click", e => {
      e.stopPropagation();
      openCardModal("edit", columnId, card.id);
    });

    if (!isShared) {
      cardEl.addEventListener("dragstart", e => { cardEl.classList.add("dragging"); e.dataTransfer.setData("text/plain", card.id); e.dataTransfer.effectAllowed = "move"; });
      cardEl.addEventListener("dragend", () => { cardEl.classList.remove("dragging"); document.querySelectorAll(".cards").forEach(el => el.classList.remove("drag-over")); });
    }

    container.appendChild(cardEl);
  });
}

// ============================================================
// PROJECT MODAL
// ============================================================
function openProjectModal(mode) {
  if (!requireAuth(mode === "create" ? "criar projetos" : "editar projetos")) return;
  projectModalMode = mode;
  if (mode === "create") { projectModalTitle.textContent = "Novo Projeto"; projectNameInput.value = ""; }
  else {
    const project = getCurrentProject();
    if (!project) return;
    projectModalTitle.textContent = "Renomear Projeto"; projectNameInput.value = project.name;
  }
  openModal(projectModalOverlay);
  setTimeout(() => { projectNameInput.focus(); projectNameInput.select(); }, 90);
}
function closeProjectModal() { closeModal(projectModalOverlay); }

function handleSaveProject() {
  if (!requireAuth("salvar projetos")) return;
  const name = projectNameInput.value.trim();
  if (!name) { alert("Digite um nome para o projeto."); projectNameInput.focus(); return; }
  if (projectModalMode === "create") {
    const exists = state.projects.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) { alert("Já existe um projeto com esse nome."); return; }
    const newProject = createProject(name);
    state.projects.push(newProject); currentProjectId = newProject.id; isViewingSharedProject = false;
  } else {
    const currentProject = getCurrentProject();
    if (!currentProject) return;
    const exists = state.projects.some(p => p.id !== currentProject.id && p.name.toLowerCase() === name.toLowerCase());
    if (exists) { alert("Já existe outro projeto com esse nome."); return; }
    currentProject.name = name;
  }
  saveState(); renderProjects(); renderBoard(); closeProjectModal();
}

function handleDeleteProject() {
  if (!requireAuth("excluir projetos")) return;
  const project = getCurrentProject();
  if (!project) return;
  const ok = confirm(`Deseja excluir o projeto "${project.name}"?`);
  if (!ok) return;
  state.projects = state.projects.filter(p => p.id !== project.id);
  currentProjectId = state.projects[0]?.id || null;
  saveState(); renderProjects(); renderBoard();
}

// ============================================================
// CARD MODAL — OWNER + PARTICIPANT MODES
// ============================================================
function openCardModal(mode, columnId, cardId = null) {
  if (!requireAuth(mode === "create" ? "criar cards" : "editar cards")) return;

  // Check if it's a shared card
  const shared = cardId ? findSharedCard(cardId) : null;

  if (!shared && !getCurrentProject()) {
    if (!isViewingSharedProject) { alert("Crie um projeto antes de adicionar cards."); return; }
  }

  currentTargetColumn  = columnId;
  currentEditingCardId = null;
  tempChecklist        = [];
  tempComments         = [];
  tempParticipants     = [];
  participantSearchResults = [];

  if (mode === "create") {
    cardModalTitle.textContent = "Novo Card";
    deleteCardBtn.classList.add("hidden");
    cardTitleInput.value  = ""; cardDescInput.value  = "";
    cardOwnerInput.value  = authUser ? getUserPresentation(authUser).fullName : "";
    cardDateInput.value   = ""; cardLabelsInput.value = "";
    if (cardParticipantsInput) cardParticipantsInput.value = "";
    // Show all fields for owner
    setOwnerOnlyFields(true);
  } else {
    const found = shared ? { card: shared.card, columnId: shared.columnId } : findCard(cardId);
    if (!found) return;

    currentEditingCardId = cardId;
    currentTargetColumn  = found.columnId;
    cardModalTitle.textContent = shared ? "Editar Card (Participante)" : "Editar Card";

    cardTitleInput.value = found.card.title || "";
    cardDescInput.value  = found.card.description || "";

    if (shared) {
      // PARTICIPANT MODE: restrict fields
      setOwnerOnlyFields(false);
      deleteCardBtn.classList.add("hidden");
      cardOwnerInput.value  = found.card.owner || "";
      cardDateInput.value   = found.card.date  || "";
      cardLabelsInput.value = (found.card.labels || []).join(", ");
      if (cardParticipantsInput) cardParticipantsInput.value = "";
    } else {
      // OWNER MODE: all fields
      setOwnerOnlyFields(true);
      deleteCardBtn.classList.remove("hidden");
      cardOwnerInput.value  = found.card.owner || "";
      cardDateInput.value   = found.card.date  || "";
      cardLabelsInput.value = (found.card.labels || []).join(", ");
      if (cardParticipantsInput) cardParticipantsInput.value = "";
      tempParticipants = normalizeParticipants(found.card.participants || []);
    }
    tempChecklist = clone(found.card.checklist || []);
    tempComments  = clone(found.card.comments  || []);
  }

  // Show participant notice if shared
  injectParticipantNotice(!!shared);

  renderSelectedParticipants();
  renderParticipantSearchResults();
  renderEditChecklist();
  renderEditComments();
  openModal(cardModalOverlay);
  setTimeout(() => { cardTitleInput.focus(); cardTitleInput.select(); }, 90);
}

function setOwnerOnlyFields(visible) {
  const ownerFields = [
    document.querySelector(".field:has(#cardOwnerInput)"),
    document.querySelector(".field:has(#cardDateInput)"),
    document.querySelector(".field:has(#cardLabelsInput)"),
    document.querySelector(".field:has(#cardParticipantsInput)")
  ];
  // grid-2 wraps owner + date
  const gridTwo = document.querySelector(".grid-2");
  if (gridTwo) gridTwo.style.display = visible ? "" : "none";
  // labels and participants
  const labelsField = cardLabelsInput?.closest(".field");
  const participantsField = cardParticipantsInput?.closest(".field");
  if (labelsField) labelsField.style.display = visible ? "" : "none";
  if (participantsField) participantsField.style.display = visible ? "" : "none";
}

function injectParticipantNotice(isParticipant) {
  const existing = document.getElementById("participant-notice-inline");
  if (existing) existing.remove();
  if (!isParticipant) return;
  const notice = document.createElement("div");
  notice.id = "participant-notice-inline";
  notice.className = "participant-notice";
  notice.innerHTML = `<span>🤝</span><span><strong>Modo Participante</strong> — você pode editar título, descrição, checklist e comentários. Para mover o card, use o botão "Ver" e depois "Mover para".</span>`;
  const modalBody = cardModalOverlay.querySelector(".modal-body");
  modalBody.insertBefore(notice, modalBody.firstChild);
}

function closeCardModal() { closeModal(cardModalOverlay); }

async function handleSaveCard() {
  if (!requireAuth("salvar cards")) return;

  // Shared card save
  if (currentEditingCardId && isSharedCard(currentEditingCardId)) {
    await handleSharedCardSave(currentEditingCardId);
    return;
  }

  // Owner save
  const title = cardTitleInput.value.trim();
  if (!title) { alert("Digite um título para o card."); cardTitleInput.focus(); return; }
  const project = getCurrentProject();
  if (!project) return;

  const cardData = {
    id: currentEditingCardId || uid(), title,
    description: cardDescInput.value.trim(),
    owner: cardOwnerInput.value.trim() || (authUser ? getUserPresentation(authUser).fullName : ""),
    date: cardDateInput.value,
    labels: cardLabelsInput.value.split(",").map(l => l.trim()).filter(Boolean),
    participants: clone(tempParticipants),
    checklist: clone(tempChecklist),
    comments: clone(tempComments),
    createdAt: currentEditingCardId ? (findCard(currentEditingCardId)?.card.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (currentEditingCardId) {
    const found = findCard(currentEditingCardId);
    if (!found) return;
    project.columns[found.columnId] = project.columns[found.columnId].filter(c => c.id !== currentEditingCardId);
    project.columns[currentTargetColumn].push(cardData);
  } else {
    project.columns[currentTargetColumn].push(cardData);
  }

  saveState(); renderBoard(); closeCardModal();
}

function handleDeleteCard() {
  if (!requireAuth("excluir cards")) return;
  if (!currentEditingCardId) return;
  // Participants cannot delete
  if (isSharedCard(currentEditingCardId)) { alert("Participantes não podem excluir cards."); return; }
  const ok = confirm("Deseja excluir este card?");
  if (!ok) return;
  const project = getCurrentProject();
  if (!project) return;
  const found = findCard(currentEditingCardId);
  if (!found) return;
  project.columns[found.columnId] = project.columns[found.columnId].filter(c => c.id !== currentEditingCardId);
  saveState(); renderBoard(); closeCardModal();
}

function handleAddChecklistItem() {
  const text = newChecklistItemInput.value.trim();
  if (!text) return;
  tempChecklist.push({ id: uid(), text, done: false });
  newChecklistItemInput.value = "";
  renderEditChecklist();
}

function handleAddComment() {
  const text = newCommentInput.value.trim();
  if (!text) return;
  tempComments.push({ id: uid(), text, author: authUser ? getUserPresentation(authUser).fullName : "", createdAt: new Date().toISOString() });
  newCommentInput.value = "";
  renderEditComments();
}

function renderEditChecklist() {
  editChecklistList.innerHTML = "";
  if (!tempChecklist.length) { editChecklistList.innerHTML = `<div class="empty-state">Nenhum item no checklist.</div>`; return; }
  tempChecklist.forEach(item => {
    const row = document.createElement("div");
    row.className = "edit-item";
    row.innerHTML = `
      <div class="edit-item-left">
        <input type="checkbox" ${item.done ? "checked" : ""} />
        <span>${escapeHtml(item.text)}</span>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>`;
    row.querySelector("input").addEventListener("change", e => { item.done = e.target.checked; });
    row.querySelector("button").addEventListener("click", () => { tempChecklist = tempChecklist.filter(c => c.id !== item.id); renderEditChecklist(); });
    editChecklistList.appendChild(row);
  });
}

function renderEditComments() {
  editCommentsList.innerHTML = "";
  if (!tempComments.length) { editCommentsList.innerHTML = `<div class="empty-state">Nenhum comentário.</div>`; return; }
  tempComments.forEach(comment => {
    const row = document.createElement("div");
    row.className = "edit-item";
    row.innerHTML = `
      <div class="edit-item-left">
        <span>${escapeHtml(comment.text)}${comment.author ? ` — ${escapeHtml(comment.author)}` : ""}</span>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>`;
    row.querySelector("button").addEventListener("click", () => { tempComments = tempComments.filter(c => c.id !== comment.id); renderEditComments(); });
    editCommentsList.appendChild(row);
  });
}

// ============================================================
// VIEW CARD MODAL — OWNER + PARTICIPANT MODES
// ============================================================
function openViewCardModal(cardId) {
  const sharedEntry = findSharedCard(cardId);
  const found       = sharedEntry ? { card: sharedEntry.card, columnId: sharedEntry.columnId } : findCard(cardId);
  if (!found) return;

  const { card, columnId } = found;
  const isParticipant = Boolean(sharedEntry);

  viewCardTitle.textContent       = card.title || "Sem título";
  viewCardDescription.textContent = card.description || "Sem descrição.";
  viewCardColumn.textContent      = `Coluna: ${columnLabel(columnId)}`;

  if (card.owner) { viewCardOwner.textContent = `👤 ${card.owner}`; viewCardOwner.classList.remove("hidden"); }
  else { viewCardOwner.classList.add("hidden"); }
  if (card.date) { viewCardDate.textContent = `Prazo: ${formatDate(card.date)}`; viewCardDate.classList.remove("hidden"); }
  else { viewCardDate.classList.add("hidden"); }

  viewCardLabels.innerHTML = "";
  if ((card.labels || []).length) {
    card.labels.forEach(l => { const s = document.createElement("span"); s.className = "label"; s.textContent = l; viewCardLabels.appendChild(s); });
  } else { viewCardLabels.innerHTML = `<div class="empty-state">Nenhuma label.</div>`; }

  const participants = normalizeParticipants(card.participants || []);
  viewParticipantsCounter.textContent = `${participants.length}`;
  viewCardParticipants.innerHTML = "";
  if (participants.length) {
    participants.forEach(p => { const chip = document.createElement("span"); chip.className = "participant-chip"; chip.textContent = participantDisplayName(p); viewCardParticipants.appendChild(chip); });
  } else { viewCardParticipants.innerHTML = `<div class="empty-state">Nenhum participante.</div>`; }

  // Checklist
  const checklist  = card.checklist || [];
  const doneItems  = checklist.filter(i => i.done).length;
  const percent    = checklist.length ? Math.round((doneItems / checklist.length) * 100) : 0;
  viewChecklistCounter.textContent = `${doneItems}/${checklist.length}`;
  viewChecklistProgress.style.width = `${percent}%`;
  viewChecklistList.innerHTML = "";
  if (checklist.length) {
    checklist.forEach(item => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `view-check-item is-clickable ${item.done ? "done" : ""}`;
      row.innerHTML = `<span class="view-check-bullet"></span><span>${escapeHtml(item.text)}</span>`;
      row.addEventListener("click", async () => {
        if (isParticipant) {
          const ok = await toggleSharedChecklistItem(card.id, item.id);
          if (ok) { openViewCardModal(card.id); }
        } else {
          item.done = !item.done; saveState(); openViewCardModal(card.id); renderBoard();
        }
      });
      viewChecklistList.appendChild(row);
    });
  } else { viewChecklistList.innerHTML = `<div class="empty-state">Nenhum item no checklist.</div>`; }

  // Comments
  const comments = card.comments || [];
  viewCommentsCounter.textContent = `${comments.length}`;
  viewCommentsList.innerHTML = "";
  if (comments.length) {
    comments.forEach(comment => {
      const row = document.createElement("div");
      row.className = "view-comment-item";
      row.innerHTML = `
        <div class="view-comment-text">${escapeHtml(comment.text)}</div>
        <div class="view-comment-meta-row">
          <div class="view-comment-meta">${comment.author ? `${escapeHtml(comment.author)} · ` : ""}${formatDateTime(comment.createdAt)}</div>
          ${!isParticipant ? `<button type="button" class="btn btn-soft btn-sm">Remover</button>` : ""}
        </div>`;
      if (!isParticipant) {
        row.querySelector("button").addEventListener("click", () => {
          card.comments = (card.comments || []).filter(c => c.id !== comment.id);
          saveState(); openViewCardModal(card.id); renderBoard();
        });
      }
      viewCommentsList.appendChild(row);
    });
  } else { viewCommentsList.innerHTML = `<div class="empty-state">Nenhum comentário.</div>`; }

  // "Mover para" section — shown for both owner (convenience) and participant
  injectMoveSection(card.id, columnId, isParticipant);

  // Edit button — show for owner, hide for participant (they use the modal directly)
  if (isParticipant) {
    viewEditCardBtn.style.display = "none";
  } else {
    viewEditCardBtn.style.display = "";
    viewEditCardBtn.dataset.cardId = card.id;
  }

  // Participant notice in view modal
  injectViewParticipantNotice(isParticipant);

  openModal(viewCardModalOverlay);
}

function injectViewParticipantNotice(isParticipant) {
  const existing = document.getElementById("view-participant-notice");
  if (existing) existing.remove();
  if (!isParticipant) return;
  const notice = document.createElement("div");
  notice.id = "view-participant-notice";
  notice.className = "participant-notice";
  notice.style.marginBottom = "12px";
  notice.innerHTML = `<span>🤝</span><span><strong>Você é participante</strong> deste card. Pode marcar checklist, adicionar comentários e mover o card.</span>`;
  const modalBody = viewCardModalOverlay.querySelector(".modal-body");
  modalBody.insertBefore(notice, modalBody.firstChild);
}

function injectMoveSection(cardId, currentCol, isParticipant) {
  const existing = document.getElementById("view-move-section");
  if (existing) existing.remove();

  const section = document.createElement("div");
  section.id = "view-move-section";
  section.className = "view-section";
  section.innerHTML = `
    <h4>Mover para</h4>
    <div class="view-move-section">
      <select class="input" id="view-move-select">
        <option value="todo" ${currentCol === "todo" ? "selected" : ""}>📋 Pendente</option>
        <option value="doing" ${currentCol === "doing" ? "selected" : ""}>🔄 Em Progresso</option>
        <option value="done" ${currentCol === "done" ? "selected" : ""}>✅ Concluído</option>
      </select>
      <button class="btn btn-primary" id="view-move-btn" type="button">Mover</button>
    </div>`;

  const modalBody = viewCardModalOverlay.querySelector(".modal-body");
  // Insert before comments section (last child)
  const commentsSection = viewCommentsList.closest(".view-section");
  if (commentsSection) modalBody.insertBefore(section, commentsSection);
  else modalBody.appendChild(section);

  document.getElementById("view-move-btn").addEventListener("click", async () => {
    const newCol = document.getElementById("view-move-select").value;
    if (newCol === currentCol) return;

    if (isParticipant) {
      await moveSharedCardToColumn(cardId, newCol);
      closeViewCardModal();
    } else {
      // Owner move
      const project = getCurrentProject();
      if (!project) return;
      const found = findCard(cardId);
      if (!found) return;
      const card = found.card;
      project.columns[found.columnId] = project.columns[found.columnId].filter(c => c.id !== cardId);
      project.columns[newCol].push(card);
      saveState(); renderBoard();
      closeViewCardModal();
    }
  });
}

function closeViewCardModal() { viewNewCommentInput.value = ""; closeModal(viewCardModalOverlay); }

async function handleViewAddComment() {
  const cardId = viewEditCardBtn.dataset.cardId;
  const text   = viewNewCommentInput.value.trim();

  // Find card — shared or owned
  if (!text) return;
  const sharedEntry = findSharedCard(cardId || "");

  // Fallback: get cardId from move section
  const moveSection = document.getElementById("view-move-section");
  const resolvedId  = cardId || (moveSection?.dataset.cardId);

  if (sharedEntry) {
    const ok = await addSharedCardComment(sharedEntry.card.id, text);
    if (ok) { viewNewCommentInput.value = ""; openViewCardModal(sharedEntry.card.id); renderBoard(); }
    return;
  }

  if (!cardId || !text) return;
  const found = findCard(cardId);
  if (!found) return;
  if (!Array.isArray(found.card.comments)) found.card.comments = [];
  found.card.comments.push({ id: uid(), text, author: authUser ? getUserPresentation(authUser).fullName : "", createdAt: new Date().toISOString() });
  viewNewCommentInput.value = "";
  saveState(); openViewCardModal(cardId); renderBoard();
}

// Store current view card id for shared comments
const _origViewAddComment = handleViewAddComment;
viewAddCommentBtn.addEventListener("click", async () => {
  const text = viewNewCommentInput.value.trim();
  if (!text) return;

  // Determine which card is open
  const moveBtn = document.getElementById("view-move-btn");
  const moveSel = document.getElementById("view-move-select");
  const cardId  = viewEditCardBtn.dataset.cardId;

  const sc = sharedCardsState.find(s => s.card.id === cardId);
  if (sc) {
    const ok = await addSharedCardComment(sc.card.id, text);
    if (ok) { viewNewCommentInput.value = ""; openViewCardModal(sc.card.id); renderBoard(); }
    return;
  }

  if (!cardId || !text) return;
  const found = findCard(cardId);
  if (!found) return;
  if (!Array.isArray(found.card.comments)) found.card.comments = [];
  found.card.comments.push({ id: uid(), text, author: authUser ? getUserPresentation(authUser).fullName : "", createdAt: new Date().toISOString() });
  viewNewCommentInput.value = "";
  saveState(); openViewCardModal(cardId); renderBoard();
});

viewNewCommentInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); viewAddCommentBtn.click(); }});

// ============================================================
// FIND CARD (owned)
// ============================================================
function findCard(cardId) {
  const project = getCurrentProject();
  if (!project) return null;
  for (const columnId of Object.keys(project.columns)) {
    const card = project.columns[columnId].find(item => item.id === cardId);
    if (card) return { card, columnId };
  }
  return null;
}

// ============================================================
// DRAG AND DROP (owned cards only)
// ============================================================
function moveCardToColumnAtPosition(cardId, targetColumnId, targetContainer) {
  const project = getCurrentProject();
  if (!project) return;
  let draggedCard = null;
  for (const columnId of Object.keys(project.columns)) {
    const index = project.columns[columnId].findIndex(c => c.id === cardId);
    if (index !== -1) { draggedCard = project.columns[columnId].splice(index, 1)[0]; break; }
  }
  if (!draggedCard) return;
  const orderedIds = [...targetContainer.querySelectorAll(".card")].map(el => el.dataset.cardId).filter(Boolean);
  const insertIndex = orderedIds.indexOf(cardId);
  if (insertIndex === -1) project.columns[targetColumnId].push(draggedCard);
  else project.columns[targetColumnId].splice(insertIndex, 0, draggedCard);
  saveState(); renderBoard();
}

function getDragAfterElement(container, mouseY) {
  const draggableCards = [...container.querySelectorAll(".card:not(.dragging)")];
  return draggableCards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = mouseY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

// ============================================================
// PROJECT ACTIONS MENU
// ============================================================
function toggleProjectActionsMenu(anchorEl) {
  if (projectActionsOpen) closeProjectActionsMenu();
  const rect = anchorEl.getBoundingClientRect();
  projectActionsMenu.style.top  = `${rect.bottom + 10}px`;
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

// ============================================================
// MODAL OPEN/CLOSE
// ============================================================
function openModal(overlay) {
  if (!overlay) return;
  const activeTimer = modalCloseTimers.get(overlay);
  if (activeTimer) { clearTimeout(activeTimer); modalCloseTimers.delete(overlay); }
  overlay.classList.remove("hidden", "is-closing");
  overlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => overlay.classList.add("is-active"));
}

function closeModal(overlay) {
  if (!overlay || overlay.classList.contains("hidden")) return;
  overlay.classList.remove("is-active");
  overlay.classList.add("is-closing");
  overlay.setAttribute("aria-hidden", "true");
  const timer = setTimeout(() => {
    overlay.classList.remove("is-closing"); overlay.classList.add("hidden");
    modalCloseTimers.delete(overlay);
  }, 280);
  modalCloseTimers.set(overlay, timer);
}

// ============================================================
// THEME & SIDEBAR
// ============================================================
function setTheme(theme) { document.documentElement.setAttribute("data-theme", theme); safeSetItem(THEME_KEY, theme); updateThemeButtons(theme); }
function applySavedTheme() { const t = safeGetItem(THEME_KEY) || "dark"; document.documentElement.setAttribute("data-theme", t); updateThemeButtons(t); }
function updateThemeButtons(theme) { lightBtn.classList.toggle("active", theme === "light"); darkBtn.classList.toggle("active", theme === "dark"); }

function isMobileViewport() { return window.innerWidth <= 980; }
function openMobileSidebar()  { appShell.classList.add("mobile-sidebar-open"); appShell.classList.remove("sidebar-collapsed"); updateSidebarToggleButton(false); }
function closeMobileSidebar() { appShell.classList.remove("mobile-sidebar-open"); updateSidebarToggleButton(true); }

function toggleSidebar() {
  if (isMobileViewport()) {
    if (appShell.classList.contains("mobile-sidebar-open")) closeMobileSidebar(); else openMobileSidebar(); return;
  }
  const collapsed = appShell.classList.toggle("sidebar-collapsed");
  safeSetItem(SIDEBAR_KEY, collapsed ? "1" : "0"); updateSidebarToggleButton(collapsed);
}

function applySavedSidebar() {
  if (isMobileViewport()) { appShell.classList.remove("sidebar-collapsed", "mobile-sidebar-open"); updateSidebarToggleButton(true); return; }
  const collapsed = safeGetItem(SIDEBAR_KEY) === "1";
  appShell.classList.remove("mobile-sidebar-open"); appShell.classList.toggle("sidebar-collapsed", collapsed); updateSidebarToggleButton(collapsed);
}

function handleResponsiveLayout() {
  if (isMobileViewport()) { appShell.classList.remove("sidebar-collapsed"); if (!appShell.classList.contains("mobile-sidebar-open")) updateSidebarToggleButton(true); }
  else { appShell.classList.remove("mobile-sidebar-open"); const collapsed = safeGetItem(SIDEBAR_KEY) === "1"; appShell.classList.toggle("sidebar-collapsed", collapsed); updateSidebarToggleButton(collapsed); }
}

function updateSidebarToggleButton(collapsed) {
  sidebarToggleBtn.textContent = collapsed ? "☰" : "✕";
  sidebarToggleBtn.setAttribute("aria-label", collapsed ? "Mostrar menu lateral" : "Esconder menu lateral");
  sidebarToggleBtn.setAttribute("title", collapsed ? "Mostrar menu lateral" : "Esconder menu lateral");
}

// ============================================================
// DASHBOARD
// ============================================================
function updateDashboard(project) {
  if (!project) return;
  const columns = project.columns || {};
  const cards   = Object.values(columns).flat();
  const totalCards     = cards.length;
  const completedCards = (columns.done || []).length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueCards = cards.filter(card => {
    if (!card.date) return false;
    const deadline = new Date(`${card.date}T00:00:00`);
    return deadline < today && !((columns.done || []).some(d => d.id === card.id));
  }).length;
  const checklistItems = cards.flatMap(card => Array.isArray(card.checklist) ? card.checklist : []);
  const checklistDone  = checklistItems.filter(i => i.done).length;
  const checkPct       = checklistItems.length ? Math.round((checklistDone / checklistItems.length) * 100) : 0;
  dashTotalCards.textContent     = String(totalCards);
  dashCompletedCards.textContent = String(completedCards);
  dashOverdueCards.textContent   = String(overdueCards);
  dashChecklistDone.textContent  = `${checkPct}%`;
}

// ============================================================
// UTILITIES
// ============================================================
function columnLabel(id) { return { todo: "A Fazer", doing: "Em Progresso", done: "Concluído" }[id] || id; }
function truncate(text, max) { return text.length > max ? `${text.slice(0, max).trim()}...` : text; }
function formatDate(d) { if (!d) return ""; return new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR"); }
function formatDateTime(d) { if (!d) return ""; return new Date(d).toLocaleString("pt-BR"); }
function clone(data) { return JSON.parse(JSON.stringify(data)); }
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}


// ================================================================
// ① NOTIFICATIONS SYSTEM
// ================================================================
const NOTIF_SEEN_KEY = "kanban_notif_seen_v1";
let notifPanelOpen = false;
let notifItems = []; // [{id, type, icon, title, body, time, cardId}]

const notifBtn       = document.getElementById("notifBtn");
const notifBadge     = document.getElementById("notifBadge");
const notifPanel     = document.getElementById("notifPanel");
const notifList      = document.getElementById("notifList");
const notifMarkAllBtn = document.getElementById("notifMarkAllBtn");
const openChatBtn    = document.getElementById("openChatBtn");
const globalUnreadBadge = document.getElementById("globalUnreadBadge");

on(notifBtn, "click", e => { e.stopPropagation(); toggleNotifPanel(); });
on(notifMarkAllBtn, "click", () => { markAllNotifRead(); });
document.addEventListener("click", e => {
  if (notifPanelOpen && !notifPanel.contains(e.target) && e.target !== notifBtn) closeNotifPanel();
});

function toggleNotifPanel() {
  notifPanelOpen ? closeNotifPanel() : openNotifPanel();
}
function openNotifPanel() {
  notifPanel.classList.add("is-open");
  notifPanel.setAttribute("aria-hidden", "false");
  notifPanelOpen = true;
}
function closeNotifPanel() {
  notifPanel.classList.remove("is-open");
  notifPanel.setAttribute("aria-hidden", "true");
  notifPanelOpen = false;
}

function getSeenNotifIds() {
  try { return new Set(JSON.parse(safeGetItem(NOTIF_SEEN_KEY) || "[]")); } catch { return new Set(); }
}
function markSeenNotifIds(ids) {
  safeSetItem(NOTIF_SEEN_KEY, JSON.stringify([...ids]));
}
function markAllNotifRead() {
  const seen = getSeenNotifIds();
  notifItems.forEach(n => seen.add(n.id));
  markSeenNotifIds(seen);
  renderNotifications();
  closeNotifPanel();
}

function buildNotifications() {
  const items = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  // Own cards: overdue + due today/tomorrow
  state.projects.forEach(project => {
    Object.entries(project.columns || {}).forEach(([colKey, cards]) => {
      (cards || []).forEach(card => {
        if (!card.date || colKey === "done") return;
        const deadline = new Date(`${card.date}T00:00:00`);
        const id = `overdue_${card.id}`;
        if (deadline < today) {
          items.push({ id, type: "overdue", icon: "⚠️", title: "Card atrasado", body: `"${card.title}" passou do prazo (${formatDate(card.date)})`, time: deadline.toISOString(), cardId: card.id });
        } else if (deadline.getTime() === today.getTime()) {
          items.push({ id: `today_${card.id}`, type: "due_today", icon: "📅", title: "Vence hoje", body: `"${card.title}" vence hoje!`, time: deadline.toISOString(), cardId: card.id });
        } else if (deadline.getTime() === tomorrow.getTime()) {
          items.push({ id: `tomorrow_${card.id}`, type: "due_soon", icon: "🕐", title: "Vence amanhã", body: `"${card.title}" vence amanhã.`, time: deadline.toISOString(), cardId: card.id });
        }
      });
    });
  });

  // Shared cards: you were added as participant
  sharedCardsState.forEach(sc => {
    items.push({
      id: `shared_${sc.card.id}`,
      type: "shared",
      icon: "🤝",
      title: "Card compartilhado",
      body: `Você foi adicionado ao card "${sc.card.title}" (projeto: ${sc.projectName})`,
      time: sc.card.createdAt,
      cardId: sc.card.id
    });
  });

  // Sort by time desc
  items.sort((a, b) => new Date(b.time) - new Date(a.time));
  notifItems = items;
}

function renderNotifications() {
  buildNotifications();
  const seen = getSeenNotifIds();
  const unread = notifItems.filter(n => !seen.has(n.id));

  // Badge
  if (unread.length > 0) {
    notifBadge.textContent = unread.length > 99 ? "99+" : unread.length;
    notifBadge.classList.remove("hidden");
  } else {
    notifBadge.classList.add("hidden");
  }

  // List
  if (!notifItems.length) {
    notifList.innerHTML = `<div class="notif-empty">Nenhuma notificação.</div>`;
    return;
  }

  notifList.innerHTML = "";
  notifItems.forEach(n => {
    const isUnread = !seen.has(n.id);
    const row = document.createElement("div");
    row.className = `notif-item${isUnread ? " is-unread" : ""}`;
    row.innerHTML = `
      <span class="notif-item-icon">${n.icon}</span>
      <div class="notif-item-body">
        <strong>${escapeHtml(n.title)}</strong>
        <span>${escapeHtml(n.body)}</span>
      </div>
      <span class="notif-item-time">${timeAgo(n.time)}</span>`;
    row.addEventListener("click", () => {
      // Mark as read
      seen.add(n.id);
      markSeenNotifIds(seen);
      closeNotifPanel();
      renderNotifications();
      // Navigate to card if possible
      if (n.cardId) {
        const found = findCard(n.cardId) || (findSharedCard(n.cardId) ? { card: findSharedCard(n.cardId).card, columnId: findSharedCard(n.cardId).columnId } : null);
        if (found) setTimeout(() => openViewCardModal(n.cardId), 80);
      }
    });
    notifList.appendChild(row);
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ================================================================
// ② USER BIO MODAL
// ================================================================
const bioModalOverlay = document.getElementById("bioModalOverlay");
const closeBioModalBtn = document.getElementById("closeBioModalBtn");
const closeBioFooterBtn = document.getElementById("closeBioFooterBtn");
const bioChatBtn = document.getElementById("bioChatBtn");
const bioModalBody = document.getElementById("bioModalBody");
let currentBioUserId = null;

on(closeBioModalBtn,  "click", closeBioModal);
on(closeBioFooterBtn, "click", closeBioModal);
on(bioModalOverlay,   "click", e => { if (e.target === bioModalOverlay) closeBioModal(); });
on(bioChatBtn, "click", () => {
  if (!currentBioUserId) return;
  closeBioModal();
  openChatWithUser(currentBioUserId);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !bioModalOverlay.classList.contains("hidden")) closeBioModal(); });

async function openUserBioModal(userId) {
  if (!supabase || !userId) return;
  currentBioUserId = userId;
  bioModalBody.innerHTML = `<div class="chat-loading">Carregando perfil...</div>`;
  openModal(bioModalOverlay);

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) {
    bioModalBody.innerHTML = `<div class="notif-empty">Perfil não encontrado.</div>`;
    return;
  }

  const initials = getInitials(data.full_name || "?");
  const isSelf = authUser && userId === authUser.id;

  bioModalBody.innerHTML = `
    <div class="bio-user-hero">
      ${data.avatar_url
        ? `<img class="bio-avatar" src="${escapeHtml(data.avatar_url)}" alt="${escapeHtml(data.full_name || "")}"/>`
        : `<div class="bio-avatar-fallback">${escapeHtml(initials)}</div>`}
      <div class="bio-user-info">
        <strong>${escapeHtml(data.full_name || "Sem nome")}</strong>
        <span>${escapeHtml(data.email || "")}</span>
      </div>
    </div>
    <div class="bio-detail-grid">
      <div class="bio-detail-item">
        <label>📞 Telefone</label>
        <span>${escapeHtml(data.phone || "—")}</span>
      </div>
      <div class="bio-detail-item">
        <label>🏢 Setor</label>
        <span>${escapeHtml(data.sector || "—")}</span>
      </div>
    </div>
    <div>
      <label class="field-label" style="margin-bottom:6px;display:block">📝 Bio</label>
      <div class="bio-text-block ${!data.bio ? "bio-text-empty" : ""}">${escapeHtml(data.bio || "Nenhuma bio preenchida.")}</div>
    </div>`;

  // Hide chat button for own profile
  bioChatBtn.style.display = isSelf ? "none" : "";
}

function closeBioModal() { closeModal(bioModalOverlay); }

// ================================================================
// ③ INTERNAL CHAT
// ================================================================
const chatPanel      = document.getElementById("chatPanel");
const chatCloseBtn   = document.getElementById("chatCloseBtn");
const chatSearchInput = document.getElementById("chatSearchInput");
const chatUserResults = document.getElementById("chatUserResults");
const chatConvList   = document.getElementById("chatConvList");
const chatMainHeader = document.getElementById("chatMainHeader");
const chatMessages   = document.getElementById("chatMessages");
const chatInputRow   = document.getElementById("chatInputRow");
const chatMessageInput = document.getElementById("chatMessageInput");
const chatSendBtn    = document.getElementById("chatSendBtn");

let chatOpen = false;
let activeChatUserId   = null;
let activeChatUserName = "";
let chatConversations  = []; // [{userId, name, email, avatarUrl, lastMsg, lastTime, unread}]
let chatPollTimer      = null;
let chatSearchTimer    = null;
let chatUserSearchResults = [];

on(openChatBtn,  "click", () => { if (!requireAuth("usar o chat")) return; openChatPanel(); });
on(chatCloseBtn, "click", closeChatPanel);
on(chatPanel, "click", e => { if (e.target === chatPanel) closeChatPanel(); });
on(chatSendBtn, "click", handleSendMessage);
on(chatMessageInput, "keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
});
on(chatSearchInput, "input", () => {
  clearTimeout(chatSearchTimer);
  const term = chatSearchInput.value.trim();
  if (!term) { chatUserResults.style.display = "none"; return; }
  chatSearchTimer = setTimeout(() => searchChatUsers(term), 300);
});
document.addEventListener("click", e => {
  if (!chatUserResults.contains(e.target) && e.target !== chatSearchInput) {
    chatUserResults.style.display = "none";
  }
});

function openChatPanel(userId = null, userName = "") {
  chatPanel.classList.add("is-open");
  chatPanel.setAttribute("aria-hidden", "false");
  chatOpen = true;
  loadConversations().then(() => {
    if (userId) openConversation(userId, userName);
  });
  startChatPoll();
}

function closeChatPanel() {
  chatPanel.classList.remove("is-open");
  chatPanel.setAttribute("aria-hidden", "true");
  chatOpen = false;
  stopChatPoll();
}

function openChatWithUser(userId) {
  if (!requireAuth("usar o chat")) return;
  // Find name from conversations or shared
  let name = "";
  const conv = chatConversations.find(c => c.userId === userId);
  if (conv) name = conv.name;
  openChatPanel(userId, name);
}

async function searchChatUsers(term) {
  if (!supabase || !authUser) return;
  let data = null;
  const rpc = await supabase.rpc("search_profiles", { search_term: term });
  if (!rpc.error) data = rpc.data;
  else {
    const fb = await supabase.from("profiles").select("user_id,full_name,email,avatar_url")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(8);
    data = fb.data;
  }
  chatUserSearchResults = (data || []).filter(u => u.user_id !== authUser.id);
  renderChatUserResults();
}

function renderChatUserResults() {
  if (!chatUserSearchResults.length) { chatUserResults.style.display = "none"; return; }
  chatUserResults.innerHTML = "";
  chatUserResults.style.display = "block";
  chatUserSearchResults.forEach(u => {
    const initials = getInitials(u.full_name || u.email || "?");
    const row = document.createElement("div");
    row.className = "chat-user-result-item";
    row.innerHTML = `
      ${u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}" alt="${escapeHtml(u.full_name||"")}">` : `<div class="chat-avatar-sm">${escapeHtml(initials)}</div>`}
      <span>${escapeHtml(u.full_name || u.email || "Usuário")}</span>`;
    row.addEventListener("click", () => {
      chatSearchInput.value = "";
      chatUserResults.style.display = "none";
      openConversation(u.user_id, u.full_name || u.email || "Usuário");
    });
    chatUserResults.appendChild(row);
  });
}

async function loadConversations() {
  if (!supabase || !authUser) { chatConvList.innerHTML = `<div class="notif-empty">Faça login para ver mensagens.</div>`; return; }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`from_user_id.eq.${authUser.id},to_user_id.eq.${authUser.id}`)
    .order("created_at", { ascending: false });

  if (error) { console.error("Erro ao carregar conversas:", error); return; }

  // Group by conversation partner
  const convMap = new Map();
  (data || []).forEach(msg => {
    const partnerId = msg.from_user_id === authUser.id ? msg.to_user_id : msg.from_user_id;
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, { lastMsg: msg.text, lastTime: msg.created_at, unread: 0, userId: partnerId });
    }
    if (msg.to_user_id === authUser.id && !msg.read) convMap.get(partnerId).unread++;
  });

  // Fetch profile info for each partner
  const partnerIds = [...convMap.keys()];
  let profiles = {};
  if (partnerIds.length) {
    const { data: profs } = await supabase.from("profiles").select("user_id,full_name,email,avatar_url").in("user_id", partnerIds);
    (profs || []).forEach(p => { profiles[p.user_id] = p; });
  }

  chatConversations = [...convMap.entries()].map(([uid, conv]) => {
    const prof = profiles[uid] || {};
    return { ...conv, name: prof.full_name || prof.email || uid, email: prof.email || "", avatarUrl: prof.avatar_url || "" };
  }).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

  renderConvList();
  updateGlobalUnreadBadge();
}

function renderConvList() {
  if (!chatConversations.length) {
    chatConvList.innerHTML = `<div class="notif-empty" style="padding:20px 14px;font-size:12px;">Nenhuma conversa. Busque um usuário acima para começar.</div>`;
    return;
  }
  chatConvList.innerHTML = "";
  chatConversations.forEach(conv => {
    const initials = getInitials(conv.name);
    const isActive = conv.userId === activeChatUserId;
    const row = document.createElement("div");
    row.className = `chat-conv-item${isActive ? " is-active" : ""}`;
    row.innerHTML = `
      ${conv.avatarUrl ? `<img src="${escapeHtml(conv.avatarUrl)}" alt="${escapeHtml(conv.name)}">` : `<div class="chat-conv-avatar">${escapeHtml(initials)}</div>`}
      <div class="chat-conv-copy">
        <strong>${escapeHtml(conv.name)}</strong>
        <span>${escapeHtml(truncate(conv.lastMsg || "", 36))}</span>
      </div>
      ${conv.unread > 0 ? `<span class="chat-conv-unread">${conv.unread}</span>` : ""}`;
    row.addEventListener("click", () => openConversation(conv.userId, conv.name));
    chatConvList.appendChild(row);
  });
}

async function openConversation(userId, userName) {
  activeChatUserId   = userId;
  activeChatUserName = userName;

  // Update header
  const conv = chatConversations.find(c => c.userId === userId);
  const initials = getInitials(userName);
  const avatarUrl = conv?.avatarUrl || "";
  chatMainHeader.innerHTML = `
    ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" class="chat-main-avatar" alt="${escapeHtml(userName)}">` : `<div class="chat-main-avatar">${escapeHtml(initials)}</div>`}
    <div class="chat-main-info">
      <strong>${escapeHtml(userName)}</strong>
      <span>${escapeHtml(conv?.email || "")}</span>
    </div>
    <button id="chatCloseBtn" class="chat-close-btn" type="button">✕</button>`;
  chatMainHeader.querySelector("#chatCloseBtn").addEventListener("click", closeChatPanel);

  chatInputRow.style.display = "";
  chatMessages.innerHTML = `<div class="chat-loading">Carregando...</div>`;

  renderConvList(); // highlight active
  await fetchAndRenderMessages();

  // Mark messages as read
  if (supabase && authUser) {
    supabase.from("messages").update({ read: true })
      .eq("from_user_id", userId).eq("to_user_id", authUser.id).eq("read", false)
      .then(() => { loadConversations(); });
  }
  chatMessageInput.focus();
}

async function fetchAndRenderMessages() {
  if (!supabase || !authUser || !activeChatUserId) return;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(from_user_id.eq.${authUser.id},to_user_id.eq.${activeChatUserId}),and(from_user_id.eq.${activeChatUserId},to_user_id.eq.${authUser.id})`)
    .order("created_at", { ascending: true });

  if (error) { console.error("Erro mensagens:", error); return; }

  const msgs = data || [];
  if (!msgs.length) {
    chatMessages.innerHTML = `<div class="chat-empty-state"><span>👋</span>Inicie uma conversa!</div>`;
    return;
  }

  chatMessages.innerHTML = "";
  let lastDate = "";
  msgs.forEach(msg => {
    const dateStr = new Date(msg.created_at).toLocaleDateString("pt-BR");
    if (dateStr !== lastDate) {
      const div = document.createElement("div");
      div.className = "chat-date-divider";
      div.textContent = dateStr;
      chatMessages.appendChild(div);
      lastDate = dateStr;
    }
    const isMine = msg.from_user_id === authUser.id;
    const bubble = document.createElement("div");
    bubble.className = `chat-msg ${isMine ? "is-mine" : "is-theirs"}`;
    bubble.innerHTML = `
      <div class="chat-bubble">${escapeHtml(msg.text)}</div>
      <div class="chat-msg-meta">${new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>`;
    chatMessages.appendChild(bubble);
  });

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleSendMessage() {
  const text = chatMessageInput.value.trim();
  if (!text || !activeChatUserId || !supabase || !authUser) return;

  chatMessageInput.value = "";
  chatMessageInput.style.height = "auto";

  const { error } = await supabase.from("messages").insert({
    from_user_id: authUser.id,
    to_user_id: activeChatUserId,
    text,
    read: false
  });

  if (error) { console.error("Erro ao enviar mensagem:", error); return; }
  await fetchAndRenderMessages();
  await loadConversations();
}

function startChatPoll() {
  stopChatPoll();
  chatPollTimer = setInterval(async () => {
    if (activeChatUserId) await fetchAndRenderMessages();
    await loadConversations();
  }, 5000);
}

function stopChatPoll() {
  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
}

function updateGlobalUnreadBadge() {
  const total = chatConversations.reduce((acc, c) => acc + (c.unread || 0), 0);
  if (total > 0) {
    globalUnreadBadge.textContent = total > 99 ? "99+" : total;
    globalUnreadBadge.classList.remove("hidden");
  } else {
    globalUnreadBadge.classList.add("hidden");
  }
}

// Auto-resize chat textarea
chatMessageInput?.addEventListener("input", function() {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 100) + "px";
});

// ================================================================
// PATCH: renderProjects — also calls renderNotifications after shared cards load
// ================================================================
const _origRenderProjects = renderProjects;
// We patch after auth loads — renderNotifications is called in updateAuthUI via renderBoard

// ================================================================
// PATCH: openViewCardModal — participant chips open bio modal
// ================================================================
// This is injected via renderParticipantChips called inside openViewCardModal
// We hook into the viewCardParticipants container after render

const _origOpenViewCardModal = openViewCardModal;
function openViewCardModal(cardId) {
  _origOpenViewCardModal(cardId);
  // After modal is rendered, make participant chips clickable for bio
  setTimeout(() => patchParticipantChipsForBio(), 60);
}

function patchParticipantChipsForBio() {
  const container = document.getElementById("viewCardParticipants");
  if (!container) return;
  container.querySelectorAll(".participant-chip").forEach(chip => {
    if (chip.dataset.bioPatched) return;
    chip.dataset.bioPatched = "1";
    chip.classList.add("is-clickable-bio");
    chip.title = "Ver perfil";
    // We need user_id — find by name match in sharedCardsState or tempParticipants
    const name = chip.textContent.trim();
    chip.addEventListener("click", () => findAndOpenBioByName(name));
  });
}

async function findAndOpenBioByName(displayName) {
  if (!supabase) return;
  // Try to find in profiles
  const { data } = await supabase.from("profiles")
    .select("user_id,full_name,email,avatar_url")
    .ilike("full_name", `%${displayName.split(" ")[0]}%`)
    .limit(5);
  if (data?.length === 1) {
    openUserBioModal(data[0].user_id);
  } else if (data?.length > 1) {
    // Find closest match
    const match = data.find(p => (p.full_name || "").toLowerCase() === displayName.toLowerCase()) || data[0];
    openUserBioModal(match.user_id);
  }
}

// ================================================================
// PATCH: handleSessionUser / updateAuthUI — trigger notifications
// ================================================================
const _origUpdateAuthUI = updateAuthUI;
function updateAuthUI(user) {
  _origUpdateAuthUI(user);
  // Render notifications after state is ready
  setTimeout(renderNotifications, 200);
  // Load conversations badge
  if (user && supabase) setTimeout(loadConversations, 500);
}

// Patch loadSharedCards to also update notifications
const _origLoadSharedCards = loadSharedCards;
async function loadSharedCards() {
  await _origLoadSharedCards();
  setTimeout(renderNotifications, 100);
}

}); // end DOMContentLoaded

