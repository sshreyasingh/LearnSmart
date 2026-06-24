# LearnSmart — Technology Detection Engine Architecture

---

## 1. Overview

The Technology Detection Engine scans uploaded projects and identifies every technology used with a **confidence score (0.0–1.0)**. It works across 7 categories using layered detection signals — config files, AST patterns, file counts, directory structure, and stack heuristics. The engine does not rely on AI for detection; it uses deterministic rules for speed and accuracy, then feeds detected technologies as structured context into the AI prompts.

```
┌─────────────────────────────────────────────────────────────────┐
│                  TECHNOLOGY DETECTION ENGINE                     │
│                                                                  │
│  Input:                                                          │
│  ├── parsedFiles[]       (from parser.service)                  │
│  ├── fileTree            (from file.service)                    │
│  ├── configFiles[]       (already parsed)                       │
│  └── rawFileList[]       (all file paths + extensions)          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Layers (executed in order):                                    │
│                                                                  │
│  L1: Config Signatures     →  package.json, requirements.txt,   │
│                                pom.xml, Cargo.toml, etc.         │
│                                                                  │
│  L2: Code Pattern Matching →  import statements, API usage,     │
│                                framework-specific patterns       │
│                                                                  │
│  L3: File Heuristics       →  extension counts, directory       │
│                                names, config file presence        │
│                                                                  │
│  L4: Stack Recognition     →  known stack combinations          │
│                                (MERN, MEAN, JAMstack, LAMP, etc.)│
│                                                                  │
│  L5: Confidence Scoring    →  combine all signals, normalize    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Output:                                                         │
│  └── DetectedTechnologies[]  (categorized + scored)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Detection Signal Architecture

Every technology is detected through one or more **signals**. A signal is a piece of evidence found in the project. Signals have **weights** — stronger signals contribute more to the confidence score.

### 2.1 Signal Types

```
SIGNAL TYPE          WEIGHT    EXAMPLE
──────────────────   ──────    ──────────────────────────────────
config_explicit      1.00      "react" in package.json dependencies
config_implicit      0.70      "react" in peerDependencies
import_statement     0.80      import React from 'react'
require_statement    0.70      const express = require('express')
framework_structure  0.85      /pages/ directory (Next.js)
file_extension       0.30      *.tsx files detected
config_file_present  0.60      tailwind.config.js exists
build_tool_present   0.50      webpack.config.js exists
deploy_file_present  0.60      Dockerfile exists
test_file_pattern    0.55      *.test.tsx files found
code_pattern         0.65      useEffect( → React
comment_reference    0.20      // Using Express 4.x
```

### 2.2 Signal Combinator

Multiple signals for the same technology are combined into a confidence score:

```
confidence = min(1.0, sum of signal weights for confirmed signals) / max_possible

OR (for technologies where ANY strong signal suffices):

confidence = max(signal_weights) + (0.1 × count of additional signals)
```

The scoring strategy is per-technology, chosen based on detection reliability.

---

## 3. Technology Registry

Each technology in the detection database has:

```typescript
interface TechnologyRule {
  name: string;                        // "React", "Express.js", "PostgreSQL"
  category: 'frontend' | 'backend' | 'database' | 'auth' |
            'deployment' | 'cloud' | 'testing' | 'language' |
            'framework' | 'library' | 'tool' | 'build';
  signals: DetectionSignal[];          // patterns to search for
  minConfidence: number;               // threshold to report as detected (default 0.4)
  aliases: string[];                   // alternative names (e.g., "React.js", "ReactJS")
  parent?: string;                     // parent technology (e.g., "React" parent of "React Router")
  mutuallyExclusive?: string[];        // technologies that contradict this one
}
```

---

## 4. Category-Level Detection Strategies

### 4.1 Frontend Detection

```
Technology        Detection Signals
──────────        ────────────────────────────────────────────
React             1. package.json: "react" in dependencies          (1.00)
                  2. import React from 'react'                      (0.80)
                  3. *.jsx/*.tsx extensions present                 (0.40)
                  4. react-dom in dependencies                      (0.90)
                  5. hooks pattern: useXxx() calls                  (0.50)

Vue.js            1. package.json: "vue" in dependencies            (1.00)
                  2. *.vue files present                            (0.85)
                  3. new Vue({ or createApp(                        (0.80)
                  4. <template> in .vue files                       (0.90)

Angular           1. package.json: "@angular/core"                  (1.00)
                  2. @Component decorator                           (0.85)
                  3. angular.json exists                            (0.90)
                  4. *.component.ts pattern                         (0.60)

Next.js           1. package.json: "next" in dependencies           (1.00)
                  2. /pages/ or /app/ directory with page files     (0.85)
                  3. next.config.js exists                          (0.85)
                  4. getServerSideProps / getStaticProps            (0.70)

Svelte            1. package.json: "svelte" in dependencies         (1.00)
                  2. *.svelte files present                         (0.90)
                  3. <script> in .svelte files                      (0.60)

Tailwind CSS      1. package.json: "tailwindcss"                    (1.00)
                  2. tailwind.config.js exists                      (0.90)
                  3. className="... (utility classes pattern)       (0.30)
                  4. postcss.config.js with tailwindcss plugin      (0.60)

Bootstrap         1. package.json: "bootstrap"                      (1.00)
                  2. class="container" or class="row" patterns      (0.40)
                  3. @import "bootstrap" in SCSS                    (0.50)

Material UI       1. package.json: "@mui/material"                  (1.00)
                  2. import { Button } from '@mui/material'         (0.70)
                  3. <Typography>, <Grid> JSX patterns              (0.50)

Chakra UI         1. package.json: "@chakra-ui/react"               (1.00)
                  2. import { Box } from '@chakra-ui/react'         (0.70)

Redux             1. package.json: "redux" + "react-redux"          (1.00)
                  2. import { createSlice } from '@reduxjs/toolkit' (0.80)
                  3. /store/ or /redux/ directory                   (0.50)

Zustand           1. package.json: "zustand"                        (1.00)
                  2. import { create } from 'zustand'               (0.80)

React Router      1. package.json: "react-router-dom"               (1.00)
                  2. import { BrowserRouter }                       (0.70)
                  3. <Route path="... patterns                      (0.60)

Axios             1. package.json: "axios"                          (1.00)
                  2. import axios from 'axios'                      (0.80)

React Query       1. package.json: "@tanstack/react-query"          (1.00)
                  2. import { useQuery }                            (0.70)

Vite              1. package.json: "vite" in devDependencies        (1.00)
                  2. vite.config.js/js/ts exists                    (0.90)
                  3. package.json "type": "module" + vite          (0.30)

Webpack           1. package.json: "webpack"                        (1.00)
                  2. webpack.config.js exists                       (0.90)

TypeScript        1. package.json: "typescript"                     (1.00)
                  2. tsconfig.json exists                           (0.85)
                  3. *.ts / *.tsx files present                     (0.60)

JavaScript        1. *.js / *.jsx files present                     (0.80)
                  2. No tsconfig.json + no *.ts files               (0.60)

HTML/CSS          1. *.html files present                           (0.80)
                  2. *.css files present                            (0.50)

SCSS/SASS         1. package.json: "sass"                           (1.00)
                  2. *.scss or *.sass files present                 (0.80)
```

---

### 4.2 Backend Detection

```
Technology        Detection Signals
──────────        ────────────────────────────────────────────
Node.js           1. package.json exists with "main" field          (0.90)
                  2. require() or import of Node builtins           (0.60)
                  3. package.json "engines": { "node": "..." }      (0.80)
                  4. server.js / index.js as entry point            (0.40)

Express.js        1. package.json: "express"                        (1.00)
                  2. const app = express()                          (0.85)
                  3. app.listen( or app.get( patterns               (0.70)
                  4. /routes/ directory with router files           (0.40)

Fastify           1. package.json: "fastify"                        (1.00)
                  2. const fastify = require('fastify')             (0.80)

NestJS            1. package.json: "@nestjs/core"                   (1.00)
                  2. @Module, @Controller decorators                (0.85)
                  3. nest-cli.json exists                           (0.80)

Django            1. requirements.txt: "django"                     (1.00)
                  2. manage.py exists                               (0.90)
                  3. settings.py with DJANGO_SETTINGS               (0.85)
                  4. /urls.py files present                         (0.60)

Flask             1. requirements.txt: "flask"                      (1.00)
                  2. from flask import Flask                        (0.85)
                  3. app = Flask(__name__)                           (0.80)

FastAPI           1. requirements.txt: "fastapi"                    (1.00)
                  2. from fastapi import FastAPI                    (0.85)
                  3. @app.get( or @app.post( patterns               (0.70)

Spring Boot       1. pom.xml: spring-boot-starter-parent            (1.00)
                  2. @SpringBootApplication annotation              (0.85)
                  3. application.properties / application.yml       (0.70)

.NET              1. *.csproj files present                         (0.90)
                  2. Program.cs with WebApplication.CreateBuilder   (0.85)
                  3. package.json: no, but *.cs files               (0.60)

Laravel           1. composer.json: "laravel/framework"             (1.00)
                  2. artisan file present                           (0.90)
                  3. /routes/web.php pattern                        (0.70)

Ruby on Rails     1. Gemfile: "rails"                               (1.00)
                  2. /app/controllers/ directory                    (0.70)
                  3. config/routes.rb exists                        (0.70)

Go                1. go.mod exists                                  (0.95)
                  2. package main + func main()                     (0.70)
                  3. *.go files present                             (0.80)

Gin (Go)          1. go.mod: "github.com/gin-gonic/gin"             (1.00)
                  2. gin.Default() or gin.New()                     (0.80)

GraphQL           1. package.json: "graphql" or "apollo-server"     (1.00)
                  2. *.graphql files present                        (0.85)
                  3. import { ApolloServer }                        (0.70)
                  4. typeDefs / resolvers patterns                  (0.50)

REST API          1. app.get(, app.post(, router.get( patterns      (0.60)
                  2. res.json( or res.send( patterns                (0.50)
                  3. /api/ routes                                   (0.40)

WebSocket         1. package.json: "ws" or "socket.io"              (1.00)
                  2. new WebSocket( or io.on('connection'           (0.70)

gRPC              1. *.proto files present                          (0.90)
                  2. package.json: "@grpc/grpc-js"                  (1.00)

tRPC              1. package.json: "@trpc/server"                   (1.00)
                  2. import { initTRPC }                            (0.80)
```

---

### 4.3 Database Detection

```
Technology        Detection Signals
──────────        ────────────────────────────────────────────
MongoDB           1. package.json: "mongoose" or "mongodb"         (1.00)
                  2. mongoose.connect( or MongoClient              (0.85)
                  3. /models/ directory with Schema definitions    (0.50)
                  4. docker-compose with mongo image               (0.60)

PostgreSQL        1. package.json: "pg" or "postgres"              (1.00)
                  2. requirements.txt: "psycopg2"                  (1.00)
                  3. pom.xml: "postgresql" driver                  (1.00)
                  4. docker-compose with postgres image            (0.70)
                  5. .env with DATABASE_URL=postgres://            (0.60)
                  6. /migrations/ directory                        (0.40)

MySQL             1. package.json: "mysql2" or "mysql"             (1.00)
                  2. requirements.txt: "mysql-connector"           (1.00)
                  3. docker-compose with mysql image               (0.70)
                  4. .env with DATABASE_URL=mysql://               (0.60)

SQLite            1. requirements.txt: "sqlite3"                   (0.90)
                  2. sqlite3.Database( or sqlite3.connect(         (0.80)
                  3. *.sqlite or *.db files present                (0.85)
                  4. package.json: "better-sqlite3"                (1.00)

Redis             1. package.json: "redis" or "ioredis"            (1.00)
                  2. redis.createClient( pattern                   (0.75)
                  3. docker-compose with redis image               (0.60)

Prisma            1. package.json: "prisma"                        (1.00)
                  2. /prisma/schema.prisma exists                  (0.95)
                  3. prisma generate references                    (0.60)

TypeORM           1. package.json: "typeorm"                       (1.00)
                  2. @Entity() decorator pattern                   (0.80)
                  3. ormconfig.json exists                         (0.75)

Sequelize         1. package.json: "sequelize"                     (1.00)
                  2. Sequelize constructor pattern                 (0.80)
                  3. .sequelizerc exists                           (0.70)

Firebase/Firestore 1. package.json: "firebase" or "firebase-admin" (1.00)
                  2. import { initializeApp } from 'firebase/app'  (0.70)
                  3. firebase.json exists                          (0.80)

DynamoDB          1. package.json: "@aws-sdk/client-dynamodb"      (1.00)
                  2. DynamoDBClient constructor                    (0.75)

Cassandra         1. package.json: "cassandra-driver"              (1.00)

Elasticsearch     1. package.json: "@elastic/elasticsearch"        (1.00)
                  2. docker-compose with elasticsearch image       (0.60)
```

---

### 4.4 Authentication Detection

```
Technology        Detection Signals
──────────        ────────────────────────────────────────────
JWT               1. package.json: "jsonwebtoken"                  (1.00)
                  2. jwt.sign( or jwt.verify( patterns             (0.85)
                  3. package.json: "@nestjs/jwt"                   (1.00)
                  4. /auth/ directory with jwt references          (0.40)

Passport.js       1. package.json: "passport"                      (1.00)
                  2. require('passport') pattern                   (0.85)
                  3. passport.authenticate( or passport.use(       (0.80)

OAuth 2.0         1. package.json: "passport-google-oauth20" or    (0.95)
                      "passport-github2" or "passport-oauth2"
                  2. GOOGLE_CLIENT_ID in .env                      (0.70)
                  3. /auth/google/callback routes                  (0.60)

Auth0             1. package.json: "@auth0/auth0-react" or         (1.00)
                      "express-openid-connect"
                  2. useAuth0() hook pattern                       (0.70)

NextAuth          1. package.json: "next-auth"                     (1.00)
                  2. [...nextauth].js/ts route file                (0.80)

Firebase Auth     1. package.json: "firebase" + auth imports       (0.90)
                  2. getAuth( or signInWithEmailAndPassword(       (0.70)

Clerk             1. package.json: "@clerk/clerk-react"            (1.00)
                  2. <ClerkProvider> or useAuth() from clerk       (0.70)

bcrypt            1. package.json: "bcrypt" or "bcryptjs"          (0.90)
                  2. bcrypt.hash( or bcrypt.compare(               (0.70)

Session-based     1. express-session or cookie-session             (0.85)
                  2. req.session usage patterns                    (0.60)
                  3. No JWT library detected (negative signal)     (0.30)

CSRF Protection   1. package.json: "csurf" or helmet.csrf()        (0.80)
                  2. _csrf token patterns in templates             (0.50)
```

---

### 4.5 Deployment Detection

```
Technology        Detection Signals
──────────        ────────────────────────────────────────────
Docker            1. Dockerfile exists                              (0.95)
                  2. docker-compose.yml exists                     (0.90)
                  3. docker-compose.yaml exists                    (0.90)
                  4. .dockerignore exists                          (0.70)

Kubernetes        1. /k8s/ or /kubernetes/ directory               (0.80)
                  2. *.yaml files with kind: Deployment            (0.90)
                  3. Helm chart (Chart.yaml)                       (0.85)

NGINX             1. nginx.conf exists                             (0.90)
                  2. Dockerfile FROM nginx                         (0.70)
                  3. /nginx/ directory                             (0.60)

Apache            1. .htaccess file exists                         (0.90)
                  2. httpd.conf or apache2/ directory              (0.85)

Vercel            1. vercel.json exists                            (0.90)
                  2. package.json: "vercel" or @vercel/ packages   (0.85)

Netlify           1. netlify.toml exists                           (0.90)
                  2. _redirects or _headers files                  (0.70)

Heroku            1. Procfile exists                               (0.90)
                  2. package.json: "heroku" scripts                (0.50)

AWS               1. package.json: "aws-sdk" or "@aws-sdk/"        (0.85)
                  2. serverless.yml exists                         (0.80)
                  3. .aws/ directory                               (0.70)
                  4. AWS_ACCESS_KEY in .env                        (0.50)

GCP               1. package.json: "@google-cloud/" packages       (0.90)
                  2. app.yaml exists (App Engine)                  (0.80)
                  3. GOOGLE_APPLICATION_CREDENTIALS references     (0.60)

Azure             1. package.json: "@azure/" packages              (0.90)
                  2. azure-pipelines.yml exists                    (0.80)

Railway           1. railway.json or railway.toml                  (0.85)

Render            1. render.yaml exists                            (0.85)

GitHub Actions    1. .github/workflows/*.yml exists                (0.95)

GitLab CI         1. .gitlab-ci.yml exists                         (0.95)

CircleCI          1. .circleci/config.yml exists                   (0.90)

Jenkins           1. Jenkinsfile exists                            (0.90)

PM2               1. package.json: "pm2"                           (0.85)
                  2. ecosystem.config.js exists                    (0.80)
```

---

### 4.6 Cloud Detection

```
Technology        Detection Signals
──────────        ────────────────────────────────────────────
AWS S3            1. package.json: "@aws-sdk/client-s3"            (0.95)
                  2. s3.upload( or S3Client patterns              (0.70)

AWS Lambda        1. serverless.yml with provider: aws             (0.85)
                  2. exports.handler = async (event)               (0.60)
                  3. package.json: "aws-lambda"                    (0.70)

AWS DynamoDB      1. package.json: "@aws-sdk/client-dynamodb"      (0.95)

AWS API Gateway   1. serverless.yml with http events               (0.70)

AWS EC2           1. (detected indirectly via AWS SDK usage)

GCP Cloud Run     1. Dockerfile + app.yaml combination             (0.60)

GCP Functions     1. (detected via @google-cloud/functions)        (0.90)

Firebase          1. package.json: "firebase" or "firebase-admin"  (0.90)
                  2. firebase.json exists                          (0.90)
                  3. firebaseConfig pattern                        (0.60)

Cloudflare        1. wrangler.toml exists                          (0.90)
                  2. package.json: "wrangler"                      (0.85)

Supabase          1. package.json: "@supabase/supabase-js"         (0.95)
                  2. supabase.from( pattern                        (0.70)

PlanetScale       1. DATABASE_URL=mysql://...psdb.cloud            (0.70)
                  2. package.json: "@planetscale/database"         (0.90)

Upstash           1. package.json: "@upstash/redis"                (0.85)
```

---

### 4.7 Testing Detection

```
Technology        Detection Signals
──────────        ────────────────────────────────────────────
Jest              1. package.json: "jest"                          (1.00)
                  2. jest.config.js/ts exists                      (0.90)
                  3. *.test.js/ts or *.spec.js/ts files            (0.70)
                  4. __tests__/ directory                          (0.60)

Vitest            1. package.json: "vitest"                        (1.00)
                  2. vitest.config.ts exists                       (0.85)
                  3. import { describe, it, expect } from 'vitest' (0.70)

Mocha             1. package.json: "mocha"                         (1.00)
                  2. .mocharc.js/yml/json exists                   (0.75)

Jasmine           1. package.json: "jasmine"                       (1.00)
                  2. jasmine.json exists                           (0.80)

Pytest            1. requirements.txt: "pytest"                    (1.00)
                  2. pytest.ini or pyproject.toml [tool.pytest]    (0.80)
                  3. test_*.py or *_test.py pattern                (0.70)

JUnit             1. pom.xml: "junit"                              (1.00)
                  2. @Test annotation in Java files                (0.80)

Cypress           1. package.json: "cypress"                       (1.00)
                  2. cypress.config.js/ts exists                   (0.90)
                  3. /cypress/ directory                           (0.80)

Playwright        1. package.json: "@playwright/test"              (1.00)
                  2. playwright.config.ts exists                   (0.90)

Selenium          1. requirements.txt: "selenium"                  (0.95)
                  2. package.json: "selenium-webdriver"            (0.95)

React Testing     1. package.json: "@testing-library/react"        (0.95)
Library           2. render( from @testing-library/react            (0.70)

Supertest         1. package.json: "supertest"                     (0.95)
                  2. request(app).get( patterns                    (0.60)

Storybook         1. package.json: "@storybook/react"              (0.95)
                  2. .storybook/ directory exists                  (0.85)

ESLint            1. package.json: "eslint"                        (0.95)
                  2. .eslintrc.* or eslint.config.* exists         (0.90)

Prettier          1. package.json: "prettier"                      (0.90)
                  2. .prettierrc or prettier.config.* exists       (0.85)

Husky             1. package.json: "husky"                         (0.90)
                  2. .husky/ directory exists                      (0.85)

Lighthouse        1. package.json: "lighthouse"                    (0.80)
```

---

## 5. Stack Recognition (MERN, MEAN, LAMP, etc.)

After individual technologies are detected, the engine checks for known **stack combinations**. A stack match boosts individual technology confidence and provides a named stack label.

### 5.1 Known Stacks

```
STACK          REQUIRED TECHNOLOGIES                         BONUS
─────          ─────────────────────                         ─────
MERN           MongoDB + Express.js + React + Node.js        +0.10 to all four
MEAN           MongoDB + Express.js + Angular + Node.js      +0.10 to all four
MEVN           MongoDB + Express.js + Vue.js + Node.js       +0.10 to all four
PERN           PostgreSQL + Express.js + React + Node.js     +0.10 to all four
JAMstack       JavaScript + API (REST/GraphQL) + Markup      +0.05
T3             TypeScript + Next.js + tRPC + Prisma +        +0.15 to all
               Tailwind (3+ of 5 required)
LAMP           Linux + Apache + MySQL + PHP                  +0.10
Django Stack   Django + PostgreSQL + Redis + Celery          +0.10
Spring Stack   Spring Boot + (MySQL|PostgreSQL) + Maven      +0.10
Ruby Stack     Rails + PostgreSQL + Redis + Sidekiq          +0.10
Serverless     AWS Lambda + API Gateway + DynamoDB           +0.10
Go Stack       Go + Gin/Fiber + PostgreSQL + Docker          +0.05
```

### 5.2 Stack Detection Algorithm

```
1. Score each individual technology (confidence from signals)

2. For each known stack:
   a. Check how many required technologies have confidence >= 0.4
   b. If ALL required technologies detected:
      - Boost each by bonus amount
      - Report stack as detected
   c. If >= 80% detected (partial stack):
      - Report as "partial match" with lower confidence
      - Don't boost but flag for AI context

3. Resolve conflicts:
   - MERN vs MEAN vs MEVN → strongest frontend framework wins
   - Multiple stacks possible if project is monorepo
```

---

## 6. Confidence Scoring Engine

### 6.1 Scoring Algorithm

```
For each technology T with signals S[1..n]:

  1. confirmed_signals = S.filter(s => s.pattern matches in project)
  2. total_weight = sum(s.weight for s in confirmed_signals)
  3. max_possible = sum(s.weight for s in S)
  
  4. base_confidence = total_weight / max_possible
  
  5. Apply modifiers:
     a. If technology has parent AND parent detected → multiply by 1.2
     b. If mutually exclusive tech detected → multiply by 0.1
     c. If part of detected stack → add stack_bonus
     d. If only weak signals (all < 0.5 weight) → multiply by 0.7
  
  6. final_confidence = clamp(base_confidence * modifiers + bonuses, 0, 1)

CLASSIFICATION:
  0.90 – 1.00  →  DEFINITE     (green)
  0.70 – 0.89   →  HIGH         (green)
  0.50 – 0.69   →  MEDIUM       (yellow)
  0.30 – 0.49   →  LOW          (orange)
  0.00 – 0.29   →  SPECULATIVE  (grey — not reported unless all else low)
```

### 6.2 Conflict Resolution

```
When two technologies are mutually exclusive and both detected:

Example: Vite AND Webpack both detected
  Resolution: Choose the one with higher confidence
              If within 0.1 of each other → report both with "conflict" flag

Example: Prisma AND TypeORM both detected
  Resolution: Possible (some projects use both). Report both.
              But ORMs are NOT mutually exclusive unless explicitly marked.
```

---

## 7. Output Data Structure

```typescript
interface DetectedTechnology {
  name: string;                        // e.g., "React"
  category: string;                    // frontend, backend, database, auth, deployment, cloud, testing
  confidence: number;                  // 0.0 – 1.0
  classification: 'definite' | 'high' | 'medium' | 'low' | 'speculative';
  evidence: {                          // what proved this detection
    signals: string[];                 // ["package.json dependency", "import statement", ...]
    files: string[];                   // specific files that contained evidence
    configMatch?: string;             // e.g., "package.json: dependencies.react = ^18.2"
  };
  version?: string;                    // detected version if available
  parent?: string;                     // e.g., parent of React Router is React
  isPrimary: boolean;                  // is this a primary technology of the project?
}

interface StackDetection {
  name: string;                        // e.g., "MERN Stack"
  technologies: string[];              // ["MongoDB", "Express.js", "React", "Node.js"]
  matchType: 'full' | 'partial';       // all required vs >=80%
  confidence: number;
}

interface DetectionReport {
  frontend: DetectedTechnology[];
  backend: DetectedTechnology[];
  database: DetectedTechnology[];
  authentication: DetectedTechnology[];
  deployment: DetectedTechnology[];
  cloud: DetectedTechnology[];
  testing: DetectedTechnology[];
  languages: DetectedTechnology[];
  tools: DetectedTechnology[];
  stacks: StackDetection[];
  
  summary: {
    totalTechnologies: number;
    primaryLanguage: string;
    primaryFramework: string;
    primaryDatabase: string;
    hasAuthentication: boolean;
    hasTesting: boolean;
    deploymentMethod: string;
  };
}
```

---

## 8. Service Interface

```
ITechDetectionService
├── detectAll(parsedFiles, fileTree, configFiles, rawFileList): Promise<DetectionReport>
│     Runs all detection layers, returns categorized + scored report
│
├── detectFrontend(parsedFiles, configFiles): DetectedTechnology[]
├── detectBackend(parsedFiles, configFiles): DetectedTechnology[]
├── detectDatabase(parsedFiles, configFiles, fileTree): DetectedTechnology[]
├── detectAuthentication(parsedFiles, configFiles): DetectedTechnology[]
├── detectDeployment(fileTree, configFiles): DetectedTechnology[]
├── detectCloud(parsedFiles, configFiles): DetectedTechnology[]
├── detectTesting(parsedFiles, configFiles, fileTree): DetectedTechnology[]
│
├── detectStacks(detected: DetectedTechnology[]): StackDetection[]
│
├── computeConfidence(technology, confirmedSignals): number
├── classifyConfidence(score: number): string
│
└── generateDetectionSummary(report: DetectionReport): string
      Formats detection results as text for AI prompt context
```

---

## 9. Example Detection Output

```
=== TECHNOLOGY DETECTION REPORT ===

FRONTEND:
  React               DEFINITE (0.98)  [package.json, import statements, 17 .tsx files]
  TypeScript          DEFINITE (0.95)  [tsconfig.json, .tsx/.ts files]
  Tailwind CSS        DEFINITE (0.92)  [package.json, tailwind.config.js]
  React Router        HIGH     (0.85)  [package.json, <Route> patterns]
  Vite                HIGH     (0.82)  [package.json, vite.config.ts]
  Axios               HIGH     (0.78)  [package.json, import axios]

BACKEND:
  Node.js             DEFINITE (0.95)  [package.json, server entry]
  Express.js          DEFINITE (0.90)  [package.json, app.listen()]
  REST API            MEDIUM   (0.55)  [route patterns]

DATABASE:
  MongoDB             HIGH     (0.88)  [mongoose package, Schema patterns]
  Mongoose            DEFINITE (0.90)  [package.json, model definitions]

AUTHENTICATION:
  JWT                 DEFINITE (0.92)  [jsonwebtoken, jwt.sign()]
  bcrypt              HIGH     (0.82)  [package.json, bcrypt.hash()]
  Passport.js         MEDIUM   (0.65)  [package.json only, no strategy imports]

DEPLOYMENT:
  Docker              HIGH     (0.88)  [Dockerfile, docker-compose.yml]

CLOUD:
  (none detected)

TESTING:
  Jest                HIGH     (0.85)  [package.json, *.test.ts files]
  Supertest           MEDIUM   (0.60)  [package.json only]

LANGUAGES:
  TypeScript          DEFINITE (0.95)
  JavaScript          HIGH     (0.75)  [config files in .js]

STACKS:
  MERN Stack          FULL MATCH (0.85)  [MongoDB + Express + React + Node]

SUMMARY:
  Primary Language: TypeScript
  Primary Framework: React
  Primary Database: MongoDB
  Has Authentication: Yes (JWT + bcrypt)
  Has Testing: Yes (Jest)
  Deployment: Docker
```

---

## 10. File Structure

```
server/src/
├── services/
│   └── tech-detection.service.js      # Main orchestrator
│
├── detection/
│   ├── rules.js                       # Technology rule definitions (all categories)
│   ├── matchers.js                    # Pattern matching utilities (regex, AST, JSON)
│   ├── scorers.js                     # Confidence score calculation
│   └── stacks.js                      # Stack combination definitions
```

### Build Sequence

```
1. detection/rules.js       (pure data — all technology definitions)
2. detection/matchers.js     (detection helpers — regex, import scanning, file checking)
3. detection/scorers.js      (confidence calculation logic)
4. detection/stacks.js       (stack definitions + matching)
5. services/tech-detection.service.js  (orchestrator)
```

---

## 11. Integration with Analysis Pipeline

```
Updated pipeline:

  1. file.service.extractZip()         → raw files + file tree
  2. parser.service.parseAllFiles()    → parsed files with symbols/imports
  3. TECH DETECTION ENGINE             → DetectionReport           ← NEW
  4. parser.service.generateStructureForAI() → structured summary
  5. AI PROMPT = detection_report + structured_summary + raw_source + question
  6. ai.service.callDeepSeek()
```

The detection report is sent to the AI as part of the system context, giving DeepSeek accurate information about the project's tech stack before it starts analysis. This prevents hallucinations like "this React project uses Vue" or misidentifying frameworks.
