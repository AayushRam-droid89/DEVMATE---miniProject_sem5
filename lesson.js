const LESSONS = {
  "DF001": {
    id: "DF001", source: "dockerfile", severity: "High", category: "Best Practices",
    title: "Pin your base image",
    description: "Base image uses an unpinned tag (or ':latest'). Use a specific version for reproducible builds.",
    effective_weight: 15,
    learning: {
      plain: "Using 'latest' means your image changes whenever the maintainer publishes a new version. Your build today might not work tomorrow.",
      technical: "Pinning base image versions ensures deterministic builds. Use a digest (SHA256) for maximum reproducibility.",
      why: "Unpinned tags lead to non-reproducible builds and unexpected breakage when upstream images change.",
      best_practice: "Always pin: FROM python:3.12-slim-bookworm or use a digest: FROM python@sha256:abc123...",
      example: "# Bad\nFROM python:latest\n\n# Good\nFROM python:3.12-slim-bookworm",
      quiz: { q: "Why should you avoid 'python:latest' in a Dockerfile?",
        options: ["It causes slower builds", "It makes builds non-reproducible", "It uses more disk space", "It's deprecated"],
        answer: 1 }
    }
  },

  "DF002": {
    id: "DF002", source: "dockerfile", severity: "Critical", category: "Security",
    title: "Run as a non-root user",
    description: "No USER directive found — container runs as root by default. Add a non-root user.",
    effective_weight: 20,
    learning: {
      plain: "By default, containers run as root. If an attacker breaks out of your app, they have root access to the container.",
      technical: "The principle of least privilege dictates containers should run with a non-root user. Create a user and switch with USER.",
      why: "Root in a container is still root — it reduces isolation and increases the blast radius of security breaches.",
      best_practice: "Add before the CMD/ENTRYPOINT:\nRUN addgroup --system app && adduser --system --ingroup app app\nUSER app",
      example: "RUN addgroup --system app && adduser --system --ingroup app app\nUSER app\nCOPY --chown=app:app . /app\nWORKDIR /app\nCMD [\"python\", \"app.py\"]",
      quiz: { q: "What's the risk of running a container as root?",
        options: ["Slower performance", "Larger image size", "If compromised, attacker has full root access", "Can't use volumes"],
        answer: 2 }
    }
  },

  "DF003": {
    id: "DF003", source: "dockerfile", severity: "Medium", category: "Observability",
    title: "Add a HEALTHCHECK",
    description: "No HEALTHCHECK instruction — orchestrators can't detect if your app is truly healthy.",
    effective_weight: 10,
    learning: {
      plain: "Without HEALTHCHECK, Docker and Kubernetes assume your container is 'healthy' as long as it's running — even if your app is crashed inside.",
      technical: "HEALTHCHECK tells Docker how to test if your container is working. Kubernetes uses this via liveness/readiness probes.",
      why: "A running process doesn't mean a working service. HEALTHCHECK enables self-healing orchestration.",
      best_practice: "HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8000/health || exit 1",
      example: "HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\\n  CMD curl -f http://localhost:8080/health || exit 1",
      quiz: { q: "What does HEALTHCHECK do?",
        options: ["Makes the container start faster", "Checks if the process inside is actually working", "Scans the image for viruses", "Disables the container"],
        answer: 1 }
    }
  },

  "DF004": {
    id: "DF004", source: "dockerfile", severity: "Medium", category: "Security",
    title: "Copy files with --chown",
    description: "COPY without --chown leaves files owned by root even if a USER is set later.",
    effective_weight: 8,
    learning: {
      plain: "Even if you switch to a non-root user later, files copied with COPY are owned by root.",
      technical: "COPY --chown ensures files are owned by the non-root user immediately, avoiding permission issues at runtime.",
      why: "Files with wrong ownership can cause application crashes or security issues if they contain secrets.",
      best_practice: "COPY --chown=app:app . /app",
      example: "# Bad\nCOPY . /app\n\n# Good\nCOPY --chown=app:app . /app",
      quiz: { q: "Why use COPY --chown?",
        options: ["It copies files faster", "It sets correct file ownership for non-root users", "It compresses the files", "It's required for multi-stage builds"],
        answer: 1 }
    }
  },

  "DF005": {
    id: "DF005", source: "dockerfile", severity: "Low", category: "Best Practices",
    title: "Document ports with EXPOSE",
    description: "No EXPOSE instruction — document which ports your container listens on.",
    effective_weight: 5,
    learning: {
      plain: "EXPOSE is documentation — it tells people reading your Dockerfile which port your app uses.",
      technical: "EXPOSE doesn't publish the port; it's metadata. Use -p or --publish at runtime to actually expose it.",
      why: "Without EXPOSE, other developers have to guess or read your source code to know the port.",
      best_practice: "EXPOSE 8080",
      example: "EXPOSE 8080",
      quiz: { q: "Does EXPOSE actually publish the port?",
        options: ["Yes, it makes the port public", "No, it's just documentation", "Only if combined with CMD", "Only in production"],
        answer: 1 }
    }
  },

  "K8S001": {
    id: "K8S001", source: "k8s", severity: "High", category: "Reliability",
    title: "Set resource requests & limits",
    description: "No resource limits/requests defined. Pods can consume all node resources.",
    effective_weight: 18,
    learning: {
      plain: "Without limits, one runaway pod can starve other pods on the same node of CPU and memory.",
      technical: "Resource requests guarantee scheduling, limits prevent starvation. Always set both.",
      why: "Unbounded pods can cause node instability, OOM kills of other pods, and noisy-neighbor problems.",
      best_practice: "resources:\n  requests:\n    cpu: 100m\n    memory: 128Mi\n  limits:\n    cpu: 500m\n    memory: 256Mi",
      example: "resources:\n  requests:\n    cpu: 250m\n    memory: 256Mi\n  limits:\n    cpu: 1\n    memory: 512Mi",
      quiz: { q: "What happens if a container exceeds its memory limit?",
        options: ["It gets throttled", "It gets OOM-killed (restarted)", "Kubernetes ignores it", "The node shuts down"],
        answer: 1 }
    }
  },

  "K8S002": {
    id: "K8S002", source: "k8s", severity: "High", category: "Reliability",
    title: "Add a readiness probe",
    description: "No readinessProbe — Kubernetes will send traffic to pods that aren't ready to serve.",
    effective_weight: 15,
    learning: {
      plain: "Without a readiness check, Kubernetes sends traffic to your pod the moment it starts — even if your app is still loading.",
      technical: "readinessProbe controls when a pod is added to Service endpoints. It prevents traffic loss during startup.",
      why: "Users get 502 errors when pods receive traffic before they're ready.",
      best_practice: "readinessProbe:\n  httpGet:\n    path: /health\n    port: 8080\n  initialDelaySeconds: 5\n  periodSeconds: 10",
      example: "readinessProbe:\n  httpGet:\n    path: /ready\n    port: 8080\n  initialDelaySeconds: 3\n  periodSeconds: 5",
      quiz: { q: "What does a readinessProbe do?",
        options: ["Kills unhealthy pods", "Controls if a pod receives traffic", "Restarts the pod periodically", "Monitors CPU usage"],
        answer: 1 }
    }
  },

  "K8S003": {
    id: "K8S003", source: "k8s", severity: "High", category: "Reliability",
    title: "Add a liveness probe",
    description: "No livenessProbe — Kubernetes won't restart pods that are stuck or deadlocked.",
    effective_weight: 15,
    learning: {
      plain: "If your app freezes or deadlocks, Kubernetes won't know unless you have a liveness probe to check.",
      technical: "livenessProbe indicates whether your container is running properly. If it fails, kubelet kills and restarts the container.",
      why: "Without liveness probes, stuck containers run indefinitely, serving errors or nothing at all.",
      best_practice: "livenessProbe:\n  httpGet:\n    path: /health\n    port: 8080\n  initialDelaySeconds: 15\n  periodSeconds: 20",
      example: "livenessProbe:\n  httpGet:\n    path: /healthz\n    port: 8080\n  initialDelaySeconds: 10\n  periodSeconds: 15",
      quiz: { q: "What's the difference between liveness and readiness probes?",
        options: ["They're the same thing", "Liveness restarts stuck containers, readiness controls traffic", "Liveness is for CPU, readiness for memory", "Readiness is only for init containers"],
        answer: 1 }
    }
  },

  "K8S004": {
    id: "K8S004", source: "k8s", severity: "Medium", category: "Security",
    title: "Harden with a security context",
    description: "No securityContext defined. Pods run with default (often permissive) security settings.",
    effective_weight: 12,
    learning: {
      plain: "Without a security context, containers can run as root and have more Linux capabilities than they need.",
      technical: "securityContext controls privilege, user IDs, and capabilities. Always set runAsNonRoot: true.",
      why: "Default security settings are historically permissive, increasing attack surface.",
      best_practice: "securityContext:\n  runAsNonRoot: true\n  runAsUser: 1001\n  capabilities:\n    drop: [\"ALL\"]",
      example: "securityContext:\n  runAsNonRoot: true\n  runAsUser: 1001\n  allowPrivilegeEscalation: false\n  capabilities:\n    drop: [\"ALL\"]",
      quiz: { q: "What does runAsNonRoot: true do?",
        options: ["Makes the container run faster", "Prevents the container from running as root user", "Disables networking", "Enables auto-scaling"],
        answer: 1 }
    }
  },

  "K8S005": {
    id: "K8S005", source: "k8s", severity: "Medium", category: "Best Practices",
    title: "Pin container image tags",
    description: "Image uses ':latest' or no tag. Pin to a specific version for consistent deployments.",
    effective_weight: 8,
    learning: {
      plain: "Using 'latest' in Kubernetes means different pods might run different versions of your image.",
      technical: "Image tags must be immutable in production. Use semantic versions or commit SHAs.",
      why: "Unpinned images cause 'works on my machine' bugs and make rollbacks impossible.",
      best_practice: "image: myapp:v1.2.3",
      example: "# Bad\nimage: myapp:latest\n\n# Good\nimage: myapp:v1.2.3\n# Best\nimage: myapp@sha256:a1b2c3...",
      quiz: { q: "Why pin image tags in Kubernetes?",
        options: ["It saves bandwidth", "It ensures consistent deployments", "It's required by Kubernetes", "It speeds up pod startup"],
        answer: 1 }
    }
  },

  "K8S900": {
    id: "K8S900", source: "k8s", severity: "Critical", category: "Reliability",
    title: "Fix invalid YAML",
    description: "Invalid YAML syntax — the manifest cannot be parsed. Results are not trustworthy until the YAML is fixed.",
    effective_weight: 50,
    learning: {
      plain: "Your Kubernetes manifest has broken YAML, so Kubernetes itself would reject it. Fix the indentation/syntax before trusting any other checks.",
      technical: "Kubernetes parses manifests with strict YAML. A parse error means the object can't be created at all — all other checks are meaningless.",
      why: "Scoring an unparseable manifest produces false confidence — the tool must refuse to vouch for it.",
      best_practice: "Fix indentation, quotes, and colons. Validate locally with: kubectl apply --dry-run=client -f manifest.yaml",
      example: "# Bad (inconsistent indentation)\napiVersion: apps/v1\n  kind: Deployment\n\n# Good\napiVersion: apps/v1\nkind: Deployment",
      quiz: { q: "What happens when a manifest has invalid YAML?",
        options: ["Kubernetes auto-fixes it", "Kubernetes rejects the manifest entirely", "It deploys with warnings", "Only CPU settings are ignored"],
        answer: 1 }
    }
  },

  "K8S902": {
    id: "K8S902", source: "k8s", severity: "Low", category: "Best Practices",
    title: "Deploy a workload object",
    description: "No workload object found (expected Deployment, Pod, StatefulSet, DaemonSet, or ReplicaSet). A Service/ConfigMap alone isn't a runnable deployment.",
    effective_weight: 5,
    learning: {
      plain: "You gave a manifest, but it doesn't contain anything that actually runs a container. Services and ConfigMaps support workloads — they aren't workloads themselves.",
      technical: "Workload kinds (Deployment, StatefulSet, DaemonSet, Pod, ReplicaSet) own the pod spec where probes, resources, and security contexts live. Non-workload objects have no pod spec to check.",
      why: "Deploying only a Service means nothing is running behind it — the deployment isn't ready, it's incomplete.",
      best_practice: "Include at least one workload object (e.g., a Deployment) that references your image.",
      example: "# Minimal runnable deployment\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: app\nspec:\n  template:\n    spec:\n      containers:\n      - name: app\n        image: app:v1.0.0",
      quiz: { q: "Which of these is a workload object that runs containers?",
        options: ["Service", "ConfigMap", "Deployment", "Ingress"],
        answer: 2 }
    }
  }
};
