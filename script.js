const API_URL = "http://127.0.0.1:5000/analyze";
const PDF_URL = "http://127.0.0.1:5000/export-pdf";
const IMAGE_URL = "http://127.0.0.1:5000/inspect-image";
const CIRCUMFERENCE = 2 * Math.PI * 52;
const SEVERITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const SEVERITY_ICONS = {
  Critical: "🚨",
  High: "⚠️",
  Medium: "📌",
  Low: "ℹ️"
};

const els = {
  dockerfile: document.getElementById("dockerfileInput"),
  k8s: document.getElementById("k8sInput"),
  dockerfileUpload: document.getElementById("dockerfileUpload"),
  k8sUpload: document.getElementById("k8sUpload"),
  dockerfileCard: document.getElementById("dockerfileCard"),
  k8sCard: document.getElementById("k8sCard"),
  rollback: document.getElementById("rollbackCheck"),
  docs: document.getElementById("docsCheck"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  btnText: document.querySelector(".btn-text"),
  btnSpinner: document.querySelector(".btn-spinner"),
  errorMsg: document.getElementById("errorMsg"),
  resultsPanel: document.getElementById("resultsPanel"),
  resultsContent: document.getElementById("resultsContent"),
  loadingSkeleton: document.getElementById("loadingSkeleton"),
  gaugeCircle: document.getElementById("gaugeCircle"),
  scoreValue: document.getElementById("scoreValue"),
  statusBadge: document.getElementById("statusBadge"),
  profileNote: document.getElementById("profileNote"),
  severitySummary: document.getElementById("severitySummary"),
  categoryBars: document.getElementById("categoryBars"),
  findingsList: document.getElementById("findingsList"),
  findingsCount: document.getElementById("findingsCount"),
  governanceList: document.getElementById("governanceList"),
  roadmapList: document.getElementById("roadmapList"),
  beginnerMode: document.getElementById("beginnerMode"),
  downloadBtn: document.getElementById("downloadBtn"),
  analysisMode: document.getElementById("analysisMode"),
  severityFilter: document.getElementById("severityFilter"),
  findingsSearch: document.getElementById("findingsSearch"),
  findingsEmptyState: document.getElementById("findingsEmptyState"),
  exportFormat: document.getElementById("exportFormat"),
};

let lastAnalysis = null;

// ─── MODE TOGGLE (keeps values, just hides cards) ──────────
function applyModeUI() {
  const mode = els.analysisMode.value;
  els.dockerfileCard.classList.toggle("mode-hidden", mode === "k8s");
  els.k8sCard.classList.toggle("mode-hidden", mode === "dockerfile");
  const grid = els.dockerfileCard.closest(".input-grid");
  grid.classList.toggle("single-col", mode !== "both");
}
els.analysisMode.addEventListener("change", applyModeUI);
applyModeUI();

// ─── FILE UPLOAD ────────────────────────────────────────────
function wireUpload(inputEl, textareaEl) {
  inputEl.addEventListener("change", () => {
    const file = inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { textareaEl.value = reader.result; };
    reader.readAsText(file);
  });
}
wireUpload(els.dockerfileUpload, els.dockerfile);
wireUpload(els.k8sUpload, els.k8s);

// ─── HELPERS ────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(val) {
  const str = String(val ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildFindingsCsv(data) {
  const headers = ["id","source","severity","category","description","effective_weight"];
  return [headers.join(","), ...data.findings.map(f => headers.map(h => csvEscape(f[h])).join(","))].join("\n");
}

// ─── DOWNLOAD ───────────────────────────────────────────────
els.downloadBtn.addEventListener("click", async () => {
  if (!lastAnalysis) { els.errorMsg.textContent = "Run an analysis first."; return; }
  const fmt = els.exportFormat.value;
  if (fmt === "json") {
    triggerDownload(new Blob([JSON.stringify(lastAnalysis, null, 2)], {type:"application/json"}), "devmate-report.json");
    return;
  }
  if (fmt === "csv") {
    triggerDownload(new Blob([buildFindingsCsv(lastAnalysis)], {type:"text/csv"}), "devmate-findings.csv");
    return;
  }
  els.downloadBtn.disabled = true;
  els.downloadBtn.textContent = "⏳ Generating PDF...";
  try {
    const res = await fetch(PDF_URL, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify(lastAnalysis),
    });
    if (!res.ok) throw new Error(`Server ${res.status}`);
    triggerDownload(await res.blob(), "devmate-report.pdf");
  } catch (err) {
    els.errorMsg.textContent = "PDF error: " + err.message;
  } finally {
    els.downloadBtn.disabled = false;
    els.downloadBtn.textContent = "⬇ Download Report";
  }
});

// ─── ANALYZE ────────────────────────────────────────────────
els.analyzeBtn.addEventListener("click", runAnalysis);

async function runAnalysis() {
  els.errorMsg.textContent = "";
  const mode = els.analysisMode.value;
  const dockerfileVal = els.dockerfile.value.trim();
  const k8sVal = els.k8s.value.trim();

  if (mode === "dockerfile" && !dockerfileVal) { els.errorMsg.textContent = "Paste a Dockerfile first."; return; }
  if (mode === "k8s" && !k8sVal) { els.errorMsg.textContent = "Paste a Kubernetes manifest first."; return; }
  if (!dockerfileVal && !k8sVal) { els.errorMsg.textContent = "Paste at least one file."; return; }

  els.analyzeBtn.disabled = true;
  els.btnText.textContent = "Analyzing";
  els.btnSpinner.classList.remove("hidden");

  els.resultsPanel.classList.remove("hidden");
  els.resultsPanel.classList.add("visible");
  els.resultsContent.classList.add("hidden");
  els.resultsContent.classList.remove("visible");
  els.loadingSkeleton.classList.remove("hidden");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        dockerfile: mode === "k8s" ? "" : dockerfileVal,
        k8s: mode === "dockerfile" ? "" : k8sVal,
        self_reported: {
          rollback_strategy_documented: els.rollback.checked,
          documentation_updated: els.docs.checked,
        },
      }),
    });
    if (!res.ok) throw new Error(`Server ${res.status}`);
    const data = await res.json();
    await new Promise(r => setTimeout(r, 500));
    renderResults(data);
  } catch (err) {
    els.loadingSkeleton.classList.add("hidden");
    els.errorMsg.textContent = "Unable to connect to the analysis server. Please try again.";
  } finally {
    els.analyzeBtn.disabled = false;
    els.btnText.textContent = "Analyze Deployment";
    els.btnSpinner.classList.add("hidden");
  }
}

// ─── RENDER RESULTS ─────────────────────────────────────────
function renderResults(data) {
  lastAnalysis = data;
  els.loadingSkeleton.classList.add("hidden");
  els.resultsContent.classList.remove("hidden");
  els.resultsContent.classList.add("visible");

  const offset = CIRCUMFERENCE - (data.score / 100) * CIRCUMFERENCE;
  requestAnimationFrame(() => {
    els.gaugeCircle.style.strokeDashoffset = offset;
  });
  els.scoreValue.textContent = data.score;

  els.statusBadge.textContent = data.status;
  els.statusBadge.style.background = data.score >= 85 ? "#10b981" : data.score >= 65 ? "#6366f1" : data.score >= 40 ? "#f59e0b" : "#ef4444";
  els.statusBadge.style.color = "#fff";

  const labels = { dockerfile: "🐳 Dockerfile", k8s: "☸️ Kubernetes" };
  els.profileNote.textContent = (data.files_analyzed || []).map(k => labels[k] || k).join(" & ");

  renderSeveritySummary(data.findings);

  els.categoryBars.innerHTML = "";
  const maxPenalty = Math.max(1, ...Object.values(data.category_totals));
  Object.entries(data.category_totals).forEach(([cat, val], i) => {
    const row = document.createElement("div");
    row.className = "cat-bar-row";
    row.style.animationDelay = `${0.1 + i * 0.05}s`;
    row.innerHTML = `
      <span class="cat-name">${cat}</span>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(val/maxPenalty)*100}%"></div></div>
      <span style="color:var(--text-muted)">-${val}</span>
    `;
    els.categoryBars.appendChild(row);
  });

  els.findingsCount.textContent = `${data.findings.length} issue${data.findings.length !== 1 ? 's' : ''}`;

  renderFindings();

  els.governanceList.innerHTML = "";
  const gov = data.governance;
  let gi = 0;
  [...Object.entries(gov.auto_detected), ...Object.entries(gov.self_reported)].forEach(([key, val]) => {
    const row = document.createElement("div");
    row.className = "gov-row";
    row.style.animationDelay = `${0.05 + gi * 0.03}s`;
    const label = key.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
    const isAuto = key in gov.auto_detected;
    let sc = "unknown", st = String(val);
    if (typeof val === "boolean") { sc = val ? "pass" : "fail"; st = val ? "✅ Pass" : "❌ Fail"; }
    row.innerHTML = `
      <div class="gov-label">
        <span>${label}</span>
        <span class="gov-tag">${isAuto ? "auto-detected" : "self-attested"}</span>
      </div>
      <span class="gov-status ${sc}">${st}</span>
    `;
    els.governanceList.appendChild(row);
    gi++;
  });

  els.roadmapList.innerHTML = "";
  if (data.roadmap.length === 0) {
    els.roadmapList.innerHTML = `<li style="padding-left:12px;counter-increment:none;">🎉 No improvements needed! Perfect score.</li>`;
  }
  data.roadmap.forEach((step, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = `${0.1 + i * 0.06}s`;
    li.innerHTML = `Fix <strong>${step.fix}</strong> → Score: <span>${step.score_after_fix}</span>`;
    els.roadmapList.appendChild(li);
  });

  els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── SEVERITY SUMMARY BAR ───────────────────────────────────
function renderSeveritySummary(findings) {
  if (findings.length === 0) { els.severitySummary.innerHTML = ""; return; }
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  els.severitySummary.innerHTML = Object.entries(counts).map(([sev, cnt]) =>
    `<div class="seg ${sev.toLowerCase()}" style="width:${(cnt/total)*100}%"></div>`
  ).join("");
}

// ─── FINDINGS ───────────────────────────────────────────────
function getFilteredFindings() {
  if (!lastAnalysis) return [];
  const q = els.findingsSearch.value.trim().toLowerCase();
  const min = els.severityFilter.value;
  return lastAnalysis.findings
    .filter(f => min === "all" || SEVERITY_RANK[f.severity] >= SEVERITY_RANK[min])
    .filter(f => !q || `${f.id} ${f.description} ${f.category}`.toLowerCase().includes(q))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

function renderFindings() {
  const findings = getFilteredFindings();
  els.findingsList.innerHTML = "";
  if (!lastAnalysis || lastAnalysis.findings.length === 0) {
    els.findingsList.innerHTML = `<p style="padding:20px;text-align:center;color:var(--text-muted)">✅ No issues detected.</p>`;
    els.findingsEmptyState.classList.add("hidden");
    return;
  }
  if (findings.length === 0) { els.findingsEmptyState.classList.remove("hidden"); return; }
  els.findingsEmptyState.classList.add("hidden");

  findings.forEach((f, i) => {
    const card = document.createElement("div");
    card.className = `finding-card ${f.severity}`;
    card.style.animationDelay = `${i * 0.04}s`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-expanded", "false");

    const icon = SEVERITY_ICONS[f.severity] || "📋";
    const impact = f.learning?.why ? f.learning.why.slice(0, 80) + "..." : "";
    const hasLesson = typeof LESSONS !== "undefined" && !!LESSONS[f.id];

    card.innerHTML = `
      <div class="finding-top">
        <div class="finding-top-left">
          <span class="finding-icon">${icon}</span>
          <span class="finding-id">${f.id}</span>
        </div>
        <span class="sev-chip ${f.severity}">${f.severity}</span>
      </div>
      <div class="finding-desc">${f.description}</div>
      <div class="finding-impact">💡 ${impact}</div>
      <div class="finding-meta">
        <span class="finding-category-tag">${f.category}</span>
        <span>Penalty: -${f.effective_weight} pts</span>
      </div>
      ${hasLesson ? `<button class="lesson-link" data-id="${f.id}">📖 Take Lesson</button>` : ""}
      <div class="finding-learning hidden"></div>
    `;

    const learningEl = card.querySelector(".finding-learning");
    function toggle() {
      const open = !learningEl.classList.contains("hidden");
      if (open) { learningEl.classList.add("hidden"); card.setAttribute("aria-expanded","false"); return; }
      renderLearningInline(learningEl, f);
      learningEl.classList.remove("hidden");
      card.setAttribute("aria-expanded","true");
    }
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    els.findingsList.appendChild(card);
  });
}

els.findingsSearch.addEventListener("input", debounce(renderFindings, 200));
els.severityFilter.addEventListener("change", renderFindings);

// ─── LEARNING CONTENT ───────────────────────────────────────
function renderLearningInline(container, finding) {
  try {
    const l = finding.learning;
    if (!l) { container.innerHTML = `<p style="color:var(--text-muted)">No details available.</p>`; return; }
    const beginner = els.beginnerMode.checked;
    const text = (beginner ? l.plain : l.technical) || "No explanation.";
    const fix = l.best_practice || "";
    const example = l.example || "";
    const quiz = l.quiz;

    let html = `
      <h4>${beginner ? "🔍 Simple Explanation" : "🔧 Technical Detail"}</h4>
      <p>${text}</p>
      <h4>❓ Why this matters</h4>
      <p>${l.why || ""}</p>
      ${fix ? `
        <div class="learning-fix">
          <div class="learning-fix-header">
            <strong>✅ Fix:</strong>
            <button class="copy-btn" data-copy="${escapeAttr(fix)}" data-toast="Fix copied to clipboard." title="Copy fix to clipboard">
              📋 Copy Fix
            </button>
          </div>
          <div class="learning-fix-body">${escapeHtml(fix)}</div>
        </div>` : ""}
      <h4>📝 Example</h4>
      <div class="code-wrapper">
        <button class="copy-btn code-copy-btn" data-copy="${escapeAttr(example)}" data-toast="Example code copied to clipboard." title="Copy example code to clipboard">
          📋 Copy Code
        </button>
        <pre>${escapeHtml(example)}</pre>
      </div>
    `;
    container.innerHTML = html;
    if (quiz && quiz.q && quiz.options) {
      container.insertAdjacentHTML("beforeend", quizHtml(quiz));
      wireQuiz(container.querySelector(".lesson-quiz"), quiz,
        () => {
          const ruleId = finding.id;
          if (ruleId) {
            // Award quiz-pass XP once per rule
            awardXP(XP_VALUES.quizPass, `quiz_pass_${ruleId}`, `⭐ +${XP_VALUES.quizPass} XP — Quiz passed!`);

            // Award mastery XP once (only on transition from unmastered → mastered)
            const alreadyMastered = !!academyProgress.mastered[ruleId];
            academyProgress.mastered[ruleId] = true;
            academyProgress.quizScores[ruleId] = 1;
            if (!alreadyMastered) {
              awardXP(XP_VALUES.mastery, `mastery_${ruleId}`, `⭐ +${XP_VALUES.mastery} XP — Lesson mastered!`);
              celebrateConfetti();
            }

            saveProgress();
            updateProgressBars();
            checkBadges();
            renderBadges();
          }
        },
        () => renderLearningInline(container, finding)
      );
    }
  } catch (e) {
    container.innerHTML = `<p style="color:var(--text-muted)">Could not load details.</p>`;
  }
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function escapeAttr(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ═══════════════════════════════════════════════════════
//  PHASE 2 — ACADEMY
// ═══════════════════════════════════════════════════════
// Session-only progress — refresh resets everything.
// Phase 3 will tie progress to a user account on the server.
let academyProgress = { mastered: {}, quizScores: {} };

// ── PHASE 2.5: XP SYSTEM ──────────────────────────────
// Session-only XP — resets on page refresh, same as academyProgress.
const XP_VALUES = {
  lessonView:  25,  // first time a lesson detail page is opened
  quizPass:    15,  // first time a quiz is answered correctly
  mastery:     10   // first time a lesson reaches mastered state
};

let academyXP = { total: 0, actions: {} };

function awardXP(amount, actionKey, message) {
  if (academyXP.actions[actionKey]) return; // duplicate-guard
  academyXP.actions[actionKey] = true;
  academyXP.total += amount;
  const xpValueEl = document.getElementById("xpValue");
  if (xpValueEl) {
    xpValueEl.textContent = academyXP.total;
    xpValueEl.classList.remove("xp-bump");
    // force reflow so the animation replays
    void xpValueEl.offsetWidth;
    xpValueEl.classList.add("xp-bump");
  }
  showToast(message || `⭐ +${amount} XP`, "xp");
}

// ── PHASE 2.5: CELEBRATION EFFECTS (CONFETTI) ────────
let lastConfettiTime = 0;

function celebrateConfetti() {
  const now = Date.now();
  // Throttling guard: avoid duplicate/overlapping bursts within 1.5s
  if (now - lastConfettiTime < 1500) return;
  lastConfettiTime = now;

  const container = document.createElement("div");
  container.className = "confetti-container";

  const colors = [
    "#6366f1", "#10b981", "#f59e0b", "#ec4899",
    "#8b5cf6", "#3b82f6", "#14b8a6", "#fbbf24"
  ];
  const particleCount = 32;

  for (let i = 0; i < particleCount; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    const bg = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const duration = 1.8 + Math.random() * 0.8;
    const size = 6 + Math.random() * 6;

    piece.style.backgroundColor = bg;
    piece.style.left = `${left}vw`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.5}px`;
    piece.style.animationDelay = `${delay}s`;
    piece.style.animationDuration = `${duration}s`;
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";

    container.appendChild(piece);
  }

  document.body.appendChild(container);

  // Self-cleaning DOM removal after animation completes
  setTimeout(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 2800);
}

function loadProgress() {
  return { mastered: {}, quizScores: {} };
}
function saveProgress() {
  // Phase 3: progress will sync to a user account on the server.
  // For now it's session-only — refresh resets everything.
}

// ── PHASE 2.5: BADGE SYSTEM ──────────────────────────
// Session-only badges — resets on refresh, same as all other Academy state.
const BADGES = [
  {
    id: "FIRST_LESSON",
    icon: "🎓",
    name: "First Lesson",
    desc: "Open your first Academy lesson",
    check: () => Object.keys(academyXP.actions).some(k => k.startsWith("lesson_view_"))
  },
  {
    id: "DOCKER_BEGINNER",
    icon: "🐳",
    name: "Docker Beginner",
    desc: "Master 1 Dockerfile lesson",
    check: () => Object.values(LESSONS).some(l => l.source === "dockerfile" && academyProgress.mastered[l.id])
  },
  {
    id: "KUBERNETES_BEGINNER",
    icon: "☸️",
    name: "Kubernetes Beginner",
    desc: "Master 1 Kubernetes lesson",
    check: () => Object.values(LESSONS).some(l => l.source === "k8s" && academyProgress.mastered[l.id])
  },
  {
    id: "QUIZ_MASTER",
    icon: "🧠",
    name: "Quiz Master",
    desc: "Pass quizzes for 5 different lessons",
    check: () => Object.keys(academyXP.actions).filter(k => k.startsWith("quiz_pass_")).length >= 5
  },
  {
    id: "DOCKER_MASTER",
    icon: "🏆",
    name: "Docker Master",
    desc: "Master all 5 Dockerfile lessons",
    check: () => ["DF001","DF002","DF003","DF004","DF005"].every(id => academyProgress.mastered[id])
  },
  {
    id: "KUBERNETES_MASTER",
    icon: "🚀",
    name: "Kubernetes Master",
    desc: "Master all 7 Kubernetes lessons",
    check: () => ["K8S001","K8S002","K8S003","K8S004","K8S005","K8S900","K8S902"].every(id => academyProgress.mastered[id])
  },
  {
    id: "ACADEMY_COMPLETE",
    icon: "🌟",
    name: "Academy Complete",
    desc: "Master all 12 Academy lessons",
    check: () => Object.values(LESSONS).every(l => academyProgress.mastered[l.id])
  },
  {
    id: "SECURITY_EXPLORER",
    icon: "🔐",
    name: "Security Explorer",
    desc: "Earn 100 XP",
    check: () => academyXP.total >= 100
  }
];

// Session badge state: tracks which badges have been unlocked this session.
let badgeState = { unlocked: {} };

function checkBadges() {
  let anyNew = false;
  BADGES.forEach(badge => {
    if (badgeState.unlocked[badge.id]) return; // already unlocked, skip
    if (badge.check()) {
      badgeState.unlocked[badge.id] = true;
      anyNew = true;
      showToast(`🏆 Badge unlocked: ${badge.name}`, "badge");
      celebrateConfetti();
    }
  });
  if (anyNew) renderBadges();
}

function renderBadges() {
  const list = document.getElementById("badgesList");
  if (!list) return;
  list.innerHTML = BADGES.map(badge => {
    const unlocked = !!badgeState.unlocked[badge.id];
    return `
      <div class="badge-item ${unlocked ? "badge-unlocked" : "badge-locked"}">
        <span class="badge-icon">${badge.icon}</span>
        <div class="badge-info">
          <span class="badge-name">${badge.name}</span>
          <span class="badge-desc">${unlocked ? "✅ Unlocked" : badge.desc}</span>
        </div>
      </div>`;
  }).join("");
}

// ── TABS ───────────────────────────────────────────────
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanels = {
  analyzer: document.getElementById("tab-analyzer"),
  academy:  document.getElementById("tab-academy"),
  image:    document.getElementById("tab-image"),
};
function switchTab(name) {
  tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  Object.entries(tabPanels).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
}
tabBtns.forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

// ── DASHBOARD ──────────────────────────────────────────
let activeFilter = "all";
const DIFFICULTY_MAP = { Low: "Beginner", Medium: "Intermediate", High: "Advanced", Critical: "Expert" };
let activeDifficulty = "all";
let activeSearch = "";

const difficultyFilter = document.getElementById("difficultyFilter");
if (difficultyFilter) {
  difficultyFilter.addEventListener("change", () => {
    activeDifficulty = difficultyFilter.value;
    renderLessonGrid();
  });
}

const academySearchInput = document.getElementById("academySearch");
if (academySearchInput) {
  academySearchInput.addEventListener("input", debounce(() => {
    activeSearch = academySearchInput.value.trim().toLowerCase();
    renderLessonGrid();
  }, 180));
}

const lessonGrid = document.getElementById("lessonGrid");
const lessonEmptyState = document.getElementById("lessonEmptyState");
const filterBtns = document.querySelectorAll(".filter-btn");
filterBtns.forEach(b => b.addEventListener("click", () => {
  activeFilter = b.dataset.filter;
  filterBtns.forEach(x => x.classList.toggle("active", x === b));
  renderLessonGrid();
}));

function renderLessonGrid() {
  lessonGrid.innerHTML = "";
  const GROUPS = [
    { key: "Low", label: "🟢 Low Priority" },
    { key: "Medium", label: "🟡 Medium Priority" },
    { key: "High", label: "🟠 High Priority" },
    { key: "Critical", label: "🔴 Critical" }
  ];

  const lessons = Object.values(LESSONS).filter(l => {
    if (activeFilter === "dockerfile" && l.source !== "dockerfile") return false;
    if (activeFilter === "k8s" && l.source !== "k8s") return false;
    if (activeFilter === "mastered" && !academyProgress.mastered[l.id]) return false;
    if (activeDifficulty !== "all" && (l.difficulty || DIFFICULTY_MAP[l.severity]) !== activeDifficulty) return false;
    if (activeSearch) {
      const difficulty = (l.difficulty || DIFFICULTY_MAP[l.severity] || "").toLowerCase();
      const haystack = [
        l.id, l.title, l.description, l.source,
        l.category, l.severity, difficulty,
        l.learning?.plain || "", l.learning?.why || ""
      ].join(" ").toLowerCase();
      if (!haystack.includes(activeSearch)) return false;
    }
    return true;
  });

  let totalRendered = 0;
  GROUPS.forEach(group => {
    const groupLessons = lessons
      .filter(l => l.severity === group.key)
      .sort((a, b) => b.effective_weight - a.effective_weight);
    if (groupLessons.length === 0) return;

    const header = document.createElement("div");
    header.className = "lesson-group-title";
    header.innerHTML = `${group.label} <span>${groupLessons.length}</span>`;
    lessonGrid.appendChild(header);

    groupLessons.forEach(l => {
      const mastered = !!academyProgress.mastered[l.id];
      const difficulty = l.difficulty || DIFFICULTY_MAP[l.severity];
      const card = document.createElement("button");
      card.className = `lesson-card ${l.source} ${mastered ? "mastered" : ""}`;
      card.innerHTML = `
        <div class="lesson-card-top">
          <span class="lesson-icon">${l.source === "dockerfile" ? "🐳" : "☸️"}</span>
          <span class="sev-chip ${l.severity}">${l.severity}</span>
        </div>
        <h4>${l.id} · ${l.title}</h4>
        <p>${l.description}</p>
        <div class="lesson-card-foot">
          <span class="finding-category-tag">${l.category}</span>
          <span class="difficulty-tag ${difficulty.toLowerCase()}">${difficulty}</span>
          <span class="lesson-status">${mastered ? "✅ Mastered" : "📖 Start lesson"}</span>
        </div>`;
      card.addEventListener("click", () => openLesson(l.id));
      lessonGrid.appendChild(card);
      totalRendered++;
    });
  });

  if (lessonEmptyState) {
    lessonEmptyState.classList.toggle("hidden", totalRendered > 0);
  }
  updateProgressBars();
}

function updateProgressBars() {
  const all = Object.values(LESSONS);
  const docker = all.filter(l => l.source === "dockerfile");
  const k8s = all.filter(l => l.source === "k8s");
  const dockerDone = docker.filter(l => academyProgress.mastered[l.id]).length;
  const k8sDone = k8s.filter(l => academyProgress.mastered[l.id]).length;
  document.getElementById("dockerProgressBar").style.width = (dockerDone / docker.length * 100) + "%";
  document.getElementById("k8sProgressBar").style.width = (k8sDone / k8s.length * 100) + "%";
  document.getElementById("dockerProgressText").textContent = `${dockerDone} / ${docker.length}`;
  document.getElementById("k8sProgressText").textContent = `${k8sDone} / ${k8s.length}`;

  if (typeof checkCertificateStatus === "function") {
    checkCertificateStatus();
  }
}

// ── QUIZ ENGINE (shuffled + retry + mastery pop) ──────
function shuffleQuiz(quiz) {
  const entries = quiz.options.map((text, origIdx) => ({ text, origIdx }));
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  return entries;
}

function quizHtml(quiz) {
  const entries = shuffleQuiz(quiz);
  return `
    <div class="lesson-quiz">
      <h4>🎯 Quick check — pass to master this rule</h4>
      <p class="quiz-question">${quiz.q}</p>
      ${entries.map((e, i) =>
        `<button class="quiz-option" data-idx="${e.origIdx}" style="animation-delay:${0.06 + i * 0.07}s">${e.text}</button>`
      ).join("")}
      <div class="quiz-feedback" data-feedback></div>
    </div>`;
}

function wireQuiz(quizBox, quiz, onCorrect, onRetry) {
  quizBox.querySelectorAll(".quiz-option").forEach(btn => {
    btn.addEventListener("click", () => {
      quizBox.querySelectorAll(".quiz-option").forEach(b => b.disabled = true);
      const idx = Number(btn.dataset.idx);
      const correct = idx === quiz.answer;
      btn.classList.add(correct ? "correct" : "wrong");
      if (!correct) {
        const right = quizBox.querySelector(`.quiz-option[data-idx="${quiz.answer}"]`);
        if (right) right.classList.add("correct");
      }
      const fb = quizBox.querySelector("[data-feedback]");
      if (correct) {
        fb.innerHTML = `<div class="mastery-banner">🎉 Correct! <strong>Rule mastered.</strong> Go fix a real file and re-run the analyzer to prove it.</div>`;
        if (onCorrect) onCorrect();
      } else {
        fb.innerHTML = `<p class="quiz-feedback bad">❌ Not quite. <button class="quiz-retry">🔄 Try again</button></p>`;
        const retry = fb.querySelector(".quiz-retry");
        if (retry) retry.addEventListener("click", () => { if (onRetry) onRetry(); });
      }
    });
  });
}

// ── LESSON VIEW ────────────────────────────────────────
const lessonView = document.getElementById("lessonView");
const lessonContent = document.getElementById("lessonContent");

function openLesson(id) {
  const l = LESSONS[id];
  if (!l) return;

  // Award lesson-view XP once per lesson (opening the detail page)
  awardXP(XP_VALUES.lessonView, `lesson_view_${id}`, `⭐ +${XP_VALUES.lessonView} XP — Lesson started!`);
  checkBadges();

  // Restore Academy frame elements if certificate view was isolated
  const hero = document.querySelector(".academy-hero");
  if (hero) hero.classList.remove("hidden");
  const badges = document.getElementById("badgesPanel");
  if (badges) badges.classList.remove("hidden");
  const filters = document.querySelector(".lesson-filters");
  if (filters) filters.classList.remove("hidden");
  const certPanel = document.getElementById("certificatePanel");
  if (certPanel) certPanel.classList.remove("hidden");

  // Ensure flashcards and certificate views are hidden
  const fcView = document.getElementById("flashcardsView");
  if (fcView) fcView.classList.add("hidden");
  const certView = document.getElementById("certificateView");
  if (certView) certView.classList.add("hidden");

  lessonGrid.classList.add("hidden");
  lessonView.classList.remove("hidden");
  const beginner = els.beginnerMode.checked;
  const ln = l.learning;
  lessonContent.innerHTML = `
    <div class="lesson-head">
      <span class="lesson-icon big">${l.source === "dockerfile" ? "🐳" : "☸️"}</span>
      <div>
        <h3>${l.id} — ${l.title}</h3>
        <p><span class="sev-chip ${l.severity}">${l.severity}</span>
           <span class="finding-category-tag">${l.category}</span></p>
      </div>
    </div>
    <div class="lesson-body">
      <h4>${beginner ? "🔍 In plain language" : "🔧 Technical detail"}</h4>
      <p>${beginner ? ln.plain : ln.technical}</p>
      <h4>❓ Why this matters</h4>
      <p>${ln.why}</p>
      ${ln.best_practice ? `
        <div class="learning-fix">
          <div class="learning-fix-header">
            <strong>✅ Fix:</strong>
            <button class="copy-btn" data-copy="${escapeAttr(ln.best_practice)}" data-toast="Fix copied to clipboard." title="Copy fix to clipboard">
              📋 Copy Fix
            </button>
          </div>
          <div class="learning-fix-body">${escapeHtml(ln.best_practice)}</div>
        </div>` : ""}
      <h4>📝 Bad vs Good</h4>
      <div class="code-wrapper">
        <button class="copy-btn code-copy-btn" data-copy="${escapeAttr(ln.example)}" data-toast="Example code copied to clipboard." title="Copy example code to clipboard">
          📋 Copy Code
        </button>
        <pre>${escapeHtml(ln.example)}</pre>
      </div>
    </div>`;
  lessonContent.insertAdjacentHTML("beforeend", quizHtml(ln.quiz));
  wireQuiz(lessonContent.querySelector(".lesson-quiz"), ln.quiz,
    () => {
      // Award quiz-pass XP once per lesson
      awardXP(XP_VALUES.quizPass, `quiz_pass_${l.id}`, `⭐ +${XP_VALUES.quizPass} XP — Quiz passed!`);

      // Award mastery XP once (only on the transition from unmastered → mastered)
      const alreadyMastered = !!academyProgress.mastered[l.id];
      academyProgress.mastered[l.id] = true;
      academyProgress.quizScores[l.id] = 1;
      if (!alreadyMastered) {
        awardXP(XP_VALUES.mastery, `mastery_${l.id}`, `⭐ +${XP_VALUES.mastery} XP — Lesson mastered!`);
        celebrateConfetti();
      }

      saveProgress();
      updateProgressBars();
      checkBadges();
      renderBadges();
    },
    () => openLesson(l.id)
  );
  lessonView.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("lessonBackBtn").addEventListener("click", () => {
  lessonView.classList.add("hidden");
  lessonGrid.classList.remove("hidden");
  renderLessonGrid();
});

// ── BRIDGE: finding → lesson ───────────────────────────
els.findingsList.addEventListener("click", (e) => {
  const btn = e.target.closest(".lesson-link");
  if (!btn) return;
  e.stopPropagation();
  e.preventDefault();
  switchTab("academy");
  openLesson(btn.dataset.id);
}, true);

// ─── TOAST & CLIPBOARD HELPERS ──────────────────────────────
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 2500);
}

async function copyToClipboard(text, successMessage = "Fix copied to clipboard.") {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (!successful) throw new Error("Copy command unsuccessful");
    }
    showToast(`📋 ${successMessage}`, "success");
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    showToast("❌ Unable to copy to clipboard.", "error");
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  e.stopPropagation();
  const textToCopy = btn.dataset.copy;
  const toastMsg = btn.dataset.toast || "Fix copied to clipboard.";
  if (textToCopy) {
    copyToClipboard(textToCopy, toastMsg);
    const origHtml = btn.innerHTML;
    btn.innerHTML = "✅ Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = origHtml;
      btn.classList.remove("copied");
    }, 1800);
  }
});

// Boot the Academy
if (typeof LESSONS !== "undefined") {
  renderLessonGrid();
  renderBadges();
}

// ═══════════════════════════════════════════════════════
//  PHASE 2.5 — FLASHCARDS
// ═══════════════════════════════════════════════════════
// Session-only flashcard state. Resets on page refresh.
const XP_FC_SESSION = 10; // XP for completing a flashcard session

let fcState = {
  deck: [],          // current ordered deck of lesson objects
  index: 0,          // current card index
  flipped: false,    // whether the current card is showing the back
  sessionKey: null,  // unique key per started session for XP dedup
  xpAwarded: false   // whether XP was awarded for the current session
};

// ── DOM refs ─────────────────────────────────────────
const fcView        = document.getElementById("flashcardsView");
const fcCard        = document.getElementById("fcCard");
const fcFrontId     = document.getElementById("fcFrontId");
const fcFrontTitle  = document.getElementById("fcFrontTitle");
const fcSourceTag   = document.getElementById("fcSourceTag");
const fcBackWhy     = document.getElementById("fcBackWhy");
const fcBackFix     = document.getElementById("fcBackFix");
const fcCounter     = document.getElementById("fcCounter");
const fcPipFill     = document.getElementById("fcPipFill");
const fcPrevBtn     = document.getElementById("fcPrevBtn");
const fcNextBtn     = document.getElementById("fcNextBtn");
const fcComplete    = document.getElementById("fcComplete");
const fcCompleteXpMsg = document.getElementById("fcCompleteXpMsg");
const fcCategory    = document.getElementById("fcCategory");

// ── Build deck (non-mutating) ─────────────────────────
function buildDeck(category, shuffle) {
  let lessons = Object.values(LESSONS);
  if (category === "dockerfile") lessons = lessons.filter(l => l.source === "dockerfile");
  else if (category === "k8s")   lessons = lessons.filter(l => l.source === "k8s");

  // Shallow copy — never mutates LESSONS
  const deck = [...lessons];
  if (shuffle) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  return deck;
}

// ── Show a card ───────────────────────────────────────
function showCard() {
  const lesson = fcState.deck[fcState.index];
  const total  = fcState.deck.length;

  // Reset flip
  fcState.flipped = false;
  fcCard.classList.remove("flipped");

  // Front face
  fcFrontId.textContent    = lesson.id;
  fcFrontTitle.textContent = lesson.title;
  fcSourceTag.textContent  = lesson.source === "dockerfile" ? "🐳 Dockerfile" : "☸️ Kubernetes";
  fcSourceTag.className    = `fc-source-tag ${lesson.source}`;

  // Back face
  const ln = lesson.learning || {};
  fcBackWhy.textContent = ln.why || ln.plain || "—";
  fcBackFix.textContent = ln.best_practice || ln.technical || "—";

  // Counter + progress bar
  fcCounter.textContent = `Card ${fcState.index + 1} of ${total}`;
  fcPipFill.style.width = `${((fcState.index + 1) / total) * 100}%`;

  // Prev/Next buttons
  fcPrevBtn.disabled = fcState.index === 0;
  fcNextBtn.textContent = fcState.index === total - 1 ? "Finish ✓" : "Next →";

  // Hide completion panel, show card and layout blocks
  fcComplete.classList.add("hidden");
  fcCard.classList.remove("hidden");
  const progressRow = document.querySelector(".fc-progress-row");
  if (progressRow) progressRow.classList.remove("hidden");
  const navRow = document.querySelector(".fc-nav");
  if (navRow) navRow.classList.remove("hidden");
}

// ── Flip a card ───────────────────────────────────────
function flipCard() {
  fcState.flipped = !fcState.flipped;
  fcCard.classList.toggle("flipped", fcState.flipped);
}

// ── Show completion screen ────────────────────────────
function showCompletion() {
  fcCard.classList.add("hidden");
  const progressRow = document.querySelector(".fc-progress-row");
  if (progressRow) progressRow.classList.add("hidden");
  const navRow = document.querySelector(".fc-nav");
  if (navRow) navRow.classList.add("hidden");
  fcComplete.classList.remove("hidden");

  const actionKey = "flashcards_completion_session";
  const alreadyEarned = !!academyXP.actions[actionKey];

  awardXP(XP_FC_SESSION, actionKey, `⭐ +${XP_FC_SESSION} XP — Flashcard session complete!`);
  checkBadges();
  renderBadges();
  celebrateConfetti();

  if (!alreadyEarned && academyXP.actions[actionKey]) {
    fcCompleteXpMsg.textContent = `You earned ⭐ +${XP_FC_SESSION} XP!`;
  } else {
    fcCompleteXpMsg.textContent = "Well done reviewing all cards!";
  }
}

// ── Open flashcards view ──────────────────────────────
function openFlashcards(shuffle) {
  const category = fcCategory ? fcCategory.value : "all";

  fcState.deck  = buildDeck(category, !!shuffle);
  fcState.index = 0;

  if (fcState.deck.length === 0) {
    showToast("No cards available for this category.", "error");
    return;
  }

  // Hide grid/lesson views; show flashcard view
  lessonGrid.classList.add("hidden");
  if (lessonEmptyState) lessonEmptyState.classList.add("hidden");
  lessonView.classList.add("hidden");
  fcView.classList.remove("hidden");
  fcCard.classList.remove("hidden");

  showCard();
  fcView.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Close flashcards view ─────────────────────────────
function closeFlashcards() {
  fcView.classList.add("hidden");
  fcCard.classList.remove("hidden");   // reset for next open
  lessonGrid.classList.remove("hidden");
  if (lessonEmptyState) {
    lessonEmptyState.classList.toggle("hidden",
      document.querySelectorAll(".lesson-card").length > 0);
  }
  renderLessonGrid();
}

// ── Event wiring ──────────────────────────────────────
// Launch button in badges-panel heading
const flashcardsBtn = document.getElementById("flashcardsBtn");
if (flashcardsBtn) {
  flashcardsBtn.addEventListener("click", () => openFlashcards(false));
}

// Back button inside flashcard view
const fcBackBtn = document.getElementById("fcBackBtn");
if (fcBackBtn) fcBackBtn.addEventListener("click", closeFlashcards);

// Flip on card click or Enter/Space
if (fcCard) {
  fcCard.addEventListener("click", flipCard);
  fcCard.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipCard(); }
  });
}

// Previous card
if (fcPrevBtn) {
  fcPrevBtn.addEventListener("click", () => {
    if (fcState.index > 0) {
      fcState.index--;
      showCard();
    }
  });
}

// Next card / finish
const fcNextBtn2 = document.getElementById("fcNextBtn");
if (fcNextBtn2) {
  fcNextBtn2.addEventListener("click", () => {
    if (fcState.index < fcState.deck.length - 1) {
      fcState.index++;
      showCard();
    } else {
      showCompletion();
    }
  });
}

// Shuffle button
const fcShuffleBtn = document.getElementById("fcShuffleBtn");
if (fcShuffleBtn) fcShuffleBtn.addEventListener("click", () => openFlashcards(true));

// Restart button (same order)
const fcRestartBtn = document.getElementById("fcRestartBtn");
if (fcRestartBtn) fcRestartBtn.addEventListener("click", () => openFlashcards(false));

// Category change — rebuild deck immediately
if (fcCategory) {
  fcCategory.addEventListener("change", () => openFlashcards(false));
}

// Completion screen — play again
const fcCompleteRestartBtn = document.getElementById("fcCompleteRestartBtn");
if (fcCompleteRestartBtn) {
  fcCompleteRestartBtn.addEventListener("click", () => {
    fcState.index = 0;
    fcCard.classList.remove("hidden");
    showCard();
  });
}

// Completion screen — shuffle & replay
const fcCompleteShuffle = document.getElementById("fcCompleteShuffle");
if (fcCompleteShuffle) fcCompleteShuffle.addEventListener("click", () => openFlashcards(true));

// ═══════════════════════════════════════════════════════
//  PHASE 2.5 — CERTIFICATE OF COMPLETION
// ═══════════════════════════════════════════════════════

let academyCertificate = {
  id: null,
  recipientName: "DevOps Graduate",
  issueDate: null,
  unlockedToastShown: false
};

function generateVerificationHash(certId) {
  let hash = 0;
  for (let i = 0; i < certId.length; i++) {
    hash = (hash << 5) - hash + certId.charCodeAt(i);
    hash |= 0;
  }
  return "VERIFY-" + Math.abs(hash).toString(16).toUpperCase();
}

function checkCertificateStatus() {
  const all = Object.values(LESSONS);
  const total = all.length;
  const masteredCount = all.filter(l => academyProgress.mastered[l.id]).length;
  
  const contentEl = document.getElementById("certPanelContent");
  if (!contentEl) return;
  
  if (masteredCount === total) {
    if (!academyCertificate.id) {
      const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tsPart = Date.now().toString(36).toUpperCase().substring(2, 6);
      academyCertificate.id = `DM-CERT-${randPart}-${tsPart}`;
      academyCertificate.issueDate = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    if (!academyCertificate.unlockedToastShown) {
      academyCertificate.unlockedToastShown = true;
      showToast("🏆 Academy Certificate unlocked!", "success");
      celebrateConfetti();
    }
    
    contentEl.innerHTML = `
      <div class="cert-unlocked-state">
        <p class="cert-congrats">🏆 <strong>Congratulations!</strong> You completed the DevMate Academy.</p>
        <button id="viewCertBtn" class="fc-btn fc-btn-primary" style="margin-top: 8px;">🎓 View Certificate</button>
      </div>
    `;
    
    const viewCertBtn = document.getElementById("viewCertBtn");
    if (viewCertBtn) {
      viewCertBtn.addEventListener("click", openCertificate);
    }
  } else {
    contentEl.innerHTML = `
      <div class="cert-locked-state">
        <p class="cert-req">🔒 Master all 12 lessons to unlock your certificate.</p>
        <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width: ${(masteredCount / total * 100)}%; background: var(--brand-1);"></div></div>
        <span class="progress-text" style="margin-left:0; margin-top:4px; display:block;">${masteredCount} / ${total} lessons mastered</span>
      </div>
    `;
  }
}

function openCertificate() {
  const container = document.getElementById("certificatePaper");
  if (!container) return;
  
  const certId = academyCertificate.id || "DM-CERT-UNKNOWN";
  const dateStr = academyCertificate.issueDate || new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const recipient = academyCertificate.recipientName || "DevOps Graduate";
  const hash = generateVerificationHash(certId);
  
  container.innerHTML = `
    <div class="cert-header">
      <span class="cert-logo">🐳 DevMate ☸️</span>
      <h3>DevMate Deployment Readiness Academy</h3>
    </div>
    <div class="cert-title">Certificate of Completion</div>
    <p class="cert-intro">This is proudly presented to</p>
    <div class="cert-recipient" contenteditable="true" id="certRecipientName" title="Click to edit name">${escapeHtml(recipient)}</div>
    <p class="cert-statement">for successfully mastering Dockerfile and Kubernetes manifest engineering, security hardening, resource management, liveness/readiness instrumentation, and static governance checks.</p>
    
    <div class="cert-meta-row">
      <div class="cert-meta-col">
        <span class="cert-meta-label">Completion Date</span>
        <span class="cert-meta-value">${dateStr}</span>
      </div>
      <div class="cert-meta-col">
        <span class="cert-meta-label">Certificate ID</span>
        <span class="cert-meta-value font-mono">${certId}</span>
      </div>
      <div class="cert-meta-col">
        <span class="cert-meta-label">Verification Code</span>
        <span class="cert-meta-value font-mono">${hash}</span>
      </div>
    </div>
    
    <div class="cert-footer-branding">
      <span class="cert-status-badge">✅ Academy Verified</span>
    </div>
  `;

  // Synchronize dynamic recipient name edits to state
  const nameEl = document.getElementById("certRecipientName");
  if (nameEl) {
    const syncName = () => {
      const val = nameEl.textContent.trim();
      academyCertificate.recipientName = val || "DevOps Graduate";
    };
    nameEl.addEventListener("blur", syncName);
    nameEl.addEventListener("input", syncName);
  }
  
  // Hide main tabs and normal academy content
  document.getElementById("lessonGrid").classList.add("hidden");
  if (document.getElementById("lessonEmptyState")) document.getElementById("lessonEmptyState").classList.add("hidden");
  document.getElementById("lessonView").classList.add("hidden");
  document.getElementById("flashcardsView").classList.add("hidden");
  
  // Hide support layouts
  const hero = document.querySelector(".academy-hero");
  if (hero) hero.classList.add("hidden");
  const badges = document.getElementById("badgesPanel");
  if (badges) badges.classList.add("hidden");
  const filters = document.querySelector(".lesson-filters");
  if (filters) filters.classList.add("hidden");
  const certPanel = document.getElementById("certificatePanel");
  if (certPanel) certPanel.classList.add("hidden");
  
  // Show certificate view
  document.getElementById("certificateView").classList.remove("hidden");
  document.getElementById("certificateView").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeCertificate() {
  document.getElementById("certificateView").classList.add("hidden");
  
  // Restore all academy elements
  const hero = document.querySelector(".academy-hero");
  if (hero) hero.classList.remove("hidden");
  const badges = document.getElementById("badgesPanel");
  if (badges) badges.classList.remove("hidden");
  const filters = document.querySelector(".lesson-filters");
  if (filters) filters.classList.remove("hidden");
  const certPanel = document.getElementById("certificatePanel");
  if (certPanel) certPanel.classList.remove("hidden");
  
  document.getElementById("lessonGrid").classList.remove("hidden");
  
  renderLessonGrid();
}

function verifyCertificate() {
  const inputEl = document.getElementById("verifyCertIdInput");
  const resultEl = document.getElementById("verifyCertResult");
  if (!inputEl || !resultEl) return;
  
  const enteredId = inputEl.value.trim();
  if (!enteredId) {
    resultEl.innerHTML = `<p>⚠️ Please enter a Certificate ID to verify.</p>`;
    resultEl.className = "verify-result warning";
    resultEl.classList.remove("hidden");
    return;
  }

  // Case A: No certificate unlocked yet in session
  if (!academyCertificate.id) {
    resultEl.innerHTML = `
      <div class="verify-warning-box">
        <p>🔒 <strong>No Active Certificate in Session</strong></p>
        <p>No certificate has been unlocked in your current browser session yet. Master all 12 Academy lessons to unlock your certificate.</p>
        <div class="verify-session-notice">
          ℹ️ <strong>Session-Only System:</strong> DevMate certificates exist in volatile browser session memory. Refreshing resets state.
        </div>
        <button type="button" class="verify-clear-btn" onclick="clearCertVerification()">Clear / Try Another ID</button>
      </div>
    `;
    resultEl.className = "verify-result warning";
    resultEl.classList.remove("hidden");
    return;
  }
  
  // Case B: Valid current-session certificate ID
  if (enteredId === academyCertificate.id) {
    const nameEl = document.getElementById("certRecipientName");
    if (nameEl) {
      const currentVal = nameEl.textContent.trim();
      if (currentVal) academyCertificate.recipientName = currentVal;
    }
    const name = academyCertificate.recipientName || "DevOps Graduate";
    const dateStr = academyCertificate.issueDate || new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const hash = generateVerificationHash(academyCertificate.id);

    resultEl.innerHTML = `
      <div class="verify-success-box">
        <p>✅ <strong>Certificate Verified!</strong></p>
        <p><strong>Recipient:</strong> ${escapeHtml(name)}</p>
        <p><strong>Certificate ID:</strong> <code class="font-mono">${academyCertificate.id}</code></p>
        <p><strong>Verification Code:</strong> <code class="font-mono">${hash}</code></p>
        <p><strong>Completion Date:</strong> ${dateStr}</p>
        <p><strong>Status:</strong> Completed DevMate Academy (12/12 Rules Mastered)</p>
        <div class="verify-session-notice">
          ℹ️ <strong>Session Verification:</strong> Verified against active browser session state.
        </div>
        <button type="button" class="verify-clear-btn" onclick="clearCertVerification()">Clear / Try Another ID</button>
      </div>
    `;
    resultEl.className = "verify-result success";
    resultEl.classList.remove("hidden");
  } else {
    // Case C: Invalid or previous-session Certificate ID
    resultEl.innerHTML = `
      <div class="verify-error-box">
        <p>❌ <strong>Verification Failed / Invalid ID</strong></p>
        <p>The Certificate ID <code>"${escapeHtml(enteredId)}"</code> was not found in the active session.</p>
        <div class="verify-session-notice">
          ℹ️ <strong>Session Limitation:</strong> DevMate certificates are session-only and reset on browser refresh. Certificates from previous sessions or external sources cannot be verified without a persistent server registry (planned for Phase 3).
        </div>
        <button type="button" class="verify-clear-btn" onclick="clearCertVerification()">Clear / Try Another ID</button>
      </div>
    `;
    resultEl.className = "verify-result error";
    resultEl.classList.remove("hidden");
  }
}

function clearCertVerification() {
  const inputEl = document.getElementById("verifyCertIdInput");
  const resultEl = document.getElementById("verifyCertResult");
  if (inputEl) inputEl.value = "";
  if (resultEl) {
    resultEl.classList.add("hidden");
    resultEl.innerHTML = "";
  }
}
window.clearCertVerification = clearCertVerification;

// Click and key bindings for Certificate view
const certBackBtn = document.getElementById("certBackBtn");
if (certBackBtn) certBackBtn.addEventListener("click", closeCertificate);

const certPrintBtn = document.getElementById("certPrintBtn");
if (certPrintBtn) {
  certPrintBtn.addEventListener("click", () => {
    window.print();
  });
}

const verifyCertBtn = document.getElementById("verifyCertBtn");
if (verifyCertBtn) {
  verifyCertBtn.addEventListener("click", verifyCertificate);
}

// Allow pressing Enter inside the verify input to trigger verification
const verifyCertIdInputEl = document.getElementById("verifyCertIdInput");
if (verifyCertIdInputEl) {
  // Enter key submits
  verifyCertIdInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyCertificate();
    }
  });
  // Typing a new value clears any stale result immediately
  verifyCertIdInputEl.addEventListener("input", () => {
    const resultEl = document.getElementById("verifyCertResult");
    if (resultEl && !resultEl.classList.contains("hidden")) {
      resultEl.classList.add("hidden");
      resultEl.innerHTML = "";
    }
  });
}

// ═══════════════════════════════════════════════════════
//  PHASE 2.5 — DOCKER IMAGE ANALYSIS
// ═══════════════════════════════════════════════════════

const imgEls = {
  refInput:       document.getElementById("imageRefInput"),
  analyzeBtn:     document.getElementById("analyzeImageBtn"),
  btnText:        document.getElementById("imageBtnText"),
  btnSpinner:     document.getElementById("imageBtnSpinner"),
  errorMsg:       document.getElementById("imageErrorMsg"),
  resultsPanel:   document.getElementById("imageResultsPanel"),
  skeleton:       document.getElementById("imageLoadingSkeleton"),
  resultsContent: document.getElementById("imageResultsContent"),
};

// ── Helpers ────────────────────────────────────────────
function imgMetaItem(label, value, mono) {
  const safeVal = escapeHtml(String(value ?? "—"));
  return `<div class="img-meta-item">
    <span class="img-meta-label">${label}</span>
    <span class="img-meta-value${mono ? " font-mono" : ""}">${safeVal}</span>
  </div>`;
}

// Convert Trivy ALL-CAPS severity → title-case CSS class name matching existing sev-chip rules.
function trivySevClass(sev) {
  const map = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low", UNKNOWN: "Low" };
  return map[(sev || "").toUpperCase()] || "Low";
}

// ── Render ──────────────────────────────────────────────
function renderImageResults(data) {
  const content = imgEls.resultsContent;
  const meta = data.metadata || {};

  /* 1. Metadata card */
  const tags    = (meta.repo_tags || []).join("  ·  ") || data.image_ref;
  const platform = [meta.architecture, meta.os].filter(Boolean).join(" / ") || "—";
  const ports   = (meta.exposed_ports || []).join(", ") || "(none)";
  const ep      = (meta.entrypoint || []).join(" ") || "(not set)";
  const cmd     = (meta.cmd || []).join(" ") || "(not set)";
  let created = "—";
  try { if (meta.created) created = new Date(meta.created).toLocaleString(); } catch {}

  let envHtml = "";
  if ((meta.env || []).length > 0) {
    envHtml = `<details class="img-env-details">
      <summary class="img-env-summary">🌿 Environment Variables (${meta.env.length})</summary>
      <div class="img-env-list">${meta.env.map(e => `<code class="img-env-item">${escapeHtml(e)}</code>`).join("")}</div>
    </details>`;
  }

  const metaCard = `
    <div class="panel-card img-meta-card">
      <div class="panel-card-header">
        <span class="panel-icon">🐳</span>
        <h3 class="img-result-title">${escapeHtml(tags)}</h3>
      </div>
      <div class="img-meta-grid">
        ${imgMetaItem("Image ID", meta.id, true)}
        ${imgMetaItem("Platform", platform)}
        ${imgMetaItem("Created", created)}
        ${imgMetaItem("Size", meta.size)}
        ${imgMetaItem("Layers", meta.layer_count != null ? String(meta.layer_count) : "—")}
        ${imgMetaItem("User", meta.user || "(root / not set)")}
        ${imgMetaItem("Working Dir", meta.workdir || "(not set)")}
        ${imgMetaItem("Exposed Ports", ports)}
        ${imgMetaItem("Entrypoint", ep)}
        ${imgMetaItem("CMD", cmd)}
      </div>
      ${envHtml}
    </div>`;

  /* 2. Security findings — reuse existing finding-card classes */
  const secs = data.security_findings || [];
  const secItems = secs.length === 0
    ? `<p class="empty-state" style="padding:16px 20px;text-align:center;">✅ No security issues detected from image inspection.</p>`
    : secs.map((f, i) => `
        <div class="finding-card ${f.severity}" style="animation-delay:${i * 0.05}s">
          <div class="finding-top">
            <div class="finding-top-left">
              <span class="finding-icon">${SEVERITY_ICONS[f.severity] || "📋"}</span>
              <span class="finding-id">${f.id}</span>
            </div>
            <span class="sev-chip ${f.severity}">${f.severity}</span>
          </div>
          <div class="finding-desc">${escapeHtml(f.description)}</div>
          <div class="finding-meta">
            <span class="finding-category-tag">${f.category}</span>
          </div>
        </div>`).join("");

  const secCard = `
    <div class="panel-card" style="margin-top:16px;">
      <div class="panel-card-header">
        <span class="panel-icon">🔒</span>
        <h3>Security Findings</h3>
        <span class="findings-count" style="margin-left:auto;">${secs.length} finding${secs.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="img-sec-list">${secItems}</div>
    </div>`;

  /* 3. Trivy section */
  let trivyCard = "";
  const ts = data.trivy_status || "";

  if (ts === "unavailable") {
    trivyCard = `
      <div class="panel-card" style="margin-top:16px;">
        <div class="panel-card-header"><span class="panel-icon">🛡️</span><h3>Vulnerability Scan (Trivy)</h3></div>
        <div class="img-trivy-notice info">
          ℹ️ <strong>Trivy is not installed</strong> — CVE scanning is unavailable.<br>
          <span style="font-size:11px;color:var(--text-muted);">Install from <code>aquasecurity.github.io/trivy</code> to enable automated CVE detection.</span>
        </div>
      </div>`;
  } else if (ts.startsWith("error:")) {
    trivyCard = `
      <div class="panel-card" style="margin-top:16px;">
        <div class="panel-card-header"><span class="panel-icon">🛡️</span><h3>Vulnerability Scan (Trivy)</h3></div>
        <div class="img-trivy-notice warn">⚠️ <strong>Trivy scan failed:</strong> ${escapeHtml(ts.replace(/^error:/, ""))}</div>
      </div>`;
  } else if (ts === "ok" && data.trivy_summary) {
    const sum   = data.trivy_summary;
    const sc    = sum.severity_counts || {};
    const vulns = sum.vulnerabilities || [];

    const countPills = ["CRITICAL","HIGH","MEDIUM","LOW","UNKNOWN"].map(s => `
      <div class="trivy-count-pill ${s.toLowerCase()}">
        <span class="trivy-pill-num">${sc[s] || 0}</span>
        <span class="trivy-pill-label">${s}</span>
      </div>`).join("");

    let vulnBody = "";
    if (sum.total === 0) {
      vulnBody = `<p class="empty-state" style="padding:16px 20px;text-align:center;">✅ No vulnerabilities found by Trivy.</p>`;
    } else if (vulns.length > 0) {
      const rows = vulns.map(v => {
        const cls    = trivySevClass(v.severity);
        const fixStr = v.fixed ? ` → <strong>${escapeHtml(v.fixed)}</strong>` : "";
        const ttl    = v.title ? `<span class="trivy-vuln-title">${escapeHtml(v.title)}</span>` : "";
        return `<div class="trivy-vuln-row">
            <span class="sev-chip ${cls}">${v.severity}</span>
            <span class="trivy-vuln-id font-mono">${escapeHtml(v.id)}</span>
            <span class="trivy-vuln-pkg">${escapeHtml(v.pkg)}</span>
            <span class="trivy-vuln-ver">${escapeHtml(v.installed)}${fixStr}</span>
            ${ttl}
          </div>`;
      }).join("");
      const more = sum.total > vulns.length
        ? `<p class="hint" style="padding:6px 14px 10px;">Showing top ${vulns.length} of ${sum.total} CVEs.</p>`
        : "";
      vulnBody = `<div class="trivy-vuln-list">${rows}${more}</div>`;
    }

    trivyCard = `
      <div class="panel-card" style="margin-top:16px;">
        <div class="panel-card-header">
          <span class="panel-icon">🛡️</span>
          <h3>Vulnerability Scan (Trivy)</h3>
          <span class="findings-count" style="margin-left:auto;">${sum.total} CVE${sum.total !== 1 ? "s" : ""}</span>
        </div>
        <div class="trivy-count-row">${countPills}</div>
        ${vulnBody}
      </div>`;
  }

  content.innerHTML = metaCard + secCard + trivyCard;
}

// ── Fetch ───────────────────────────────────────────────
async function runImageAnalysis() {
  const ref = (imgEls.refInput?.value || "").trim();
  if (imgEls.errorMsg) imgEls.errorMsg.innerHTML = "";

  if (!ref) {
    if (imgEls.errorMsg) imgEls.errorMsg.textContent = "Please enter an image name, e.g. nginx:1.27";
    return;
  }

  imgEls.analyzeBtn.disabled = true;
  if (imgEls.btnText)    imgEls.btnText.textContent = "Analyzing…";
  if (imgEls.btnSpinner) imgEls.btnSpinner.classList.remove("hidden");
  imgEls.resultsPanel.classList.remove("hidden");
  imgEls.resultsPanel.classList.add("visible");
  imgEls.skeleton.classList.remove("hidden");
  imgEls.resultsContent.classList.add("hidden");
  imgEls.resultsContent.classList.remove("visible");

  try {
    const res  = await fetch(IMAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: ref }),
    });
    const json = await res.json();
    imgEls.skeleton.classList.add("hidden");

    if (!res.ok) {
      const err = json.error || "error";
      const msg = json.message || `Request failed (${res.status})`;
      const pfx = err === "docker_unavailable" ? "🐳" :
                  err === "image_not_found"     ? "📦" :
                  err === "invalid_image_ref"   ? "⚠️" : "❌";
      const lbl = err === "docker_unavailable" ? "Docker unavailable" :
                  err === "image_not_found"     ? "Image not found locally" :
                  err === "invalid_image_ref"   ? "Invalid image reference" : "Error";
      imgEls.errorMsg.innerHTML = `${pfx} <strong>${lbl}:</strong> ${escapeHtml(msg)}`;
      imgEls.resultsPanel.classList.add("hidden");
      imgEls.resultsPanel.classList.remove("visible");
      return;
    }

    renderImageResults(json);
    imgEls.resultsContent.classList.remove("hidden");
    imgEls.resultsContent.classList.add("visible");
    imgEls.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    imgEls.skeleton.classList.add("hidden");
    if (imgEls.errorMsg) imgEls.errorMsg.textContent = "Unable to connect to the analysis server. Is the backend running?";
    imgEls.resultsPanel.classList.add("hidden");
    imgEls.resultsPanel.classList.remove("visible");
  } finally {
    imgEls.analyzeBtn.disabled = false;
    if (imgEls.btnText)    imgEls.btnText.textContent = "Analyze Image";
    if (imgEls.btnSpinner) imgEls.btnSpinner.classList.add("hidden");
  }
}

// ── Event wiring ───────────────────────────────────────
const analyzeImageBtn = document.getElementById("analyzeImageBtn");
if (analyzeImageBtn) analyzeImageBtn.addEventListener("click", runImageAnalysis);

const imageRefInput = document.getElementById("imageRefInput");
if (imageRefInput) {
  imageRefInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runImageAnalysis(); }
  });
}
