# DevMate — Deployment Readiness Analyzer & Academy

**DevMate** is a lightweight, web-based deployment readiness analyzer and interactive learning platform for Dockerfiles and Kubernetes manifests. It scans container build instructions and Kubernetes configuration files for security vulnerabilities, reliability concerns, observability gaps, and infrastructure best practices, while providing an integrated Academy to help developers master cloud-native configurations.

---

## 🎯 Main Purpose

DevMate serves a dual purpose:
1. **Automated Static Inspection**: Allows developers and DevOps engineers to paste or upload Dockerfiles and Kubernetes manifests to receive an instant deployment readiness score (0–100), severity breakdown, governance check, and prioritized improvement roadmap.
2. **Interactive Education**: Provides an integrated **DevMate Academy** with 12 structured lessons and quizzes corresponding to each rule evaluated by the analyzer, helping users understand *why* best practices matter and how to fix vulnerabilities.

---

## 🚀 Current Features

### 🔍 Analyzer Features
- **Multi-Scope Analysis**: Analyze Dockerfiles only, Kubernetes manifests only, or both simultaneously.
- **Dockerfile Best Practices & Security Scanning**: Detects unpinned base images (`DF001`), root user execution (`DF002`), missing health checks (`DF003`), unchowned file copies (`DF004`), and unexposed ports (`DF005`).
- **Kubernetes Manifest Validation**: Parses multi-document YAML manifests using PyYAML to detect YAML syntax errors (`K8S900`), non-workload-only manifests (`K8S902`), missing resource requests/limits (`K8S001`), missing readiness probes (`K8S002`), missing liveness probes (`K8S003`), missing pod/container security contexts (`K8S004`), and unpinned container image tags (`K8S005`).
- **Readiness Scoring Engine**:
  - Starts with a base score of 100 points.
  - Subtracts weighted penalties for each discovered finding.
  - Adds self-attested bonus points (+2 pts for documented rollback strategy, +2 pts for updated documentation).
  - Categorizes score into readiness statuses:
    - `≥ 85`: **Ready for Deployment** (Emerald)
    - `65 – 84`: **Needs Improvement** (Indigo)
    - `40 – 64`: **Significant Gaps** (Amber)
    - `< 40`: **Not Ready** (Red)
- **Interactive SVG Gauge**: Animated circular gauge rendering the readiness score.
- **Category Penalty Breakdown**: Bar chart illustrating point deductions across 5 categories: *Security*, *Best Practices*, *Reliability*, *Observability*, and *Performance*.
- **Governance Checklist**: Displays pass/fail status for auto-detected criteria (e.g. pinned base images, non-root user, healthchecks, resource limits, probes, multi-stage builds) alongside self-attested deployment metadata.
- **Step-by-Step Improvement Roadmap**: Automatically calculates a prioritized list of fixes ordered by impact, showing the projected score after resolving each item (capped at 95/100).
- **Findings Filter & Search**: Search findings by ID, description, or category, and filter by minimum severity (`All`, `Low+`, `Medium+`, `High+`, `Critical`).
- **Collapsible Inline Explanations**: Click any finding card to reveal inline explanations (plain or technical language based on Beginner Mode), risk impact summaries, best practice fixes, code examples, and inline quizzes.
- **Direct Bridge to Academy**: Click "📖 Take Lesson" on any finding card to immediately launch the corresponding Academy lesson.
- **📋 Copy-Fix Buttons** *(Phase 2.5)*: Every expanded finding card shows two copy buttons:
  - **📋 Copy Fix** — copies the best-practice fix snippet to the clipboard.
  - **📋 Copy Code** — copies the full bad-vs-good code example block.
- **Multi-Format Report Export**: Download analysis results in 3 formats:
  - **PDF Report** (`devmate-report.pdf` generated server-side via `fpdf2`, with fallback to `.txt`).
  - **JSON Data** (`devmate-report.json`).
  - **CSV Findings** (`devmate-findings.csv`).

---

### 🎓 Academy & Lesson Features
- **12 Comprehensive DevOps Lessons**: Full curriculum mapped 1:1 with analyzer rule IDs.
- **Dual Explanation Modes**: Toggleable **Beginner Mode** switch in the topbar dynamically switches between plain language explanations and in-depth technical details.
- **Interactive Quiz Engine**:
  - Each lesson contains a 4-choice quiz to test understanding.
  - Shuffles option order randomly on load while tracking correct answers.
  - Displays instant visual feedback (green for correct, red for incorrect with correct answer highlighted).
  - Includes a retry mechanism (`🔄 Try again`) for incorrect responses.
  - Displays a celebration banner (`mastery-banner`) upon passing.
- **Priority & Difficulty Grouping**: Lessons are grouped into priority sections: *Low Priority* (🟢), *Medium Priority* (🟡), *High Priority* (🟠), and *Critical* (🔴).
- **Multi-Filter Navigation**: Filter lessons by category (`All`, `Dockerfile`, `Kubernetes`, `Mastered`) and difficulty (`Beginner`, `Intermediate`, `Advanced`, `Expert`).
- **🔎 Academy Search** *(Phase 2.5)*: Real-time search input in the filter bar. Searches lesson ID, title, description, scope, category, severity, difficulty, plain-language explanation, and "why it matters" text. Works **in conjunction with** all existing filters — e.g. selecting `Kubernetes` and typing `probe` shows only Kubernetes lessons matching "probe".
- **Visual Progress Tracking**: Real-time progress bars for Dockerfile Mastery (0/5) and Kubernetes Mastery (0/7).
- **⭐ XP System** *(Phase 2.5)*: Session-based XP counter displayed as a badge in the Academy header. Awards XP for meaningful learning actions — starting a lesson, passing a quiz, and mastering a lesson — each awarded only once per lesson per session. Resets on page refresh, consistent with all other Academy state.
- **🏆 Badges / Achievements** *(Phase 2.5)*: 8 session-only achievement badges displayed in a compact panel below the XP counter. Badges unlock automatically as the user progresses through lessons and quizzes. Locked badges show their unlock requirement; unlocked badges glow green with a "✅ Unlocked" label. A purple toast notification fires on each new unlock.
- **📋 Copy-Fix Buttons in Lessons** *(Phase 2.5)*: Each lesson detail view exposes:
  - **📋 Copy Fix** — copies the best-practice fix to clipboard, with a 1.8s "✅ Copied!" state on the button.
  - **📋 Copy Code** — copies the full code example block overlaid at the top-right of the code block.
  - A **toast notification** slides up from the bottom-right corner confirming the action (green on success, red on clipboard failure).
- **🃏 Flashcards Mode** *(Phase 2.5)*: An interactive study mode allowing users to test their knowledge of Dockerfile and Kubernetes configurations. Accessible from the Academy, generating cards from current lesson data. Supports category selection, navigation, shuffling, session completion tracking, and awards +10 XP upon completing a session.
- **🎓 Academy Certificate** *(Phase 2.5)*: A completion certificate awarded when all 12 Academy lessons are mastered. Exposes a stable, unique Certificate ID generated in session memory, allowing for local verification. Includes a print-friendly overlay view with recipient name customization (`contenteditable`) and `window.print()` print-to-PDF styles.
- **🎉 Celebration Confetti** *(Phase 2.5)*: Lightweight Vanilla JS + CSS particle burst that fires on meaningful learning achievements — first-time lesson mastery, new badge unlock, Academy Certificate unlock (12/12), and flashcard session completion. A throttling guard (1500ms cooldown) prevents overlapping bursts when a single action triggers multiple achievements simultaneously. Purely visual: no XP, state, or session modifications. All DOM elements are self-cleaning (removed 2.8s after creation).

---

## 📚 All Existing Lessons

| ID | Scope | Title | Severity | Category | Weight | Description |
|---|---|---|---|---|---|---|
| **DF001** | Dockerfile | Pin your base image | High | Best Practices | 15 pts | Base image uses an unpinned tag or `:latest`. Pin specific version or digest. |
| **DF002** | Dockerfile | Run as a non-root user | Critical | Security | 20 pts | Container runs as root by default. Add a non-root user with `USER`. |
| **DF003** | Dockerfile | Add a HEALTHCHECK | Medium | Observability | 10 pts | Container lacks `HEALTHCHECK` instruction for container health detection. |
| **DF004** | Dockerfile | Copy files with `--chown` | Medium | Security | 8 pts | `COPY` without `--chown` leaves files owned by root. |
| **DF005** | Dockerfile | Document ports with `EXPOSE` | Low | Best Practices | 5 pts | Container lacks `EXPOSE` instruction to document listening ports. |
| **K8S001** | Kubernetes | Set resource requests & limits | High | Reliability | 18 pts | Containers missing `resources` limits/requests, risking node resource starvation. |
| **K8S002** | Kubernetes | Add a readiness probe | High | Reliability | 15 pts | Containers missing `readinessProbe`, leading to premature traffic routing. |
| **K8S003** | Kubernetes | Add a liveness probe | High | Reliability | 15 pts | Containers missing `livenessProbe`, preventing auto-restart of stuck containers. |
| **K8S004** | Kubernetes | Harden with a security context | Medium | Security | 12 pts | Missing `securityContext` on pod or containers, allowing default permissive execution. |
| **K8S005** | Kubernetes | Pin container image tags | Medium | Best Practices | 8 pts | Image uses `:latest` or unpinned tag in Kubernetes container specs. |
| **K8S900** | Kubernetes | Fix invalid YAML | Critical | Reliability | 50 pts | Manifest fails YAML syntax parsing (halts further K8s analysis). |
| **K8S902** | Kubernetes | Deploy a workload object | Low | Best Practices | 5 pts | Manifest lacks runnable workload objects (`Deployment`, `Pod`, `StatefulSet`, `DaemonSet`, `ReplicaSet`). |

---

## 🧠 Quiz Functionality & Progress/Mastery Behavior

- **Quiz Execution**:
  - When a user takes a quiz in either the inline finding card or the Academy detail view, option positions are randomized.
  - Answering correctly marks the rule as mastered in session memory (`academyProgress.mastered[id] = true`).
  - Correct answers immediately update the Dockerfile / Kubernetes progress bars in the Academy header.
- **Progress Persistence**:
  - **Session-Only Memory**: Progress state is maintained in-memory within JavaScript (`script.js`).
  - **Browser Refresh Behavior**: Refreshing or closing the browser tab resets all quiz scores and lesson mastery back to 0. (As noted in the codebase comments, persistence via server-side user accounts is reserved for future phases).

---

## 🏗️ Architecture Overview

```
                        +---------------------------------------+
                        |           Browser Frontend            |
                        | (index.html, script.js, style.css)    |
                        +-------------------+-------------------+
                                            |
                                            | HTTP REST API (Fetch)
                                            v
                        +-------------------+-------------------+
                        |             Flask Backend             |
                        |               (app.py)                |
                        +---------+-------------------+---------+
                                  |                   |
                     +------------+--+             +--+------------+
                     | Dockerfile    |             | PyYAML K8s    |
                     | Regex Engine  |             | Parser Engine |
                     +---------------+             +---------------+
```

### Stack & Components:
- **Backend Framework**: Python 3 with Flask (`app.py`), `flask-cors` for CORS headers, `pyyaml` for Kubernetes manifest parsing, and `fpdf2` for PDF document generation.
- **Frontend Framework**: Vanilla JavaScript (`script.js`, `lesson.js`), Vanilla HTML5 (`index.html`), and custom CSS3 (`style.css`). No node modules or frontend build tools required.
- **Design System**: Dark-themed UI (`#05080f`) with glassmorphism backdrop blurs, CSS custom properties (`--brand-1`, `--glass-bg`, etc.), responsive flex/grid layouts, SVG gauge animations, skeleton loading indicators, and CSS keyframe animations.

---

## 📁 Project Structure

```
devops-special/
├── app.py          # Flask backend server containing analysis logic & API routes
├── index.html      # Single-page web interface markup (Analyzer & Academy tabs)
├── lesson.js       # Curriculum database containing 12 DevOps lessons & quiz definitions
├── script.js       # Frontend UI handler, API client, search/filter, quiz logic & Copy-Fix
├── style.css       # Complete design system, glassmorphism styles, animations & toast/copy UI
└── README.md       # Project documentation
```

---

## 🔌 API Routes & Endpoints

| Method | Endpoint | Description | Payload Example | Response |
|---|---|---|---|---|
| `POST` | `/analyze` | Scans input files & returns readiness metrics | `{"dockerfile": "...", "k8s": "...", "self_reported": {"rollback_strategy_documented": true, "documentation_updated": false}}` | JSON score, status, findings, governance, roadmap |
| `POST` | `/export-pdf` | Generates a downloadable PDF report | `{"score": 85, "status": "Ready for Deployment", "findings": [...]}` | PDF binary blob (`application/pdf`) or plain text fallback |
| `GET` | `/` | Serves `index.html` web application | None | HTML page |
| `GET` | `/style.css` | Serves application stylesheet | None | CSS stylesheet |
| `GET` | `/script.js` | Serves application JavaScript | None | JS script |

---

## ⚙️ Installation & Setup

### Prerequisites
- **Python 3.8+** installed on your system.
- `pip` package manager.

### 1. Install Dependencies
Run the following command to install required Python libraries:
```bash
pip install flask flask-cors fpdf2 pyyaml
```

### 2. Start the Backend Server
Run the Flask backend application:
```bash
python app.py
```
*The server will start at `http://127.0.0.1:5000`.*

### 3. Access the Application
Open your web browser and navigate to:
```
http://127.0.0.1:5000/
```

---

## 🛠️ Important Commands

| Task | Command |
|---|---|
| Run Application Server | `python app.py` |
| Install Python Dependencies | `pip install flask flask-cors fpdf2 pyyaml` |
| Test Backend REST API (`/analyze`) | `curl -X POST http://127.0.0.1:5000/analyze -H "Content-Type: application/json" -d "{\"dockerfile\":\"FROM python:latest\"}"` |

---

## 🏆 Phase 2.5 — Badges / Achievements

A compact achievement system layered on top of the existing Academy XP and mastery state. All 8 badges are session-only and reset on page refresh.

### All Badges

| Badge ID | Icon | Name | Unlock Condition |
|---|---|---|---|
| `FIRST_LESSON` | 🎓 | First Lesson | Open your first Academy lesson |
| `DOCKER_BEGINNER` | 🐳 | Docker Beginner | Master at least 1 Dockerfile lesson |
| `KUBERNETES_BEGINNER` | ☸️ | Kubernetes Beginner | Master at least 1 Kubernetes lesson |
| `QUIZ_MASTER` | 🧠 | Quiz Master | Pass quizzes for 5 different lessons |
| `DOCKER_MASTER` | 🏆 | Docker Master | Master all 5 Dockerfile lessons (DF001–DF005) |
| `KUBERNETES_MASTER` | 🚀 | Kubernetes Master | Master all 7 Kubernetes lessons (K8S001–K8S005, K8S900, K8S902) |
| `ACADEMY_COMPLETE` | 🌟 | Academy Complete | Master all 12 Academy lessons |
| `SECURITY_EXPLORER` | 🔐 | Security Explorer | Earn 100 total XP |

### Duplicate-Award Protection

`badgeState.unlocked` is a plain object keyed by badge ID. `checkBadges()` skips any badge whose key is already `true`. Each badge can therefore only fire its unlock toast once per session.

### When `checkBadges()` Runs

- After `openLesson()` awards lesson-view XP (catches `FIRST_LESSON`, `SECURITY_EXPLORER`).
- After quiz `onCorrect` callback completes `updateProgressBars()` (catches all mastery badges, `QUIZ_MASTER`, `SECURITY_EXPLORER`).

### Badge Display

A **`#badgesPanel`** glassmorphic card sits between the XP display and the filter bar. It contains a responsive auto-fill grid (`minmax(200px, 1fr)`) of badge cards:
- **Locked**: dimmed to 50% opacity, icon desaturated, description shows the unlock requirement.
- **Unlocked**: green-tinted border + background glow, description replaced by "✅ Unlocked".

`renderBadges()` is called at page boot (so all locked badges are visible immediately) and again whenever a new badge unlocks.

### Notification

When a badge unlocks, `showToast("🏆 Badge unlocked: <name>", "badge")` fires — a purple-tinted variant of the existing toast system.

### Technical Implementation
- **`index.html`**: `<div id="badgesPanel">` containing `<div id="badgesList">` inserted between `#xpDisplay` and `.lesson-filters`.
- **`style.css`**: `.toast-badge` (purple variant), `.badges-panel`, `.badges-heading`, `.badges-list`, `.badge-item`, `.badge-locked`, `.badge-unlocked`, `.badge-icon`, `.badge-info`, `.badge-name`, `.badge-desc`.
- **`script.js`**:
  - `BADGES` — centralized array of 8 badge definition objects (`{ id, icon, name, desc, check }`).
  - `badgeState` — session state object (`{ unlocked: {} }`).
  - `checkBadges()` — iterates `BADGES`, evaluates `badge.check()`, sets `badgeState.unlocked[id]`, fires toast; calls `renderBadges()` if any badge newly unlocked.
  - `renderBadges()` — replaces `#badgesList` innerHTML with all 8 badge cards, styled by unlock state.
  - `checkBadges()` called after lesson-view `awardXP` in `openLesson()`.
  - `checkBadges()` + `renderBadges()` called after `updateProgressBars()` in quiz `onCorrect`.
  - `renderBadges()` called at page boot.

---

## 🃏 Phase 2.5 — Flashcards Mode

An interactive learning mode allowing users to study containerization and orchestration rules using digital flashcards.

### How it works
- **Launch**: Click the **"🃰 Flashcards"** button inside the Badges panel.
- **Flipping**: Click the card (or press `Enter`/`Space`) to rotate the card in 3D and reveal the back.
- **Navigation**: Use the **"Prev"** and **"Next"** buttons to navigate through the deck. A progress bar and counter (`Card X of Y`) track progression.
- **Shuffle**: Click **"🔀 Shuffle"** at any time to randomize card order without mutating the original `LESSONS` data structure.
- **Categories**: Filter the active deck at any time using the dropdown selector ("All lessons", "Dockerfile", or "Kubernetes").
- **Completion**: When the last card is completed, a clean completion panel triggers showing the user's reward, with options to replay or shuffle.

### Session-Only XP integration
- Completing a flashcard session awards **+10 XP**.
- XP is duplicate-guarded: a unique session key (`fc_session_<timestamp>`) is generated when the session starts, ensuring the +10 XP is only awarded once per completed session.
- Awarding XP automatically triggers a badge check.

### Technical Implementation
- **`index.html`**: Added `#flashcardsView` structure, containing toolbar, selectors, progress bar, `fc-card` (front/back faces), navigation buttons, and completion screen.
- **`style.css`**: Added comprehensive styles for flashcards layout, toolbar, buttons, progress track, 3D flip card transform (`perspective`, `transform-style: preserve-3d`, `backface-visibility: hidden`, `.flipped`), source tags, faces, and completion card.
- **`script.js`**:
  - Centralized `fcState` object tracking deck array, current index, flipped boolean, session key, and xpAwarded flag.
  - `buildDeck(category, shuffle)`: Creates a shallow copy of lessons, applies Fisher-Yates shuffle if requested, and returns the active deck.
  - `showCard()`: Sets text elements, updates counter/progress-fill, and manages visibility.
  - `flipCard()`: Toggles the `.flipped` class.
  - `showCompletion()`: Hides deck elements, reveals completion screen, awards +10 XP via `awardXP()` with a unique key, and runs badge checks.
  - `openFlashcards(shuffle)` / `closeFlashcards()`: Handles view transition and scrolls the interface smoothly.
- Form selector change listeners and navigation click handlers wired cleanly.

---

## 🎓 Phase 2.5 — Academy Certificate

An Academy completion certificate awarded to users who successfully master all 12 lessons.

### How it works
- **Eligibility**: Master all 12 lessons (5 Dockerfile, 7 Kubernetes) by passing their respective quizzes. Progress is tracked via the existing `academyProgress.mastered` state.
- **Availability UI**: A new card panel is added to the Academy tab.
  - *Locked state*: Displays progress (e.g. `0 / 12 lessons mastered`) and a locked indicator `🔒 Master all 12 lessons to unlock your certificate.`
  - *Unlocked state*: Congratulates the user `🏆 Congratulations! You completed the DevMate Academy.` and displays a `🎓 View Certificate` button.
- **Certificate Content**: Displays DevMate branding, completion statement, completion date, stable session ID, and a local verification hash.
- **Editable Name**: The recipient name is marked as `contenteditable="true"`, allowing users to directly click and edit their name before saving.
- **Preservation & PDF**: A **"Print / Save PDF"** button fires the browser's native `window.print()` functionality. The styling overrides (`@media print`) format the layout, hide background controls, and present a clean print document.
- **Verification Widget**: An entry point at the bottom of the certificate panel allows verifying certificate IDs generated during the session.

### Certificate Verification — Exact Behavior

The verification widget compares the entered Certificate ID against `academyCertificate.id` in session memory using a **strict exact-match** (after `trim()`). No substring, prefix, or case-insensitive matching is used.

| Scenario | Result shown | CSS class |
|---|---|---|
| **Empty input** | ⚠️ validation message prompting the user to enter an ID | `.verify-result.warning` |
| **Valid ID** (matches current session cert exactly) | ✅ `Certificate Verified!` with recipient name, cert ID, verification code, completion date, and 12/12 mastery status | `.verify-result.success` |
| **Invalid or expired ID** (cert is unlocked but entered ID doesn't match) | ❌ `Verification Failed / Invalid ID` with the entered ID quoted and a session-limitation notice | `.verify-result.error` |
| **No certificate in session** (cert not yet unlocked or page was refreshed) | 🔒 `No Active Certificate in Session` explaining that all 12 lessons must be mastered, plus a session-only system notice | `.verify-result.warning` |

#### Session Expiry Behavior
Certificate IDs are strictly session-scoped — they live only in JavaScript memory (`let academyCertificate`). Refreshing the page or closing the tab destroys the ID. Because no persistent registry exists, an ID from a previous browser session cannot be verified after refresh and will always produce the `No Active Certificate in Session` or `Verification Failed` result, with the limitation explicitly communicated to the user.

#### UX Details
- **Enter key**: Pressing `Enter` inside the verify input triggers verification immediately — no need to click the Verify button.
- **Auto-clear on retype**: When the user starts typing a new ID, any previously displayed verification result is automatically hidden, preventing stale success/failure messages from being visible while a new query is in progress.
- **Clear button**: Each result state exposes a `Clear / Try Another ID` button that resets both the input and the result panel.
- **Recipient name sync**: When a certificate is verified as valid, the displayed recipient name is read from the live `contenteditable` element (if the certificate page is currently open) or falls back to `academyCertificate.recipientName` — always reflecting the current session name without requiring persistent storage.

### Session-Only Limitation
Certificates and Certificate IDs (`DM-CERT-XXXX-XXXX`) are held strictly in volatile browser session memory. A page reload or browser restart clears the active certificate and resets progress. Because DevMate operates without a database or authentication backend (until Phase 3), certificates cannot be verified across sessions or via a public server API. Explicit notice of this limitation is displayed in the verification UI.

### Technical Implementation
- **`index.html`**:
  - Added `#certificatePanel` containing the progress tracker, congratulations slot, view button, and verification widget.
  - Added `#certificateView` containing the `#certificatePaper` container and print buttons.
- **`style.css`**: Added `.certificate-panel` layout, `.verify-input`, `.verify-btn`, `.verify-result` (with `.success`, `.error`, `.warning` variants), `.verify-success-box`, `.verify-error-box`, `.verify-warning-box`, `.verify-session-notice`, `.verify-clear-btn`, `.font-mono`, `.certificate-paper` double-border gold design, `.cert-recipient` custom focus dashed line, `.cert-meta-row` layout, and `@media print` stylesheet rules.
- **`script.js`**:
  - `academyCertificate` state tracking generated Cert ID, recipient name, issue date, and lock toast status.
  - `generateVerificationHash(certId)` helper generating verification strings.
  - `checkCertificateStatus()` updating progress tracks, generating IDs, and wiring "View Certificate" actions.
  - `openCertificate()` isolating the certificate paper by hiding normal layout panels.
  - `closeCertificate()` restoring the Academy tab.
  - `verifyCertificate()` — strict exact-match (`===`) against session cert ID after `trim()`; covers all four states (empty, valid, invalid/expired, no-session cert).
  - `clearCertVerification()` — resets input value, hides and clears result element; exposed as `window.clearCertVerification` for inline `onclick` calls.
  - Enter-key listener on `#verifyCertIdInput` triggers `verifyCertificate()`.
  - Input event listener on `#verifyCertIdInput` auto-clears the result panel when the user types a new ID.
  - Event listeners for print, back, and verify buttons.

---

## 📦 Phase 2.5 — Docker Image Analysis

An image analysis mode added to DevMate allowing users to inspect locally available Docker images for configuration metadata, security risks, and optional CVE vulnerabilities via Trivy.

### Purpose
Allows developers and DevOps engineers to analyze built container images locally before pushing to registries or deploying to clusters.

### How to Use
1. Open the **📦 Image** tab in the main navigation.
2. Enter a local Docker image name and tag (e.g. `nginx:1.27`, `python:3.12-slim`, `myapp:latest`).
3. Click **Analyze Image** or press `Enter`.
4. Review the extracted metadata, security findings, and (if installed) Trivy vulnerability scan results.

### Requirements & Behavior
- **Docker Requirement**: Uses safe local CLI execution (`docker inspect --type=image <ref>`). Docker must be installed and the daemon must be running.
- **Image Availability**: The target image must exist locally in Docker's image store. If absent, DevMate displays a clear error instructing the user to run `docker pull <name>`.
- **Optional Trivy Integration**: If `trivy` is found on PATH, DevMate automatically runs a JSON vulnerability scan and displays CVE counts broken down by severity (Critical, High, Medium, Low, Unknown) along with a detailed vulnerability list. If Trivy is not installed, the feature continues to work via Docker inspection and displays an informational notice explaining that Trivy CVE scanning is unavailable.
- **Safety & Error Handling**:
  - Image inputs are strictly validated against a safe regex pattern (`[a-zA-Z0-9_.\-/:@]`) before execution to prevent command injection.
  - Commands execute with timeouts via `subprocess.run`.
  - Backend returns structured JSON error responses with status codes (`503` for Docker unavailable, `404` for image missing, `400` for invalid ref, `500` for inspect failures).
  - Flask backend never crashes on Docker or Trivy execution failures.

### Displayed Information
- **Metadata Card**: Image ID, Platform (Architecture/OS), Created Date, Size, Layer Count, User, Working Directory, Exposed Ports, Entrypoint, CMD, and expandable Environment Variables (with sensitive key values like passwords/tokens automatically masked as `***`).
- **Security Findings**: Image-level configuration risks tagged with `IMG` IDs using existing severity chips (`High`, `Medium`, `Low`):
  - `IMG001` (High): Running as root user (`User` not set or `root`).
  - `IMG002` (Medium): Unpinned `:latest` tag.
  - `IMG003` (Low): Excessive exposed ports (>3 ports).
  - `IMG004` (Low): Missing `WORKDIR` configuration.
  - `IMG005` (Low): Missing both `ENTRYPOINT` and `CMD`.
- **Trivy Vulnerabilities**: Severity count pills (Critical, High, Medium, Low, Unknown), package name, installed version, fixed version, CVE ID link, and vulnerability title.

---

## 📋 Changelog

## ✨ Phase 2.5 — Copy-Fix Feature

Added one-click clipboard copy of recommended fixes and code examples, available in both the **Analyzer** and **Academy** views.

### How it works

| Location | Button | Content copied | Toast message |
|---|---|---|---|
| Analyzer — expanded finding card | **📋 Copy Fix** | `best_practice` fix text | "📋 Fix copied to clipboard." |
| Analyzer — expanded finding card | **📋 Copy Code** | Full `example` code block | "📋 Example code copied to clipboard." |
| Academy — lesson detail view | **📋 Copy Fix** | `best_practice` fix text | "📋 Fix copied to clipboard." |
| Academy — lesson detail view | **📋 Copy Code** | Full bad-vs-good `example` | "📋 Example code copied to clipboard." |

### Technical implementation
- **`index.html`**: Added `<div id="toastContainer" class="toast-container" aria-live="polite">` before `</body>` to host floating notifications.
- **`style.css`**: Added `.copy-btn`, `.code-wrapper`, `.code-copy-btn`, `.learning-fix-header`, `.learning-fix-body`, `.toast-container`, `.toast`, `.toast-success`, `.toast-error` rules.
- **`script.js`**:
  - `escapeAttr(str)` — safely embeds multi-line text in HTML `data-copy` attributes.
  - `showToast(message, type)` — appends an animated toast, shows it via `requestAnimationFrame`, auto-removes after 2.5s.
  - `copyToClipboard(text, successMessage)` — async function using `navigator.clipboard.writeText` with `document.execCommand('copy')` fallback; shows success or error toast.
  - Global delegated `click` listener on `document` targeting `.copy-btn` — reads `data-copy` and `data-toast`, calls `copyToClipboard`, and temporarily shows "✅ Copied!" state on the button for 1.8s.
  - `renderLearningInline()` updated — fix block and code block now contain copy buttons.
  - `openLesson()` updated — same copy buttons injected into lesson detail view.

### Works for
- All **5 Dockerfile rules** (`DF001`–`DF005`) — fix snippets and code examples.
- All **7 Kubernetes rules** (`K8S001`–`K8S005`, `K8S900`, `K8S902`) — fix snippets and YAML examples.

### Clipboard failure handling
If `navigator.clipboard` is unavailable (e.g. non-HTTPS context) and the `execCommand` fallback also fails, a red toast **"❌ Unable to copy to clipboard."** is displayed. No silent failures.

---

## 🔎 Phase 2.5 — Academy Search

Added a real-time search input in the Academy filter bar that narrows the visible lesson grid as you type.

### How it works

- The **"🔎 Search lessons..."** input sits at the left of the existing filter bar.
- As the user types (debounced 180ms), `activeSearch` is updated and `renderLessonGrid()` is called.
- The search is applied **after** all existing filters** (category, mastered, difficulty) — results must satisfy all active constraints simultaneously.
- When no lessons match the combined filter + search, a **"🔎 No lessons match your search or filter."** empty-state paragraph appears below the grid.

### Searchable fields

| Field | Example match |
|---|---|
| Lesson ID | `DF002`, `K8S001` |
| Title | `non-root`, `liveness` |
| Description | `COPY without --chown` |
| Scope (`source`) | `dockerfile`, `k8s` |
| Category | `Security`, `Reliability` |
| Severity | `Critical`, `High` |
| Difficulty | `Beginner`, `Expert` |
| Plain explanation | `attacker`, `runaway pod` |
| Why it matters text | `OOM`, `blast radius` |

### Example combinations

| Filter selection | Search term | Result |
|---|---|---|
| All | `probe` | Shows K8S002 + K8S003 |
| Kubernetes | `security` | Shows K8S004 |
| Dockerfile | `root` | Shows DF002 |
| Mastered | `image` | Mastered lessons about images only |
| Intermediate | `copy` | Intermediate Dockerfile lessons mentioning `copy` |

### Technical implementation
- **`index.html`**: `<input id="academySearch">` added as first child of `.lesson-filters`. `<p id="lessonEmptyState">` added below `#lessonGrid`.
- **`style.css`**: `.academy-search` rule added after `.lesson-filters` — pill-shaped, dark glassmorphic, grows flexibly up to 340px, matches existing input focus style.
- **`script.js`**:
  - `let activeSearch = ""` — new module-level state variable alongside `activeFilter` and `activeDifficulty`.
  - `academySearchInput.addEventListener("input", debounce(..., 180))` — wires the input; reuses the existing `debounce()` helper.
  - `const lessonEmptyState = document.getElementById("lessonEmptyState")` — cached alongside `lessonGrid`.
  - `renderLessonGrid()` — search predicate added as the last step of the existing `.filter()` chain; builds a lowercase `haystack` string from the fields listed above and tests `haystack.includes(activeSearch)`.
  - `totalRendered` counter incremented per card; `lessonEmptyState` toggled hidden/visible based on whether `totalRendered > 0`.

---

## ⭐ Phase 2.5 — XP System

A lightweight, session-based experience point (XP) system layered on top of the existing Academy learning flow.

### XP Values

| Action | XP | When it fires |
|---|---|---|
| **Lesson started** | +25 XP | First time the detail view for a given lesson is opened |
| **Quiz passed** | +15 XP | First time a quiz is answered correctly for a given lesson |
| **Lesson mastered** | +10 XP | First time a lesson transitions from unmastered → mastered |

Maximum possible XP per lesson: **50 XP** (25 + 15 + 10). Total maximum for all 12 lessons: **600 XP**.

### Duplicate-Award Protection

`awardXP(amount, actionKey, message)` checks `academyXP.actions[actionKey]` before awarding. Each action has a unique key:
- `lesson_view_<id>` — e.g. `lesson_view_DF001`
- `quiz_pass_<id>` — e.g. `quiz_pass_K8S003`
- `mastery_<id>` — e.g. `mastery_K8S001`

Once a key is set to `true`, the function returns immediately without adding XP or showing a toast. This means:
- Reopening a lesson never awards XP again.
- Retrying a quiz after passing never awards quiz XP again.
- The mastery XP is only awarded on the **first** pass, not on repeat opens of an already-mastered lesson.

### Actions that do NOT award XP
- Searching or filtering the lesson grid.
- Opening or closing inline finding cards in the Analyzer.
- Clicking filter buttons, difficulty dropdowns, or any other UI controls.
- Retrying a quiz after a **wrong** answer.

### Session-Only Behavior
`academyXP` is a plain `let` variable in `script.js`, initialized to `{ total: 0, actions: {} }` on page load. Refreshing resets it to zero — the same lifecycle as `academyProgress` and all other Academy state.

### XP Display
The current XP total is shown as a pill badge — **⭐ XP: 0** — inside the Academy hero section, below the Dockerfile/Kubernetes mastery progress bars. When XP is awarded:
1. The counter number updates immediately.
2. A `xp-bump` CSS animation pops the number (scale up → scale down → settle).
3. A **golden toast** notification slides up from the bottom-right corner (e.g. "⭐ +25 XP — Lesson started!") using the existing toast system.

### Technical Implementation
- **`index.html`**: `<div id="xpDisplay" class="xp-display">⭐ XP: <span id="xpValue">0</span></div>` added inside `.academy-hero` below the progress bars.
- **`style.css`**: `.toast-xp` variant (golden amber), `.xp-display` badge, `#xpValue.xp-bump` animation rule, `@keyframes xp-bump`.
- **`script.js`**:
  - `XP_VALUES` — centralized constant object (`lessonView: 25`, `quizPass: 15`, `mastery: 10`).
  - `academyXP` — session state object (`{ total: 0, actions: {} }`).
  - `awardXP(amount, actionKey, message)` — duplicate-guarded helper; updates DOM, triggers CSS animation, calls `showToast(..., "xp")`.
  - `openLesson(id)` — calls `awardXP(XP_VALUES.lessonView, "lesson_view_"+id, ...)` before rendering the lesson.
  - Quiz `onCorrect` callback — calls `awardXP(XP_VALUES.quizPass, ...)` then checks `alreadyMastered` flag to conditionally call `awardXP(XP_VALUES.mastery, ...)`.

---


### Phase 2.5 — Copy-Fix
- Added `📋 Copy Fix` and `📋 Copy Code` buttons to Analyzer finding cards (inline expanded view).
- Added `📋 Copy Fix` and `📋 Copy Code` buttons to Academy lesson detail view.
- Added animated toast notification system (bottom-right, glassmorphic, success/error variants).
- Added `escapeAttr()` helper for safe multi-line text embedding in HTML attributes.
- Added `copyToClipboard()` async helper with `navigator.clipboard` API + `execCommand` fallback.
- Added `showToast()` helper with enter/exit CSS transitions.
- Added global delegated `click` listener for all `.copy-btn` elements.
- `learning-fix` container refactored to use `.learning-fix-header` flex row and `.learning-fix-body` for text display.
- Code example blocks wrapped in `.code-wrapper` with absolutely-positioned `📋 Copy Code` overlay button.
- `toastContainer` div added to `index.html`.
- Toast + copy button CSS appended to `style.css`.

### Phase 2.5 — Badges / Achievements
- Added `BADGES` array with 8 centralized badge definitions (`{ id, icon, name, desc, check }`) (`script.js`).
- Added `badgeState` session object (`{ unlocked: {} }`) — resets on refresh (`script.js`).
- Added `checkBadges()` function with per-badge duplicate-guard; fires `showToast(..., "badge")` on new unlocks (`script.js`).
- Added `renderBadges()` function; populates `#badgesList` with locked/unlocked badge cards (`script.js`).
- Hooked `checkBadges()` after lesson-view `awardXP` in `openLesson()` (`script.js`).
- Hooked `checkBadges()` + `renderBadges()` after `updateProgressBars()` in quiz `onCorrect` callback (`script.js`).
- Added `renderBadges()` to page boot sequence (`script.js`).
- Added `<div id="badgesPanel">` + `<div id="badgesList">` between `#xpDisplay` and `.lesson-filters` (`index.html`).
- Added `.toast-badge`, `.badges-panel`, `.badges-heading`, `.badges-list`, `.badge-item`, `.badge-locked`, `.badge-unlocked`, `.badge-icon`, `.badge-info`, `.badge-name`, `.badge-desc` CSS (`style.css`).

### Phase 2.5 — XP System
- Added `XP_VALUES` constant object with centralized XP values: lesson-view (+25), quiz-pass (+15), mastery (+10) (`script.js`).
- Added `academyXP` session state object (`{ total: 0, actions: {} }`) (`script.js`).
- Added `awardXP(amount, actionKey, message)` helper with duplicate-award guard (`script.js`).
- Hooked `awardXP` into `openLesson()` for lesson-view XP (once per lesson) (`script.js`).
- Hooked `awardXP` into quiz `onCorrect` callback for quiz-pass XP (once per lesson) (`script.js`).
- Hooked `awardXP` into quiz `onCorrect` callback for mastery XP, guarded by `alreadyMastered` flag (once per lesson) (`script.js`).
- Added `<div id="xpDisplay">` badge to Academy hero section (`index.html`).
- Added `.toast-xp`, `.xp-display`, `#xpValue.xp-bump`, `@keyframes xp-bump` CSS (`style.css`).

### Phase 2.5 — Academy Search
- Added `🔎 Search lessons...` pill input to the Academy filter bar (`index.html`).
- Added `lessonEmptyState` paragraph shown when search + filter yields no results (`index.html`).
- Added `let activeSearch = ""` state variable alongside existing `activeFilter` / `activeDifficulty` (`script.js`).
- Wired `input` event on `#academySearch` using the existing `debounce()` helper (180ms delay) (`script.js`).
- Extended the `.filter()` predicate in `renderLessonGrid()` with a lowercase haystack search across ID, title, description, source, category, severity, difficulty, plain explanation, and why-it-matters text (`script.js`).
- Added `totalRendered` counter; `lessonEmptyState` toggled based on whether any cards rendered (`script.js`).
- Added `.academy-search` CSS rule — pill shape, dark glassmorphic, flexible width, matching existing focus/placeholder style (`style.css`).

### Phase 2.5 — Flashcards
- Added `#flashcardsView` container with categories select list, progress indicators, 3D flip card card slot, navigation buttons, and completion panel to `index.html`.
- Added dynamic flashcard study engine (`fcState`, `buildDeck`, `showCard`, `flipCard`, `showCompletion`, `openFlashcards`, `closeFlashcards`) to `script.js`.
- Implemented Fisher-Yates shuffle on deck copies to support card randomization without mutating original data.
- Hooked +10 XP completion award (`XP_FC_SESSION`) to `awardXP()` using a unique session key, integrating seamlessly with the badge checks and progress system.
- Added rich CSS animations and responsive styles for toolbars, 3D rotations, perspective, faces, progress tracks, and completion card to `style.css`.
- Added the "🃰 Flashcards" launch button inside the badges panel header.

### Phase 2.5 — Academy Certificate
- Added `#certificatePanel` (progress indicator, locked/unlocked states, verification box) and `#certificateView` (printable document template) to `index.html`.
- Implemented dynamic eligibility validation checking if all 12 rules are mastered (`script.js`).
- Implemented session-stable unique Certificate ID generation (`DM-CERT-XXXX-XXXX`) and verification hashing algorithms (`script.js`).
- Integrated `contenteditable` recipient name editing, printing actions (`window.print()`), and modal closing navigations (`script.js`).
- Integrated verification checker validating certificate IDs against session memory (`script.js`).
- Added double gold border certificate sheets, layout styles, and `@media print` print-to-PDF rules (`style.css`).
- Fixed view stacking in `openLesson()` to ensure `#flashcardsView` and `#certificateView` are hidden when launching a lesson.
- Synchronized inline Analyzer quizzes in `renderLearningInline()` with Academy mastery, XP awards (`quizPass`/`mastery`), badge checks, and certificate status updates.
- Extended Dockerfile rule `DF001` in `app.py` to inspect all `FROM` statements in multi-stage builds while tracking local stage aliases and `scratch` base images.
- Corrected Kubernetes rule `K8S004` in `app.py` to recognize container-level and initContainer-level `securityContext` definitions, eliminating false positive warnings.
- Fixed Flashcard completion XP in `script.js` to use a session-level duplicate-protected action key (`flashcards_completion_session`), preventing unlimited +10 XP farming on deck restarts while allowing unlimited deck reviews.
- Completed Phase 2.5 Change 7: Certificate Verification in `script.js`, `index.html`, and `style.css` with dynamic recipient name sync, verified/invalid/unlocked state handling, session limitation notices, `Clear / Try Another ID` action, and 100% hash/ID consistency.

### Phase 2.5 — Celebration Confetti (Change 8)
- Implemented `celebrateConfetti()` in `script.js`: a self-contained Vanilla JS particle burst function that generates 32 randomised coloured elements (circles and rectangles), animates them full-screen with staggered delays and durations, then removes the container from the DOM after 2.8s via `setTimeout` cleanup.
- Added `.confetti-container`, `.confetti-piece`, and `@keyframes confettiFall` to `style.css` using `position: fixed`, `pointer-events: none`, and `z-index: 9999` to avoid UI interference.
- Throttling guard (`lastConfettiTime` timestamp, 1500ms cooldown) prevents duplicate/overlapping bursts when a single user action triggers multiple achievements simultaneously (e.g. 12th lesson mastery unlocking a badge and a certificate).
- Connected `celebrateConfetti()` to exactly four meaningful achievement triggers:
  1. **First-time lesson mastery** — in `openLesson()` `wireQuiz` `onCorrect` callback when `!alreadyMastered`.
  2. **First-time lesson mastery (inline)** — in `renderLearningInline()` `wireQuiz` `onCorrect` callback when `!alreadyMastered`.
  3. **New badge unlock** — in `checkBadges()` when a badge transitions from locked to unlocked.
  4. **Academy Certificate unlock** — in `checkCertificateStatus()` when `!academyCertificate.unlockedToastShown`.
  5. **Flashcard session completion** — in `showCompletion()` after `awardXP` and `checkBadges`.
- Confetti is purely visual — no XP is awarded, no mastery state is changed, no badge or certificate state is modified, no existing toast behavior is altered.

### Phase 2.5 — Certificate Verification Loop (Change 9)
- Completed the certificate verification feature as a full user-facing loop:
  - **Enter key support**: Pressing `Enter` in `#verifyCertIdInput` now triggers `verifyCertificate()` directly — no click required.
  - **Auto-clear on retype**: An `input` event listener on `#verifyCertIdInput` hides and empties `#verifyCertResult` the instant the user types a new character, so stale results never remain visible while a new ID is being entered.
  - **Strict exact-match verification**: The entered ID is compared against `academyCertificate.id` using `===` after `trim()` — no substring, prefix, or loose matching is possible.
  - **Four complete states**: empty-input (warning), valid (success with name/ID/hash/date/status), invalid-or-expired (error with session notice), no-session-cert (warning with progress CTA).
  - **Session-expiry communication**: Post-refresh verification attempts correctly land in the `No Active Certificate in Session` state (or `Verification Failed` if a cert was unlocked but a different ID was entered), with the session-only limitation explicitly explained in the UI.
  - **Recipient name consistency**: `verifyCertificate()` reads the live `contenteditable` element if the cert view is open, falls back to `academyCertificate.recipientName` otherwise — no persistent storage introduced.
  - **`.font-mono` CSS**: Added missing utility class to `style.css` so Certificate ID and verification hash `<code>` elements in the result panel render in monospace correctly.
- No new HTML elements added; no existing element IDs, classes, or structure modified.

### Phase 2.5 — Docker Image Analysis (Change 10)
- Added Docker Image Analysis mode to DevMate:
  - **Backend (`app.py`)**:
    - Added `/inspect-image` POST endpoint.
    - Input sanitization via `validate_image_ref()` regex validation.
    - Safe `docker inspect` execution returning image ID, repo tags, platform, size, layers, user, workdir, ports, entrypoint, cmd, and secret-masked environment variables.
    - Rule-based security analysis (`IMG001`–`IMG005`) for root user, latest tag, exposed ports, workdir, and entrypoint/cmd.
    - Optional Trivy integration: auto-detects `trivy` binary on PATH, parses JSON CVE results, and returns severity counts + vulnerability list.
    - Graceful error responses (503 Docker unavailable, 404 image missing, 400 invalid ref) ensuring the Flask server never crashes.
  - **Frontend (`index.html`, `script.js`, `style.css`)**:
    - Added 📦 Image tab to topbar navigation bar and `tabPanels` state object.
    - Input row with image reference input, Analyze Image button, loading spinner, and error display.
    - Skeleton loader during analysis fetch.
    - Metadata card grid, environment variables accordion, security findings list, and Trivy CVE summary section.
    - Enter key support for input submission.
    - Styling aligned with existing visual language and glassmorphic aesthetic.

### Initial Release (Phase 2)
- Dockerfile analyzer with 5 rules (`DF001`–`DF005`).
- Kubernetes manifest analyzer with 7 rules (`K8S001`–`K8S005`, `K8S900`, `K8S902`).
- Readiness scoring engine (0–100) with category breakdowns.
- Governance checklist (auto-detected + self-attested).
- Improvement roadmap.
- Findings filter/search.
- Multi-format export (PDF, JSON, CSV).
- Academy with 12 lessons, quizzes, and progress tracking.
- Beginner Mode toggle.
- Inline learning panel bridged to Academy lessons.

---

## ⚠️ Known Limitations (Verified from Code)

1. **Session-Only Progress**: Academy mastery and quiz progress are kept in volatile JavaScript memory (`let academyProgress`). Refreshing the browser resets progress to 0/12.
2. **Regex-Based Dockerfile Parser**: Dockerfile checks rely on Python regex matching (`re.match`/`re.search`) rather than AST parsing (e.g. Hadolint). Complex multi-line instructions might bypass rules.
3. **Hardcoded API Base URL**: `script.js` directly references `http://127.0.0.1:5000/analyze` and `http://127.0.0.1:5000/export-pdf`.
4. **PDF Fallback**: PDF export requires the `fpdf2` library (`from fpdf import FPDF`). If uninstalled, the backend falls back to returning a plain text file (`devmate-report.txt`).
5. **Fixed Rule Set**: Exactly 12 analyzer rules are currently supported (`DF001`–`DF005` and `K8S001`–`K8S005`, `K8S900`, `K8S902`).
6. **No Persistence or User Accounts**: No database or user authentication is implemented in the repository.
7. **No Automated Test Suite**: The codebase does not include unit or integration test suites (`pytest`, `unittest`, etc.).
8. **Clipboard over HTTP**: `navigator.clipboard.writeText` requires a secure context (HTTPS or `localhost`). DevMate's development server runs on `localhost`, so this works. If served from non-HTTPS, the `execCommand` fallback is used.
