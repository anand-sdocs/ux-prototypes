document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const headerTitle = document.getElementById('doc-title-val');
  const btnEditTitle = document.getElementById('btn-edit-title');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');
  const sidebarExplorer = document.getElementById('sidebar-explorer');
  const toolDraw = document.getElementById('tool-draw');
  const toolData = document.getElementById('tool-data');
  const modeDragBtn = document.getElementById('mode-drag');
  const modeDrawBtn = document.getElementById('mode-draw');
  const orientationPortrait = document.getElementById('orientation-portrait');
  const orientationLandscape = document.getElementById('orientation-landscape');
  const btnClearCanvas = document.getElementById('btn-clear-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const blankPageCanvas = document.getElementById('blank-page-canvas');
  const canvasPlaceholder = document.getElementById('canvas-placeholder');
  const placeholderTitle = document.getElementById('placeholder-title');
  const placeholderDesc = document.getElementById('placeholder-desc');
  const canvasModeIndicator = document.getElementById('canvas-mode-indicator');
  const toast = document.getElementById('toast');
  
  // Sidebar Lists
  const runtimeFieldList = document.getElementById('runtime-field-list');
  const opportunityFieldList = document.getElementById('opportunity-field-list');
  const accountFieldList = document.getElementById('account-field-list');
  const sidebarSearch = document.getElementById('sidebar-search');
  const sidebarTabs = document.querySelectorAll('.sidebar-tabs .sidebar-tab');
  
  // Popover elements
  const fieldsPopover = document.getElementById('fields-popover');
  const popoverBackdrop = document.getElementById('popover-backdrop');
  const popoverSearchInput = document.getElementById('popover-search-input');
  const popoverTabs = document.querySelectorAll('.popover-tabs .popover-tab');
  const popoverRuntimeItems = document.getElementById('popover-runtime-items');
  const popoverOpportunityItems = document.getElementById('popover-opportunity-items');
  const popoverAccountItems = document.getElementById('popover-account-items');

  // --- State Variables ---
  let interactionMode = 'draw'; // 'draw' or 'drag'
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let currentTempBox = null;
  let pendingBoxDimensions = null; // Stores position of latest drawn box
  let dragActiveFieldCard = null; // Field object currently dragged from sidebar
  
  // Moving placed fields
  let movingTagElement = null;
  let moveOffsetX = 0;
  let moveOffsetY = 0;
  
  // Active Filter state
  let sidebarActiveTab = 'all';
  let sidebarFilterQuery = '';
  let popoverActiveTab = 'all';
  let popoverFilterQuery = '';

  // --- Initialize App ---
  initAccordions();
  renderSidebarFields();
  renderPopoverFields();
  updateModeUI();

  // --- Document Title Editing ---
  btnEditTitle.addEventListener('click', () => {
    const currentName = headerTitle.textContent;
    const inputName = prompt('Rename Template:', currentName);
    if (inputName && inputName.trim() !== '') {
      headerTitle.textContent = inputName.trim();
      showToast('Template renamed successfully!');
    }
  });

  headerTitle.addEventListener('dblclick', () => {
    btnEditTitle.click();
  });

  // --- Sidebar Collapse & Tools Toggle ---
  btnCloseSidebar.addEventListener('click', () => {
    sidebarExplorer.classList.add('collapsed');
    toolData.classList.remove('active');
  });

  toolData.addEventListener('click', () => {
    if (sidebarExplorer.classList.contains('collapsed')) {
      sidebarExplorer.classList.remove('collapsed');
      toolData.classList.add('active');
    } else {
      sidebarExplorer.classList.add('collapsed');
      toolData.classList.remove('active');
    }
  });

  toolDraw.addEventListener('click', () => {
    setInteractionMode('draw');
  });

  // --- Interaction Mode Selector ---
  modeDragBtn.addEventListener('click', () => setInteractionMode('drag'));
  modeDrawBtn.addEventListener('click', () => setInteractionMode('draw'));

  function setInteractionMode(mode) {
    interactionMode = mode;
    updateModeUI();
    cancelPendingDraw();
  }

  function updateModeUI() {
    if (interactionMode === 'draw') {
      modeDrawBtn.classList.add('active');
      modeDragBtn.classList.remove('active');
      toolDraw.classList.add('active');
      
      blankPageCanvas.classList.add('mode-draw');
      
      // Update canvas helper guides
      placeholderTitle.textContent = 'Draw to Add Field Box';
      placeholderDesc.textContent = 'Simply click, hold, and drag your cursor anywhere on this canvas to outline your field box, then pick the field you want to place.';
    } else {
      modeDragBtn.classList.add('active');
      modeDrawBtn.classList.remove('active');
      toolDraw.classList.remove('active');
      
      blankPageCanvas.classList.remove('mode-draw');
      
      placeholderTitle.textContent = 'Drop Salesforce Fields Here';
      placeholderDesc.textContent = 'Enable the Data side explorer, then grab any field card and drop it onto this canvas to place a merge field.';
    }
  }

  // --- Page Orientation Controls ---
  orientationPortrait.addEventListener('click', () => {
    orientationPortrait.classList.add('active');
    orientationLandscape.classList.remove('active');
    blankPageCanvas.classList.remove('landscape');
    blankPageCanvas.classList.add('portrait');
    cancelPendingDraw();
  });

  orientationLandscape.addEventListener('click', () => {
    orientationLandscape.classList.add('active');
    orientationPortrait.classList.remove('active');
    blankPageCanvas.classList.remove('portrait');
    blankPageCanvas.classList.add('landscape');
    cancelPendingDraw();
  });

  // --- Clear Canvas ---
  btnClearCanvas.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all fields from the canvas?')) {
      const tags = blankPageCanvas.querySelectorAll('.merge-tag');
      tags.forEach(tag => tag.remove());
      updatePlaceholderVisibility();
      cancelPendingDraw();
      showToast('Canvas cleared!');
    }
  });

  function updatePlaceholderVisibility() {
    const hasTags = blankPageCanvas.querySelector('.merge-tag') !== null;
    if (hasTags) {
      canvasPlaceholder.style.opacity = '0';
      canvasPlaceholder.style.pointerEvents = 'none';
    } else {
      canvasPlaceholder.style.opacity = '1';
      canvasPlaceholder.style.pointerEvents = 'none';
    }
  }

  // --- Accordion Logic ---
  function initAccordions() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const chevron = header.querySelector('.accordion-chevron');
        const contentId = header.id.replace('accordion-', 'content-');
        const content = document.getElementById(contentId);
        
        if (content.classList.contains('expanded')) {
          content.classList.remove('expanded');
          chevron.classList.remove('expanded');
        } else {
          content.classList.add('expanded');
          chevron.classList.add('expanded');
        }
      });
    });
  }

  // --- Toast Notification helper ---
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // --- Field Item Helper (Icon & Styles) ---
  function getFieldIconChar(type) {
    switch (type) {
      case 'id': return 'ID';
      case 'string': return 'T';
      case 'boolean': return '☑';
      case 'currency': return '$';
      case 'percent': return '%';
      case 'date': return '📅';
      case 'picklist': return '☰';
      case 'reference': return '🔗';
      case 'number': return '#';
      default: return 'T';
    }
  }

  function getFieldIconClass(type) {
    switch (type) {
      case 'id': return 'text';
      case 'string': return 'text';
      case 'boolean': return 'boolean';
      case 'currency': return 'number';
      case 'percent': return 'number';
      case 'number': return 'number';
      case 'date': return 'date';
      default: return 'text';
    }
  }

  // --- Render Explorer Sidebar Lists ---
  function renderSidebarFields() {
    // 1. Runtime fields
    runtimeFieldList.innerHTML = '';
    RUNTIME_FIELDS.forEach(field => {
      const card = createSidebarCard(field, 'Runtime');
      runtimeFieldList.appendChild(card);
    });

    // 2. Opportunity Fields
    opportunityFieldList.innerHTML = '';
    SALESFORCE_SCHEMA.Opportunity.fields.forEach(field => {
      const card = createSidebarCard(field, 'Opportunity');
      opportunityFieldList.appendChild(card);
    });

    // 3. Account Fields
    accountFieldList.innerHTML = '';
    SALESFORCE_SCHEMA.Account.fields.forEach(field => {
      const card = createSidebarCard(field, 'Account');
      accountFieldList.appendChild(card);
    });
  }

  function createSidebarCard(field, objectName) {
    const card = document.createElement('div');
    card.className = 'field-card';
    card.draggable = true;
    
    // Custom properties for filtering
    card.dataset.label = field.label.toLowerCase();
    card.dataset.api = field.apiName.toLowerCase();
    card.dataset.type = field.type;
    
    card.innerHTML = `
      <div class="field-card-left">
        <span class="field-type-indicator">${getFieldIconChar(field.type)}</span>
        <div>
          <div class="field-label">${field.label}</div>
          <div style="font-size: 10px; color: var(--text-muted); font-family: monospace;">${objectName}.${field.apiName}</div>
        </div>
      </div>
    `;

    // Standard Drag support
    card.addEventListener('dragstart', (e) => {
      if (interactionMode !== 'drag') {
        e.preventDefault();
        setInteractionMode('drag');
        showToast('Switched to Drag & Drop Mode');
      }
      dragActiveFieldCard = {
        apiPath: `${objectName}.${field.apiName}`,
        label: field.label,
        type: field.type
      };
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', dragActiveFieldCard.apiPath);
      e.dataTransfer.effectAllowed = 'copy';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    return card;
  }

  // --- Render Popover Lists ---
  function renderPopoverFields() {
    // 1. Runtime
    popoverRuntimeItems.innerHTML = '';
    RUNTIME_FIELDS.forEach(field => {
      const item = createPopoverItem(field, 'Runtime');
      popoverRuntimeItems.appendChild(item);
    });

    // 2. Opportunity
    popoverOpportunityItems.innerHTML = '';
    SALESFORCE_SCHEMA.Opportunity.fields.forEach(field => {
      const item = createPopoverItem(field, 'Opportunity');
      popoverOpportunityItems.appendChild(item);
    });

    // 3. Account
    popoverAccountItems.innerHTML = '';
    SALESFORCE_SCHEMA.Account.fields.forEach(field => {
      const item = createPopoverItem(field, 'Account');
      popoverAccountItems.appendChild(item);
    });
  }

  function createPopoverItem(field, objectName) {
    const item = document.createElement('div');
    item.className = 'popover-item';
    item.dataset.label = field.label.toLowerCase();
    item.dataset.api = field.apiName.toLowerCase();
    item.dataset.type = field.type;
    
    item.innerHTML = `
      <span class="popover-item-icon ${getFieldIconClass(field.type)}">${getFieldIconChar(field.type)}</span>
      <div style="overflow: hidden; flex: 1;">
        <div class="popover-item-label">${field.label}</div>
        <div style="font-size: 10px; color: var(--text-muted); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${objectName}.${field.apiName}
        </div>
      </div>
    `;

    item.addEventListener('click', () => {
      const apiPath = `${objectName}.${field.apiName}`;
      placeFieldAtDrawnLocation(apiPath);
    });

    return item;
  }

  // --- Filtering (Sidebar & Popover) ---
  // Sidebar Search
  sidebarSearch.addEventListener('input', (e) => {
    sidebarFilterQuery = e.target.value.toLowerCase().trim();
    filterSidebarList();
  });

  // Sidebar Type Tabs
  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sidebarTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      sidebarActiveTab = tab.dataset.type;
      filterSidebarList();
    });
  });

  function filterSidebarList() {
    const cards = sidebarExplorer.querySelectorAll('.field-card');
    cards.forEach(card => {
      const matchesSearch = card.dataset.label.includes(sidebarFilterQuery) || card.dataset.api.includes(sidebarFilterQuery);
      const matchesType = isTypeMatched(card.dataset.type, sidebarActiveTab);
      
      if (matchesSearch && matchesType) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Popover Search
  popoverSearchInput.addEventListener('input', (e) => {
    popoverFilterQuery = e.target.value.toLowerCase().trim();
    filterPopoverList();
  });

  // Popover Tabs
  popoverTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      popoverTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      popoverActiveTab = tab.dataset.type;
      filterPopoverList();
    });
  });

  function filterPopoverList() {
    const sections = fieldsPopover.querySelectorAll('.popover-section');
    
    sections.forEach(section => {
      const items = section.querySelectorAll('.popover-item');
      let visibleCount = 0;
      
      items.forEach(item => {
        const matchesSearch = item.dataset.label.includes(popoverFilterQuery) || item.dataset.api.includes(popoverFilterQuery);
        const matchesType = isTypeMatched(item.dataset.type, popoverActiveTab);
        
        if (matchesSearch && matchesType) {
          item.style.display = 'flex';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });
      
      // Hide section altogether if no fields match inside
      if (visibleCount > 0) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
  }

  function isTypeMatched(fieldType, filterType) {
    if (filterType === 'all') return true;
    if (filterType === 'text') return fieldType === 'string' || fieldType === 'id' || fieldType === 'picklist';
    if (filterType === 'number') return fieldType === 'number' || fieldType === 'currency' || fieldType === 'percent';
    if (filterType === 'boolean') return fieldType === 'boolean';
    if (filterType === 'date') return fieldType === 'date';
    return true;
  }

  // --- Drag and Drop Modes Interaction ---
  blankPageCanvas.addEventListener('dragover', (e) => {
    if (interactionMode === 'drag') {
      e.preventDefault();
      blankPageCanvas.classList.add('drag-over');
    }
  });

  blankPageCanvas.addEventListener('dragleave', () => {
    blankPageCanvas.classList.remove('drag-over');
  });

  blankPageCanvas.addEventListener('drop', (e) => {
    if (interactionMode === 'drag') {
      e.preventDefault();
      blankPageCanvas.classList.remove('drag-over');
      
      const canvasRect = blankPageCanvas.getBoundingClientRect();
      const dropX = e.clientX - canvasRect.left;
      const dropY = e.clientY - canvasRect.top;
      
      if (dragActiveFieldCard) {
        // Place tag with default sizing
        const tagWidth = 180;
        const tagHeight = 32;
        
        // Constrain coordinates so card fits inside canvas page
        const finalLeft = Math.max(0, Math.min(canvasRect.width - tagWidth, dropX - (tagWidth / 2)));
        const finalTop = Math.max(0, Math.min(canvasRect.height - tagHeight, dropY - (tagHeight / 2)));
        
        createMergeTagOnCanvas({
          left: finalLeft,
          top: finalTop,
          width: tagWidth,
          height: tagHeight,
          apiPath: dragActiveFieldCard.apiPath
        });
        
        showToast(`Placed ${dragActiveFieldCard.apiPath}`);
        dragActiveFieldCard = null;
      }
    }
  });

  // --- Click & Draw Modes Interaction ---
  blankPageCanvas.addEventListener('mousedown', (e) => {
    // Make sure click was not on an existing field or button
    if (e.target.closest('.merge-tag') || e.target.closest('.fields-popover')) {
      return;
    }

    if (interactionMode === 'draw') {
      const canvasRect = blankPageCanvas.getBoundingClientRect();
      startX = e.clientX - canvasRect.left;
      startY = e.clientY - canvasRect.top;
      
      isDrawing = true;
      closePopover();

      // Create a temporary drawing box outline
      currentTempBox = document.createElement('div');
      currentTempBox.className = 'temp-draw-box';
      currentTempBox.style.left = `${startX}px`;
      currentTempBox.style.top = `${startY}px`;
      currentTempBox.style.width = '0px';
      currentTempBox.style.height = '0px';
      blankPageCanvas.appendChild(currentTempBox);
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isDrawing && currentTempBox) {
      const canvasRect = blankPageCanvas.getBoundingClientRect();
      let currentX = e.clientX - canvasRect.left;
      let currentY = e.clientY - canvasRect.top;

      // Restrict box borders inside canvas
      currentX = Math.max(0, Math.min(canvasRect.width, currentX));
      currentY = Math.max(0, Math.min(canvasRect.height, currentY));

      const boxLeft = Math.min(startX, currentX);
      const boxTop = Math.min(startY, currentY);
      const boxWidth = Math.abs(currentX - startX);
      const boxHeight = Math.abs(currentY - startY);

      currentTempBox.style.left = `${boxLeft}px`;
      currentTempBox.style.top = `${boxTop}px`;
      currentTempBox.style.width = `${boxWidth}px`;
      currentTempBox.style.height = `${boxHeight}px`;

      pendingBoxDimensions = {
        left: boxLeft,
        top: boxTop,
        width: boxWidth,
        height: boxHeight
      };
    }
    
    // Manage moving placed elements
    if (movingTagElement) {
      const canvasRect = blankPageCanvas.getBoundingClientRect();
      let moveX = e.clientX - canvasRect.left - moveOffsetX;
      let moveY = e.clientY - canvasRect.top - moveOffsetY;
      
      // Keep boundaries inside canvas
      const width = parseFloat(movingTagElement.style.width);
      const height = parseFloat(movingTagElement.style.height);
      
      moveX = Math.max(0, Math.min(canvasRect.width - width, moveX));
      moveY = Math.max(0, Math.min(canvasRect.height - height, moveY));
      
      movingTagElement.style.left = `${moveX}px`;
      movingTagElement.style.top = `${moveY}px`;
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (isDrawing) {
      isDrawing = false;
      
      if (!currentTempBox) return;

      const canvasRect = blankPageCanvas.getBoundingClientRect();
      const finalWidth = pendingBoxDimensions ? pendingBoxDimensions.width : 0;
      const finalHeight = pendingBoxDimensions ? pendingBoxDimensions.height : 0;

      // Handle simple click (no drag or tiny drag)
      if (finalWidth < 12 || finalHeight < 12) {
        // Remove tiny temp box
        currentTempBox.remove();
        
        // Set standard dimensions centered at click
        const defaultWidth = 180;
        const defaultHeight = 32;
        const clickLeft = Math.max(0, Math.min(canvasRect.width - defaultWidth, startX - (defaultWidth / 2)));
        const clickTop = Math.max(0, Math.min(canvasRect.height - defaultHeight, startY - (defaultHeight / 2)));
        
        pendingBoxDimensions = {
          left: clickLeft,
          top: clickTop,
          width: defaultWidth,
          height: defaultHeight
        };
        
        // Recreate temp box showing the placement bounds
        currentTempBox = document.createElement('div');
        currentTempBox.className = 'temp-draw-box';
        currentTempBox.style.left = `${clickLeft}px`;
        currentTempBox.style.top = `${clickTop}px`;
        currentTempBox.style.width = `${defaultWidth}px`;
        currentTempBox.style.height = `${defaultHeight}px`;
        blankPageCanvas.appendChild(currentTempBox);
      }

      // Display floating Fields popover anchored to the newly drawn box
      openPopoverNearDrawnBox(pendingBoxDimensions);
    }
    
    // Release drag handle
    if (movingTagElement) {
      movingTagElement = null;
    }
  });

  // --- Popover Lifecycle Functions ---
  function openPopoverNearDrawnBox(box) {
    // Reset search
    popoverSearchInput.value = '';
    popoverFilterQuery = '';
    
    // Select first tab 'All'
    popoverTabs.forEach(t => t.classList.remove('active'));
    document.querySelector('.popover-tabs [data-type="all"]').classList.add('active');
    popoverActiveTab = 'all';
    
    filterPopoverList();
    
    // Show popover
    fieldsPopover.classList.add('open');
    popoverBackdrop.classList.add('active');
    
    // Anchor Calculations
    const canvasRect = blankPageCanvas.getBoundingClientRect();
    const popoverWidth = 280;
    const popoverHeight = 350; // Max height estimated
    
    // 1. Horizontal Positioning: Ideal anchor is to the RIGHT of the drawn box
    let popoverLeft = box.left + box.width + 8;
    
    // If it goes off the right edge of the canvas, show it to the LEFT of the drawn box
    if (popoverLeft + popoverWidth > canvasRect.width) {
      popoverLeft = box.left - popoverWidth - 8;
      // If even left goes off canvas, force it inside canvas bounds
      if (popoverLeft < 8) {
        popoverLeft = Math.max(8, canvasRect.width - popoverWidth - 8);
      }
    }
    
    // 2. Vertical Positioning: Align top of popover with top of drawn box
    let popoverTop = box.top;
    
    // If it extends beyond the bottom edge of the canvas, align its bottom edge with the bottom of the drawn box
    if (popoverTop + popoverHeight > canvasRect.height) {
      popoverTop = box.top + box.height - popoverHeight;
    }
    
    // Ensure it doesn't extend beyond the top edge of the canvas
    popoverTop = Math.max(8, popoverTop);
    
    fieldsPopover.style.left = `${popoverLeft}px`;
    fieldsPopover.style.top = `${popoverTop}px`;
  }

  function closePopover() {
    fieldsPopover.classList.remove('open');
    popoverBackdrop.classList.remove('active');
  }

  function cancelPendingDraw() {
    if (currentTempBox) {
      currentTempBox.remove();
      currentTempBox = null;
    }
    pendingBoxDimensions = null;
    closePopover();
  }

  // Dismiss popup by backdrop click
  popoverBackdrop.addEventListener('click', () => {
    cancelPendingDraw();
  });

  // Dismiss by Esc key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelPendingDraw();
    }
  });

  // --- Field Placement ---
  function placeFieldAtDrawnLocation(apiPath) {
    if (!pendingBoxDimensions) return;
    
    createMergeTagOnCanvas({
      left: pendingBoxDimensions.left,
      top: pendingBoxDimensions.top,
      width: pendingBoxDimensions.width,
      height: pendingBoxDimensions.height,
      apiPath: apiPath
    });
    
    showToast(`Placed ${apiPath}`);
    
    // Cleanup temporary drawing state
    if (currentTempBox) {
      currentTempBox.remove();
      currentTempBox = null;
    }
    pendingBoxDimensions = null;
    closePopover();
  }

  // --- Merge Tag Node Builder ---
  function createMergeTagOnCanvas(tagData) {
    const tag = document.createElement('div');
    tag.className = 'merge-tag';
    
    // Dynamic height constraints to display text nicely
    const blockHeight = Math.max(26, tagData.height);
    const blockWidth = Math.max(120, tagData.width);
    
    tag.style.left = `${tagData.left}px`;
    tag.style.top = `${tagData.top}px`;
    tag.style.width = `${blockWidth}px`;
    tag.style.height = `${blockHeight}px`;
    
    // Center text vertically
    tag.style.lineHeight = `${blockHeight - 10}px`;

    tag.innerHTML = `
      <span class="merge-tag-label" title="${tagData.apiPath}">${tagData.apiPath}</span>
      <div class="merge-tag-controls">
        <button class="merge-tag-btn" title="Remove Merge Field">×</button>
      </div>
    `;

    // Handle delete tag button
    const deleteBtn = tag.querySelector('.merge-tag-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tag.remove();
      updatePlaceholderVisibility();
      showToast('Field removed');
    });

    // Custom Drag-to-Move handler for placed tags
    tag.addEventListener('mousedown', (e) => {
      if (e.target.closest('.merge-tag-btn')) return;
      
      e.preventDefault();
      movingTagElement = tag;
      
      const canvasRect = blankPageCanvas.getBoundingClientRect();
      const tagRect = tag.getBoundingClientRect();
      
      moveOffsetX = e.clientX - tagRect.left;
      moveOffsetY = e.clientY - tagRect.top;
      
      // Move this tag to the top layer to prevent clipping
      blankPageCanvas.appendChild(tag);
    });

    blankPageCanvas.appendChild(tag);
    updatePlaceholderVisibility();
  }
});
