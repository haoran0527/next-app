-- 数据库初始化脚本
-- 这个脚本会在 PostgreSQL 容器首次启动时执行

-- 创建数据库 (如果不存在)
SELECT 'CREATE DATABASE accounting_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'accounting_app')\gexec

-- 设置数据库配置
ALTER DATABASE accounting_app SET timezone TO 'UTC';

-- 创建扩展 (如果需要)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";