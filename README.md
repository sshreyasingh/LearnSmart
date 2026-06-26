# 🚀 LearnSmart - AI-Powered Project Analysis & Learning Platform

LearnSmart is an AI-powered platform that helps developers understand unfamiliar software projects by automatically analyzing complete code repositories and generating structured insights, visualizations, project explanations, and interview preparation material.

Instead of manually reading hundreds of files, users can upload a project and instantly receive an executive summary, architecture insights, authentication flow, database explanation, project difficulty analysis, interactive AI assistance, and technology-specific interview questions.

Live link: learn-smart-five.vercel.app
Hosted on:
Frontend: Vercel
Backend: DigitalOcean VPS

---

## ✨ Features

### 📂 Project Upload
- Upload complete project as a ZIP file
- Automatic extraction and analysis
- Temporary file storage (source code is deleted after analysis)

---

### 🔍 Static Code Analysis (No AI)

LearnSmart performs repository-wide static analysis to detect:

- Programming Languages
- Tech Stack
- Frameworks
- Folder Structure
- File Dependencies
- API Endpoints
- Route Mapping
- Controllers
- Services
- Models
- Middleware
- Environment Variables
- Authentication
- Database Models
- Database Relationships
- External Libraries
- Project Metrics

---

### 🤖 AI-Powered Analysis

Using **DeepSeek (OpenRouter API)** with **RAG**, LearnSmart generates:

- Executive Summary
- Project Purpose
- Authentication Explanation
- Database Explanation

The AI only explains the information extracted through static analysis, ensuring accurate and context-aware responses.

---

### 💬 AI Code Tutor

An interactive AI assistant capable of answering repository-specific questions such as:

- Explain this controller.
- How does authentication work?
- Where is JWT generated?
- Explain this API endpoint.
- What does this middleware do?
- Explain this function.

The AI uses **RAG + DeepSeek** to answer based only on the uploaded project's context.

---

### 📈 Project Difficulty Analysis (Machine Learning)

LearnSmart predicts project difficulty using an **XGBoost Regressor** trained on software engineering metrics.

Predicted outputs include:

- Difficulty Score (1–10)
- Estimated Learning Time
- Recommended Skill Level

Features used include:

- Lines of Code
- Number of Files
- API Count
- Components
- Dependencies
- Cyclomatic Complexity
- Authentication Modules
- Database Models

---

### 📚 Interview Preparation

Interview questions are generated **without AI** using static analysis and predefined question banks.

Categories include:

- Project Purpose
- Beginner
- Intermediate
- Advanced
- Deep Dive
- Code-Based
- Authentication
- Database
- API
- System Design
- Behavioral

When a question is selected, **DeepSeek** generates a detailed answer using the uploaded project's context.

---

### 🌐 Learning Resources

Automatically recommends learning resources by scraping:

- Official Documentation
- MDN
- GitHub Repositories
- YouTube Tutorials

based on the detected technologies.

---

### 📄 Resume Skill Extractor

Automatically extracts:

- Programming Languages
- Frameworks
- Libraries
- Databases
- APIs
- Authentication
- Design Patterns
- Software Engineering Concepts

to generate resume-ready skills.

---

### 📊 Visualizations

Automatically generates:

- Folder Structure Tree
- Dependency Graph
- API Flow Diagram
- Database Relationship Diagram
- Execution Flow Diagram

using static analysis.

---

## 🏗️ System Architecture

```
                React Frontend
                      │
                      ▼
             Express.js Backend
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
 Static Analysis    AI Engine     ML Engine
 (AST Parsing)    (DeepSeek)     (XGBoost)
        │             │             │
        └─────────────┼─────────────┘
                      ▼
                 MongoDB Database
```

---

## ⚙️ Tech Stack

### Frontend

- React.js
- Tailwind CSS
- React Flow
- Mermaid.js

### Backend

- Node.js
- Express.js
- JWT
- bcrypt

### Database

- MongoDB

### AI

- Nvidia (OpenRouter API)
- Retrieval-Augmented Generation (RAG)

### Machine Learning

- XGBoost Regressor

### Static Analysis

- Babel Parser
- Babel Traverse
- Tree-sitter

### Web Scraping

- Puppeteer
- Cheerio

---

## 📁 Project Structure

```
LearnSmart/
│
├── client/
├── server/
├── docs/
├── uploads/
├── temp/
└── README.md
```

---

## 🔄 Workflow

1. User uploads a project ZIP.
2. ZIP is extracted temporarily.
3. Static analysis scans the repository.
4. Project metadata is generated.
5. XGBoost predicts project difficulty.
6. DeepSeek generates project explanations.
7. Interview questions are generated.
8. Learning resources are recommended.
9. Temporary project files are deleted.
10. Only project summaries and metadata are stored.

---

## 🔒 Security

- JWT Authentication
- Password Hashing with bcrypt
- Temporary file storage
- Source code deleted after analysis
- Secure API endpoints
- Environment variable protection

---

## 🎯 Future Enhancements

- Multi-language repository support
- GitHub repository analysis
- UML Diagram Generation
- Design Pattern Detection
- CI/CD Analysis
- Docker & Kubernetes Detection
- Code Quality Score
- Team Collaboration
- AI Learning Roadmap

---

## 👩‍💻 Author

**Shreya Singh**

**Role:** Software Engineer | Full-Stack AI Developer

---

## ⭐ Key Highlights

- AI-Powered Project Explanation
- Static Code Analysis
- Machine Learning-Based Difficulty Prediction
- Interactive AI Code Tutor
- Repository-Aware Interview Preparation
- Automated Architecture Visualization
- Resume Skill Extraction
- Web Scraping for Learning Resources

---

**LearnSmart helps developers understand, learn, and prepare for interviews from any software project—all in one intelligent platform.**
