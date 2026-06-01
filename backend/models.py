from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
import uuid
import datetime
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Trainer(Base):
    __tablename__ = "trainers"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    linkedin = Column(String)
    location = Column(String)
    currentEmployer = Column(String)
    designation = Column(String)
    totalExperience = Column(Integer, default=0)
    teachingExperience = Column(Integer, default=0)
    skills = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    education = Column(String)
    source = Column(String)
    dateAdded = Column(String)
    dateParsed = Column(String)
    
    engagementPreference = Column(String)
    currentCTC = Column(String)
    expectedCTC = Column(String)
    hourlyExpectation = Column(Float, default=0)
    dailyRate = Column(Float, default=0)
    perSessionPricing = Column(String)
    perBatchExpectation = Column(String)
    negotiability = Column(String)
    deliveryMode = Column(String)
    travelWillingness = Column(String)
    locationPreference = Column(String)
    availabilityTimeline = Column(String)
    audienceFit = Column(JSON, default=list)
    
    status = Column(String)
    internalRating = Column(Float, default=0.0)

    timeline = relationship("TimelineEvent", back_populates="trainer", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="trainer", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="trainer", cascade="all, delete-orphan")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    trainer_id = Column(String, ForeignKey("trainers.id"))
    date = Column(String)
    recruiter = Column(String)
    type = Column(String)
    summary = Column(Text)
    standpoint = Column(Text)
    concern = Column(Text)
    nextAction = Column(String)
    followUpDate = Column(String)

    trainer = relationship("Trainer", back_populates="timeline")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    trainer_id = Column(String, ForeignKey("trainers.id"))
    programName = Column(String)
    deliveryDates = Column(String)
    deliveryMode = Column(String)
    audienceType = Column(String)
    rating = Column(Float)
    notes = Column(Text)

    trainer = relationship("Trainer", back_populates="assignments")

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    trainerId = Column(String, ForeignKey("trainers.id"))
    trainerName = Column(String)
    date = Column(String)
    time = Column(String)
    note = Column(Text)
    status = Column(String, default="Pending")
    timestamp = Column(String)

    trainer = relationship("Trainer", back_populates="reminders")

class OutboxEmail(Base):
    __tablename__ = "outbox_emails"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    timestamp = Column(String)
    recipientEmail = Column(String)
    recipientName = Column(String)
    senderIdentity = Column(String)
    subject = Column(String)
    body = Column(Text)
    status = Column(String, default="Sent")
