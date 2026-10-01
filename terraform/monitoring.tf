# --- SNS Alert Topic & Email Subscription ---
resource "aws_sns_topic" "alerts" {
  name = "cloudpulse-alerts-topic"

  tags = {
    Name        = "CloudPulse-Alerts-Topic"
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "dakshprajapat1212@gmail.com"
}

# --- Alarm 1: ALB 5xx Server Errors ---
resource "aws_cloudwatch_metric_alarm" "alb_5xx_alarm" {
  alarm_name          = "CloudPulse-ALB-5xx-High"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Triggers when ALB encounters 5xx backend server errors."
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.production_tg.arn_suffix
    LoadBalancer = aws_lb.production_alb.arn_suffix
  }
}

# --- Alarm 2: ASG High CPU Utilization (> 85%) ---
resource "aws_cloudwatch_metric_alarm" "asg_high_cpu" {
  alarm_name          = "CloudPulse-ASG-CPU-High"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 85.0
  alarm_description   = "Triggers when ASG cluster CPU exceeds 85% for 4 minutes."
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.production_asg.name
  }
}

# --- Alarm 3: RDS PostgreSQL High CPU (> 80%) ---
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "CloudPulse-RDS-Postgres-CPU-High"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80.0
  alarm_description   = "Triggers when RDS PostgreSQL CPU exceeds 80%."
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.production_db.identifier
  }
}
