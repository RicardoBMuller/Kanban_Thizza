document.addEventListener("DOMContentLoaded", () => {
// ============================================================
// CONFIGURAÇÃO — definida no arquivo config.js
// ============================================================
const KANBAN_CONFIG = window.KANBAN_CONFIG || {};
const SUPABASE_URL = String(KANBAN_CONFIG.SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = String(
  KANBAN_CONFIG.SUPABASE_PUBLISHABLE_KEY || KANBAN_CONFIG.SUPABASE_ANON_KEY || ""
).trim();
const APP_VERSION = "2026.07.16-fcc-avatars-attachments-1";

// ============================================================
// CONSTANTES
// ============================================================
const STORAGE_KEY              = "kanban_fcc_pro_v5";
const SIDEBAR_KEY              = "kanban_fcc_sidebar_collapsed";
const LOGIN_WELCOME_PENDING_KEY = "kanban_login_welcome_pending";
const ATTACHMENTS_BUCKET       = "card-attachments";
const MAX_ATTACHMENT_SIZE      = 15 * 1024 * 1024;
const MAX_FILES_PER_SELECTION  = 8;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "jpg", "jpeg", "png", "webp", "zip"
]);

const defaultColumns = () => ({ todo: [], doing: [], done: [] });

// ============================================================
// ESTADO GLOBAL
// ============================================================
let state          = { currentProjectId: null, projects: [] };
let currentProjectId = null;

let currentEditingCardId = null;
let currentTargetColumn  = "todo";
let projectModalMode     = "create";
let tempChecklist        = [];
let tempComments         = [];
let tempAttachments      = [];
let pendingAttachmentFiles = [];
let removedAttachmentPaths = new Set();
let attachmentActionInProgress = false;
const modalCloseTimers   = new WeakMap();

let supabase             = null;
let authUser             = null;
let profileRecord        = null;
let tempParticipants     = [];
let participantSearchResults = [];
let suspendCloudSync     = false;
let cloudSyncTimer       = null;
let isSyncingCloud       = false;
let cardModalDirty       = false;
let cardSaveInProgress   = false;
let lastHandledUserId    = null;
let notificationSeenIds  = new Set();
let persistentNotifications = [];
let notificationRealtimeChannel = null;
let chatRuntimeReady     = false;

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
const cardCreatedInfo          = document.getElementById("cardCreatedInfo");
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
const cardAttachmentInput   = document.getElementById("cardAttachmentInput");
const selectAttachmentBtn   = document.getElementById("selectAttachmentBtn");
const editAttachmentsList   = document.getElementById("editAttachmentsList");
const editAttachmentsCounter = document.getElementById("editAttachmentsCounter");
const attachmentUploadHint  = document.getElementById("attachmentUploadHint");

// Modal visualização
const viewCardModalOverlay   = document.getElementById("viewCardModalOverlay");
const viewCardTitle          = document.getElementById("viewCardTitle");
const viewCardOwner          = document.getElementById("viewCardOwner");
const viewCardDate           = document.getElementById("viewCardDate");
const viewCardCreatedAt      = document.getElementById("viewCardCreatedAt");
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
const viewAttachmentInput    = document.getElementById("viewAttachmentInput");
const viewSelectAttachmentBtn = document.getElementById("viewSelectAttachmentBtn");
const viewAttachmentsList    = document.getElementById("viewAttachmentsList");
const viewAttachmentsCounter = document.getElementById("viewAttachmentsCounter");
const viewAttachmentUploadRow = document.getElementById("viewAttachmentUploadRow");
const closeViewCardModalBtn  = document.getElementById("closeViewCardModalBtn");
const closeViewCardFooterBtn = document.getElementById("closeViewCardFooterBtn");
const viewEditCardBtn        = document.getElementById("viewEditCardBtn");

const statusConfirmOverlay   = document.getElementById("statusConfirmOverlay");
const statusConfirmIcon      = document.getElementById("statusConfirmIcon");
const statusConfirmTitle     = document.getElementById("statusConfirmTitle");
const statusConfirmMessage   = document.getElementById("statusConfirmMessage");
const statusConfirmWarning   = document.getElementById("statusConfirmWarning");
const statusConfirmCloseBtn  = document.getElementById("statusConfirmCloseBtn");
const statusConfirmCancelBtn = document.getElementById("statusConfirmCancelBtn");
const statusConfirmAcceptBtn = document.getElementById("statusConfirmAcceptBtn");
let statusConfirmResolver    = null;

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
    const columnId = button.closest(".column")?.dataset.col;
    const isDoneColumn = columnId === "done";
    const canCreateCards = Boolean(authUser && hasProject && !isDoneColumn);
    button.disabled = !canCreateCards;
    if (isDoneColumn) {
      button.textContent = "🔒 Travada";
      button.title = "Crie o card em Pendente ou Em Progresso e conclua-o após a confirmação.";
    } else {
      button.textContent = "+ Nova";
      button.title = canCreateCards ? "Criar card" : isViewingSharedProject ? "Não é possível criar cards em projetos compartilhados" : "Faça login com Google e selecione/crie um projeto";
    }
  });
}

async function init() {
  migrateOldData();
  applySavedTheme();
  applySavedSidebar();
  renderProjects();
  renderBoard();
  bindEvents();
  runIntroSplash();
  await initAuth();
}

function hasPendingLoginWelcome() { return false; }

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
  on(closeCardModalBtn, "click", () => closeCardModal(false));
  on(cancelCardBtn, "click", () => closeCardModal(false));
  on(saveCardBtn, "click", handleSaveCard);
  on(deleteCardBtn, "click", handleDeleteCard);
  on(closeViewCardModalBtn, "click", closeViewCardModal);
  on(closeViewCardFooterBtn, "click", closeViewCardModal);
  on(statusConfirmCloseBtn, "click", () => resolveStatusConfirmation(false));
  on(statusConfirmCancelBtn, "click", () => resolveStatusConfirmation(false));
  on(statusConfirmAcceptBtn, "click", () => resolveStatusConfirmation(true));
  on(statusConfirmOverlay, "click", e => { if (e.target === statusConfirmOverlay) resolveStatusConfirmation(false); });
  on(addChecklistItemBtn, "click", handleAddChecklistItem);
  on(addCommentBtn, "click", handleAddComment);
  on(selectAttachmentBtn, "click", () => cardAttachmentInput?.click());
  on(cardAttachmentInput, "change", handleEditAttachmentSelection);
  on(viewSelectAttachmentBtn, "click", () => viewAttachmentInput?.click());
  on(viewAttachmentInput, "change", handleViewAttachmentSelection);
  on(newChecklistItemInput, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistItem(); }});
  on(newCommentInput, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); }});
  on(searchInput, "input", renderBoard);
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

  [cardTitleInput, cardDescInput, cardOwnerInput, cardDateInput, cardLabelsInput,
   cardParticipantsInput, newChecklistItemInput, newCommentInput].forEach(el => {
    on(el, "input", () => {
      if (cardModalOverlay && !cardModalOverlay.classList.contains("hidden")) cardModalDirty = true;
    });
    on(el, "change", () => {
      if (cardModalOverlay && !cardModalOverlay.classList.contains("hidden")) cardModalDirty = true;
    });
  });

  addCardButtons.forEach(button => {
    button.addEventListener("click", () => {
      const col = button.closest(".column").dataset.col;
      if (col === "done") return;
      openCardModal("create", col);
    });
  });

  on(projectModalOverlay, "click", e => { if (e.target === projectModalOverlay) closeProjectModal(); });
  // Evita fechamento acidental do modal do card enquanto o usuário está digitando,
  // buscando participantes ou clicando em elementos que podem ficar próximos da borda.
  on(cardModalOverlay, "click", e => { if (e.target === cardModalOverlay) e.stopPropagation(); });
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
    if (e.key !== "Escape") return;

    if (statusConfirmOverlay && !statusConfirmOverlay.classList.contains("hidden")) {
      e.preventDefault();
      resolveStatusConfirmation(false);
      return;
    }

    // O modal do card só fecha pelos botões. Isso evita que o navegador,
    // autocomplete ou seletores nativos descartem o preenchimento por engano.
    if (cardModalOverlay && !cardModalOverlay.classList.contains("hidden")) {
      e.preventDefault();
      return;
    }

    closeProjectModal(); closeViewCardModal();
    closeAuthModal(); closeProfileModal();
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
  return Boolean(
    SUPABASE_URL && SUPABASE_ANON_KEY
    && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)
    && !SUPABASE_URL.includes("COLE_AQUI")
    && !SUPABASE_ANON_KEY.includes("COLE_AQUI")
  );
}

function getAppBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function formatCloudError(error) {
  if (!error) return "Erro desconhecido.";
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.join(" — ") || String(error);
}

async function initAuth() {
  if (!isSupabaseConfigured()) {
    authConfigHint.classList.remove("hidden");
    clearDataForSignedOutUser();
    updateAuthUI(null);
    return;
  }
  try {
    console.info(`[Kanban Quest] versão ${APP_VERSION}`);
    if (!window.supabase || !window.supabase.createClient) {
      updateAuthUI(null); authConfigHint.classList.remove("hidden"); return;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: { "x-client-info": `kanban-quest/${APP_VERSION}` }
      }
    });
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await handleSessionUser(data.session?.user || null, { showWelcome: true });
    supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user || null;
      if (event === "TOKEN_REFRESHED") {
        authUser = nextUser || authUser;
        updateAuthUI(authUser);
        return;
      }
      if (event === "SIGNED_IN" && nextUser?.id && nextUser.id === lastHandledUserId) return;
      await handleSessionUser(nextUser, { showWelcome: event === "SIGNED_IN" });
    });
  } catch (error) {
    console.error("Erro ao iniciar Supabase Auth:", error);
    updateAuthUI(null);
  }
}

async function handleSessionUser(sessionUser, { showWelcome = false } = {}) {
  if (!sessionUser) {
    profileRecord = null;
    lastHandledUserId = null;
    notificationSeenIds = new Set();
    persistentNotifications = [];
    teardownNotificationRealtime();
    clearDataForSignedOutUser();
    authUser = null;
    updateAuthUI(null);
    return;
  }
  lastHandledUserId = sessionUser.id;
  await refreshAuthUser(sessionUser);
  await ensureProfileRecord();
  await Promise.all([loadCloudData(), loadSharedCards(), loadNotificationReads(), loadPersistentNotifications()]);
  setupNotificationRealtime();
  updateAuthUI(authUser);
  kqRenderNotifications();
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
    alert(`Não foi possível salvar o perfil.

Motivo: ${formatCloudError(error)}`);
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
  closeProfileModal();
  // Build a dedicated confirm overlay — does NOT touch the project modal DOM
  const existing = document.getElementById("kq-logout-confirm");
  if (existing) existing.remove();
  const ov = document.createElement("div");
  ov.id = "kq-logout-confirm";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center";
  ov.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:28px 32px;max-width:360px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,.4);text-align:center">
    <h4 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0 0 10px">Confirmar saída</h4>
    <p style="font-size:14px;color:var(--text-muted);margin:0 0 24px;line-height:1.5">Você realmente deseja sair do Kanban Quest?</p>
    <div style="display:flex;gap:10px;justify-content:center">
      <button id="kqLogoutNo"  class="btn btn-soft">Cancelar</button>
      <button id="kqLogoutYes" class="btn btn-primary">Sair</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector("#kqLogoutNo").onclick  = () => ov.remove();
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
  ov.querySelector("#kqLogoutYes").onclick = async () => {
    ov.remove();
    try {
      const presentation = getUserPresentation(authUser);
      stopChatPoll();
      await supabase.auth.signOut();
      authUser = null; profileRecord = null;
      sharedCardsState = []; isViewingSharedProject = false;
      notificationSeenIds = new Set();
      persistentNotifications = [];
      teardownNotificationRealtime();
      closeChatWindow();
      showGoodbyeSplash(presentation.fullName, presentation.avatarUrl);
      setTimeout(() => window.location.reload(), 2800);
    } catch(e) { console.error("Logout error:", e); window.location.reload(); }
  };
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
      participants: normalizeParticipants(Array.isArray(row.participants) ? row.participants : [], row.created_at),
      checklist: normalizeChecklistItems(Array.isArray(row.checklist) ? row.checklist : [], row.created_at),
      comments: normalizeComments(Array.isArray(row.comments) ? row.comments : [], row.created_at),
      attachments: normalizeAttachments(Array.isArray(row.attachments) ? row.attachments : [], row.created_at),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      completedAt: row.completed_at || null,
      completedBy: row.completed_by || null,
      reopenedAt: row.reopened_at || null,
      reopenedBy: row.reopened_by || null,
      reopenedCount: Number(row.reopened_count || 0),
      isReopened: Boolean(row.is_reopened)
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
      participants: normalizeParticipants(Array.isArray(row.participants) ? row.participants : [], row.created_at),
      checklist: normalizeChecklistItems(Array.isArray(row.checklist) ? row.checklist : [], row.created_at),
      comments: normalizeComments(Array.isArray(row.comments) ? row.comments : [], row.created_at),
      attachments: normalizeAttachments(Array.isArray(row.attachments) ? row.attachments : [], row.created_at),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      completedAt: row.completed_at || null,
      completedBy: row.completed_by || null,
      reopenedAt: row.reopened_at || null,
      reopenedBy: row.reopened_by || null,
      reopenedCount: Number(row.reopened_count || 0),
      isReopened: Boolean(row.is_reopened)
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
  const allowedFields = ["title", "description", "checklist", "comments", "attachments"];
  const sharedCard = findSharedCard(cardId);
  if (sharedCard?.columnId === "done") {
    alert("Este card está concluído e travado. Reabra-o antes de fazer alterações.");
    return false;
  }
  const payload = {};
  for (const key of allowedFields) {
    if (key in updates) payload[key] = updates[key];
  }
  const { error } = await supabase.from("cards").update(payload).eq("id", cardId);
  if (error) { console.error("Erro ao salvar card compartilhado:", error); return false; }
  return true;
}

async function moveSharedCardToColumn(cardId, newColumnKey) {
  return transitionCardStatus(cardId, newColumnKey);
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
  if (!title) { alert("Digite um título para o card."); cardTitleInput.focus(); return false; }

  let uploaded = [];
  try {
    if (pendingAttachmentFiles.length) {
      uploaded = await uploadAttachmentFiles(cardId, pendingAttachmentFiles);
    }
    const updates = {
      title,
      description: cardDescInput.value.trim(),
      checklist: clone(tempChecklist),
      comments: clone(tempComments),
      attachments: normalizeAttachments([...clone(tempAttachments), ...uploaded])
    };
    const ok = await saveSharedCardUpdate(cardId, updates);
    if (!ok) throw new Error("O Supabase não aceitou a atualização do card compartilhado.");

    const sc = findSharedCard(cardId);
    if (sc) {
      sc.card.title = updates.title;
      sc.card.description = updates.description;
      sc.card.checklist = updates.checklist;
      sc.card.comments = updates.comments;
      sc.card.attachments = updates.attachments;
    }
    if (removedAttachmentPaths.size) {
      await removeAttachmentObjects([...removedAttachmentPaths]);
    }
    pendingAttachmentFiles = [];
    removedAttachmentPaths = new Set();
    renderBoard();
    cardModalDirty = false;
    closeCardModal(true);
    return true;
  } catch (error) {
    if (uploaded.length) await removeAttachmentObjects(uploaded.map(item => item.path), { silent: true });
    console.error("Erro ao salvar card compartilhado:", error);
    alert(`Não foi possível salvar o card online.\n\nMotivo: ${formatCloudError(error)}`);
    return false;
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

function queueCloudSync() { /* online-only mode: persistence is handled directly per action */ }

function flattenCardsForCloud(project) {
  const rows = [];
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
        participants: normalizeParticipants(card.participants || [], card.createdAt),
        checklist: normalizeChecklistItems(card.checklist || [], card.createdAt),
        comments: normalizeComments(Array.isArray(card.comments) ? card.comments : [], card.createdAt),
        attachments: normalizeAttachments(Array.isArray(card.attachments) ? card.attachments : [], card.createdAt),
        created_at: card.createdAt || new Date().toISOString(),
        completed_at: card.completedAt || null,
        completed_by: card.completedBy || null,
        reopened_at: card.reopenedAt || null,
        reopened_by: card.reopenedBy || null,
        reopened_count: Number(card.reopenedCount || 0),
        is_reopened: Boolean(card.isReopened)
      });
    });
  });
  return rows;
}

async function persistProjectToCloud(project) {
  if (!supabase || !authUser || !project) return;
  const { error } = await supabase.from("projects").upsert({
    id: String(project.id),
    owner_id: authUser.id,
    name: project.name,
    created_at: project.createdAt || new Date().toISOString()
  }, { onConflict: "id" });
  if (error) throw error;
}

async function syncParticipantsForCard(card, projectId) {
  if (!supabase || !authUser || !card) return;
  const normalized = normalizeParticipants(card.participants || []);
  const { data: existingRows, error: existingError } = await supabase
    .from("card_participants")
    .select("participant_user_id")
    .eq("owner_id", authUser.id)
    .eq("card_id", String(card.id));
  if (existingError) throw existingError;

  const desiredRows = normalized
    .filter(participant => participant.user_id)
    .map(participant => ({
      card_id: String(card.id),
      participant_user_id: participant.user_id,
      owner_id: authUser.id,
      project_id: String(projectId),
      participant_name: participantDisplayName(participant),
      participant_email: participantEmail(participant),
      participant_avatar_url: participant.avatar_url || null
    }));

  if (desiredRows.length) {
    const { error } = await supabase
      .from("card_participants")
      .upsert(desiredRows, { onConflict: "card_id,participant_user_id" });
    if (error) throw error;
  }

  const desiredIds = new Set(desiredRows.map(row => row.participant_user_id));
  const existingIds = (existingRows || []).map(row => row.participant_user_id);
  const removeIds = existingIds.filter(id => !desiredIds.has(id));
  if (removeIds.length) {
    const { error } = await supabase
      .from("card_participants")
      .delete()
      .eq("owner_id", authUser.id)
      .eq("card_id", String(card.id))
      .in("participant_user_id", removeIds);
    if (error) throw error;
  }
}

async function persistCardToCloud(card, projectId, columnKey, position) {
  if (!supabase || !authUser || !card) return;
  const row = {
    id: String(card.id),
    owner_id: authUser.id,
    project_id: String(projectId),
    column_key: columnKey,
    position,
    title: card.title || "Sem título",
    description: card.description || "",
    owner: card.owner || "",
    due_date: card.date || null,
    labels: Array.isArray(card.labels) ? card.labels : [],
    participants: normalizeParticipants(card.participants || [], card.createdAt),
    checklist: normalizeChecklistItems(card.checklist || [], card.createdAt),
    comments: normalizeComments(Array.isArray(card.comments) ? card.comments : [], card.createdAt),
    attachments: normalizeAttachments(Array.isArray(card.attachments) ? card.attachments : [], card.createdAt),
    created_at: card.createdAt || new Date().toISOString(),
    completed_at: card.completedAt || null,
    completed_by: card.completedBy || null,
    reopened_at: card.reopenedAt || null,
    reopened_by: card.reopenedBy || null,
    reopened_count: Number(card.reopenedCount || 0),
    is_reopened: Boolean(card.isReopened)
  };
  const { error } = await supabase.from("cards").upsert(row, { onConflict: "id" });
  if (error) throw error;
  await syncParticipantsForCard(card, projectId);
}

async function updateOwnedCardInCloud(cardId, updates) {
  if (!supabase || !authUser || !cardId) return;
  const localFound = findCard(String(cardId));
  const payload = {};
  if ("title" in updates) payload.title = updates.title || "Sem título";
  if ("description" in updates) payload.description = updates.description || "";
  if ("owner" in updates) payload.owner = updates.owner || "";
  if ("date" in updates) payload.due_date = updates.date || null;
  if ("labels" in updates) payload.labels = Array.isArray(updates.labels) ? updates.labels : [];
  if ("participants" in updates) payload.participants = normalizeParticipants(updates.participants || [], localFound?.card?.createdAt);
  if ("checklist" in updates) payload.checklist = normalizeChecklistItems(updates.checklist || [], localFound?.card?.createdAt);
  if ("comments" in updates) payload.comments = normalizeComments(updates.comments || [], localFound?.card?.createdAt);
  if ("attachments" in updates) payload.attachments = normalizeAttachments(updates.attachments || [], localFound?.card?.createdAt);
  if ("column_key" in updates) payload.column_key = updates.column_key;
  if ("project_id" in updates) payload.project_id = String(updates.project_id);
  if ("position" in updates) payload.position = updates.position;
  if (localFound?.columnId === "done") {
    throw new Error("Este card está concluído e travado. Reabra-o antes de alterar qualquer informação.");
  }
  const { error } = await supabase.from("cards").update(payload).eq("id", String(cardId)).eq("owner_id", authUser.id);
  if (error) throw error;
  if ("participants" in updates && "project_id" in updates) {
    await syncParticipantsForCard({ id: cardId, participants: updates.participants }, updates.project_id);
  }
}

async function persistProjectCardsOrder(project) {
  if (!project) return;
  await persistProjectToCloud(project);
  const rows = flattenCardsForCloud(project).filter(row => row.column_key !== "done");
  if (!rows.length) return;

  // Cards concluídos são imutáveis e não entram em atualizações de ordenação.
  // As demais linhas continuam completas para evitar falha em colunas NOT NULL.
  const { error } = await supabase.from("cards").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function deleteCardFromCloud(cardId) {
  if (!supabase || !authUser || !cardId) return;
  // card_participants é removido automaticamente pelo ON DELETE CASCADE.
  const { data, error } = await supabase
    .from("cards")
    .delete()
    .eq("owner_id", authUser.id)
    .eq("id", String(cardId))
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("O card não foi encontrado ou sua conta não tem permissão para excluí-lo.");
}

async function deleteProjectFromCloud(projectId) {
  if (!supabase || !authUser || !projectId) return;
  // Cards e participantes são removidos automaticamente por ON DELETE CASCADE.
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("owner_id", authUser.id)
    .eq("id", String(projectId))
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("O projeto não foi encontrado ou sua conta não tem permissão para excluí-lo.");
}

async function syncAllToCloud() { return; }

// ============================================================
// WELCOME SPLASH
// ============================================================
function maybeShowLoginWelcome(user) {
  if (!user) return;
  const shouldShow = false;
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
  // Show/hide auth-only elements
  const notifBtnEl    = document.getElementById("notifBtn");
  const chatWidgetEl  = document.getElementById("chatWidget");
  const sidebarChatEl = document.getElementById("sidebarChatSection");
  if (notifBtnEl)    notifBtnEl.classList.toggle("hidden", !isLogged);
  if (chatWidgetEl)  chatWidgetEl.style.display = isLogged ? "" : "none";
  if (sidebarChatEl) sidebarChatEl.classList.toggle("hidden", !isLogged);
  if (!isLogged && chatRuntimeReady) { closeChatWindow(); }

  updateCreationAccess(); renderProjects(); renderBoard();

  // Refresh notifications and chat badge after auth change
  if (isLogged) {
    setTimeout(kqRenderNotifications, 200);
    setTimeout(kqLoadConversations, 400);
  }
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAppBaseUrl() }
    });
    if (error) throw error;
  } catch(error) { console.error("Erro no login com Google:", error); alert("Não foi possível iniciar o login com Google."); }
}

// ============================================================
// PARTICIPANTS HELPERS
// ============================================================
function participantDisplayName(p) { if (!p) return ""; return p.full_name || p.name || p.email || String(p); }
function participantEmail(p)        { if (!p || typeof p === "string") return ""; return p.email || ""; }

function normalizeParticipant(p, fallbackCreatedAt = null) {
  if (!p) return null;
  if (typeof p === "string") return { user_id: null, full_name: p, email: "", avatar_url: "", added_at: fallbackCreatedAt || new Date().toISOString() };
  return {
    user_id: p.user_id || p.id || null,
    full_name: p.full_name || p.name || p.email || "Participante",
    email: p.email || "",
    avatar_url: p.avatar_url || p.picture || "",
    added_at: p.added_at || p.addedAt || p.created_at || p.createdAt || fallbackCreatedAt || new Date().toISOString()
  };
}
function normalizeParticipants(participants, fallbackCreatedAt = null) {
  return (Array.isArray(participants) ? participants : []).map(p => normalizeParticipant(p, fallbackCreatedAt)).filter(Boolean);
}
function normalizeChecklistItems(items, fallbackCreatedAt = null) {
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    id: item?.id || uid(),
    text: item?.text || "Item",
    done: Boolean(item?.done),
    createdAt: item?.createdAt || item?.created_at || fallbackCreatedAt || new Date().toISOString()
  }));
}
function normalizeComments(items, fallbackCreatedAt = null) {
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    id: item?.id || uid(),
    text: item?.text || "",
    author: item?.author || "",
    createdAt: item?.createdAt || item?.created_at || fallbackCreatedAt || new Date().toISOString()
  }));
}

function normalizeAttachments(items, fallbackCreatedAt = null) {
  return (Array.isArray(items) ? items : []).map(item => {
    if (!item) return null;
    return {
      id: item.id || uid(),
      name: item.name || item.file_name || "Documento",
      path: item.path || item.storage_path || "",
      size: Number(item.size || item.size_bytes || 0),
      mimeType: item.mimeType || item.mime_type || "application/octet-stream",
      uploadedAt: item.uploadedAt || item.uploaded_at || item.createdAt || item.created_at || fallbackCreatedAt || new Date().toISOString(),
      uploadedBy: item.uploadedBy || item.uploaded_by || null,
      uploadedByName: item.uploadedByName || item.uploaded_by_name || "Usuário"
    };
  }).filter(item => item && item.path);
}

function participantAvatarHtml(participant, className = "participant-avatar") {
  const normalized = normalizeParticipant(participant);
  const name = participantDisplayName(normalized) || "Participante";
  const initials = getInitials(name);
  if (normalized?.avatar_url) {
    return `<span class="${className}" title="${escapeHtml(name)}"><span class="participant-avatar-initials" aria-hidden="true">${escapeHtml(initials)}</span><img src="${escapeHtml(normalized.avatar_url)}" alt="Avatar de ${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></span>`;
  }
  return `<span class="${className} participant-avatar-fallback" title="${escapeHtml(name)}" aria-label="${escapeHtml(name)}">${escapeHtml(initials)}</span>`;
}

function renderParticipantAvatarStack(participants, maxVisible = 5) {
  const normalized = normalizeParticipants(participants || []);
  if (!normalized.length) return "";
  const visible = normalized.slice(0, maxVisible);
  const remaining = normalized.length - visible.length;
  return `<div class="card-avatar-stack" aria-label="${normalized.length} participante(s)">${visible.map(p => participantAvatarHtml(p, "card-participant-avatar")).join("")}${remaining > 0 ? `<span class="card-participant-avatar participant-avatar-more" title="Mais ${remaining} participante(s)">+${remaining}</span>` : ""}</div>`;
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "Tamanho não informado";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function sanitizeStorageFileName(fileName) {
  const normalized = String(fileName || "documento")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return normalized || "documento";
}

function validateAttachmentFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return [];
  if (files.length > MAX_FILES_PER_SELECTION) {
    throw new Error(`Selecione no máximo ${MAX_FILES_PER_SELECTION} arquivos por vez.`);
  }
  files.forEach(file => {
    const extension = getFileExtension(file.name);
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
      throw new Error(`O arquivo “${file.name}” não possui um formato permitido.`);
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`O arquivo “${file.name}” ultrapassa o limite de 15 MB.`);
    }
    if (file.size <= 0) {
      throw new Error(`O arquivo “${file.name}” está vazio.`);
    }
  });
  return files;
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
          <span>${escapeHtml(participantEmail(p) || "Participante adicionado")} · Incluído em ${escapeHtml(formatDateTime(p.added_at))}</span>
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
  const normalized = normalizeParticipant({ ...p, added_at: p?.added_at || new Date().toISOString() });
  const key = normalized.user_id || normalized.email || participantDisplayName(normalized);
  const exists = tempParticipants.some(item => (item.user_id || item.email || participantDisplayName(item)) === key);
  if (exists) return;
  tempParticipants.push(normalized);
  cardModalDirty = true;
  renderSelectedParticipants();
}

function removeParticipantFromTemp(key) {
  tempParticipants = tempParticipants.filter(item => (item.user_id || item.email || participantDisplayName(item)) !== key);
  cardModalDirty = true;
  renderSelectedParticipants();
}

async function handleCheckParticipant() {
  if (!requireAuth("buscar participantes")) return;
  const term = cardParticipantsInput?.value.trim();
  if (!term) { participantSearchResults = []; renderParticipantSearchResults(); return; }
  if (term.length < 2) { alert("Digite pelo menos 2 caracteres para buscar."); return; }
  if (!supabase) { alert("Configure o Supabase para buscar participantes."); return; }

  const originalText = cardCheckParticipantBtn.textContent;
  cardCheckParticipantBtn.disabled = true;
  cardCheckParticipantBtn.textContent = "Buscando...";
  try {
    const { data, error } = await supabase.rpc("search_profiles", { search_term: term });
    if (error) throw error;
    participantSearchResults = normalizeParticipants(data || []).filter(p => p.user_id !== authUser.id);
    if (!participantSearchResults.length) {
      participantSearchResultsEl.innerHTML = `<div class="participant-search-empty">Nenhum usuário encontrado para "${escapeHtml(term)}". O usuário precisa ter entrado no Kanban Quest pelo menos uma vez.</div>`;
      return;
    }
    renderParticipantSearchResults();
  } catch (error) {
    console.error("Erro ao buscar participantes:", error);
    alert(`Não foi possível buscar participantes.

Motivo: ${formatCloudError(error)}`);
  } finally {
    cardCheckParticipantBtn.disabled = false;
    cardCheckParticipantBtn.textContent = originalText;
  }
}

// ============================================================
// ANEXOS — SUPABASE STORAGE (100% ONLINE)
// ============================================================
function getCardAccessEntry(cardId) {
  const shared = findSharedCard(String(cardId));
  if (shared) return { card: shared.card, columnId: shared.columnId, isShared: true, ownerId: shared.ownerId };
  const owned = findCard(String(cardId));
  if (owned) return { card: owned.card, columnId: owned.columnId, isShared: false, ownerId: authUser?.id || null };
  return null;
}

function canRemoveAttachment(attachment, accessEntry) {
  if (!authUser || !accessEntry || accessEntry.columnId === "done") return false;
  if (!accessEntry.isShared) return true;
  return attachment?.uploadedBy === authUser.id;
}

async function uploadAttachmentFiles(cardId, files) {
  if (!supabase || !authUser) throw new Error("É necessário estar conectado para anexar documentos.");
  const access = getCardAccessEntry(cardId);
  if (!access) throw new Error("O card precisa estar salvo antes do envio dos anexos.");
  if (access.columnId === "done") throw new Error("Cards concluídos estão travados e não aceitam novos anexos.");

  const validatedFiles = validateAttachmentFiles(files);
  if (!validatedFiles.length) return [];

  const presentation = getUserPresentation(authUser);
  const ownerFolder = access.ownerId || authUser.id;
  const uploaded = [];

  try {
    for (const file of validatedFiles) {
      const uniquePart = (window.crypto?.randomUUID?.() || uid()).replace(/[^a-zA-Z0-9_-]/g, "");
      const safeName = sanitizeStorageFileName(file.name);
      const path = `${String(cardId)}/${String(ownerFolder)}/${String(authUser.id)}/${Date.now()}-${uniquePart}-${safeName}`;
      const { error } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600"
        });
      if (error) throw error;

      uploaded.push({
        id: uniquePart,
        name: file.name,
        path,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        uploadedBy: authUser.id,
        uploadedByName: presentation.fullName
      });
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) {
      await removeAttachmentObjects(uploaded.map(item => item.path), { silent: true });
    }
    throw error;
  }
}

async function removeAttachmentObjects(paths, { silent = false } = {}) {
  const cleanPaths = [...new Set((paths || []).filter(Boolean))];
  if (!supabase || !cleanPaths.length) return true;
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove(cleanPaths);
  if (error) {
    console.error("Erro ao remover anexos do Storage:", error);
    if (!silent) alert(`O registro foi atualizado, mas não foi possível remover um arquivo do armazenamento.\n\nMotivo: ${formatCloudError(error)}`);
    return false;
  }
  return true;
}

async function openAttachmentFile(attachment) {
  if (!supabase || !attachment?.path) return;
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.path, 120, { download: false });
  if (error || !data?.signedUrl) {
    console.error("Erro ao abrir anexo:", error);
    alert(`Não foi possível abrir o anexo.\n\nMotivo: ${formatCloudError(error)}`);
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function attachmentIcon(attachment) {
  const ext = getFileExtension(attachment?.name);
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📕";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["ppt", "pptx"].includes(ext)) return "📽️";
  if (["doc", "docx", "txt"].includes(ext)) return "📄";
  if (ext === "zip") return "🗜️";
  return "📎";
}

function createAttachmentRow(attachment, { pending = false, removable = false, onRemove = null } = {}) {
  const row = document.createElement("div");
  row.className = `attachment-item${pending ? " is-pending" : ""}`;
  row.innerHTML = `
    <button class="attachment-open-btn" type="button" ${pending ? "disabled" : ""} title="${pending ? "Será enviado ao salvar" : "Abrir anexo"}">
      <span class="attachment-icon">${attachmentIcon(attachment)}</span>
      <span class="attachment-copy">
        <strong>${escapeHtml(attachment.name || "Documento")}</strong>
        <small>${pending ? "Aguardando o salvamento" : `${escapeHtml(formatFileSize(attachment.size))} · ${escapeHtml(attachment.uploadedByName || "Usuário")} · ${escapeHtml(formatDateTime(attachment.uploadedAt))}`}</small>
      </span>
    </button>
    ${removable ? `<button class="attachment-remove-btn" type="button" aria-label="Remover anexo" title="Remover anexo">✕</button>` : ""}`;

  if (!pending) row.querySelector(".attachment-open-btn")?.addEventListener("click", () => openAttachmentFile(attachment));
  if (removable && onRemove) row.querySelector(".attachment-remove-btn")?.addEventListener("click", onRemove);
  return row;
}

function renderEditAttachments() {
  if (!editAttachmentsList) return;
  editAttachmentsList.innerHTML = "";
  const access = currentEditingCardId ? getCardAccessEntry(currentEditingCardId) : null;
  const allCount = tempAttachments.length + pendingAttachmentFiles.length;
  if (editAttachmentsCounter) editAttachmentsCounter.textContent = String(allCount);

  tempAttachments.forEach(attachment => {
    const removable = !access || canRemoveAttachment(attachment, access);
    editAttachmentsList.appendChild(createAttachmentRow(attachment, {
      removable,
      onRemove: () => {
        if (attachment.path) removedAttachmentPaths.add(attachment.path);
        tempAttachments = tempAttachments.filter(item => item.id !== attachment.id);
        cardModalDirty = true;
        renderEditAttachments();
      }
    }));
  });

  pendingAttachmentFiles.forEach((file, index) => {
    editAttachmentsList.appendChild(createAttachmentRow({
      id: `pending-${index}`,
      name: file.name,
      size: file.size,
      uploadedByName: "",
      uploadedAt: new Date().toISOString()
    }, {
      pending: true,
      removable: true,
      onRemove: () => {
        pendingAttachmentFiles = pendingAttachmentFiles.filter((_, currentIndex) => currentIndex !== index);
        cardModalDirty = true;
        renderEditAttachments();
      }
    }));
  });

  if (!allCount) {
    editAttachmentsList.innerHTML = `<div class="attachment-empty-state">Nenhum documento anexado.</div>`;
  }
}

function handleEditAttachmentSelection(event) {
  try {
    const selected = validateAttachmentFiles(event?.target?.files);
    selected.forEach(file => {
      const duplicate = pendingAttachmentFiles.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
      if (!duplicate) pendingAttachmentFiles.push(file);
    });
    if (selected.length) cardModalDirty = true;
    renderEditAttachments();
  } catch (error) {
    alert(error.message || "Não foi possível selecionar os arquivos.");
  } finally {
    if (event?.target) event.target.value = "";
  }
}

async function persistAttachmentsForCard(cardId, attachments) {
  const access = getCardAccessEntry(cardId);
  if (!access) throw new Error("Card não encontrado.");
  const normalized = normalizeAttachments(attachments, access.card.createdAt);
  if (access.isShared) {
    const ok = await saveSharedCardUpdate(cardId, { attachments: normalized });
    if (!ok) throw new Error("Não foi possível salvar os anexos do card compartilhado.");
  } else {
    await updateOwnedCardInCloud(cardId, { attachments: normalized });
  }
  access.card.attachments = normalized;
  return normalized;
}

async function handleViewAttachmentSelection(event) {
  const cardId = viewEditCardBtn?.dataset.cardId;
  const access = cardId ? getCardAccessEntry(cardId) : null;
  if (!access) return;
  if (access.columnId === "done") {
    alert("Este card está concluído e travado. Reabra-o antes de anexar documentos.");
    if (event?.target) event.target.value = "";
    return;
  }
  if (attachmentActionInProgress) return;

  let uploaded = [];
  try {
    const selected = validateAttachmentFiles(event?.target?.files);
    if (!selected.length) return;
    attachmentActionInProgress = true;
    if (viewSelectAttachmentBtn) {
      viewSelectAttachmentBtn.disabled = true;
      viewSelectAttachmentBtn.textContent = "Enviando...";
    }
    uploaded = await uploadAttachmentFiles(cardId, selected);
    const nextAttachments = [...normalizeAttachments(access.card.attachments || []), ...uploaded];
    await persistAttachmentsForCard(cardId, nextAttachments);
    renderBoard();
    openViewCardModal(cardId);
  } catch (error) {
    if (uploaded.length) await removeAttachmentObjects(uploaded.map(item => item.path), { silent: true });
    console.error("Erro ao enviar anexos:", error);
    alert(`Não foi possível anexar os documentos.\n\nMotivo: ${formatCloudError(error)}`);
  } finally {
    attachmentActionInProgress = false;
    if (viewSelectAttachmentBtn) {
      viewSelectAttachmentBtn.disabled = false;
      viewSelectAttachmentBtn.textContent = "📎 Anexar documentos";
    }
    if (event?.target) event.target.value = "";
  }
}

async function removeAttachmentFromView(cardId, attachment) {
  const access = getCardAccessEntry(cardId);
  if (!access || !canRemoveAttachment(attachment, access)) return;
  const confirmed = confirm(`Deseja remover o anexo “${attachment.name}”?`);
  if (!confirmed) return;
  try {
    const nextAttachments = normalizeAttachments(access.card.attachments || []).filter(item => item.id !== attachment.id);
    await persistAttachmentsForCard(cardId, nextAttachments);
    await removeAttachmentObjects([attachment.path]);
    renderBoard();
    openViewCardModal(cardId);
  } catch (error) {
    console.error("Erro ao remover anexo:", error);
    alert(`Não foi possível remover o anexo.\n\nMotivo: ${formatCloudError(error)}`);
  }
}

function renderViewAttachments(card, columnId) {
  if (!viewAttachmentsList) return;
  const attachments = normalizeAttachments(card.attachments || [], card.createdAt);
  const access = getCardAccessEntry(card.id);
  const isCompleted = columnId === "done";
  viewAttachmentsCounter.textContent = String(attachments.length);
  viewAttachmentsList.innerHTML = "";
  viewAttachmentUploadRow?.classList.toggle("hidden", isCompleted);
  if (viewSelectAttachmentBtn) viewSelectAttachmentBtn.disabled = isCompleted;

  attachments.forEach(attachment => {
    viewAttachmentsList.appendChild(createAttachmentRow(attachment, {
      removable: !isCompleted && canRemoveAttachment(attachment, access),
      onRemove: () => removeAttachmentFromView(card.id, attachment)
    }));
  });
  if (!attachments.length) {
    viewAttachmentsList.innerHTML = `<div class="attachment-empty-state">Nenhum documento anexado.</div>`;
  }
}

// ============================================================
// LOCAL STATE
// ============================================================
function safeGetItem(_key) { return null; }
function safeSetItem(_key, _value) {}

function loadState() {
  return { currentProjectId: null, projects: [] };
}

function saveState() {
  state.currentProjectId = currentProjectId;
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
        participants: normalizeParticipants(Array.isArray(card.participants) ? card.participants : [], card.createdAt),
        checklist: normalizeChecklistItems(Array.isArray(card.checklist) ? card.checklist : [], card.createdAt),
        comments: normalizeComments(Array.isArray(card.comments) ? card.comments : [], card.createdAt),
        attachments: normalizeAttachments(Array.isArray(card.attachments) ? card.attachments : [], card.createdAt),
        createdAt: card.createdAt || new Date().toISOString(),
        completedAt: card.completedAt || null,
        completedBy: card.completedBy || null,
        reopenedAt: card.reopenedAt || null,
        reopenedBy: card.reopenedBy || null,
        reopenedCount: Number(card.reopenedCount || 0),
        isReopened: Boolean(card.isReopened)
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
      <span class="project-item-copy">
        <span class="project-item-name">${escapeHtml(project.name)}</span>
        <small class="project-created-date">Incluído em ${escapeHtml(formatDateTime(project.createdAt))}</small>
      </span>
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
      ...(card.checklist || []).map(i => i.text),
      ...normalizeAttachments(card.attachments || []).map(a => a.name)
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
    const isCompleted = columnId === "done";
    const isReopened = Boolean(card.isReopened) && !isCompleted;
    cardEl.className = `card${isCompleted ? " is-completed" : ""}${isReopened ? " is-reopened" : ""}`;
    cardEl.draggable = !isShared && !isCompleted; // concluídos ficam travados
    cardEl.dataset.cardId = card.id;

    const labelsHtml = (card.labels || []).filter(Boolean).map(l => `<span class="label">${escapeHtml(l)}</span>`).join("");
    const meta = [];
    if (card.owner) meta.push(`<span class="meta-chip">👤 ${escapeHtml(card.owner)}</span>`);
    if (card.date)  meta.push(`<span class="meta-chip">Prazo: ${formatDate(card.date)}</span>`);
    meta.push(`<span class="meta-chip">Incluído: ${escapeHtml(formatDateTime(card.createdAt))}</span>`);
    if (isCompleted && card.completedAt) meta.push(`<span class="meta-chip completed-meta">Concluído: ${escapeHtml(formatDateTime(card.completedAt))}</span>`);
    if (isReopened && card.reopenedAt) meta.push(`<span class="meta-chip reopened-meta">Reaberto: ${escapeHtml(formatDateTime(card.reopenedAt))}</span>`);

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
    const attachmentsCount = normalizeAttachments(card.attachments || []).length;
    const participants  = normalizeParticipants(card.participants || []);
    const participantsHtml = renderParticipantAvatarStack(participants, 5);

    const sharedBadge = isShared ? `<span class="card-shared-badge">🤝 Compartilhado</span>` : "";
    const completedBadge = isCompleted ? `<span class="card-status-badge completed">🔒 Concluído e travado</span>` : "";
    const reopenedBadge = isReopened ? `<span class="card-status-badge reopened">↩ Reaberto</span>` : "";
    const statusBadges = [sharedBadge, completedBadge, reopenedBadge].filter(Boolean).join("");

    cardEl.innerHTML = `
      ${isReopened ? `<span class="reopened-watermark" aria-hidden="true">REABERTO</span>` : ""}
      ${statusBadges ? `<div class="card-status-row">${statusBadges}</div>` : ""}
      <h4 class="card-title">${escapeHtml(card.title || "Sem título")}</h4>
      <p class="card-desc">${escapeHtml(truncate(card.description || "Sem descrição.", 140))}</p>
      ${labelsHtml ? `<div class="card-labels">${labelsHtml}</div>` : ""}
      ${meta.length ? `<div class="card-meta">${meta.join("")}</div>` : ""}
      ${checkHtml}
      <div class="card-comments-row card-footer-row">
        <div class="card-activity-summary">
          <span class="card-comments-info">💬 ${commentsCount} comentário(s)</span>
          ${attachmentsCount ? `<span class="card-attachments-info">📎 ${attachmentsCount} anexo(s)</span>` : ""}
        </div>
        <div class="card-footer-actions">
          ${participantsHtml}
          <div class="card-actions">
            <button class="btn btn-soft btn-sm edit-card-btn" type="button">${isCompleted ? "Visualizar" : (isShared ? "Editar (participante)" : "Editar")}</button>
          </div>
        </div>
      </div>`;

    cardEl.addEventListener("click", e => {
      if (e.target.closest(".edit-card-btn")) return;
      openViewCardModal(card.id);
    });

    cardEl.querySelector(".edit-card-btn").addEventListener("click", e => {
      e.stopPropagation();
      if (isCompleted) openViewCardModal(card.id);
      else openCardModal("edit", columnId, card.id);
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

async function handleSaveProject() {
  if (!requireAuth("salvar projetos")) return;
  const name = projectNameInput.value.trim();
  if (!name) { alert("Digite um nome para o projeto."); projectNameInput.focus(); return; }

  const projectsSnapshot = clone(state.projects);
  const currentProjectSnapshot = currentProjectId;
  const originalText = saveProjectBtn.textContent;
  saveProjectBtn.disabled = true;
  saveProjectBtn.textContent = "Salvando...";

  try {
    let projectToPersist = null;
    if (projectModalMode === "create") {
      const exists = state.projects.some(p => p.name.toLowerCase() === name.toLowerCase());
      if (exists) { alert("Já existe um projeto com esse nome."); return; }
      const newProject = createProject(name);
      state.projects.push(newProject);
      currentProjectId = newProject.id;
      isViewingSharedProject = false;
      projectToPersist = newProject;
    } else {
      const currentProject = getCurrentProject();
      if (!currentProject) return;
      const exists = state.projects.some(p => p.id !== currentProject.id && p.name.toLowerCase() === name.toLowerCase());
      if (exists) { alert("Já existe outro projeto com esse nome."); return; }
      currentProject.name = name;
      projectToPersist = currentProject;
    }

    await persistProjectToCloud(projectToPersist);
    saveState();
    renderProjects();
    renderBoard();
    closeProjectModal();
  } catch (error) {
    state.projects = projectsSnapshot;
    currentProjectId = currentProjectSnapshot;
    console.error("Erro ao salvar projeto:", error);
    alert(`Não foi possível salvar o projeto online.

Motivo: ${formatCloudError(error)}`);
  } finally {
    saveProjectBtn.disabled = false;
    saveProjectBtn.textContent = originalText;
  }
}

async function handleDeleteProject() {
  if (!requireAuth("excluir projetos")) return;
  const project = getCurrentProject();
  if (!project) return;
  const ok = confirm(`Deseja excluir o projeto "${project.name}"?`);
  if (!ok) return;
  const projectsSnapshot = clone(state.projects);
  const currentProjectSnapshot = currentProjectId;
  const attachmentPaths = Object.values(project.columns || {}).flatMap(cards =>
    (cards || []).flatMap(card => normalizeAttachments(card.attachments || []).map(item => item.path))
  );
  try {
    await deleteProjectFromCloud(project.id);
    if (attachmentPaths.length) await removeAttachmentObjects(attachmentPaths);
    state.projects = state.projects.filter(p => p.id !== project.id);
    currentProjectId = state.projects[0]?.id || null;
    saveState(); renderProjects(); renderBoard();
  } catch (error) {
    state.projects = projectsSnapshot;
    currentProjectId = currentProjectSnapshot;
    console.error("Erro ao excluir projeto:", error);
    alert(`Não foi possível excluir o projeto online.

Motivo: ${formatCloudError(error)}`);
  }
}

// ============================================================
// CARD MODAL — OWNER + PARTICIPANT MODES
// ============================================================
function setCardModalVisualState(overlay, { isReopened = false, isCompleted = false } = {}) {
  if (!overlay) return;
  overlay.classList.toggle("is-reopened-context", Boolean(isReopened));
  overlay.classList.toggle("is-completed-context", Boolean(isCompleted));
  const modalCard = overlay.querySelector(".modal-card");
  modalCard?.classList.toggle("is-reopened-context", Boolean(isReopened));
  modalCard?.classList.toggle("is-completed-context", Boolean(isCompleted));
}

function injectEditReopenedNotice(card, isReopened) {
  const existing = document.getElementById("edit-reopened-notice");
  if (existing) existing.remove();
  if (!isReopened || !card) return;

  const notice = document.createElement("div");
  notice.id = "edit-reopened-notice";
  notice.className = "card-status-notice is-reopened edit-reopened-notice";
  notice.innerHTML = `
    <span class="status-notice-icon">↩</span>
    <div>
      <strong>Card reaberto</strong>
      <span>Reaberto em ${escapeHtml(formatDateTime(card.reopenedAt || card.createdAt))}. O destaque visual será mantido até uma nova conclusão.</span>
    </div>`;

  const modalBody = cardModalOverlay.querySelector(".modal-body");
  modalBody?.insertBefore(notice, modalBody.firstChild);
}

function openCardModal(mode, columnId, cardId = null) {
  if (!requireAuth(mode === "create" ? "criar cards" : "editar cards")) return;

  // Check if it's a shared card
  const shared = cardId ? findSharedCard(cardId) : null;
  const existingFound = cardId ? (shared ? { card: shared.card, columnId: shared.columnId } : findCard(cardId)) : null;
  if (mode === "edit" && existingFound?.columnId === "done") {
    alert("Este card está concluído e travado. Use a opção Reabrir para voltar a editá-lo.");
    openViewCardModal(cardId);
    return;
  }

  const modalCard = existingFound?.card || null;
  const isReopenedContext = Boolean(modalCard?.isReopened) && existingFound?.columnId !== "done";
  setCardModalVisualState(cardModalOverlay, { isReopened: isReopenedContext, isCompleted: false });

  if (!shared && !getCurrentProject()) {
    if (!isViewingSharedProject) { alert("Crie um projeto antes de adicionar cards."); return; }
  }

  currentTargetColumn  = columnId;
  currentEditingCardId = null;
  tempChecklist        = [];
  tempComments         = [];
  tempAttachments      = [];
  pendingAttachmentFiles = [];
  removedAttachmentPaths = new Set();
  tempParticipants     = [];
  participantSearchResults = [];

  if (mode === "create") {
    cardModalTitle.textContent = "Novo Card";
    deleteCardBtn.classList.add("hidden");
    cardTitleInput.value  = ""; cardDescInput.value  = "";
    cardOwnerInput.value  = authUser ? getUserPresentation(authUser).fullName : "";
    cardDateInput.value   = ""; cardLabelsInput.value = "";
    if (cardParticipantsInput) cardParticipantsInput.value = "";
    if (cardCreatedInfo) cardCreatedInfo.classList.add("hidden");
    // Show all fields for owner
    setOwnerOnlyFields(true);
  } else {
    const found = shared ? { card: shared.card, columnId: shared.columnId } : findCard(cardId);
    if (!found) return;

    currentEditingCardId = cardId;
    currentTargetColumn  = found.columnId;
    cardModalTitle.textContent = shared ? "Editar Card (Participante)" : "Editar Card";
    if (cardCreatedInfo) {
      cardCreatedInfo.textContent = `📅 Data de inclusão do card: ${formatDateTime(found.card.createdAt)}`;
      cardCreatedInfo.classList.remove("hidden");
    }

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
    tempAttachments = normalizeAttachments(clone(found.card.attachments || []), found.card.createdAt);
  }

  // Show participant notice if shared and a compact status notice for reopened cards.
  injectParticipantNotice(!!shared);
  injectEditReopenedNotice(modalCard, isReopenedContext);

  renderSelectedParticipants();
  renderParticipantSearchResults();
  renderEditAttachments();
  renderEditChecklist();
  renderEditComments();
  openModal(cardModalOverlay);
  cardModalDirty = false;
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
  notice.innerHTML = `<span>🤝</span><span><strong>Modo Participante</strong> — você pode editar título, descrição, checklist, comentários e anexar documentos. Para mover o card, use o botão "Ver" e depois "Mover para".</span>`;
  const modalBody = cardModalOverlay.querySelector(".modal-body");
  modalBody.insertBefore(notice, modalBody.firstChild);
}

function closeCardModal(force = false) {
  if (!force && cardModalDirty && !cardModalOverlay.classList.contains("hidden")) {
    const discard = confirm("Existem alterações ainda não salvas. Deseja fechar e descartar o preenchimento?");
    if (!discard) return;
  }
  participantSearchResults = [];
  tempParticipants = [];
  tempAttachments = [];
  pendingAttachmentFiles = [];
  removedAttachmentPaths = new Set();
  if (cardAttachmentInput) cardAttachmentInput.value = "";
  renderParticipantSearchResults();
  renderEditAttachments();
  document.getElementById("edit-reopened-notice")?.remove();
  setCardModalVisualState(cardModalOverlay);
  cardModalDirty = false;
  closeModal(cardModalOverlay);
}

async function handleSaveCard() {
  if (!requireAuth("salvar cards")) return;
  if (cardSaveInProgress) return;

  // Shared card save
  if (currentEditingCardId && isSharedCard(currentEditingCardId)) {
    cardSaveInProgress = true;
    saveCardBtn.disabled = true;
    const originalText = saveCardBtn.textContent;
    saveCardBtn.textContent = pendingAttachmentFiles.length ? "Enviando anexos..." : "Salvando...";
    try {
      const saved = await handleSharedCardSave(currentEditingCardId);
      if (saved) cardModalDirty = false;
    } finally {
      cardSaveInProgress = false;
      saveCardBtn.disabled = false;
      saveCardBtn.textContent = originalText;
    }
    return;
  }

  const title = cardTitleInput.value.trim();
  if (!title) { alert("Digite um título para o card."); cardTitleInput.focus(); return; }
  const project = getCurrentProject();
  if (!project) return;

  const isEditing = Boolean(currentEditingCardId);
  const previousCard = isEditing ? findCard(currentEditingCardId)?.card : null;
  const cardData = {
    id: currentEditingCardId || uid(), title,
    description: cardDescInput.value.trim(),
    owner: cardOwnerInput.value.trim() || (authUser ? getUserPresentation(authUser).fullName : ""),
    date: cardDateInput.value,
    labels: cardLabelsInput.value.split(",").map(l => l.trim()).filter(Boolean),
    participants: normalizeParticipants(clone(tempParticipants)),
    checklist: normalizeChecklistItems(clone(tempChecklist)),
    comments: normalizeComments(clone(tempComments)),
    attachments: normalizeAttachments(clone(tempAttachments)),
    createdAt: previousCard?.createdAt || new Date().toISOString(),
    completedAt: previousCard?.completedAt || null,
    completedBy: previousCard?.completedBy || null,
    reopenedAt: previousCard?.reopenedAt || null,
    reopenedBy: previousCard?.reopenedBy || null,
    reopenedCount: Number(previousCard?.reopenedCount || 0),
    isReopened: Boolean(previousCard?.isReopened)
  };

  const columnsSnapshot = clone(project.columns);
  cardSaveInProgress = true;
  saveCardBtn.disabled = true;
  const originalText = saveCardBtn.textContent;
  saveCardBtn.textContent = pendingAttachmentFiles.length ? "Enviando anexos..." : "Salvando...";
  let uploaded = [];
  let createdCardPersisted = false;

  try {
    // Cards existentes já podem receber o upload antes do update final.
    if (isEditing && pendingAttachmentFiles.length) {
      uploaded = await uploadAttachmentFiles(cardData.id, pendingAttachmentFiles);
      cardData.attachments = normalizeAttachments([...cardData.attachments, ...uploaded], cardData.createdAt);
    }

    if (isEditing) {
      const found = findCard(currentEditingCardId);
      if (!found) throw new Error("O card não foi encontrado no projeto atual.");
      project.columns[found.columnId] = project.columns[found.columnId].filter(c => c.id !== currentEditingCardId);
      project.columns[currentTargetColumn].push(cardData);
    } else {
      project.columns[currentTargetColumn].push(cardData);
    }

    await persistProjectToCloud(project);
    const targetPosition = project.columns[currentTargetColumn].findIndex(card => card.id === cardData.id);
    await persistCardToCloud(cardData, project.id, currentTargetColumn, targetPosition);
    createdCardPersisted = !isEditing;

    // Um card novo precisa existir no banco antes de o Storage aceitar o arquivo.
    if (!isEditing && pendingAttachmentFiles.length) {
      uploaded = await uploadAttachmentFiles(cardData.id, pendingAttachmentFiles);
      cardData.attachments = normalizeAttachments([...cardData.attachments, ...uploaded], cardData.createdAt);
      await updateOwnedCardInCloud(cardData.id, { attachments: cardData.attachments });
    }

    await persistProjectCardsOrder(project);
    if (removedAttachmentPaths.size) {
      await removeAttachmentObjects([...removedAttachmentPaths]);
    }

    pendingAttachmentFiles = [];
    removedAttachmentPaths = new Set();
    saveState();
    renderBoard();
    cardModalDirty = false;
    closeCardModal(true);
  } catch (error) {
    if (uploaded.length) await removeAttachmentObjects(uploaded.map(item => item.path), { silent: true });
    if (!isEditing && createdCardPersisted) {
      try { await deleteCardFromCloud(cardData.id); }
      catch (rollbackError) { console.error("Não foi possível desfazer o card após falha no upload:", rollbackError); }
    }
    project.columns = columnsSnapshot;
    console.error("Erro ao salvar card:", error);
    alert(`Não foi possível salvar o card online.\n\nMotivo: ${formatCloudError(error)}`);
  } finally {
    cardSaveInProgress = false;
    saveCardBtn.disabled = false;
    saveCardBtn.textContent = originalText;
  }
}

async function handleDeleteCard() {
  if (!requireAuth("excluir cards")) return;
  if (!currentEditingCardId || cardSaveInProgress) return;
  if (isSharedCard(currentEditingCardId)) { alert("Participantes não podem excluir cards."); return; }

  const ok = confirm("Deseja excluir este card? Esta ação não poderá ser desfeita.");
  if (!ok) return;

  const project = getCurrentProject();
  if (!project) return;
  const found = findCard(currentEditingCardId);
  if (!found) return;
  if (found.columnId === "done") {
    alert("Cards concluídos ficam travados. Reabra o card antes de excluí-lo.");
    return;
  }

  const columnsSnapshot = clone(project.columns);
  const deletingId = currentEditingCardId;
  const attachmentPaths = normalizeAttachments(found.card.attachments || []).map(item => item.path);
  cardSaveInProgress = true;
  deleteCardBtn.disabled = true;
  const originalText = deleteCardBtn.textContent;
  deleteCardBtn.textContent = "Excluindo...";

  try {
    await deleteCardFromCloud(deletingId);
    if (attachmentPaths.length) await removeAttachmentObjects(attachmentPaths);
    project.columns[found.columnId] = project.columns[found.columnId].filter(c => c.id !== deletingId);
    // Não é necessário renumerar as posições: lacunas não afetam a ordenação.
    saveState();
    renderBoard();
    cardModalDirty = false;
    closeCardModal(true);
  } catch (error) {
    project.columns = columnsSnapshot;
    console.error("Erro ao excluir card:", error);
    alert(`Não foi possível excluir o card online.

Motivo: ${formatCloudError(error)}`);
  } finally {
    cardSaveInProgress = false;
    deleteCardBtn.disabled = false;
    deleteCardBtn.textContent = originalText;
  }
}

function handleAddChecklistItem() {
  const text = newChecklistItemInput.value.trim();
  if (!text) return;
  tempChecklist.push({ id: uid(), text, done: false, createdAt: new Date().toISOString() });
  cardModalDirty = true;
  newChecklistItemInput.value = "";
  renderEditChecklist();
}

function handleAddComment() {
  const text = newCommentInput.value.trim();
  if (!text) return;
  tempComments.push({ id: uid(), text, author: authUser ? getUserPresentation(authUser).fullName : "", createdAt: new Date().toISOString() });
  cardModalDirty = true;
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
        <span class="edit-item-copy"><strong>${escapeHtml(item.text)}</strong><small>Incluído em ${escapeHtml(formatDateTime(item.createdAt))}</small></span>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>`;
    row.querySelector("input").addEventListener("change", e => { item.done = e.target.checked; cardModalDirty = true; });
    row.querySelector("button").addEventListener("click", () => { tempChecklist = tempChecklist.filter(c => c.id !== item.id); cardModalDirty = true; renderEditChecklist(); });
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
        <span class="edit-item-copy"><strong>${escapeHtml(comment.text)}</strong><small>${comment.author ? `${escapeHtml(comment.author)} · ` : ""}Incluído em ${escapeHtml(formatDateTime(comment.createdAt))}</small></span>
      </div>
      <button class="btn btn-soft btn-sm" type="button">Remover</button>`;
    row.querySelector("button").addEventListener("click", () => { tempComments = tempComments.filter(c => c.id !== comment.id); cardModalDirty = true; renderEditComments(); });
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
  const isCompleted = columnId === "done";
  const isReopenedContext = Boolean(card.isReopened) && !isCompleted;
  setCardModalVisualState(viewCardModalOverlay, {
    isReopened: isReopenedContext,
    isCompleted
  });
  viewEditCardBtn.dataset.cardId = card.id;

  viewCardTitle.textContent       = card.title || "Sem título";
  viewCardDescription.textContent = card.description || "Sem descrição.";
  viewCardColumn.textContent      = `Coluna: ${columnLabel(columnId)}`;
  if (viewCardCreatedAt) {
    viewCardCreatedAt.textContent = `Incluído: ${formatDateTime(card.createdAt)}`;
    viewCardCreatedAt.classList.remove("hidden");
  }

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
    participants.forEach(p => {
      const participant = document.createElement(p.user_id && supabase ? "button" : "div");
      if (participant.tagName === "BUTTON") participant.type = "button";
      participant.className = "view-participant-item";
      participant.innerHTML = `
        ${participantAvatarHtml(p, "view-participant-avatar")}
        <span class="view-participant-copy">
          <strong>${escapeHtml(participantDisplayName(p))}</strong>
          <small>${escapeHtml(participantEmail(p) || "Participante")} · Incluído em ${escapeHtml(formatDateTime(p.added_at || card.createdAt))}</small>
        </span>`;
      if (p.user_id && supabase) {
        participant.classList.add("is-clickable-bio");
        participant.title = "Ver perfil";
        participant.addEventListener("click", (e) => { e.stopPropagation(); kqOpenBio(p.user_id); });
      }
      viewCardParticipants.appendChild(participant);
    });
  } else { viewCardParticipants.innerHTML = `<div class="empty-state">Nenhum participante.</div>`; }

  renderViewAttachments(card, columnId);

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
      row.className = `view-check-item ${isCompleted ? "is-locked" : "is-clickable"} ${item.done ? "done" : ""}`;
      row.innerHTML = `<span class="view-check-bullet"></span><span class="view-check-copy"><strong>${escapeHtml(item.text)}</strong><small>Incluído em ${escapeHtml(formatDateTime(item.createdAt || card.createdAt))}</small></span>`;
      row.disabled = isCompleted;
      row.addEventListener("click", async () => {
        if (isCompleted) return;
        if (isParticipant) {
          const ok = await toggleSharedChecklistItem(card.id, item.id);
          if (ok) { openViewCardModal(card.id); }
        } else {
          item.done = !item.done;
          try {
            await updateOwnedCardInCloud(card.id, { checklist: card.checklist || [] });
            saveState(); openViewCardModal(card.id); renderBoard();
          } catch (error) {
            console.error("Erro ao atualizar checklist:", error);
            alert("Não foi possível salvar o checklist online.");
          }
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
          ${!isParticipant && !isCompleted ? `<button type="button" class="btn btn-soft btn-sm">Remover</button>` : ""}
        </div>`;
      if (!isParticipant && !isCompleted) {
        row.querySelector("button").addEventListener("click", () => {
          card.comments = (card.comments || []).filter(c => c.id !== comment.id);
          updateOwnedCardInCloud(card.id, { comments: card.comments || [] })
            .then(() => { saveState(); openViewCardModal(card.id); renderBoard(); })
            .catch(error => { console.error("Erro ao remover comentário:", error); alert("Não foi possível atualizar os comentários online."); });
        });
      }
      viewCommentsList.appendChild(row);
    });
  } else { viewCommentsList.innerHTML = `<div class="empty-state">Nenhum comentário.</div>`; }

  // Cards concluídos ficam travados; a única ação disponível é reabrir.
  injectMoveSection(card.id, columnId, isParticipant, isCompleted);

  viewNewCommentInput.disabled = isCompleted;
  viewAddCommentBtn.disabled = isCompleted;
  viewNewCommentInput.placeholder = isCompleted ? "Card concluído: reabra para comentar" : "Adicionar comentário";
  viewNewCommentInput.closest(".inline-add")?.classList.toggle("is-locked", isCompleted);

  if (isParticipant || isCompleted) {
    viewEditCardBtn.style.display = "none";
  } else {
    viewEditCardBtn.style.display = "";
  }

  injectViewParticipantNotice(isParticipant, isCompleted);
  injectCardStatusNotice(card, isCompleted);

  openModal(viewCardModalOverlay);
}

function injectViewParticipantNotice(isParticipant, isCompleted = false) {
  const existing = document.getElementById("view-participant-notice");
  if (existing) existing.remove();
  if (!isParticipant) return;
  const notice = document.createElement("div");
  notice.id = "view-participant-notice";
  notice.className = "participant-notice";
  notice.style.marginBottom = "12px";
  notice.innerHTML = isCompleted
    ? `<span>🔒</span><span><strong>Você é participante</strong> deste card concluído. O conteúdo está travado até que o card seja reaberto.</span>`
    : `<span>🤝</span><span><strong>Você é participante</strong> deste card. Pode marcar checklist, adicionar comentários, anexar documentos e mover o card.</span>`;
  const modalBody = viewCardModalOverlay.querySelector(".modal-body");
  modalBody.insertBefore(notice, modalBody.firstChild);
}

function injectCardStatusNotice(card, isCompleted) {
  const existing = document.getElementById("view-card-status-notice");
  if (existing) existing.remove();
  if (!isCompleted && !card.isReopened) return;
  const notice = document.createElement("div");
  notice.id = "view-card-status-notice";
  notice.className = `card-status-notice ${isCompleted ? "is-completed" : "is-reopened"}`;
  if (isCompleted) {
    notice.innerHTML = `<span class="status-notice-icon">🔒</span><div><strong>Card concluído e travado</strong><span>Concluído em ${escapeHtml(formatDateTime(card.completedAt || card.updatedAt || card.createdAt))}. Reabra para voltar a editar, comentar ou alterar o checklist.</span></div>`;
  } else {
    notice.innerHTML = `<span class="status-notice-icon">↩</span><div><strong>Card reaberto</strong><span>Reaberto em ${escapeHtml(formatDateTime(card.reopenedAt || card.createdAt))}. Esta marca permanece enquanto o card estiver em andamento.</span></div>`;
  }
  const modalBody = viewCardModalOverlay.querySelector(".modal-body");
  modalBody.insertBefore(notice, modalBody.firstChild);
}

function injectMoveSection(cardId, currentCol, isParticipant, isCompleted = false) {
  const existing = document.getElementById("view-move-section");
  if (existing) existing.remove();

  const section = document.createElement("div");
  section.id = "view-move-section";
  section.dataset.cardId = String(cardId);
  section.className = "view-section";

  if (isCompleted) {
    section.innerHTML = `
      <h4>Ações do card</h4>
      <div class="reopen-action-box">
        <div><strong>Este card está travado.</strong><span>Para voltar a alterar as informações, reabra-o.</span></div>
        <button class="btn btn-reopen" id="view-reopen-btn" type="button">↩ Reabrir card</button>
      </div>`;
  } else {
    section.innerHTML = `
      <h4>Mover para</h4>
      <div class="view-move-section">
        <select class="input" id="view-move-select">
          <option value="todo" ${currentCol === "todo" ? "selected" : ""}>📋 Pendente</option>
          <option value="doing" ${currentCol === "doing" ? "selected" : ""}>🔄 Em Progresso</option>
          <option value="done">✅ Concluído</option>
        </select>
        <button class="btn btn-primary" id="view-move-btn" type="button">Mover</button>
      </div>`;
  }

  const modalBody = viewCardModalOverlay.querySelector(".modal-body");
  const commentsSection = viewCommentsList.closest(".view-section");
  if (commentsSection) modalBody.insertBefore(section, commentsSection);
  else modalBody.appendChild(section);

  if (isCompleted) {
    document.getElementById("view-reopen-btn")?.addEventListener("click", async () => {
      const ok = await transitionCardStatus(cardId, "doing");
      if (ok) closeViewCardModal();
    });
    return;
  }

  document.getElementById("view-move-btn")?.addEventListener("click", async () => {
    const newCol = document.getElementById("view-move-select")?.value;
    if (!newCol || newCol === currentCol) return;
    const ok = await transitionCardStatus(cardId, newCol);
    if (ok) closeViewCardModal();
  });
}
function closeViewCardModal() {
  viewNewCommentInput.value = "";
  if (viewAttachmentInput) viewAttachmentInput.value = "";
  setCardModalVisualState(viewCardModalOverlay);
  closeModal(viewCardModalOverlay);
}

async function handleViewAddComment() {
  const cardId = viewEditCardBtn.dataset.cardId;
  const text   = viewNewCommentInput.value.trim();
  const lockedShared = findSharedCard(cardId || "");
  const lockedOwned = cardId ? findCard(cardId) : null;
  if (lockedShared?.columnId === "done" || lockedOwned?.columnId === "done") {
    alert("Este card está concluído e travado. Reabra-o antes de comentar.");
    return;
  }

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
  try {
    await updateOwnedCardInCloud(cardId, { comments: found.card.comments || [] });
    saveState(); openViewCardModal(cardId); renderBoard();
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    alert("Não foi possível salvar o comentário online.");
  }
}

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
// STATUS DO CARD — conclusão, trava e reabertura
// ============================================================
function showStatusConfirmation({ mode, cardTitle }) {
  if (!statusConfirmOverlay) return Promise.resolve(window.confirm("Confirmar ação?"));
  if (statusConfirmResolver) resolveStatusConfirmation(false);

  const completing = mode === "complete";
  statusConfirmIcon.textContent = completing ? "✅" : "↩";
  statusConfirmTitle.textContent = completing ? "Concluir este card?" : "Reabrir este card?";
  statusConfirmMessage.textContent = completing
    ? `Você realmente deseja colocar “${cardTitle}” em Concluído?`
    : `Você realmente deseja reabrir “${cardTitle}”?`;
  statusConfirmWarning.innerHTML = completing
    ? `<strong>Depois da conclusão, o card ficará travado.</strong><span>Não será possível editar, comentar, marcar checklist, mover ou excluir até que ele seja reaberto. Todos os participantes receberão uma notificação.</span>`
    : `<strong>O card voltará para Em Progresso.</strong><span>Ele receberá a marca “REABERTO”, ficará destacado em vermelho/salmão e todos os participantes receberão uma notificação.</span>`;
  statusConfirmAcceptBtn.textContent = completing ? "Sim, concluir" : "Sim, reabrir";
  statusConfirmAcceptBtn.className = completing ? "btn btn-primary" : "btn btn-reopen";
  openModal(statusConfirmOverlay);
  return new Promise(resolve => { statusConfirmResolver = resolve; });
}

function resolveStatusConfirmation(accepted) {
  if (!statusConfirmResolver) {
    if (statusConfirmOverlay) closeModal(statusConfirmOverlay);
    return;
  }
  const resolver = statusConfirmResolver;
  statusConfirmResolver = null;
  closeModal(statusConfirmOverlay);
  resolver(Boolean(accepted));
}

async function transitionCardStatus(cardId, targetColumnId) {
  if (!supabase || !authUser || !cardId) return false;
  const shared = findSharedCard(cardId);
  const owned = shared ? null : findCard(cardId);
  const currentColumn = shared?.columnId || owned?.columnId;
  const card = shared?.card || owned?.card;
  if (!card || !currentColumn || currentColumn === targetColumnId) return false;

  let confirmationMode = null;
  if (targetColumnId === "done" && currentColumn !== "done") confirmationMode = "complete";
  if (currentColumn === "done" && targetColumnId !== "done") confirmationMode = "reopen";

  if (confirmationMode) {
    const accepted = await showStatusConfirmation({ mode: confirmationMode, cardTitle: card.title || "Sem título" });
    if (!accepted) return false;
  }

  try {
    const { error } = await supabase.rpc("transition_card_status", {
      p_card_id: String(cardId),
      p_target_column: targetColumnId
    });
    if (error) throw error;

    await Promise.all([loadCloudData(), loadSharedCards(), loadPersistentNotifications()]);
    kqRenderNotifications();
    return true;
  } catch (error) {
    console.error("Erro ao alterar status do card:", error);
    alert(`Não foi possível alterar o status do card online.\n\nMotivo: ${formatCloudError(error)}`);
    return false;
  }
}

// ============================================================
// DRAG AND DROP (owned cards only)
// ============================================================
async function moveCardToColumnAtPosition(cardId, targetColumnId, targetContainer) {
  const project = getCurrentProject();
  if (!project) return;
  const found = findCard(cardId);
  if (!found) { renderBoard(); return; }

  if (found.columnId === "done") {
    renderBoard();
    alert("Cards concluídos ficam travados. Abra o card e use Reabrir.");
    return;
  }

  if (found.columnId !== targetColumnId) {
    const ok = await transitionCardStatus(cardId, targetColumnId);
    if (!ok) renderBoard();
    return;
  }

  // Reordenação dentro da mesma coluna não altera o status.
  const draggedCard = project.columns[found.columnId].splice(
    project.columns[found.columnId].findIndex(c => c.id === cardId), 1
  )[0];
  const orderedIds = [...targetContainer.querySelectorAll(".card")].map(el => el.dataset.cardId).filter(Boolean);
  const insertIndex = orderedIds.indexOf(cardId);
  if (insertIndex === -1) project.columns[targetColumnId].push(draggedCard);
  else project.columns[targetColumnId].splice(insertIndex, 0, draggedCard);

  try {
    await persistProjectCardsOrder(project);
    saveState();
    renderBoard();
  } catch (error) {
    console.error("Erro ao reordenar card:", error);
    await loadCloudData();
    alert("Não foi possível salvar a nova ordem online.");
  }
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
function setTheme() {
  // Tema institucional único: o aplicativo permanece sempre no modo escuro FCC.
  document.documentElement.setAttribute("data-theme", "dark");
}
function applySavedTheme() { setTheme(); }
function updateThemeButtons() { setTheme(); }

function isMobileViewport() { return window.innerWidth <= 980; }
function openMobileSidebar()  { appShell.classList.add("mobile-sidebar-open"); appShell.classList.remove("sidebar-collapsed"); updateSidebarToggleButton(false); }
function closeMobileSidebar() { appShell.classList.remove("mobile-sidebar-open"); updateSidebarToggleButton(true); }

function toggleSidebar() {
  if (isMobileViewport()) {
    if (appShell.classList.contains("mobile-sidebar-open")) closeMobileSidebar(); else openMobileSidebar(); return;
  }
  const collapsed = appShell.classList.toggle("sidebar-collapsed");
  updateSidebarToggleButton(collapsed);
}

function applySavedSidebar() {
  if (isMobileViewport()) { appShell.classList.remove("sidebar-collapsed", "mobile-sidebar-open"); updateSidebarToggleButton(true); return; }
  const collapsed = false;
  appShell.classList.remove("mobile-sidebar-open"); appShell.classList.toggle("sidebar-collapsed", collapsed); updateSidebarToggleButton(collapsed);
}

function handleResponsiveLayout() {
  if (isMobileViewport()) { appShell.classList.remove("sidebar-collapsed"); if (!appShell.classList.contains("mobile-sidebar-open")) updateSidebarToggleButton(true); }
  else { appShell.classList.remove("mobile-sidebar-open"); const collapsed = false; appShell.classList.toggle("sidebar-collapsed", collapsed); updateSidebarToggleButton(collapsed); }
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
function formatDateTime(d) {
  if (!d) return "Data não informada";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function clone(data) { return JSON.parse(JSON.stringify(data)); }
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}



// ================================================================
// ① NOTIFICATIONS  (kq-prefixed to avoid any name collision)
// ================================================================
const NOTIF_SEEN_KEY = "kq_notif_seen_v1";
let kqNotifOpen  = false;
let kqNotifItems = [];

// DOM refs
const kqNotifBtn      = document.getElementById("notifBtn");
const kqNotifBadge    = document.getElementById("notifBadge");
const kqNotifOverlay  = document.getElementById("notifOverlay");
const kqNotifList     = document.getElementById("notifList");
const kqNotifMarkAll  = document.getElementById("notifMarkAllBtn");
const kqNotifCloseBtn = document.getElementById("notifCloseBtn");

if (kqNotifBtn)      kqNotifBtn.addEventListener("click", e => { e.stopPropagation(); kqToggleNotif(); });
if (kqNotifMarkAll)  kqNotifMarkAll.addEventListener("click", kqMarkAllNotifRead);
if (kqNotifCloseBtn) kqNotifCloseBtn.addEventListener("click", kqCloseNotif);
if (kqNotifOverlay)  kqNotifOverlay.addEventListener("click", e => { if (e.target === kqNotifOverlay) kqCloseNotif(); });

function kqToggleNotif() { kqNotifOpen ? kqCloseNotif() : kqOpenNotif(); }
function kqOpenNotif() {
  if (!kqNotifOverlay) return;
  kqRenderNotifications();
  openModal(kqNotifOverlay);
  kqNotifOpen = true;
}
function kqCloseNotif() {
  if (!kqNotifOverlay) return;
  closeModal(kqNotifOverlay);
  kqNotifOpen = false;
}

async function loadPersistentNotifications() {
  if (!supabase || !authUser) { persistentNotifications = []; return; }
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,actor_user_id,event_type,card_id,project_id,title,body,created_at")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("Não foi possível carregar notificações persistentes:", error);
    persistentNotifications = [];
    return;
  }
  persistentNotifications = data || [];
}

function setupNotificationRealtime() {
  teardownNotificationRealtime();
  if (!supabase || !authUser) return;
  notificationRealtimeChannel = supabase
    .channel(`kanban-notifications-${authUser.id}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${authUser.id}`
    }, payload => {
      const next = payload.new;
      if (!next?.id) return;
      persistentNotifications = [next, ...persistentNotifications.filter(item => item.id !== next.id)].slice(0, 100);
      kqRenderNotifications();
    })
    .subscribe();
}

function teardownNotificationRealtime() {
  if (notificationRealtimeChannel && supabase) {
    supabase.removeChannel(notificationRealtimeChannel);
  }
  notificationRealtimeChannel = null;
}

async function loadNotificationReads() {
  if (!supabase || !authUser) { notificationSeenIds = new Set(); return; }
  const { data, error } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", authUser.id);
  if (error) {
    console.warn("Não foi possível carregar notificações lidas:", error);
    notificationSeenIds = new Set();
    return;
  }
  notificationSeenIds = new Set((data || []).map(row => row.notification_id));
}

function kqGetSeen() { return new Set(notificationSeenIds); }

async function kqSaveSeen(seenSet) {
  notificationSeenIds = new Set(seenSet);
  if (!supabase || !authUser || !notificationSeenIds.size) return;
  const rows = [...notificationSeenIds].map(notificationId => ({
    user_id: authUser.id,
    notification_id: notificationId
  }));
  const { error } = await supabase
    .from("notification_reads")
    .upsert(rows, { onConflict: "user_id,notification_id" });
  if (error) console.warn("Não foi possível salvar notificações lidas:", error);
}

function kqMarkAllNotifRead() {
  const s = kqGetSeen();
  kqNotifItems.forEach(n => s.add(n.id));
  void kqSaveSeen(s);
  kqRenderNotifications();
  kqCloseNotif();
}

function kqBuildNotifications() {
  const items = persistentNotifications.map(notification => ({
    id: String(notification.id),
    icon: notification.event_type === "card_reopened" ? "↩️" : "✅",
    title: notification.title || (notification.event_type === "card_reopened" ? "Card reaberto" : "Card concluído"),
    body: notification.body || "O status de um card compartilhado foi alterado.",
    time: notification.created_at,
    cardId: notification.card_id
  }));
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

  state.projects.forEach(proj => {
    Object.entries(proj.columns||{}).forEach(([col, cards]) => {
      (cards||[]).forEach(card => {
        if (!card.date || col === "done") return;
        const dl = new Date(`${card.date}T00:00:00`);
        if      (dl < today)                       items.push({id:`ov_${card.id}`,  icon:"⚠️", title:"Card atrasado",  body:`"${card.title}" passou do prazo (${formatDate(card.date)})`, time:dl.toISOString(), cardId:card.id});
        else if (dl.getTime()===today.getTime())    items.push({id:`td_${card.id}`,  icon:"📅", title:"Vence hoje",     body:`"${card.title}" vence hoje!`,                                time:dl.toISOString(), cardId:card.id});
        else if (dl.getTime()===tomorrow.getTime()) items.push({id:`tm_${card.id}`,  icon:"🕐", title:"Vence amanhã",   body:`"${card.title}" vence amanhã.`,                             time:dl.toISOString(), cardId:card.id});
      });
    });
  });

  sharedCardsState.forEach(sc => {
    items.push({id:`sh_${sc.card.id}`, icon:"🤝", title:"Card compartilhado",
      body:`Você foi adicionado ao card "${sc.card.title}" (${sc.projectName})`,
      time:sc.card.createdAt, cardId:sc.card.id});
  });

  items.sort((a,b) => new Date(b.time)-new Date(a.time));
  kqNotifItems = items;
}

function kqRenderNotifications() {
  if (!authUser) return;
  kqBuildNotifications();
  const seen   = kqGetSeen();
  const unread = kqNotifItems.filter(n => !seen.has(n.id));

  if (kqNotifBadge) {
    kqNotifBadge.textContent = unread.length > 99 ? "99+" : unread.length;
    kqNotifBadge.classList.toggle("hidden", unread.length === 0);
  }
  if (!kqNotifList) return;
  if (!kqNotifItems.length) { kqNotifList.innerHTML = `<div class="notif-empty"><span>🔔</span>Nenhuma notificação por enquanto.</div>`; return; }
  kqNotifList.innerHTML = "";
  kqNotifItems.forEach(n => {
    const isNew = !seen.has(n.id);
    const row   = document.createElement("div");
    row.className = `notif-item${isNew?" is-unread":""}`;
    row.innerHTML = `<span class="notif-item-icon">${n.icon}</span>
      <div class="notif-item-body"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.body)}</span></div>
      <span class="notif-item-time">${kqTimeAgo(n.time)}</span>`;
    row.addEventListener("click", () => {
      seen.add(n.id); void kqSaveSeen(seen); kqCloseNotif(); kqRenderNotifications();
      if (n.cardId) setTimeout(() => openViewCardModal(n.cardId), 80);
    });
    kqNotifList.appendChild(row);
  });
}

function kqTimeAgo(iso) {
  if (!iso) return "";
  const m = Math.floor((Date.now()-new Date(iso))/60000);
  if (m<1) return "agora"; if (m<60) return `${m}m`;
  const h = Math.floor(m/60);
  return h<24 ? `${h}h` : `${Math.floor(h/24)}d`;
}

// kqRenderNotifications is called from handleSessionUser and updateAuthUI

// ================================================================
// ② USER BIO MODAL
// ================================================================
const kqBioOverlay     = document.getElementById("bioModalOverlay");
const kqBioBody        = document.getElementById("bioModalBody");
const kqBioCloseBtn    = document.getElementById("closeBioModalBtn");
const kqBioCloseFooter = document.getElementById("closeBioFooterBtn");
const kqBioChatBtn     = document.getElementById("bioChatBtn");
let   kqBioUserId      = null;

if (kqBioCloseBtn)    kqBioCloseBtn.addEventListener("click", kqCloseBio);
if (kqBioCloseFooter) kqBioCloseFooter.addEventListener("click", kqCloseBio);
if (kqBioOverlay)     kqBioOverlay.addEventListener("click", e => { if (e.target===kqBioOverlay) kqCloseBio(); });
if (kqBioChatBtn)     kqBioChatBtn.addEventListener("click", () => {
  const uid = kqBioUserId;
  kqCloseBio();
  if (uid) setTimeout(() => kqOpenChatWith(uid), 80);
});
document.addEventListener("keydown", e => {
  if (e.key==="Escape" && kqBioOverlay && !kqBioOverlay.classList.contains("hidden")) kqCloseBio();
});

async function kqOpenBio(userId) {
  if (!supabase || !userId) return;
  kqBioUserId = userId;
  if (kqBioBody) kqBioBody.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted)">Carregando...</div>`;
  openModal(kqBioOverlay);
  const {data,error} = await supabase.from("profiles").select("*").eq("user_id",userId).maybeSingle();
  if (error||!data) { if(kqBioBody) kqBioBody.innerHTML=`<div style="padding:24px;text-align:center;color:var(--text-muted)">Perfil não encontrado.</div>`; return; }
  const ini = getInitials(data.full_name||"?");
  if (kqBioBody) kqBioBody.innerHTML = `
    <div class="bio-user-hero">
      ${data.avatar_url?`<img class="bio-avatar" src="${escapeHtml(data.avatar_url)}" alt="">` : `<div class="bio-avatar-fallback">${escapeHtml(ini)}</div>`}
      <div class="bio-user-info">
        <strong>${escapeHtml(data.full_name||"Sem nome")}</strong>
        <span>${escapeHtml(data.email||"")}</span>
      </div>
    </div>
    <div class="bio-detail-grid">
      <div class="bio-detail-item"><label>📞 Telefone</label><span>${escapeHtml(data.phone||"—")}</span></div>
      <div class="bio-detail-item"><label>🏢 Setor</label><span>${escapeHtml(data.sector||"—")}</span></div>
    </div>
    <div><label class="field-label" style="margin-bottom:6px;display:block">📝 Bio</label>
      <div class="bio-text-block${!data.bio?" bio-text-empty":""}">${escapeHtml(data.bio||"Nenhuma bio preenchida.")}</div>
    </div>`;
  if (kqBioChatBtn) kqBioChatBtn.style.display = (authUser&&userId===authUser.id) ? "none" : "";
}
function kqCloseBio() { closeModal(kqBioOverlay); }

// kqPatchBioChips removed — bio click now added directly in openViewCardModal

// Bio chips are now patched directly inside openViewCardModal (see chip creation above)

// ================================================================
// ③ CHAT — GChat style: sidebar list + floating conversation
// ================================================================
let kqChatOpen    = false;
let kqActiveUid   = null;
let kqActiveUname = "";
let kqConvs       = [];
let kqPollTimer   = null;
let kqSearchTimer = null;

// DOM refs
const kqChatWidget  = document.getElementById("chatWidget");
const kqChatWindow  = document.getElementById("chatWindow");
const kqToggleBtn   = document.getElementById("chatToggleBtn");
const kqWinClose    = document.getElementById("chatWindowCloseBtn");
const kqConvList    = document.getElementById("chatConvList");    // now inside left sidebar
const kqMsgsArea    = document.getElementById("chatMessages");
const kqInputRow    = document.getElementById("chatInputRow");
const kqMsgInput    = document.getElementById("chatMessageInput");
const kqSendBtn     = document.getElementById("chatSendBtn");
const kqSearchIn    = document.getElementById("chatSearchInput"); // in left sidebar
const kqSearchWrap  = document.getElementById("chatSearchWrap");
const kqMainHeader  = document.getElementById("chatMainHeader");
const kqSidebarBadge = document.getElementById("sidebarUnreadBadge");
chatRuntimeReady = true;

// Dropdown is a child of kqSearchWrap (absolute-positioned, no overflow issues)
let kqDropdown = null;
function kqGetOrCreateDropdown() {
  if (!kqDropdown) {
    kqDropdown = document.createElement("div");
    kqDropdown.className = "chat-user-dropdown";
    kqDropdown.style.display = "none";
    // Append inside the search wrapper so position:absolute works correctly
    if (kqSearchWrap) kqSearchWrap.appendChild(kqDropdown);
    else document.body.appendChild(kqDropdown);
  }
  return kqDropdown;
}


// ── Events ───────────────────────────────────────────────────────
if (kqToggleBtn) kqToggleBtn.addEventListener("click", kqToggleChat);
if (kqWinClose)  kqWinClose.addEventListener("click",  kqCloseChat);
if (kqSendBtn)   kqSendBtn.addEventListener("click",   kqSend);
if (kqMsgInput) {
  kqMsgInput.addEventListener("keydown", e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();kqSend();} });
  kqMsgInput.addEventListener("input", function(){ this.style.height="auto"; this.style.height=Math.min(this.scrollHeight,90)+"px"; });
}
if (kqSearchIn) {
  kqSearchIn.addEventListener("input", () => {
    clearTimeout(kqSearchTimer);
    const t = kqSearchIn.value.trim();
    if (!t) { kqGetOrCreateDropdown().style.display="none"; return; }
    kqSearchTimer = setTimeout(() => kqSearchUsers(t), 300);
  });
  kqSearchIn.addEventListener("focus", () => {
    if (kqSearchIn.value.trim()) kqSearchUsers(kqSearchIn.value.trim());
  });
}
document.addEventListener("click", e => {
  const dd = kqGetOrCreateDropdown();
  if (dd.style.display !== "none" && !dd.contains(e.target) && e.target !== kqSearchIn)
    dd.style.display = "none";
});

// ── Toggle / open / close ─────────────────────────────────────────
function kqToggleChat() { kqChatOpen ? kqCloseChat() : kqOpenChat(); }

function kqOpenChat() {
  if (!authUser) return;
  kqChatOpen = true;
  if (kqChatWindow) { kqChatWindow.classList.add("is-visible"); kqChatWindow.setAttribute("aria-hidden","false"); }
  if (kqToggleBtn)  { kqToggleBtn.textContent="✕"; kqToggleBtn.style.fontSize="20px"; }
  kqStartPoll();
}

function kqCloseChat() {
  kqChatOpen = false;
  if (kqChatWindow) { kqChatWindow.classList.remove("is-visible"); kqChatWindow.setAttribute("aria-hidden","true"); }
  if (kqDropdown)   kqDropdown.style.display = "none";
  if (kqToggleBtn)  { kqToggleBtn.textContent="💬"; kqToggleBtn.style.fontSize="24px"; }
  kqStopPoll();
}
function closeChatWindow() { kqCloseChat(); }

// Called from bio modal button — open chat with specific user
function kqOpenChatWith(userId, uname) {
  if (!requireAuth("usar o chat")) return;
  kqOpenConv(userId, uname || "");
  if (!kqChatOpen) kqOpenChat();
}

// ── Search users ──────────────────────────────────────────────────
async function kqSearchUsers(term) {
  if (!supabase || !authUser || !term) return;
  const dd = kqGetOrCreateDropdown();
  dd.innerHTML = `<div class="chat-user-result-item" style="color:var(--text-muted);cursor:default">Buscando...</div>`;
  dd.style.display = "block"; // CSS absolute positions it below the input automatically
  let data = null;
  try {
    const r = await supabase.rpc("search_profiles", { search_term: term });
    if (!r.error && r.data) data = r.data;
  } catch(_) {}
  if (!data) {
    const fb = await supabase.from("profiles")
      .select("user_id,full_name,email,avatar_url")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(8);
    data = fb.data;
  }
  const res = (data || []).filter(u => u.user_id !== authUser.id);
  dd.innerHTML = "";
  if (!res.length) {
    dd.innerHTML = `<div class="chat-user-result-item" style="color:var(--text-muted);cursor:default">Nenhum usuário encontrado.</div>`;
    return;
  }
  res.forEach(u => {
    const ini = getInitials(u.full_name || u.email || "?");
    const row = document.createElement("div");
    row.className = "chat-user-result-item";
    row.innerHTML = `${u.avatar_url?`<img class="chat-avatar-sm" src="${escapeHtml(u.avatar_url)}" alt="">` : `<div class="chat-avatar-sm">${escapeHtml(ini)}</div>`}<span>${escapeHtml(u.full_name||u.email||"Usuário")}</span>`;
    row.addEventListener("click", () => {
      if (kqSearchIn) kqSearchIn.value = "";
      dd.style.display = "none";
      kqOpenConv(u.user_id, u.full_name || u.email || "Usuário");
      if (!kqChatOpen) kqOpenChat();
    });
    dd.appendChild(row);
  });
}

// ── Load & render conversations (into sidebar) ────────────────────
async function kqLoadConversations() {
  if (!supabase || !authUser) return;
  const {data, error} = await supabase.from("messages").select("*")
    .or(`from_user_id.eq.${authUser.id},to_user_id.eq.${authUser.id}`)
    .order("created_at", {ascending: false});
  if (error) return;

  const map = new Map();
  (data || []).forEach(msg => {
    const pid = msg.from_user_id === authUser.id ? msg.to_user_id : msg.from_user_id;
    if (!map.has(pid)) map.set(pid, {lastMsg: msg.text, lastTime: msg.created_at, unread: 0});
    if (msg.to_user_id === authUser.id && !msg.read) map.get(pid).unread++;
  });

  const ids = [...map.keys()];
  let profs = {};
  if (ids.length) {
    const {data: ps} = await supabase.from("profiles")
      .select("user_id,full_name,email,avatar_url").in("user_id", ids);
    (ps || []).forEach(p => { profs[p.user_id] = p; });
  }

  kqConvs = [...map.entries()].map(([uid, c]) => {
    const p = profs[uid] || {};
    return {...c, userId: uid, name: p.full_name||p.email||uid, email: p.email||"", avatarUrl: p.avatar_url||""};
  }).sort((a,b) => new Date(b.lastTime) - new Date(a.lastTime));

  kqRenderConvList();
  kqUpdateBadges();
}

function kqRenderConvList() {
  if (!kqConvList) return;
  if (!kqConvs.length) {
    kqConvList.innerHTML = `<div class="chat-conv-empty">Nenhuma conversa ainda.<br>Busque um usuário acima.</div>`;
    return;
  }
  kqConvList.innerHTML = "";
  kqConvs.forEach(c => {
    const ini = getInitials(c.name);
    const row = document.createElement("div");
    row.className = `chat-conv-item${c.userId === kqActiveUid ? " is-active" : ""}`;
    row.innerHTML = `
      ${c.avatarUrl ? `<img class="chat-conv-avatar" src="${escapeHtml(c.avatarUrl)}" alt="" style="cursor:pointer" title="Ver perfil">` : `<div class="chat-conv-avatar" style="cursor:pointer" title="Ver perfil">${escapeHtml(ini)}</div>`}
      <div class="chat-conv-copy">
        <strong>${escapeHtml(c.name)}</strong>
        <span>${escapeHtml(truncate(c.lastMsg||"", 30))}</span>
      </div>
      ${c.unread > 0 ? `<span class="chat-conv-unread">${c.unread}</span>` : ""}`;
    // Click on row → open conversation
    row.addEventListener("click", () => {
      kqOpenConv(c.userId, c.name);
      if (!kqChatOpen) kqOpenChat();
    });
    // Click on avatar → bio modal
    row.querySelector(".chat-conv-avatar")?.addEventListener("click", e => {
      e.stopPropagation();
      kqOpenBio(c.userId);
    });
    kqConvList.appendChild(row);
  });
}

// ── Open a specific conversation (floating window) ────────────────
async function kqOpenConv(userId, uname) {
  kqActiveUid   = userId;
  kqActiveUname = uname || kqConvs.find(c => c.userId === userId)?.name || "Usuário";
  const conv    = kqConvs.find(c => c.userId === userId);
  const ini     = getInitials(kqActiveUname);
  const av      = conv?.avatarUrl || "";

  if (kqMainHeader) {
    kqMainHeader.innerHTML = `
      <div class="chat-main-header-avatar-wrap" style="cursor:pointer" title="Ver perfil">
        ${av ? `<img class="chat-main-header-avatar" src="${escapeHtml(av)}" alt="">` : `<div class="chat-main-header-avatar">${escapeHtml(ini)}</div>`}
      </div>
      <div class="chat-main-info">
        <strong>${escapeHtml(kqActiveUname)}</strong>
        <span>${escapeHtml(conv?.email || "")}</span>
      </div>
      <button class="chat-close-btn" id="kqWinCloseInner" type="button" title="Fechar">✕</button>`;
    kqMainHeader.querySelector("#kqWinCloseInner")?.addEventListener("click", kqCloseChat);
    kqMainHeader.querySelector(".chat-main-header-avatar-wrap")?.addEventListener("click", () => kqOpenBio(userId));
  }

  if (kqInputRow) kqInputRow.style.display = "";
  if (kqMsgsArea) kqMsgsArea.innerHTML = `<div class="chat-loading-msg">Carregando...</div>`;
  kqRenderConvList(); // highlight active in sidebar
  await kqFetchMessages();

  if (supabase && authUser)
    supabase.from("messages").update({read: true})
      .eq("from_user_id", userId).eq("to_user_id", authUser.id).eq("read", false)
      .then(() => kqLoadConversations());
  if (kqMsgInput) kqMsgInput.focus();
}

async function kqFetchMessages() {
  if (!supabase || !authUser || !kqActiveUid || !kqMsgsArea) return;
  const {data, error} = await supabase.from("messages").select("*")
    .or(`and(from_user_id.eq.${authUser.id},to_user_id.eq.${kqActiveUid}),and(from_user_id.eq.${kqActiveUid},to_user_id.eq.${authUser.id})`)
    .order("created_at", {ascending: true});
  if (error) return;
  const msgs = data || [];
  if (!msgs.length) {
    kqMsgsArea.innerHTML = `<div class="chat-no-conv-state"><span>👋</span>Inicie a conversa!</div>`;
    return;
  }
  kqMsgsArea.innerHTML = "";
  let lastDate = "";
  msgs.forEach(msg => {
    const ds = new Date(msg.created_at).toLocaleDateString("pt-BR");
    if (ds !== lastDate) {
      const d = document.createElement("div");
      d.className = "chat-date-divider"; d.textContent = ds;
      kqMsgsArea.appendChild(d); lastDate = ds;
    }
    const mine = msg.from_user_id === authUser.id;
    const b = document.createElement("div");
    b.className = `chat-msg ${mine ? "is-mine" : "is-theirs"}`;
    b.innerHTML = `<div class="chat-bubble">${escapeHtml(msg.text)}</div><div class="chat-msg-meta">${new Date(msg.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>`;
    kqMsgsArea.appendChild(b);
  });
  kqMsgsArea.scrollTop = kqMsgsArea.scrollHeight;
}

async function kqSend() {
  if (!kqMsgInput) return;
  const text = kqMsgInput.value.trim();
  if (!text || !kqActiveUid || !supabase || !authUser) return;
  kqMsgInput.value = ""; kqMsgInput.style.height = "auto";
  await supabase.from("messages").insert({from_user_id: authUser.id, to_user_id: kqActiveUid, text, read: false});
  await kqFetchMessages();
  await kqLoadConversations();
}

function kqUpdateBadges() {
  const total = kqConvs.reduce((a, c) => a + (c.unread || 0), 0);
  // Sidebar badge
  if (kqSidebarBadge) {
    kqSidebarBadge.textContent = total > 99 ? "99+" : total;
    kqSidebarBadge.classList.toggle("hidden", total === 0);
  }
  // Floating bubble badge
  let badge = kqToggleBtn?.querySelector(".chat-toggle-badge");
  if (!badge && kqToggleBtn) {
    badge = document.createElement("span");
    badge.className = "chat-toggle-badge";
    kqToggleBtn.appendChild(badge);
  }
  if (badge) {
    badge.textContent = total > 99 ? "99+" : total;
    badge.classList.toggle("hidden", total === 0);
  }
}

function kqStartPoll() {
  kqStopPoll();
  kqPollTimer = setInterval(async () => {
    if (kqActiveUid) await kqFetchMessages();
    await kqLoadConversations();
  }, 5000);
}
function kqStopPoll()  { if (kqPollTimer) { clearInterval(kqPollTimer); kqPollTimer = null; } }
function stopChatPoll(){ kqStopPoll(); }


}); // end DOMContentLoaded