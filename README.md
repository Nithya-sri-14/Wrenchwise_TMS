# Wrenchwise TMS (Trainer Management System)

Wrenchwise TMS is a comprehensive, full-stack recruitment and operational CRM designed to manage trainer sourcing, profiling, communication, and assignment allocation.

## 🌟 Key Features
- **Trainer Directory & Profiles:** Search, filter, and manage trainers with detailed HR enrichment and skills data.
- **Smart Resume Ingestion:** Upload resumes (PDF/DOCX/Images) and automatically parse them into structured profiles using AI/OCR.
- **Interaction Timeline:** Log calls, negotiations, and interviews, keeping a collective team memory.
- **Email & Communications:** Dispatch branded outreach emails directly from the dashboard and track them in the outbox.
- **Follow-up Reminders:** Schedule actionable reminders with UI-integrated pop-up notifications.
- **Duplicate Prevention:** Smart detection and interception when uploading candidates that already exist in the database.

## 🛠 Tech Stack
This project operates as a modern decoupled Full-Stack application:

**Frontend:**
- HTML, CSS, Vanilla JS
- Built with **Vite**
- Uses Fetch API for asynchronous state updates.

**Backend:**
- **Python 3.10+** & **FastAPI**
- **SQLAlchemy** (ORM) & **Pydantic** (Validation)
- **PostgreSQL** (Production) / **SQLite** (Local Development)
- `PyMuPDF` for local PDF text extraction.

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (for the frontend server and concurrent scripts)
- [Python 3.10+](https://www.python.org/downloads/) (for the backend API)

### Installation & Setup

1. **Clone and navigate to the project directory**
   ```sh
   cd Wrenchwise_TMS
   ```

2. **Install Frontend Dependencies**
   ```sh
   npm install
   ```

3. **Install Backend Dependencies**
   ```sh
   cd backend
   # Optional: Create a virtual environment first
   # python -m venv venv
   # source venv/bin/activate  # (or venv\Scripts\activate on Windows)
   pip install -r requirements.txt
   cd ..
   ```

4. **Environment Variables**
   Create a `.env` file in the `backend/` directory based on the configuration logic:
   ```env
   # Leave empty to use local SQLite, or add a Postgres connection string:
   # DATABASE_URL=postgresql://user:password@localhost/dbname
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

### Running the Application

You can spin up both the Vite frontend development server and the Python FastAPI backend simultaneously using our concurrent npm script:

```sh
npm run dev
```

- **Frontend Interface:** `http://localhost:5173`
- **Backend API Docs (Swagger UI):** `http://localhost:8000/docs`

## ☁️ Deployment

This repository is pre-configured for modern PaaS deployment:

- **Frontend (Vercel):** The `vercel.json` file is ready. Simply import the repository in Vercel. It will use Vite to build the `dist/` directory.
- **Backend (Render):** The `render.yaml` infrastructure-as-code file is included. Connecting to Render will automatically spin up the FastAPI service using Uvicorn. Remember to add your `DATABASE_URL` as an environment variable in Render.
- **Database (Supabase / Neon):** Spin up a managed PostgreSQL database and feed the connection string to the Render backend via environment variables.

## 📂 Project Structure

```
Wrenchwise_TMS/
├── backend/                  # Python FastAPI Backend
│   ├── database.py           # SQLAlchemy configuration
│   ├── main.py               # FastAPI App & Routing inclusion
│   ├── models.py             # Database Tables/Schemas
│   ├── schemas.py            # Pydantic validation schemas
│   ├── requirements.txt      # Python dependencies
│   └── routers/              # API Route controllers
├── src/                      # Frontend Application
│   ├── main.js               # UI Routing & DOM Management
│   ├── state.js              # Global State & API Fetch Logic
│   ├── mockServices.js       # OCR & Integration Utilities
│   └── style.css             # UI styling
├── index.html                # Main entry point
├── package.json              # Node.js dependencies & scripts
├── render.yaml               # Render Backend Deployment config
└── vercel.json               # Vercel Frontend Deployment config
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
