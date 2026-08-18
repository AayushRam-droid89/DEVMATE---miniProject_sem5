from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
import re
import yaml
import subprocess
import json as _json
import shutil

app = Flask(__name__)
CORS(app)

SELF_ATTESTED_BONUS = 2


def strip_comments(line):
    return line.split("#")[0].rstrip()


def is_valid_yaml(content):
    try:
        yaml.safe_load(content)
        return True
    except yaml.YAMLError:
        return False


def analyze_dockerfile(content):
    findings = []
    lines = content.split("\n")

    stage_aliases = set()
    for i, line in enumerate(lines):
        m = re.match(r"^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+as\s+(\S+))?\s*$", line, re.IGNORECASE)
        if m:
            img = m.group(1)
            alias = m.group(2)
            img_lower = img.lower()
            if img_lower != "scratch" and img_lower not in stage_aliases:
                if ":" not in img or img.endswith(":latest"):
                    findings.append({
                        "id": "DF001",
                        "source": "dockerfile",
                        "severity": "High",
                        "category": "Best Practices",
                        "description": f"Base image '{img}' uses an unpinned tag (or ':latest'). Use a specific version tag for reproducible builds.",
                        "effective_weight": 15,
                        "learning": {
                            "plain": "Using 'latest' means your image changes whenever the maintainer publishes a new version. Your build today might not work tomorrow.",
                            "technical": "Pinning base image versions ensures deterministic builds. Use a digest (SHA256) for maximum reproducibility.",
                            "why": "Unpinned tags lead to non-reproducible builds and unexpected breakage when upstream images change.",
                            "best_practice": "Always pin: FROM python:3.12-slim-bookworm or use a digest: FROM python@sha256:abc123...",
                            "example": "# Bad\nFROM python:latest\n\n# Good\nFROM python:3.12-slim-bookworm",
                            "quiz": {
                                "q": "Why should you avoid 'python:latest' in a Dockerfile?",
                                "options": [
                                    "It causes slower builds",
                                    "It makes builds non-reproducible",
                                    "It uses more disk space",
                                    "It's deprecated"
                                ],
                                "answer": 1
                            }
                        }
                    })
            if alias:
                stage_aliases.add(alias.lower())

    has_user = any(re.match(r"^\s*USER\s", ln, re.IGNORECASE) for ln in lines)
    if not has_user:
        findings.append({
            "id": "DF002",
            "source": "dockerfile",
            "severity": "Critical",
            "category": "Security",
            "description": "No USER directive found — container runs as root by default. Add a non-root user.",
            "effective_weight": 20,
            "learning": {
                "plain": "By default, containers run as root. If an attacker breaks out of your app, they have root access to the container.",
                "technical": "The principle of least privilege dictates containers should run with a non-root user. Create a user and switch with USER.",
                "why": "Root in a container is still root — it reduces isolation and increases blast radius of security breaches.",
                "best_practice": "Add before the CMD/ENTRYPOINT:\nRUN addgroup --system app && adduser --system --ingroup app app\nUSER app",
                "example": "RUN addgroup --system app && adduser --system --ingroup app app\nUSER app\nCOPY --chown=app:app . /app\nWORKDIR /app\nCMD [\"python\", \"app.py\"]",
                "quiz": {
                    "q": "What's the risk of running a container as root?",
                    "options": [
                        "Slower performance",
                        "Larger image size",
                        "If compromised, attacker has full root access",
                        "Can't use volumes"
                    ],
                    "answer": 2
                }
            }
        })

    has_health = any(re.match(r"^\s*HEALTHCHECK\s", ln, re.IGNORECASE) for ln in lines)
    if not has_health:
        findings.append({
            "id": "DF003",
            "source": "dockerfile",
            "severity": "Medium",
            "category": "Observability",
            "description": "No HEALTHCHECK instruction — orchestrators can't detect if your app is truly healthy.",
            "effective_weight": 10,
            "learning": {
                "plain": "Without HEALTHCHECK, Docker and Kubernetes assume your container is 'healthy' as long as it's running — even if your app is crashed inside.",
                "technical": "HEALTHCHECK tells Docker how to test if your container is working. Kubernetes uses this via liveness/readiness probes.",
                "why": "A running process doesn't mean a working service. HEALTHCHECK enables self-healing orchestration.",
                "best_practice": "HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8000/health || exit 1",
                "example": "HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\\n  CMD curl -f http://localhost:8080/health || exit 1",
                "quiz": {
                    "q": "What does HEALTHCHECK do?",
                    "options": [
                        "Makes the container start faster",
                        "Checks if the process inside is actually working",
                        "Scans the image for viruses",
                        "Disables the container"
                    ],
                    "answer": 1
                }
            }
        })

    for i, line in enumerate(lines):
        m = re.match(r"^\s*COPY\s+", line)
        if m and "--chown" not in line:
            findings.append({
                "id": "DF004",
                "source": "dockerfile",
                "severity": "Medium",
                "category": "Security",
                "description": f"COPY on line {i+1} doesn't use --chown. Files copied as root even if a USER is set later.",
                "effective_weight": 8,
                "learning": {
                    "plain": "Even if you switch to a non-root user later, files copied with COPY are owned by root.",
                    "technical": "COPY --chown ensures files are owned by the non-root user immediately, avoiding permission issues at runtime.",
                    "why": "Files with wrong ownership can cause application crashes or security issues if they contain secrets.",
                    "best_practice": "COPY --chown=app:app . /app",
                    "example": "# Bad\nCOPY . /app\n\n# Good\nCOPY --chown=app:app . /app",
                    "quiz": {
                        "q": "Why use COPY --chown?",
                        "options": [
                            "It copies files faster",
                            "It sets correct file ownership for non-root users",
                            "It compresses the files",
                            "It's required for multi-stage builds"
                        ],
                        "answer": 1
                    }
                }
            })
            break

    has_expose = any(re.match(r"^\s*EXPOSE\s", ln, re.IGNORECASE) for ln in lines)
    if not has_expose:
        findings.append({
            "id": "DF005",
            "source": "dockerfile",
            "severity": "Low",
            "category": "Best Practices",
            "description": "No EXPOSE instruction — document which ports your container listens on.",
            "effective_weight": 5,
            "learning": {
                "plain": "EXPOSE is documentation — it tells people reading your Dockerfile which port your app uses.",
                "technical": "EXPOSE doesn't publish the port; it's metadata. Use -p or --publish at runtime to actually expose it.",
                "why": "Without EXPOSE, other developers have to guess or read your source code to know the port.",
                "best_practice": "EXPOSE 8080",
                "example": "EXPOSE 8080",
                "quiz": {
                    "q": "Does EXPOSE actually publish the port?",
                    "options": [
                        "Yes, it makes the port public",
                        "No, it's just documentation",
                        "Only if combined with CMD",
                        "Only in production"
                    ],
                    "answer": 1
                }
            }
        })

    return findings


def analyze_k8s(content):
    findings = []

    try:
        docs = list(yaml.safe_load_all(content))
    except yaml.YAMLError as e:
        findings.append({
            "id": "K8S900",
            "source": "k8s",
            "severity": "Critical",
            "category": "Reliability",
            "description": f"Invalid YAML syntax — the manifest cannot be parsed ({str(e).split(chr(10))[0]}). Results for this file are NOT trustworthy until the YAML is fixed.",
            "effective_weight": 50,
            "learning": {
                "plain": "Your Kubernetes manifest has broken YAML, so Kubernetes itself would reject it. Fix the indentation/syntax before trusting any other checks.",
                "technical": "Kubernetes parses manifests with strict YAML. A parse error means the object can't be created at all — all other checks are meaningless.",
                "why": "Scoring an unparseable manifest produces false confidence — the tool must refuse to vouch for it.",
                "best_practice": "Fix indentation, quotes, and colons. Validate locally with: kubectl apply --dry-run=client -f manifest.yaml",
                "example": "# Bad (inconsistent indentation)\napiVersion: apps/v1\n  kind: Deployment\n\n# Good\napiVersion: apps/v1\nkind: Deployment",
                "quiz": {
                    "q": "What happens when a manifest has invalid YAML?",
                    "options": [
                        "Kubernetes auto-fixes it",
                        "Kubernetes rejects the manifest entirely",
                        "It deploys with warnings",
                        "Only CPU settings are ignored"
                    ],
                    "answer": 1
                }
            }
        })
        return findings, False

    docs = [d for d in docs if isinstance(d, dict)]

    WORKLOAD_KINDS = ("Deployment", "Pod", "StatefulSet", "DaemonSet", "ReplicaSet")
    workloads = [d for d in docs if d.get("kind") in WORKLOAD_KINDS]

    if not workloads:
        findings.append({
            "id": "K8S902",
            "source": "k8s",
            "severity": "Low",
            "category": "Best Practices",
            "description": "No workload object found (expected Deployment, Pod, StatefulSet, DaemonSet, or ReplicaSet). A Service/ConfigMap alone isn't a runnable deployment.",
            "effective_weight": 5,
            "learning": {
                "plain": "This manifest defines objects like a Service or ConfigMap, but nothing that actually runs your app. A readiness check needs a workload object.",
                "technical": "Workload kinds (Deployment, StatefulSet, etc.) own Pods. Without one, there is nothing to scale, probe, or secure.",
                "why": "A 'readiness' score means nothing if there's no workload to be ready.",
                "best_practice": "Include a Deployment (or Pod/StatefulSet/DaemonSet) alongside Services and ConfigMaps.",
                "example": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  template:\n    spec:\n      containers:\n      - name: app\n        image: my-app:v1.0.0",
                "quiz": {
                    "q": "Which of these is a workload object that runs containers?",
                    "options": [
                        "Service",
                        "ConfigMap",
                        "Deployment",
                        "Ingress"
                    ],
                    "answer": 2
                }
            }
        })
        return findings, True

    all_containers = []
    any_security_context = False

    for wl in workloads:
        name = wl.get("metadata", {}).get("name", "unnamed")
        kind = wl.get("kind", "Workload")
        spec = wl.get("spec", {}) or {}
        pod_spec = spec.get("template", {}).get("spec", {}) if kind != "Pod" else (spec or {})

        if pod_spec.get("securityContext"):
            any_security_context = True

        for c in (pod_spec.get("containers", []) or []):
            if c.get("securityContext"):
                any_security_context = True
            all_containers.append((f"{kind}/{name}", c.get("name", "?") or "?", c))
        for c in (pod_spec.get("initContainers", []) or []):
            if c.get("securityContext"):
                any_security_context = True
            all_containers.append((f"{kind}/{name}", c.get("name", "?") or "?", c))

    missing_resources = [c for _, _, c in all_containers if not c.get("resources")]
    missing_readiness = [c for _, _, c in all_containers if not c.get("readinessProbe")]
    missing_liveness = [c for _, _, c in all_containers if not c.get("livenessProbe")]
    unpinned_images = [(name, cname, c.get("image", "")) for name, cname, c in all_containers
                       if c.get("image") and (":" not in c["image"] or c["image"].endswith(":latest"))]

    if not any_security_context:
        findings.append({
            "id": "K8S004",
            "source": "k8s",
            "severity": "Medium",
            "category": "Security",
            "description": "No securityContext defined on the pod or containers. Pods run with default (often permissive) security settings.",
            "effective_weight": 12,
            "learning": {
                "plain": "Without a security context, containers can run as root and have more Linux capabilities than they need.",
                "technical": "securityContext controls privilege, user IDs, and capabilities. Always set runAsNonRoot: true.",
                "why": "Default security settings are historically permissive, increasing attack surface.",
                "best_practice": "securityContext:\n  runAsNonRoot: true\n  runAsUser: 1001\n  capabilities:\n    drop: [\"ALL\"]",
                "example": "securityContext:\n  runAsNonRoot: true\n  runAsUser: 1001\n  allowPrivilegeEscalation: false\n  capabilities:\n    drop: [\"ALL\"]",
                "quiz": {
                    "q": "What does runAsNonRoot: true do?",
                    "options": [
                        "Makes the container run faster",
                        "Prevents the container from running as root user",
                        "Disables networking",
                        "Enables auto-scaling"
                    ],
                    "answer": 1
                }
            }
        })

    if missing_resources:
        findings.append({
            "id": "K8S001",
            "source": "k8s",
            "severity": "High",
            "category": "Reliability",
            "description": f"{len(missing_resources)} container(s) have no resource limits/requests defined. Pods can consume all node resources.",
            "effective_weight": 18,
            "learning": {
                "plain": "Without limits, one runaway pod can starve other pods on the same node of CPU and memory.",
                "technical": "Resource requests guarantee scheduling, limits prevent starvation. Always set both.",
                "why": "Unbounded pods can cause node instability, OOM kills of other pods, and noisy-neighbor problems.",
                "best_practice": "resources:\n  requests:\n    cpu: 100m\n    memory: 128Mi\n  limits:\n    cpu: 500m\n    memory: 256Mi",
                "example": "resources:\n  requests:\n    cpu: 250m\n    memory: 256Mi\n  limits:\n    cpu: 1\n    memory: 512Mi",
                "quiz": {
                    "q": "What happens if a container exceeds its memory limit?",
                    "options": [
                        "It gets throttled",
                        "It gets OOM-killed (restarted)",
                        "Kubernetes ignores it",
                        "The node shuts down"
                    ],
                    "answer": 1
                }
            }
        })

    if missing_readiness:
        findings.append({
            "id": "K8S002",
            "source": "k8s",
            "severity": "High",
            "category": "Reliability",
            "description": f"{len(missing_readiness)} container(s) have no readinessProbe — Kubernetes will send traffic to pods that aren't ready to serve.",
            "effective_weight": 15,
            "learning": {
                "plain": "Without a readiness check, Kubernetes sends traffic to your pod the moment it starts — even if your app is still loading.",
                "technical": "readinessProbe controls when a pod is added to Service endpoints. It prevents traffic loss during startup.",
                "why": "Users get 502 errors when pods receive traffic before they're ready.",
                "best_practice": "readinessProbe:\n  httpGet:\n    path: /health\n    port: 8080\n  initialDelaySeconds: 5\n  periodSeconds: 10",
                "example": "readinessProbe:\n  httpGet:\n    path: /ready\n    port: 8080\n  initialDelaySeconds: 3\n  periodSeconds: 5",
                "quiz": {
                    "q": "What does a readinessProbe do?",
                    "options": [
                        "Kills unhealthy pods",
                        "Controls if a pod receives traffic",
                        "Restarts the pod periodically",
                        "Monitors CPU usage"
                    ],
                    "answer": 1
                }
            }
        })

    if missing_liveness:
        findings.append({
            "id": "K8S003",
            "source": "k8s",
            "severity": "High",
            "category": "Reliability",
            "description": f"{len(missing_liveness)} container(s) have no livenessProbe — Kubernetes won't restart pods that are stuck or deadlocked.",
            "effective_weight": 15,
            "learning": {
                "plain": "If your app freezes or deadlocks, Kubernetes won't know unless you have a liveness probe to check.",
                "technical": "livenessProbe indicates whether your container is running properly. If it fails, kubelet kills and restarts the container.",
                "why": "Without liveness probes, stuck containers run indefinitely, serving errors or nothing at all.",
                "best_practice": "livenessProbe:\n  httpGet:\n    path: /health\n    port: 8080\n  initialDelaySeconds: 15\n  periodSeconds: 20",
                "example": "livenessProbe:\n  httpGet:\n    path: /healthz\n    port: 8080\n  initialDelaySeconds: 10\n  periodSeconds: 15",
                "quiz": {
                    "q": "What's the difference between liveness and readiness probes?",
                    "options": [
                        "They're the same thing",
                        "Liveness restarts stuck containers, readiness controls traffic",
                        "Liveness is for CPU, readiness for memory",
                        "Readiness is only for init containers"
                    ],
                    "answer": 1
                }
            }
        })

    if unpinned_images:
        names = ", ".join(f"{img}" for _, _, img in unpinned_images[:3])
        if len(unpinned_images) > 3:
            names += f" (+{len(unpinned_images) - 3} more)"
        findings.append({
            "id": "K8S005",
            "source": "k8s",
            "severity": "Medium",
            "category": "Best Practices",
            "description": f"{len(unpinned_images)} image(s) use ':latest' or no tag: {names}. Pin to a specific version for consistent deployments.",
            "effective_weight": 8,
            "learning": {
                "plain": "Using 'latest' in Kubernetes means different pods might run different versions of your image.",
                "technical": "Image tags must be immutable in production. Use semantic versions or commit SHAs.",
                "why": "Unpinned images cause 'works on my machine' bugs and make rollbacks impossible.",
                "best_practice": "image: myapp:v1.2.3",
                "example": "# Bad\nimage: myapp:latest\n\n# Good\nimage: myapp:v1.2.3\n# Best\nimage: myapp@sha256:a1b2c3...",
                "quiz": {
                    "q": "Why pin image tags in Kubernetes?",
                    "options": [
                        "It saves bandwidth",
                        "It ensures consistent deployments",
                        "It's required by Kubernetes",
                        "It speeds up pod startup"
                    ],
                    "answer": 1
                }
            }
        })

    return findings, True


MAX_SCORE = 100

CATEGORY_MAP = {
    "Security": 0,
    "Best Practices": 0,
    "Reliability": 0,
    "Observability": 0,
    "Performance": 0,
}


def compute_score(findings, self_reported):
    total_penalty = sum(f["effective_weight"] for f in findings)

    category_totals = dict(CATEGORY_MAP)
    for f in findings:
        cat = f["category"]
        if cat in category_totals:
            category_totals[cat] += f["effective_weight"]

    bonus = 0
    if self_reported.get("rollback_strategy_documented"):
        bonus += SELF_ATTESTED_BONUS
    if self_reported.get("documentation_updated"):
        bonus += SELF_ATTESTED_BONUS

    score = min(MAX_SCORE, max(0, MAX_SCORE - total_penalty + bonus))

    if score >= 85:
        status = "Ready for Deployment"
    elif score >= 65:
        status = "Needs Improvement"
    elif score >= 40:
        status = "Significant Gaps"
    else:
        status = "Not Ready"

    return score, status, category_totals


def build_roadmap(findings, score):
    roadmap = []
    sorted_findings = sorted(findings, key=lambda f: f["effective_weight"], reverse=True)

    for f in sorted_findings:
        if score >= 95:
            break
        score = min(95, score + f["effective_weight"])
        roadmap.append({
            "fix": f["id"] + " — " + f["description"][:60],
            "score_after_fix": min(100, score)
        })

    return roadmap


def check_governance(dockerfile_content, k8s_content, self_reported):
    auto = {}
    if dockerfile_content:
        auto["uses_pinned_base_image"] = bool(re.search(r"FROM\s+\S+:@sha256", dockerfile_content) or
                                               re.search(r"FROM\s+\S+:\d+\.\d+", dockerfile_content))
        auto["non_root_user"] = bool(re.search(r"^\s*USER\s", dockerfile_content, re.MULTILINE))
        auto["has_healthcheck"] = bool(re.search(r"^\s*HEALTHCHECK\s", dockerfile_content, re.MULTILINE))
        auto["multi_stage_build"] = len(re.findall(r"^\s*FROM\s+", dockerfile_content,
                                                   re.MULTILINE | re.IGNORECASE)) > 1

    if k8s_content and is_valid_yaml(k8s_content):
        auto["resource_limits_defined"] = bool(re.search(r"^\s*resources:", k8s_content, re.MULTILINE))
        auto["readiness_probe_defined"] = bool(re.search(r"^\s*readinessProbe:", k8s_content, re.MULTILINE))
        auto["liveness_probe_defined"] = bool(re.search(r"^\s*livenessProbe:", k8s_content, re.MULTILINE))
        auto["security_context_defined"] = bool(re.search(r"^\s*securityContext:", k8s_content, re.MULTILINE))

    return {
        "auto_detected": auto,
        "self_reported": {
            "rollback_strategy_documented": bool(self_reported.get("rollback_strategy_documented")),
            "documentation_updated": bool(self_reported.get("documentation_updated")),
        }
    }


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body received"}), 400

    dockerfile_content = data.get("dockerfile", "")
    k8s_content = data.get("k8s", "")
    self_reported = data.get("self_reported", {})

    findings = []
    files_analyzed = []

    if dockerfile_content.strip():
        files_analyzed.append("dockerfile")
        findings.extend(analyze_dockerfile(dockerfile_content))

    if k8s_content.strip():
        files_analyzed.append("k8s")
        k8s_findings, k8s_is_valid = analyze_k8s(k8s_content)
        findings.extend(k8s_findings)

    score, status, category_totals = compute_score(findings, self_reported)
    governance = check_governance(dockerfile_content, k8s_content, self_reported)
    roadmap = build_roadmap(findings, score)

    return jsonify({
        "score": score,
        "status": status,
        "files_analyzed": files_analyzed,
        "category_totals": category_totals,
        "findings": findings,
        "governance": governance,
        "roadmap": roadmap,
    })


@app.route("/export-pdf", methods=["POST"])
def export_pdf():
    try:
        from fpdf import FPDF

        data = request.get_json()
        score = data.get("score", 0)
        status = data.get("status", "Unknown")
        findings = data.get("findings", [])

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 20)
        pdf.cell(0, 15, "DevMate - Deployment Readiness Report", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 14)
        pdf.cell(0, 10, f"Score: {score}/100  -  {status}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, f"Findings ({len(findings)})", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 10)
        for f in findings:
            pdf.ln(3)
            pdf.set_text_color(200, 0, 0) if f["severity"] in ("Critical", "High") else pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 6, f"[{f['severity']}] {f['id']}: {f['description'][:80]}...", new_x="LMARGIN", new_y="NEXT")

        pdf.set_text_color(0, 0, 0)
        pdf.ln(15)
        pdf.set_font("Helvetica", "I", 8)
        pdf.cell(0, 5, "Generated by DevMate Public", new_x="LMARGIN", new_y="NEXT")

        return Response(pdf.output(), mimetype="application/pdf",
                        headers={"Content-Disposition": "attachment; filename=devmate-report.pdf"})
    except ImportError:
        text = f"DevMate Report\nScore: {score}/100 - {status}\n\nFindings:\n"
        for f in findings:
            text += f"\n[{f['severity']}] {f['id']}: {f['description']}"
        return Response(text, mimetype="text/plain",
                        headers={"Content-Disposition": "attachment; filename=devmate-report.txt"})


@app.route("/")
def index():
    return send_from_directory(app.root_path, "index.html")


@app.route("/style.css")
def serve_css():
    return send_from_directory(app.root_path, "style.css")


@app.route("/script.js")
def serve_js():
    return send_from_directory(app.root_path, "script.js")


# ═══════════════════════════════════════════════════════
#  PHASE 2.5 — DOCKER IMAGE ANALYSIS
# ═══════════════════════════════════════════════════════

# Safe image-reference regex: allows registry/path:tag and @sha256 digest notation.
_IMAGE_REF_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9_.\-/:@]{0,254}$')


def validate_image_ref(ref):
    """Return a sanitised image reference string, or None if the input is invalid."""
    if not ref or not isinstance(ref, str):
        return None
    ref = ref.strip()
    if not ref or not _IMAGE_REF_RE.match(ref):
        return None
    return ref


def _run_cmd(args, timeout=20):
    """Run a subprocess safely.  Returns (stdout, stderr, returncode)."""
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return result.stdout, result.stderr, result.returncode
    except FileNotFoundError:
        return None, "__not_found__", -1
    except subprocess.TimeoutExpired:
        return None, "__timeout__", -1
    except Exception as exc:
        return None, str(exc), -1


def docker_inspect_image(image_ref):
    """
    Run ``docker inspect --type=image <image_ref>``.
    Returns (inspect_list, error_code) where error_code is None on success or
    one of: 'docker_unavailable', 'image_not_found', or a plain error string.
    """
    stdout, stderr, rc = _run_cmd(["docker", "inspect", "--type=image", image_ref])
    if stdout is None:
        if stderr == "__not_found__":
            return None, "docker_unavailable"
        if stderr == "__timeout__":
            return None, "Docker command timed out (20 s)"
        return None, f"Docker error: {stderr}"
    if rc != 0:
        err = (stderr or "").lower()
        if "no such image" in err or "not found" in err:
            return None, "image_not_found"
        if any(p in err for p in ("cannot connect", "is the docker daemon running",
                                   "connection refused", "permission denied")):
            return None, "docker_unavailable"
        return None, (stderr or "docker inspect failed").strip()[:200]
    try:
        data = _json.loads(stdout)
        if not isinstance(data, list) or not data:
            return None, "Unexpected docker inspect output format"
        return data, None
    except Exception:
        return None, "Failed to parse docker inspect JSON output"


def trivy_scan_image(image_ref):
    """
    Run ``trivy image`` if Trivy is present on PATH.
    Returns (data_dict_or_None, status_str).
    status_str values: 'unavailable', 'ok', or 'error:<detail>'.
    """
    if not shutil.which("trivy"):
        return None, "unavailable"
    stdout, stderr, rc = _run_cmd(
        ["trivy", "image", "--format", "json", "--quiet", "--no-progress", image_ref],
        timeout=120,
    )
    if stdout is None:
        return None, f"error:{stderr}"
    if rc != 0:
        return None, f"error:{(stderr or 'trivy scan failed').strip()[:120]}"
    try:
        return _json.loads(stdout), "ok"
    except Exception:
        return None, "error:Failed to parse Trivy JSON output"


_SECRET_KEY_RE = re.compile(
    r'(password|passwd|secret|token|key|api_key|apikey|auth|credential|private|cert|jwt|pwd)',
    re.IGNORECASE,
)


def _mask_env_secrets(env_list):
    """Mask environment variable values whose names suggest secrets."""
    out = []
    for entry in (env_list or []):
        if '=' in entry:
            k, _, _ = entry.partition('=')
            out.append(f"{k}=***" if _SECRET_KEY_RE.search(k) else entry)
        else:
            out.append(entry)
    return out


def extract_image_metadata(inspect_obj):
    """Return a clean, display-ready metadata dict from a docker inspect object."""
    config = inspect_obj.get("Config") or {}
    root_fs = inspect_obj.get("RootFS") or {}
    size_bytes = inspect_obj.get("Size")
    size_str = None
    if size_bytes is not None:
        mb = size_bytes / (1024 * 1024)
        size_str = f"{mb:.1f} MB" if mb < 1024 else f"{mb / 1024:.2f} GB"
    return {
        "id": (inspect_obj.get("Id") or "")[:19],
        "repo_tags": inspect_obj.get("RepoTags") or [],
        "repo_digests": inspect_obj.get("RepoDigests") or [],
        "created": inspect_obj.get("Created") or "",
        "architecture": inspect_obj.get("Architecture") or "",
        "os": inspect_obj.get("Os") or "",
        "size": size_str,
        "layer_count": len(root_fs.get("Layers") or []),
        "exposed_ports": list((config.get("ExposedPorts") or {}).keys()),
        "env": _mask_env_secrets(config.get("Env") or []),
        "entrypoint": config.get("Entrypoint") or [],
        "cmd": config.get("Cmd") or [],
        "workdir": config.get("WorkingDir") or "",
        "user": config.get("User") or "",
        "labels": config.get("Labels") or {},
    }


def analyze_image_security(image_ref, metadata):
    """Generate security findings (IMG-prefix IDs) from image metadata."""
    findings = []
    user = metadata.get("user", "")

    # IMG001: Running as root
    if not user or user in ("root", "0", "0:0", "0:root"):
        findings.append({
            "id": "IMG001",
            "source": "image",
            "severity": "High",
            "category": "Security",
            "description": (
                f"Image runs as root (User='{user or 'not set'}')."
                " Containers running as root increase the blast radius if compromised."
                " Add a non-root USER instruction to the Dockerfile."
            ),
            "effective_weight": 15,
        })

    # IMG002: Unpinned :latest tag
    tags = metadata.get("repo_tags") or []
    ref_part = image_ref.split("/")[-1]
    has_latest = any(t.endswith(":latest") for t in tags) or (
        not tags and (image_ref.endswith(":latest") or ":" not in ref_part)
    )
    if has_latest:
        latest_tags = ", ".join(t for t in tags if t.endswith(":latest")) or image_ref
        findings.append({
            "id": "IMG002",
            "source": "image",
            "severity": "Medium",
            "category": "Best Practices",
            "description": (
                f"Image uses the ':latest' tag ({latest_tags})."
                " Unpinned tags produce non-reproducible deployments and can silently update."
            ),
            "effective_weight": 8,
        })

    # IMG003: Many exposed ports
    ports = metadata.get("exposed_ports") or []
    if len(ports) > 3:
        shown = ', '.join(ports[:6]) + ('\u2026' if len(ports) > 6 else '')
        findings.append({
            "id": "IMG003",
            "source": "image",
            "severity": "Low",
            "category": "Security",
            "description": (
                f"Image exposes {len(ports)} ports ({shown})."
                " Minimise exposed surface area to reduce the attack vector."
            ),
            "effective_weight": 5,
        })

    # IMG004: No WORKDIR
    if not metadata.get("workdir"):
        findings.append({
            "id": "IMG004",
            "source": "image",
            "severity": "Low",
            "category": "Best Practices",
            "description": (
                "Image has no WORKDIR configured. Files default to the root directory (/),"
                " making filesystem layout unpredictable."
            ),
            "effective_weight": 3,
        })

    # IMG005: Neither ENTRYPOINT nor CMD
    if not metadata.get("entrypoint") and not metadata.get("cmd"):
        findings.append({
            "id": "IMG005",
            "source": "image",
            "severity": "Low",
            "category": "Best Practices",
            "description": (
                "Image defines neither ENTRYPOINT nor CMD."
                " A command must be supplied explicitly at container runtime."
            ),
            "effective_weight": 3,
        })

    return findings


def extract_trivy_summary(trivy_data):
    """Extract a compact vulnerability summary from raw Trivy JSON output."""
    if not trivy_data or not isinstance(trivy_data, dict):
        return None
    results = trivy_data.get("Results") or []
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "UNKNOWN": 0}
    top_vulns = []
    for r in results:
        for v in (r.get("Vulnerabilities") or []):
            sev = (v.get("Severity") or "UNKNOWN").upper()
            counts[sev] = counts.get(sev, 0) + 1
            if len(top_vulns) < 25:
                top_vulns.append({
                    "id": v.get("VulnerabilityID", ""),
                    "pkg": v.get("PkgName", ""),
                    "installed": v.get("InstalledVersion", ""),
                    "fixed": v.get("FixedVersion", "") or "",
                    "severity": sev,
                    "title": (v.get("Title") or "")[:100],
                })
    return {
        "severity_counts": counts,
        "total": sum(counts.values()),
        "vulnerabilities": top_vulns,
    }


@app.route("/inspect-image", methods=["POST"])
def inspect_image():
    data = request.get_json()
    if not data:
        return jsonify({"error": "no_body", "message": "No JSON body received"}), 400

    image_ref = validate_image_ref(data.get("image", ""))
    if not image_ref:
        return jsonify({
            "error": "invalid_image_ref",
            "message": "Invalid or empty image reference. Use format: name:tag  (e.g. nginx:1.27)"
        }), 400

    inspect_list, inspect_err = docker_inspect_image(image_ref)
    if inspect_err == "docker_unavailable":
        return jsonify({
            "error": "docker_unavailable",
            "message": "Docker is not installed or the Docker daemon is not running."
        }), 503
    if inspect_err == "image_not_found":
        return jsonify({
            "error": "image_not_found",
            "message": f"Image '{image_ref}' was not found locally. Pull it first: docker pull {image_ref}"
        }), 404
    if inspect_err:
        return jsonify({"error": "inspect_failed", "message": inspect_err}), 500

    metadata = extract_image_metadata(inspect_list[0])
    security_findings = analyze_image_security(image_ref, metadata)
    trivy_data, trivy_status = trivy_scan_image(image_ref)
    trivy_summary = extract_trivy_summary(trivy_data) if trivy_status == "ok" else None

    return jsonify({
        "image_ref": image_ref,
        "metadata": metadata,
        "security_findings": security_findings,
        "trivy_status": trivy_status,
        "trivy_summary": trivy_summary,
    })


if __name__ == "__main__":
    print("🧠 DevMate Backend running on http://127.0.0.1:5000")
    print("📦 Install dependencies: pip install flask flask-cors fpdf2 pyyaml")
    app.run(debug=True, port=5000)
