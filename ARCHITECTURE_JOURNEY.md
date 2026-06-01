# Wrenchwise TMS - Feature Extraction & Architecture Journey

This document outlines the systematic process used to transform the Wrenchwise TMS from a local, mock-driven prototype into a fully deployable, full-stack application with a real database and AI capabilities.

## 1. Initial State Analysis

The project began as a polished, Vite-based Single Page Application (SPA). While the UI/UX was excellent, the underlying architecture relied entirely on temporary browser storage and simulated services.

**The Starting Point:**
*   **Database:** `localStorage` (via `src/state.js`). Data was lost if the browser cache was cleared.
*   **Resume Parsing:** Simulated using a `setTimeout` function in `src/mockServices.js`. It returned a hardcoded JSON object (e.g., "Mock Extracted Company", 5 years experience) regardless of the file uploaded.
*   **Email Dispatch:** Simulated. Emails were "sent" by simply pushing an object into a local array.
*   **Backend:** None.

## 2. Feature Extraction & Planning

To bridge the gap between the prototype and a production-ready system, a comprehensive analysis of the existing UI and the Business Requirements Document (BRD) was conducted. The goal was to build a backend that perfectly mapped to the frontend's expectations without requiring *any* UI changes.

**Extracted Entities:**
By analyzing the `localStorage` payload structure and the UI forms, the following core entities were identified for the relational database:
1.  **Trainers:** The central entity containing demographics, skills, HR screening data (CTC, negotiability), and system metadata (internal rating).
2.  **Timeline Events:** A log of interactions (calls, emails, interviews) linked to a specific trainer.
3.  **Assignments:** Records of training deliveries linked to a trainer.
4.  **Reminders:** Scheduled follow-ups linked to trainers.
5.  **Outbox Emails:** A log of automated emails sent to candidates.

## 3. Backend Architecture Implementation

Based on the extracted requirements, a modern Python backend was architected.

**Technology Stack Chosen:**
*   **Framework:** Python FastAPI (chosen for high performance and excellent ecosystem for AI/Data tasks).
*   **Database:** PostgreSQL (hosted on Supabase) accessed via SQLAlchemy ORM.
*   **AI Integration:** Groq API (using `llama3-70b-8192`) for ultra-fast, structured resume parsing.
*   **PDF Extraction:** `PyMuPDF` (fitz) for reliable text extraction from uploaded documents.

**The Implementation Steps:**
1.  **Database Scaffolding:** Created `models.py` to define the SQLAlchemy tables, ensuring every column perfectly matched the camelCase JSON keys expected by the frontend.
2.  **API Contracts:** Created `schemas.py` using Pydantic to strictly define the input and output shapes of the API endpoints, ensuring data integrity.
3.  **Routing:** Built modular routers (`trainers.py`, `resumes.py`, `emails.py`, `reminders.py`) to handle CRUD operations.

## 4. The AI Resume Parser Integration

The most significant upgrade was replacing the mock resume parser with a real, intelligent extraction pipeline.

**The Workflow (`backend/routers/resumes.py`):**
1.  **Ingestion:** The FastAPI endpoint accepts a `multipart/form-data` file upload directly from the frontend.
2.  **Text Extraction:** `PyMuPDF` opens the file in memory and extracts the raw text.
3.  **Prompt Engineering:** A highly specific ATS (Applicant Tracking System) prompt was crafted. It instructs the LLM on exactly how to extract 19 specific fields (Name, Email, Skills, CTC expectations, etc.).
4.  **LLM Processing:** The raw text and prompt are sent to the **Groq API**. We specifically instruct the model to return *only* valid JSON.
5.  **Sanitization:** The backend intercepts the response, strips out any accidental Markdown formatting (like ```json), and parses it into a Python dictionary.
6.  **Delivery:** The structured data is returned to the frontend, instantly populating the "Draft Review" form.

## 5. Frontend Refactoring (The "Non-Destructive" Switch)

The final challenge was connecting the new backend to the existing frontend without breaking the polished UI.

**The `state.js` Refactor:**
Instead of rewriting the React/Vanilla JS components, we intercepted the data layer. The `WWStateStore` class was refactored:
*   Instead of writing to `localStorage`, methods like `createTrainer()` and `addReminder()` now make asynchronous `fetch()` POST/PUT requests to the FastAPI backend.
*   **Optimistic UI Updates:** To keep the UI feeling instantaneous, the frontend still immediately pushes the new data into a local array and updates the screen, *then* silently sends the data to the backend in the background. If the backend confirms success, the temporary local ID is swapped for the real database UUID.

## 6. Deployment Readiness

To ensure the system can be taken live immediately, deployment configurations were added:
*   **Frontend:** A `vercel.json` file was added for seamless deployment to Vercel.
*   **Backend:** A `render.yaml` Infrastructure-as-Code file was added to automatically deploy the FastAPI service to Render.com.
*   **Database:** Configured to use a Supabase IPv4 Session Pooler (`aws-1-ap-southeast-2.pooler.supabase.com`) to ensure compatibility across different network environments.

## Summary

The Wrenchwise TMS has evolved from a static prototype to a production-ready architecture. By carefully extracting the implied data contracts from the UI and building a robust Python/PostgreSQL backend, the application now possesses real data persistence and powerful AI-driven automation, all while preserving its original, high-quality user experience.