/* ==========================================================================
   Wrench Wise TMS Main Core Application (Router, Views, and Handlers)
   ========================================================================== */

import { state } from './state.js';
import { AIParsingService, EMAIL_TEMPLATES } from './mockServices.js';

// Global variables for active navigation state
let currentView = 'dashboard';
let activeTrainerId = null;
let activeDraftTrainerData = null; // Stores draft profile during intake review
let activeDirectoryFilterPreset = null; // Stores preset filters from dashboard clicks

// Batch upload queue state
let uploadQueue = []; // [{ id, filename, file, status: 'waiting'|'processing'|'done'|'error', parsedData, errorMsg }]
let activeQueueItemId = null; // Which queue item's draft is currently shown in review pane
let isQueueProcessing = false; // Guard against parallel queue runs

// DOM Selectors
const mainContentPanel = document.getElementById('main-content-panel');
const navButtons = document.querySelectorAll('.nav-btn');
const intakeQueueBadge = document.getElementById('intake-queue-badge');

// Global Native Dialog for Duplicate Intercept
const duplicateDialog = document.getElementById('duplicate-shield-dialog');
const dupDraftDetails = document.getElementById('dup-draft-details');
const dupExistingDetails = document.getElementById('dup-existing-details');
const dupBtnDiscard = document.getElementById('dup-btn-discard');
const dupBtnMerge = document.getElementById('dup-btn-merge');
const dupBtnView = document.getElementById('dup-btn-view');

// --------------------------------------------------------------------------
// 1. Toast Notifications Core Utility
// --------------------------------------------------------------------------
function showToast(message, type = 'success') {
  const toastLayer = document.getElementById('toast-layer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.role = 'alert';
  
  // Icon based on type
  let icon = '';
  if (type === 'success') icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  else if (type === 'warning') icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
  else if (type === 'danger') icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
    <button class="toast-close" aria-label="Close message">&times;</button>
  `;

  toastLayer.appendChild(toast);

  // Auto-remove after 4.5s
  const timer = setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 4500);

  // Click close trigger
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    toast.remove();
  });
}

// Date Formatter Helper
function formatDate(dateStr) {
  const finalDateStr = (dateStr && dateStr !== 'N/A') ? dateStr : new Date().toISOString();
  const d = new Date(finalDateStr);
  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --------------------------------------------------------------------------
// 2. View Coordinator (Router)
// --------------------------------------------------------------------------
function switchView(viewName, trainerId = null, filterPreset = null) {
  currentView = viewName;
  activeTrainerId = trainerId;
  if (viewName === 'directory') {
    activeDirectoryFilterPreset = filterPreset;
  }
  
  // Update sidebar active buttons visually
  navButtons.forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.classList.remove('active');
      btn.removeAttribute('aria-current');
    }
  });

  // Render loading views
  mainContentPanel.innerHTML = `
    <div class="loading-view-spinner" aria-label="Navigating view...">
      <div class="spinner-core"></div>
    </div>
  `;

  // Dynamic View Renderer router
  setTimeout(() => {
    switch (viewName) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'intake':
        renderIntake();
        break;
      case 'directory':
        renderDirectory();
        break;
      case 'outbox':
        renderOutbox();
        break;
      case 'settings':
        renderSettings();
        break;
      case 'reminders':
        renderReminders();
        break;
      case 'profile-detail':
        if (trainerId) renderTrainerDetail(trainerId);
        else switchView('directory');
        break;
      default:
        renderDashboard();
    }
  }, 150);
}

// --------------------------------------------------------------------------
// 3. View Renderers - (A) Dashboard Module
// --------------------------------------------------------------------------
function renderDashboard() {
  const trainers = state.getTrainers();
  const outbox = state.getOutboxLogs();
  
  // Calculate statistics metrics
  const totalTrainers = trainers.length;
  const activeCount = trainers.filter(t => t.status === 'Active').length;
  const pendingIntake = trainers.filter(t => t.status === 'New Profile' || t.status === 'Contact Pending').length;
  
  // Average hourly rate calculation
  const freelancerHourly = trainers.filter(t => t.engagementPreference === 'Freelancer' && t.hourlyExpectation > 0);
  const avgRate = freelancerHourly.length 
    ? Math.round(freelancerHourly.reduce((acc, curr) => acc + curr.hourlyExpectation, 0) / freelancerHourly.length)
    : 2200;

  // Build active parsing queues mock items
  const parsingQueueMock = [
    { name: "Sample_Resume_PriyaRao_DataScience.pdf", status: "Ready to Extract" },
    { name: "Resume_KiranKumar_FullStack.docx", status: "Ready to Extract" },
    { name: "Scanned_Resume_Meenakshi_Devops.png", status: "Ready to OCR Extract" }
  ];

  // Update sidebar badge queue size
  intakeQueueBadge.textContent = parsingQueueMock.length;

  mainContentPanel.innerHTML = `
    <div class="view-header">
      <div class="view-header-title">
        <h1>Dashboard Insights</h1>
        <p>Wrench Wise TMS operational metrics & quick processing hubs.</p>
      </div>
    </div>

    <!-- Quick stats grid -->
    <div class="dashboard-grid">
      <div class="glass-panel stat-card clickable" id="dash-card-total-trainers" tabindex="0" role="button" aria-label="View all trainers">
        <div class="stat-header">
          <span>TOTAL TRAINERS</span>
          <div class="stat-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </div>
        <div class="stat-number">${totalTrainers}</div>
        <div class="stat-footer"><span>+3</span> new profiles this week</div>
      </div>
      
      <div class="glass-panel stat-card active-deliveries clickable" id="dash-card-active-cohort" tabindex="0" role="button" aria-label="View active cohort trainers">
        <div class="stat-header">
          <span>ACTIVE COHORT</span>
          <div class="stat-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
        </div>
        <div class="stat-number">${activeCount}</div>
        <div class="stat-footer"><span class="stat-footer-link" id="dash-link-active-assignments" tabindex="0" role="button" aria-label="View active assignments">${trainers.filter(t => t.assignments.length > 0).length}</span> with active assignments</div>
      </div>

      <div class="glass-panel stat-card pending-intake clickable" id="dash-card-pending-hr" tabindex="0" role="button" aria-label="View pending HR action profiles">
        <div class="stat-header">
          <span>PENDING HR ACTION</span>
          <div class="stat-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
        </div>
        <div class="stat-number">${pendingIntake}</div>
        <div class="stat-footer">Requires initial call setup</div>
      </div>

      <div class="glass-panel stat-card commercials">
        <div class="stat-header">
          <span>AVERAGE RATE</span>
          <div class="stat-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="stat-number">₹${avgRate}</div>
        <div class="stat-footer">Per Hour (Freelance avg)</div>
      </div>
    </div>

    <!-- Secondary details grids -->
    <div class="dashboard-details-grid">
      <!-- Left side: AI parsing queue -->
      <div class="glass-panel">
        <div class="panel-header">
          <h3>Resume Intake Parsing Queue</h3>
          <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" id="dash-btn-go-intake">Go to Intake</button>
        </div>
        <div class="queue-list">
          ${parsingQueueMock.map(item => `
            <div class="queue-item">
              <div class="queue-trainer-info">
                <div class="queue-avatar">📄</div>
                <div class="queue-meta">
                  <h4>${item.name}</h4>
                  <p>Added: Today</p>
                </div>
              </div>
              <span class="queue-status-tag parsing">${item.status}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Right side: Skill distributions -->
      <div class="glass-panel">
        <div class="panel-header">
          <h3>Academy Skills Share</h3>
        </div>
        <div class="distribution-container">
          <div class="dist-bar-group">
            <div class="dist-bar-header">
              <span class="dist-bar-label">Frontend (React / Next.js)</span>
              <span class="dist-bar-val">42%</span>
            </div>
            <div class="dist-bar-track">
              <div class="dist-bar-fill" style="width: 42%;"></div>
            </div>
          </div>

          <div class="dist-bar-group">
            <div class="dist-bar-header">
              <span class="dist-bar-label">Mobile Dev (React Native / SwiftUI)</span>
              <span class="dist-bar-val">28%</span>
            </div>
            <div class="dist-bar-track">
              <div class="dist-bar-fill" style="width: 28%;"></div>
            </div>
          </div>

          <div class="dist-bar-group">
            <div class="dist-bar-header">
              <span class="dist-bar-label">AI / Machine Learning (LLMs)</span>
              <span class="dist-bar-val">18%</span>
            </div>
            <div class="dist-bar-track">
              <div class="dist-bar-fill" style="width: 18%;"></div>
            </div>
          </div>

          <div class="dist-bar-group">
            <div class="dist-bar-header">
              <span class="dist-bar-label">Cloud Systems & DevOps</span>
              <span class="dist-bar-val">12%</span>
            </div>
            <div class="dist-bar-track">
              <div class="dist-bar-fill" style="width: 12%;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Dashboard listeners
  document.getElementById('dash-btn-go-intake').addEventListener('click', () => switchView('intake'));

  // Quick stats card redirection event listeners
  const totalCard = document.getElementById('dash-card-total-trainers');
  const activeCard = document.getElementById('dash-card-active-cohort');
  const assignmentsLink = document.getElementById('dash-link-active-assignments');
  const pendingCard = document.getElementById('dash-card-pending-hr');

  // Accessible keyboard event helper
  const handleKeyClick = (el, action) => {
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    });
  };

  if (totalCard) {
    totalCard.addEventListener('click', () => switchView('directory', null, null));
    handleKeyClick(totalCard, () => switchView('directory', null, null));
  }

  if (activeCard) {
    activeCard.addEventListener('click', (e) => {
      if (e.target.id === 'dash-link-active-assignments') return;
      switchView('directory', null, { status: 'Active' });
    });
    handleKeyClick(activeCard, () => switchView('directory', null, { status: 'Active' }));
  }

  if (assignmentsLink) {
    assignmentsLink.addEventListener('click', (e) => {
      e.stopPropagation();
      switchView('directory', null, { hasAssignments: true });
    });
    handleKeyClick(assignmentsLink, () => switchView('directory', null, { hasAssignments: true }));
  }

  if (pendingCard) {
    pendingCard.addEventListener('click', () => switchView('directory', null, { status: 'Pending HR Action' }));
    handleKeyClick(pendingCard, () => switchView('directory', null, { status: 'Pending HR Action' }));
  }
}

// --------------------------------------------------------------------------
// 3. View Renderers - (B) Sourcing & Intake Drag & Drop Module
// --------------------------------------------------------------------------
function renderIntake(draftData = null) {
  // Reset queue state when view loads fresh
  if (!draftData) {
    uploadQueue = [];
    activeQueueItemId = null;
    isQueueProcessing = false;
  }

  mainContentPanel.innerHTML = `
    <div class="view-header">
      <div class="view-header-title">
        <h1>Trainer Intake Hub</h1>
        <p>Upload one or multiple resumes — AI will extract and queue each profile for review.</p>
      </div>
    </div>

    <div class="intake-split">
      <!-- Left Column: File drop zone + queue -->
      <div class="intake-uploader">
        <div class="glass-panel">
          <div class="panel-header">
            <h3>Resume Upload Ingestion</h3>
            <span class="badge" style="background: rgba(99,102,241,0.12); color: var(--primary-indigo); border: 1px solid rgba(99,102,241,0.2); font-size: 0.72rem;">Multi-Upload Supported</span>
          </div>
          
          <div class="upload-zone" id="resume-drop-zone">
            <div class="scanning-overlay" id="upload-scan-overlay">
              <div class="scanning-bar"></div>
              <div class="scanning-text" id="upload-scan-status">AI Extraction Running...</div>
              <p style="color: var(--text-secondary); font-size: 0.85rem;">Running OCR Parsing Framework models...</p>
            </div>
            
            <div class="upload-icon-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <h3>Drag &amp; Drop Resumes</h3>
            <p>PDF, DOCX, PNG, or JPG &mdash; select multiple files at once (Up to 10MB each)</p>
            <button class="btn btn-primary" style="position:relative; z-index: 2;">Browse &amp; Select Files</button>
            <input type="file" class="file-input" id="resume-file-input" multiple accept=".pdf,.docx,.doc,.png,.jpg,.jpeg">
          </div>

          <!-- Channel Tag Selector -->
          <div class="form-group-row">
            <span class="label-title">Sourcing Intake Channel</span>
            <div class="channel-tag-group">
              <input type="radio" name="source-channel" id="c-linkedin" value="LinkedIn" class="channel-tag-radio" checked>
              <label for="c-linkedin" class="channel-tag-label">LinkedIn</label>
              
              <input type="radio" name="source-channel" id="c-naukri" value="Naukri" class="channel-tag-radio">
              <label for="c-naukri" class="channel-tag-label">Naukri</label>
              
              <input type="radio" name="source-channel" id="c-referral" value="Referral" class="channel-tag-radio">
              <label for="c-referral" class="channel-tag-label">Referral</label>
              
              <input type="radio" name="source-channel" id="c-direct" value="Direct App" class="channel-tag-radio">
              <label for="c-direct" class="channel-tag-label">Direct App</label>
            </div>
          </div>
        </div>

        <!-- Batch Processing Queue Panel -->
        <div class="glass-panel" id="batch-queue-panel">
          <div class="panel-header" style="justify-content: space-between; align-items: center;">
            <h3>Batch Processing Queue</h3>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span class="badge" id="queue-count-badge" style="background: rgba(16,185,129,0.1); color: var(--accent-emerald); border: 1px solid rgba(16,185,129,0.2); display: none;"></span>
              <button class="btn btn-secondary" id="btn-add-all-drafts" style="font-size: 0.75rem; padding: 0.3rem 0.75rem; display: none;">✅ Add All Done</button>
            </div>
          </div>
          <div id="batch-queue-list">
            ${renderQueueListHTML()}
          </div>
        </div>

        <!-- Sample clickable resumes for testing -->
        <div class="glass-panel" id="sample-files-panel">
          <div class="panel-header">
            <h3>Sample Test Files <span style="font-size:0.72rem; color: var(--text-secondary); font-weight:400;">(Click to simulate ingestion)</span></h3>
          </div>
          <div class="sample-resumes-container">
            <div class="sample-grid">
              <div class="sample-card pdf" data-filename="Sample_Resume_PriyaRao_DataScience.pdf">
                <div class="sample-file-icon">PDF</div>
                <div class="sample-meta">
                  <h5>PriyaRao_DS.pdf</h5>
                  <p>Data Science Specialist</p>
                </div>
              </div>
              <div class="sample-card docx" data-filename="Resume_KiranKumar_FullStack.docx">
                <div class="sample-file-icon">DOC</div>
                <div class="sample-meta">
                  <h5>Kiran_Fullstack.docx</h5>
                  <p>MERN Stack Expert</p>
                </div>
              </div>
            </div>
            <div class="sample-grid">
              <div class="sample-card png" data-filename="Scanned_Resume_Meenakshi_Devops.png">
                <div class="sample-file-icon">IMG</div>
                <div class="sample-meta">
                  <h5>Meenakshi_Devops.png</h5>
                  <p>Scanned OCR Ingestion</p>
                </div>
              </div>
              <!-- Manual Draft Creation card -->
              <div class="sample-card manual" id="btn-manual-draft" style="border-color: rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.01);">
                <div class="sample-file-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--primary-indigo);">➕</div>
                <div class="sample-meta">
                  <h5>Manual Profile Intake</h5>
                  <p>Start from blank form</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Extracted Draft review -->
      <div class="intake-review-container" id="intake-review-pane">
        ${renderReviewFormMarkup(draftData)}
      </div>
    </div>
  `;

  // Attach intake view interactive triggers
  setupIntakeListeners();
}

// Renders the HTML for the batch queue list (called on every queue state update)
function renderQueueListHTML() {
  if (uploadQueue.length === 0) {
    return `
      <div class="queue-empty-state">
        <span style="font-size: 1.5rem;">📂</span>
        <p>No files queued yet.</p>
        <p style="font-size: 0.78rem; color: var(--text-muted, #6b7280);">Drop multiple resumes above or click the sample cards to begin batch ingestion.</p>
      </div>
    `;
  }

  return uploadQueue.map(item => {
    const ext = (typeof item.filename === 'string' ? item.filename : item.filename.name || '').split('.').pop().toLowerCase();
    const extLabel = ['pdf'].includes(ext) ? 'PDF' : ['docx','doc'].includes(ext) ? 'DOC' : ['png','jpg','jpeg'].includes(ext) ? 'IMG' : 'FILE';
    const extClass = ['pdf'].includes(ext) ? 'pdf' : ['docx','doc'].includes(ext) ? 'docx' : 'png';
    const shortName = (typeof item.filename === 'string' ? item.filename : item.filename.name || 'file').length > 28
      ? (typeof item.filename === 'string' ? item.filename : item.filename.name || 'file').slice(0, 25) + '...'
      : (typeof item.filename === 'string' ? item.filename : item.filename.name || 'file');

    let statusBadge = '';
    if (item.status === 'waiting')    statusBadge = `<span class="queue-badge waiting">⏳ Waiting</span>`;
    if (item.status === 'processing') statusBadge = `<span class="queue-badge processing"><span class="queue-spinner"></span> Parsing...</span>`;
    if (item.status === 'done')       statusBadge = `<span class="queue-badge done">✅ Done</span>`;
    if (item.status === 'error')      statusBadge = `<span class="queue-badge error">❌ Error</span>`;

    const isActive = item.id === activeQueueItemId;
    const isClickable = item.status === 'done';

    return `
      <div class="queue-item ${isActive ? 'queue-item-active' : ''} ${isClickable ? 'queue-item-clickable' : ''}"
           data-queue-id="${item.id}"
           role="${isClickable ? 'button' : 'listitem'}"
           tabindex="${isClickable ? '0' : '-1'}"
           title="${isClickable ? 'Click to view extracted draft' : item.status === 'error' ? (item.errorMsg || 'Extraction failed') : ''}"
      >
        <div class="queue-item-icon ${extClass}">${extLabel}</div>
        <div class="queue-item-meta">
          <span class="queue-item-name">${shortName}</span>
          ${item.parsedData ? `<span class="queue-item-sub">${item.parsedData.name || 'Profile extracted'}</span>` : ''}
        </div>
        <div class="queue-item-status">
          ${statusBadge}
          ${isClickable ? `<button class="queue-view-btn" data-queue-id="${item.id}" title="Open draft">👁 View</button>` : ''}
          <button class="queue-remove-btn" data-queue-id="${item.id}" title="Remove from queue" ${item.status === 'processing' ? 'disabled' : ''}>✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// Updates queue panel DOM without full re-render
function refreshQueueUI() {
  const listEl = document.getElementById('batch-queue-list');
  const countBadge = document.getElementById('queue-count-badge');
  const addAllBtn = document.getElementById('btn-add-all-drafts');

  if (listEl) listEl.innerHTML = renderQueueListHTML();

  const doneCount = uploadQueue.filter(i => i.status === 'done').length;
  const totalCount = uploadQueue.length;

  if (countBadge) {
    if (totalCount > 0) {
      countBadge.textContent = `${doneCount}/${totalCount} Done`;
      countBadge.style.display = 'inline-block';
    } else {
      countBadge.style.display = 'none';
    }
  }

  if (addAllBtn) {
    addAllBtn.style.display = (doneCount >= 2) ? 'inline-block' : 'none';
  }

  // Re-bind queue item click/remove listeners
  bindQueueItemListeners();
}

// Sub-utility: builds the form panel depending on whether parsing state exists
function renderReviewFormMarkup(draftData) {
  if (!draftData) {
    return `
      <div class="glass-panel empty-review-placeholder" style="height: 100%;">
        <div class="placeholder-illustration">🔍</div>
        <h3>AI Extracted Draft Review</h3>
        <p>No resume processed yet. Drop a file, upload, or click one of our test profiles on the left to watch Wrench Wise AI process fields dynamically.</p>
      </div>
    `;
  }

  // Pre-fill skills as comma string
  const skillsStr = Array.isArray(draftData.skills) ? draftData.skills.join(', ') : '';
  const certsStr = Array.isArray(draftData.certifications) ? draftData.certifications.join(', ') : '';

  const duplicates = state.findDuplicateProfiles(draftData);
  const isDuplicate = duplicates.length > 0;

  return `
    <div class="glass-panel">
      <div class="panel-header">
        <h3>AI Extracted Draft Review</h3>
        <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.2);">Confidence 96%</span>
      </div>
      
      <form class="tms-form" id="intake-draft-form" novalidate>
        <div class="alert alert-danger" id="intake-duplicate-banner" style="background: rgba(244, 63, 94, 0.1); color: var(--accent-rose); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(244, 63, 94, 0.2); margin-bottom: 1.5rem; display: ${isDuplicate ? 'block' : 'none'};">
          ⚠️ <strong>Already Available:</strong> This trainer profile (email, phone, or LinkedIn) is already in the database. Clicking "Verify & Resolve Duplicate" will open the Duplicate Shield Intercept dialog to let you Overwrite & Merge or View the existing profile.
        </div>

        <h4>1. Standard Extracted Attributes</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="intake-name">Trainer Name *</label>
            <input type="text" id="intake-name" class="form-control" value="${draftData.name || ''}" required autocomplete="name">
          </div>
          <div class="form-group">
            <label for="intake-email">Email Address *</label>
            <input type="email" id="intake-email" class="form-control" value="${draftData.email || ''}" required autocomplete="email">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-phone">Phone Number *</label>
            <input type="tel" id="intake-phone" class="form-control" value="${draftData.phone || ''}" required autocomplete="tel">
          </div>
          <div class="form-group">
            <label for="intake-location">Primary City *</label>
            <input type="text" id="intake-location" class="form-control" value="${draftData.location || ''}" required autocomplete="address-level2">
          </div>
        </div>

        <div class="form-group">
          <label for="intake-linkedin">LinkedIn URL</label>
          <input type="url" id="intake-linkedin" class="form-control" value="${draftData.linkedin || ''}">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-employer">Current Employer</label>
            <input type="text" id="intake-employer" class="form-control" value="${draftData.currentEmployer || ''}">
          </div>
          <div class="form-group">
            <label for="intake-designation">Designation</label>
            <input type="text" id="intake-designation" class="form-control" value="${draftData.designation || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-total-exp">Total Experience (Years)</label>
            <input type="number" id="intake-total-exp" class="form-control" value="${draftData.totalExperience || 0}">
          </div>
          <div class="form-group">
            <label for="intake-teach-exp">Teaching Experience (Years)</label>
            <input type="number" id="intake-teach-exp" class="form-control" value="${draftData.teachingExperience || 0}">
          </div>
        </div>

        <div class="form-group">
          <label for="intake-skills">Key Technology Skills (Comma separated)</label>
          <input type="text" id="intake-skills" class="form-control" value="${skillsStr}" placeholder="e.g. React.js, Node.js, Git">
        </div>

        <div class="form-group">
          <label for="intake-certs">Certifications (Comma separated)</label>
          <input type="text" id="intake-certs" class="form-control" value="${certsStr}" placeholder="AWS Certified Solutions Architect, Scrum Coach">
        </div>

        <div class="form-group">
          <label for="intake-education">Highest Education</label>
          <input type="text" id="intake-education" class="form-control" value="${draftData.education || ''}" autocomplete="honorific-prefix">
        </div>

        <h4 style="margin-top: 1rem;">2. Sourcing Enrichment (HR Screen Insights)</h4>
        
        <div class="form-row">
          <div class="form-group">
            <label for="intake-engagement">Engagement Preference</label>
            <select id="intake-engagement" class="form-control">
              <option value="Freelancer" ${draftData.engagementPreference === 'Freelancer' ? 'selected' : ''}>Freelancer</option>
              <option value="Consultant" ${draftData.engagementPreference === 'Consultant' ? 'selected' : ''}>Consultant</option>
              <option value="Visiting faculty" ${draftData.engagementPreference === 'Visiting faculty' ? 'selected' : ''}>Visiting faculty</option>
              <option value="Full-time" ${draftData.engagementPreference === 'Full-time' ? 'selected' : ''}>Full-time</option>
            </select>
          </div>
          <div class="form-group">
            <label for="intake-delivery">Delivery Mode Preference</label>
            <select id="intake-delivery" class="form-control">
              <option value="Hybrid" ${draftData.deliveryMode === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
              <option value="Online" ${draftData.deliveryMode === 'Online' ? 'selected' : ''}>Online</option>
              <option value="Offline" ${draftData.deliveryMode === 'Offline' ? 'selected' : ''}>Offline</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-current-ctc">Current CTC</label>
            <input type="text" id="intake-current-ctc" class="form-control" value="${draftData.currentCTC || ''}" placeholder="e.g. ₹18,00,000">
          </div>
          <div class="form-group">
            <label for="intake-expected-ctc">Expected CTC</label>
            <input type="text" id="intake-expected-ctc" class="form-control" value="${draftData.expectedCTC || ''}" placeholder="e.g. ₹22,00,000">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-travel">Travel Willingness</label>
            <select id="intake-travel" class="form-control">
              <option value="Yes" ${draftData.travelWillingness === 'Yes' ? 'selected' : ''}>Yes (Open to travel)</option>
              <option value="No" ${draftData.travelWillingness === 'No' ? 'selected' : ''}>No (Local only)</option>
              <option value="Selective" ${draftData.travelWillingness === 'Selective' ? 'selected' : ''}>Selective (Corporate only)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="intake-negotiable">Negotiability Status</label>
            <select id="intake-negotiable" class="form-control">
              <option value="Negotiable" ${draftData.negotiability === 'Negotiable' ? 'selected' : ''}>Negotiable</option>
              <option value="Highly Negotiable" ${draftData.negotiability === 'Highly Negotiable' ? 'selected' : ''}>Highly Negotiable</option>
              <option value="Non-Negotiable" ${draftData.negotiability === 'Non-Negotiable' ? 'selected' : ''}>Non-Negotiable</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="reset" class="btn btn-secondary" id="btn-intake-clear" style="flex:1;">Clear Form</button>
          <button type="submit" class="btn btn-primary" style="flex:2; ${isDuplicate ? 'background-color: var(--accent-rose); border-color: var(--accent-rose);' : ''}">
            ${isDuplicate ? 'Verify & Resolve Duplicate' : 'Verify & Add Trainer'}
          </button>
        </div>
      </form>
    </div>
  `;
}

function setupIntakeListeners() {
  const dropZone = document.getElementById('resume-drop-zone');
  const fileInput = document.getElementById('resume-file-input');
  const scanOverlay = document.getElementById('upload-scan-overlay');
  const scanStatus = document.getElementById('upload-scan-status');

  // ── Adds files to queue and starts processing ────────────────────────────
  const enqueueFiles = (fileOrNames) => {
    const items = Array.isArray(fileOrNames) ? fileOrNames : [fileOrNames];
    const newItems = items.map(f => ({
      id: 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      filename: f,          // File object OR mock string filename
      status: 'waiting',
      parsedData: null,
      errorMsg: ''
    }));
    uploadQueue = [...uploadQueue, ...newItems];
    refreshQueueUI();
    // Hide sample panel when queue has real uploads
    if (newItems.length > 0) {
      const samplePanel = document.getElementById('sample-files-panel');
      if (samplePanel) samplePanel.style.display = 'none';
    }
    processQueue(scanOverlay, scanStatus);
  };

  // Drag & drop handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    if (files.length) enqueueFiles(files);
  });

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    if (files.length) {
      enqueueFiles(files);
      fileInput.value = ''; // reset so same files can be re-added
    }
  });

  // Sample cards click trigger — each click adds 1 mock file to queue
  document.querySelectorAll('.sample-card:not(.manual)').forEach(card => {
    card.addEventListener('click', () => {
      enqueueFiles([card.dataset.filename]);
    });
  });

  // Manual draft creator click trigger
  document.getElementById('btn-manual-draft').addEventListener('click', () => {
    activeDraftTrainerData = {
      name: "", email: "", phone: "", linkedin: "", location: "",
      currentEmployer: "", designation: "", totalExperience: 0, teachingExperience: 0,
      skills: [], certifications: [], education: "", source: "Direct App",
      engagementPreference: "Freelancer", deliveryMode: "Hybrid",
      hourlyExpectation: 0, dailyRate: 0, travelWillingness: "Yes", negotiability: "Negotiable"
    };
    activeQueueItemId = null;
    document.getElementById('intake-review-pane').innerHTML = renderReviewFormMarkup(activeDraftTrainerData);
    bindDraftSubmitListener();
    showToast("Blank intake profile ready.", "warning");
  });

  // "Add All Done" batch save button
  const addAllBtn = document.getElementById('btn-add-all-drafts');
  if (addAllBtn) {
    addAllBtn.addEventListener('click', () => {
      const doneItems = uploadQueue.filter(i => i.status === 'done' && i.parsedData);
      if (doneItems.length === 0) return;

      const checkedSourceEl = document.querySelector('input[name="source-channel"]:checked');
      const source = checkedSourceEl ? checkedSourceEl.value : 'LinkedIn';
      let saved = 0, skipped = 0;

      doneItems.forEach(item => {
        const pd = item.parsedData;
        const dups = state.findDuplicateProfiles(pd);
        if (dups.length === 0) {
          state.createTrainer({
            ...pd,
            source,
            status: 'New Profile',
            skills: Array.isArray(pd.skills) ? pd.skills : (pd.skills ? String(pd.skills).split(',').map(s => s.trim()) : []),
            certifications: Array.isArray(pd.certifications) ? pd.certifications : (pd.certifications ? String(pd.certifications).split(',').map(s => s.trim()) : []),
            dateAdded: pd.dateAdded || new Date().toISOString(),
            dateParsed: pd.dateParsed || new Date().toISOString(),
            timeline: [{ id: 't-intake-batch', date: new Date().toISOString(), recruiter: 'Talent Operations (System)', type: 'call', summary: 'Batch parsed and verified via intake channel.', standpoint: 'Pending initial call.', concern: '', nextAction: 'Perform HR Screening Call', followUpDate: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0] }]
          });
          saved++;
        } else {
          skipped++;
        }
      });

      if (saved > 0) showToast(`✅ ${saved} trainer profile${saved > 1 ? 's' : ''} added successfully!`, 'success');
      if (skipped > 0) showToast(`⚠️ ${skipped} profile${skipped > 1 ? 's' : ''} skipped (duplicate detected).`, 'warning');
      
      // Purge all processed doneItems from the uploadQueue
      uploadQueue = uploadQueue.filter(i => !doneItems.includes(i));
      if (doneItems.some(i => i.id === activeQueueItemId)) {
        activeQueueItemId = null;
        activeDraftTrainerData = null;
        const reviewPane = document.getElementById('intake-review-pane');
        if (reviewPane) {
          reviewPane.innerHTML = renderReviewFormMarkup(null);
        }
      }
      refreshQueueUI();

      if (saved > 0) setTimeout(() => switchView('directory'), 1200);
    });
  }

  bindDraftSubmitListener();
}

// ── Sequential queue processor ───────────────────────────────────────────────
async function processQueue(scanOverlay, scanStatus) {
  if (isQueueProcessing) return; // prevent concurrent runs
  isQueueProcessing = true;

  while (true) {
    const nextItem = uploadQueue.find(i => i.status === 'waiting');
    if (!nextItem) break;

    // Mark as processing
    nextItem.status = 'processing';
    refreshQueueUI();
    if (scanOverlay) scanOverlay.classList.add('active');

    try {
      const parsedData = await AIParsingService.parseResume(nextItem.filename, (msg) => {
        if (scanStatus) scanStatus.textContent = msg;
        // Also update the processing badge text in queue
        const processingBadge = document.querySelector(`[data-queue-id="${nextItem.id}"] .queue-badge.processing`);
        if (processingBadge) processingBadge.innerHTML = `<span class="queue-spinner"></span> ${msg.slice(0, 30)}...`;
      });

      const checkedSourceEl = document.querySelector('input[name="source-channel"]:checked');
      const selectedSource = checkedSourceEl ? checkedSourceEl.value : 'LinkedIn';
      parsedData.source = selectedSource;
      parsedData.dateAdded = new Date().toISOString();
      parsedData.dateParsed = new Date().toISOString();

      nextItem.status = 'done';
      nextItem.parsedData = parsedData;

      // Auto-load first successfully parsed item into review pane
      if (activeQueueItemId === null) {
        activeQueueItemId = nextItem.id;
        activeDraftTrainerData = parsedData;
        const reviewPane = document.getElementById('intake-review-pane');
        if (reviewPane) {
          reviewPane.innerHTML = renderReviewFormMarkup(parsedData);
          bindDraftSubmitListener();
        }
      }

      showToast(`✅ Extracted: ${parsedData.name || nextItem.filename}`, 'success');
    } catch (err) {
      nextItem.status = 'error';
      nextItem.errorMsg = err.message || 'Extraction failed';
      showToast(`❌ Failed to parse ${typeof nextItem.filename === 'string' ? nextItem.filename : nextItem.filename.name}`, 'danger');
    } finally {
      refreshQueueUI();
    }
  }

  if (scanOverlay) scanOverlay.classList.remove('active');
  isQueueProcessing = false;

  const doneCount = uploadQueue.filter(i => i.status === 'done').length;
  if (doneCount > 1) showToast(`🎉 Batch complete! ${doneCount} profiles ready for review.`, 'success');
}

// ── Queue item interaction bindings (view draft / remove) ────────────────────
function bindQueueItemListeners() {
  // View draft button
  document.querySelectorAll('.queue-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.queueId;
      const item = uploadQueue.find(i => i.id === id);
      if (!item || !item.parsedData) return;
      activeQueueItemId = id;
      activeDraftTrainerData = item.parsedData;
      const reviewPane = document.getElementById('intake-review-pane');
      if (reviewPane) {
        reviewPane.innerHTML = renderReviewFormMarkup(item.parsedData);
        bindDraftSubmitListener();
      }
      refreshQueueUI();
    });
  });

  // Entire clickable queue row (for done items)
  document.querySelectorAll('.queue-item-clickable').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('queue-remove-btn') || e.target.classList.contains('queue-view-btn')) return;
      const id = row.dataset.queueId;
      const item = uploadQueue.find(i => i.id === id);
      if (!item || !item.parsedData) return;
      activeQueueItemId = id;
      activeDraftTrainerData = item.parsedData;
      const reviewPane = document.getElementById('intake-review-pane');
      if (reviewPane) {
        reviewPane.innerHTML = renderReviewFormMarkup(item.parsedData);
        bindDraftSubmitListener();
      }
      refreshQueueUI();
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
  });

  // Remove button
  document.querySelectorAll('.queue-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.queueId;
      uploadQueue = uploadQueue.filter(i => i.id !== id);
      if (activeQueueItemId === id) {
        activeQueueItemId = null;
        activeDraftTrainerData = null;
        const reviewPane = document.getElementById('intake-review-pane');
        if (reviewPane) reviewPane.innerHTML = renderReviewFormMarkup(null);
      }
      refreshQueueUI();
      // If queue is now empty, show sample panel again
      if (uploadQueue.length === 0) {
        const samplePanel = document.getElementById('sample-files-panel');
        if (samplePanel) samplePanel.style.display = '';
      }
    });
  });
}

function bindDraftSubmitListener() {
  const form = document.getElementById('intake-draft-form');
  if (!form) return;

  const emailEl = document.getElementById('intake-email');
  const phoneEl = document.getElementById('intake-phone');
  const linkedinEl = document.getElementById('intake-linkedin');
  const nameEl = document.getElementById('intake-name');
  const locationEl = document.getElementById('intake-location');
  const submitBtn = form.querySelector('button[type="submit"]');

  const checkLiveDuplicate = () => {
    if (!submitBtn) return;
    
    const payload = {
      name: nameEl ? nameEl.value.trim() : "",
      email: emailEl ? emailEl.value.trim() : "",
      phone: phoneEl ? phoneEl.value.trim() : "",
      location: locationEl ? locationEl.value.trim() : "",
      linkedin: linkedinEl ? linkedinEl.value.trim() : ""
    };

    const duplicates = state.findDuplicateProfiles(payload);
    const isDuplicate = duplicates.length > 0;
    const banner = document.getElementById('intake-duplicate-banner');

    if (isDuplicate) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Verify & Resolve Duplicate";
      submitBtn.style.backgroundColor = "var(--accent-rose)";
      submitBtn.style.borderColor = "var(--accent-rose)";
      submitBtn.style.cursor = "pointer";
      submitBtn.style.opacity = "1";
      if (banner) {
        banner.innerHTML = `⚠️ <strong>Already Available:</strong> This trainer profile (email, phone, or LinkedIn) is already in the database. Clicking "Verify & Resolve Duplicate" will open the Duplicate Shield Intercept dialog to let you Overwrite & Merge or View the existing profile.`;
        banner.style.display = "block";
      }
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = "Verify & Add Trainer";
      submitBtn.style.backgroundColor = "";
      submitBtn.style.borderColor = "";
      submitBtn.style.cursor = "";
      submitBtn.style.opacity = "";
      if (banner) {
        banner.innerHTML = `⚠️ <strong>Already Available:</strong> This trainer profile (email, phone, or LinkedIn) is already in the database. "Verify & Add Trainer" is locked to prevent duplicate entries.`;
        banner.style.display = "none";
      }
    }
  };

  [emailEl, phoneEl, linkedinEl, nameEl, locationEl].forEach(el => {
    if (el) {
      el.addEventListener('input', checkLiveDuplicate);
      el.addEventListener('change', checkLiveDuplicate);
    }
  });

  // Run initial check right away in case pre-filled data is a duplicate
  checkLiveDuplicate();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log("WW-TMS: Submit event intercepted on intake-draft-form");
    
    try {
      // Build payload object from form inputs defensively
      const nameEl = document.getElementById('intake-name');
      const emailEl = document.getElementById('intake-email');
      const phoneEl = document.getElementById('intake-phone');
      const locationEl = document.getElementById('intake-location');
      const linkedinEl = document.getElementById('intake-linkedin');
      const employerEl = document.getElementById('intake-employer');
      const designationEl = document.getElementById('intake-designation');
      const totalExpEl = document.getElementById('intake-total-exp');
      const teachExpEl = document.getElementById('intake-teach-exp');
      const skillsEl = document.getElementById('intake-skills');
      const certsEl = document.getElementById('intake-certs');
      const educationEl = document.getElementById('intake-education');
      const engagementEl = document.getElementById('intake-engagement');
      const deliveryEl = document.getElementById('intake-delivery');
      const currentCtcEl = document.getElementById('intake-current-ctc');
      const expectedCtcEl = document.getElementById('intake-expected-ctc');
      const travelEl = document.getElementById('intake-travel');
      const negotiableEl = document.getElementById('intake-negotiable');

      // Programmatic custom validations with focus redirection and styled toast indicators
      if (!nameEl || !nameEl.value.trim()) {
        showToast("Trainer Name is a required field!", "danger");
        if (nameEl) nameEl.focus();
        return;
      }
      if (!emailEl || !emailEl.value.trim()) {
        showToast("Email Address is a required field!", "danger");
        if (emailEl) emailEl.focus();
        return;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailEl.value.trim())) {
        showToast("Please provide a valid email format (e.g. name@domain.com)!", "danger");
        emailEl.focus();
        return;
      }
      if (!phoneEl || !phoneEl.value.trim()) {
        showToast("Phone Number is a required field!", "danger");
        if (phoneEl) phoneEl.focus();
        return;
      }
      if (!locationEl || !locationEl.value.trim()) {
        showToast("Primary City Location is a required field!", "danger");
        if (locationEl) locationEl.focus();
        return;
      }

      // Fetch checked source radio defensively
      const checkedSourceEl = document.querySelector('input[name="source-channel"]:checked');
      const source = checkedSourceEl ? checkedSourceEl.value : 'LinkedIn';

      const draftPayload = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        location: locationEl.value.trim(),
        linkedin: linkedinEl ? linkedinEl.value.trim() : "",
        currentEmployer: employerEl ? employerEl.value.trim() : "",
        designation: designationEl ? designationEl.value.trim() : "",
        totalExperience: totalExpEl ? (parseInt(totalExpEl.value) || 0) : 0,
        teachingExperience: teachExpEl ? (parseInt(teachExpEl.value) || 0) : 0,
        skills: skillsEl ? skillsEl.value.trim() : "",
        certifications: certsEl ? certsEl.value.trim() : "",
        education: educationEl ? educationEl.value.trim() : "",
        
        engagementPreference: engagementEl ? engagementEl.value : "Freelancer",
        deliveryMode: deliveryEl ? deliveryEl.value : "Hybrid",
        currentCTC: currentCtcEl ? currentCtcEl.value.trim() : "",
        expectedCTC: expectedCtcEl ? expectedCtcEl.value.trim() : "",
        travelWillingness: travelEl ? travelEl.value : "Yes",
        negotiability: negotiableEl ? negotiableEl.value : "Negotiable",
        source: source,
        status: "New Profile",
        dateAdded: activeDraftTrainerData && activeDraftTrainerData.dateAdded ? activeDraftTrainerData.dateAdded : new Date().toISOString(),
        dateParsed: activeDraftTrainerData && activeDraftTrainerData.dateParsed ? activeDraftTrainerData.dateParsed : new Date().toISOString(),
        timeline: [
          {
            id: 't-intake-init',
            date: new Date().toISOString(),
            recruiter: "Talent Operations (System)",
            type: "call",
            summary: "Profile parsed and verified via intake channel.",
            standpoint: "Pending initial call.",
            concern: "",
            nextAction: "Perform HR Screening Call",
            followUpDate: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0]
          }
        ]
      };

      console.log("WW-TMS: Constructed draft payload for duplicate checks:", draftPayload);

      // Trigger Smart Duplicate Prevention Interception checks
      const duplicates = state.findDuplicateProfiles(draftPayload);
      console.log("WW-TMS: Duplicate profiles matched:", duplicates);
      
      if (duplicates.length > 0) {
        // Intercept and open split-screen resolution modal
        triggerDuplicateModal(draftPayload, duplicates[0]);
      } else {
        // Safe creation
        const trainer = state.createTrainer(draftPayload);
        
        // Remove from queue if it came from queue
        if (activeQueueItemId) {
          uploadQueue = uploadQueue.filter(i => i.id !== activeQueueItemId);
          activeQueueItemId = null;
          activeDraftTrainerData = null;
          refreshQueueUI();
        }
        
        // Clear review pane form
        const reviewPane = document.getElementById('intake-review-pane');
        if (reviewPane) {
          reviewPane.innerHTML = renderReviewFormMarkup(null);
        }

        showToast(`Successfully created trainer profile for ${trainer.name}!`, 'success');
        switchView('directory');
      }
    } catch (err) {
      console.error("WW-TMS: Submission failed with error:", err);
      showToast(`Error saving trainer profile: ${err.message}`, 'danger');
    }
  });

  // Attach clear form listener defensively
  const clearBtn = document.getElementById('btn-intake-clear');
  if (clearBtn) {
    clearBtn.removeEventListener('click', handleClearAction); // remove previous listener to prevent duplicates
    clearBtn.addEventListener('click', handleClearAction);
  }
}

function handleClearAction() {
  activeDraftTrainerData = null;
  const reviewPane = document.getElementById('intake-review-pane');
  if (reviewPane) {
    reviewPane.innerHTML = renderReviewFormMarkup(null);
  }
}

// Sub-utility: opens native modal comparison screen
function triggerDuplicateModal(draft, existing) {
  dupDraftDetails.innerHTML = `
    <div class="compare-field"><span class="lbl">Name</span><span class="vl">${draft.name}</span></div>
    <div class="compare-field"><span class="lbl">Email</span><span class="vl">${draft.email}</span></div>
    <div class="compare-field"><span class="lbl">Phone</span><span class="vl">${draft.phone}</span></div>
    <div class="compare-field"><span class="lbl">Location</span><span class="vl">${draft.location}</span></div>
    <div class="compare-field"><span class="lbl">Employer</span><span class="vl">${draft.currentEmployer || 'None'}</span></div>
    <div class="compare-field"><span class="lbl">Skills</span><span class="vl">${draft.skills}</span></div>
  `;

  dupExistingDetails.innerHTML = `
    <div class="compare-field"><span class="lbl">Name</span><span class="vl">${existing.name}</span></div>
    <div class="compare-field"><span class="lbl">Email</span><span class="vl">${existing.email}</span></div>
    <div class="compare-field"><span class="lbl">Phone</span><span class="vl">${existing.phone}</span></div>
    <div class="compare-field"><span class="lbl">Location</span><span class="vl">${existing.location}</span></div>
    <div class="compare-field"><span class="lbl">Employer</span><span class="vl">${existing.currentEmployer || 'None'}</span></div>
    <div class="compare-field"><span class="lbl">Skills</span><span class="vl">${(existing.skills || []).join(', ')}</span></div>
  `;

  // Attach button triggers for duplicate shield handling
  dupBtnDiscard.onclick = () => {
    // 1. Remove from queue if it came from queue
    if (activeQueueItemId) {
      uploadQueue = uploadQueue.filter(i => i.id !== activeQueueItemId);
      activeQueueItemId = null;
      activeDraftTrainerData = null;
      refreshQueueUI();
    }
    
    // 2. Clear review pane form
    const reviewPane = document.getElementById('intake-review-pane');
    if (reviewPane) {
      reviewPane.innerHTML = renderReviewFormMarkup(null);
    }

    duplicateDialog.close();
    showToast("Intake draft discarded.", "warning");
  };

  dupBtnMerge.onclick = () => {
    // Overwrite existing record fields, excluding draft timeline, assignments, status, and creation metadata to preserve database history
    const { timeline, assignments, status, dateAdded, dateParsed, ...fieldsToMerge } = draft;
    state.updateTrainer(existing.id, {
      ...fieldsToMerge,
      skills: Array.isArray(draft.skills) ? draft.skills : (draft.skills ? draft.skills.split(',').map(s => s.trim()) : []),
      certifications: Array.isArray(draft.certifications) ? draft.certifications : (draft.certifications ? draft.certifications.split(',').map(s => s.trim()) : [])
    });
    
    // Add timeline log
    state.addTrainerInteraction(existing.id, {
      recruiter: "Talent Operations (System)",
      type: "negotiation",
      summary: "Ingested profile overwrite/merge triggered during manual upload checks.",
      standpoint: "Merged skills and employer logs.",
      concern: "",
      nextAction: "Review merged updates",
      followUpDate: ""
    });

    // 1. Remove from queue if it came from queue
    if (activeQueueItemId) {
      uploadQueue = uploadQueue.filter(i => i.id !== activeQueueItemId);
      activeQueueItemId = null;
      activeDraftTrainerData = null;
      refreshQueueUI();
    }
    
    // 2. Clear review pane form
    const reviewPane = document.getElementById('intake-review-pane');
    if (reviewPane) {
      reviewPane.innerHTML = renderReviewFormMarkup(null);
    }

    duplicateDialog.close();
    showToast("Profile overwritten and merged successfully!", "success");
    switchView('profile-detail', existing.id);
  };

  dupBtnView.onclick = () => {
    // 1. Remove from queue if it came from queue
    if (activeQueueItemId) {
      uploadQueue = uploadQueue.filter(i => i.id !== activeQueueItemId);
      activeQueueItemId = null;
      activeDraftTrainerData = null;
      refreshQueueUI();
    }
    
    // 2. Clear review pane form
    const reviewPane = document.getElementById('intake-review-pane');
    if (reviewPane) {
      reviewPane.innerHTML = renderReviewFormMarkup(null);
    }

    duplicateDialog.close();
    switchView('profile-detail', existing.id);
  };

  duplicateDialog.showModal();
}

// --------------------------------------------------------------------------
// 3. View Renderers - (C) Trainer Search & Discovery Directory View
// --------------------------------------------------------------------------
function renderDirectory() {
  const trainers = state.getTrainers();

  // Dynamic A-Z Location Extraction merged with master fallback lists (fully populated with all Tamil Nadu districts and cities)
  const defaultLocations = [
    "Ariyalur", "Bangalore", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", 
    "Delhi", "Dharmapuri", "Dindigul", "Erode", "Gurgaon", "Hosur", "Hyderabad", 
    "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karaikudi", "Karur", "Kodaikanal", 
    "Kolkata", "Krishnagiri", "Kumbakonam", "Madurai", "Mumbai", "Nagapattinam", 
    "Namakkal", "Neyveli", "Noida", "Ooty", "Perambalur", "Pollachi", "Pudukkottai", 
    "Pune", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Sivakasi", "Tenkasi", 
    "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", 
    "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
  ];
  const activeLocations = trainers.map(t => t.location).filter(Boolean);
  const locations = [...new Set([...defaultLocations, ...activeLocations])].sort((a, b) => a.localeCompare(b));

  // Dynamic A-Z Skills Extraction merged with master fallback lists
  const defaultSkills = ["AWS", "Agile", "Android", "Ansible", "Azure", "C#", "C++", "CI/CD", "CSS", "Django", "Docker", "Elasticsearch", "Express.js", "FastAPI", "Flask", "Flutter", "Generative AI", "Git", "Google Cloud", "HTML", "Java", "JavaScript", "Jenkins", "Jira", "Kubernetes", "LLMs", "Linux Bash", "MongoDB", "MySQL", "NLP", "Node.js", "Pandas", "PostgreSQL", "Prometheus", "Python", "PyTorch", "React", "React Native", "Redux", "Scikit-Learn", "Scrum", "Spring Boot", "SQL", "Swift", "SwiftUI", "Tableau", "TensorFlow", "Terraform", "TypeScript", "Xcode"];
  const activeSkills = trainers.flatMap(t => t.skills).filter(Boolean);
  const skills = [...new Set([...defaultSkills, ...activeSkills])].sort((a, b) => a.localeCompare(b));

  // Clean normalized ID mapping helper
  const getSkillId = (skill) => {
    const normalized = skill.toLowerCase().trim();
    if (normalized === 'react' || normalized === 'react.js') return 's-react';
    if (normalized === 'node' || normalized === 'node.js') return 's-node';
    if (normalized === 'generative ai' || normalized === 'genai' || normalized === 'ai') return 's-ai';
    return 's-' + normalized.replace(/[^a-z0-9]/g, '-');
  };

  mainContentPanel.innerHTML = `
    <div class="view-header">
      <div class="view-header-title">
        <h1>Trainer Directory</h1>
        <p>Enterprise spreadsheet console with horizontal filters for direct candidate access.</p>
      </div>
      <button class="btn btn-primary" id="btn-add-profile-intake">➕ Add New Trainer</button>
    </div>

    <div class="directory-layout-vertical">
      <!-- Search bar row -->
      <div class="search-bar-row">
        <div class="search-input-wrapper">
          <span class="search-bar-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
          </span>
          <input type="search" id="filter-search-box" class="form-control" placeholder="Search by name, email, phone, skills, designation, or employer...">
        </div>
        <button class="btn btn-secondary" id="btn-save-search-query">🔖 Bookmark</button>
      </div>

      <!-- Top filters panel -->
      <aside class="glass-panel top-filter-panel" aria-label="Directory Filters">
        <!-- Location Filter -->
        <div class="filter-section">
          <label for="filter-location" class="label-title">📍 Location / City</label>
          <select id="filter-location" class="form-control">
            <option value="">All Locations</option>
            ${locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
          </select>
        </div>

        <!-- Engagement Mode -->
        <div class="filter-section">
          <span class="label-title">💼 Engagement Model</span>
          <div class="checkbox-pill-group">
            <input type="checkbox" id="e-freelance" value="Freelancer" class="checkbox-pill-item">
            <label for="e-freelance" class="checkbox-pill-label">Freelancer</label>

            <input type="checkbox" id="e-consultant" value="Consultant" class="checkbox-pill-item">
            <label for="e-consultant" class="checkbox-pill-label">Consultant</label>

            <input type="checkbox" id="e-visiting" value="Visiting faculty" class="checkbox-pill-item">
            <label for="e-visiting" class="checkbox-pill-label">Visiting</label>

            <input type="checkbox" id="e-full" value="Full-time" class="checkbox-pill-item">
            <label for="e-full" class="checkbox-pill-label">Full-time</label>
          </div>
        </div>

        <!-- Tech Skills checkable list -->
        <div class="filter-section">
          <span class="label-title">⚡ Core Skills</span>
          <div class="checkbox-pill-group" style="max-height: 100px; overflow-y: auto; padding-right: 0.25rem; border: 1px solid rgba(16,185,129,0.08); border-radius: 6px; padding: 0.5rem; width:100%;">
            ${skills.map(skill => `
              <input type="checkbox" id="${getSkillId(skill)}" value="${skill}" class="checkbox-pill-item">
              <label for="${getSkillId(skill)}" class="checkbox-pill-label">${skill}</label>
            `).join('')}
          </div>
        </div>

        <!-- Delivery Modes -->
        <div class="filter-section">
          <span class="label-title">🌐 Delivery Mode</span>
          <div class="checkbox-pill-group">
            <input type="checkbox" id="d-online" value="Online" class="checkbox-pill-item">
            <label for="d-online" class="checkbox-pill-label">Online</label>

            <input type="checkbox" id="d-offline" value="Offline" class="checkbox-pill-item">
            <label for="d-offline" class="checkbox-pill-label">Offline</label>

            <input type="checkbox" id="d-hybrid" value="Hybrid" class="checkbox-pill-item">
            <label for="d-hybrid" class="checkbox-pill-label">Hybrid</label>
          </div>
        </div>

        <!-- Commercial Pricing Slider range -->
        <div class="filter-section">
          <span class="label-title">💰 Hourly Budget Ceiling</span>
          <div class="range-slider-group">
            <div class="range-slider-labels">
              <span>₹0</span>
              <span id="rate-ceiling-indicator">₹6,000</span>
            </div>
            <input type="range" id="filter-rate-ceiling" min="0" max="6000" step="500" value="6000" class="tms-range">
          </div>
        </div>

        <!-- Saved Searches & Clear actions -->
        <div class="filter-section" style="border-right: none;">
          <span class="label-title" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            Saved Queries
            <button class="filter-clear-btn" id="btn-clear-filters" style="color: var(--accent-rose);">Clear All</button>
          </span>
          <div class="saved-searches-list" style="flex-direction: row; gap: 0.4rem; flex-wrap: wrap;">
            <div class="saved-search-item" data-query="GenAI Chennai" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;">
              <span>GenAI (Chennai)</span>
            </div>
            <div class="saved-search-item" data-query="MERN Stack" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;">
              <span>MERN Experts</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Dynamic Preset Filter Banner Container -->
      <div id="directory-preset-banner-container"></div>

      <div class="results-meta-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <span id="results-count-text" style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Showing 5 / 5 trainers matching current query</span>
        <div class="filter-sort-wrapper" style="display: flex; align-items: center; gap: 0.5rem;">
          <label for="filter-sort-select" style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Sort by:</label>
          <select id="filter-sort-select" class="form-control" style="min-height: 28px; padding: 0.15rem 1.5rem 0.15rem 0.5rem; font-size: 0.8rem; width: auto; border-radius: var(--radius-sm);">
            <option value="default">Default Rank</option>
            <option value="recent">Recents (Newest First)</option>
            <option value="experience">Experience (High to Low)</option>
          </select>
        </div>
      </div>

      <!-- Spreadsheet sheet-like results table -->
      <div class="sheet-table-wrapper">
        <table class="sheet-table">
          <thead>
            <tr>
              <th>Name & Title</th>
              <th>Location</th>
              <th>Core Skills</th>
              <th>Stage</th>
              <th>Email Address</th>
              <th>Phone / WhatsApp</th>
            </tr>
          </thead>
          <tbody id="directory-cards-container">
            <!-- Dynamic Injection -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach Directory Interactive filters
  setupDirectoryListeners();
  triggerFilteredResults();
}

function setupDirectoryListeners() {
  const searchBox = document.getElementById('filter-search-box');
  const locationSelect = document.getElementById('filter-location');
  const rateSlider = document.getElementById('filter-rate-ceiling');
  const rateIndicator = document.getElementById('rate-ceiling-indicator');
  const clearBtn = document.getElementById('btn-clear-filters');
  const bookmarkBtn = document.getElementById('btn-save-search-query');

  // Input changes trigger recalculations
  searchBox.addEventListener('input', triggerFilteredResults);
  locationSelect.addEventListener('change', triggerFilteredResults);
  
  const sortSelect = document.getElementById('filter-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', triggerFilteredResults);
  }
  
  rateSlider.addEventListener('input', () => {
    rateIndicator.textContent = `₹${parseInt(rateSlider.value).toLocaleString()}`;
    triggerFilteredResults();
  });

  // Checkboxes list trigger
  document.querySelectorAll('.checkbox-pill-item').forEach(chk => {
    chk.addEventListener('change', triggerFilteredResults);
  });

  // Saved Searches links
  document.querySelectorAll('.saved-search-item').forEach(item => {
    item.addEventListener('click', () => {
      const q = item.dataset.query;
      if (q === 'GenAI Chennai') {
        locationSelect.value = 'Chennai';
        const aiCh = document.getElementById('s-ai');
        if (aiCh) aiCh.checked = true;
        const hybridCh = document.getElementById('d-hybrid');
        if (hybridCh) hybridCh.checked = true;
      } else if (q === 'MERN Stack') {
        const reactCh = document.getElementById('s-react');
        if (reactCh) reactCh.checked = true;
        const nodeCh = document.getElementById('s-node');
        if (nodeCh) nodeCh.checked = true;
        const freelanceCh = document.getElementById('e-freelance');
        if (freelanceCh) freelanceCh.checked = true;
      }
      activeDirectoryFilterPreset = null; // reset presets when bookmarked search query is loaded
      triggerFilteredResults();
      showToast(`Loaded bookmarked query: "${q}"`, 'success');
    });
  });

  // Clear filters
  clearBtn.addEventListener('click', () => {
    searchBox.value = '';
    locationSelect.value = '';
    rateSlider.value = 6000;
    rateIndicator.textContent = '₹6,000';
    document.querySelectorAll('.checkbox-pill-item').forEach(chk => chk.checked = false);
    
    const sortSelect = document.getElementById('filter-sort-select');
    if (sortSelect) sortSelect.value = 'default';
    
    activeDirectoryFilterPreset = null; // Clear pre-applied filter presets
    triggerFilteredResults();
    showToast("Filters reset successfully.", "warning");
  });

  // Sourcing redirect
  document.getElementById('btn-add-profile-intake').addEventListener('click', () => switchView('intake'));

  bookmarkBtn.addEventListener('click', () => {
    showToast("Search query configuration bookmarked successfully!", "success");
  });
}

function triggerFilteredResults() {
  const searchBoxVal = document.getElementById('filter-search-box');
  const searchVal = searchBoxVal ? searchBoxVal.value.toLowerCase().trim() : '';
  const locationSelectVal = document.getElementById('filter-location');
  const locationVal = locationSelectVal ? locationSelectVal.value : '';
  const rateSliderVal = document.getElementById('filter-rate-ceiling');
  const rateCeiling = rateSliderVal ? parseFloat(rateSliderVal.value) : 6000;
  
  // Extract selected engagement models array
  const selectedEngagements = Array.from(document.querySelectorAll('.top-filter-panel input[id^="e-"]:checked')).map(c => c.value);
  const selectedSkills = Array.from(document.querySelectorAll('.top-filter-panel input[id^="s-"]:checked')).map(c => c.value.toLowerCase());
  const selectedDeliveries = Array.from(document.querySelectorAll('.top-filter-panel input[id^="d-"]:checked')).map(c => c.value);

  const trainers = state.getTrainers();

  // Render Preset Banner dynamically if preset is active
  const bannerContainer = document.getElementById('directory-preset-banner-container');
  if (bannerContainer) {
    if (activeDirectoryFilterPreset) {
      let presetLabel = "";
      if (activeDirectoryFilterPreset.status === 'Active') presetLabel = "Active Cohort";
      else if (activeDirectoryFilterPreset.status === 'Pending HR Action') presetLabel = "Pending HR Action";
      else if (activeDirectoryFilterPreset.hasAssignments) presetLabel = "Trainers with Active Assignments";

      if (presetLabel) {
        bannerContainer.innerHTML = `
          <div class="glass-panel preset-filter-banner" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; margin-bottom: 1.25rem; border-color: rgba(37, 99, 235, 0.25); background: rgba(37, 99, 235, 0.04); border-radius: 8px; animation: slideIn 0.3s ease;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.1rem; line-height: 1;">🎯</span>
              Applied dashboard query: <strong style="color: var(--primary-indigo); font-weight: 600; text-shadow: 0 0 10px rgba(37, 99, 235, 0.25);">${presetLabel}</strong>
            </span>
            <button id="btn-clear-preset-banner" class="btn btn-secondary" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-color: rgba(244, 63, 94, 0.2); color: var(--accent-rose); background: rgba(244, 63, 94, 0.05); font-weight: 500;">Clear Filter</button>
          </div>
        `;
        document.getElementById('btn-clear-preset-banner').addEventListener('click', () => {
          activeDirectoryFilterPreset = null;
          triggerFilteredResults();
          showToast("Preset filter cleared.", "warning");
        });
      } else {
        bannerContainer.innerHTML = "";
      }
    } else {
      bannerContainer.innerHTML = "";
    }
  }

  // Run dynamic filters
  const filtered = trainers.filter(t => {
    // 1. Dashboard preset filter checkups
    if (activeDirectoryFilterPreset) {
      if (activeDirectoryFilterPreset.status === 'Active' && t.status !== 'Active') return false;
      if (activeDirectoryFilterPreset.status === 'Pending HR Action' && !(t.status === 'New Profile' || t.status === 'Contact Pending')) return false;
      if (activeDirectoryFilterPreset.hasAssignments && t.assignments.length === 0) return false;
    }

    // 2. Text Search matching (Name, email, phone, designation, skills list, employer)
    const nameMatch = t.name.toLowerCase().includes(searchVal);
    const designMatch = t.designation.toLowerCase().includes(searchVal);
    const employerMatch = t.currentEmployer.toLowerCase().includes(searchVal);
    const skillsMatch = t.skills.some(s => s.toLowerCase().includes(searchVal));
    const emailMatch = t.email ? t.email.toLowerCase().includes(searchVal) : false;
    
    // Normalize phone characters (removing spaces, plus signs, dashes, parentheses)
    const cleanSearchVal = searchVal.replace(/[\s\-\+\(\)]/g, '');
    const cleanPhone = t.phone ? t.phone.replace(/[\s\-\+\(\)]/g, '') : '';
    const phoneMatch = cleanPhone && cleanSearchVal ? cleanPhone.includes(cleanSearchVal) : false;
    
    if (searchVal && !(nameMatch || designMatch || employerMatch || skillsMatch || emailMatch || phoneMatch)) return false;

    // 3. Location
    if (locationVal && t.location.toLowerCase() !== locationVal.toLowerCase()) return false;

    // 4. Engagement Preferences
    if (selectedEngagements.length && !selectedEngagements.includes(t.engagementPreference)) return false;

    // 5. Skills match checkboxes
    if (selectedSkills.length) {
      const matchesAllCerts = selectedSkills.some(skill => 
        t.skills.some(ts => ts.toLowerCase().includes(skill))
      );
      if (!matchesAllCerts) return false;
    }

    // 6. Delivery Mode
    if (selectedDeliveries.length && !selectedDeliveries.includes(t.deliveryMode)) return false;

    // 7. Hourly expectations rate checks
    if (t.hourlyExpectation > 0 && t.hourlyExpectation > rateCeiling) return false;

    return true;
  });

  // Sort the results dynamically
  const sortSelectVal = document.getElementById('filter-sort-select');
  const sortBy = sortSelectVal ? sortSelectVal.value : 'default';
  
  if (sortBy === 'recent') {
    filtered.sort((a, b) => {
      const dateA = a.dateAdded ? new Date(a.dateAdded) : new Date(0);
      const dateB = b.dateAdded ? new Date(b.dateAdded) : new Date(0);
      return dateB - dateA;
    });
  } else if (sortBy === 'experience') {
    filtered.sort((a, b) => (b.totalExperience || 0) - (a.totalExperience || 0));
  }

  // Render cards grid
  const container = document.getElementById('directory-cards-container');
  const countLabel = document.getElementById('results-count-text');

  countLabel.textContent = `Showing ${filtered.length} / ${trainers.length} trainers matching current query`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 4rem 2rem; text-align: center; color: var(--text-muted);">
          <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍 No matching trainers found</p>
          <p style="font-size: 0.85rem;">Adjust search filters, clear active tags, or check pricing ceiling.</p>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const initials = t.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const skillsListStr = t.skills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('') +
      (t.skills.length > 4 ? `<span class="skill-tag" style="background: rgba(37, 99, 235, 0.05); color: var(--primary-indigo);">+${t.skills.length - 4}</span>` : '');

    return `
      <tr class="sheet-row" data-id="${t.id}" tabindex="0" role="button" aria-label="View profile for ${t.name}">
        <td>
          <div class="sheet-identity">
            <div class="sheet-avatar">${initials}</div>
            <div class="sheet-names">
              <h4>${t.name}</h4>
              <p>${t.designation || 'Specialist Partner'} at ${t.currentEmployer || 'Independent'}</p>
            </div>
          </div>
        </td>
        <td>📍 ${t.location}</td>
        <td>
          <div class="trainer-card-skills">
            ${skillsListStr}
          </div>
        </td>
        <td>
          <span class="lifecycle-badge ${t.status.toLowerCase().replace(/\s/g, '-')}">${t.status}</span>
        </td>
        <td style="font-family: monospace; color: var(--text-secondary); font-size: 0.85rem;">
          ${t.email}
        </td>
        <td style="color: var(--text-secondary);">
          ${t.phone}
        </td>
      </tr>
    `;
  }).join('');

  // Attach card click handlers
  container.querySelectorAll('tr.sheet-row').forEach(card => {
    card.addEventListener('click', () => {
      switchView('profile-detail', card.dataset.id);
    });
    
    // Accessibility support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchView('profile-detail', card.dataset.id);
      }
    });
  });
}

// --------------------------------------------------------------------------
// 3. View Renderers - (D) Trainer Details View
// --------------------------------------------------------------------------
function renderTrainerDetail(trainerId, activeTabId = 'tab-overview') {
  const trainer = state.getTrainerById(trainerId);
  if (!trainer) {
    switchView('directory');
    return;
  }

  const initials = trainer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  mainContentPanel.innerHTML = `
    <div class="view-header">
      <button class="btn btn-secondary" id="btn-detail-back" style="padding: 0.5rem 1rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Directory
      </button>
    </div>

    <div class="detail-layout">
      <!-- Profile Header Strip panel -->
      <div class="glass-panel detail-profile-strip">
        <div class="strip-profile-info">
          <div class="trainer-avatar strip-avatar">${initials}</div>
          <div class="strip-names">
            <h2>${trainer.name}</h2>
            <div class="strip-meta">
              <span>📍 ${trainer.location}</span>
              <span>💼 ${trainer.engagementPreference}</span>
              <span>🔗 <a href="${trainer.linkedin && !trainer.linkedin.startsWith('http') ? 'https://' + trainer.linkedin : (trainer.linkedin || '#')}" target="_blank" style="color: var(--primary-cyan); text-decoration: none;">LinkedIn Profile</a></span>
            </div>
          </div>
        </div>

        <!-- Quick stage dropdown selector & Update Resume button -->
        <div style="display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="min-width: 200px; margin-bottom: 0;">
            <label for="detail-status-changer">Operational Stage</label>
            <select id="detail-status-changer" class="form-control" style="background: rgba(59, 122, 87, 0.05); border-color: rgba(59, 122, 87, 0.2);">
              <option value="New Profile" ${trainer.status === 'New Profile' ? 'selected' : ''}>New Profile</option>
              <option value="Contact Pending" ${trainer.status === 'Contact Pending' ? 'selected' : ''}>Contact Pending</option>
              <option value="Contacted" ${trainer.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
              <option value="Interested" ${trainer.status === 'Interested' ? 'selected' : ''}>Interested</option>
              <option value="Follow-up Required" ${trainer.status === 'Follow-up Required' ? 'selected' : ''}>Follow-up Required</option>
              <option value="Approved" ${trainer.status === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="Assigned" ${trainer.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
              <option value="Active" ${trainer.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${trainer.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <button class="btn btn-secondary" id="btn-update-resume" style="padding: 0.55rem 1rem; border-color: var(--primary-indigo); background: rgba(59, 122, 87, 0.05); position: relative; height: 44px; display: inline-flex; align-items: center; justify-content: center; min-width: 150px; cursor: pointer;">
              📄 Update Resume
              <input type="file" id="update-resume-input" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
            </button>
          </div>
        </div>
      </div>

      <!-- Lifecycle progress checklist visualization -->
      <div class="glass-panel lifecycle-timeline-container" aria-hidden="true">
        <div class="lifecycle-steps-row">
          ${renderLifecycleNodesMarkup(trainer.status)}
        </div>
      </div>

      <!-- Detail views tab headers -->
      <div class="tab-headers-row">
        <button class="tab-btn ${activeTabId === 'tab-overview' ? 'active' : ''}" data-tab="tab-overview">Overview</button>
        <button class="tab-btn ${activeTabId === 'tab-enrichment' ? 'active' : ''}" data-tab="tab-enrichment">HR Enrichment</button>
        <button class="tab-btn ${activeTabId === 'tab-timeline' ? 'active' : ''}" data-tab="tab-timeline">Interaction Logs (${trainer.timeline.length})</button>
        <button class="tab-btn ${activeTabId === 'tab-assignments' ? 'active' : ''}" data-tab="tab-assignments">Assignments (${trainer.assignments.length})</button>
        <button class="tab-btn ${activeTabId === 'tab-email' ? 'active' : ''}" data-tab="tab-email">Email Client</button>
      </div>

      <!-- Tab Content - 1. OVERVIEW -->
      <div class="tab-content-panel ${activeTabId === 'tab-overview' ? 'active' : ''}" id="tab-overview">
        <div class="profile-grid">
          <!-- Left details blocks -->
          <div class="details-block">
            <div class="glass-panel">
              <h4>1. Core Professional Profile</h4>
              <div class="details-list-grid" style="margin-bottom: 1.5rem;">
                <div class="details-item"><span class="label">Current Employer</span><span class="val">${trainer.currentEmployer || 'None (Independent)'}</span></div>
                <div class="details-item"><span class="label">Designation</span><span class="val">${trainer.designation || 'Technical Partner'}</span></div>
                <div class="details-item"><span class="label">Total Experience</span><span class="val">${trainer.totalExperience} Years</span></div>
                <div class="details-item"><span class="label">Teaching Experience</span><span class="val">${trainer.teachingExperience} Years</span></div>
                <div class="details-item"><span class="label">Primary Email</span><span class="val">${trainer.email}</span></div>
                <div class="details-item"><span class="label">Phone / WhatsApp</span><span class="val">${trainer.phone}</span></div>
              </div>

              <h4>2. Academic Expertise & Credentials</h4>
              <div class="details-item" style="margin-bottom: 1rem;"><span class="label">Highest Qualifications</span><span class="val">${trainer.education || 'Graduate Profile'}</span></div>
              <div class="details-item" style="margin-bottom: 1rem;">
                <span class="label">Extracted Technology Skills</span>
                <div class="trainer-card-skills" style="margin-top: 0.35rem;">
                  ${trainer.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
                </div>
              </div>
              <div class="details-item">
                <span class="label">Professional Certifications</span>
                <div class="trainer-card-skills" style="margin-top: 0.35rem;">
                  ${trainer.certifications.length ? trainer.certifications.map(c => `<span class="skill-tag" style="background:rgba(6,182,212,0.04); border-color:var(--primary-cyan);">${c}</span>`).join('') : '<span class="val">No certifications logged</span>'}
                </div>
              </div>
            </div>
          </div>

          <!-- Right HR Screening details blocks -->
          <div class="glass-panel">
            <div class="details-block">
              <h4>HR Screening Enrichment</h4>
              <div class="details-item" style="margin-bottom: 1rem;"><span class="label">Audience Focus Fit</span><span class="val">${trainer.audienceFit.join(', ') || 'Working professionals'}</span></div>
              <div class="details-item" style="margin-bottom: 1rem;"><span class="label">Delivery Flexibility</span><span class="val">Prefers ${trainer.deliveryMode} delivery (Travel Willingness: ${trainer.travelWillingness})</span></div>
              <div class="details-item" style="margin-bottom: 1rem;"><span class="label">Current CTC</span><span class="val" style="color:var(--primary-cyan); font-weight:700;">${trainer.currentCTC || 'N/A'}</span></div>
              <div class="details-item" style="margin-bottom: 1rem;"><span class="label">Expected CTC</span><span class="val" style="color:var(--primary-indigo); font-weight:700;">${trainer.expectedCTC || 'N/A'}</span></div>
              <div class="details-item" style="margin-bottom: 1rem;"><span class="label">Commercial Negotiability</span><span class="val">${trainer.negotiability}</span></div>
              <div class="details-item" style="margin-bottom: 1rem;"><span class="label">Sourcing Sourced Channel</span><span class="val" style="color:var(--accent-amber); font-weight:600;">${trainer.source}</span></div>
              <div class="details-item"><span class="label">Availability Timeline</span><span class="val">${trainer.availabilityTimeline}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content - 2. HR ENRICHMENT FORM -->
      <div class="tab-content-panel ${activeTabId === 'tab-enrichment' ? 'active' : ''}" id="tab-enrichment">
        <div class="glass-panel">
          <form class="tms-form" id="detail-enrichment-form" novalidate>
            <div class="form-row">
              <div class="form-group">
                <label for="e-edit-name">Full Name *</label>
                <input type="text" id="e-edit-name" class="form-control" value="${trainer.name}" required autocomplete="name">
              </div>
              <div class="form-group">
                <label for="e-edit-email">Email Address *</label>
                <input type="email" id="e-edit-email" class="form-control" value="${trainer.email}" required autocomplete="email">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="e-edit-phone">Phone Number *</label>
                <input type="tel" id="e-edit-phone" class="form-control" value="${trainer.phone}" required autocomplete="tel">
              </div>
              <div class="form-group">
                <label for="e-edit-location">Primary City *</label>
                <input type="text" id="e-edit-location" class="form-control" value="${trainer.location}" required autocomplete="address-level2">
              </div>
            </div>

            <div class="form-group">
              <label for="e-edit-linkedin">LinkedIn URL</label>
              <input type="url" id="e-edit-linkedin" class="form-control" value="${trainer.linkedin}">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="e-edit-skills">Skills (Comma separated)</label>
                <input type="text" id="e-edit-skills" class="form-control" value="${trainer.skills.join(', ')}">
              </div>
              <div class="form-group">
                <label for="e-edit-certs">Certifications (Comma separated)</label>
                <input type="text" id="e-edit-certs" class="form-control" value="${trainer.certifications.join(', ')}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="e-edit-engagement">Engagement Preference</label>
                <select id="e-edit-engagement" class="form-control">
                  <option value="Freelancer" ${trainer.engagementPreference === 'Freelancer' ? 'selected' : ''}>Freelancer</option>
                  <option value="Consultant" ${trainer.engagementPreference === 'Consultant' ? 'selected' : ''}>Consultant</option>
                  <option value="Visiting faculty" ${trainer.engagementPreference === 'Visiting faculty' ? 'selected' : ''}>Visiting faculty</option>
                  <option value="Full-time" ${trainer.engagementPreference === 'Full-time' ? 'selected' : ''}>Full-time</option>
                </select>
              </div>
              <div class="form-group">
                <label for="e-edit-delivery">Delivery Mode Preference</label>
                <select id="e-edit-delivery" class="form-control">
                  <option value="Hybrid" ${trainer.deliveryMode === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
                  <option value="Online" ${trainer.deliveryMode === 'Online' ? 'selected' : ''}>Online</option>
                  <option value="Offline" ${trainer.deliveryMode === 'Offline' ? 'selected' : ''}>Offline</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="e-edit-current-ctc">Current CTC</label>
                <input type="text" id="e-edit-current-ctc" class="form-control" value="${trainer.currentCTC || ''}" placeholder="e.g. ₹18,00,000">
              </div>
              <div class="form-group">
                <label for="e-edit-expected-ctc">Expected CTC</label>
                <input type="text" id="e-edit-expected-ctc" class="form-control" value="${trainer.expectedCTC || ''}" placeholder="e.g. ₹22,00,000">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="e-edit-travel">Travel Willingness</label>
                <select id="e-edit-travel" class="form-control">
                  <option value="Yes" ${trainer.travelWillingness === 'Yes' ? 'selected' : ''}>Yes (Open to travel)</option>
                  <option value="No" ${trainer.travelWillingness === 'No' ? 'selected' : ''}>No (Local only)</option>
                  <option value="Selective" ${trainer.travelWillingness === 'Selective' ? 'selected' : ''}>Selective (Corporate only)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="e-edit-negotiable">Negotiability Status</label>
                <select id="e-edit-negotiable" class="form-control">
                  <option value="Negotiable" ${trainer.negotiability === 'Negotiable' ? 'selected' : ''}>Negotiable</option>
                  <option value="Highly Negotiable" ${trainer.negotiability === 'Highly Negotiable' ? 'selected' : ''}>Highly Negotiable</option>
                  <option value="Non-Negotiable" ${trainer.negotiability === 'Non-Negotiable' ? 'selected' : ''}>Non-Negotiable</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="e-edit-audience">Target Audience Fit (Comma separated)</label>
              <input type="text" id="e-edit-audience" class="form-control" value="${trainer.audienceFit.join(', ')}">
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 1rem;">💾 Save Enrichment Details</button>
          </form>
        </div>
      </div>

      <!-- Tab Content - 3. INTERACTION HISTORY TIMELINE -->
      <div class="tab-content-panel ${activeTabId === 'tab-timeline' ? 'active' : ''}" id="tab-timeline">
        <div class="timeline-controls">
          <h3 style="font-family:'Outfit', sans-serif; font-size:1.15rem;">Interaction History</h3>
          <button class="btn btn-primary" style="padding:0.5rem 1rem;" id="btn-add-interaction-timeline">➕ Add Log Note</button>
        </div>

        <div class="timeline-layout">
          ${trainer.timeline.map(log => `
            <div class="timeline-node">
              <div class="timeline-marker ${log.type.toLowerCase()}"></div>
              <div class="timeline-card">
                <div class="timeline-card-header">
                  <span class="timeline-recruiter">👤 Logged by ${log.recruiter}</span>
                  <span>📅 ${new Date(log.date).toLocaleString()}</span>
                </div>
                <div class="timeline-body">
                  <p><strong>[${log.type.toUpperCase()}] Action Summary:</strong> ${log.summary}</p>
                  <div class="timeline-body-meta">
                    ${log.standpoint ? `<span>💬 <strong>Standpoint:</strong> ${log.standpoint}</span>` : ''}
                    ${log.concern ? `<span class="concern">⚠️ <strong>Concern:</strong> ${log.concern}</span>` : ''}
                    ${log.nextAction ? `<span class="action">🎯 <strong>Next Action:</strong> ${log.nextAction}</span>` : ''}
                    ${log.followUpDate ? `<span>📅 <strong>Follow-up:</strong> ${log.followUpDate}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Tab Content - 4. ASSIGNMENT HISTORY -->
      <div class="tab-content-panel ${activeTabId === 'tab-assignments' ? 'active' : ''}" id="tab-assignments">
        <div class="glass-panel">
          <div class="panel-header">
            <h3>Past Program Assignments</h3>
            <button class="btn btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" id="btn-add-mock-assignment">➕ Add Assignment</button>
          </div>
          
          ${trainer.assignments.length === 0 ? `
            <div style="text-align:center; padding:3rem; color:var(--text-muted);">
              <p style="font-size:1.5rem; margin-bottom:0.5rem;">📅 No assignments yet</p>
              <p style="font-size:0.85rem;">This trainer has not been assigned to deliver any Wrench Wise courses yet.</p>
            </div>
          ` : `
            <div class="outbox-table-wrapper">
              <table class="tms-table">
                <thead>
                  <tr>
                    <th>Program Title</th>
                    <th>Delivery Dates</th>
                    <th>Mode</th>
                    <th>Audience</th>
                    <th>Rating</th>
                    <th>Review Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  ${trainer.assignments.map(a => {
                    const stars = '⭐'.repeat(Math.round(a.rating));
                    return `
                      <tr>
                        <td><strong>${a.programName}</strong></td>
                        <td>${a.deliveryDates}</td>
                        <td>${a.deliveryMode}</td>
                        <td>${a.audienceType}</td>
                        <td style="color:var(--accent-amber); font-size:0.8rem;">${stars} (${a.rating})</td>
                        <td>${a.notes}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- Tab Content - 5. EMAIL CLIENT (BREVO LOGS CONNECT) -->
      <div class="tab-content-panel ${activeTabId === 'tab-email' ? 'active' : ''}" id="tab-email">
        <div class="glass-panel email-client-container">
          <!-- Template Selector Sidebar -->
          <div class="email-templates-sidebar">
            <h4>Select Template</h4>
            <button class="template-btn active" data-temp-id="outreach">Initial Outreach</button>
            <button class="template-btn" data-temp-id="screening">Screening Invite</button>
            <button class="template-btn" data-temp-id="demo">Demo Session Invite</button>
            <button class="template-btn" data-temp-id="followup">Commercial follow-up</button>
          </div>

          <!-- Composer Form area -->
          <div class="email-compose-pane">
            <div class="email-headers-group">
              <div class="email-header-line">
                <label for="mail-sender">From:</label>
                <select id="mail-sender" class="form-control" style="min-height:36px; padding:0.4rem 0.75rem;">
                  <option value="talent@wrenchwise.in">talent@wrenchwise.in (Talent Outreach)</option>
                  <option value="trainers@wrenchwise.in">trainers@wrenchwise.in (Trainer Relations)</option>
                  <option value="faculty@wrenchwise.in">faculty@wrenchwise.in (Academic Operations)</option>
                  <option value="recruitment@wrenchwise.in">recruitment@wrenchwise.in (Recruitments)</option>
                </select>
              </div>
              
              <div class="email-header-line" style="margin-top:0.5rem;">
                <label>To:</label>
                <span style="font-weight:600; color:var(--text-white); font-size:0.9rem;">${trainer.name} &lt;${trainer.email}&gt;</span>
              </div>

              <div class="email-header-line" style="margin-top:0.5rem;">
                <label for="mail-subject">Subject:</label>
                <input type="text" id="mail-subject" class="form-control" style="min-height:36px; padding:0.4rem 0.75rem;" value="WW-TMS: Introduction & Screening invitation">
              </div>
            </div>

            <div class="form-group">
              <label for="mail-body">Email Correspondence Body</label>
              <textarea id="mail-body" class="form-control" style="min-height:220px; font-family:monospace; font-size:0.875rem; padding:1rem;"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end;">
              <button class="btn btn-primary" id="btn-mail-dispatch">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.25rem;"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Dispatch Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline Interaction Log Modal Box (Native <dialog>) -->
    <dialog id="timeline-add-dialog" class="glass-dialog" aria-labelledby="time-title">
      <div class="dialog-header">
        <h3 id="time-title">Log New Interaction touched point</h3>
        <p>Record negotiations, call updates, or interview reviews for collective team memory.</p>
      </div>
      <div class="dialog-content">
        <form class="interaction-modal-form" id="interaction-dialog-form">
          <div class="form-row">
            <div class="form-group">
              <label for="log-recruiter">Team Member Name *</label>
              <input type="text" id="log-recruiter" class="form-control" value="Talent Operations" required>
            </div>
            <div class="form-group">
              <label for="log-type">Interaction Type *</label>
              <select id="log-type" class="form-control">
                <option value="call">Call Summary</option>
                <option value="whatsapp">WhatsApp Chat</option>
                <option value="email">Email Sent/Recv</option>
                <option value="demo">Demo Interview Evaluation</option>
                <option value="negotiation">Commercial Negotiation</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="log-summary">Interaction Summary Note *</label>
            <textarea id="log-summary" class="form-control" placeholder="Summary of what was discussed, rates expectations, scheduling adjustments..." required></textarea>
          </div>

          <div class="form-group">
            <label for="log-standpoint">Trainer Standpoint / Mindset</label>
            <input type="text" id="log-standpoint" class="form-control" placeholder="e.g. Willing to negotiate rates for Chennai hybrid bootcamps.">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="log-concern">Key Concern (Optional)</label>
              <input type="text" id="log-concern" class="form-control" placeholder="e.g. Travel reimbursement guarantees, batch size ceiling.">
            </div>
            <div class="form-group">
              <label for="log-next-action">Next Follow-up Action</label>
              <input type="text" id="log-next-action" class="form-control" placeholder="e.g. Schedule academic demo evaluation.">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="log-follow-up-date">Follow-up Date</label>
              <input type="date" id="log-follow-up-date" class="form-control">
            </div>
            <div class="form-group">
              <label for="log-stage-updater">Transition Operational Stage</label>
              <select id="log-stage-updater" class="form-control">
                <option value="">No Stage Change</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="Approved">Approved</option>
                <option value="Assigned">Assigned</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div class="dialog-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.08);">
            <button type="button" class="btn btn-secondary" id="btn-log-dialog-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Log Touchpoint</button>
          </div>
        </form>
      </div>
    </dialog>
  `;

  // Attach all Details Interactive features
  setupDetailListeners(trainer);
  updateEmailClientPane(trainer, 'outreach');
}

// Sub-utility: renders node-timeline steps
function renderLifecycleNodesMarkup(currentStatus) {
  const stages = [
    "New Profile", "Contacted", "Approved", "Assigned", "Active"
  ];
  
  const activeIdx = stages.indexOf(currentStatus);
  let matchedIndex = activeIdx !== -1 ? activeIdx : 0;
  if (currentStatus === "Contact Pending" || currentStatus === "Interested" || currentStatus === "Follow-up Required") {
    matchedIndex = 1; // map to 'Contacted' visual
  }

  return stages.map((stage, idx) => {
    let nodeClass = '';
    if (idx < matchedIndex) nodeClass = 'completed';
    else if (idx === matchedIndex) nodeClass = 'current';
    
    return `<div class="lifecycle-step-node ${nodeClass}" data-label="${stage}" aria-label="Lifecycle node: ${stage}"></div>`;
  }).join('');
}

function setupDetailListeners(trainer) {
  const backBtn = document.getElementById('btn-detail-back');
  const statusChanger = document.getElementById('detail-status-changer');
  const enrichmentForm = document.getElementById('detail-enrichment-form');
  
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-content-panel');

  // Resume Update file selection listener
  const updateInput = document.getElementById('update-resume-input');
  if (updateInput) {
    updateInput.addEventListener('change', async () => {
      const file = updateInput.files[0];
      if (!file) return;
      
      showToast("Ingesting new resume updates...", "warning");
      
      try {
        const parsed = await AIParsingService.parseResume(file, (msg) => {
          console.log("Resume update progress:", msg);
        });
        
        // Merge parsed fields into existing trainer
        const updatedFields = {};
        
        // Skills merging (append unique new skills)
        const currentSkills = trainer.skills || [];
        const newSkills = Array.isArray(parsed.skills) ? parsed.skills : (parsed.skills ? parsed.skills.split(',').map(s => s.trim()) : []);
        const mergedSkills = [...new Set([...currentSkills, ...newSkills])].filter(Boolean);
        if (mergedSkills.length > currentSkills.length) {
          updatedFields.skills = mergedSkills;
        }
        
        // Certifications merging (append unique new certifications)
        const currentCerts = trainer.certifications || [];
        const newCerts = Array.isArray(parsed.certifications) ? parsed.certifications : (parsed.certifications ? parsed.certifications.split(',').map(s => s.trim()) : []);
        const mergedCerts = [...new Set([...currentCerts, ...newCerts])].filter(Boolean);
        if (mergedCerts.length > currentCerts.length) {
          updatedFields.certifications = mergedCerts;
        }
        
        // Merge basic text fields if they were previously default or empty
        const textFields = ['currentEmployer', 'designation', 'education', 'location', 'linkedin'];
        textFields.forEach(f => {
          const currentVal = trainer[f];
          const parsedVal = parsed[f];
          if (parsedVal && parsedVal !== "Bengaluru" && parsedVal !== "Unknown Trainer" && parsedVal !== "Independent Partner" && parsedVal !== "Trainer Associate" && parsedVal !== "Bachelor of Engineering, Anna University") {
            if (!currentVal || currentVal === 'None' || currentVal === 'Independent Partner' || currentVal === 'Trainer Associate' || currentVal === 'Graduate Profile' || currentVal === 'Bengaluru') {
              updatedFields[f] = parsedVal;
            }
          }
        });

        // Experience updates (take max value)
        if (parsed.totalExperience && parsed.totalExperience > (trainer.totalExperience || 0)) {
          updatedFields.totalExperience = parsed.totalExperience;
          updatedFields.teachingExperience = Math.max(trainer.teachingExperience || 0, parsed.teachingExperience || 0);
        }
        
        state.updateTrainer(trainer.id, updatedFields);
        
        // Add interaction timeline log
        const addedSkillsCount = mergedSkills.length - currentSkills.length;
        const addedCertsCount = mergedCerts.length - currentCerts.length;
        
        let summary = `Uploaded updated resume file: ${file.name}. `;
        if (addedSkillsCount > 0) summary += `Added ${addedSkillsCount} new skills (${mergedSkills.slice(currentSkills.length).join(', ')}). `;
        if (addedCertsCount > 0) summary += `Added ${addedCertsCount} new certifications (${mergedCerts.slice(currentCerts.length).join(', ')}). `;
        if (Object.keys(updatedFields).length === 0 || (addedSkillsCount === 0 && addedCertsCount === 0)) {
          summary += "Profile already had the latest information; no new updates to append.";
        }
        
        state.addTrainerInteraction(trainer.id, {
          recruiter: "Talent Operations (System)",
          type: "call",
          summary: summary,
          standpoint: "Merged updated qualifications.",
          concern: "",
          nextAction: "Review updated profile details",
          followUpDate: ""
        });
        
        const activeTabBtn = document.querySelector('.tab-btn.active');
        const activeTabId = activeTabBtn ? activeTabBtn.dataset.tab : 'tab-overview';
        
        showToast("Resume parsed and new updates successfully merged!", "success");
        renderTrainerDetail(trainer.id, activeTabId);
        
      } catch (err) {
        console.error("Resume update error:", err);
        showToast(`Error parsing updated resume: ${err.message}`, "danger");
      }
    });
  }

  // Back trigger
  backBtn.addEventListener('click', () => switchView('directory'));

  // Direct status changer dropdown
  statusChanger.addEventListener('change', () => {
    const nextStatus = statusChanger.value;
    if (nextStatus === "Follow-up Required") {
      // Revert selection first in case they cancel
      statusChanger.value = trainer.status;
      openFollowupScheduler(trainer, (scheduledData) => {
        state.updateTrainer(trainer.id, { status: "Follow-up Required" });
        state.addTrainerInteraction(trainer.id, {
          recruiter: "Talent Operations (System)",
          type: "call",
          summary: `Manually transitioned profile operational stage to "Follow-up Required". Reminder Scheduled: ${scheduledData.note}`,
          standpoint: "",
          concern: "",
          nextAction: `Follow-up on ${scheduledData.date} at ${scheduledData.time}`,
          followUpDate: scheduledData.date
        });
        showToast("Follow-up workflow initialized and reminder scheduled!", "success");
        renderTrainerDetail(trainer.id, 'tab-overview');
      });
    } else {
      state.updateTrainer(trainer.id, { status: nextStatus });
      state.addTrainerInteraction(trainer.id, {
        recruiter: "Talent Operations (System)",
        type: "call",
        summary: `Manually transitioned profile operational stage to "${nextStatus}".`,
        standpoint: "",
        concern: "",
        nextAction: `Follow operational checklist for ${nextStatus}`,
        followUpDate: ""
      });
      showToast(`Operational stage updated to ${nextStatus}`, 'success');
      renderTrainerDetail(trainer.id, 'tab-overview'); // dynamic refresh
    }
  });

  // Tab switcher trigger
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add('active');
    });
  });

  // HR Enrichment form submission Save
  enrichmentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    try {
      const nameEl = document.getElementById('e-edit-name');
      const emailEl = document.getElementById('e-edit-email');
      const phoneEl = document.getElementById('e-edit-phone');
      const locationEl = document.getElementById('e-edit-location');
      const linkedinEl = document.getElementById('e-edit-linkedin');
      const skillsEl = document.getElementById('e-edit-skills');
      const certsEl = document.getElementById('e-edit-certs');
      const engagementEl = document.getElementById('e-edit-engagement');
      const deliveryEl = document.getElementById('e-edit-delivery');
      const currentCtcEl = document.getElementById('e-edit-current-ctc');
      const expectedCtcEl = document.getElementById('e-edit-expected-ctc');
      const travelEl = document.getElementById('e-edit-travel');
      const negotiableEl = document.getElementById('e-edit-negotiable');
      const audienceEl = document.getElementById('e-edit-audience');

      // Programmatic custom validations with focus redirection and styled toast indicators
      if (!nameEl || !nameEl.value.trim()) {
        showToast("Trainer Name is a required field!", "danger");
        if (nameEl) nameEl.focus();
        return;
      }
      if (!emailEl || !emailEl.value.trim()) {
        showToast("Email Address is a required field!", "danger");
        if (emailEl) emailEl.focus();
        return;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailEl.value.trim())) {
        showToast("Please provide a valid email format (e.g. name@domain.com)!", "danger");
        emailEl.focus();
        return;
      }
      if (!phoneEl || !phoneEl.value.trim()) {
        showToast("Phone Number is a required field!", "danger");
        if (phoneEl) phoneEl.focus();
        return;
      }
      if (!locationEl || !locationEl.value.trim()) {
        showToast("Primary City Location is a required field!", "danger");
        if (locationEl) locationEl.focus();
        return;
      }

      const payload = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        location: locationEl.value.trim(),
        linkedin: linkedinEl ? linkedinEl.value.trim() : "",
        skills: skillsEl ? skillsEl.value.trim() : "",
        certifications: certsEl ? certsEl.value.trim() : "",
        engagementPreference: engagementEl ? engagementEl.value : "Freelancer",
        deliveryMode: deliveryEl ? deliveryEl.value : "Hybrid",
        currentCTC: currentCtcEl ? currentCtcEl.value.trim() : "",
        expectedCTC: expectedCtcEl ? expectedCtcEl.value.trim() : "",
        travelWillingness: travelEl ? travelEl.value : "Yes",
        negotiability: negotiableEl ? negotiableEl.value : "Negotiable",
        audienceFit: audienceEl ? audienceEl.value.trim() : ""
      };

      state.updateTrainer(trainer.id, payload);
      
      // Add timeline log
      state.addTrainerInteraction(trainer.id, {
        recruiter: "Talent Operations",
        type: "negotiation",
        summary: "Manually enriched profile credentials and pricing expectations.",
        standpoint: "Commercials confirmed.",
        concern: "",
        nextAction: "Evaluate suitable cohorts",
        followUpDate: ""
      });

      showToast("Trainer enrichment logs saved successfully!", "success");
      renderTrainerDetail(trainer.id, 'tab-enrichment'); // dynamic refresh
    } catch (err) {
      console.error("WW-TMS: Enrichment update failed:", err);
      showToast(`Error updating trainer profile: ${err.message}`, 'danger');
    }
  });

  // --------------------------------------------------------------------------
  // Timeline log dialog additions
  // --------------------------------------------------------------------------
  const logDialog = document.getElementById('timeline-add-dialog');
  const logForm = document.getElementById('interaction-dialog-form');
  
  document.getElementById('btn-add-interaction-timeline').addEventListener('click', () => {
    logForm.reset();
    document.getElementById('log-follow-up-date').value = new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0];
    logDialog.showModal();
  });

  document.getElementById('btn-log-dialog-cancel').addEventListener('click', () => {
    logDialog.close();
  });

  logForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nextStage = document.getElementById('log-stage-updater').value;

    const payload = {
      recruiter: document.getElementById('log-recruiter').value,
      type: document.getElementById('log-type').value,
      summary: document.getElementById('log-summary').value,
      standpoint: document.getElementById('log-standpoint').value,
      concern: document.getElementById('log-concern').value,
      nextAction: document.getElementById('log-next-action').value,
      followUpDate: document.getElementById('log-follow-up-date').value
    };

    if (nextStage === "Follow-up Required") {
      logDialog.close();
      openFollowupScheduler(trainer, (scheduledData) => {
        payload.updateStage = "Follow-up Required";
        payload.summary += ` | Follow-up Scheduled: ${scheduledData.note}`;
        payload.followUpDate = scheduledData.date;
        payload.nextAction = `Follow-up at ${scheduledData.time} | ` + payload.nextAction;

        state.addTrainerInteraction(trainer.id, payload);
        showToast("Interaction logged & follow-up reminder scheduled!", "success");
        renderTrainerDetail(trainer.id, 'tab-timeline');
      }, () => {
        logDialog.showModal();
      });
    } else {
      if (nextStage) {
        payload.updateStage = nextStage;
      }
      state.addTrainerInteraction(trainer.id, payload);
      logDialog.close();
      showToast("Interaction logged successfully!", "success");
      renderTrainerDetail(trainer.id, 'tab-timeline'); // dynamic refresh
    }
  });

  // --------------------------------------------------------------------------
  // Assignment additions
  // --------------------------------------------------------------------------
  const addAssignmentBtn = document.getElementById('btn-add-mock-assignment');
  if (addAssignmentBtn) {
    addAssignmentBtn.addEventListener('click', () => {
      // Mock generate a generic assignment
      const sampleAssignments = [
        {
          programName: "Generative AI Advanced Integration Bootcamp",
          deliveryDates: "June 05 - June 20, 2026",
          deliveryMode: "Online (Global Team)",
          audienceType: "Corporate learners",
          rating: 4.7,
          notes: "Deep understanding of transformers fine-tunings. Great lab manual setup."
        },
        {
          programName: "Enterprise DevOps Architecture Course",
          deliveryDates: "July 12 - July 28, 2026",
          deliveryMode: "Offline (Pune Hub)",
          audienceType: "Working professionals",
          rating: 4.5,
          notes: "Kubernetes orchestration exercises were highly detailed and practical."
        }
      ];

      const chosen = sampleAssignments[Math.floor(Math.random() * sampleAssignments.length)];
      
      const current = trainer.assignments || [];
      current.push(chosen);
      state.updateTrainer(trainer.id, { assignments: current, status: "Assigned" });

      // Add timeline log
      state.addTrainerInteraction(trainer.id, {
        recruiter: "Academic Operations (System)",
        type: "demo",
        summary: `Assigned as Lead Trainer for "${chosen.programName}". Program dates: ${chosen.deliveryDates}.`,
        standpoint: "Contract signed, schedules accepted.",
        concern: "",
        nextAction: "Deliver first course module",
        followUpDate: ""
      });

      showToast(`Assigned ${trainer.name} to new program successfully!`, 'success');
      renderTrainerDetail(trainer.id); // dynamic refresh
    });
  }

  // --------------------------------------------------------------------------
  // Email Client templates toggles
  // --------------------------------------------------------------------------
  const templateBtns = document.querySelectorAll('.template-btn');
  templateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      templateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tempId = btn.dataset.tempId;
      updateEmailClientPane(trainer, tempId);
    });
  });

  // Email client Dispatch button trigger (Refortified to always bind and fire correctly)
  const mailDispatchBtn = document.getElementById('btn-mail-dispatch');
  if (mailDispatchBtn) {
    // Safely replace to scrub any duplicate listeners in dynamic DOM re-renders
    const scrubbedBtn = mailDispatchBtn.cloneNode(true);
    mailDispatchBtn.parentNode.replaceChild(scrubbedBtn, mailDispatchBtn);
    
    scrubbedBtn.addEventListener('click', () => {
      const senderEl = document.getElementById('mail-sender');
      const subjectEl = document.getElementById('mail-subject');
      const bodyEl = document.getElementById('mail-body');
      
      const sender = senderEl ? senderEl.value : 'talent@wrenchwise.in';
      const subject = subjectEl ? subjectEl.value.trim() : '';
      const body = bodyEl ? bodyEl.value.trim() : '';

      if (!subject) {
        showToast("Email Subject is required!", "danger");
        return;
      }
      if (!body) {
        showToast("Email Body is required!", "danger");
        return;
      }

      // 1. First save state and record the outreach correspondence
      state.dispatchBrandedEmail({
        recipientEmail: trainer.email,
        recipientName: trainer.name,
        senderIdentity: sender,
        subject: subject,
        body: body,
        trainerId: trainer.id
      });

      // 2. Refresh the details dashboard and focus the interaction logs tab
      renderTrainerDetail(trainer.id, 'tab-timeline'); 

      // 3. Inform the user of successful log
      showToast("Email successfully dispatched and logged in your outbox!", "success");

      // 4. Safely open the mail client asynchronously so browser navigation does not abort execution threads
      setTimeout(() => {
        const mailtoUrl = `mailto:${encodeURIComponent(trainer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 150);
    });
  }
}

function updateEmailClientPane(trainer, templateId) {
  const subjectInput = document.getElementById('mail-subject');
  const bodyTextarea = document.getElementById('mail-body');
  
  const template = EMAIL_TEMPLATES[templateId];
  if (template) {
    subjectInput.value = template.subject;
    bodyTextarea.value = typeof template.body === 'function' 
      ? template.body(trainer.name, trainer.skills)
      : template.body;
  }
}

// --------------------------------------------------------------------------
// 3. View Renderers - (E) Email Global Outbox Logs View
// --------------------------------------------------------------------------
function renderOutbox() {
  const mails = state.getOutboxLogs();

  mainContentPanel.innerHTML = `
    <div class="view-header">
      <div class="view-header-title">
        <h1>Email Correspondence Logs</h1>
        <p>Outbound logs of Wrench Wise branded communication dispatches processed through the Brevo engine.</p>
      </div>
    </div>

    <div class="glass-panel">
      <div class="panel-header">
        <h3>Outbox Archives (${mails.length} sent)</h3>
      </div>

      ${mails.length === 0 ? `
        <div style="text-align:center; padding:4rem; color:var(--text-muted);">
          <p style="font-size:1.5rem; margin-bottom:0.5rem;">📬 Outbox is currently empty</p>
          <p style="font-size:0.85rem;">Dispatched emails will appear here chronologically.</p>
        </div>
      ` : `
        <div class="outbox-table-wrapper">
          <table class="tms-table" aria-label="Global sent emails archives">
            <thead>
              <tr>
                <th>Dispatched Timestamp</th>
                <th>Recipient Candidate</th>
                <th>WW Branded Sender ID</th>
                <th>Subject Header</th>
                <th>Status</th>
                <th>Raw Action</th>
              </tr>
            </thead>
            <tbody>
              ${mails.map(mail => `
                <tr id="mail-row-${mail.id}">
                  <td><small>${new Date(mail.timestamp).toLocaleString()}</small></td>
                  <td><strong>${mail.recipientName || 'Candidate'}</strong><br><small>${mail.recipientEmail}</small></td>
                  <td><code style="color:var(--primary-cyan);">${mail.senderIdentity}</code></td>
                  <td>${mail.subject}</td>
                  <td><span class="badge" style="background:rgba(16, 185, 129, 0.1); color:var(--accent-emerald); border:1px solid rgba(16, 185, 129, 0.2);">${mail.status}</span></td>
                  <td><button class="email-preview-btn" data-id="${mail.id}">View Raw Body</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Email body inspection dialog -->
    <dialog id="email-inspect-dialog" class="glass-dialog" aria-labelledby="ins-title">
      <div class="dialog-header">
        <h3 id="ins-title">Raw Dispatched Email Body</h3>
      </div>
      <div class="dialog-content">
        <pre id="email-inspect-body" style="font-family:monospace; white-space:pre-wrap; font-size:0.875rem; background:rgba(255,255,255,0.02); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-translucent); color:var(--text-primary);"></pre>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-secondary" id="btn-inspect-close">Close Preview</button>
      </div>
    </dialog>
  `;

  // Attach outbox listeners
  const insDialog = document.getElementById('email-inspect-dialog');
  const insBody = document.getElementById('email-inspect-body');
  
  document.querySelectorAll('.email-preview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mail = mails.find(m => m.id === btn.dataset.id);
      if (mail) {
        insBody.textContent = mail.body;
        insDialog.showModal();
      }
    });
  });

  document.getElementById('btn-inspect-close').addEventListener('click', () => {
    insDialog.close();
  });
}

// --------------------------------------------------------------------------
// 3. View Renderers - (F) System Settings View
// --------------------------------------------------------------------------
function renderSettings() {
  const savedGeminiKey = localStorage.getItem('ww_tms_gemini_key') || '';

  mainContentPanel.innerHTML = `
    <div class="view-header">
      <div class="view-header-title">
        <h1>Platform System Settings</h1>
        <p>Manage Wrench Wise TMS settings, third-party OCR engines, and Gemini AI template configurations.</p>
      </div>
    </div>

    <div class="settings-grid">
      <!-- 1. API Integrations settings -->
      <div class="glass-panel settings-card">
        <div class="panel-header">
          <h3>1. Third-Party Integrations Engine</h3>
        </div>
        <form class="tms-form" id="settings-api-form">
          <div class="form-row">
            <div class="form-group">
              <label for="set-brevo-key">Brevo API Key (Simulated)</label>
              <input type="password" id="set-brevo-key" class="form-control" value="••••••••••••••••••••••••••••••••••••">
            </div>
            <div class="form-group">
              <label for="set-gemini-key">Gemini API Key (For Production-Grade AI Resume Parsing)</label>
              <input type="password" id="set-gemini-key" class="form-control" value="${savedGeminiKey}" placeholder="AIzaSy...">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="set-aws-region">AWS Regions (Textract & S3 buckets)</label>
              <select id="set-aws-region" class="form-control">
                <option value="ap-south-1">ap-south-1 (Mumbai Hub)</option>
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="set-es-node">Elasticsearch Similarity Endpoint</label>
              <input type="text" id="set-es-node" class="form-control" value="https://search-ww-tms.ap-south-1.es.amazonaws.com">
            </div>
          </div>
          <div>
            <button type="submit" class="btn btn-primary">💾 Save Core Integrations Keys</button>
          </div>
        </form>
      </div>

      <!-- 2. Email Identity lists -->
      <div class="glass-panel settings-card" style="margin-top: 1.5rem;">
        <div class="panel-header">
          <h3>2. Active WW-Branded Senders</h3>
        </div>
        <div class="outbox-table-wrapper">
          <table class="tms-table" aria-label="Branded email identities configurations">
            <thead>
              <tr>
                <th>Sender Identity Address</th>
                <th>Identity Name</th>
                <th>Target Sourcing Stages</th>
                <th>Verified Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>talent@wrenchwise.in</code></td>
                <td>Talent Operations</td>
                <td>Initial Outreach, Follow-ups</td>
                <td><span class="badge" style="background:rgba(16, 185, 129, 0.1); color:var(--accent-emerald);">Active & Verified</span></td>
              </tr>
              <tr>
                <td><code>trainers@wrenchwise.in</code></td>
                <td>Trainer Relations</td>
                <td>Onboarding, Contracts</td>
                <td><span class="badge" style="background:rgba(16, 185, 129, 0.1); color:var(--accent-emerald);">Active & Verified</span></td>
              </tr>
              <tr>
                <td><code>faculty@wrenchwise.in</code></td>
                <td>Academic Panel Coordinator</td>
                <td>Technical Demo Evaluations</td>
                <td><span class="badge" style="background:rgba(16, 185, 129, 0.1); color:var(--accent-emerald);">Active & Verified</span></td>
              </tr>
              <tr>
                <td><code>recruitment@wrenchwise.in</code></td>
                <td>Sourcing recruitments</td>
                <td>Initial screening invitations</td>
                <td><span class="badge" style="background:rgba(16, 185, 129, 0.1); color:var(--accent-emerald);">Active & Verified</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      <!-- 3. Database Administrative Controls -->
      <div class="glass-panel settings-card" style="margin-top: 1.5rem;">
        <div class="panel-header">
          <h3>3. Database Administrative Controls</h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
          Wrench Wise TMS runs on a clean slate by default to encourage real-time candidate ingestion. Wipe all custom additions, or load high-fidelity demo profiles for sandbox testing.
        </p>
        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
          <button class="btn btn-danger" id="btn-settings-clear-db">⚠️ Wipe & Reset Database</button>
          <button class="btn btn-primary" id="btn-settings-load-demo" style="background: var(--gradient-emerald);">⚡ Load Demo Seed Profiles</button>
        </div>
      </div>
    </div>
  `;

  // Clear Database listener
  document.getElementById('btn-settings-clear-db').addEventListener('click', () => {
    if (confirm("Are you absolutely sure you want to wipe the entire database? This deletes all trainers, timelines, and email logs permanently.")) {
      state.clearDatabase();
      showToast("Wrench Wise database wiped successfully. Starting clean!", "danger");
      renderSettings();
    }
  });

  // Load Demo Data listener
  document.getElementById('btn-settings-load-demo').addEventListener('click', () => {
    state.loadDemoData();
    showToast("High-fidelity demo trainers loaded successfully!", "success");
    renderSettings();
  });

  // Attach settings save handler
  document.getElementById('settings-api-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const keyVal = document.getElementById('set-gemini-key').value.trim();
    localStorage.setItem('ww_tms_gemini_key', keyVal);
    showToast("Integration API configurations synchronized and secured locally!", "success");
  });
}

// --------------------------------------------------------------------------
// Global Follow-up Scheduler Helper
// --------------------------------------------------------------------------
function openFollowupScheduler(trainer, onSchedule, onCancel = null) {
  const dialog = document.getElementById('followup-scheduler-dialog');
  const form = document.getElementById('followup-scheduler-form');
  const trainerIdInput = document.getElementById('followup-trainer-id');
  const trainerNameInput = document.getElementById('followup-trainer-name');
  const dateInput = document.getElementById('followup-date');
  const timeInput = document.getElementById('followup-time');
  const noteInput = document.getElementById('followup-note');
  const cancelBtn = document.getElementById('btn-followup-cancel');

  trainerIdInput.value = trainer.id;
  trainerNameInput.value = trainer.name;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.value = tomorrow.toISOString().split('T')[0];
  timeInput.value = "10:00";
  noteInput.value = `Follow-up call with ${trainer.name} to check availability and discuss onboarding steps.`;

  form.onsubmit = (e) => {
    e.preventDefault();
    
    const reminderData = {
      trainerId: trainer.id,
      trainerName: trainer.name,
      date: dateInput.value,
      time: timeInput.value,
      note: noteInput.value
    };

    state.addReminder(reminderData);
    updateSidebarRemindersCount();

    dialog.close();
    if (onSchedule) onSchedule(reminderData);
  };

  cancelBtn.onclick = () => {
    dialog.close();
    if (onCancel) onCancel();
  };

  dialog.showModal();
}

function updateSidebarRemindersCount() {
  const badge = document.getElementById('reminders-count-badge');
  if (badge) {
    const pendingCount = state.getReminders().filter(r => r.status === 'Pending').length;
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

// Session set to keep track of triggered notifications in current run to prevent duplicates
const triggeredReminderNotifications = new Set();

function startReminderCheckScheduler() {
  // Ensure the toast container exists in the document
  let container = document.getElementById('tms-reminder-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tms-reminder-toast-container';
    document.body.appendChild(container);
  }

  // Periodic interval check every 15 seconds
  setInterval(() => {
    const now = new Date();
    const reminders = state.getReminders();
    const pendingReminders = reminders.filter(r => r.status === 'Pending');

    pendingReminders.forEach(r => {
      if (triggeredReminderNotifications.has(r.id)) return;

      // Parse reminder date and time
      const [year, month, day] = r.date.split('-').map(Number);
      const [hours, minutes] = r.time.split(':').map(Number);
      const reminderTime = new Date(year, month - 1, day, hours, minutes, 0);

      const diffMs = reminderTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // Trigger reminder if it is exactly or within 15 minutes in the future
      if (diffMinutes > 0 && diffMinutes <= 15) {
        triggeredReminderNotifications.add(r.id);
        spawnReminderToast(r, container);
      }
    });
  }, 15000);
}

function spawnReminderToast(reminder, container) {
  const alertEl = document.createElement('div');
  alertEl.className = 'glass-panel reminder-floating-alert';
  alertEl.id = `reminder-alert-${reminder.id}`;
  alertEl.innerHTML = `
    <div class="reminder-alert-header">
      <span class="bell-icon">🔔</span>
      <span class="title" style="color: var(--text-primary); font-weight: 700;">Follow-up Reminder</span>
      <span class="countdown">in 15 mins</span>
    </div>
    <div class="reminder-alert-body">
      <h4>${reminder.trainerName}</h4>
      <p style="color: var(--text-secondary); margin-top: 0.25rem;">${reminder.note}</p>
      <div class="time-meta" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">
        Scheduled for: <strong style="color: var(--primary-indigo); font-weight: 600;">${reminder.time} today</strong>
      </div>
    </div>
    <div class="reminder-alert-actions" style="margin-top: 0.25rem;">
      <button class="btn btn-secondary" style="padding: 0.3rem 0.65rem; font-size: 0.75rem;" id="reminder-dismiss-${reminder.id}">Dismiss</button>
      <button class="btn btn-primary" style="padding: 0.3rem 0.65rem; font-size: 0.75rem;" id="reminder-complete-${reminder.id}">Mark Completed</button>
    </div>
  `;

  container.appendChild(alertEl);

  // Bind cancel action
  document.getElementById(`reminder-dismiss-${reminder.id}`).onclick = () => {
    alertEl.style.animation = "fadeOutAlert 0.3s forwards";
    setTimeout(() => alertEl.remove(), 300);
  };

  // Bind mark completed action
  document.getElementById(`reminder-complete-${reminder.id}`).onclick = () => {
    state.updateReminderStatus(reminder.id, 'Completed');
    updateSidebarRemindersCount();
    showToast(`Reminder for ${reminder.trainerName} marked as completed!`, 'success');
    
    // Animate removal
    alertEl.style.animation = "fadeOutAlert 0.3s forwards";
    setTimeout(() => alertEl.remove(), 300);
  };
}

// --------------------------------------------------------------------------
// Reminders View Renderer
// --------------------------------------------------------------------------
function renderReminders() {
  const reminders = state.getReminders();
  
  mainContentPanel.innerHTML = `
    <div class="view-header">
      <div class="view-header-title">
        <h1>Follow-up Reminders</h1>
        <p>Manage scheduled calls, negotiations, and outreach tasks.</p>
      </div>
    </div>

    <div class="reminders-list-container">
      <div class="sheet-table-wrapper">
        <table class="sheet-table">
          <thead>
            <tr>
              <th>Trainer Name</th>
              <th>Scheduled Date & Time</th>
              <th>Reminder Note</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="reminders-table-body">
            <!-- Dynamic Injection -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = document.getElementById('reminders-table-body');
  
  if (reminders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 4rem 2rem; text-align: center; color: var(--text-muted);">
          <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎉 All caught up!</p>
          <p style="font-size: 0.85rem;">No upcoming follow-ups scheduled at this time.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reminders.map(r => {
    const isCompleted = r.status === "Completed";
    const statusBadgeClass = isCompleted ? "completed" : "pending";
    
    return `
      <tr class="reminder-row" data-trainer-id="${r.trainerId}">
        <td>
          <strong style="color: var(--text-white); cursor: pointer; text-decoration: underline;" class="reminder-trainer-link">${r.trainerName}</strong>
        </td>
        <td>
          <span style="color: var(--primary-indigo); font-weight: 600;">📅 ${formatDate(r.date)}</span>
          <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.25rem;">⏰ ${r.time}</span>
        </td>
        <td style="color: var(--text-secondary); max-width: 300px; word-wrap: break-word;">
          ${r.note}
        </td>
        <td>
          <span class="reminder-status-badge ${statusBadgeClass}">${r.status}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          ${!isCompleted ? `<button class="reminder-action-btn complete btn-complete-reminder" data-id="${r.id}">✔️ Complete</button>` : ''}
          <button class="reminder-action-btn delete btn-delete-reminder" data-id="${r.id}">🗑️ Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  // Click handler to go to trainer details
  tbody.querySelectorAll('.reminder-trainer-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = link.closest('.reminder-row');
      switchView('profile-detail', row.dataset.trainerId);
    });
  });

  // Action handlers
  tbody.querySelectorAll('.btn-complete-reminder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      state.updateReminderStatus(id, "Completed");
      updateSidebarRemindersCount();
      renderReminders();
      showToast("Reminder marked as completed!", "success");
    });
  });

  tbody.querySelectorAll('.btn-delete-reminder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm("Delete this reminder?")) {
        const id = btn.dataset.id;
        state.deleteReminder(id);
        updateSidebarRemindersCount();
        renderReminders();
        showToast("Reminder deleted.", "warning");
      }
    });
  });
}

// --------------------------------------------------------------------------
// 4. Initial Core Initialization (DOM Ready check)
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Bind sidebar nav click events
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = btn.dataset.view;
      if (targetView) switchView(targetView);
    });
  });

  // Load adjustable sidebar resizer dragging listeners
  const resizer = document.getElementById('sidebar-resizer');
  const sidebar = document.querySelector('.app-sidebar');
  if (resizer && sidebar) {
    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      resizer.classList.add('resizing');
      
      const doDrag = (moveEvent) => {
        let newWidth = moveEvent.clientX;
        if (newWidth < 200) newWidth = 200; // min width limit
        if (newWidth > 500) newWidth = 500; // max width limit
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
      };
      
      const stopDrag = () => {
        document.body.style.cursor = '';
        resizer.classList.remove('resizing');
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
      };
      
      document.addEventListener('mousemove', doDrag);
      document.addEventListener('mouseup', stopDrag);
    });
  }

  // Load initial reminders badge count
  updateSidebarRemindersCount();

  // Start checking for upcoming follow-up reminders (pop-up alerts 15 minutes before)
  startReminderCheckScheduler();

  // Trigger default dashboard rendering
  switchView('dashboard');
});
