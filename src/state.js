/* ==========================================================================
   Wrench Wise TMS Global State & API Integration
   ========================================================================== */

const API_BASE_URL = "http://localhost:8000/api";

class WWStateStore {
  constructor() {
    this.trainers = [];
    this.emailOutbox = [];
    this.reminders = [];
    this.listeners = [];
    this.init();
  }

  async init() {
    try {
      await this.fetchData();
    } catch (err) {
      console.error("Failed to initialize WW-TMS State from backend. Attempting to fall back to memory state.", err);
    }
  }

  async fetchData() {
    try {
      const [trainersRes, outboxRes, remindersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/trainers/`),
        fetch(`${API_BASE_URL}/emails/`),
        fetch(`${API_BASE_URL}/reminders/`)
      ]);
      
      if (trainersRes.ok) this.trainers = await trainersRes.json();
      if (outboxRes.ok) this.emailOutbox = await outboxRes.json();
      if (remindersRes.ok) this.reminders = await remindersRes.json();
      
      this.notifyListeners();
    } catch (error) {
      console.error("Error fetching data from API:", error);
    }
  }

  async loadDemoData() {
    console.log("loadDemoData is deprecated with backend integration. Please implement DB seeds instead.");
  }

  async clearDatabase() {
    console.log("clearDatabase not supported for safety from frontend.");
  }

  getTrainers() {
    return this.trainers;
  }

  getTrainerById(id) {
    return this.trainers.find(t => t.id === id);
  }

  getOutboxLogs() {
    return this.emailOutbox;
  }

  getReminders() {
    return this.reminders;
  }

  findDuplicateProfiles(profile) {
    return this.trainers.filter(t => {
      const isFallbackEmail = profile.email && profile.email.toLowerCase().trim() === 'no-reply@wrenchwise.in';
      const emailMatch = !isFallbackEmail && profile.email && t.email && t.email.toLowerCase().trim() === profile.email.toLowerCase().trim();
      
      const isFallbackPhone = profile.phone && profile.phone.replace(/[\s\-\+]/g, '') === '919876543210';
      const phoneMatch = !isFallbackPhone && profile.phone && t.phone && t.phone.replace(/[\s\-\+]/g, '') === profile.phone.replace(/[\s\-\+]/g, '');
      
      const linkedinMatch = profile.linkedin && t.linkedin && t.linkedin.toLowerCase().includes(profile.linkedin.toLowerCase().trim());
      
      const nameLocationMatch = profile.name && profile.location &&
        t.name && typeof t.name === 'string' &&
        t.location && typeof t.location === 'string' &&
        t.name.toLowerCase().trim() === profile.name.toLowerCase().trim() &&
        t.location.toLowerCase().trim() === profile.location.toLowerCase().trim();

      return emailMatch || phoneMatch || linkedinMatch || nameLocationMatch;
    });
  }

  async createTrainer(trainerData) {
    // Optimistic UI update
    const tempId = 'temp-' + Date.now();
    const newTrainer = { ...trainerData, id: tempId, timeline: trainerData.timeline || [], assignments: trainerData.assignments || [] };
    this.trainers.unshift(newTrainer);
    this.notifyListeners();

    try {
      const response = await fetch(`${API_BASE_URL}/trainers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainerData)
      });
      if (response.ok) {
        const savedTrainer = await response.json();
        this.trainers = this.trainers.map(t => t.id === tempId ? savedTrainer : t);
        this.notifyListeners();
        return savedTrainer;
      }
    } catch (error) {
      console.error("Error creating trainer:", error);
      this.trainers = this.trainers.filter(t => t.id !== tempId);
      this.notifyListeners();
    }
    return newTrainer;
  }

  async updateTrainer(id, updatedFields) {
    const index = this.trainers.findIndex(t => t.id === id);
    if (index !== -1) {
      const current = this.trainers[index];
      const payload = { ...updatedFields };

      if (payload.skills && typeof payload.skills === 'string') {
        payload.skills = payload.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (payload.certifications && typeof payload.certifications === 'string') {
        payload.certifications = payload.certifications.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (payload.audienceFit && typeof payload.audienceFit === 'string') {
        payload.audienceFit = payload.audienceFit.split(',').map(s => s.trim()).filter(Boolean);
      }

      const optimisticUpdated = { ...current, ...payload };
      this.trainers[index] = optimisticUpdated;
      this.notifyListeners();

      try {
        const response = await fetch(`${API_BASE_URL}/trainers/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          this.trainers[index] = await response.json();
          this.notifyListeners();
        }
      } catch (error) {
        console.error("Error updating trainer:", error);
      }
      return this.trainers[index];
    }
    return null;
  }

  async deleteTrainer(id) {
    this.trainers = this.trainers.filter(t => t.id !== id);
    this.notifyListeners();
    try {
      await fetch(`${API_BASE_URL}/trainers/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting trainer:", error);
    }
  }

  async addTrainerInteraction(trainerId, interactionData) {
    const trainer = this.getTrainerById(trainerId);
    if (trainer) {
      const payload = {
        date: new Date().toISOString() + "Z",
        recruiter: interactionData.recruiter || "Talent Operations",
        type: interactionData.type || "call",
        summary: interactionData.summary || "",
        standpoint: interactionData.standpoint || "",
        concern: interactionData.concern || "",
        nextAction: interactionData.nextAction || "",
        followUpDate: interactionData.followUpDate || ""
      };

      const optimisticInteraction = { ...payload, id: 'temp-' + Date.now() };
      trainer.timeline.unshift(optimisticInteraction);
      if (interactionData.updateStage) trainer.status = interactionData.updateStage;
      this.notifyListeners();

      try {
        const response = await fetch(`${API_BASE_URL}/trainers/${trainerId}/timeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const savedEvent = await response.json();
          trainer.timeline = trainer.timeline.map(e => e.id === optimisticInteraction.id ? savedEvent : e);
          if (interactionData.updateStage) {
            await this.updateTrainer(trainerId, { status: interactionData.updateStage });
          }
          this.notifyListeners();
          return savedEvent;
        }
      } catch (error) {
        console.error("Error adding interaction:", error);
      }
      return optimisticInteraction;
    }
    return null;
  }

  async dispatchBrandedEmail(emailData) {
    const payload = {
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName || "",
      senderIdentity: emailData.senderIdentity,
      subject: emailData.subject,
      body: emailData.body,
      trainerId: emailData.trainerId
    };

    const optimisticEmail = { ...payload, id: 'temp-' + Date.now(), timestamp: new Date().toISOString(), status: "Sending..." };
    this.emailOutbox.unshift(optimisticEmail);
    this.notifyListeners();

    try {
      const response = await fetch(`${API_BASE_URL}/emails/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const savedEmail = await response.json();
        this.emailOutbox = this.emailOutbox.map(e => e.id === optimisticEmail.id ? savedEmail : e);
        // Fetch trainers again to get updated timeline
        if (emailData.trainerId) {
          await this.fetchData();
        } else {
          this.notifyListeners();
        }
        return savedEmail;
      }
    } catch (error) {
      console.error("Error sending email:", error);
      optimisticEmail.status = "Failed";
      this.notifyListeners();
    }
    return optimisticEmail;
  }

  async addReminder(reminderData) {
    const payload = {
      trainerId: reminderData.trainerId,
      trainerName: reminderData.trainerName,
      date: reminderData.date,
      time: reminderData.time,
      note: reminderData.note,
      status: reminderData.status || "Pending"
    };

    const optimisticReminder = { ...payload, id: 'temp-' + Date.now(), timestamp: new Date().toISOString() };
    this.reminders.unshift(optimisticReminder);
    this.notifyListeners();

    try {
      const response = await fetch(`${API_BASE_URL}/reminders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const savedReminder = await response.json();
        this.reminders = this.reminders.map(r => r.id === optimisticReminder.id ? savedReminder : r);
        this.notifyListeners();
        return savedReminder;
      }
    } catch (error) {
      console.error("Error adding reminder:", error);
    }
    return optimisticReminder;
  }

  async updateReminderStatus(id, newStatus) {
    const reminder = this.reminders.find(r => r.id === id);
    if (reminder) {
      reminder.status = newStatus;
      this.notifyListeners();

      try {
        const response = await fetch(`${API_BASE_URL}/reminders/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) {
           console.error("Failed to update reminder status on server");
        }
      } catch (error) {
        console.error("Error updating reminder:", error);
      }
      return reminder;
    }
    return null;
  }

  async deleteReminder(id) {
    this.reminders = this.reminders.filter(r => r.id !== id);
    this.notifyListeners();
    try {
      await fetch(`${API_BASE_URL}/reminders/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting reminder:", error);
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this));
  }
}

export const state = new WWStateStore();
