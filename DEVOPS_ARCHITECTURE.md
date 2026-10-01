# 🎓 CloudPulse — DevOps & System Architecture Interview Defense Guide

This document explains **WHY** specific technical and architectural decisions were made for the **CloudPulse** platform, providing structured rationales for DevOps, Cloud, and SRE technical interviews.

---

## 🏛️ Architectural Rationales

### 1. Why Docker & Multi-Stage Builds?
* **Problem**: "It works on my machine" issues, environment drift, and bloated production image sizes.
* **Solution**: Multi-stage Docker builds compile TypeScript assets in a heavy builder stage and copy only minified artifacts to a minimal `node:20-alpine` or `nginx:alpine` runtime image.
* **Benefit**: Image size reduced from ~1.2GB to <120MB, eliminating build tools (`gcc`, `python`, `npm` devDependencies) from production, shrinking attack surface area.

### 2. Why Amazon ECR (Elastic Container Registry)?
* **Problem**: Storing proprietary container images in public registries poses severe security risks.
* **Solution**: ECR integrates directly with AWS IAM. EC2 instances pull images using ephemeral IAM instance profile tokens (`aws ecr get-login-password`), eliminating hardcoded registry credentials.

### 3. Why AWS Auto Scaling Group (ASG) & Application Load Balancer (ALB)?
* **Problem**: Single EC2 instances represent single points of failure (SPOF) and cannot handle traffic spikes.
* **Solution**: The ALB distributes inbound HTTP/HTTPS traffic across multi-AZ EC2 instances managed by an ASG. If an EC2 node fails health checks (`/health`), ASG automatically terminates it and spawns a fresh node via the Launch Template.

### 4. Why RDS PostgreSQL 16 instead of Containerized Database?
* **Problem**: Running production databases inside containers on EC2 introduces disk I/O bottlenecks and data loss risk during node termination.
* **Solution**: AWS RDS PostgreSQL provides automated automated failover, point-in-time recovery (PITR), encrypted storage at rest, and automated minor version patching.

### 5. Why Asynchronous Background Workers (Redis Queue)?
* **Problem**: Performing webhooks, SLA breach timer checks, and audit logging inside the main HTTP request thread blocks API latency and risks HTTP timeouts.
* **Solution**: Decoupled worker service handles SLA breach auto-escalations independently without blocking API response times.

### 6. Why Immutable Docker Image Tags (`${{ github.sha }}`)?
* **Problem**: Relying solely on `latest` leads to non-deterministic deployments where different nodes in an ASG pull different image builds.
* **Solution**: Tagging images with explicit Git Commit SHAs ensures strict immutability, auditability, and instantaneous rollback capability.

---

## 🔒 Security Architecture Highlights

```text
[ Internet ] ──(Port 80)──► [ ALB SG ] ──(Port 80)──► [ EC2 SG ] ──(Port 5432)──► [ RDS DB SG ]
```

* **Network Isolation**: Strict security group layering guarantees that the PostgreSQL database cannot be accessed directly from the internet.
* **Secrets Management**: Database passwords and JWT signing keys are stored as `SecureString` parameters in AWS SSM Parameter Store and fetched dynamically at container startup.
