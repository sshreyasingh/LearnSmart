# LearnSmart — Authentication Module Architecture

---

## 1. Overview

The authentication module supports three parallel auth strategies that converge into a unified JWT-based session model. A user can authenticate via any provider (local, Google, GitHub) and optionally link multiple providers to the same account using email as the merge key.

```
                    ┌─────────────────────────┐
                    │     Auth Middleware      │
                    │  (JWT verify → req.user) │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Local Auth   │     │  Google OAuth │     │  GitHub OAuth │
│               │     │               │     │               │
│ POST /register│     │ GET /google   │     │ GET /github   │
│ POST /login   │     │ GET /google/  │     │ GET /github/  │
│               │     │   callback    │     │   callback    │
│ bcrypt hash   │     │ passport-     │     │ passport-     │
│ password      │     │ google-oauth20│     │ github2       │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Token Service    │
                    │                    │
                    │ generateAccessToken│
                    │ generateRefreshToken│
                    │ rotateTokenFamily  │
                    │ verifyToken        │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │    Token Storage   │
                    │                    │
                    │ Access: HTTP-only  │
                    │   cookie (optional)│
                    │ Refresh: DB-stored │
                    │   (hashed)         │
                    └────────────────────┘
```

---

## 2. Token Architecture

### 2.1 Access Token

| Property       | Value                          |
|----------------|--------------------------------|
| Format         | JWT (HS256)                    |
| Payload        | `{ sub, email, role, iat, exp }` |
| Expiry         | 15 minutes                     |
| Transmission   | `Authorization: Bearer <token>` |
| Secret         | `ACCESS_TOKEN_SECRET` env var  |

### 2.2 Refresh Token

| Property       | Value                          |
|----------------|--------------------------------|
| Format         | 64-byte cryptographically random hex string |
| Storage        | SHA-256 hash stored in `RefreshTokens` collection |
| Expiry         | 7 days                         |
| Transmission   | Request body (`{ refreshToken }`) |
| Rotation       | Each use invalidates the entire token **family** |

### 2.3 Token Family Rotation (Replay Attack Protection)

Each time a refresh token is used, the **entire family** is invalidated and a **new family** is issued. This prevents replay attacks — if an attacker steals a refresh token and uses it, the legitimate user's next refresh attempt will fail (family already revoked), alerting us to the breach.

```
User logs in → family: "abc", token: T1 (hashed)
User refreshes → family: "abc" invalidated → family: "def", token: T2 (hashed)
Attacker replays T1 → family "abc" already revoked → REJECTED
User refreshes with T2 → family: "def" invalidated → family: "ghi", token: T3 (hashed)
```

If the user ever presents a valid token from a revoked family, we revoke ALL refresh tokens for that user (forced re-login everywhere).

### 2.4 Token Flow Diagram

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  CLIENT  │         │  ROUTES  │         │  SERVICE │         │  MongoDB │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ POST /login        │                    │                    │
     │ {email, password}  │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │ validateUser()     │                    │
     │                    ├───────────────────>│                    │
     │                    │                    │ findUser(email)    │
     │                    │                    ├───────────────────>│
     │                    │                    │<───────────────────┤
     │                    │                    │ bcrypt.compare()   │
     │                    │                    │ genAccessToken()   │
     │                    │                    │ genRefreshToken()  │
     │                    │                    │ hashRefreshToken() │
     │                    │                    │ saveRefreshToken() │
     │                    │                    ├───────────────────>│
     │                    │<───────────────────┤                    │
     │<───────────────────┤                    │                    │
     │ {accessToken,      │                    │                    │
     │  refreshToken}     │                    │                    │
     │                    │                    │                    │
     │ ... 15 min later, access token expired ...                  │
     │                    │                    │                    │
     │ POST /refresh      │                    │                    │
     │ {refreshToken}     │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │ rotateTokenFamily()│                    │
     │                    ├───────────────────>│                    │
     │                    │                    │ hash incoming      │
     │                    │                    │ find family        │
     │                    │                    │ check not revoked  │
     │                    │                    │ revoke old family  │
     │                    │                    │ create new family  │
     │                    │                    │ gen new tokens     │
     │                    │                    ├───────────────────>│
     │                    │<───────────────────┤                    │
     │<───────────────────┤                    │                    │
     │ {accessToken,      │                    │                    │
     │  refreshToken}     │                    │                    │
```

---

## 3. OAuth Architecture

### 3.1 Google OAuth Flow

```
User -> GET /api/auth/google
  └─> Passport redirects to Google consent screen
      └─> Google redirects to /api/auth/google/callback?code=xxx
          └─> Passport exchanges code for tokens
              └─> Google profile returned: { id, displayName, emails, photos }
                  └─> Merge logic:
                      ├─> User exists with same email? LINK provider
                      ├─> User exists with same Google ID? LOGIN
                      ├─> New user? CREATE + LINK provider
                      └─> Issue JWT access + refresh tokens
                          └─> Redirect to frontend: /oauth/callback?access=xxx&refresh=xxx
```

### 3.2 GitHub OAuth Flow

Identical structure to Google, using `passport-github2`:

```
User -> GET /api/auth/github
  └─> Passport redirects to GitHub authorize screen
      └─> GitHub redirects to /api/auth/github/callback?code=xxx
          └─> Passport exchanges code for tokens
              └─> GitHub profile returned: { id, username, emails, photos }
                  └─> Merge logic (same as Google)
                      └─> Issue JWT access + refresh tokens
                          └─> Redirect to frontend: /oauth/callback?access=xxx&refresh=xxx
```

### 3.3 Provider Merge Logic

```
FIND user by providerId + provider
  ├─> FOUND → Login as this user (return tokens)
  └─> NOT FOUND
      └─> Has email from OAuth profile?
          ├─> YES → FIND user by email
          │       ├─> FOUND → Push { provider, providerId } to authProviders array
          │       │          → Login (provider linked)
          │       └─> NOT FOUND → CREATE new user with authProviders entry
          │                      → Login
          └─> NO (GitHub may not expose email)
              └─> CREATE new user with authProviders entry
                  └─> Login (user must verify/set email later)
```

### 3.4 Scopes Requested

| Provider | Scopes                                |
|----------|---------------------------------------|
| Google   | `profile`, `email`                    |
| GitHub   | `user:email` (for email), `read:user` |

---

## 4. Middleware Chain

### 4.1 Request Flow Through Middleware

```
INCOMING REQUEST
    │
    ▼
┌──────────────┐
│   Helmet     │  Security headers (CSP, HSTS, X-Frame-Options)
└──────┬───────┘
       ▼
┌──────────────┐
│     CORS     │  Allow frontend origin, credentials
└──────┬───────┘
       ▼
┌──────────────┐
│    Morgan    │  Request logging (dev: concise, prod: combined)
└──────┬───────┘
       ▼
┌──────────────┐
│ Body Parser   │  JSON (1mb limit) + URL-encoded
└──────┬───────┘
       ▼
┌──────────────┐
│ Rate Limiter  │  100 req/15min (general), 5 auth req/15min
└──────┬───────┘
       ▼
   ROUTER MATCH
       │
       ├── PUBLIC ROUTES (login, register, oauth)
       │       │
       │       ▼
       │   ┌──────────┐
       │   │ Validate  │  Zod schema validation on body/params
       │   └────┬─────┘
       │        ▼
       │   ┌──────────┐
       │   │ Controller│
       │   └──────────┘
       │
       └── PROTECTED ROUTES (projects, analysis, etc.)
               │
               ▼
           ┌──────────────┐
           │ authenticate  │  JWT verify → extract sub → fetch user → req.user
           │ middleware    │  If invalid/missing → 401
           └──────┬───────┘
                  ▼
           ┌──────────────┐
           │ projectOwner  │  (for project-scoped routes)
           │ ship          │  Verify req.user._id === project.userId → 403
           │ middleware    │
           └──────┬───────┘
                  ▼
           ┌──────────────┐
           │ Validate      │  Zod schema validation
           └──────┬───────┘
                  ▼
           ┌──────────────┐
           │ Controller    │
           └──────────────┘
```

---

## 5. Controller Design

### 5.1 `auth.controller.js` — Public Methods

| Method              | Route              | Description                                      | Input                        | Output                         |
|---------------------|--------------------|--------------------------------------------------|------------------------------|--------------------------------|
| `register`          | POST /auth/register| Create local account                              | `{ name, email, password }`  | `{ user, accessToken, refreshToken }` |
| `login`             | POST /auth/login   | Authenticate local credentials                    | `{ email, password }`        | `{ user, accessToken, refreshToken }` |
| `refreshToken`      | POST /auth/refresh | Rotate refresh token family, issue new tokens     | `{ refreshToken }`           | `{ accessToken, refreshToken }`      |
| `logout`            | POST /auth/logout  | Revoke all refresh token families for user         | (auth header)                | `{ message }`                        |
| `googleAuth`        | GET /auth/google   | Initiate Google OAuth (redirect)                  | —                            | 302 redirect to Google               |
| `googleCallback`    | GET /auth/google/callback | Handle Google OAuth callback              | query: `code`                | 302 redirect to frontend with tokens |
| `githubAuth`        | GET /auth/github   | Initiate GitHub OAuth (redirect)                  | —                            | 302 redirect to GitHub               |
| `githubCallback`    | GET /auth/github/callback | Handle GitHub OAuth callback              | query: `code`                | 302 redirect to frontend with tokens |
| `getMe`             | GET /auth/me       | Return current authenticated user                 | (auth header)                | `{ user }`                           |

---

## 6. Service Layer

### 6.1 `auth.service.js` — Internal Methods

```
IAuthService
├── hashPassword(plain: string): Promise<string>
├── comparePassword(plain: string, hash: string): Promise<boolean>
├── generateAccessToken(user: IUserPayload): string
├── generateRefreshToken(): string                    // 64 random hex bytes
├── hashToken(token: string): string                  // SHA-256
├── storeRefreshToken(userId, tokenHash, family): Promise<void>
├── rotateRefreshTokenFamily(incomingToken): Promise<{access, refresh, family}>
│     // 1. Hash incoming token
│     // 2. Look up in RefreshTokens collection
│     // 3. If not found → 401
│     // 4. If found but family already revoked → revoke ALL user tokens → 401
│     // 5. Revoke entire family
│     // 6. Create new family, store new token hash
│     // 7. Return new access + refresh tokens
├── revokeAllUserTokens(userId): Promise<void>
├── findOrCreateOAuthUser(profile, provider): Promise<IUser>
│     // Merge logic from section 3.3
└── sanitizeUser(user: IUser): ISafeUser
      // Strips password, authProviders.accessToken, refreshTokens
```

---

## 7. Validation Schemas (Zod)

### 7.1 `auth.validator.js`

```
registerSchema:
  name:     string, 2-100 chars, required
  email:    string, valid email, required, normalized (lowercase + trim)
  password: string, 8-128 chars, required
           .refine: must contain at least 1 uppercase, 1 lowercase, 1 digit

loginSchema:
  email:    string, valid email, required
  password: string, min 1, required

refreshSchema:
  refreshToken: string, min 64, required

oAuthQuerySchema (for callback routes):
  code:  string, required
  state: string, optional
  error: string, optional (if user denies consent, Google/GitHub attaches error)
```

---

## 8. Error Handling Matrix

| Scenario                                  | HTTP Status | Error Code              | Message                                    |
|-------------------------------------------|-------------|-------------------------|--------------------------------------------|
| Invalid credentials (login)               | 401         | `INVALID_CREDENTIALS`   | "Invalid email or password"                |
| Email already registered                  | 409         | `EMAIL_EXISTS`          | "An account with this email already exists"|
| Validation failure                        | 400         | `VALIDATION_ERROR`      | Zod error details in `errors[]`            |
| Missing/invalid access token              | 401         | `UNAUTHORIZED`          | "Authentication required"                  |
| Expired access token                      | 401         | `TOKEN_EXPIRED`         | "Access token expired"                     |
| Invalid refresh token                     | 401         | `INVALID_REFRESH`       | "Invalid refresh token"                    |
| Reused refresh token (replay attack)      | 401         | `TOKEN_REUSE_DETECTED`  | "Security alert: session terminated"       |
| OAuth consent denied                      | 400         | `OAUTH_DENIED`          | "Authentication was cancelled"             |
| OAuth provider error                      | 502         | `OAUTH_PROVIDER_ERROR`  | "Authentication provider unavailable"      |
| Account not linked to this OAuth provider | 403         | `PROVIDER_NOT_LINKED`   | "Account not linked to this provider"      |
| Rate limit exceeded                       | 429         | `RATE_LIMITED`          | "Too many requests, try again later"       |

---

## 9. Protected Route Pattern

Routes that require authentication use a two-tier protection system:

```
Tier 1: authenticate middleware
  - Verifies JWT in Authorization header
  - Fetches full user document from DB
  - Attaches req.user (sanitized — no password/hashes)
  - Fails with 401 if invalid/expired

Tier 2: projectOwnership middleware (select routes)
  - Compares req.user._id against project.userId
  - Fails with 403 if user doesn't own the resource
```

### 9.1 Extended Request Type

```typescript
// TypeScript interface (conceptual, for Express req augmentation)
interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'user' | 'admin';
  };
}
```

---

## 10. Frontend Auth Architecture

### 10.1 Token Storage Strategy

```
Access Token → localStorage (accessed by Axios interceptor)
Refresh Token → localStorage (accessed for /refresh calls only)
User Profile → AuthContext state (populated from /auth/me on app mount)
```

### 10.2 AuthContext State Machine

```
                    ┌─────────┐
                    │ LOADING │  (App mount — checking for existing tokens)
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │AUTH'D    │         │UNAUTH'D  │
        │user !=   │         │user = null│
        │null      │         └──────────┘
        └────┬─────┘
             │ logout()
             ▼
        ┌──────────┐
        │UNAUTH'D  │
        └──────────┘
```

### 10.3 Axios Interceptor Logic

```
REQUEST INTERCEPTOR:
  1. Read accessToken from localStorage
  2. If exists → attach Authorization: Bearer <token>
  3. Forward request

RESPONSE INTERCEPTOR (error path):
  1. If 401 && errorCode === 'TOKEN_EXPIRED':
     a. Read refreshToken from localStorage
     b. POST /api/auth/refresh { refreshToken }
     c. On success: save new tokens, retry original request
     d. On failure: clear tokens, redirect to /login
  2. If 401 && errorCode === 'TOKEN_REUSE_DETECTED':
     a. Immediately clear all tokens
     b. Redirect to /login with security alert message
  3. All other errors: reject normally
```

### 10.4 OAuth Callback Page

```
OAuthCallbackPage:
  1. Read ?access=xxx&refresh=yyy from URL query params
  2. Store tokens in localStorage
  3. Call GET /api/auth/me → populate AuthContext
  4. Redirect to /dashboard (or ?redirect= param if present)
  5. If query params missing/invalid → redirect to /login?error=oauth_failed
```

### 10.5 ProtectedRoute Component

```
ProtectedRoute:
  - Reads auth state from AuthContext
  - If LOADING → render LoadingSpinner
  - If UNAUTH'D → redirect to /login?redirect=<current_path>
  - If AUTH'D → render children (Outlet)
```

---

## 11. Route Definitions (Complete Auth Router)

```
ROUTER: /api/auth

POST   /register               → validate(registerSchema) → authController.register
POST   /login                  → validate(loginSchema)    → authController.login
POST   /refresh                → validate(refreshSchema)  → authController.refreshToken
POST   /logout                 → authenticate             → authController.logout
GET    /me                     → authenticate             → authController.getMe

GET    /google                 → passport.authenticate('google', { scope, session: false })
GET    /google/callback        → passport.authenticate('google', { session: false, failureRedirect })
                                  → authController.oAuthCallback('google')

GET    /github                 → passport.authenticate('github', { scope, session: false })
GET    /github/callback        → passport.authenticate('github', { session: false, failureRedirect })
                                  → authController.oAuthCallback('github')
```

---

## 12. Environment Variables (Auth-Only)

```
# JWT
ACCESS_TOKEN_SECRET=<64-char random>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=<64-char random>
REFRESH_TOKEN_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Frontend
CLIENT_URL=http://localhost:5173
```

---

## 13. File Dependency Graph (Auth Module)

```
server/src/
├── config/
│   ├── env.js                    ← reads all auth env vars, validates with Zod
│   ├── passport.js               ← GoogleStrategy + GitHubStrategy config
│   └── db.js                     ← (no auth dependency, but app.js needs it)
│
├── models/
│   ├── User.js                   ← schema with authProviders array
│   └── RefreshToken.js           ← schema with tokenHash, family, expiresAt
│
├── validators/
│   └── auth.validator.js         ← registerSchema, loginSchema, refreshSchema
│
├── services/
│   └── auth.service.js           ← ALL auth business logic (depends on User, RefreshToken models)
│
├── middleware/
│   ├── authenticate.js           ← JWT verify (depends on env.js for secret, User model)
│   ├── validate.js               ← generic Zod middleware (depends on nothing)
│   └── errorHandler.js           ← maps auth errors to HTTP responses
│
├── controllers/
│   └── auth.controller.js        ← thin layer: calls auth.service, formats response
│
├── routes/
│   └── auth.routes.js            ← wires routes → middleware → controller
│
└── app.js                        ← mounts authRouter at /api/auth
```

### Implementation Order (Build Sequence)

```
1. env.js              — All auth configuration must be available first
2. db.js               — Database connection (models need it)
3. AppError.js (utils) — Custom error class used by all layers
4. User.js (model)     — Schema definition
5. RefreshToken.js     — Schema definition
6. auth.validator.js   — Zod schemas (no dependencies)
7. auth.service.js     — Core business logic (depends on models)
8. authenticate.js     — JWT middleware (depends on User model + env)
9. validate.js         — Generic middleware (no dependencies)
10. errorHandler.js    — Error mapping (no dependencies)
11. passport.js        — OAuth strategy config (depends on env + User model)
12. auth.controller.js — Thin controller (depends on auth.service + passport)
13. auth.routes.js     — Wire everything together
14. app.js             — Mount router, apply global middleware
```
