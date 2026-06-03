# Cloud-Native GitOps Delivery Platform

A production-grade GitOps continuous delivery platform demonstrating Kubernetes deployment automation, reusable Helm packaging, ArgoCD synchronization, progressive delivery strategies (Canary & Blue-Green), and real-time observability.

The platform includes a **FastAPI backend** that connects directly to the Kubernetes API to fetch live cluster topology, and a **React DevOps dashboard** that visualizes the infrastructure, logs, sync status, and progressive rollouts.

---

## 🏗️ Architecture & GitOps Workflow

```mermaid
graph TD
    classDef dev fill:#4338ca,stroke:#312e81,stroke-width:2px,color:#fff;
    classDef git fill:#1e1b4b,stroke:#0f172a,stroke-width:2px,color:#fff;
    classDef ci fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff;
    classDef cd fill:#059669,stroke:#047857,stroke-width:2px,color:#fff;
    classDef cluster fill:#b45309,stroke:#78350f,stroke-width:2px,color:#fff;

    Developer["💻 SRE/DevOps Engineer"] ::: dev
    GitHub["🐙 GitHub Source Repository"] ::: git
    GHA["⚡ GitHub Actions (CI)"] ::: ci
    DockerRegistry["🐳 Docker Registry"] ::: git
    ArgoCD["⛵ ArgoCD Controller (CD)"] ::: cd
    K8s["☸️ Kubernetes Cluster (Minikube)"] ::: cluster

    Developer -->|1. git push changes| GitHub
    GitHub -->|2. triggers workflow| GHA
    GHA -->|3. run lint & unit tests| GHA
    GHA -->|4. build & push Docker image| DockerRegistry
    GHA -->|5. auto-update Helm tags| GitHub
    ArgoCD -->|6. detects OutOfSync state| GitHub
    ArgoCD -->|7. auto syncs / self-heals| K8s
```

1. **GitHub is the single source of truth**: All Kubernetes configurations (manifests/Helm values) are tracked in this Git repository.
2. **CI Automation (GitHub Actions)**: On every push to `main`, tests run, Docker images build, and a git-update job automatically changes the Helm value tag to the new commit SHA.
3. **CD Synchronization (ArgoCD)**: ArgoCD polls the repository. If the cluster configuration drifts from Git (e.g. manually scaling deployments using kubectl), ArgoCD detects it, flags the app as `OutOfSync`, and triggers **Self-Healing** to restore the git-defined state.

---

## 🛠️ Tech Stack
*   **Frontend**: React (Vite, Recharts, Lucide Icons, Vanilla CSS Glassmorphism)
*   **Backend**: FastAPI, Pytest, Prometheus Client, Kubernetes Python SDK
*   **Infrastructure**: Kubernetes (Minikube compatible), Helm v3, ArgoCD
*   **Observability**: Prometheus, Grafana, Loki, Alertmanager
*   **CI/CD**: GitHub Actions

---

## 🚀 Step-by-Step Setup Guide

### Prerequisites
*   macOS (Local development target)
*   [Minikube](https://minikube.sigs.k8s.io/docs/start/) or Docker Desktop Kubernetes active
*   [Helm v3](https://helm.sh/docs/intro/install/) installed
*   Node.js v18+ & Python 3.11+

---

### Step 1: Cluster Setup & Namespaces
Create the target namespaces for the environments and monitoring tools:
```bash
kubectl create namespace dev
kubectl create namespace staging
kubectl create namespace prod
kubectl create namespace argocd
kubectl create namespace monitoring
```

---

### Step 2: Install ArgoCD & Bootstrap Applications
1. Install ArgoCD in the cluster:
   ```bash
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```
2. Apply the environment application manifests to bootstrap GitOps:
   ```bash
   kubectl apply -f argocd/dev-application.yaml
   ```

---

### Step 3: Set Up Observability (Prometheus & Grafana)
Deploy the observability stack to the `monitoring` namespace:
```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
kubectl apply -f k8s/monitoring/loki.yaml
kubectl apply -f k8s/monitoring/alertmanager.yaml
```

---

### Step 4: Run the FastAPI Backend Locally
The backend connects directly to your local cluster using your `~/.kube/config` context. If no cluster is connected, it automatically falls back to **Sandbox Mock Mode** so you can still test dashboard interactions.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

---

### Step 5: Run the React Dashboard Locally
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:5173`.

---

## 📦 Helm Guide & Values Structure

This repository uses an **umbrella Helm chart** pattern under `helm/platform/` which references three sub-charts: `frontend`, `backend`, and `database` (PostgreSQL StatefulSet).

### Multi-Environment Overrides
*   **Development (`helm/values/values-dev.yaml`)**: Low resources, replica count `1`, auto-sync and self-healing active.
*   **Staging (`helm/values/values-staging.yaml`)**: Replica count `2`, enabling **Blue-Green** progressive delivery for testing.
*   **Production (`helm/values/values-prod.yaml`)**: Replica count `3`, backend HPA autoscaling, enabling **Canary** progressive delivery (10% -> 50% -> 100% split weights).

Dry-run validation command:
```bash
helm template platform helm/platform -f helm/values/values-prod.yaml
```

---

## 🔍 Diagnostics & Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Backend fails to connect to cluster** | Context is not set correctly in local `~/.kube/config`. | Run `kubectl config current-context` and verify connectivity. The backend will fall back to mock sandbox mode to prevent crashes. |
| **ArgoCD App status OutOfSync** | Manual changes were applied directly in cluster using `kubectl`. | Click **Reconcile Sync** in the React Dashboard or let ArgoCD automatically revert the drift. |
| **Canary release fails health check** | Error rates exceeded threshold during traffic shifting. | Click **Abort & Rollback** in the Deployment tab to instantly restore stable revision. |

---

## 💼 Resume-Ready Project Bullet Points

*   **Designed and built** a production-grade Cloud-Native GitOps Continuous Delivery Platform managing multi-environment Kubernetes deployments (`dev`, `staging`, `prod`) using an umbrella Helm chart model.
*   **Integrated FastAPI API controller** directly with the Kubernetes CoreV1/AppsV1 APIs to query running pods, namespaces, deployments, and stream log aggregations to a custom React developer portal.
*   **Configured ArgoCD automation** incorporating self-healing, prune policies, and automatic drift detection to enforce Git configurations as the single source of truth.
*   **Designed Progressive Delivery workflows** using Canary and Blue-Green strategies mapped to Argo Rollouts CRD templates, allowing manual split shifting, promotion, and automated abort rollbacks.
*   **Deployed a full SRE observability stack** comprising Prometheus scraper jobs, Grafana dashboard provisioning, Loki logger, and Alertmanager routing for real-time cluster alerting.
*   **Constructed GitHub Actions CI pipelines** performing ruff check linting, pytest suites, Docker image builds, and automated git-commit Helm values tag promotions.

---

## 💬 Interview Preparation (DevOps / SRE Q&A)

### Q1: What is the core difference between Pull-based and Push-based GitOps?
*   **Answer**: In **Push-based** GitOps, a CI tool (like GitHub Actions or Jenkins) runs a command (e.g. `helm install` or `kubectl apply`) directly against the Kubernetes API server. This requires storing cluster credentials inside the CI runner. In **Pull-based** GitOps (e.g., ArgoCD or Flux), an agent runs inside the Kubernetes cluster and pulls updates from Git. No cluster credentials leave the cluster, which is significantly more secure.

### Q2: How does ArgoCD handle Drift Detection and Self-Healing?
*   **Answer**: ArgoCD regularly compares the live resource configurations in Kubernetes (queried via the API server) against the target manifests in the Git repository. If they differ (e.g., someone ran `kubectl scale --replicas=5`), ArgoCD marks the application status as `OutOfSync` (drift detected). If `selfHeal` is enabled, ArgoCD immediately applies a delta patch to restore the cluster state back to the Git specification.

### Q3: Why is a StatefulSet used for PostgreSQL rather than a standard Deployment?
*   **Answer**: A standard `Deployment` is designed for stateless applications. Its pods are interchangeable and receive random network identifiers and shared/ephemeral storage. A `StatefulSet` guarantees that each pod receives a persistent, ordinal identifier (e.g. `postgres-0`, `postgres-1`) that maps to a specific PersistentVolume. This guarantees data consistency and stable network names essential for database clustering.

### Q4: How does a Canary deployment differ from a Blue-Green deployment?
*   **Answer**: A **Blue-Green** deployment provisions two complete versions of the application (Blue is active, Green is preview). Once tests pass, the service router switches 100% of the traffic from Blue to Green instantly. A **Canary** deployment starts by sending a tiny fraction (e.g., 10%) of live traffic to the new version, while the remaining 90% goes to the stable version. Traffic is gradually shifted to 100% as health metrics are monitored.
