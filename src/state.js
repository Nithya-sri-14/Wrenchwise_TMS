/* ==========================================================================
   Wrench Wise TMS Global State & Local Persistence Management
   ========================================================================== */

// Helper to generate UUIDs locally
function generateUUID() {
  return 'ww-tr-' + Math.random().toString(36).substr(2, 9);
}

// --------------------------------------------------------------------------
// 1. Core Seed Data - 5 High-Fidelity Trainer Profiles
// --------------------------------------------------------------------------
const INITIAL_TRAINERS = [
  {
    id: "ww-tr-harishk",
    name: "Harish Kumar",
    email: "harish.kumar@email.com",
    phone: "+91 98401 23456",
    linkedin: "https://linkedin.com/in/harish-kumar-ios",
    location: "Chennai",
    currentEmployer: "AppCraft Technologies",
    designation: "Principal iOS Engineer",
    totalExperience: 9,
    teachingExperience: 3,
    skills: ["React Native", "Swift", "SwiftUI", "Objective-C", "iOS SDK", "Xcode"],
    certifications: ["Apple Certified App Developer", "Agile Practitioner"],
    education: "B.E. Computer Science, Anna University (2017)",
    source: "LinkedIn",
    dateAdded: "2026-05-10T10:30:00Z",
    dateParsed: "2026-05-10T10:30:00Z",
    
    // HR Enrichment Details
    engagementPreference: "Freelancer",
    currentCTC: "₹18,00,000",
    expectedCTC: "₹22,00,000",
    hourlyExpectation: 2500,
    dailyRate: 18000,
    perSessionPricing: "₹5,000",
    perBatchExpectation: "₹1,20,000",
    negotiability: "Negotiable",
    deliveryMode: "Hybrid",
    travelWillingness: "Selective",
    locationPreference: "Chennai, Bangalore",
    availabilityTimeline: "Immediate (Weekends)",
    audienceFit: ["Working professionals", "Corporate learners"],
    
    status: "Active",
    internalRating: 4.8,
    
    timeline: [
      {
        id: "t-1",
        date: "2026-05-10T10:30:00Z",
        recruiter: "Siddharth (HR)",
        type: "call",
        summary: "Conducted initial screening and verified experience. Highly competent in iOS core architectures.",
        standpoint: "Wants premium batch rates but values Wrench Wise's professional reputation.",
        concern: "Needs schedule blocks strictly on Saturday/Sunday due to week-day full-time contract.",
        nextAction: "Technical Demo scheduled with the Academic Panel.",
        followUpDate: "2026-05-14"
      },
      {
        id: "t-2",
        date: "2026-05-14T15:00:00Z",
        recruiter: "Divya (Academic)",
        type: "demo",
        summary: "Technical demo on 'SwiftUI State Management & Combine framework'. Panel impressed by layout clarity.",
        standpoint: "Presented excellent sandbox exercises and real-world mobile crash logs.",
        concern: "A bit fast-paced on complex custom modifiers; requested to slow down for mid-level students.",
        nextAction: "Discuss commercial negotiation terms.",
        followUpDate: "2026-05-16"
      },
      {
        id: "t-3",
        date: "2026-05-16T11:45:00Z",
        recruiter: "Siddharth (HR)",
        type: "negotiation",
        summary: "Finalized commercial agreements. Settled on ₹2,500/hour for hybrid delivery.",
        standpoint: "Signed commercial disclosure agreement; ready to take up upcoming corporate batch.",
        concern: "Confirmed that Wrench Wise branded laptop/device tags must be provided.",
        nextAction: "Assign to corporate mobile bootcamp.",
        followUpDate: "2026-05-20"
      }
    ],
    assignments: [
      {
        id: "a-1",
        programName: "Advanced iOS SwiftUI Corporate Bootcamp",
        deliveryDates: "April 18 - May 10, 2026",
        deliveryMode: "Hybrid (Chennai HQ)",
        audienceType: "Corporate learners",
        rating: 5,
        notes: "Excellent participant rating of 4.9/5. Praised for industry-grade project sandboxes."
      }
    ]
  },
  {
    id: "ww-tr-anjalis",
    name: "Dr. Anjali Sharma",
    email: "anjali.sharma@science.org",
    phone: "+91 80255 98765",
    linkedin: "https://linkedin.com/in/dr-anjali-sharma-ai",
    location: "Bangalore",
    currentEmployer: "Cognitive Research Labs",
    designation: "Lead AI Researcher",
    totalExperience: 14,
    teachingExperience: 6,
    skills: ["Python", "PyTorch", "Generative AI", "LLMs", "NLP", "Machine Learning", "Transformers"],
    certifications: ["AWS Certified Machine Learning - Specialty", "Google Professional Data Engineer"],
    education: "Ph.D. in Computer Science (AI/ML), IISc Bangalore (2012)",
    source: "Referral",
    dateAdded: "2026-05-18T14:00:00Z",
    dateParsed: "2026-05-18T14:00:00Z",
    
    // HR Enrichment Details
    engagementPreference: "Consultant",
    currentCTC: "₹38,00,000",
    expectedCTC: "₹45,00,000",
    hourlyExpectation: 5000,
    dailyRate: 35000,
    perSessionPricing: "₹10,000",
    perBatchExpectation: "₹2,50,000",
    negotiability: "Non-Negotiable",
    deliveryMode: "Online",
    travelWillingness: "No",
    locationPreference: "Bangalore (Fully Remote)",
    availabilityTimeline: "Within 2 weeks",
    audienceFit: ["Corporate learners", "Working professionals"],
    
    status: "Approved",
    internalRating: 4.9,
    
    timeline: [
      {
        id: "t-4",
        date: "2026-05-18T14:00:00Z",
        recruiter: "Siddharth (HR)",
        type: "call",
        summary: "Contacted following recommendation from Academic Director. Outstanding ML publication profile.",
        standpoint: "Requires online-only delivery due to extensive lab research commitments.",
        concern: "Will not engage in batches with less than 15 senior-level learners.",
        nextAction: "Collect demo scheduling window.",
        followUpDate: "2026-05-22"
      },
      {
        id: "t-5",
        date: "2026-05-22T17:30:00Z",
        recruiter: "Karthik (Academic)",
        type: "demo",
        summary: "Conducted advanced session on 'Fine-Tuning Llama-3 using QLoRA'. Panel rated it exceptional.",
        standpoint: "Exceptional command over math, optimization steps, and quantization tradeoffs.",
        concern: "None. Direct fit for enterprise GenAI client bootcamps.",
        nextAction: "Complete HR profile approval and commercial freeze.",
        followUpDate: "2026-05-25"
      }
    ],
    assignments: []
  },
  {
    id: "ww-tr-vikrams",
    name: "Vikram Sengupta",
    email: "vikram.sengupta@mtech.edu",
    phone: "+91 98200 87654",
    linkedin: "https://linkedin.com/in/vikram-sengupta-stack",
    location: "Mumbai",
    currentEmployer: "Self-Employed Consultant",
    designation: "Freelance Technical Lead",
    totalExperience: 8,
    teachingExperience: 4,
    skills: ["React.js", "Node.js", "Express", "MongoDB", "PostgreSQL", "Docker", "REST APIs"],
    certifications: ["Certified Scrum Master (CSM)", "AWS Cloud Practitioner"],
    education: "M.Tech in Software Engineering, BITS Pilani (2018)",
    source: "Naukri",
    dateAdded: "2026-05-20T09:15:00Z",
    dateParsed: "2026-05-20T09:15:00Z",
    
    // HR Enrichment Details
    engagementPreference: "Freelancer",
    currentCTC: "₹14,00,000",
    expectedCTC: "₹16,50,000",
    hourlyExpectation: 2000,
    dailyRate: 15000,
    perSessionPricing: "₹4,000",
    perBatchExpectation: "₹90,000",
    negotiability: "Highly Negotiable",
    deliveryMode: "Hybrid",
    travelWillingness: "Yes",
    locationPreference: "Mumbai, Pune, Ahmedabad",
    availabilityTimeline: "Immediate",
    audienceFit: ["Students", "Working professionals"],
    
    status: "Demo Scheduled",
    internalRating: 4.2,
    
    timeline: [
      {
        id: "t-6",
        date: "2026-05-20T09:15:00Z",
        recruiter: "Priyanka (HR)",
        type: "call",
        summary: "Sourced via Naukri. Candidate is experienced in MERN stack corporate deliveries.",
        standpoint: "Highly negotiable on rates; eager to establish long-term association with Wrench Wise.",
        concern: "Needs clarity on whether travel and lodging costs for offline modules are fully reimbursed.",
        nextAction: "Confirm tech demo date for React/Node integration.",
        followUpDate: "2026-05-27"
      }
    ],
    assignments: [
      {
        id: "a-2",
        programName: "Full-Stack Development Bootcamp",
        deliveryDates: "January 10 - March 02, 2026",
        deliveryMode: "Offline (Mumbai Learning Center)",
        audienceType: "Students",
        rating: 4.2,
        notes: "Good feedback on coding exercises. A few students requested more assistance with database joins."
      }
    ]
  },
  {
    id: "ww-tr-meerai",
    name: "Meera Iyer",
    email: "meera.iyer@agilecoach.com",
    phone: "+91 94440 98765",
    linkedin: "https://linkedin.com/in/meera-iyer-scrum",
    location: "Hyderabad",
    currentEmployer: "Agile Leadership Partners",
    designation: "Enterprise Agile Coach",
    totalExperience: 12,
    teachingExperience: 5,
    skills: ["Scrum", "Agile Coaching", "SAFe", "Jira", "Product Ownership", "Leadership Development"],
    certifications: ["SAFe Program Consultant (SPC)", "Certified Agile Leadership (CAL)"],
    education: "MBA in Operations & HR, Symbiosis Pune (2014)",
    source: "Word of mouth",
    dateAdded: "2026-05-02T11:00:00Z",
    dateParsed: "2026-05-02T11:00:00Z",
    
    // HR Enrichment Details
    engagementPreference: "Visiting faculty",
    currentCTC: "₹24,00,000",
    expectedCTC: "₹28,00,000",
    hourlyExpectation: 3000,
    dailyRate: 22000,
    perSessionPricing: "₹7,500",
    perBatchExpectation: "₹1,50,000",
    negotiability: "Negotiable",
    deliveryMode: "Offline",
    travelWillingness: "Yes",
    locationPreference: "Hyderabad, Bangalore",
    availabilityTimeline: "4 weeks notice",
    audienceFit: ["Corporate learners"],
    
    status: "Assigned",
    internalRating: 4.5,
    
    timeline: [
      {
        id: "t-7",
        date: "2026-05-02T11:00:00Z",
        recruiter: "Siddharth (HR)",
        type: "call",
        summary: "Referred by senior leadership team. Rich background coaching Fortune 500 Agile teams.",
        standpoint: "Excellent executive presence; focuses heavily on group roleplay and case simulations.",
        concern: "Prefers physical visual boards (whiteboards/post-its) instead of online tools.",
        nextAction: "Conduct alignment demo.",
        followUpDate: "2026-05-08"
      },
      {
        id: "t-8",
        date: "2026-05-08T14:00:00Z",
        recruiter: "Divya (Academic)",
        type: "demo",
        summary: "Demo on 'Agile Estimation & Story Mapping'. Rated high on student facilitation.",
        standpoint: "Keeps the session extremely active and structured.",
        concern: "None.",
        nextAction: "Draft assignment plan.",
        followUpDate: "2026-05-15"
      }
    ],
    assignments: []
  },
  {
    id: "ww-tr-rohanm",
    name: "Rohan Mehta",
    email: "rohan.mehta@cloudops.net",
    phone: "+91 98920 12345",
    linkedin: "https://linkedin.com/in/rohan-mehta-devops",
    location: "Pune",
    currentEmployer: "CloudScale Solutions",
    designation: "Senior Cloud & DevOps Architect",
    totalExperience: 10,
    teachingExperience: 2,
    skills: ["AWS", "Kubernetes", "Terraform", "Ansible", "CI/CD", "Prometheus", "Linux Systems"],
    certifications: ["AWS Certified Solutions Architect - Professional", "Certified Kubernetes Administrator (CKA)"],
    education: "B.Tech in Information Technology, Pune University (2016)",
    source: "Naukri",
    dateAdded: "2026-05-25T16:45:00Z",
    dateParsed: "2026-05-25T16:45:00Z",
    
    // HR Enrichment Details
    engagementPreference: "Consultant",
    currentCTC: "₹20,00,000",
    expectedCTC: "₹25,00,000",
    hourlyExpectation: 3500,
    dailyRate: 25000,
    perSessionPricing: "₹8,000",
    perBatchExpectation: "₹1,80,000",
    negotiability: "Negotiable",
    deliveryMode: "Hybrid",
    travelWillingness: "Yes",
    locationPreference: "Pune, Mumbai, Remote",
    availabilityTimeline: "Immediate",
    audienceFit: ["Working professionals", "Corporate learners"],
    
    status: "New Profile",
    internalRating: 0,
    
    timeline: [
      {
        id: "t-9",
        date: "2026-05-25T16:45:00Z",
        recruiter: "Priyanka (HR)",
        type: "call",
        summary: "Sourced candidate and established first contact. Initial review shows solid infrastructure expertise.",
        standpoint: "Willing to travel for 3-4 day bootcamp blocks. Open to remote labs facilitation.",
        concern: "Needs to verify if AWS learning credits are provided by Wrench Wise for learner sandboxes.",
        nextAction: "Confirm technical screening.",
        followUpDate: "2026-05-29"
      }
    ],
    assignments: []
  }
];

// --------------------------------------------------------------------------
// 2. Global State Store Class
// --------------------------------------------------------------------------
class WWStateStore {
  constructor() {
    this.trainers = [];
    this.emailOutbox = [];
    this.listeners = [];
    this.init();
  }

  init() {
    try {
      const storedTrainers = localStorage.getItem('ww_tms_trainers');
      const storedOutbox = localStorage.getItem('ww_tms_outbox');
      
      if (storedTrainers) {
        this.trainers = JSON.parse(storedTrainers);
        // Self-heal legacy data that might be missing dateAdded or dateParsed
        let needsSave = false;
        this.trainers.forEach(t => {
          if (!t.dateAdded || t.dateAdded === "N/A") {
            t.dateAdded = new Date().toISOString();
            needsSave = true;
          }
          if (!t.dateParsed || t.dateParsed === "N/A") {
            t.dateParsed = t.dateAdded;
            needsSave = true;
          }
        });
        if (needsSave) {
          this.saveTrainers();
        }
      } else {
        this.trainers = [];
        this.saveTrainers();
      }

      if (storedOutbox) {
        this.emailOutbox = JSON.parse(storedOutbox);
      } else {
        this.emailOutbox = [];
        this.saveOutbox();
      }
    } catch (err) {
      console.error("Failed to initialize WW-TMS State. Falling back to memory state.", err);
      this.trainers = [];
      this.emailOutbox = [];
    }
  }

  loadDemoData() {
    this.trainers = JSON.parse(JSON.stringify(INITIAL_TRAINERS));
    this.saveTrainers();
    
    // Seed a couple of sent outreach emails
    this.emailOutbox = [
      {
        id: "m-101",
        timestamp: "2026-05-10T10:45:00Z",
        recipientEmail: "harish.kumar@email.com",
        recipientName: "Harish Kumar",
        senderIdentity: "talent@wrenchwise.in",
        subject: "WW-TMS: Introduction & Screening invitation",
        body: "Hi Harish,\n\nWe saw your outstanding profile on LinkedIn and would love to connect to discuss trainer opportunities at Wrench Wise...\n\nBest Regards,\nSiddharth (Talent Operations)",
        status: "Delivered"
      },
      {
        id: "m-102",
        timestamp: "2026-05-18T14:15:00Z",
        recipientEmail: "anjali.sharma@science.org",
        recipientName: "Dr. Anjali Sharma",
        senderIdentity: "faculty@wrenchwise.in",
        subject: "WW-TMS: Academic Collaboration Enquiry",
        body: "Dear Dr. Anjali,\n\nI am reaching out regarding a highly selective Generative AI corporate delivery targeting working professionals...\n\nBest,\nSiddharth (Academic Ops)",
        status: "Delivered"
      }
    ];
    this.saveOutbox();
  }

  clearDatabase() {
    this.trainers = [];
    this.saveTrainers();
    this.emailOutbox = [];
    this.saveOutbox();
  }

  // Persists the current database lists
  saveTrainers() {
    try {
      localStorage.setItem('ww_tms_trainers', JSON.stringify(this.trainers));
      this.notifyListeners();
    } catch (err) {
      console.error("Storage error during trainer persist", err);
    }
  }

  saveOutbox() {
    try {
      localStorage.setItem('ww_tms_outbox', JSON.stringify(this.emailOutbox));
      this.notifyListeners();
    } catch (err) {
      console.error("Storage error during outbox persist", err);
    }
  }

  // Event dispatch system to bind triggers in components
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this));
  }

  // --------------------------------------------------------------------------
  // 3. Core Database Operations (CRUD & Timeline Actions)
  // --------------------------------------------------------------------------

  // Search & Find Utilities
  getTrainers() {
    return this.trainers;
  }

  getTrainerById(id) {
    return this.trainers.find(t => t.id === id);
  }

  // Checks for duplicates based on email, phone, or LinkedIn URL
  findDuplicateProfiles(profile) {
    return this.trainers.filter(t => {
      const isFallbackEmail = profile.email && profile.email.toLowerCase().trim() === 'no-reply@wrenchwise.in';
      const emailMatch = !isFallbackEmail && profile.email && t.email && t.email.toLowerCase().trim() === profile.email.toLowerCase().trim();
      
      const isFallbackPhone = profile.phone && profile.phone.replace(/[\s\-\+]/g, '') === '919876543210';
      const phoneMatch = !isFallbackPhone && profile.phone && t.phone && t.phone.replace(/[\s\-\+]/g, '') === profile.phone.replace(/[\s\-\+]/g, '');
      
      const linkedinMatch = profile.linkedin && t.linkedin && t.linkedin.toLowerCase().includes(profile.linkedin.toLowerCase().trim());
      
      // Secondary check: similar name and location with defensive type checking
      const nameLocationMatch = profile.name && profile.location &&
        t.name && typeof t.name === 'string' &&
        t.location && typeof t.location === 'string' &&
        t.name.toLowerCase().trim() === profile.name.toLowerCase().trim() &&
        t.location.toLowerCase().trim() === profile.location.toLowerCase().trim();

      return emailMatch || phoneMatch || linkedinMatch || nameLocationMatch;
    });
  }

  // Inserts a new trainer profile
  createTrainer(trainerData) {
    const newTrainer = {
      id: generateUUID(),
      name: trainerData.name || "Unnamed Trainer",
      email: trainerData.email || "",
      phone: trainerData.phone || "",
      linkedin: trainerData.linkedin || "",
      location: trainerData.location || "",
      currentEmployer: trainerData.currentEmployer || "",
      designation: trainerData.designation || "",
      totalExperience: parseInt(trainerData.totalExperience) || 0,
      teachingExperience: parseInt(trainerData.teachingExperience) || 0,
      skills: Array.isArray(trainerData.skills) ? trainerData.skills : (trainerData.skills ? trainerData.skills.split(',').map(s => s.trim()) : []),
      certifications: Array.isArray(trainerData.certifications) ? trainerData.certifications : (trainerData.certifications ? trainerData.certifications.split(',').map(s => s.trim()) : []),
      education: trainerData.education || "",
      source: trainerData.source || "LinkedIn",
      dateAdded: trainerData.dateAdded || new Date().toISOString(),
      dateParsed: trainerData.dateParsed || new Date().toISOString(),
      
      // HR Enrichment Details
      engagementPreference: trainerData.engagementPreference || "Freelancer",
      currentCTC: trainerData.currentCTC || "",
      expectedCTC: trainerData.expectedCTC || "",
      hourlyExpectation: parseFloat(trainerData.hourlyExpectation) || 0,
      dailyRate: parseFloat(trainerData.dailyRate) || 0,
      perSessionPricing: trainerData.perSessionPricing || "",
      perBatchExpectation: trainerData.perBatchExpectation || "",
      negotiability: trainerData.negotiability || "Negotiable",
      deliveryMode: trainerData.deliveryMode || "Hybrid",
      travelWillingness: trainerData.travelWillingness || "Yes",
      locationPreference: trainerData.locationPreference || trainerData.location || "",
      availabilityTimeline: trainerData.availabilityTimeline || "Immediate",
      audienceFit: Array.isArray(trainerData.audienceFit) ? trainerData.audienceFit : ["Working professionals"],
      
      status: trainerData.status || "New Profile",
      internalRating: parseFloat(trainerData.internalRating) || 0,
      
      timeline: trainerData.timeline || [],
      assignments: trainerData.assignments || []
    };

    this.trainers.push(newTrainer);
    this.saveTrainers();
    return newTrainer;
  }

  // Updates an existing trainer profile
  updateTrainer(id, updatedFields) {
    const index = this.trainers.findIndex(t => t.id === id);
    if (index !== -1) {
      // Correct fields that could be numeric or arrays
      const current = this.trainers[index];
      
      if (updatedFields.skills && typeof updatedFields.skills === 'string') {
        updatedFields.skills = updatedFields.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (updatedFields.certifications && typeof updatedFields.certifications === 'string') {
        updatedFields.certifications = updatedFields.certifications.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (updatedFields.audienceFit && typeof updatedFields.audienceFit === 'string') {
        updatedFields.audienceFit = updatedFields.audienceFit.split(',').map(s => s.trim()).filter(Boolean);
      }

      this.trainers[index] = {
        ...current,
        ...updatedFields
      };
      
      this.saveTrainers();
      return this.trainers[index];
    }
    return null;
  }

  // Deletes a trainer profile
  deleteTrainer(id) {
    this.trainers = this.trainers.filter(t => t.id !== id);
    this.saveTrainers();
  }

  // Append a timeline interaction to a trainer record
  addTrainerInteraction(trainerId, interactionData) {
    const trainer = this.getTrainerById(trainerId);
    if (trainer) {
      const newInteraction = {
        id: 't-int-' + Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        recruiter: interactionData.recruiter || "Talent Operations",
        type: interactionData.type || "call", // call, email, whatsapp, demo, negotiation
        summary: interactionData.summary || "",
        standpoint: interactionData.standpoint || "",
        concern: interactionData.concern || "",
        nextAction: interactionData.nextAction || "",
        followUpDate: interactionData.followUpDate || ""
      };

      trainer.timeline.unshift(newInteraction);
      
      // Update stage if required
      if (interactionData.updateStage) {
        trainer.status = interactionData.updateStage;
      }

      this.saveTrainers();
      return newInteraction;
    }
    return null;
  }

  // Log a sent email in the global outbox log and corresponding trainer history
  dispatchBrandedEmail(emailData) {
    const newMail = {
      id: 'ww-mail-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName || "",
      senderIdentity: emailData.senderIdentity,
      subject: emailData.subject,
      body: emailData.body,
      status: "Delivered"
    };

    // Store in outbox logs
    this.emailOutbox.unshift(newMail);
    this.saveOutbox();

    // Log as a timeline interaction if trainer exists
    if (emailData.trainerId) {
      this.addTrainerInteraction(emailData.trainerId, {
        recruiter: `Talent Operations (${emailData.senderIdentity.split('@')[0]})`,
        type: "email",
        summary: `Sent automated email outreach: "${emailData.subject}".`,
        standpoint: "Awaiting candidate response.",
        concern: "",
        nextAction: "Follow up via Email or Phone",
        followUpDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0] // 3 days later
      });
    }

    return newMail;
  }

  getOutboxLogs() {
    return this.emailOutbox;
  }
}

// Instantiate Global Store Singleton
export const state = new WWStateStore();
