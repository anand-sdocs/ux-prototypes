/**
 * Mockup Application Logic for Apex Callable UX
 */
document.addEventListener("DOMContentLoaded", () => {
  
  // --- APPLICATION STATE ---
  let activeApexClass = null;
  let isSidebarOpen = false;
  let savedApexClass = null;
  
  // --- DOM ELEMENTS ---
  const btnTriggerAdvancedData = document.getElementById("btn-trigger-advanced-data");
  const rightSidebar = document.getElementById("right-sidebar");
  const btnCloseRightSidebar = document.getElementById("btn-close-right-sidebar");
  
  const leftSidebar = document.getElementById("left-sidebar");
  const btnToggleLeftSidebar = document.getElementById("btn-toggle-left-sidebar");
  
  const headerOppFields = document.getElementById("header-opp-fields");
  const contentOppFields = document.getElementById("content-opp-fields");
  const secOppFields = document.getElementById("sec-opp-fields");
  
  const headerApexFields = document.getElementById("header-apex-fields");
  const contentApexFields = document.getElementById("content-apex-fields");
  const secApexFields = document.getElementById("sec-apex-fields");
  const savedApexClassTitle = document.getElementById("saved-apex-class-title");
  
  const btnApexSelect = document.getElementById("btn-apex-select");
  const apexSelectValue = document.getElementById("apex-select-value");
  const dropdownApexList = document.getElementById("dropdown-apex-list");
  const apexConfigPanel = document.getElementById("apex-config-panel");
  const configClassName = document.getElementById("config-class-name");
  const configClassDesc = document.getElementById("config-class-desc");
  
  const inputsMappingTbody = document.getElementById("inputs-mapping-tbody");
  
  const tabConfigInputs = document.getElementById("tab-config-inputs");
  const tabConfigValidation = document.getElementById("tab-config-validation");
  const panelConfigInputs = document.getElementById("panel-config-inputs");
  const panelConfigValidation = document.getElementById("panel-config-validation");
  
  const valTabResults = document.getElementById("val-tab-results");
  const valTabFields = document.getElementById("val-tab-fields");
  const valContentResults = document.getElementById("val-content-results");
  const valContentFields = document.getElementById("val-content-fields");
  
  const valResultsThead = document.getElementById("val-results-thead");
  const valResultsTbody = document.getElementById("val-results-tbody");
  const valFieldsTbody = document.getElementById("val-fields-tbody");
  
  const btnApexValidate = document.getElementById("btn-apex-validate");
  const btnApexSave = document.getElementById("btn-apex-save");
  const valLoading = document.getElementById("val-loading");
  
  const blankPageCanvas = document.getElementById("blank-page-canvas");
  const canvasPlaceholder = document.getElementById("canvas-placeholder");
  const btnClearCanvas = document.getElementById("btn-clear-canvas");
  const toast = document.getElementById("toast");
  
  const oppFieldsList = document.getElementById("opp-fields-list");
  const savedApexFieldsList = document.getElementById("saved-apex-fields-list");
  const leftSearchInput = document.getElementById("left-search-input");
  
  // --- INITIALIZE EXPLORER FIELDS ---
  renderExplorerFields();
  
  // --- SIDEBAR TOGGLE ACTIONS ---
  
  // Opportunity Trigger Link top-left
  btnTriggerAdvancedData.addEventListener("click", () => {
    isSidebarOpen = !isSidebarOpen;
    if (isSidebarOpen) {
      rightSidebar.classList.add("open");
      btnTriggerAdvancedData.classList.add("active");
    } else {
      rightSidebar.classList.remove("open");
      btnTriggerAdvancedData.classList.remove("active");
    }
  });
  
  // Close Right Sidebar Button
  btnCloseRightSidebar.addEventListener("click", () => {
    isSidebarOpen = false;
    rightSidebar.classList.remove("open");
    btnTriggerAdvancedData.classList.remove("active");
  });
  
  // Toggle Left Sidebar (Slim nav button)
  btnToggleLeftSidebar.addEventListener("click", () => {
    leftSidebar.classList.toggle("collapsed");
    btnToggleLeftSidebar.classList.toggle("active");
  });
  
  // --- ACCORDION EXPANSION ---
  
  headerOppFields.addEventListener("click", () => {
    const isExpanded = contentOppFields.classList.contains("expanded");
    if (isExpanded) {
      contentOppFields.classList.remove("expanded");
      secOppFields.classList.remove("active");
      headerOppFields.querySelector(".accordion-chevron").classList.remove("expanded");
    } else {
      contentOppFields.classList.add("expanded");
      secOppFields.classList.add("active");
      headerOppFields.querySelector(".accordion-chevron").classList.add("expanded");
    }
  });
  
  headerApexFields.addEventListener("click", () => {
    const isExpanded = contentApexFields.classList.contains("expanded");
    if (isExpanded) {
      contentApexFields.classList.remove("expanded");
      secApexFields.classList.remove("active");
      headerApexFields.querySelector(".accordion-chevron").classList.remove("expanded");
    } else {
      contentApexFields.classList.add("expanded");
      secApexFields.classList.add("active");
      headerApexFields.querySelector(".accordion-chevron").classList.add("expanded");
    }
  });
  
  // --- APEX CLASS REFERENCE SELECTION ---
  
  // Toggle Apex Reference Dropdown
  btnApexSelect.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownApexList.classList.toggle("open");
  });
  
  // Close dropdown on click outside
  document.addEventListener("click", () => {
    dropdownApexList.classList.remove("open");
  });
  
  // Populate dropdown with mock classes
  dropdownApexList.innerHTML = "";
  MOCK_APEX_CLASSES.forEach((cls) => {
    const dropdownItem = document.createElement("div");
    dropdownItem.className = "dropdown-item";
    dropdownItem.innerHTML = `
      <div>${cls.label}</div>
      <div class="dropdown-item-desc">${cls.description}</div>
    `;
    dropdownItem.addEventListener("click", () => {
      selectApexClass(cls);
    });
    dropdownApexList.appendChild(dropdownItem);
  });
  
  function selectApexClass(cls) {
    activeApexClass = cls;
    apexSelectValue.textContent = cls.label;
    dropdownApexList.classList.remove("open");
    
    // Load config view
    configClassName.textContent = cls.label;
    configClassDesc.textContent = cls.description;
    
    // Reset tabs state
    tabConfigInputs.classList.add("active");
    tabConfigValidation.classList.add("disabled");
    tabConfigValidation.classList.remove("active");
    panelConfigInputs.classList.add("active");
    panelConfigValidation.classList.remove("active");
    btnApexSave.setAttribute("disabled", "true");
    
    // Populate parameters mapping table
    renderMappingTable(cls.inputs);
    
    // Show configuration panel
    apexConfigPanel.style.display = "flex";
  }
  
  // --- INPUTS MAPPING TABLE & TYPEAHEAD AUTOCOMPLETE ---
  
  function renderMappingTable(inputs) {
    inputsMappingTbody.innerHTML = "";
    
    inputs.forEach((input) => {
      const tr = document.createElement("tr");
      
      // Column 1: Parameter Details
      const tdParam = document.createElement("td");
      const iconChar = input.type.charAt(0).toUpperCase();
      tdParam.innerHTML = `
        <div class="param-name-wrapper">
          <span class="field-type-icon icon-${input.type}" title="${input.type}">${iconChar}</span>
          <span>${input.name}</span>
          ${input.required ? '<span class="param-required-asterisk" title="Required">*</span>' : ''}
        </div>
      `;
      
      // Column 2: Typeahead field selection
      const tdMap = document.createElement("td");
      const typeaheadContainer = document.createElement("div");
      typeaheadContainer.className = "typeahead-container";
      
      const typeaheadInput = document.createElement("input");
      typeaheadInput.className = "typeahead-input";
      typeaheadInput.placeholder = "Select field...";
      typeaheadInput.setAttribute("data-param-name", input.name);
      
      const typeaheadList = document.createElement("div");
      typeaheadList.className = "typeahead-list";
      
      typeaheadContainer.appendChild(typeaheadInput);
      typeaheadContainer.appendChild(typeaheadList);
      tdMap.appendChild(typeaheadContainer);
      
      tr.appendChild(tdParam);
      tr.appendChild(tdMap);
      inputsMappingTbody.appendChild(tr);
      
      // Setup Typeahead Behavior
      setupTypeaheadEvents(typeaheadInput, typeaheadList);
    });
  }
  
  function setupTypeaheadEvents(inputEl, listEl) {
    const oppFields = SALESFORCE_SCHEMA.Opportunity.fields;
    
    const populateSuggestions = (filterText = "") => {
      listEl.innerHTML = "";
      const filtered = oppFields.filter(f => 
        f.label.toLowerCase().includes(filterText.toLowerCase()) || 
        f.apiName.toLowerCase().includes(filterText.toLowerCase())
      );
      
      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "typeahead-item";
        empty.style.color = "#514f4d";
        empty.style.cursor = "default";
        empty.textContent = "No fields found";
        listEl.appendChild(empty);
        return;
      }
      
      filtered.forEach(field => {
        const item = document.createElement("div");
        item.className = "typeahead-item";
        const iconChar = field.type.charAt(0).toUpperCase();
        item.innerHTML = `
          <span class="typeahead-item-label">
            <span class="field-type-icon icon-${field.type}" style="width:14px; height:14px; font-size:7px;">${iconChar}</span>
            <span>${field.label}</span>
          </span>
          <span class="typeahead-item-api">${field.apiName}</span>
        `;
        item.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent input blur from firing before click
          inputEl.value = field.apiName;
          listEl.classList.remove("open");
          checkInputsValidationState();
        });
        listEl.appendChild(item);
      });
    };
    
    inputEl.addEventListener("focus", () => {
      populateSuggestions(inputEl.value);
      listEl.classList.add("open");
    });
    
    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        listEl.classList.remove("open");
      }, 150); // Small timeout to allow mousedown on suggestions
    });
    
    inputEl.addEventListener("input", () => {
      populateSuggestions(inputEl.value);
      listEl.classList.add("open");
      checkInputsValidationState();
    });
  }
  
  // Enable / disable validate button based on required parameters mapping
  function checkInputsValidationState() {
    let allRequiredMapped = true;
    const inputEls = inputsMappingTbody.querySelectorAll(".typeahead-input");
    
    inputEls.forEach(inputEl => {
      const paramName = inputEl.getAttribute("data-param-name");
      const paramMeta = activeApexClass.inputs.find(i => i.name === paramName);
      if (paramMeta.required && !inputEl.value.trim()) {
        allRequiredMapped = false;
      }
    });
    
    // We can show visual validation state if desired
  }
  
  // --- VALIDATION AND RUN SIMULATION ---
  
  btnApexValidate.addEventListener("click", () => {
    // Show validation spinner delay
    valLoading.classList.add("active");
    
    setTimeout(() => {
      valLoading.classList.remove("active");
      
      // Update config sub-tabs
      tabConfigValidation.classList.remove("disabled");
      tabConfigInputs.classList.remove("active");
      tabConfigValidation.classList.add("active");
      
      panelConfigInputs.classList.remove("active");
      panelConfigValidation.classList.add("active");
      
      // Enable Save
      btnApexSave.removeAttribute("disabled");
      
      // Switch active validation inner tab to results
      valTabResults.classList.add("active");
      valTabFields.classList.remove("active");
      valContentResults.classList.add("active");
      valContentFields.classList.remove("active");
      
      // Render mock validation tables
      renderValidationResults();
      
    }, 1200);
  });
  
  // Inner validation tab toggles
  valTabResults.addEventListener("click", () => {
    valTabResults.classList.add("active");
    valTabFields.classList.remove("active");
    valContentResults.classList.add("active");
    valContentFields.classList.remove("active");
  });
  
  valTabFields.addEventListener("click", () => {
    valTabFields.classList.add("active");
    valTabResults.classList.remove("active");
    valContentFields.classList.add("active");
    valContentResults.classList.remove("active");
  });
  
  function renderValidationResults() {
    if (!activeApexClass) return;
    
    // Results Tab (Sample Data returned by Class)
    valResultsThead.innerHTML = "";
    valResultsTbody.innerHTML = "";
    
    // Header row
    const headerTr = document.createElement("tr");
    activeApexClass.outputs.forEach(output => {
      const th = document.createElement("th");
      th.textContent = output.label;
      headerTr.appendChild(th);
    });
    valResultsThead.appendChild(headerTr);
    
    // Data rows
    activeApexClass.sampleResults.forEach(row => {
      const tr = document.createElement("tr");
      activeApexClass.outputs.forEach(output => {
        const td = document.createElement("td");
        td.textContent = row[output.apiName] || "-";
        tr.appendChild(td);
      });
      valResultsTbody.appendChild(tr);
    });
    
    // Fields Tab (Metadata of returned schema)
    valFieldsTbody.innerHTML = "";
    activeApexClass.outputs.forEach(output => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${output.apiName}</td>
        <td>${output.label}</td>
        <td><span class="val-table-datatype">${output.type.toUpperCase()}</span></td>
      `;
      valFieldsTbody.appendChild(tr);
    });
  }
  
  // --- SAVE ACTION & EXPLORER SYNCHRONIZATION ---
  
  btnApexSave.addEventListener("click", () => {
    if (!activeApexClass) return;
    
    savedApexClass = activeApexClass;
    
    // Show Toast
    showToast(`${savedApexClass.name} configured and saved successfully!`);
    
    // Reset dropdown selector text and hide config inline
    apexSelectValue.textContent = "Click to add";
    apexConfigPanel.style.display = "none";
    
    // Reveal and populate the Left Explorer accordion with Apex Outputs
    savedApexClassTitle.textContent = `${savedApexClass.name} Outputs`;
    secApexFields.style.display = "block";
    secApexFields.classList.add("active");
    contentApexFields.classList.add("expanded");
    headerApexFields.querySelector(".accordion-chevron").classList.add("expanded");
    
    renderApexExplorerFields();
  });
  
  function renderApexExplorerFields() {
    savedApexFieldsList.innerHTML = "";
    
    savedApexClass.outputs.forEach(field => {
      const card = document.createElement("div");
      card.className = "field-card apex-field-card";
      card.setAttribute("draggable", "true");
      card.setAttribute("data-api-name", field.apiName);
      card.setAttribute("data-label", field.label);
      card.setAttribute("data-type", field.type);
      card.setAttribute("data-source", "apex");
      card.setAttribute("data-parent-class", savedApexClass.name);
      
      const iconChar = field.type.charAt(0).toUpperCase();
      card.innerHTML = `
        <div class="field-card-left">
          <span class="field-type-icon icon-${field.type}" title="${field.type}">${iconChar}</span>
          <div>
            <div class="field-label">${field.label}</div>
            <div class="field-api-name">${field.apiName}</div>
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#673ab7" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      `;
      
      // Attach Drag Start Event
      card.addEventListener("dragstart", handleDragStart);
      card.addEventListener("dragend", handleDragEnd);
      
      savedApexFieldsList.appendChild(card);
    });
  }
  
  // --- DRAG AND DROP EXPLORER SETUP ---
  
  function renderExplorerFields() {
    oppFieldsList.innerHTML = "";
    const oppFields = SALESFORCE_SCHEMA.Opportunity.fields;
    
    oppFields.forEach(field => {
      const card = document.createElement("div");
      card.className = "field-card";
      card.setAttribute("draggable", "true");
      card.setAttribute("data-api-name", field.apiName);
      card.setAttribute("data-label", field.label);
      card.setAttribute("data-type", field.type);
      card.setAttribute("data-source", "opp");
      
      const iconChar = field.type.charAt(0).toUpperCase();
      card.innerHTML = `
        <div class="field-card-left">
          <span class="field-type-icon icon-${field.type}" title="${field.type}">${iconChar}</span>
          <div>
            <div class="field-label">${field.label}</div>
            <div class="field-api-name">${field.apiName}</div>
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e28743" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      `;
      
      card.addEventListener("dragstart", handleDragStart);
      card.addEventListener("dragend", handleDragEnd);
      
      oppFieldsList.appendChild(card);
    });
  }
  
  // Left Search Filter
  leftSearchInput.addEventListener("input", () => {
    const query = leftSearchInput.value.toLowerCase();
    const activeFilter = document.querySelector(".filter-bar .filter-btn.active").getAttribute("data-filter");
    filterLeftFields(query, activeFilter);
  });
  
  // Left Explorer Tabs Filter Row
  const filterBtns = document.querySelectorAll(".filter-bar .filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const activeFilter = btn.getAttribute("data-filter");
      const query = leftSearchInput.value.toLowerCase();
      filterLeftFields(query, activeFilter);
    });
  });
  
  function filterLeftFields(query, filterType) {
    const oppFields = SALESFORCE_SCHEMA.Opportunity.fields;
    const cards = oppFieldsList.querySelectorAll(".field-card");
    
    // Filter Opportunity list
    oppFields.forEach((field, index) => {
      const matchesQuery = field.label.toLowerCase().includes(query) || field.apiName.toLowerCase().includes(query);
      const matchesType = (filterType === "all") || 
                          (filterType === "text" && field.type === "string") || 
                          (filterType === "number" && (field.type === "currency" || field.type === "percent")) || 
                          (filterType === "boolean" && field.type === "boolean") || 
                          (filterType === "reference" && field.type === "reference");
      
      if (matchesQuery && matchesType) {
        cards[index].style.display = "flex";
      } else {
        cards[index].style.display = "none";
      }
    });
    
    // Filter Apex List (if saved)
    if (savedApexClass) {
      const apexCards = savedApexFieldsList.querySelectorAll(".field-card");
      savedApexClass.outputs.forEach((field, index) => {
        const matchesQuery = field.label.toLowerCase().includes(query) || field.apiName.toLowerCase().includes(query);
        const matchesType = (filterType === "all") || 
                            (filterType === "text" && field.type === "string") || 
                            (filterType === "number" && (field.type === "currency" || field.type === "number")) || 
                            (filterType === "boolean" && field.type === "boolean") || 
                            (filterType === "reference" && field.type === "reference");
        
        if (matchesQuery && matchesType) {
          apexCards[index].style.display = "flex";
        } else {
          apexCards[index].style.display = "none";
        }
      });
    }
  }
  
  // --- DRAG AND DROP MECHANICS ---
  
  function handleDragStart(e) {
    this.classList.add("dragging");
    e.dataTransfer.setData("text/plain", JSON.stringify({
      apiName: this.getAttribute("data-api-name"),
      label: this.getAttribute("data-label"),
      type: this.getAttribute("data-type"),
      source: this.getAttribute("data-source"),
      parentClass: this.getAttribute("data-parent-class") || ""
    }));
  }
  
  function handleDragEnd() {
    this.classList.remove("dragging");
  }
  
  blankPageCanvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    blankPageCanvas.classList.add("drag-over");
  });
  
  blankPageCanvas.addEventListener("dragleave", () => {
    blankPageCanvas.classList.remove("drag-over");
  });
  
  blankPageCanvas.addEventListener("drop", (e) => {
    e.preventDefault();
    blankPageCanvas.classList.remove("drag-over");
    
    try {
      const rawData = e.dataTransfer.getData("text/plain");
      const data = JSON.parse(rawData);
      
      // Hide placeholder
      canvasPlaceholder.style.opacity = "0";
      canvasPlaceholder.style.pointerEvents = "none";
      
      // Calculate coordinates relative to canvas
      const rect = blankPageCanvas.getBoundingClientRect();
      // Adjust coordinates by half merge-tag dimensions approx (x=60, y=15)
      const x = e.clientX - rect.left - 60;
      const y = e.clientY - rect.top - 15;
      
      createMergeTag(data, x, y);
      
    } catch (err) {
      console.error("Drop Parse Error: ", err);
    }
  });
  
  function createMergeTag(data, left, top) {
    const tag = document.createElement("div");
    
    let tagText = "";
    if (data.source === "opp") {
      tag.className = "merge-tag merge-tag-opp";
      tagText = `{{!Opportunity.${data.apiName}}}`;
    } else {
      tag.className = "merge-tag merge-tag-apex";
      tagText = `{{!${data.parentClass}.${data.apiName}}}`;
    }
    
    // Set position absolute
    tag.style.left = `${Math.max(10, Math.min(left, 650))}px`;
    tag.style.top = `${Math.max(10, Math.min(top, 950))}px`;
    
    tag.innerHTML = `
      <span>${tagText}</span>
      <button class="merge-tag-delete" title="Delete tag">×</button>
    `;
    
    // Delete action
    tag.querySelector(".merge-tag-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      tag.remove();
      
      // Restore placeholder if empty
      if (blankPageCanvas.querySelectorAll(".merge-tag").length === 0) {
        canvasPlaceholder.style.opacity = "1";
        canvasPlaceholder.style.pointerEvents = "auto";
      }
    });
    
    // Copy on click
    tag.addEventListener("click", () => {
      navigator.clipboard.writeText(tagText)
        .then(() => showToast(`Merge tag ${tagText} copied!`))
        .catch(err => console.error("Clipboard Error: ", err));
    });
    
    // Enable dragging dropped tags inside canvas to reposition them
    setupCanvasTagDrag(tag);
    
    blankPageCanvas.appendChild(tag);
  }
  
  function setupCanvasTagDrag(tag) {
    let startX = 0, startY = 0;
    
    tag.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("merge-tag-delete")) return;
      e.preventDefault();
      
      startX = e.clientX;
      startY = e.clientY;
      
      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        startX = moveEvent.clientX;
        startY = moveEvent.clientY;
        
        const currentLeft = parseInt(tag.style.left) || 0;
        const currentTop = parseInt(tag.style.top) || 0;
        
        tag.style.left = `${Math.max(10, Math.min(currentLeft + deltaX, 650))}px`;
        tag.style.top = `${Math.max(10, Math.min(currentTop + deltaY, 950))}px`;
      };
      
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }
  
  // Clear Canvas Button
  btnClearCanvas.addEventListener("click", () => {
    const tags = blankPageCanvas.querySelectorAll(".merge-tag");
    tags.forEach(t => t.remove());
    canvasPlaceholder.style.opacity = "1";
    canvasPlaceholder.style.pointerEvents = "auto";
    showToast("Canvas cleared!");
  });
  
  // --- TOAST NOTIFICATIONS ---
  
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }
  
  // ==========================================
  // --- GUIDED TOUR / TUTORIAL IMPLEMENTATION ---
  // ==========================================
  
  let currentTourStep = -1;
  let tourBackdrop = null;
  let tourTooltip = null;
  let tourArrow = null;
  
  const TOUR_STEPS = [
    {
      targetId: "btn-trigger-advanced-data",
      title: "Step 1: Open Data Menu",
      text: "Click the **Opportunity** data link here to slide open the **Advanced Data** side panel. This panel houses all advanced data modeling configurations.",
      position: "bottom",
      pulseColor: "blue",
      triggerState: () => {
        // Ensure sidebar is closed initially to let user open it
        rightSidebar.classList.remove("open");
        btnTriggerAdvancedData.classList.remove("active");
        isSidebarOpen = false;
      }
    },
    {
      targetId: "tab-right-objects",
      title: "Step 2: Object Data Tab",
      text: "Click the **Objects** tab. This tab contains Salesforce Object modeling capabilities, such as writing SOQL queries or registering **Apex Callable** classes.",
      position: "left",
      pulseColor: "blue",
      triggerState: () => {
        // Automatically open right sidebar if closed
        rightSidebar.classList.add("open");
        btnTriggerAdvancedData.classList.add("active");
        isSidebarOpen = true;
        // Make sure 'Variables' tab is highlighted so they can switch
        document.querySelectorAll(".right-sidebar .sidebar-tab").forEach(tab => tab.classList.remove("active"));
        document.getElementById("tab-right-variables").classList.add("active");
      }
    },
    {
      targetId: "btn-apex-select",
      title: "Step 3: Add Apex Reference",
      text: "Click the **Click to add** button under the APEX accordion section. This will reveal the available Apex Callable classes configured in your Salesforce org.",
      position: "left",
      pulseColor: "blue",
      triggerState: () => {
        rightSidebar.classList.add("open");
        btnTriggerAdvancedData.classList.add("active");
        isSidebarOpen = true;
        // Ensure 'Objects' tab is active
        document.querySelectorAll(".right-sidebar .sidebar-tab").forEach(tab => tab.classList.remove("active"));
        document.getElementById("tab-right-objects").classList.add("active");
        // Ensure config panel is hidden
        apexConfigPanel.style.display = "none";
        apexSelectValue.textContent = "Click to add";
      }
    },
    {
      targetId: "inputs-mapping-tbody",
      title: "Step 4: Map Parameters",
      text: "This mapping interface lets you bind parameters needed by the Apex class to fields on the context object (**Opportunity**). Click inside a parameter input and search for **AccountId**.",
      position: "left",
      pulseColor: "purple",
      triggerState: () => {
        rightSidebar.classList.add("open");
        btnTriggerAdvancedData.classList.add("active");
        isSidebarOpen = true;
        // Ensure Objects tab active
        document.querySelectorAll(".right-sidebar .sidebar-tab").forEach(tab => tab.classList.remove("active"));
        document.getElementById("tab-right-objects").classList.add("active");
        // Ensure Apex class selected
        if (!activeApexClass) {
          selectApexClass(MOCK_APEX_CLASSES[0]);
        }
      }
    },
    {
      targetId: "btn-apex-validate",
      title: "Step 5: Run Validation",
      text: "With parameters mapped, click the **Validate** button. S-Docs will test-run the Apex class to ensure the bindings are correct and discover the return output schema.",
      position: "left",
      pulseColor: "purple",
      triggerState: () => {
        rightSidebar.classList.add("open");
        isSidebarOpen = true;
        if (!activeApexClass) selectApexClass(MOCK_APEX_CLASSES[0]);
        // Auto map input fields
        const typeaheadInputs = inputsMappingTbody.querySelectorAll(".typeahead-input");
        if (typeaheadInputs.length > 0) {
          typeaheadInputs[0].value = "AccountId";
        }
        checkInputsValidationState();
        // Go back to input tab
        tabConfigInputs.classList.add("active");
        tabConfigValidation.classList.remove("active");
        tabConfigValidation.classList.add("disabled");
        panelConfigInputs.classList.add("active");
        panelConfigValidation.classList.remove("active");
        btnApexSave.setAttribute("disabled", "true");
      }
    },
    {
      targetId: "panel-config-validation",
      title: "Step 6: Review Outputs",
      text: "Review the output metadata. The **Results** tab displays mock sample records to confirm data bindings, and the **Fields** tab details the fields S-Docs will return.",
      position: "left",
      pulseColor: "purple",
      triggerState: () => {
        rightSidebar.classList.add("open");
        isSidebarOpen = true;
        if (!activeApexClass) selectApexClass(MOCK_APEX_CLASSES[0]);
        // Perform Validation automatically if not done
        if (tabConfigValidation.classList.contains("disabled")) {
          // Skip delay for tour fluidness
          tabConfigValidation.classList.remove("disabled");
          tabConfigInputs.classList.remove("active");
          tabConfigValidation.classList.add("active");
          panelConfigInputs.classList.remove("active");
          panelConfigValidation.classList.add("active");
          btnApexSave.removeAttribute("disabled");
          renderValidationResults();
        }
      }
    },
    {
      targetId: "btn-apex-save",
      title: "Step 7: Save Apex Config",
      text: "Click **Save** to complete your bindings configuration. This registers the Apex Callable class dynamically as an available data source for this template.",
      position: "left",
      pulseColor: "purple",
      triggerState: () => {
        rightSidebar.classList.add("open");
        isSidebarOpen = true;
        if (!activeApexClass) selectApexClass(MOCK_APEX_CLASSES[0]);
        // Ensure validated
        tabConfigValidation.classList.remove("disabled");
        tabConfigInputs.classList.remove("active");
        tabConfigValidation.classList.add("active");
        panelConfigInputs.classList.remove("active");
        panelConfigValidation.classList.add("active");
        btnApexSave.removeAttribute("disabled");
        renderValidationResults();
      }
    },
    {
      targetId: "sec-apex-fields",
      title: "Step 8: Drag & Drop Fields",
      text: "Success! The Apex class has been registered. Expand the **GetAccountContactDetails Outputs** accordion on the Left Explorer, and drag the fields (e.g. **FirstName**) onto the blank canvas page!",
      position: "right",
      pulseColor: "blue",
      triggerState: () => {
        // Automatically run save
        if (!savedApexClass) {
          activeApexClass = MOCK_APEX_CLASSES[0];
          savedApexClass = activeApexClass;
          apexSelectValue.textContent = "Click to add";
          apexConfigPanel.style.display = "none";
          savedApexClassTitle.textContent = `${savedApexClass.name} Outputs`;
          secApexFields.style.display = "block";
          secApexFields.classList.add("active");
          contentApexFields.classList.add("expanded");
          headerApexFields.querySelector(".accordion-chevron").classList.add("expanded");
          renderApexExplorerFields();
        }
        // Ensure left sidebar is not collapsed
        leftSidebar.classList.remove("collapsed");
        btnToggleLeftSidebar.classList.add("active");
        // Ensure right sidebar is closed
        rightSidebar.classList.remove("open");
        btnTriggerAdvancedData.classList.remove("active");
        isSidebarOpen = false;
      }
    }
  ];
  
  function initTourElements() {
    if (tourBackdrop) return;
    
    // Create Backdrop
    tourBackdrop = document.createElement("div");
    tourBackdrop.className = "tour-backdrop";
    document.body.appendChild(tourBackdrop);
    
    // Create Tooltip Bubble
    tourTooltip = document.createElement("div");
    tourTooltip.className = "tour-tooltip";
    document.body.appendChild(tourTooltip);
    
    // Create Arrow element
    tourArrow = document.createElement("div");
    tourArrow.className = "tour-arrow";
    document.body.appendChild(tourArrow);
    
    // Event listener to dismiss tour on close click
    tourBackdrop.addEventListener("click", () => {
      // Allow dismissing by clicking backdrop
      dismissTour();
    });
  }
  
  function startTour() {
    initTourElements();
    
    document.body.classList.add("tour-modal-mode");
    tourBackdrop.classList.add("active");
    
    currentTourStep = 0;
    showStep(currentTourStep);
  }
  
  function dismissTour() {
    document.body.classList.remove("tour-modal-mode");
    if (tourBackdrop) tourBackdrop.classList.remove("active");
    if (tourTooltip) tourTooltip.classList.remove("active");
    if (tourArrow) tourArrow.className = "tour-arrow";
    
    // Remove highlights
    clearTourHighlights();
    currentTourStep = -1;
  }
  
  function clearTourHighlights() {
    document.querySelectorAll(".tour-highlight-blue").forEach(el => el.classList.remove("tour-highlight-blue"));
    document.querySelectorAll(".tour-highlight-purple").forEach(el => el.classList.remove("tour-highlight-purple"));
  }
  
  function showStep(index) {
    if (index < 0 || index >= TOUR_STEPS.length) {
      dismissTour();
      return;
    }
    
    clearTourHighlights();
    const step = TOUR_STEPS[index];
    
    // Run automated state trigger to ensure target is visible and accessible
    if (step.triggerState) {
      step.triggerState();
    }
    
    // Tiny timeout to let DOM updates paint before positioning
    setTimeout(() => {
      let target = null;
      
      // If targetId is class search, handle appropriately
      if (step.targetId.startsWith(".")) {
        target = document.querySelector(step.targetId);
      } else {
        target = document.getElementById(step.targetId);
      }
      
      if (!target) {
        console.warn(`Tour target element not found: ${step.targetId}`);
        // Advance automatically if target is missing (fail-safe)
        if (index > currentTourStep) {
          showStep(index + 1);
        } else {
          showStep(index - 1);
        }
        return;
      }
      
      // Highlight target element with glowing pulsing ring
      const pulseClass = step.pulseColor === "purple" ? "tour-highlight-purple" : "tour-highlight-blue";
      target.classList.add(pulseClass);
      
      // Setup Tooltip Content
      tourTooltip.innerHTML = `
        <div class="tour-tooltip-header">
          <span class="tour-step-indicator">${step.title}</span>
          <button class="tour-close-btn" id="tour-btn-close">×</button>
        </div>
        <div class="tour-tooltip-body">
          ${formatMarkdownBold(step.text)}
        </div>
        <div class="tour-tooltip-footer">
          <button class="tour-skip-btn" id="tour-btn-skip">Skip Tutorial</button>
          <div class="tour-nav-btns">
            ${index > 0 ? '<button class="tour-btn tour-btn-prev" id="tour-btn-prev">Back</button>' : ''}
            <button class="tour-btn tour-btn-next" id="tour-btn-next">${index === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      `;
      
      // Position the tooltip bubble and arrow relative to target
      positionTooltip(target, step.position);
      
      // Attach Tooltip Button Events
      document.getElementById("tour-btn-close").addEventListener("click", dismissTour);
      document.getElementById("tour-btn-skip").addEventListener("click", dismissTour);
      
      const btnNext = document.getElementById("tour-btn-next");
      btnNext.addEventListener("click", () => {
        currentTourStep++;
        showStep(currentTourStep);
      });
      
      if (index > 0) {
        const btnPrev = document.getElementById("tour-btn-prev");
        btnPrev.addEventListener("click", () => {
          currentTourStep--;
          showStep(currentTourStep);
        });
      }
      
      // Fade in tooltip
      tourTooltip.classList.add("active");
      
    }, 100);
  }
  
  function positionTooltip(target, position) {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tourTooltip.getBoundingClientRect();
    
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    let tooltipLeft = 0;
    let tooltipTop = 0;
    
    // Clear arrow class list
    tourArrow.className = "tour-arrow";
    let arrowClass = "";
    
    const arrowWidth = 16;
    const padding = 12;
    
    if (position === "bottom") {
      tooltipLeft = targetRect.left + (targetRect.width / 2) - (280 / 2);
      tooltipTop = targetRect.bottom + padding;
      arrowClass = "tour-arrow-top";
      
      // Position Arrow horizontally
      tourArrow.style.left = `${targetRect.left + (targetRect.width / 2) - 8}px`;
      tourArrow.style.top = `${targetRect.bottom + 4}px`;
    } 
    else if (position === "top") {
      tooltipLeft = targetRect.left + (targetRect.width / 2) - (280 / 2);
      tooltipTop = targetRect.top - tooltipRect.height - padding;
      arrowClass = "tour-arrow-bottom";
      
      // Position Arrow horizontally
      tourArrow.style.left = `${targetRect.left + (targetRect.width / 2) - 8}px`;
      tourArrow.style.top = `${targetRect.top - 8}px`;
    } 
    else if (position === "left") {
      tooltipLeft = targetRect.left - 280 - padding;
      tooltipTop = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
      arrowClass = "tour-arrow-right";
      
      // Position Arrow vertically
      tourArrow.style.left = `${targetRect.left - 8}px`;
      tourArrow.style.top = `${targetRect.top + (targetRect.height / 2) - 8}px`;
    } 
    else if (position === "right") {
      tooltipLeft = targetRect.right + padding;
      tooltipTop = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
      arrowClass = "tour-arrow-left";
      
      // Position Arrow vertically
      tourArrow.style.left = `${targetRect.right + 4}px`;
      tourArrow.style.top = `${targetRect.top + (targetRect.height / 2) - 8}px`;
    }
    
    // Bounds check to ensure tooltip fits screen size safely
    const tooltipWidth = 280;
    const tooltipHeight = tourTooltip.offsetHeight || 160;
    
    tooltipLeft = Math.max(10, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 10));
    tooltipTop = Math.max(10, Math.min(tooltipTop, window.innerHeight - tooltipHeight - 10));
    
    // Apply styles to elements
    tourTooltip.style.left = `${tooltipLeft + scrollLeft}px`;
    tourTooltip.style.top = `${tooltipTop + scrollTop}px`;
    
    tourArrow.classList.add(arrowClass);
    tourArrow.style.display = "block";
  }
  
  function formatMarkdownBold(text) {
    // Simple regex replacements for tutorial markdown bold (**Text**)
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }
  
  // Attach Event Listener to "Take a tour" button in header
  const btnTakeTour = document.getElementById("btn-take-tour");
  if (btnTakeTour) {
    btnTakeTour.addEventListener("click", (e) => {
      e.preventDefault();
      startTour();
    });
  }
  
  // Auto-launch the tour with a friendly delay on first load to wow the user!
  setTimeout(() => {
    startTour();
  }, 1000);
  
});

