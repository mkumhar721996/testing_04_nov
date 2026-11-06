terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# The single non-production PostgreSQL instance. No replica in this environment.
resource "aws_db_instance" "core" {
  identifier              = "core-${var.environment}"
  engine                  = "postgres"
  engine_version          = var.engine_version
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage_gb
  db_name                 = "core_api"
  username                = var.db_username

  # RDS generates the master password and stores it in Secrets Manager; it never enters Terraform
  # variables or config.
  manage_master_user_password = true

  db_subnet_group_name    = var.db_subnet_group_name
  vpc_security_group_ids  = var.security_group_ids
  publicly_accessible     = false
  storage_encrypted       = true
  backup_retention_period = var.backup_retention_days
  skip_final_snapshot     = true

  tags = {
    Environment = var.environment
  }
}
