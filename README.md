# SIAKAD DKN 🎓

A modern and intelligent Academic Information System (SIAKAD) developed by **Dwi Krisnandi**. This application is equipped with Artificial Intelligence (AI) integration to streamline lecturers' operations, guide students, and accelerate academic processes.

## ✨ Key Features

### 🧑‍🏫 Lecturer Module
- **Class & Schedule Management**: Manage lectures and track student attendance (Present, Sick, Excused, Absent).
- **Materials & Assignments**: Distribute course materials (Syllabus/RPS) and assign tasks with integrated deadline tracking.
- **Computer-Based Testing (CBT) & Zero-Cheating System**: Create question banks and conduct online exams. Supports Multiple Choice, True/False, and Essay questions. Equipped with a rigorous anti-cheating system (detects App/Tab switching, completely blocks Copy-Paste, and allows lecturers to kick out cheating students in real-time).
- **DOCX Export**: Export exam questions into a ready-to-print Microsoft Word document with customizable institutional headers.
- **AI Auto-Grading**: AI-powered assistance (Google Gemini) to provide instant scores and constructive feedback on student essays. The AI is specifically trained to automatically **assign a score of 0** if it detects AI-generated or copy-pasted answers.
- **AI Exam & Material Generator**: An AI assistant to summarize syllabuses into HTML textbooks, bulk-generate exam questions (up to 50 at once), and compile exam outlines.

### 👨‍🎓 Student Module
- **Academic Dashboard**: View schedules, attendance records, course materials, and assignment calendars.
- **Secure Online Exams (Zero-Cheating System)**: Take exams through a modern, responsive interface that automatically blocks any cheating attempts. Students cannot paste answers from external sources, and the system will **automatically force-submit the exam** if a student is detected leaving the exam screen more than 3 times (e.g., to take screenshots, open WhatsApp, or consult AI).
- **Academic Assistant Chatbot "Pak Dwi"**: An AI companion designed to act as a 24/7 academic advisor. This bot is specially programmed to aid in understanding course materials while adhering to strict ethical filters that refuse requests to complete assignments directly.

### 🛡️ Admin Module
- **Role Management**: Manage comprehensive user data (Lecturers, Students, Admins).
- **Curriculum Management**: Organize Faculties, Study Programs, Courses, and Classes.
- **Transcripts & Grading (KHS)**: System-based generation and validation of official graduation documents.

## 🗄️ Entity-Relationship Diagram (ERD)

The following diagram illustrates the core database architecture of the SIAKAD DKN system:

```mermaid
erDiagram
    USERS ||--o{ CLASS_ENROLLMENTS : "enrolled in"
    USERS ||--o{ EXAM_SESSIONS : "takes"
    FACULTIES ||--o{ PROGRAMS : "has"
    PROGRAMS ||--o{ COURSES : "offers"
    COURSES ||--o{ CLASSES : "scheduled as"
    USERS ||--o{ CLASSES : "teaches (Lecturer)"
    CLASSES ||--o{ CLASS_ENROLLMENTS : "contains"
    CLASSES ||--o{ SCHEDULES : "has sessions"
    CLASSES ||--o{ MATERIALS : "has"
    CLASSES ||--o{ ASSIGNMENTS : "has"
    SCHEDULES ||--o{ ATTENDANCES : "records"
    SCHEDULES ||--o{ EXAMS : "hosts"
    EXAMS ||--o{ EXAM_QUESTIONS : "contains"
    EXAMS ||--o{ EXAM_SESSIONS : "has"
    EXAMS ||--o{ EXAM_BLOCKS : "blocks"
    EXAM_SESSIONS ||--o{ EXAM_ANSWERS : "submits"
    EXAM_QUESTIONS ||--o{ EXAM_ANSWERS : "answered in"
```

## 🛠️ Tech Stack

**Frontend (Client)**
* **Framework**: React.js (Vite)
* **UI/UX**: CSS 3 (Glassmorphism design language), Bootstrap/Tailwind, Lucide Icons.
* **Features**: Progressive Web App (PWA) ready, Offline-First capabilities, Firebase Cloud Messaging (FCM) integration.

**Backend (API)**
* **Framework**: Node.js with Express.js
* **Database**: PostgreSQL
* **Authentication**: JSON Web Token (JWT) + bcryptjs
* **AI Integration**: Google Generative AI SDK (`@google/generative-ai`) featuring a highly reliable *Key Rotation* & *Retry Mechanism*.
* **Document Generator**: `docx` library.

## 🚀 Installation & Running Locally

Ensure you have **Node.js** and **PostgreSQL** installed.

### 1. Clone Repository
```bash
git clone https://github.com/dwikrisnandi/saiakd-dkn.git
cd saiakd-dkn
```

### 2. Backend Setup (API)
```bash
cd api
npm install
```
Configure environment variables. Create a `.env` file inside the `api` folder:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=siakad
JWT_SECRET=your_super_secret_key
GEMINI_API_KEY_1=your_google_gemini_api_key
```
Start the server:
```bash
npm start
```

### 3. Frontend Setup (Client)
Open a new terminal:
```bash
cd client
npm install
npm run dev
```
The frontend application will be running at `http://localhost:5173`.

## 📜 License & Copyright
Developed by **Dwi Krisnandi**. All rights reserved regarding architecture and source code.
