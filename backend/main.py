import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import trainers, resumes, emails, reminders

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Wrenchwise TMS API",
    description="Backend API for Wrench Wise Trainer Management System",
    version="1.0.0"
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trainers.router)
app.include_router(resumes.router)
app.include_router(emails.router)
app.include_router(reminders.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
