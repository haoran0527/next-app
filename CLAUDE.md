<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **accounting application** (智能记账系统) built with Next.js 16, featuring user authentication, financial transaction management, and AI-powered natural language transaction parsing via Qwen (通义千问) API.

### Key Features
- User authentication with session-based auth (supports email or username login)
- Transaction management (income/expense tracking with categories)
- AI agent for parsing natural language into transaction records (e.g., "今天花了50元买午饭")
- **Voice recognition for smart accounting** (WeChat miniprogram only) - Record voice, transcribe with Qwen ASR, parse with AI
- Family groups for shared transaction tracking
- Admin panel for user management, audit logs, and system stats
- Data export functionality
- Multi-user data isolation and RBAC (USER/ADMIN roles)

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom session-based auth (bcryptjs for password hashing)
- **AI**: Qwen API via OpenAI-compatible endpoint (阿里云 DashScope)
- **Testing**: Vitest
- **Styling**: Tailwind CSS v4
- **Deployment**: Standalone output with subpath support (`/note` in production)

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server (Turbopack)
npm run dev:webpack     # Start with webpack instead of Turbopack

# Building
npm run build           # Build for production
npm start               # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format with Prettier
npm run format:check    # Check formatting

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes to database
npm run db:migrate      # Run migrations
npm run db:studio       # Open Prisma Studio
npm run db:seed         # Seed database

# Testing
npm run test            # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Run tests with UI
```

## Architecture

### Database Configuration
- Database connection is configured in `src/lib/prisma.ts`
- Uses connection pooling with `pg`
- Default: `localhost:5432/accounting_app` with user `postgres`
- Password via `POSTGRES_PASSWORD` env var (defaults to `postgres`)

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── transactions/         # Transaction CRUD
│   │   ├── agent/                # AI parsing endpoint
│   │   ├── admin/                # Admin-only endpoints
│   │   └── user/                 # User stats
│   ├── dashboard/                # Main dashboard page
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   └── admin/                    # Admin panel page
├── lib/
│   ├── services/                 # Business logic layer
│   │   ├── auth-service.ts       # Sign in/up, session management
│   │   ├── user-service.ts       # User CRUD operations
│   │   ├── session-service.ts    # Session validation
│   │   ├── transaction-service.ts
│   │   ├── agent-service.ts      # AI natural language parsing
│   │   ├── asr-service.ts        # Qwen ASR voice transcription
│   │   ├── admin-service.ts      # Admin operations
│   │   ├── data-access-control.ts # Data isolation wrapper
│   │   └── export-service.ts     # Data export
│   ├── middleware/               # API middleware
│   │   ├── auth-middleware.ts    # Auth & session validation
│   │   └── api-protection.ts     # Route protection wrappers
│   ├── types/                    # TypeScript types
│   ├── validation/               # Input validation schemas
│   └── prisma.ts                 # Prisma client singleton
└── test/                         # Integration tests
```

### Authentication & Authorization Flow

**Session Token Format**: Bearer token in Authorization header OR `session-token` cookie

**Middleware Hierarchy** (`src/lib/middleware/`):
1. `authMiddleware` - Extracts token, validates session, checks role
2. `withDataIsolation` - Creates SecureDataAccess instance for user
3. `withResourceAccess` - Validates ownership of specific resources
4. `withSecureAccess` - Combines auth + data isolation + resource access

**Data Access Control** (`src/lib/services/data-access-control.ts`):
- `SecureDataAccess` class ensures users can only access their own data
- Admins bypass data isolation filters
- Use `createSecureDataAccess(user)` to get an instance

### API Route Protection Pattern

Use the protection wrappers from `src/lib/middleware/api-protection.ts`:

```typescript
import { protectTransactionApi, protectAdminApi, protectUserApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'

// Transaction endpoints (with data isolation)
async function handler(request: NextRequest, user: User, secureDataAccess: any) {
  return secureDataAccess.getTransactions(filters)
}
export const GET = protectTransactionApi(handler, 'read')
export const POST = protectTransactionApi(handler, 'create')

// Admin endpoints (admin-only)
export const GET = protectAdminApi(adminHandler)

// User endpoints
export const GET = protectUserApi(userHandler, 'read')
```

### AI Agent Service

Located in `src/lib/services/agent-service.ts`:
- Uses DeepSeek API via OpenAI-compatible endpoint
- Configured via `OPENAI_API_KEY` and `OPENAI_BASE_URL` env vars
- Parses natural language into structured transactions
- Valid categories defined in `INCOME_CATEGORIES` and `EXPENSE_CATEGORIES`

### Voice Recognition (WeChat Miniprogram Only)

**Backend Services**:
- `src/lib/services/asr-service.ts` - Qwen ASR (qwen3-asr-flash-filetrans) integration
- `src/app/api/voice/upload/route.ts` - Temporary file upload endpoint
- `src/app/api/voice/asr/route.ts` - ASR transcription endpoint
- `src/app/api/voice/parse-transaction/route.ts` - Combined voice → text → transaction endpoint
- `src/lib/utils/file-utils.ts` - File management utilities (temp file cleanup)

**Miniprogram Implementation**:
- `miniprogram/pages/add/add.js` - Recording logic using `wx.getRecorderManager()`
- `miniprogram/pages/add/add.wxml` - Voice button and UI animations
- `miniprogram/pages/add/add.wxss` - Recording animations and styling
- Long-press microphone button to record (30s max, MP3 format)
- Voice → ASR → AI parsing → Transaction card

**Environment Variables** (in `.env`):
```
QWEN_ASR_API_KEY=your_qwen_asr_api_key
QWEN_ASR_FILE_TRANS_URL=https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription
```

### Multi-tenancy & Data Isolation

**Critical**: All database queries must respect user boundaries:
- Use `SecureDataAccess` instances for all transaction/user queries
- Never bypass `applyUserFilter()` for non-admin users
- Admin routes require `requiredRole: 'ADMIN'` in protection config

### Subpath Deployment

- `basePath` and `assetPrefix` set to `/note` in production (see `next.config.ts`)
- Automatically disabled in development
- All absolute URLs in code must account for this

## Environment Variables

Required in `.env`:
```
POSTGRES_PASSWORD=your_password
OPENAI_API_KEY=your_deepseek_api_key
OPENAI_BASE_URL=https://api.deepseek.com  # optional
QWEN_ASR_API_KEY=your_qwen_asr_api_key  # for voice recognition
QWEN_ASR_FILE_TRANS_URL=https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription
```

## Important Notes

- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts)
- Tests use Vitest with setup file at `src/test/setup.ts`
- Admin actions are logged via `audit-log-service.ts` (creates AdminLog records)
- All password hashing uses bcryptjs
- Session tokens are stored in the `sessions` table with expiration
