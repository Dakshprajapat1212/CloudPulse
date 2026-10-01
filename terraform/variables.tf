variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 Instance type for Auto Scaling Group"
  type        = string
  default     = "t3.micro"
}
