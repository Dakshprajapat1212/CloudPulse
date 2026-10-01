# 🛠️ CloudPulse — Production Incident & SRE Troubleshooting Playbook

This playbook outlines realistic failure scenarios, diagnostic commands, root cause analysis, and fixes for maintaining the CloudPulse platform in production.

---

## Scenario 1: Frontend Returns 502 Bad Gateway
* **Symptom**: Nginx returns HTTP 502 Bad Gateway when accessing `http://<ALB-DNS>/api/v1/incidents`.
* **Possible Causes**:
  1. Backend Node.js container is stopped or crashing.
  2. Nginx proxy destination (`http://backend:5000`) is unresolvable via Docker DNS.
* **Diagnostic Commands**:
  ```bash
  # Check container statuses
  docker ps -a

  # Check backend container logs for runtime exceptions
  docker logs cloudpulse_backend --tail 100

  # Test internal backend health check directly inside host
  curl -I http://localhost:5000/health
  ```
* **Fix**: Restart backend container and inspect DB connection string parameters.

---

## Scenario 2: Backend Container Kept Restarting (`exec format error`)
* **Symptom**: `docker ps` shows `cloudpulse_backend` constantly restarting; logs show `exec format error`.
* **Possible Cause**: Docker image was built on Apple Silicon (ARM64) without target platform specification and deployed to AWS EC2 (x86_64).
* **Fix**: Enforce `--platform linux/amd64` in build commands or GitHub Actions workflow:
  ```bash
  docker buildx build --platform linux/amd64 -t cloudpulse-backend:latest ./backend
  ```

---

## Scenario 3: Database Connection Refused (`ECONNREFUSED 5432`)
* **Symptom**: Backend logs show `Error: connect ECONNREFUSED <RDS-ENDPOINT>:5432`.
* **Possible Causes**:
  1. Security group ingress rule on `cloudpulse-db-sg` is missing EC2 security group ID.
  2. RDS instance is still in `creating` or `modifying` state.
* **Diagnostic Commands**:
  ```bash
  # Check port connectivity from EC2 host to RDS
  nc -zv -w 5 <RDS-ENDPOINT> 5432

  # Verify AWS Security Group rules via AWS CLI
  aws ec2 describe-security-groups --group-ids sg-xxxxxxxx
  ```
* **Fix**: Ensure `cloudpulse-db-sg` grants port 5432 ingress permission to `cloudpulse-ec2-sg`.

---

## Scenario 4: ECR Image Push Fails (`DenyAll` / Authorization Error)
* **Symptom**: `docker push 347181052564.dkr.ecr.us-east-1.amazonaws.com/cloudpulse-backend:latest` fails with `no basic auth credentials`.
* **Diagnostic Commands**:
  ```bash
  # Re-authenticate Docker client to AWS ECR
  aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 347181052564.dkr.ecr.us-east-1.amazonaws.com
  ```
* **Fix**: Verify AWS IAM CLI user or GitHub Actions secret has `ecr:GetAuthorizationToken` and `ecr:BatchCheckLayerAvailability` permissions.

---

## Scenario 5: High CPU Utilization Alarm Triggered (> 85%)
* **Symptom**: CloudWatch alarm `CloudPulse-ASG-CPU-High` triggers SNS email alert.
* **Diagnostic Commands**:
  ```bash
  # Inspect top processes by CPU on EC2 node
  top -b -n 1 | head -n 20

  # Check container stats
  docker stats --no-stream
  ```
* **Fix**: Scaling policy on ASG will automatically launch additional EC2 instances. Inspect backend query latency for unindexed database scans.

---

## Quick Reference Diagnostic Command Matrix

| Task | Command |
| :--- | :--- |
| **View Realtime Docker Logs** | `docker logs -f cloudpulse_backend` |
| **Inspect Container IP & Network** | `docker inspect cloudpulse_backend \| grep IPAddress` |
| **Check Active Listening Ports** | `ss -tulpn` or `netstat -tlpn` |
| **Verify Disk Space** | `df -h` |
| **Verify System Memory** | `free -m` |
| **Test ALB Health Endpoint** | `curl -i http://<ALB-DNS-NAME>/health` |
