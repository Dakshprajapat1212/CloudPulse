# ⚡ CloudPulse — Enterprise Cloud Incident & SRE Alert Operations Platform

![CloudPulse Architecture](https://img.shields.io/badge/Architecture-Distributed_Microservices-0284c7)
![Build Status](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-emerald)
![AWS Deployment](https://img.shields.io/badge/AWS-ALB_--_ASG_--_RDS_PostgreSQL-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

**CloudPulse** is a production-grade SRE incident management, alert routing, and SLA compliance analytics platform designed for modern cloud infrastructure operations. It ingests monitoring alerts, automates incident state transitions (`TRIGGERED` ➔ `ACKNOWLEDGED` ➔ `RESOLVED`), evaluates SLA breach auto-escalations via background workers, logs immutable security audit trails, and delivers real-time MTTR/MTTA operational analytics.

---

## 🏗️ System Architecture

```text
                                [ User / Monitoring Webhooks ]
                                              │
                                              ▼
                             [ AWS Application Load Balancer ]
                                              │
                                              ▼
                                 [ Nginx Reverse Proxy / SPA ]
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │                                                 │
                     ▼                                                 ▼
        [ React + TS Frontend ]                               [ Node.js + TS REST API ]
                                                                       │
                                                       ┌───────────────┼───────────────┐
                                                       ▼               ▼               ▼
                                                 [ PostgreSQL ]    [ Redis ]    [ SSM Secrets ]
                                                       ▲               │
                                                       │               ▼
                                                       └── [ Async Worker Service ]
                                                            (SLA Auto-Escalation,
                                                             Timeline Audit Logs)
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios |
| **Backend API** | Node.js 20, TypeScript, Express, Winston Logger, JWT, bcryptjs, Helmet, Rate Limiter |
| **Async Worker** | Node.js 20, TypeScript, Redis 7, BullMQ Queue Engine |
| **Database** | PostgreSQL 16 (Relational Schema, Indexes, Foreign Keys, ACID Transactions) |
| **Infrastructure (IaC)** | Terraform 1.5+ (VPC, Security Groups, ALB, ASG Launch Templates, RDS PostgreSQL, ECR, SSM) |
| **Containerization** | Docker, Docker Compose, Multi-stage Builds (`linux/amd64` compatible), Nginx Alpine |
| **CI/CD** | GitHub Actions Workflow (`deploy.yml`), AWS ECR Container Registry, ASG Rolling Refresh |
| **Observability** | CloudWatch Metric Alarms (ALB 5xx, ASG CPU > 85%, RDS CPU > 80%), SNS Email Alerting |

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Launch with Docker Compose
```bash
cd cloudpulse
docker-compose up --build -d
```

### 2. Access Local Services
* **CloudPulse Web Dashboard**: `http://localhost:8080`
* **Node.js REST API**: `http://localhost:5000/api/v1`
* **Health Check**: `http://localhost:5000/health`
* **Readiness Check**: `http://localhost:5000/ready`

---

## 🧪 Testing

Run backend TypeScript unit and API integration tests:
```bash
cd backend
npm install
npm test
```

---

## ☁️ Infrastructure as Code (Terraform)

Provision complete production AWS infrastructure:

```bash
cd terraform

# 1. Initialize Terraform Providers
terraform init

# 2. Preview Infrastructure Execution Plan
terraform plan

# 3. Apply & Provision AWS Resources
terraform apply -auto-approve

# 4. Tear down infrastructure when finished
terraform destroy -auto-approve
```

### Explanation of Commands:
* `terraform init`: Downloads HashiCorp AWS & Random provider plugins and initializes the backend state context.
* `terraform plan`: Generates an execution plan by comparing desired state (`.tf` files) against actual cloud state.
* `terraform apply`: Executes API calls to AWS to create the VPC, RDS PostgreSQL instance, SSM Parameters, ALB, Launch Template, and ASG.
* `terraform destroy`: Safely terminates and cleans up all provisioned AWS cloud resources.

---

## 🔄 CI/CD Pipeline Workflow

The GitHub Actions workflow `.github/workflows/deploy.yml` enforces the following production pipeline:

```text
Push to main
   ↓
Verify Backend (npm test & tsc)
   ↓
Verify Frontend (npm run build)
   ↓
Authenticate with AWS ECR
   ↓
Build Multi-Stage Docker Images (linux/amd64)
   ↓
Tag Images with Commit SHA + 'latest'
   ↓
Push to Amazon ECR Repositories
   ↓
Trigger Zero-Downtime ASG Instance Refresh
```

---

## 🔒 Security Practices
1. **Zero Secret Hardcoding**: Secrets generated dynamically via `random_password` and stored in AWS SSM Parameter Store (`SecureString`).
2. **Role-Based Access Control (RBAC)**: Fine-grained permissions enforced across endpoints (`ADMIN`, `SRE_MANAGER`, `RESPONDER`, `OBSERVER`).
3. **Database Security**: RDS PostgreSQL isolated inside a private security group allowing inbound port 5432 access solely from EC2 cluster instances.
