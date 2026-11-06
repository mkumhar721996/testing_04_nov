terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_db_subnet_group" "core" {
  name       = "core-nonprod"
  subnet_ids = var.private_subnet_ids
}

# Reachable only from the Core API and Background Worker.
resource "aws_security_group" "db" {
  name   = "core-nonprod-db"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.core_api_security_group_id, var.worker_security_group_id]
  }
}

# The single non-production PostgreSQL instance (no cross-region replica in this story).
resource "aws_db_instance" "core" {
  identifier                  = "core-nonprod"
  engine                      = "postgres"
  engine_version              = var.engine_version
  instance_class              = var.instance_class
  allocated_storage           = var.allocated_storage_gb
  db_name                     = "core_api"
  username                    = "core_admin"
  manage_master_user_password = true # credentials live in AWS Secrets Manager
  db_subnet_group_name        = aws_db_subnet_group.core.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  publicly_accessible         = false
  backup_retention_period     = 7
  storage_encrypted           = true
  skip_final_snapshot         = true
}
