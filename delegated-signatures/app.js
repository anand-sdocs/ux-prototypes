// State Variables
let currentTourStep = 1;
let countdownInterval = null;
let secondsRemaining = 30;
const totalCountdownTime = 30;
const timerStrokeDasharray = 226; // 2 * PI * 36
let isDocumentSigned = false;

// DOM Elements - Screens
const consentCard = document.getElementById('consent-card');
const successCard = document.getElementById('success-card');
const signingView = document.getElementById('signing-view');
const delegationModal = document.getElementById('delegation-modal');

// DOM Elements - Triggers & Buttons
const btnCancel = document.getElementById('btn-cancel');
const btnConfirmConsent = document.getElementById('btn-confirm-consent');
const btnDelegateTrigger = document.getElementById('btn-delegate-trigger');
const modalCloseX = document.getElementById('modal-close-x');
const modalBtnCancel = document.getElementById('modal-btn-cancel');
const delegationForm = document.getElementById('delegation-form');
const btnRedirectNow = document.getElementById('btn-redirect-now');
const btnRestartTourEarly = document.getElementById('btn-restart-tour-early');

// Signing View Elements
const btnSigningDelegate = document.getElementById('btn-signing-delegate');
const btnSigningFinish = document.getElementById('btn-signing-finish');
const sigFieldTrigger = document.getElementById('sig-field-trigger');
const signingProgressFill = document.getElementById('signing-progress-fill');
const signingProgressText = document.getElementById('signing-progress-text');

// Form Input Elements
const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const emailInput = document.getElementById('email');
const reasonInput = document.getElementById('reason');

// Success Summary Elements
const successDelegateName = document.getElementById('success-delegate-name');
const successDelegateEmail = document.getElementById('success-delegate-email');
const timerBar = document.getElementById('timer-bar');
const timerSecondsText = document.getElementById('timer-seconds-text');

// Tour Elements
const tourWidget = document.getElementById('tour-widget');
const tourMinimizeBtn = document.getElementById('tour-minimize-btn');
const tourChevron = document.getElementById('tour-chevron');
const tourStepTitle = document.getElementById('tour-step-title');
const tourStepDesc = document.getElementById('tour-step-desc');
const tourPrevBtn = document.getElementById('tour-prev-btn');
const tourNextBtn = document.getElementById('tour-next-btn');
const stepDots = document.querySelectorAll('.step-dot');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkUrlParams();
  updateTourUI();
});

// Event Listeners Setup
function setupEventListeners() {
  // Consent page actions
  btnDelegateTrigger.addEventListener('click', () => {
    openModal();
    setTourStep(3);
  });

  btnConfirmConsent.addEventListener('click', () => {
    showSigningView();
    setTourStep(2);
  });

  btnCancel.addEventListener('click', () => {
    alert("Signing cancelled.");
  });
  
  // Document signing actions
  btnSigningDelegate.addEventListener('click', () => {
    openModal();
    setTourStep(3);
  });

  sigFieldTrigger.addEventListener('click', toggleSignature);

  btnSigningFinish.addEventListener('click', () => {
    if (!isDocumentSigned) {
      alert("Please sign the document before clicking Finish.");
      sigFieldTrigger.classList.add('tour-pulse-highlight');
      setTimeout(() => sigFieldTrigger.classList.remove('tour-pulse-highlight'), 2000);
    } else {
      alert("Document signed successfully! In a real scenario, this completes the session.");
    }
  });
  
  // Modal toggle & close
  modalCloseX.addEventListener('click', closeModal);
  modalBtnCancel.addEventListener('click', closeModal);
  
  // Close modal when clicking outside container
  delegationModal.addEventListener('click', (e) => {
    if (e.target === delegationModal) {
      closeModal();
    }
  });

  // Form submission
  delegationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitDelegation();
  });

  // Redirection & restart
  btnRedirectNow.addEventListener('click', redirectToGmail);
  btnRestartTourEarly.addEventListener('click', restartTour);

  // Tour minimize/maximize
  tourMinimizeBtn.addEventListener('click', toggleTourMinimize);

  // Tour navigation
  tourPrevBtn.addEventListener('click', handleTourPrev);
  tourNextBtn.addEventListener('click', handleTourNext);

  // Allow clicking dots to jump steps
  stepDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const step = parseInt(e.target.getAttribute('data-step'), 10);
      if (step <= 4) {
        setTourStep(step);
      } else if (step === 5) {
        redirectToGmail();
      } else if (step === 6) {
        window.location.href = '../esign-audit-trail/index.html?tour=step5';
      }
    });
  });
}

// Check URL parameters for step redirection
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const step = urlParams.get('tour');
  if (step) {
    const stepNum = parseInt(step, 10);
    if (stepNum >= 1 && stepNum <= 4) {
      setTourStep(stepNum);
    }
  }
}

// Show/Hide overlays
function showSigningView() {
  consentCard.classList.remove('active');
  successCard.classList.remove('active');
  signingView.classList.add('active');
}

function hideSigningView() {
  signingView.classList.remove('active');
}

// Modal Actions
function openModal() {
  delegationModal.classList.add('open');
  setTimeout(() => firstNameInput.focus(), 150);
}

function closeModal() {
  delegationModal.classList.remove('open');
  if (currentTourStep === 3) {
    // Go back to whichever screen was open
    if (signingView.classList.contains('active')) {
      setTourStep(2);
    } else {
      setTourStep(1);
    }
  }
}

// Toggle signature field click
function toggleSignature() {
  isDocumentSigned = !isDocumentSigned;
  if (isDocumentSigned) {
    sigFieldTrigger.classList.add('signed');
    signingProgressFill.style.width = '100%';
    signingProgressText.textContent = '100%';
  } else {
    sigFieldTrigger.classList.remove('signed');
    signingProgressFill.style.width = '0%';
    signingProgressText.textContent = '0%';
  }
}

// Handle Form Submission
function submitDelegation() {
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const email = emailInput.value.trim();
  const reason = reasonInput.value.trim();

  // Create timestamp
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const timeStr = `${hours}:${minutes} ${ampm}`;

  // Store in LocalStorage
  const delegationInfo = {
    firstName,
    lastName,
    email,
    reason,
    time: timeStr,
    date: 'Jun 1, 2026' // Matching screenshot date for timeline consistency
  };
  localStorage.setItem('esign_delegation_info', JSON.stringify(delegationInfo));

  // Update success screen fields
  successDelegateName.textContent = `${firstName} ${lastName}`;
  successDelegateEmail.textContent = `(${email})`;

  // Switch screens
  closeModal();
  hideSigningView();
  consentCard.classList.remove('active');
  successCard.classList.add('active');

  // Advance Tour to Success page
  setTourStep(4);

  // Start redirect countdown
  startCountdown();
}

// Redirection Timer Logic
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  secondsRemaining = totalCountdownTime;
  updateTimerUI();

  countdownInterval = setInterval(() => {
    secondsRemaining--;
    updateTimerUI();

    if (secondsRemaining <= 0) {
      clearInterval(countdownInterval);
      redirectToGmail();
    }
  }, 1000);
}

function updateTimerUI() {
  timerSecondsText.textContent = secondsRemaining;
  
  const fraction = secondsRemaining / totalCountdownTime;
  const dashoffset = timerStrokeDasharray * (1 - fraction);
  timerBar.style.strokeDashoffset = dashoffset;
}

function redirectToGmail() {
  if (countdownInterval) clearInterval(countdownInterval);
  window.location.href = 'gmail.html';
}

// Restart tour from beginning
function restartTour() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Reset localStorage
  localStorage.removeItem('esign_delegation_info');
  
  // Clear inputs & fields
  delegationForm.reset();
  isDocumentSigned = false;
  sigFieldTrigger.classList.remove('signed');
  signingProgressFill.style.width = '0%';
  signingProgressText.textContent = '0%';
  
  // Reset view state
  successCard.classList.remove('active');
  hideSigningView();
  consentCard.classList.add('active');
  
  setTourStep(1);
}

// Tour Functions
function setTourStep(step) {
  currentTourStep = step;
  updateTourUI();
}

function toggleTourMinimize() {
  tourWidget.classList.toggle('minimized');
}

function handleTourPrev() {
  if (currentTourStep > 1) {
    if (currentTourStep === 3) {
      closeModal();
      if (signingView.classList.contains('active')) {
        setTourStep(2);
      } else {
        setTourStep(1);
      }
    } else {
      setTourStep(currentTourStep - 1);
    }
  }
}

function handleTourNext() {
  if (currentTourStep === 1) {
    // Advancing from step 1 Consent screen. 
    // Simulate clicking Confirm to show the Document Review screen.
    showSigningView();
    setTourStep(2);
  } else if (currentTourStep === 2) {
    // Advancing from step 2 Document Review screen.
    // Simulate clicking Delegate button next to Finish in the header.
    openModal();
    setTourStep(3);
  } else if (currentTourStep === 3) {
    // Advancing from Step 3 modal.
    // Auto-fill and submit.
    autoFillForm();
    submitDelegation();
  } else if (currentTourStep === 4) {
    // Go to Gmail notification mockup (Step 5)
    redirectToGmail();
  }
}

function autoFillForm() {
  // Fill the defaulted values requested by user
  firstNameInput.value = 'John';
  lastNameInput.value = 'Smith';
  emailInput.value = 'john_ceo@acme.com';
  reasonInput.value = 'Exceeds my dollar threshold for signatory authority.';
}

function updateTourUI() {
  // Update Dot indicators
  stepDots.forEach((dot, index) => {
    if (index + 1 === currentTourStep) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Enable/disable back button
  tourPrevBtn.disabled = currentTourStep === 1;

  // Remove previous highlights
  btnDelegateTrigger.classList.remove('tour-pulse-highlight');
  btnConfirmConsent.classList.remove('tour-pulse-highlight');
  btnSigningDelegate.classList.remove('tour-pulse-highlight');
  firstNameInput.classList.remove('tour-pulse-highlight');
  lastNameInput.classList.remove('tour-pulse-highlight');
  emailInput.classList.remove('tour-pulse-highlight');
  reasonInput.classList.remove('tour-pulse-highlight');
  btnRedirectNow.classList.remove('tour-pulse-highlight');

  // Update step contents and apply visual highlights
  switch (currentTourStep) {
    case 1:
      tourStepTitle.textContent = "Step 1: Signer Consent Screen";
      tourStepDesc.innerHTML = `
        Welcome to the esignature signer experience. S-Docs asks the signer for electronic business consent.
        We have added two ways to delegate signature authority:
        <br><br>
        1. **Direct Delegation**: Click the **"Delegate"** button.
        2. **During Review**: Click **"Confirm"** to enter the document view first.
        <br><br>
        <strong>Action:</strong> Click the highlighted **"Confirm"** button to proceed to the document review.
      `;
      btnConfirmConsent.classList.add('tour-pulse-highlight');
      btnDelegateTrigger.classList.add('tour-pulse-highlight');
      
      // Make sure correct card is active
      hideSigningView();
      successCard.classList.remove('active');
      consentCard.classList.add('active');
      if (delegationModal.classList.contains('open')) {
        delegationModal.classList.remove('open');
      }
      break;

    case 2:
      tourStepTitle.textContent = "Step 2: Document review and signing";
      tourStepDesc.innerHTML = `
        You are now inside the document editor view. The signer can inspect the pages and tags. 
        If the signer chooses not to sign, they can delegate authority at any point.
        <br><br>
        <strong>Action:</strong> Click the highlighted <strong>"Delegate"</strong> button in the top-right header next to 'Finish'.
      `;
      btnSigningDelegate.classList.add('tour-pulse-highlight');
      
      // Ensure signing view is active
      showSigningView();
      if (delegationModal.classList.contains('open')) {
        delegationModal.classList.remove('open');
      }
      break;

    case 3:
      tourStepTitle.textContent = "Step 3: Entering Delegation Details";
      tourStepDesc.innerHTML = `
        The delegation modal overlay is presented. Note the warning indicating data entered will be reset.
        <br><br>
        <strong>Action:</strong> Fill details (or click 'Next' in the guide to auto-fill) and click <strong>"Confirm Delegation"</strong>.
      `;
      // Open modal if not already open
      if (!delegationModal.classList.contains('open')) {
        delegationModal.classList.add('open');
      }
      // Highlight form fields
      firstNameInput.classList.add('tour-pulse-highlight');
      lastNameInput.classList.add('tour-pulse-highlight');
      emailInput.classList.add('tour-pulse-highlight');
      reasonInput.classList.add('tour-pulse-highlight');
      break;

    case 4:
      tourStepTitle.textContent = "Step 4: Success Confirmation";
      tourStepDesc.innerHTML = `
        The signer is shown a success screen listing the delegate's name and email, along with a 30-second countdown.
        <br><br>
        <strong>Action:</strong> Click <strong>"Redirect Now (Skip)"</strong> to proceed to the Gmail notification mockup.
      `;
      btnRedirectNow.classList.add('tour-pulse-highlight');
      
      // Ensure success card is active
      hideSigningView();
      consentCard.classList.remove('active');
      successCard.classList.add('active');
      if (delegationModal.classList.contains('open')) {
        delegationModal.classList.remove('open');
      }
      // Start timer if not already running
      if (!countdownInterval) {
        startCountdown();
      }
      break;
  }
}
