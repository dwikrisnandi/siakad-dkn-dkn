# SIAKAD DKN: Academic Information & CBT System 🎓

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

A lightweight, production-ready Academic Information System (SIAKAD) paired with a Computer-Based Test (CBT) engine. Engineered with a focus on simplicity, raw performance, and practical AI integrations to streamline operations for lecturers and students.

> **Status:** Active in production. Currently serving real-time examinations, attendance tracking, and student management for an active academic institution.

---

## 📸 System Previews

| Lecturer Dashboard | CBT & Anti-Cheat UI | AI Chatbot "Pak Dwi" |
|:---:|:---:|:---:|
| <img src="link_to_image1.png" width="250" alt="Lecturer Dashboard"/> | <img src="link_to_image2.png" width="250" alt="Student Interface"/> | <img src="link_to_image3.png" width="250" alt="AI Chatbot"/> |

---

## ✨ Key Features & Architecture

### 1. Computer-Based Test (CBT) & Exam Integrity
Built to handle concurrent examination sessions with built-in academic integrity controls:
- **Client-Side Request Jittering**: When hundreds of students press "Start Exam" at the exact same time, the frontend applies a randomized delay (jitter). This staggers the API calls, preventing Node.js event-loop bottlenecks and database connection exhaustion.
- **Payload Sanitization**: Exam keys are strictly stripped from the JSON response at the Express route level. It is impossible for students to find the correct answers via DevTools or Network interception.
- **Visibility-Based Anti-Cheat**: Utilizes the browser's Page Visibility API. If a student leaves the active exam tab (e.g., switching to Google or WhatsApp) more than a configured threshold (3 times), the system automatically force-submits their exam payload to the server.

### 2. Pragmatic AI Integration
Integrates the Google Gemini API to solve real operational bottlenecks, equipped with automatic API key-rotation to handle quota limits:
- **Essay Auto-Grading**: Sends student essay answers alongside the lecturer's answer key to Gemini, returning a suggested score and brief contextual feedback.
- **Curriculum to Content Generation**: Allows lecturers to bulk-generate reading materials and multiple-choice question drafts directly from syllabus (RPS) topics.
- **Academic Chatbot**: A contextual assistant ("Pak Dwi") strictly prompted to guide students on coursework without outright giving them the answers to assignments.

### 3. Deliberate Data Layer Design (No ORM)
- **Raw SQL for Performance**: Instead of relying on heavy Object-Relational Mappers (ORMs), the application utilizes the native `pg` driver with raw, parameterized SQL queries. This deliberate choice eliminates abstraction overhead, allows for precise index tuning, and guarantees maximum query execution speed.
- **Injection Prevention**: 100% of the queries use strict parameter binding (e.g., `WHERE id = $1`), categorically preventing SQL injection vectors without needing a complex query builder.

---

## 🛠️ Tech Stack

**Frontend**
* **Framework**: React.js (Vite) for fast HMR and optimized builds.
* **Styling**: Bootstrap & Custom CSS (Glassmorphism UI).
* **Caching**: IndexedDB & LocalStorage for offline-first exam persistence.

**Backend**
* **Runtime**: Node.js / Express.js.
* **Database**: PostgreSQL (Native `pg` driver).
* **Auth**: JSON Web Tokens (JWT) & bcryptjs for stateless authentication.
* **Integrations**: `@google/generative-ai` for LLM features and `docx` for generating print-ready exam documents.

---

## 🚀 Local Development Setup

Ensure you have **Node.js (v18+)** and **PostgreSQL** installed on your local machine.

### 1. Clone the Repository
```bash
git clone https://github.com/dwikrisnandi/siakad-dkn-dkn.git
cd siakad-dkn-dkn
```

### 2. Backend & Database Setup
```bash
cd api
npm install
```

Create a `.env` file in the `api` directory:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=siakad_db
JWT_SECRET=your_development_secret
GEMINI_API_KEY_1=your_google_ai_studio_key
```

Start the API:
```bash
npm start
```
*The API will be available at `http://localhost:3000`*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd client
npm install
npm run dev
```
*The client application will run at `http://localhost:5173`*

---

## 📜 License
Developed and architected by **Dwi Krisnandi**. 
For business inquiries, deployment consultations, or white-label licensing, please reach out via GitHub issues or email.
