from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class TimelineEventBase(BaseModel):
    date: str
    recruiter: str
    type: str
    summary: str
    standpoint: Optional[str] = ""
    concern: Optional[str] = ""
    nextAction: Optional[str] = ""
    followUpDate: Optional[str] = ""

class TimelineEventCreate(TimelineEventBase):
    pass

class TimelineEvent(TimelineEventBase):
    id: str
    trainer_id: str

    class Config:
        orm_mode = True
        from_attributes = True

class AssignmentBase(BaseModel):
    programName: str
    deliveryDates: str
    deliveryMode: str
    audienceType: str
    rating: float
    notes: Optional[str] = ""

class AssignmentCreate(AssignmentBase):
    pass

class Assignment(AssignmentBase):
    id: str
    trainer_id: str

    class Config:
        orm_mode = True
        from_attributes = True

class TrainerBase(BaseModel):
    name: str
    email: str
    phone: str
    linkedin: Optional[str] = ""
    location: str
    currentEmployer: Optional[str] = ""
    designation: Optional[str] = ""
    totalExperience: Optional[int] = 0
    teachingExperience: Optional[int] = 0
    skills: Optional[List[str]] = []
    certifications: Optional[List[str]] = []
    education: Optional[str] = ""
    source: Optional[str] = "LinkedIn"
    dateAdded: Optional[str] = ""
    dateParsed: Optional[str] = ""
    
    engagementPreference: Optional[str] = "Freelancer"
    currentCTC: Optional[str] = ""
    expectedCTC: Optional[str] = ""
    hourlyExpectation: Optional[float] = 0
    dailyRate: Optional[float] = 0
    perSessionPricing: Optional[str] = ""
    perBatchExpectation: Optional[str] = ""
    negotiability: Optional[str] = "Negotiable"
    deliveryMode: Optional[str] = "Hybrid"
    travelWillingness: Optional[str] = "Yes"
    locationPreference: Optional[str] = ""
    availabilityTimeline: Optional[str] = "Immediate"
    audienceFit: Optional[List[str]] = ["Working professionals"]
    
    status: Optional[str] = "New Profile"
    internalRating: Optional[float] = 0.0

class TrainerCreate(TrainerBase):
    timeline: Optional[List[TimelineEventCreate]] = []
    assignments: Optional[List[AssignmentCreate]] = []

class TrainerUpdate(BaseModel):
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    linkedin: Optional[str]
    location: Optional[str]
    currentEmployer: Optional[str]
    designation: Optional[str]
    totalExperience: Optional[int]
    teachingExperience: Optional[int]
    skills: Optional[List[str]]
    certifications: Optional[List[str]]
    education: Optional[str]
    source: Optional[str]
    dateAdded: Optional[str]
    dateParsed: Optional[str]
    engagementPreference: Optional[str]
    currentCTC: Optional[str]
    expectedCTC: Optional[str]
    hourlyExpectation: Optional[float]
    dailyRate: Optional[float]
    perSessionPricing: Optional[str]
    perBatchExpectation: Optional[str]
    negotiability: Optional[str]
    deliveryMode: Optional[str]
    travelWillingness: Optional[str]
    locationPreference: Optional[str]
    availabilityTimeline: Optional[str]
    audienceFit: Optional[List[str]]
    status: Optional[str]
    internalRating: Optional[float]

class Trainer(TrainerBase):
    id: str
    timeline: List[TimelineEvent] = []
    assignments: List[Assignment] = []

    class Config:
        orm_mode = True
        from_attributes = True

class ReminderBase(BaseModel):
    trainerId: str
    trainerName: str
    date: str
    time: str
    note: str
    status: Optional[str] = "Pending"
    timestamp: Optional[str] = ""

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    status: str

class Reminder(ReminderBase):
    id: str

    class Config:
        orm_mode = True
        from_attributes = True

class OutboxEmailBase(BaseModel):
    recipientEmail: str
    recipientName: Optional[str] = ""
    senderIdentity: str
    subject: str
    body: str

class OutboxEmailCreate(OutboxEmailBase):
    trainerId: Optional[str] = None

class OutboxEmail(OutboxEmailBase):
    id: str
    timestamp: str
    status: str

    class Config:
        orm_mode = True
        from_attributes = True
