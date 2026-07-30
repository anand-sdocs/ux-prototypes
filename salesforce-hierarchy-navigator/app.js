/**
 * Salesforce Object Hierarchy Navigator - Core Logic with Hierarchy Identifiers
 */

// Application State
const state = {
  // Navigation path inside the floating Flyout panel
  navigationPath: [
    {
      objectName: "Opportunity",
      label: "Opportunity",
      relationshipName: null,
      apiName: "Opportunity"
    }
  ],
  
  // Accordions added to the sidebar
  // Now includes level and parentDisplayPath for initial Opportunity
  accordions: [
    {
      id: "Opportunity",
      objectName: "Opportunity",
      label: "Opportunity",
      path: "Opportunity",
      displayPath: "Opportunity",
      level: 0,
      parentDisplayPath: ""
    }
  ],
  
  // Expanded accordions set (Opportunity expanded by default)
  expandedAccordions: new Set(["Opportunity"]),
  
  // Is the flyout panel visible
  isFlyoutOpen: false,
  
  // Sidebar Search and Filters
  searchTerm: "",
  activeFilter: "all",
  
  // Flyout Submenu Search and Filters
  flyoutSearchTerm: "",
  flyoutActiveFilter: "all",
  
  // Placed fields on the canvas
  canvasElements: [],
  
  // For canvas repositioning drag
  draggedCanvasElement: null,
  dragOffset: { x: 0, y: 0 }
};

// DOM Elements
const el = {
  searchField: null,
  filterButtons: null,
  accordionsList: null,
  
  // Flyout Elements
  flyoutPanel: null,
  flyoutBreadcrumbs: null,
  flyoutSearchInput: null,
  flyoutFilterButtons: null,
  flyoutFieldsList: null,
  btnCloseFlyout: null,
  
  // Canvas Elements
  canvas: null,
  canvasPlaceholder: null,
  toast: null,
  btnClearCanvas: null
};

// Helper: Get fields for a specific Salesforce object
function getObjectFields(objectName) {
  const obj = SALESFORCE_SCHEMA[objectName];
  return obj ? obj.fields : [];
}

// Helper: Find field definition by Relationship Name on a parent object
function findFieldByRelationship(parentObjectName, relationshipName) {
  const fields = getObjectFields(parentObjectName);
  return fields.find(f => f.relationshipName === relationshipName);
}

// Helper: Rebuild the state.navigationPath array from a dot-notation path
function rebuildNavigationPath(pathString) {
  const parts = pathString.split(".");
  
  const newPath = [
    {
      objectName: "Opportunity",
      label: "Opportunity",
      relationshipName: null,
      apiName: "Opportunity"
    }
  ];
  
  let currentObjectName = "Opportunity";
  
  for (let i = 1; i < parts.length; i++) {
    const relName = parts[i];
    const fieldDef = findFieldByRelationship(currentObjectName, relName);
    
    if (fieldDef) {
      newPath.push({
        objectName: fieldDef.referenceTo,
        label: fieldDef.label,
        relationshipName: relName,
        apiName: fieldDef.apiName
      });
      currentObjectName = fieldDef.referenceTo;
    } else {
      break;
    }
  }
  
  state.navigationPath = newPath;
}

// Helper: Get full resolved relationship path for active navigation state
function getResolvedPath(pathArray, fieldApiName) {
  let parts = ["Opportunity"];
  for (let i = 1; i < pathArray.length; i++) {
    parts.push(pathArray[i].relationshipName);
  }
  if (fieldApiName) {
    parts.push(fieldApiName);
  }
  return parts.join(".");
}

// Helper: General list filtering function based on search and type criteria
function filterFieldsList(fields, searchTerm, activeFilter) {
  return fields.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchTerm) || 
                          field.apiName.toLowerCase().includes(searchTerm);
    if (!matchesSearch) return false;
    
    if (activeFilter === "all") return true;
    
    if (activeFilter === "text") {
      return ["string", "id", "picklist", "phone", "url", "email"].includes(field.type);
    }
    if (activeFilter === "number") {
      return ["currency", "percent", "double", "integer"].includes(field.type);
    }
    if (activeFilter === "boolean_date") {
      return ["boolean", "date", "datetime"].includes(field.type);
    }
    if (activeFilter === "reference") {
      return field.type === "reference";
    }
    
    return true;
  });
}

// Helper: Reset flyout search and filter button active classes
function resetFlyoutFilters() {
  state.flyoutSearchTerm = "";
  state.flyoutActiveFilter = "all";
  if (el.flyoutSearchInput) {
    el.flyoutSearchInput.value = "";
  }
  if (el.flyoutFilterButtons) {
    el.flyoutFilterButtons.forEach(btn => {
      if (btn.dataset.filter === "all") {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM elements
  el.searchField = document.getElementById("search-input");
  el.filterButtons = document.querySelectorAll(".filter-btn:not(.flyout-filter-btn)");
  el.accordionsList = document.getElementById("accordions-list");
  
  // Flyout panel caching
  el.flyoutPanel = document.getElementById("flyout-panel");
  el.flyoutBreadcrumbs = document.getElementById("flyout-breadcrumbs");
  el.flyoutSearchInput = document.getElementById("flyout-search-input");
  el.flyoutFilterButtons = document.querySelectorAll(".flyout-filter-btn");
  el.flyoutFieldsList = document.getElementById("flyout-fields-list");
  el.btnCloseFlyout = document.getElementById("btn-close-flyout");
  
  // Canvas caching
  el.canvas = document.getElementById("blank-page-canvas");
  el.canvasPlaceholder = document.getElementById("canvas-placeholder");
  el.toast = document.getElementById("toast");
  el.btnClearCanvas = document.getElementById("btn-clear-canvas");

  // Event Listeners: Sidebar Search & Filters
  el.searchField.addEventListener("input", (e) => {
    state.searchTerm = e.target.value.toLowerCase();
    renderAccordions();
  });

  el.filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      el.filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeFilter = btn.dataset.filter;
      renderAccordions();
    });
  });

  // Event Listeners: Flyout Submenu Search & Filters
  el.flyoutSearchInput.addEventListener("input", (e) => {
    state.flyoutSearchTerm = e.target.value.toLowerCase();
    renderFlyout();
  });

  el.flyoutFilterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      el.flyoutFilterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.flyoutActiveFilter = btn.dataset.filter;
      renderFlyout();
    });
  });

  // Canvas Actions
  el.btnClearCanvas.addEventListener("click", () => {
    state.canvasElements = [];
    renderCanvas();
    showToast("Canvas cleared!");
  });

  el.btnCloseFlyout.addEventListener("click", () => {
    closeFlyout();
  });

  // Canvas Drag & Drop Actions
  el.canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.canvas.classList.add("drag-over");
  });

  el.canvas.addEventListener("dragleave", () => {
    el.canvas.classList.remove("drag-over");
  });

  el.canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    el.canvas.classList.remove("drag-over");
    
    const dragDataRaw = e.dataTransfer.getData("application/json");
    if (!dragDataRaw) return;
    
    try {
      const data = JSON.parse(dragDataRaw);
      const rect = el.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newElement = {
        id: "tag_" + Date.now(),
        path: data.path,
        label: data.label,
        x: Math.max(10, Math.min(x - 50, rect.width - 200)),
        y: Math.max(10, Math.min(y - 15, rect.height - 40))
      };
      
      state.canvasElements.push(newElement);
      renderCanvas();
      
      const mergeTag = `{{!${data.path}}}`;
      navigator.clipboard.writeText(mergeTag).then(() => {
        showToast(`Added field & copied: ${mergeTag}`);
      }).catch(() => {
        showToast(`Added field: ${mergeTag}`);
      });
      
    } catch (err) {
      console.error("Error parsing drop data", err);
    }
  });

  // Canvas Tag Re-drag movement
  window.addEventListener("mousemove", (e) => {
    if (!state.draggedCanvasElement) return;
    
    const rect = el.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left - state.dragOffset.x;
    let y = e.clientY - rect.top - state.dragOffset.y;
    
    x = Math.max(5, Math.min(x, rect.width - 150));
    y = Math.max(5, Math.min(y, rect.height - 35));
    
    const activeEl = state.canvasElements.find(item => item.id === state.draggedCanvasElement.id);
    if (activeEl) {
      activeEl.x = x;
      activeEl.y = y;
      
      const domEl = document.getElementById(activeEl.id);
      if (domEl) {
        domEl.style.left = x + "px";
        domEl.style.top = y + "px";
      }
    }
  });

  window.addEventListener("mouseup", () => {
    if (state.draggedCanvasElement) {
      state.draggedCanvasElement.classList.remove("dragging");
      state.draggedCanvasElement = null;
    }
  });

  // Initial render
  renderAccordions();
  renderCanvas();
});

// Close Flyout Panel
function closeFlyout() {
  state.isFlyoutOpen = false;
  el.flyoutPanel.classList.remove("open");
  resetFlyoutFilters();
}

// Open Flyout Panel
function openFlyout() {
  state.isFlyoutOpen = true;
  resetFlyoutFilters();
  renderFlyout();
  el.flyoutPanel.classList.add("open");
}

// Render Flyout Submenu Panel
function renderFlyout() {
  const currentLevel = state.navigationPath[state.navigationPath.length - 1];
  const fields = getObjectFields(currentLevel.objectName);
  const filteredFields = filterFieldsList(fields, state.flyoutSearchTerm, state.flyoutActiveFilter);
  
  // 1. Breadcrumbs
  let breadcrumbsHtml = `<div class="breadcrumbs-bar">`;
  state.navigationPath.forEach((node, index) => {
    const isLast = index === state.navigationPath.length - 1;
    if (isLast) {
      breadcrumbsHtml += `<span class="breadcrumb-item">${node.label}</span>`;
    } else {
      breadcrumbsHtml += `
        <span class="breadcrumb-item" onclick="navigateFlyoutBackTo(${index})">${node.label}</span>
        <span class="breadcrumb-separator">/</span>
      `;
    }
  });
  breadcrumbsHtml += `</div>`;
  el.flyoutBreadcrumbs.innerHTML = breadcrumbsHtml;
  
  // 2. Render Title & Fields list
  const titleText = `${currentLevel.label.toUpperCase()} FIELDS`;
  let fieldsHtml = `<div class="panel-header-label">${titleText}</div>`;
  
  if (filteredFields.length === 0) {
    fieldsHtml += `<div style="text-align:center; color:var(--text-muted); padding: 20px 0;">No fields match criteria</div>`;
  } else {
    fieldsHtml += `<div class="field-list">`;
    filteredFields.forEach(field => {
      const isLookup = field.type === "reference";
      const resolvedPath = getResolvedPath(state.navigationPath, field.apiName);
      
      fieldsHtml += `
        <div class="field-card" draggable="true" ondragstart="handleFieldDragStart(event, '${resolvedPath}', '${field.label}')">
          <div class="field-card-left">
            <div class="field-type-icon icon-${field.type}" title="Type: ${field.type}">
              ${getFieldIconText(field.type)}
            </div>
            <div>
              <div class="field-label" title="${field.label}">${field.label}</div>
              <div class="field-api-name">${field.apiName}</div>
            </div>
          </div>
          ${isLookup ? `
            <button class="field-navigate-btn" onclick="navigateFromFlyout('${field.apiName}', '${field.referenceTo}', '${field.label}', '${field.relationshipName}')" title="Navigate Relationship">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          ` : ""}
        </div>
      `;
    });
    fieldsHtml += `</div>`;
  }
  
  el.flyoutFieldsList.innerHTML = fieldsHtml;
}

// Get icon symbol text
function getFieldIconText(type) {
  switch (type) {
    case "id": return "ID";
    case "string": return "T";
    case "boolean": return "☑";
    case "currency": return "$";
    case "percent": return "%";
    case "date": return "D";
    case "picklist": return "☰";
    case "reference": return "🔗";
    default: return "F";
  }
}

// Go deeper inside the flyout
window.navigateFromFlyout = function(fieldApiName, referenceTo, fieldLabel, relationshipName) {
  state.navigationPath.push({
    objectName: referenceTo,
    label: fieldLabel,
    relationshipName: relationshipName,
    apiName: fieldApiName
  });
  
  const fullPath = getResolvedPath(state.navigationPath);
  const displayPath = state.navigationPath.map(n => n.label).join(" > ");
  
  const exists = state.accordions.some(acc => acc.path === fullPath);
  if (!exists) {
    state.accordions.push({
      id: fullPath.replace(/\./g, "_"),
      objectName: referenceTo,
      label: fieldLabel,
      path: fullPath,
      displayPath: displayPath,
      level: state.navigationPath.length - 1,
      parentDisplayPath: state.navigationPath.slice(0, -1).map(n => n.label).join(" > ")
    });
    state.expandedAccordions.add(fullPath.replace(/\./g, "_"));
  }
  
  resetFlyoutFilters();
  renderFlyout();
  renderAccordions();
};

// Go back to previous level from breadcrumbs in flyout
window.navigateFlyoutBackTo = function(index) {
  state.navigationPath = state.navigationPath.slice(0, index + 1);
  resetFlyoutFilters();
  renderFlyout();
};

// Open/trigger lookup navigation from sidebar accordions
window.navigateFromAccordion = function(event, accordionPath, fieldApiName, referenceTo, fieldLabel, relationshipName) {
  event.stopPropagation();
  
  // Rebuild navigation path from accordion base
  rebuildNavigationPath(accordionPath);
  
  // Push the lookup
  state.navigationPath.push({
    objectName: referenceTo,
    label: fieldLabel,
    relationshipName: relationshipName,
    apiName: fieldApiName
  });
  
  const fullPath = getResolvedPath(state.navigationPath);
  const displayPath = state.navigationPath.map(n => n.label).join(" > ");
  const accId = fullPath.replace(/\./g, "_");
  
  const exists = state.accordions.some(acc => acc.path === fullPath);
  if (!exists) {
    state.accordions.push({
      id: accId,
      objectName: referenceTo,
      label: fieldLabel,
      path: fullPath,
      displayPath: displayPath,
      level: state.navigationPath.length - 1,
      parentDisplayPath: state.navigationPath.slice(0, -1).map(n => n.label).join(" > ")
    });
    state.expandedAccordions.add(accId);
  }
  
  openFlyout();
  renderAccordions();
};

// Render Sidebar Accordions
function renderAccordions() {
  let html = "";
  
  state.accordions.forEach(acc => {
    const fields = getObjectFields(acc.objectName);
    const filteredFields = filterFieldsList(fields, state.searchTerm, state.activeFilter);
    const isExpanded = state.expandedAccordions.has(acc.id);
    
    // Apply indent style based on relationship tree depth (level)
    const paddingLeftVal = 12 + (acc.level * 10);
    
    html += `
      <div class="accordion-section" id="section_${acc.id}">
        <div class="accordion-header ${isExpanded ? 'active' : ''}" onclick="toggleAccordion('${acc.id}')" style="padding-left: ${paddingLeftVal}px;">
          <div class="accordion-header-left">
            ${acc.level > 0 ? `<span class="tree-connector" style="margin-right: 4px; color: var(--text-muted); opacity: 0.5; font-family: monospace; font-weight: bold;">└─</span>` : ''}
            <svg class="accordion-chevron ${isExpanded ? 'expanded' : ''}" id="chevron_${acc.id}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600;">${acc.label}</span>
              ${acc.level > 0 ? `<span style="font-size: 8px; color: var(--text-muted); text-transform: none; margin-top: 1px; font-weight: normal;">via ${acc.parentDisplayPath}</span>` : ''}
            </div>
          </div>
          <span style="font-size:8px; color:var(--text-muted); text-transform:none;">${acc.objectName}</span>
        </div>
        <div class="accordion-content ${isExpanded ? 'expanded' : ''}" id="content_${acc.id}">
          <div class="field-list">
    `;
    
    if (filteredFields.length === 0) {
      html += `<div style="text-align:center; color:var(--text-muted); padding: 10px 0; font-size:11px;">No fields match</div>`;
    } else {
      filteredFields.forEach(field => {
        const isLookup = field.type === "reference";
        const fieldPath = `${acc.path}.${field.apiName}`;
        
        html += `
          <div class="field-card" draggable="true" ondragstart="handleFieldDragStart(event, '${fieldPath}', '${field.label}')">
            <div class="field-card-left">
              <div class="field-type-icon icon-${field.type}">
                ${getFieldIconText(field.type)}
              </div>
              <div>
                <div class="field-label" title="${field.label}">${field.label}</div>
                <div class="field-api-name">${field.apiName}</div>
              </div>
            </div>
            ${isLookup ? `
              <button class="field-navigate-btn" onclick="navigateFromAccordion(event, '${acc.path}', '${field.apiName}', '${field.referenceTo}', '${field.label}', '${field.relationshipName}')" title="Navigate Relationship">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            ` : ""}
          </div>
        `;
      });
    }
    
    html += `
          </div>
        </div>
      </div>
    `;
  });
  
  el.accordionsList.innerHTML = html;
}

// Toggle accordion open/close state
window.toggleAccordion = function(accordionId) {
  const content = document.getElementById(`content_${accordionId}`);
  const chevron = document.getElementById(`chevron_${accordionId}`);
  const header = chevron.closest(".accordion-header");
  
  if (state.expandedAccordions.has(accordionId)) {
    state.expandedAccordions.delete(accordionId);
    content.classList.remove("expanded");
    chevron.classList.remove("expanded");
    header.classList.remove("active");
  } else {
    state.expandedAccordions.add(accordionId);
    content.classList.add("expanded");
    chevron.classList.add("expanded");
    header.classList.add("active");
  }
};

// Handle Drag Start from field list
window.handleFieldDragStart = function(e, path, label) {
  const data = { path, label };
  e.dataTransfer.setData("application/json", JSON.stringify(data));
  e.dataTransfer.effectAllowed = "copy";
  
  const dragCard = e.currentTarget;
  dragCard.classList.add("dragging");
  
  dragCard.addEventListener("dragend", () => {
    dragCard.classList.remove("dragging");
  }, { once: true });
};

// Render elements on the canvas
function renderCanvas() {
  if (state.canvasElements.length === 0) {
    el.canvasPlaceholder.style.display = "flex";
  } else {
    el.canvasPlaceholder.style.display = "none";
  }
  
  const currentTags = el.canvas.querySelectorAll(".merge-tag");
  currentTags.forEach(tag => tag.remove());
  
  state.canvasElements.forEach(item => {
    const tagEl = document.createElement("div");
    tagEl.className = "merge-tag";
    tagEl.id = item.id;
    tagEl.style.left = item.x + "px";
    tagEl.style.top = item.y + "px";
    
    tagEl.innerHTML = `
      <span>{{!${item.path}}}</span>
      <button class="merge-tag-delete" onclick="deleteCanvasElement(event, '${item.id}')" title="Delete">×</button>
    `;
    
    tagEl.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("merge-tag-delete")) return;
      
      state.draggedCanvasElement = tagEl;
      tagEl.classList.add("dragging");
      
      const rect = tagEl.getBoundingClientRect();
      state.dragOffset.x = e.clientX - rect.left;
      state.dragOffset.y = e.clientY - rect.top;
      
      e.stopPropagation();
    });
    
    el.canvas.appendChild(tagEl);
  });
}

// Delete field from the canvas
window.deleteCanvasElement = function(e, id) {
  e.stopPropagation();
  state.canvasElements = state.canvasElements.filter(item => item.id !== id);
  renderCanvas();
  showToast("Field removed from canvas");
};

// Toast notification helper
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }
  
  window.toastTimeout = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 3000);
}
