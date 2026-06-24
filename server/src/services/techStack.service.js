const path = require('path');

const FRONTEND_RULES = [
  {
    name: 'React', category: 'frontend', aliases: ['React.js', 'ReactJS'],
    signals: [
      { type: 'dep', value: 'react', packageName: 'react', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: 'react-dom', packageName: 'react-dom', weight: 0.9, file: 'package.json' },
      { type: 'import', value: "from 'react'", weight: 0.85 },
      { type: 'import', value: 'from "react"', weight: 0.85 },
      { type: 'extension', value: '.jsx', weight: 0.4 },
      { type: 'extension', value: '.tsx', weight: 0.4 },
      { type: 'pattern', value: 'useState', weight: 0.5 },
      { type: 'pattern', value: 'useEffect', weight: 0.5 },
    ],
  },
  {
    name: 'Next.js', category: 'frontend', parent: 'React',
    signals: [
      { type: 'dep', value: 'next', packageName: 'next', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'next.config.js', weight: 0.85 },
      { type: 'file', value: 'next.config.ts', weight: 0.85 },
      { type: 'file', value: 'next.config.mjs', weight: 0.85 },
      { type: 'dir', value: 'pages', weight: 0.7 },
      { type: 'dir', value: 'app', weight: 0.7 },
      { type: 'pattern', value: 'getServerSideProps', weight: 0.6 },
      { type: 'pattern', value: 'getStaticProps', weight: 0.6 },
    ],
  },
  {
    name: 'Vue.js', category: 'frontend', aliases: ['Vue', 'VueJS'],
    signals: [
      { type: 'dep', value: 'vue', packageName: 'vue', weight: 1.0, file: 'package.json' },
      { type: 'extension', value: '.vue', weight: 0.85 },
      { type: 'pattern', value: 'createApp(', weight: 0.7 },
      { type: 'pattern', value: 'new Vue({', weight: 0.7 },
    ],
  },
  {
    name: 'Angular', category: 'frontend', aliases: ['AngularJS'],
    signals: [
      { type: 'dep', value: '@angular/core', packageName: '@angular/core', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'angular.json', weight: 0.9 },
      { type: 'pattern', value: '@Component', weight: 0.8 },
      { type: 'extension', value: '.component.ts', weight: 0.5 },
    ],
  },
  {
    name: 'TypeScript', category: 'language', aliases: ['TS'],
    signals: [
      { type: 'dep', value: 'typescript', packageName: 'typescript', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'tsconfig.json', weight: 0.85 },
      { type: 'extension', value: '.ts', weight: 0.6 },
      { type: 'extension', value: '.tsx', weight: 0.5 },
    ],
  },
  {
    name: 'Tailwind CSS', category: 'frontend', aliases: ['Tailwind', 'TailwindCSS'],
    signals: [
      { type: 'dep', value: 'tailwindcss', packageName: 'tailwindcss', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'tailwind.config.js', weight: 0.9 },
      { type: 'file', value: 'tailwind.config.ts', weight: 0.9 },
      { type: 'pattern', value: '@tailwind', weight: 0.6 },
      { type: 'pattern', value: '@apply ', weight: 0.5 },
    ],
  },
  {
    name: 'Svelte', category: 'frontend',
    signals: [
      { type: 'dep', value: 'svelte', packageName: 'svelte', weight: 1.0, file: 'package.json' },
      { type: 'extension', value: '.svelte', weight: 0.9 },
    ],
  },
  {
    name: 'Redux', category: 'frontend', parent: 'React',
    signals: [
      { type: 'dep', value: 'redux', packageName: 'redux', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'react-redux', packageName: 'react-redux', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: '@reduxjs/toolkit', packageName: '@reduxjs/toolkit', weight: 0.95, file: 'package.json' },
      { type: 'import', value: 'createSlice', weight: 0.7 },
      { type: 'dir', value: 'store', weight: 0.45 },
      { type: 'dir', value: 'redux', weight: 0.45 },
    ],
  },
  {
    name: 'React Router', category: 'frontend', parent: 'React',
    signals: [
      { type: 'dep', value: 'react-router-dom', packageName: 'react-router-dom', weight: 1.0, file: 'package.json' },
      { type: 'import', value: 'BrowserRouter', weight: 0.65 },
      { type: 'import', value: 'createBrowserRouter', weight: 0.65 },
    ],
  },
  {
    name: 'Axios', category: 'frontend',
    signals: [
      { type: 'dep', value: 'axios', packageName: 'axios', weight: 1.0, file: 'package.json' },
      { type: 'import', value: "from 'axios'", weight: 0.8 },
      { type: 'import', value: 'from "axios"', weight: 0.8 },
    ],
  },
  {
    name: 'Vite', category: 'build',
    signals: [
      { type: 'dep', value: 'vite', packageName: 'vite', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'vite.config.js', weight: 0.9 },
      { type: 'file', value: 'vite.config.ts', weight: 0.9 },
    ],
    mutuallyExclusive: ['Webpack'],
  },
  {
    name: 'Webpack', category: 'build',
    signals: [
      { type: 'dep', value: 'webpack', packageName: 'webpack', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'webpack.config.js', weight: 0.9 },
      { type: 'file', value: 'webpack.config.ts', weight: 0.9 },
    ],
  },
];

const BACKEND_RULES = [
  {
    name: 'Node.js', category: 'backend', aliases: ['Node', 'NodeJS'],
    signals: [
      { type: 'file', value: 'package.json', weight: 0.85 },
      { type: 'pattern', value: "require('fs')", weight: 0.5 },
      { type: 'pattern', value: "require('path')", weight: 0.4 },
      { type: 'pattern', value: "from 'node:", weight: 0.4 },
      { type: 'pattern', value: 'process.exit', weight: 0.3 },
    ],
  },
  {
    name: 'Express.js', category: 'backend', aliases: ['Express'], parent: 'Node.js',
    signals: [
      { type: 'dep', value: 'express', packageName: 'express', weight: 1.0, file: 'package.json' },
      { type: 'pattern', value: "require('express')", weight: 0.85 },
      { type: 'pattern', value: 'express()', weight: 0.8 },
      { type: 'pattern', value: 'app.listen(', weight: 0.6 },
      { type: 'pattern', value: 'app.get(', weight: 0.5 },
      { type: 'pattern', value: 'app.post(', weight: 0.5 },
      { type: 'pattern', value: 'app.use(', weight: 0.45 },
    ],
  },
  {
    name: 'Fastify', category: 'backend',
    signals: [
      { type: 'dep', value: 'fastify', packageName: 'fastify', weight: 1.0, file: 'package.json' },
      { type: 'pattern', value: "require('fastify')", weight: 0.8 },
      { type: 'pattern', value: 'fastify({', weight: 0.7 },
    ],
  },
  {
    name: 'NestJS', category: 'backend',
    signals: [
      { type: 'dep', value: '@nestjs/core', packageName: '@nestjs/core', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'nest-cli.json', weight: 0.8 },
      { type: 'pattern', value: '@Module', weight: 0.75 },
      { type: 'pattern', value: '@Controller', weight: 0.7 },
    ],
  },
  {
    name: 'Django', category: 'backend',
    signals: [
      { type: 'dep', value: 'django', packageName: 'django', weight: 1.0, file: 'requirements.txt' },
      { type: 'file', value: 'manage.py', weight: 0.9 },
      { type: 'pattern', value: 'DJANGO_SETTINGS_MODULE', weight: 0.7 },
      { type: 'pattern', value: 'django.setup', weight: 0.65 },
    ],
  },
  {
    name: 'Flask', category: 'backend',
    signals: [
      { type: 'dep', value: 'flask', packageName: 'Flask', weight: 1.0, file: 'requirements.txt' },
      { type: 'pattern', value: 'from flask import', weight: 0.85 },
      { type: 'pattern', value: 'Flask(__name__)', weight: 0.8 },
    ],
  },
  {
    name: 'FastAPI', category: 'backend',
    signals: [
      { type: 'dep', value: 'fastapi', packageName: 'fastapi', weight: 1.0, file: 'requirements.txt' },
      { type: 'pattern', value: 'from fastapi import', weight: 0.85 },
      { type: 'pattern', value: 'FastAPI()', weight: 0.8 },
    ],
  },
  {
    name: 'Spring Boot', category: 'backend',
    signals: [
      { type: 'dep', value: 'spring-boot-starter', packageName: 'spring-boot-starter', weight: 1.0, file: 'pom.xml' },
      { type: 'pattern', value: '@SpringBootApplication', weight: 0.85 },
      { type: 'file', value: 'application.properties', weight: 0.6 },
      { type: 'file', value: 'application.yml', weight: 0.6 },
    ],
  },
  {
    name: 'Go', category: 'language',
    signals: [
      { type: 'file', value: 'go.mod', weight: 0.95 },
      { type: 'extension', value: '.go', weight: 0.8 },
      { type: 'pattern', value: 'package main', weight: 0.5 },
    ],
  },
  {
    name: 'Python', category: 'language',
    signals: [
      { type: 'extension', value: '.py', weight: 0.8 },
      { type: 'file', value: 'requirements.txt', weight: 0.6 },
      { type: 'file', value: 'pyproject.toml', weight: 0.6 },
    ],
  },
  {
    name: 'Java', category: 'language',
    signals: [
      { type: 'extension', value: '.java', weight: 0.8 },
      { type: 'file', value: 'pom.xml', weight: 0.7 },
      { type: 'file', value: 'build.gradle', weight: 0.7 },
    ],
  },
  {
    name: 'GraphQL', category: 'backend',
    signals: [
      { type: 'dep', value: 'graphql', packageName: 'graphql', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'apollo-server', packageName: 'apollo-server', weight: 0.95, file: 'package.json' },
      { type: 'extension', value: '.graphql', weight: 0.85 },
      { type: 'pattern', value: 'typeDefs', weight: 0.5 },
      { type: 'pattern', value: 'resolvers', weight: 0.45 },
    ],
  },
  {
    name: 'REST API', category: 'backend',
    signals: [
      { type: 'pattern', value: 'app.get(', weight: 0.5 },
      { type: 'pattern', value: 'app.post(', weight: 0.5 },
      { type: 'pattern', value: 'router.get(', weight: 0.5 },
      { type: 'pattern', value: 'router.post(', weight: 0.5 },
      { type: 'pattern', value: '.json({', weight: 0.4 },
      { type: 'pattern', value: 'res.status(', weight: 0.4 },
      { type: 'dir', value: 'routes', weight: 0.35 },
      { type: 'url', value: '/api/', weight: 0.35 },
    ],
  },
];

const DATABASE_RULES = [
  {
    name: 'MongoDB', category: 'database',
    signals: [
      { type: 'dep', value: 'mongoose', packageName: 'mongoose', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: 'mongodb', packageName: 'mongodb', weight: 0.95, file: 'package.json' },
      { type: 'pattern', value: 'mongoose.connect(', weight: 0.8 },
      { type: 'pattern', value: 'MongoClient(', weight: 0.7 },
      { type: 'pattern', value: 'mongodb://', weight: 0.65 },
      { type: 'pattern', value: 'mongodb+srv://', weight: 0.65 },
      { type: 'docker', value: 'mongo', weight: 0.55 },
    ],
  },
  {
    name: 'Mongoose', category: 'database', parent: 'MongoDB',
    signals: [
      { type: 'dep', value: 'mongoose', packageName: 'mongoose', weight: 1.0, file: 'package.json' },
      { type: 'pattern', value: 'new mongoose.Schema', weight: 0.8 },
      { type: 'pattern', value: 'mongoose.model(', weight: 0.75 },
      { type: 'dir', value: 'models', weight: 0.4 },
    ],
  },
  {
    name: 'PostgreSQL', category: 'database', aliases: ['Postgres'],
    signals: [
      { type: 'dep', value: 'pg', packageName: 'pg', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: 'postgres', packageName: 'postgres', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'pg-promise', packageName: 'pg-promise', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'psycopg2', packageName: 'psycopg2', weight: 1.0, file: 'requirements.txt' },
      { type: 'pattern', value: 'postgres://', weight: 0.6 },
      { type: 'pattern', value: 'postgresql://', weight: 0.6 },
      { type: 'docker', value: 'postgres', weight: 0.65 },
    ],
  },
  {
    name: 'MySQL', category: 'database',
    signals: [
      { type: 'dep', value: 'mysql2', packageName: 'mysql2', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: 'mysql', packageName: 'mysql', weight: 0.9, file: 'package.json' },
      { type: 'pattern', value: 'mysql://', weight: 0.6 },
      { type: 'docker', value: 'mysql', weight: 0.65 },
    ],
  },
  {
    name: 'SQLite', category: 'database',
    signals: [
      { type: 'dep', value: 'sqlite3', packageName: 'sqlite3', weight: 0.9, file: 'requirements.txt' },
      { type: 'dep', value: 'better-sqlite3', packageName: 'better-sqlite3', weight: 1.0, file: 'package.json' },
      { type: 'extension', value: '.sqlite', weight: 0.7 },
      { type: 'extension', value: '.db', weight: 0.4 },
      { type: 'pattern', value: 'sqlite:', weight: 0.5 },
    ],
  },
  {
    name: 'Redis', category: 'database',
    signals: [
      { type: 'dep', value: 'redis', packageName: 'redis', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'ioredis', packageName: 'ioredis', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: 'redis', packageName: 'redis', weight: 0.9, file: 'requirements.txt' },
      { type: 'pattern', value: 'redis://', weight: 0.55 },
      { type: 'docker', value: 'redis', weight: 0.55 },
    ],
  },
  {
    name: 'Prisma', category: 'database',
    signals: [
      { type: 'dep', value: 'prisma', packageName: 'prisma', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: '@prisma/client', packageName: '@prisma/client', weight: 0.95, file: 'package.json' },
      { type: 'file', value: 'schema.prisma', weight: 0.95 },
    ],
  },
  {
    name: 'Firebase', category: 'database',
    signals: [
      { type: 'dep', value: 'firebase', packageName: 'firebase', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'firebase-admin', packageName: 'firebase-admin', weight: 0.9, file: 'package.json' },
      { type: 'file', value: 'firebase.json', weight: 0.85 },
    ],
  },
];

const AUTH_RULES = [
  {
    name: 'JWT', category: 'authentication',
    signals: [
      { type: 'dep', value: 'jsonwebtoken', packageName: 'jsonwebtoken', weight: 1.0, file: 'package.json' },
      { type: 'dep', value: 'PyJWT', packageName: 'PyJWT', weight: 0.9, file: 'requirements.txt' },
      { type: 'pattern', value: 'jwt.sign(', weight: 0.8 },
      { type: 'pattern', value: 'jwt.verify(', weight: 0.8 },
      { type: 'pattern', value: 'JWT_SECRET', weight: 0.5 },
      { type: 'pattern', value: 'ACCESS_TOKEN', weight: 0.45 },
    ],
  },
  {
    name: 'Passport.js', category: 'authentication', parent: 'Node.js',
    signals: [
      { type: 'dep', value: 'passport', packageName: 'passport', weight: 1.0, file: 'package.json' },
      { type: 'pattern', value: "require('passport')", weight: 0.8 },
      { type: 'pattern', value: 'passport.use(', weight: 0.7 },
      { type: 'pattern', value: 'passport.authenticate(', weight: 0.7 },
    ],
  },
  {
    name: 'OAuth 2.0', category: 'authentication',
    signals: [
      { type: 'dep', value: 'passport-google-oauth20', packageName: 'passport-google-oauth20', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'passport-github2', packageName: 'passport-github2', weight: 0.9, file: 'package.json' },
      { type: 'pattern', value: 'GOOGLE_CLIENT_ID', weight: 0.6 },
      { type: 'pattern', value: 'GITHUB_CLIENT_ID', weight: 0.6 },
      { type: 'pattern', value: '/auth/google', weight: 0.55 },
      { type: 'pattern', value: '/auth/github', weight: 0.55 },
    ],
  },
  {
    name: 'bcrypt', category: 'authentication',
    signals: [
      { type: 'dep', value: 'bcrypt', packageName: 'bcrypt', weight: 0.9, file: 'package.json' },
      { type: 'dep', value: 'bcryptjs', packageName: 'bcryptjs', weight: 0.9, file: 'package.json' },
      { type: 'pattern', value: 'bcrypt.hash(', weight: 0.7 },
      { type: 'pattern', value: 'bcrypt.compare(', weight: 0.65 },
    ],
  },
  {
    name: 'NextAuth', category: 'authentication',
    signals: [
      { type: 'dep', value: 'next-auth', packageName: 'next-auth', weight: 1.0, file: 'package.json' },
      { type: 'pattern', value: 'NextAuth(', weight: 0.7 },
      { type: 'pattern', value: '[...nextauth]', weight: 0.75 },
    ],
  },
  {
    name: 'Auth0', category: 'authentication',
    signals: [
      { type: 'dep', value: '@auth0/auth0-react', packageName: '@auth0/auth0-react', weight: 0.95, file: 'package.json' },
      { type: 'pattern', value: 'useAuth0(', weight: 0.65 },
    ],
  },
];

const DEPLOYMENT_RULES = [
  {
    name: 'Docker', category: 'deployment',
    signals: [
      { type: 'file', value: 'Dockerfile', weight: 0.95 },
      { type: 'file', value: 'docker-compose.yml', weight: 0.9 },
      { type: 'file', value: 'docker-compose.yaml', weight: 0.9 },
      { type: 'file', value: '.dockerignore', weight: 0.7 },
    ],
  },
  {
    name: 'Kubernetes', category: 'deployment', aliases: ['K8s'],
    signals: [
      { type: 'dir', value: 'k8s', weight: 0.7 },
      { type: 'dir', value: 'kubernetes', weight: 0.7 },
      { type: 'pattern', value: 'kind: Deployment', weight: 0.8 },
      { type: 'pattern', value: 'kind: Service', weight: 0.7 },
      { type: 'file', value: 'Chart.yaml', weight: 0.8 },
    ],
  },
  {
    name: 'GitHub Actions', category: 'deployment',
    signals: [
      { type: 'dir', value: '.github/workflows', weight: 0.95 },
    ],
  },
  {
    name: 'GitLab CI', category: 'deployment',
    signals: [
      { type: 'file', value: '.gitlab-ci.yml', weight: 0.95 },
    ],
  },
  {
    name: 'Vercel', category: 'deployment',
    signals: [
      { type: 'file', value: 'vercel.json', weight: 0.9 },
      { type: 'dep', value: 'vercel', packageName: 'vercel', weight: 0.8, file: 'package.json' },
    ],
  },
  {
    name: 'Netlify', category: 'deployment',
    signals: [
      { type: 'file', value: 'netlify.toml', weight: 0.9 },
    ],
  },
  {
    name: 'Heroku', category: 'deployment',
    signals: [
      { type: 'file', value: 'Procfile', weight: 0.9 },
    ],
  },
  {
    name: 'NGINX', category: 'deployment',
    signals: [
      { type: 'file', value: 'nginx.conf', weight: 0.9 },
      { type: 'pattern', value: 'FROM nginx', weight: 0.6 },
      { type: 'dir', value: 'nginx', weight: 0.5 },
    ],
  },
  {
    name: 'PM2', category: 'deployment',
    signals: [
      { type: 'dep', value: 'pm2', packageName: 'pm2', weight: 0.85, file: 'package.json' },
      { type: 'file', value: 'ecosystem.config.js', weight: 0.8 },
    ],
  },
];

const CLOUD_RULES = [
  {
    name: 'AWS', category: 'cloud', aliases: ['Amazon Web Services'],
    signals: [
      { type: 'dep', value: 'aws-sdk', packageName: 'aws-sdk', weight: 0.85, file: 'package.json' },
      { type: 'dep', value: '@aws-sdk/', packageName: null, weight: 0.85, file: 'package.json' },
      { type: 'pattern', value: 'AWS_ACCESS_KEY', weight: 0.5 },
      { type: 'pattern', value: 'AWS_SECRET', weight: 0.5 },
    ],
  },
  {
    name: 'AWS Lambda', category: 'cloud', parent: 'AWS',
    signals: [
      { type: 'file', value: 'serverless.yml', weight: 0.7 },
      { type: 'pattern', value: 'exports.handler', weight: 0.55 },
    ],
  },
  {
    name: 'AWS S3', category: 'cloud', parent: 'AWS',
    signals: [
      { type: 'dep', value: '@aws-sdk/client-s3', packageName: '@aws-sdk/client-s3', weight: 0.95, file: 'package.json' },
      { type: 'pattern', value: 'S3Client(', weight: 0.6 },
      { type: 'pattern', value: '.upload(', weight: 0.4 },
    ],
  },
  {
    name: 'GCP', category: 'cloud', aliases: ['Google Cloud'],
    signals: [
      { type: 'dep', value: '@google-cloud/', packageName: null, weight: 0.9, file: 'package.json' },
      { type: 'file', value: 'app.yaml', weight: 0.75 },
    ],
  },
  {
    name: 'Supabase', category: 'cloud',
    signals: [
      { type: 'dep', value: '@supabase/supabase-js', packageName: '@supabase/supabase-js', weight: 0.95, file: 'package.json' },
      { type: 'pattern', value: 'supabase.from(', weight: 0.6 },
    ],
  },
  {
    name: 'Cloudflare', category: 'cloud',
    signals: [
      { type: 'file', value: 'wrangler.toml', weight: 0.9 },
      { type: 'dep', value: 'wrangler', packageName: 'wrangler', weight: 0.85, file: 'package.json' },
    ],
  },
];

const TESTING_RULES = [
  {
    name: 'Jest', category: 'testing',
    signals: [
      { type: 'dep', value: 'jest', packageName: 'jest', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'jest.config.js', weight: 0.85 },
      { type: 'file', value: 'jest.config.ts', weight: 0.85 },
      { type: 'file', value: 'jest.config.json', weight: 0.85 },
      { type: 'extension', value: '.test.js', weight: 0.65 },
      { type: 'extension', value: '.test.ts', weight: 0.65 },
      { type: 'extension', value: '.test.jsx', weight: 0.6 },
      { type: 'extension', value: '.test.tsx', weight: 0.6 },
      { type: 'extension', value: '.spec.js', weight: 0.65 },
      { type: 'extension', value: '.spec.ts', weight: 0.65 },
      { type: 'dir', value: '__tests__', weight: 0.5 },
    ],
  },
  {
    name: 'Vitest', category: 'testing',
    signals: [
      { type: 'dep', value: 'vitest', packageName: 'vitest', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'vitest.config.ts', weight: 0.85 },
      { type: 'file', value: 'vitest.config.js', weight: 0.85 },
      { type: 'import', value: "from 'vitest'", weight: 0.6 },
      { type: 'import', value: 'from "vitest"', weight: 0.6 },
    ],
  },
  {
    name: 'Mocha', category: 'testing',
    signals: [
      { type: 'dep', value: 'mocha', packageName: 'mocha', weight: 1.0, file: 'package.json' },
      { type: 'file', value: '.mocharc.js', weight: 0.7 },
      { type: 'file', value: '.mocharc.json', weight: 0.7 },
    ],
  },
  {
    name: 'Pytest', category: 'testing',
    signals: [
      { type: 'dep', value: 'pytest', packageName: 'pytest', weight: 1.0, file: 'requirements.txt' },
      { type: 'file', value: 'pytest.ini', weight: 0.7 },
      { type: 'file', value: 'conftest.py', weight: 0.6 },
      { type: 'extension', value: 'test_', weight: 0.6 },
      { type: 'extension', value: '_test.py', weight: 0.6 },
    ],
  },
  {
    name: 'Cypress', category: 'testing',
    signals: [
      { type: 'dep', value: 'cypress', packageName: 'cypress', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'cypress.config.js', weight: 0.85 },
      { type: 'file', value: 'cypress.config.ts', weight: 0.85 },
      { type: 'dir', value: 'cypress', weight: 0.7 },
    ],
  },
  {
    name: 'Playwright', category: 'testing',
    signals: [
      { type: 'dep', value: '@playwright/test', packageName: '@playwright/test', weight: 1.0, file: 'package.json' },
      { type: 'file', value: 'playwright.config.ts', weight: 0.85 },
      { type: 'file', value: 'playwright.config.js', weight: 0.85 },
    ],
  },
  {
    name: 'ESLint', category: 'testing',
    signals: [
      { type: 'dep', value: 'eslint', packageName: 'eslint', weight: 0.95, file: 'package.json' },
      { type: 'file', value: '.eslintrc.js', weight: 0.8 },
      { type: 'file', value: '.eslintrc.json', weight: 0.8 },
      { type: 'file', value: 'eslint.config.js', weight: 0.8 },
      { type: 'file', value: 'eslint.config.mjs', weight: 0.8 },
    ],
  },
  {
    name: 'Prettier', category: 'testing',
    signals: [
      { type: 'dep', value: 'prettier', packageName: 'prettier', weight: 0.9, file: 'package.json' },
      { type: 'file', value: '.prettierrc', weight: 0.75 },
      { type: 'file', value: '.prettierrc.json', weight: 0.75 },
      { type: 'file', value: 'prettier.config.js', weight: 0.75 },
    ],
  },
];

const ALL_RULES = [
  ...FRONTEND_RULES,
  ...BACKEND_RULES,
  ...DATABASE_RULES,
  ...AUTH_RULES,
  ...DEPLOYMENT_RULES,
  ...CLOUD_RULES,
  ...TESTING_RULES,
];

const STACKS = [
  {
    name: 'MERN Stack',
    required: ['MongoDB', 'Express.js', 'React', 'Node.js'],
    bonus: 0.1,
  },
  {
    name: 'MEAN Stack',
    required: ['MongoDB', 'Express.js', 'Angular', 'Node.js'],
    bonus: 0.1,
  },
  {
    name: 'MEVN Stack',
    required: ['MongoDB', 'Express.js', 'Vue.js', 'Node.js'],
    bonus: 0.1,
  },
  {
    name: 'PERN Stack',
    required: ['PostgreSQL', 'Express.js', 'React', 'Node.js'],
    bonus: 0.1,
  },
  {
    name: 'JAMstack',
    required: ['JavaScript', 'REST API'],
    bonus: 0.05,
  },
  {
    name: 'T3 Stack',
    required: ['TypeScript', 'Next.js', 'Prisma', 'Tailwind CSS'],
    bonus: 0.15,
    minMatch: 3,
  },
  {
    name: 'Django Stack',
    required: ['Django', 'PostgreSQL'],
    bonus: 0.1,
  },
  {
    name: 'Spring Boot Stack',
    required: ['Spring Boot'],
    bonus: 0.1,
  },
];

const classifyConfidence = (score) => {
  if (score >= 0.9) return 'definite';
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.3) return 'low';
  return 'speculative';
};

const fileHasExtension = (filePath, ext) => {
  if (ext === 'test_') {
    const basename = path.basename(filePath);
    return basename.startsWith('test_') || basename.endsWith('_test.py');
  }
  return filePath.toLowerCase().endsWith(ext);
};

const matchSignal = (signal, parsedFile, fileList) => {
  const { type, value, file: sigFile, packageName } = signal;

  switch (type) {
    case 'dep': {
      if (parsedFile.config && parsedFile.config.fileType === sigFile) {
        const md = parsedFile.config.metadata;
        return checkDependency(md, value, packageName, sigFile);
      }
      return false;
    }
    case 'import': {
      if (!parsedFile.imports) return false;
      return parsedFile.imports.some((imp) =>
        typeof imp.source === 'string' && imp.source.includes(value)
      );
    }
    case 'extension': {
      return fileHasExtension(parsedFile.filePath, value);
    }
    case 'file': {
      return fileList.some((f) => {
        const base = path.basename(f).toLowerCase();
        return base === value.toLowerCase();
      });
    }
    case 'dir': {
      return fileList.some((f) => {
        const parts = f.split(/[/\\]/);
        return parts.includes(value);
      });
    }
    case 'pattern': {
      if (!parsedFile.content) return false;
      return parsedFile.content.includes(value);
    }
    case 'docker': {
      return fileList.some((f) =>
        f.includes('docker-compose') &&
        (!parsedFile.content || parsedFile.content.includes(value))
      );
    }
    case 'url': {
      if (!parsedFile.content) return false;
      return parsedFile.content.includes(value);
    }
    default:
      return false;
  }
};

const checkDependency = (metadata, value, packageName, configFile) => {
  if (configFile === 'package.json') {
    const deps = { ...(metadata.dependencies || {}), ...(metadata.devDependencies || {}) };
    if (packageName) return packageName in deps;
    return Object.keys(deps).some((k) => k.includes(value));
  }
  if (configFile === 'requirements.txt') {
    const deps = (metadata.dependencies || []).map((d) => d.toLowerCase());
    return deps.some((d) =>
      d === value.toLowerCase() || d.startsWith(value.toLowerCase())
    );
  }
  if (configFile === 'pom.xml') {
    return typeof metadata === 'string' && metadata.includes(value);
  }
  return false;
};

const detectTechnologies = (parsedFiles, fileList) => {
  const results = new Map();
  const filePaths = fileList || parsedFiles.map((f) => f.filePath).filter(Boolean);

  for (const rule of ALL_RULES) {
    let totalWeight = 0;
    let matchedWeight = 0;
    const evidence = [];

    for (const signal of rule.signals) {
      totalWeight += signal.weight;

      let matched = false;

      if (signal.type === 'file' || signal.type === 'dir' || signal.type === 'docker') {
        matched = matchSignal(signal, { content: null }, filePaths);
      } else {
        for (const file of parsedFiles) {
          if (!file || !file.filePath) continue;
          if (matchSignal(signal, file, filePaths)) {
            matched = true;
            evidence.push({
              signal: signal.type,
              value: signal.value,
              file: file.filePath,
            });
            break;
          }
        }
      }

      if (matched) {
        matchedWeight += signal.weight;
        if (evidence.length === 0 && (signal.type === 'file' || signal.type === 'dir')) {
          evidence.push({
            signal: signal.type,
            value: signal.value,
            file: signal.value,
          });
        }
      }
    }

    if (totalWeight === 0) continue;

    let confidence = matchedWeight / totalWeight;

    if (rule.mutuallyExclusive) {
      for (const excl of rule.mutuallyExclusive) {
        if (results.has(excl)) {
          confidence *= 0.1;
          break;
        }
      }
    }

    if (rule.parent) {
      const parentResult = results.get(rule.parent);
      if (parentResult && parentResult.confidence >= 0.5) {
        confidence = Math.min(1.0, confidence * 1.2);
      }
    }

    const classification = classifyConfidence(confidence);

    if (classification === 'speculative') continue;

    results.set(rule.name, {
      name: rule.name,
      category: rule.category,
      confidence: Math.min(1.0, Math.round(confidence * 100) / 100),
      classification,
      evidence: evidence.slice(0, 5),
      isPrimary: false,
    });
  }

  return results;
};

const detectStacks = (detected) => {
  const results = [];

  for (const stack of STACKS) {
    const threshold = stack.minMatch || stack.required.length;
    let matchedCount = 0;

    for (const techName of stack.required) {
      const tech = detected.get(techName);
      if (tech && tech.confidence >= 0.4) {
        matchedCount++;
      }
    }

    if (matchedCount >= threshold) {
      const isFull = matchedCount >= stack.required.length;
      const matchConfidence = matchedCount / stack.required.length;

      if (isFull) {
        for (const techName of stack.required) {
          const tech = detected.get(techName);
          if (tech) {
            tech.confidence = Math.min(1.0, tech.confidence + stack.bonus);
            tech.classification = classifyConfidence(tech.confidence);
          }
        }
      }

      results.push({
        name: stack.name,
        technologies: stack.required,
        matchType: isFull ? 'full' : 'partial',
        confidence: Math.round(matchConfidence * 100) / 100,
      });
    }
  }

  return results;
};

const categorizeResults = (detected) => {
  const report = {
    frontend: [],
    backend: [],
    database: [],
    authentication: [],
    deployment: [],
    cloud: [],
    testing: [],
    languages: [],
    build: [],
    stacks: [],
  };

  for (const [, tech] of detected) {
    const cat = report[tech.category];
    if (cat) {
      cat.push(tech);
    } else if (tech.category === 'language') {
      report.languages.push(tech);
    } else if (tech.category === 'build') {
      report.build.push(tech);
    }
  }

  const sortByConfidence = (a, b) => b.confidence - a.confidence;
  for (const key of Object.keys(report)) {
    if (Array.isArray(report[key])) {
      report[key].sort(sortByConfidence);
    }
  }

  return report;
};

const generateSummary = (report) => {
  const primaryLanguage =
    report.languages[0]?.name ||
    report.frontend[0]?.name ||
    report.backend[0]?.name ||
    'Unknown';
  const primaryFramework =
    report.frontend[0]?.name || report.backend[0]?.name || 'Unknown';
  const primaryDatabase = report.database[0]?.name || 'None detected';
  const hasAuth = (report.authentication || []).length > 0;
  const hasTesting = (report.testing || []).length > 0;
  const deploymentMethod = report.deployment[0]?.name || 'None detected';

  return {
    totalTechnologies:
      (report.frontend || []).length +
      (report.backend || []).length +
      (report.database || []).length +
      (report.authentication || []).length +
      (report.deployment || []).length +
      (report.cloud || []).length +
      (report.testing || []).length +
      (report.languages || []).length +
      (report.build || []).length,
    primaryLanguage,
    primaryFramework,
    primaryDatabase,
    hasAuthentication: hasAuth,
    hasTesting,
    deploymentMethod,
  };
};

const detectAll = (parsedFiles, fileTree, configFiles, rawFileList) => {
  const fileList = rawFileList || [];
  const allParsed = [...parsedFiles];

  const detected = detectTechnologies(allParsed, fileList);

  const stacks = detectStacks(detected);
  detected.stacks = stacks;

  const report = categorizeResults(detected);
  report.stacks = stacks;
  report.summary = generateSummary(report);

  return report;
};

const generateDetectionContext = (report) => {
  const lines = [];
  lines.push('=== TECHNOLOGY DETECTION REPORT ===');
  lines.push('');

  const printCategory = (label, items) => {
    if (items.length === 0) return;
    lines.push(`${label}:`);
    for (const item of items) {
      const confPct = Math.round(item.confidence * 100);
      const confLabel = item.classification.toUpperCase();
      lines.push(`  ${item.name.padEnd(20)} ${confLabel.padEnd(12)} (${confPct}%)`);
    }
    lines.push('');
  };

  printCategory('FRONTEND', report.frontend);
  printCategory('BACKEND', report.backend);
  printCategory('DATABASE', report.database);
  printCategory('AUTHENTICATION', report.authentication);
  printCategory('DEPLOYMENT', report.deployment);
  printCategory('CLOUD', report.cloud);
  printCategory('TESTING', report.testing);
  printCategory('LANGUAGES', report.languages);
  printCategory('BUILD TOOLS', report.build);

  if (report.stacks && report.stacks.length > 0) {
    lines.push('STACKS:');
    for (const stack of report.stacks) {
      const type = stack.matchType === 'full' ? 'FULL MATCH' : 'PARTIAL MATCH';
      lines.push(`  ${stack.name.padEnd(20)} ${type} (${Math.round(stack.confidence * 100)}%)`);
    }
    lines.push('');
  }

  if (report.summary) {
    const s = report.summary;
    lines.push('SUMMARY:');
    lines.push(`  Primary Language: ${s.primaryLanguage}`);
    lines.push(`  Primary Framework: ${s.primaryFramework}`);
    lines.push(`  Primary Database: ${s.primaryDatabase}`);
    lines.push(`  Authentication: ${s.hasAuthentication ? 'Yes' : 'No'}`);
    lines.push(`  Testing: ${s.hasTesting ? 'Yes' : 'No'}`);
    lines.push(`  Deployment: ${s.deploymentMethod}`);
    lines.push('');
  }

  lines.push(`Total technologies detected: ${report.summary?.totalTechnologies || 0}`);

  return lines.join('\n');
};

const extractTechStackNames = (report) => {
  const names = [];
  const allCategories = [
    ...report.languages,
    ...report.frontend,
    ...report.backend,
    ...report.database,
    ...report.authentication,
    ...report.deployment,
    ...report.cloud,
    ...report.testing,
    ...report.build,
  ];
  for (const tech of allCategories) {
    if (tech.classification !== 'speculative') {
      names.push(tech.name);
    }
  }
  return [...new Set(names)];
};

module.exports = {
  detectAll,
  detectTechnologies,
  detectStacks,
  generateDetectionContext,
  generateSummary,
  extractTechStackNames,
};
