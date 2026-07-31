/**
 * Snippet insertion + field-mapping UX mockup logic.
 *
 * Flow being demonstrated:
 *  1. User adds a Snippet from the left "Snippets" tray, or via the inline
 *     "+" menu on any empty line (Text/Heading/.../Snippet -> flyout of
 *     available snippets).
 *  2. The snippet is inserted into the canvas as an unresolved block showing
 *     its raw {{ }} placeholders.
 *  3. The right "Snippet Properties" panel opens automatically, letting the
 *     user map each placeholder to a field on the template's primary data
 *     source (Deal).
 *  4. Saving replaces the placeholders with mapped merge fields and closes
 *     the panel. Re-opening a saved block (edit icon) lets the user remap.
 */
function initSnippetLibrary() {

  // --- STATE ---
  let instanceCounter = 0;
  const instances = {}; // instanceId -> { snippetId, mappings: { inputName: apiName|null } }
  let activeInstanceId = null; // instance currently open in the right panel
  let pendingInsertLineId = null; // if set, next snippet chosen inserts at this line instead of appending

  // --- DOM ---
  const navElements = document.getElementById("nav-elements");
  const navSnippets = document.getElementById("nav-snippets");
  const panelElements = document.getElementById("panel-elements");
  const panelSnippets = document.getElementById("panel-snippets");
  const snippetCardsList = document.getElementById("snippet-cards-list");
  const elItemSnippet = document.getElementById("el-item-snippet");

  const docContentArea = document.getElementById("doc-content-area");

  const rightPanel = document.getElementById("right-panel");
  const btnCloseRightPanel = document.getElementById("btn-close-right-panel");
  const spSnippetName = document.getElementById("sp-snippet-name");
  const spDataSource = document.getElementById("sp-data-source");
  const spMappingRows = document.getElementById("sp-mapping-rows");
  const spMappingProgress = document.getElementById("sp-mapping-progress");
  const btnSaveSnippet = document.getElementById("btn-save-snippet");
  const btnCancelSnippet = document.getElementById("btn-cancel-snippet");
  const btnDeleteSnippet = document.getElementById("btn-delete-snippet");

  const unpublishedBanner = document.getElementById("unpublished-banner");
  const btnUpdateTemplate = document.getElementById("btn-update-template");
  const toast = document.getElementById("toast");

  spDataSource.value = PRIMARY_SOURCE.label;

  // ================= SHARED SNIPPET-PICKER FLYOUT (portal) =================
  // Rendered once, appended to <body>, and repositioned with `position: fixed`
  // next to whichever "Snippet" row triggered it. This avoids being clipped by
  // the scrollable insert-menu list it would otherwise live inside.
  const globalSnippetFlyout = document.createElement("div");
  globalSnippetFlyout.className = "snippet-flyout";
  globalSnippetFlyout.innerHTML = `
    <div class="snippet-flyout-header">Choose a snippet</div>
    <div class="snippet-flyout-list">
      ${SNIPPETS.map(s => `
        <div class="snippet-flyout-item" data-snippet-id="${s.id}">
          <div class="snippet-flyout-item-title">${s.name}</div>
          <div class="snippet-flyout-item-desc">${s.description}</div>
        </div>
      `).join("")}
    </div>
  `;
  document.body.appendChild(globalSnippetFlyout);

  let flyoutTargetLineId = null;
  let flyoutHideTimer = null;

  function showSnippetFlyout(triggerEl, lineId) {
    clearTimeout(flyoutHideTimer);
    flyoutTargetLineId = lineId;
    const rect = triggerEl.getBoundingClientRect();
    globalSnippetFlyout.classList.add("open");

    const flyoutWidth = 260;
    const fitsRight = rect.right + 6 + flyoutWidth <= window.innerWidth;
    if (fitsRight) {
      globalSnippetFlyout.style.left = `${rect.right + 6}px`;
    } else {
      globalSnippetFlyout.style.left = `${Math.max(8, rect.left - flyoutWidth - 6)}px`;
    }
    const maxTop = window.innerHeight - globalSnippetFlyout.offsetHeight - 8;
    globalSnippetFlyout.style.top = `${Math.max(8, Math.min(rect.top, maxTop))}px`;
  }

  function scheduleHideSnippetFlyout() {
    flyoutHideTimer = setTimeout(() => globalSnippetFlyout.classList.remove("open"), 150);
  }

  globalSnippetFlyout.addEventListener("mouseenter", () => clearTimeout(flyoutHideTimer));
  globalSnippetFlyout.addEventListener("mouseleave", scheduleHideSnippetFlyout);

  globalSnippetFlyout.querySelectorAll(".snippet-flyout-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const snippetId = item.getAttribute("data-snippet-id");
      insertSnippet(snippetId, flyoutTargetLineId);
      globalSnippetFlyout.classList.remove("open");
      closeAllInsertMenus();
    });
  });

  // ================= LEFT ICON RAIL =================
  navElements.addEventListener("click", () => {
    navElements.classList.add("active");
    navSnippets.classList.remove("active", "snippets-active");
    panelElements.style.display = "flex";
    panelSnippets.style.display = "none";
  });

  navSnippets.addEventListener("click", () => {
    navSnippets.classList.add("active", "snippets-active");
    navElements.classList.remove("active");
    panelElements.style.display = "none";
    panelSnippets.style.display = "flex";
  });

  // Clicking "Snippet" inside the Elements list also jumps to the Snippets tray
  elItemSnippet.addEventListener("click", () => navSnippets.click());

  // ================= SNIPPETS TRAY (left panel cards) =================
  function renderSnippetCards() {
    snippetCardsList.innerHTML = "";
    SNIPPETS.forEach((snippet) => {
      const card = document.createElement("div");
      card.className = "snippet-card";
      card.innerHTML = `
        <div class="snippet-card-title-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
          <span>${snippet.name}</span>
        </div>
        <div class="snippet-card-desc">${snippet.description}</div>
        <div class="snippet-card-preview">${snippet.lines.join("\n")}</div>
        <div class="snippet-card-footer">
          <button class="snippet-add-btn" data-snippet-id="${snippet.id}">+ Add to template</button>
        </div>
      `;
      card.querySelector(".snippet-add-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        insertSnippet(snippet.id, null);
      });
      snippetCardsList.appendChild(card);
    });
  }
  renderSnippetCards();

  // ================= EMPTY LINE + "+" INSERT MENU =================
  // Every empty line in the doc offers a "+" (open element/snippet menu) and
  // a drag-handle affordance, matching the existing template editor pattern.
  function createEmptyLine() {
    const lineId = `line-${++instanceCounter}`;
    const line = document.createElement("div");
    line.className = "doc-empty-line";
    line.id = lineId;
    line.innerHTML = `
      <div class="line-controls">
        <button class="line-control-btn btn-add-line" title="Add element">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button class="line-control-btn" title="Drag to reorder">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="8" cy="6" r="1"></circle><circle cx="8" cy="12" r="1"></circle><circle cx="8" cy="18" r="1"></circle><circle cx="14" cy="6" r="1"></circle><circle cx="14" cy="12" r="1"></circle><circle cx="14" cy="18" r="1"></circle></svg>
        </button>
      </div>
      <div class="doc-line-box"></div>
      <div class="insert-menu">
        <div class="insert-menu-search"><input type="text" placeholder="Filter"></div>
        <div class="insert-menu-list">
          ${["Text", "Heading", "List", "Image", "Table", "Related Object", "Page Break"].map(name => `
            <div class="insert-menu-item"><div class="imi-left"><span class="el-icon" style="width:22px;height:22px;font-size:10px;">${name[0]}</span>${name}</div></div>
          `).join("")}
          <div class="insert-menu-item snippet-trigger" id="snippet-trigger-${lineId}">
            <div class="imi-left">
              <span class="el-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg></span>
              Snippet
            </div>
            <svg class="chevron-right" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
      </div>
    `;

    const insertMenu = line.querySelector(".insert-menu");
    const addBtn = line.querySelector(".btn-add-line");
    const snippetTrigger = line.querySelector(".snippet-trigger");

    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllInsertMenus();
      insertMenu.classList.add("open");
      line.classList.add("menu-open");
    });

    snippetTrigger.addEventListener("mouseenter", () => showSnippetFlyout(snippetTrigger, lineId));
    snippetTrigger.addEventListener("mouseleave", scheduleHideSnippetFlyout);
    snippetTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (globalSnippetFlyout.classList.contains("open") && flyoutTargetLineId === lineId) {
        globalSnippetFlyout.classList.remove("open");
      } else {
        showSnippetFlyout(snippetTrigger, lineId);
      }
    });

    return line;
  }

  function closeAllInsertMenus() {
    document.querySelectorAll(".insert-menu.open").forEach(m => m.classList.remove("open"));
    document.querySelectorAll(".doc-empty-line.menu-open").forEach(l => l.classList.remove("menu-open"));
    globalSnippetFlyout.classList.remove("open");
  }
  document.addEventListener("click", closeAllInsertMenus);

  // Seed the document with a couple of empty editable lines
  docContentArea.appendChild(createEmptyLine());
  docContentArea.appendChild(createEmptyLine());

  // ================= INSERT SNIPPET INTO CANVAS =================
  function insertSnippet(snippetId, atLineId) {
    const snippet = SNIPPETS.find(s => s.id === snippetId);
    if (!snippet) return;

    const instanceId = `snippet-${++instanceCounter}`;
    const mappings = {};
    snippet.inputs.forEach(input => { mappings[input.name] = null; });
    instances[instanceId] = { snippetId, mappings, resolved: false, replacedLine: !!atLineId };

    const block = renderSnippetBlock(instanceId);

    if (atLineId) {
      const targetLine = document.getElementById(atLineId);
      targetLine.replaceWith(block);
    } else {
      // Insert before the trailing empty lines so there's always room to add more after
      docContentArea.appendChild(block);
      docContentArea.appendChild(createEmptyLine());
    }

    openSnippetProperties(instanceId);
  }

  function renderSnippetBlock(instanceId) {
    const { snippetId, mappings, resolved } = instances[instanceId];
    const snippet = SNIPPETS.find(s => s.id === snippetId);

    const block = document.createElement("div");
    block.className = "snippet-block" + (resolved ? " resolved" : "");
    block.id = instanceId;

    const bodyHtml = snippet.lines.map(line => {
      const rendered = line.replace(/\{\{(.*?)\}\}/g, (match, inputName) => {
        const mappedApiName = mappings[inputName.trim()];
        if (mappedApiName) {
          const field = DEAL_FIELDS.find(f => f.apiName === mappedApiName);
          return `<span class="mapped-chip">{{!${PRIMARY_SOURCE.label}.${field ? field.apiName : mappedApiName}}}</span>`;
        }
        return `<span class="placeholder-chip">{{${inputName.trim()}}}</span>`;
      });
      return `<div class="snippet-line">${rendered}</div>`;
    }).join("");

    const unmappedCount = snippet.inputs.filter(i => !mappings[i.name]).length;

    block.innerHTML = `
      <div class="snippet-block-header">
        <div class="snippet-block-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
          ${snippet.name}
        </div>
        <div class="snippet-block-actions">
          <button class="btn-edit-snippet" title="Edit mapping">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"></path></svg>
          </button>
          <button class="btn-remove-snippet" title="Remove snippet">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="snippet-block-body">${bodyHtml}</div>
      ${!resolved && unmappedCount > 0 ? `<div class="unresolved-pill-note">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        ${unmappedCount} input${unmappedCount > 1 ? "s" : ""} need${unmappedCount === 1 ? "s" : ""} mapping
      </div>` : ""}
    `;

    block.addEventListener("click", (e) => {
      if (e.target.closest(".btn-remove-snippet")) {
        e.stopPropagation();
        removeSnippetInstance(instanceId);
        return;
      }
      if (e.target.closest(".btn-edit-snippet") || !resolved) {
        e.stopPropagation();
        openSnippetProperties(instanceId);
      }
    });

    return block;
  }

  function removeSnippetInstance(instanceId) {
    const el = document.getElementById(instanceId);
    const shouldRestoreLine = instances[instanceId] && instances[instanceId].replacedLine;
    if (el) {
      if (shouldRestoreLine) {
        el.replaceWith(createEmptyLine());
      } else {
        el.remove();
      }
    }
    delete instances[instanceId];
    if (activeInstanceId === instanceId) closeRightPanel();
    showToast("Snippet removed from template.");
  }

  // ================= RIGHT PANEL: SNIPPET PROPERTIES =================
  function openSnippetProperties(instanceId) {
    activeInstanceId = instanceId;
    const { snippetId, mappings } = instances[instanceId];
    const snippet = SNIPPETS.find(s => s.id === snippetId);

    spSnippetName.value = snippet.name;
    spDataSource.value = PRIMARY_SOURCE.label;

    spMappingRows.innerHTML = "";
    snippet.inputs.forEach(input => {
      const row = document.createElement("div");
      row.className = "mapping-row";
      row.innerHTML = `
        <div class="mapping-row-label">
          <span>${input.name}</span>
          ${input.required ? '<span class="req-asterisk" title="Required">*</span>' : ''}
          <span class="mapping-row-token">{{${input.name}}}</span>
        </div>
        <div class="typeahead-container">
          <input type="text" class="typeahead-input" placeholder="Search ${PRIMARY_SOURCE.label} fields..." data-input-name="${input.name}">
          <div class="typeahead-list"></div>
        </div>
      `;
      const typeaheadInput = row.querySelector(".typeahead-input");
      const typeaheadList = row.querySelector(".typeahead-list");

      const existingApiName = mappings[input.name];
      if (existingApiName) {
        const field = DEAL_FIELDS.find(f => f.apiName === existingApiName);
        typeaheadInput.value = field ? field.label : existingApiName;
        typeaheadInput.classList.add("mapped");
        typeaheadInput.setAttribute("data-api-name", existingApiName);
      }

      setupTypeahead(typeaheadInput, typeaheadList, input.name);
      spMappingRows.appendChild(row);
    });

    updateMappingProgressAndSaveState();
    rightPanel.classList.add("open");
  }

  function setupTypeahead(inputEl, listEl, inputName) {
    const populate = (filterText = "") => {
      listEl.innerHTML = "";
      const filtered = DEAL_FIELDS.filter(f =>
        f.label.toLowerCase().includes(filterText.toLowerCase()) ||
        f.apiName.toLowerCase().includes(filterText.toLowerCase())
      );
      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "typeahead-item";
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
            <span class="field-type-icon icon-${field.type}">${iconChar}</span>
            <span>${field.label}</span>
          </span>
          <span class="typeahead-item-api">${field.apiName}</span>
        `;
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          inputEl.value = field.label;
          inputEl.setAttribute("data-api-name", field.apiName);
          inputEl.classList.add("mapped");
          listEl.classList.remove("open");
          instances[activeInstanceId].mappings[inputName] = field.apiName;
          updateMappingProgressAndSaveState();
        });
        listEl.appendChild(item);
      });
    };

    inputEl.addEventListener("focus", () => {
      populate("");
      listEl.classList.add("open");
    });
    inputEl.addEventListener("blur", () => {
      setTimeout(() => listEl.classList.remove("open"), 150);
    });
    inputEl.addEventListener("input", () => {
      inputEl.classList.remove("mapped");
      inputEl.removeAttribute("data-api-name");
      instances[activeInstanceId].mappings[inputName] = null;
      populate(inputEl.value);
      listEl.classList.add("open");
      updateMappingProgressAndSaveState();
    });
  }

  function updateMappingProgressAndSaveState() {
    if (!activeInstanceId) return;
    const { snippetId, mappings } = instances[activeInstanceId];
    const snippet = SNIPPETS.find(s => s.id === snippetId);
    const total = snippet.inputs.length;
    const mappedCount = snippet.inputs.filter(i => !!mappings[i.name]).length;
    spMappingProgress.textContent = `${mappedCount} / ${total} mapped`;

    const allRequiredMapped = snippet.inputs.every(i => !i.required || !!mappings[i.name]);
    btnSaveSnippet.disabled = !allRequiredMapped;
  }

  btnSaveSnippet.addEventListener("click", () => {
    if (!activeInstanceId) return;
    instances[activeInstanceId].resolved = true;
    const snippet = SNIPPETS.find(s => s.id === instances[activeInstanceId].snippetId);

    const oldBlock = document.getElementById(activeInstanceId);
    const newBlock = renderSnippetBlock(activeInstanceId);
    oldBlock.replaceWith(newBlock);

    showToast(`${snippet.name} added to template.`);
    closeRightPanel();
    unpublishedBanner.style.display = "block";
  });

  btnCancelSnippet.addEventListener("click", () => {
    if (activeInstanceId && !instances[activeInstanceId].resolved) {
      // Never-saved block cancelled entirely -> remove it
      removeSnippetInstance(activeInstanceId);
    } else {
      closeRightPanel();
    }
  });

  btnDeleteSnippet.addEventListener("click", () => {
    if (activeInstanceId) removeSnippetInstance(activeInstanceId);
  });

  btnCloseRightPanel.addEventListener("click", () => {
    if (activeInstanceId && !instances[activeInstanceId].resolved) {
      removeSnippetInstance(activeInstanceId);
    } else {
      closeRightPanel();
    }
  });

  function closeRightPanel() {
    rightPanel.classList.remove("open");
    activeInstanceId = null;
  }

  // ================= HEADER ACTIONS =================
  btnUpdateTemplate.addEventListener("click", () => {
    unpublishedBanner.style.display = "none";
    showToast("Template updated and published.");
  });

  // ================= TOAST =================
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

}

// Some preview harnesses execute this script after DOMContentLoaded has
// already fired, so fall back to running immediately when the DOM is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSnippetLibrary);
} else {
  initSnippetLibrary();
}
