terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- Data Sources ---
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "availability-zone"
    values = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1f"]
  }
}

# --- AWS ECR Repositories ---
resource "aws_ecr_repository" "backend" {
  name                 = "cloudpulse-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "worker" {
  name                 = "cloudpulse-worker"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "cloudpulse-frontend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

# --- SSH Key Pair ---
resource "aws_key_pair" "deployer_key" {
  key_name   = "cloudpulse-deployer-key"
  public_key = file("~/.ssh/task_tutor_key.pub")
}

# --- Secrets & SSM Parameter Store ---
resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/cloudpulse/production/db_password"
  description = "PostgreSQL Master Password for CloudPulse"
  type        = "SecureString"
  value       = random_password.db_password.result
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/cloudpulse/production/jwt_secret"
  description = "JWT Signing Secret for CloudPulse Auth"
  type        = "SecureString"
  value       = random_password.jwt_secret.result
}

# --- IAM Role & Instance Profile ---
resource "aws_iam_role" "ec2_ecr_role" {
  name = "cloudpulse_ec2_ecr_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.ec2_ecr_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "ssm_read_only" {
  role       = aws_iam_role.ec2_ecr_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "ssm_managed_instance" {
  role       = aws_iam_role.ec2_ecr_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_ecr_profile" {
  name = "cloudpulse_ec2_ecr_profile"
  role = aws_iam_role.ec2_ecr_role.name
}

# --- Security Groups ---
resource "aws_security_group" "alb_sg" {
  name        = "cloudpulse-alb-sg"
  description = "Allow inbound HTTP/HTTPS traffic to Load Balancer"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ec2_sg" {
  name        = "cloudpulse-ec2-sg"
  description = "Allow HTTP traffic from ALB and SSH access"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db_sg" {
  name        = "cloudpulse-db-sg"
  description = "Allow PostgreSQL access from EC2 instances only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- AWS Managed RDS PostgreSQL Database ---
resource "aws_db_instance" "production_db" {
  allocated_storage      = 20
  max_allocated_storage  = 50
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.micro"
  db_name                = "cloudpulse_db"
  username               = "cloudpulse_admin"
  password               = random_password.db_password.result
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true

  tags = {
    Name        = "CloudPulse-Production-RDS-Postgres"
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# --- Application Load Balancer (ALB) ---
resource "aws_lb" "production_alb" {
  name               = "cloudpulse-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = data.aws_subnets.default.ids

  tags = {
    Name        = "CloudPulse-ALB"
    Environment = "Production"
  }
}

resource "aws_lb_target_group" "production_tg" {
  name        = "cloudpulse-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance"

  health_check {
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "front_end" {
  load_balancer_arn = aws_lb.production_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.production_tg.arn
  }
}

# --- Launch Template ---
resource "aws_launch_template" "production_lt" {
  name_prefix            = "cloudpulse-lt-"
  image_id               = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer_key.key_name
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_ecr_profile.name
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              set -e
              apt-get update -y
              apt-get install -y docker.io awscli jq

              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu

              # Authenticate Docker to ECR via IAM Instance Profile
              aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 347181052564.dkr.ecr.us-east-1.amazonaws.com

              # Fetch Secrets from SSM
              DB_PASS=$(aws ssm get-parameter --name "/cloudpulse/production/db_password" --with-decryption --region us-east-1 --query "Parameter.Value" --output text)
              JWT_SEC=$(aws ssm get-parameter --name "/cloudpulse/production/jwt_secret" --with-decryption --region us-east-1 --query "Parameter.Value" --output text)

              # DB Host from RDS Endpoint
              DB_HOST="${aws_db_instance.production_db.address}"

              # Create Shared Network
              docker network create cloudpulse_net || true

              # Run Redis Container
              docker run -d --name redis --network cloudpulse_net -p 6379:6379 --restart always redis:7-alpine

              # Pull Latest ECR Images
              docker pull 347181052564.dkr.ecr.us-east-1.amazonaws.com/cloudpulse-backend:latest
              docker pull 347181052564.dkr.ecr.us-east-1.amazonaws.com/cloudpulse-worker:latest
              docker pull 347181052564.dkr.ecr.us-east-1.amazonaws.com/cloudpulse-frontend:latest

              # Run Backend Container
              docker run -d \
                --name backend \
                --network cloudpulse_net \
                -e PORT=5000 \
                -e NODE_ENV=production \
                -e DB_HOST=$DB_HOST \
                -e DB_PORT=5432 \
                -e DB_NAME=cloudpulse_db \
                -e DB_USER=cloudpulse_admin \
                -e DB_PASSWORD=$DB_PASS \
                -e REDIS_HOST=redis \
                -e REDIS_PORT=6379 \
                -e JWT_SECRET=$JWT_SEC \
                --restart always \
                347181052564.dkr.ecr.us-east-1.amazonaws.com/cloudpulse-backend:latest

              # Run Worker Container
              docker run -d \
                --name worker \
                --network cloudpulse_net \
                -e DB_HOST=$DB_HOST \
                -e DB_PORT=5432 \
                -e DB_NAME=cloudpulse_db \
                -e DB_USER=cloudpulse_admin \
                -e DB_PASSWORD=$DB_PASS \
                -e REDIS_HOST=redis \
                -e REDIS_PORT=6379 \
                --restart always \
                347181052564.dkr.ecr.us-east-1.amazonaws.com/cloudpulse-worker:latest

              # Run Frontend Container
              docker run -d \
                --name frontend \
                --network cloudpulse_net \
                -p 80:80 \
                --restart always \
                347181052564.dkr.ecr.us-east-1.amazonaws.com/cloudpulse-frontend:latest
              EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "CloudPulse-ASG-Instance"
      Environment = "Production"
      ManagedBy   = "Terraform"
    }
  }
}

# --- Auto Scaling Group (ASG) ---
resource "aws_autoscaling_group" "production_asg" {
  name_prefix         = "cloudpulse-asg-"
  vpc_zone_identifier = data.aws_subnets.default.ids
  target_group_arns   = [aws_lb_target_group.production_tg.arn]

  min_size         = 1
  max_size         = 3
  desired_capacity = 2

  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.production_lt.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "CloudPulse-ASG-Node"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- Auto Scaling Policy 1: CPU > 70% Target Tracking ---
resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "cloudpulse-cpu-70-policy"
  autoscaling_group_name = aws_autoscaling_group.production_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }

    target_value = 70.0
  }
}

# --- Auto Scaling Policy 2: Real User Traffic (ALB Request Count Per Target) ---
resource "aws_autoscaling_policy" "alb_traffic_target_tracking" {
  name                   = "cloudpulse-alb-traffic-policy"
  autoscaling_group_name = aws_autoscaling_group.production_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.production_alb.arn_suffix}/${aws_lb_target_group.production_tg.arn_suffix}"
    }

    target_value = 1000.0
  }
}

