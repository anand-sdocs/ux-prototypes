/**
 * Snippet editor: Runtime + custom Variables in a left "Data" panel, an
 * inline form to define new variables, drag-and-drop of any field onto the
 * canvas, and an "@" mention popup for inserting a field at the caret.
 */
function initSnippetEditor() {

  // --- STATE ---
  const customFields = []; // { apiName, label, type }
  let activeTypeFilter = "all";
  let searchQuery = "";

  // --- DOM ---
  const navElements = document.getElementById("nav-elements");
  const navData = document.getElementById("nav-data");
  const panelData = document.getElementById("panel-data");

  const typeFilterBar = document.getElementById("type-filter-bar");
  const fieldSearch = document.getElementById("field-search");

  const headerRuntime = document.getElementById("header-runtime");
  const bodyRuntime = document.getElementById("body-runtime");
  const headerVariables = document.getElementById("header-variables");
  const bodyVariables = document.getElementById("body-variables");

  const btnAddVariable = document.getElementById("btn-add-variable");
  const customFieldsList = document.getElementById("custom-fields-list");

  const docPage = document.getElementById("doc-page");
  const canvasBody = document.getElementById("canvas-body");

  const mentionMenu = document.getElementById("mention-menu");
  const mentionList = document.getElementById("mention-list");

  const btnPublish = document.getElementById("btn-publish");
  const toast = document.getElementById("toast");

  // ================= LEFT ICON RAIL (Data panel is the focus here) =================
  navData.addEventListener("click", () => {
    navData.classList.add("active");
    navElements.classList.remove("active");
    panelData.style.display = "flex";
  });
  navElements.addEventListener("click", () => {
    navElements.classList.add("active");
    navData.classList.remove("active");
    panelData.style.display = "none";
  });

  // ================= TYPE FILTER BAR =================
  TYPE_FILTERS.forEach(f => {
    const btn = document.createElement("button");
    btn.className = "type-filter-btn" + (f.key === "all" ? " active" : "");
    btn.textContent = f.label;
    btn.dataset.key = f.key;
    btn.addEventListener("click", () => {
      activeTypeFilter = f.key;
      typeFilterBar.querySelectorAll(".type-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderRuntimeFields();
      renderCustomFields();
    });
    typeFilterBar.appendChild(btn);
  });

  fieldSearch.addEventListener("input", () => {
    searchQuery = fieldSearch.value.toLowerCase();
    renderRuntimeFields();
    renderCustomFields();
  });

  function matchesFilters(field) {
    const matchesType = activeTypeFilter === "all" || field.type === activeTypeFilter ||
      (activeTypeFilter === "date" && field.type === "datetime");
    const matchesSearch = !searchQuery || field.label.toLowerCase().includes(searchQuery) || field.apiName.toLowerCase().includes(searchQuery);
    return matchesType && matchesSearch;
  }

  // ================= ACCORDIONS =================
  function wireAccordion(header, body) {
    header.addEventListener("click", () => {
      const expanded = body.classList.toggle("expanded");
      header.querySelector(".data-accordion-chevron").classList.toggle("expanded", expanded);
    });
  }
  wireAccordion(headerRuntime, bodyRuntime);
  wireAccordion(headerVariables, bodyVariables);

  // ================= RENDER FIELD CARDS =================
  function createFieldCard(field, isCustom) {
    const card = document.createElement("div");
    card.className = "field-card" + (isCustom ? " custom-var" : "");
    card.setAttribute("draggable", "true");
    card.dataset.apiName = field.apiName;
    card.dataset.label = field.label;
    card.dataset.type = field.type;
    card.dataset.source = isCustom ? "custom" : "runtime";

    const iconChar = { text: "T", date: "📅", datetime: "📅", number: "#", image: "🖼" }[field.type] || "T";
    card.innerHTML = `
      <div class="field-card-left">
        <span class="field-type-icon icon-${field.type}">${iconChar}</span>
        <div>
          <div class="field-label">${field.label}</div>
          <div class="field-api-name">${isCustom ? "Variables" : "Runtime"}.${field.apiName}</div>
        </div>
      </div>
    `;

    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", JSON.stringify({
        apiName: field.apiName, label: field.label, type: field.type,
        source: isCustom ? "custom" : "runtime"
      }));
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));

    return card;
  }

  function renderRuntimeFields() {
    bodyRuntime.innerHTML = "";
    const visible = RUNTIME_FIELDS.filter(matchesFilters);
    if (visible.length === 0) {
      bodyRuntime.innerHTML = `<div class="empty-accordion-note">No runtime fields match your filters.</div>`;
      return;
    }
    visible.forEach(f => bodyRuntime.appendChild(createFieldCard(f, false)));
  }

  function renderCustomFields() {
    customFieldsList.innerHTML = "";
    const visible = customFields.filter(matchesFilters);
    if (customFields.length === 0) {
      const note = document.createElement("div");
      note.className = "empty-accordion-note";
      note.textContent = "No custom variables yet. Add one above to reuse it in this snippet's content.";
      customFieldsList.appendChild(note);
      return;
    }
    if (visible.length === 0) {
      const note = document.createElement("div");
      note.className = "empty-accordion-note";
      note.textContent = "No variables match your filters.";
      customFieldsList.appendChild(note);
      return;
    }
    visible.forEach(f => customFieldsList.appendChild(createFieldCard(f, true)));
  }

  renderRuntimeFields();
  renderCustomFields();

  // ================= "+ ADD NEW VARIABLE" INLINE FORM =================
  function slugify(text) {
    return text
      .trim()
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i) => i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  }

  let addVariableForm = null;
  let apiNameManuallyEdited = false;

  btnAddVariable.addEventListener("click", () => {
    if (addVariableForm) return; // already open
    apiNameManuallyEdited = false;

    addVariableForm = document.createElement("div");
    addVariableForm.className = "add-variable-form";
    addVariableForm.innerHTML = `
      <div class="form-field">
        <label>Label</label>
        <input type="text" id="new-var-label" placeholder="e.g. Discount Percentage">
      </div>
      <div class="form-field">
        <label>API Name</label>
        <input type="text" id="new-var-api" placeholder="e.g. discountPercentage">
      </div>
      <div class="form-field">
        <label>Data Type</label>
        <div class="datatype-options" id="new-var-datatype">
          ${DATA_TYPES.map((dt, i) => `
            <div class="datatype-option${i === 0 ? " selected" : ""}" data-value="${dt.value}">
              <span class="dt-icon">${dt.icon}</span>${dt.label}
            </div>
          `).join("")}
        </div>
      </div>
      <div class="add-variable-form-actions">
        <button class="btn" id="btn-cancel-variable">Cancel</button>
        <button class="btn btn-primary" id="btn-save-variable" disabled>Save</button>
      </div>
    `;
    bodyVariables.insertBefore(addVariableForm, btnAddVariable.nextSibling);
    btnAddVariable.style.display = "none";

    const labelInput = addVariableForm.querySelector("#new-var-label");
    const apiInput = addVariableForm.querySelector("#new-var-api");
    const datatypeWrap = addVariableForm.querySelector("#new-var-datatype");
    const btnSave = addVariableForm.querySelector("#btn-save-variable");
    const btnCancel = addVariableForm.querySelector("#btn-cancel-variable");
    let selectedType = DATA_TYPES[0].value;

    labelInput.focus();

    labelInput.addEventListener("input", () => {
      if (!apiNameManuallyEdited) apiInput.value = slugify(labelInput.value);
      validateForm();
    });
    apiInput.addEventListener("input", () => {
      apiNameManuallyEdited = true;
      validateForm();
    });

    datatypeWrap.querySelectorAll(".datatype-option").forEach(opt => {
      opt.addEventListener("click", () => {
        datatypeWrap.querySelectorAll(".datatype-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        selectedType = opt.dataset.value;
      });
    });

    function validateForm() {
      btnSave.disabled = !(labelInput.value.trim() && apiInput.value.trim());
    }

    btnCancel.addEventListener("click", closeAddVariableForm);

    btnSave.addEventListener("click", () => {
      const label = labelInput.value.trim();
      const apiName = apiInput.value.trim();
      if (!label || !apiName) return;
      customFields.push({ apiName, label, type: selectedType });
      closeAddVariableForm();
      renderCustomFields();
      showToast(`Variable "${label}" added.`);
    });
  });

  function closeAddVariableForm() {
    if (addVariableForm) {
      addVariableForm.remove();
      addVariableForm = null;
    }
    btnAddVariable.style.display = "flex";
  }

  // ================= INSERT A MERGE PILL AT / NEAR CARET =================
  function buildPillHtml(field) {
    const iconChar = { text: "T", date: "📅", datetime: "📅", number: "#", image: "🖼" }[field.type] || "T";
    const color = { text: "#0176d3", date: "#e91e63", datetime: "#e91e63", number: "#ff9800", image: "#4caf50" }[field.type] || "#0176d3";
    const namespace = field.source === "custom" ? "Variables" : "Runtime";
    const cssClass = field.source === "custom" ? "merge-pill custom" : "merge-pill";
    return `<span class="${cssClass}" contenteditable="false" data-api-name="${field.apiName}"><span class="pill-icon-box" style="background:${color};">${iconChar}</span>${namespace}.${field.label}</span>`;
  }

  function insertPillAtRange(range, field) {
    const pillWrapper = document.createElement("span");
    pillWrapper.innerHTML = buildPillHtml(field) + "&nbsp;";
    const pillNode = pillWrapper.firstChild;
    const spaceNode = pillWrapper.lastChild;

    range.deleteContents();
    range.insertNode(spaceNode);
    range.insertNode(pillNode);

    // Move caret to just after the inserted space
    const sel = window.getSelection();
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  function insertPillAtEnd(field) {
    canvasBody.focus();
    const range = document.createRange();
    range.selectNodeContents(canvasBody);
    range.collapse(false);
    insertPillAtRange(range, field);
  }

  // ================= DRAG & DROP FROM LEFT PANEL ONTO CANVAS =================
  docPage.addEventListener("dragover", (e) => {
    e.preventDefault();
    docPage.classList.add("drag-over");
  });
  docPage.addEventListener("dragleave", (e) => {
    if (e.target === docPage) docPage.classList.remove("drag-over");
  });
  docPage.addEventListener("drop", (e) => {
    e.preventDefault();
    docPage.classList.remove("drag-over");
    let data;
    try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch (err) { return; }
    if (!data) return;

    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (!range || !canvasBody.contains(range.startContainer)) {
      insertPillAtEnd(data);
    } else {
      insertPillAtRange(range, data);
    }
  });

  // ================= "@" MENTION AUTOCOMPLETE =================
  let mentionActive = false;
  let mentionAnchorNode = null; // text node containing the "@query"
  let mentionAnchorOffset = 0;  // offset of the "@" within that text node
  let mentionActiveIndex = 0;
  let mentionCurrentItems = [];

  function allMentionFields() {
    return [
      ...RUNTIME_FIELDS.map(f => ({ ...f, source: "runtime" })),
      ...customFields.map(f => ({ ...f, source: "custom" }))
    ];
  }

  function closeMentionMenu() {
    mentionActive = false;
    mentionMenu.classList.remove("open");
    mentionAnchorNode = null;
  }

  function renderMentionList(query) {
    const all = allMentionFields();
    mentionCurrentItems = all.filter(f =>
      f.label.toLowerCase().includes(query.toLowerCase()) || f.apiName.toLowerCase().includes(query.toLowerCase())
    );
    mentionActiveIndex = 0;
    mentionList.innerHTML = "";
    if (mentionCurrentItems.length === 0) {
      mentionList.innerHTML = `<div class="mention-empty">No variables found</div>`;
      return;
    }
    mentionCurrentItems.forEach((field, i) => {
      const item = document.createElement("div");
      item.className = "mention-item" + (i === 0 ? " active-hover" : "");
      const namespace = field.source === "custom" ? "Variables" : "Runtime";
      item.innerHTML = `<span class="field-label">${field.label}</span><span class="mention-item-api">${namespace}.${field.apiName}</span>`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        chooseMentionField(field);
      });
      mentionList.appendChild(item);
    });
  }

  function positionMentionMenu() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getClientRects()[0] || range.getBoundingClientRect();
    const top = (rect.bottom || rect.top + 18) + 6;
    let left = rect.left || 0;
    const maxLeft = window.innerWidth - 268;
    mentionMenu.style.left = `${Math.max(8, Math.min(left, maxLeft))}px`;
    mentionMenu.style.top = `${Math.min(top, window.innerHeight - 200)}px`;
  }

  function chooseMentionField(field) {
    if (!mentionAnchorNode) { closeMentionMenu(); return; }
    // Replace the "@query" text (from the "@" to the current caret) with the pill.
    const sel = window.getSelection();
    const caretRange = sel.getRangeAt(0);
    const replaceRange = document.createRange();
    replaceRange.setStart(mentionAnchorNode, mentionAnchorOffset);
    replaceRange.setEnd(caretRange.endContainer, caretRange.endOffset);
    insertPillAtRange(replaceRange, field);
    closeMentionMenu();
  }

  canvasBody.addEventListener("input", () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) { closeMentionMenu(); return; }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType !== Node.TEXT_NODE) { closeMentionMenu(); return; }
    const textBeforeCaret = node.textContent.slice(0, range.startOffset);
    const match = textBeforeCaret.match(/@([\w]*)$/);

    if (match) {
      mentionActive = true;
      mentionAnchorNode = node;
      mentionAnchorOffset = range.startOffset - match[0].length;
      mentionMenu.classList.add("open");
      positionMentionMenu();
      renderMentionList(match[1]);
    } else {
      closeMentionMenu();
    }
  });

  canvasBody.addEventListener("keydown", (e) => {
    if (!mentionActive) return;
    if (e.key === "Escape") { closeMentionMenu(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (mentionCurrentItems.length === 0) return;
      const items = mentionList.querySelectorAll(".mention-item");
      items[mentionActiveIndex] && items[mentionActiveIndex].classList.remove("active-hover");
      mentionActiveIndex = e.key === "ArrowDown"
        ? (mentionActiveIndex + 1) % mentionCurrentItems.length
        : (mentionActiveIndex - 1 + mentionCurrentItems.length) % mentionCurrentItems.length;
      items[mentionActiveIndex] && items[mentionActiveIndex].classList.add("active-hover");
      return;
    }
    if (e.key === "Enter") {
      if (mentionCurrentItems.length === 0) return;
      e.preventDefault();
      chooseMentionField(mentionCurrentItems[mentionActiveIndex]);
    }
  });

  document.addEventListener("click", (e) => {
    if (mentionActive && !mentionMenu.contains(e.target) && e.target !== canvasBody) {
      closeMentionMenu();
    }
  });

  // ================= HEADER ACTIONS =================
  btnPublish.addEventListener("click", () => {
    showToast("Snippet published.");
  });

  // ================= TOAST =================
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSnippetEditor);
} else {
  initSnippetEditor();
}
