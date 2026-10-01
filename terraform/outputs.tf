output "alb_dns_name" {
  description = "Public DNS address of Application Load Balancer"
  value       = aws_lb.production_alb.dns_name
}

output "rds_postgresql_endpoint" {
  description = "Endpoint address of AWS RDS PostgreSQL instance"
  value       = aws_db_instance.production_db.endpoint
}

output "ecr_backend_url" {
  description = "AWS ECR Backend Image Repository URI"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_worker_url" {
  description = "AWS ECR Worker Image Repository URI"
  value       = aws_ecr_repository.worker.repository_url
}

output "ecr_frontend_url" {
  description = "AWS ECR Frontend Image Repository URI"
  value       = aws_ecr_repository.frontend.repository_url
}
