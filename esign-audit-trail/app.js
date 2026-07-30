// Dynamic Delegation Info
let delegationInfo = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@example.com',
  reason: 'Out of office, delegating signature authority to project coordinator.',
  time: '10:49 am',
  date: 'Jun 1, 2026'
};

// State Variables
let currentTourStep = 6;
let activeRequestId = 'req-2'; // S-Docs-NDA is active by default in this prototype

// DOM Elements
const requestsList = document.getElementById('requests-list');
const auditTimeline = document.getElementById('audit-timeline');
const drawerDocName = document.getElementById('drawer-doc-name');
const drawerDocStatus = document.getElementById('drawer-doc-status-badge');

// Tour Elements
const tourWidget = document.getElementById('tour-widget');
const tourMinimizeBtn = document.getElementById('tour-minimize-btn');
const tourChevron = document.getElementById('tour-chevron');
const tourStepTitle = document.getElementById('tour-step-title');
const tourStepDesc = document.getElementById('tour-step-desc');
const tourPrevBtn = document.getElementById('tour-prev-btn');
const tourFinishBtn = document.getElementById('tour-finish-btn');
const stepDots = document.querySelectorAll('.step-dot');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadDelegationData();
  setupEventListeners();
  renderTimeline(activeRequestId);
  updateTourUI();
});

// Load details from LocalStorage
function loadDelegationData() {
  const stored = localStorage.getItem('esign_delegation_info');
  if (stored) {
    delegationInfo = JSON.parse(stored);
    
    // Update S-Docs-NDA status to Completed since it has been signed
    const sdocsNdaRow = document.querySelector('[data-request-id="req-2"]');
    const sdocsNdaStatus = document.getElementById('req-2-status');
    if (sdocsNdaStatus && sdocsNdaRow) {
      sdocsNdaStatus.textContent = 'Completed';
      sdocsNdaStatus.className = 'status-pill pill-completed';
    }
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Row selection
  requestsList.addEventListener('click', (e) => {
    const row = e.target.closest('.request-row');
    if (!row) return;
    
    // Remove active class from all rows
    document.querySelectorAll('.request-row').forEach(r => r.classList.remove('active'));
    
    // Add active class to clicked row
    row.classList.add('active');
    
    // Update active request
    activeRequestId = row.getAttribute('data-request-id');
    
    // Render timeline for selected request
    renderTimeline(activeRequestId);
  });

  // Tour minimize/maximize
  tourMinimizeBtn.addEventListener('click', () => {
    tourWidget.classList.toggle('minimized');
  });

  // Tour navigation
  tourPrevBtn.addEventListener('click', () => {
    // Go back to the Gmail mockup screen (Step 4)
    window.location.href = '../delegated-signatures/gmail.html';
  });

  tourFinishBtn.addEventListener('click', handleTourFinish);

  // Jump steps using dots
  stepDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const step = parseInt(e.target.getAttribute('data-step'), 10);
      if (step <= 4) {
        window.location.href = `../delegated-signatures/index.html?tour=${step}`;
      } else if (step === 5) {
        window.location.href = '../delegated-signatures/gmail.html';
      } else {
        renderTimeline(activeRequestId);
      }
    });
  });
}

// Get timeline events for requests
function getTimelineData(reqId) {
  const isSdocsNdaCompleted = localStorage.getItem('esign_delegation_info') !== null;

  switch (reqId) {
    case 'req-1': // Draft
      return [
        { title: 'Created', time: 'Jun 2, 2026 9:15 am', detail: 'Signature request created by Shaun Bokhari (sbokhari@sdocs.com).', isPending: false }
      ];

    case 'req-2': // S-Docs-NDA
      if (isSdocsNdaCompleted) {
        // Timeline after delegation has completed
        return [
          { title: 'Delivered', time: 'Jun 1, 2026 10:48 am', detail: 'The request email was delivered to the signer number-1, Shaun Bokhari (sbokhari@sdocs.com). Recipient 1 of 1.', isPending: false },
          { title: 'Opened', time: 'Jun 1, 2026 10:49 am', detail: 'The request email was opened by the signer number-1, Shaun Bokhari (sbokhari@sdocs.com). Recipient 1 of 1.', isPending: false },
          { 
            title: 'Delegated', 
            time: `${delegationInfo.date} ${delegationInfo.time}`, 
            detail: `The signing authority was delegated by Shaun Bokhari (sbokhari@sdocs.com) to <strong>${delegationInfo.firstName} ${delegationInfo.lastName} (${delegationInfo.email})</strong>.<br><br><strong>Reason:</strong> "${delegationInfo.reason}"`, 
            isPending: false,
            isDelegatedEvent: true 
          },
          { title: 'Opened', time: 'Jun 1, 2026 10:52 am', detail: `The request email was opened by the delegated signer, <strong>${delegationInfo.firstName} ${delegationInfo.lastName} (${delegationInfo.email})</strong>. Recipient 1 of 1 (Delegated).`, isPending: false },
          { title: 'Authenticated', time: 'Jun 1, 2026 10:52 am', detail: `The identity of the delegated signer, <strong>${delegationInfo.firstName} ${delegationInfo.lastName} (${delegationInfo.email})</strong>, was verified via standard email link authentication.`, isPending: false },
          { title: 'Viewed', time: 'Jun 1, 2026 10:53 am', detail: `The document was viewed by the delegated signer, <strong>${delegationInfo.firstName} ${delegationInfo.lastName} (${delegationInfo.email})</strong>. IP Address: 198.51.100.42.`, isPending: false },
          { title: 'Signed', time: 'Jun 1, 2026 10:54 am', detail: `The document was electronically signed by the delegated signer, <strong>${delegationInfo.firstName} ${delegationInfo.lastName} (${delegationInfo.email})</strong>. IP Address: 198.51.100.42. Signature ID: ESIGN-7B4D-82F3.`, isPending: false },
          { title: 'Completed', time: 'Jun 1, 2026 10:54 am', detail: 'The signature request process is complete. All participants have signed. Signed PDF copy archived in Salesforce files.', isPending: false }
        ];
      } else {
        // Timeline before delegation
        return [
          { title: 'Delivered', time: 'Jun 1, 2026 10:48 am', detail: 'The request email was delivered to the signer number-1, Shaun Bokhari (sbokhari@sdocs.com). Recipient 1 of 1.', isPending: false },
          { title: 'Opened', time: 'Jun 1, 2026 10:49 am', detail: 'The request email was opened by the signer number-1, Shaun Bokhari (sbokhari@sdocs.com). Recipient 1 of 1.', isPending: false },
          { title: 'Viewed', time: 'Jun 1, 2026 10:50 am', detail: 'The document was viewed by Shaun Bokhari (sbokhari@sdocs.com).', isPending: true },
          { title: 'Signed', time: '--', detail: 'Pending signature of recipient.', isPending: true },
          { title: 'Completed', time: '--', detail: 'Pending completion.', isPending: true }
        ];
      }

    case 'req-3': // Security Solution Deployment
      return [
        { title: 'Delivered', time: 'Jun 1, 2026 10:48 am', detail: 'The request email was delivered to the signer number-1, Shaun Bokhari (sbokhari@sdocs.com). Recipient 1 of 1.', isPending: false },
        { title: 'Opened', time: 'Jun 1, 2026 10:49 am', detail: 'The request email was opened by the signer number-1, Shaun Bokhari (sbokhari@sdocs.com). Recipient 1 of 1.', isPending: false },
        { title: 'Opened', time: 'Jun 1, 2026 10:49 am', detail: 'The request email was opened by the signer number-1, Shaun Bokhari (sbokhari@sdocs.com). Recipient 1 of 1.', isPending: false },
        { title: 'Authenticated', time: 'Jun 1, 2026 10:49 am', detail: 'The signer authenticated through the Salesforce org single sign-on link.', isPending: false },
        { title: 'Viewed', time: 'Jun 1, 2026 10:49 am', detail: 'The document was viewed by the signer. IP Address: 198.51.100.22.', isPending: false },
        { title: 'Signed', time: 'Jun 1, 2026 10:50 am', detail: 'The document was signed by Shaun Bokhari (sbokhari@sdocs.com). IP Address: 198.51.100.22. Signature ID: ESIGN-63F9-D912.', isPending: false },
        { title: 'Completed', time: 'Jun 1, 2026 10:50 am', detail: 'The signature request process is complete.', isPending: false }
      ];

    case 'req-4': // Shaun - AC3 Test
    case 'req-5': // Blank PDF
    case 'req-6': // S-Docs - NDA
    default:
      return [
        { title: 'Delivered', time: 'Jun 1, 2026 10:48 am', detail: 'The request email was delivered.', isPending: false },
        { title: 'Opened', time: 'Jun 1, 2026 10:49 am', detail: 'The request email was opened.', isPending: false },
        { title: 'Completed', time: 'Jun 1, 2026 10:50 am', detail: 'The signing process completed.', isPending: false }
      ];
  }
}

// Render the right panel timeline
function renderTimeline(reqId) {
  // Update header text in drawer
  const row = document.querySelector(`[data-request-id="${reqId}"]`);
  if (row) {
    const docName = row.querySelector('.req-name').textContent;
    const statusPill = row.querySelector('.status-pill');
    
    drawerDocName.textContent = docName;
    drawerDocStatus.textContent = statusPill.textContent;
    drawerDocStatus.className = `status-badge-inline ${statusPill.className.replace('status-pill', 'badge')}`;
  }

  const events = getTimelineData(reqId);
  auditTimeline.innerHTML = '';

  events.forEach((ev, idx) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = `timeline-item ${ev.isPending ? 'pending' : ''} ${ev.isDelegatedEvent ? 'delegated-event' : ''}`;
    
    if (ev.isDelegatedEvent) {
      timelineItem.id = 'delegated-event-row';
    }

    // Set checkmark or empty dot
    const nodeHTML = ev.isPending ? 
      `<div class="timeline-node"></div>` : 
      `<div class="timeline-node">
         <svg class="node-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
           <polyline points="20 6 9 17 4 12"></polyline>
         </svg>
       </div>`;

    // Timeline content
    timelineItem.innerHTML = `
      ${nodeHTML}
      <div class="timeline-header">
        <span class="timeline-title">${ev.title}</span>
        <div class="timeline-time-wrapper">
          <span class="timeline-time">${ev.time}</span>
          <svg class="time-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="timeline-details">${ev.detail}</div>
    `;

    // Toggle Details logic
    const header = timelineItem.querySelector('.timeline-header');
    const details = timelineItem.querySelector('.timeline-details');
    const chevron = timelineItem.querySelector('.time-chevron');

    header.addEventListener('click', () => {
      const isVisible = details.classList.contains('visible');
      
      // Close other details
      document.querySelectorAll('.timeline-details').forEach(d => d.classList.remove('visible'));
      document.querySelectorAll('.time-chevron').forEach(c => c.classList.remove('expanded'));

      if (!isVisible) {
        details.classList.add('visible');
        chevron.classList.add('expanded');
        
        // If they click on the delegated event, advance the tour
        if (ev.isDelegatedEvent && currentTourStep === 6) {
          showTourStep7();
        }
      }
    });

    // Expand details of Delegated by default to show off interactions
    if (ev.isDelegatedEvent && localStorage.getItem('esign_delegation_info')) {
      setTimeout(() => {
        details.classList.add('visible');
        chevron.classList.add('expanded');
      }, 100);
    }

    auditTimeline.appendChild(timelineItem);
  });
}

// Step 7: Tour Conclusion (triggered after expanding delegated event details)
function showTourStep7() {
  currentTourStep = 7;
  tourStepTitle.textContent = "Tour Complete!";
  tourStepDesc.innerHTML = `
    Excellent! You have successfully completed the Interactive Tour.
    <br><br>
    The audit trail records the delegation as a permanent event, providing compliance, complete clarity, and legal validation for both signers.
    <br><br>
    You can share this tour with your team. Click **"Finish"** to close the guide, or restart the tour from the beginning.
  `;
  tourFinishBtn.textContent = "Restart Tour";
}

// Tour Finish/Restart handler
function handleTourFinish() {
  if (currentTourStep === 7) {
    // Restart the whole experience
    resetTourState();
  } else {
    // Standard finish
    tourWidget.classList.add('minimized');
  }
}

// Full reset and return to signer experience
function resetTourState() {
  localStorage.removeItem('esign_delegation_info');
  window.location.href = '../delegated-signatures/index.html?tour=1';
}

function updateTourUI() {
  const isDelegated = localStorage.getItem('esign_delegation_info') !== null;
  const delegatedRow = document.getElementById('delegated-event-row');

  // Highlights
  if (delegatedRow) {
    delegatedRow.classList.add('tour-pulse-highlight');
  }

  if (isDelegated) {
    tourStepTitle.textContent = "Step 6: Sender's Audit Trail";
    tourStepDesc.innerHTML = `
      We are now in the S-Docs Sender Portal. The status drawer for the **S-Docs-NDA** document displays the updated signing timeline.
      <br><br>
      Notice the new <strong>"Delegated"</strong> event entry highlighted below. It dynamically reflects the details entered by the signer!
      <br><br>
      <strong>Action:</strong> Click on the highlighted <strong>"Delegated"</strong> row to expand and view the detailed delegation log.
    `;
  } else {
    // If they visited directly without completing signer step, prompt them to start from beginning
    tourStepTitle.textContent = "Welcome to E-Sign Audit Trail";
    tourStepDesc.innerHTML = `
      This is the sender portal displaying signature requests. To experience the delegation flow, we recommend starting from the signer experience.
      <br><br>
      <strong>Action:</strong> Click <strong>"Start Tour"</strong> to go back to the Consent page and run the full flow.
    `;
    tourFinishBtn.textContent = "Start Tour";
    tourFinishBtn.addEventListener('click', () => {
      window.location.href = '../delegated-signatures/index.html?tour=1';
    });
  }
}
