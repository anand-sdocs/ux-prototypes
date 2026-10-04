

(function (global) {
  'use strict';

  

  var WIRED = '__sdFormsWired';

  
  

  function uid(prefix) {
    uid.n = (uid.n || 0) + 1;
    return prefix + '-' + uid.n + '-' + Math.random().toString(36).slice(2, 7);
  }

  function tokens(value) {
    return (value || '').split(/\s+/).filter(Boolean);
  }

  function addToken(el, attr, token) {
    var list = tokens(el.getAttribute(attr));
    if (list.indexOf(token) === -1) list.push(token);
    el.setAttribute(attr, list.join(' '));
  }

  
  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  
  function closestOf(node, selector) {
    return node && node.closest ? node.closest(selector) : null;
  }

  
  function docOf(node) {
    return (node && node.ownerDocument) || document;
  }

  
  function icon(doc, name, className) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sd-icon ' + className);
    svg.setAttribute('aria-hidden', 'true');
    var use = doc.createElementNS(NS, 'use');
    use.setAttribute('href', '#sd-icon-' + name);
    svg.appendChild(use);
    return svg;
  }

  
  

  
  function rovingStep(count, i, key, axis) {
    if (!count) return -1;
    var across = axis !== 'vertical';
    var down = axis !== 'horizontal';
    if ((across && key === 'ArrowRight') || (down && key === 'ArrowDown')) return i < 0 ? 0 : (i + 1) % count;
    if ((across && key === 'ArrowLeft') || (down && key === 'ArrowUp')) return i < 0 ? count - 1 : (i - 1 + count) % count;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return -1;
  }

  
  function rove(items, stop) {
    for (var k = 0; k < items.length; k++) items[k].tabIndex = items[k] === stop ? 0 : -1;
  }

  

  

  
  function syncIndeterminate(root) {
    var boxes = root.querySelectorAll('input[type="checkbox"][data-indeterminate]');
    each(boxes, function (box) {
      var want = box.getAttribute('data-indeterminate');
      box.indeterminate = want !== 'false';
    });
  }

  
  function setIndeterminate(checkbox, on) {
    if (!checkbox) return;
    var value = on !== false;
    checkbox.indeterminate = value;
    if (value) checkbox.setAttribute('data-indeterminate', '');
    else checkbox.removeAttribute('data-indeterminate');
  }

  

  
  var FIELD_CONTROLS = '.sd-field__control input, .sd-field__control select, .sd-field__control textarea';
  var FIELD_COLOR = '.sd-field__control > input[type="color"]';
  var FIELD_STEPPER = '.sd-field__affix--stepper';

  
  function fieldOf(control) {
    return closestOf(control, '.sd-field');
  }

  
  function hintOf(control) {
    var field = fieldOf(control);
    return field ? field.querySelector('.sd-field__hint') : null;
  }

  function hintTextOf(hint) {
    if (!hint) return null;
    return hint.querySelector('.sd-field__hint-text') || hint;
  }

  
  function wireDescription(control) {
    var hint = hintOf(control);
    if (!hint) return;
    if (!hint.id) hint.id = uid('sd-hint');
    addToken(control, 'aria-describedby', hint.id);
  }

  
  function setError(control, message) {
    if (!control) return;
    control.setAttribute('aria-invalid', 'true');

    var hint = hintOf(control);
    if (!hint) return;
    if (!hint.id) hint.id = uid('sd-hint');
    addToken(control, 'aria-describedby', hint.id);

    var text = hintTextOf(hint);
    if (typeof message === 'string' && message.length) {
      if (!hint.hasAttribute('data-helper')) {
        hint.setAttribute('data-helper', text.textContent);
      }
      text.textContent = message;
    }
    
    
    hint.setAttribute('role', 'alert');
  }

  
  function clearError(control) {
    if (!control) return;
    control.removeAttribute('aria-invalid');

    var hint = hintOf(control);
    if (!hint) return;
    hint.removeAttribute('role');

    if (hint.hasAttribute('data-helper')) {
      hintTextOf(hint).textContent = hint.getAttribute('data-helper');
      hint.removeAttribute('data-helper');
    }
  }

  
  function validate(control) {
    if (!control || typeof control.checkValidity !== 'function') return true;
    if (control.checkValidity()) {
      clearError(control);
      return true;
    }
    setError(control, control.validationMessage);
    return false;
  }

  
  function wireForm(form) {
    if (form[WIRED]) return;
    form[WIRED] = true;
    form.setAttribute('novalidate', '');

    form.addEventListener('blur', function (e) {
      if (e.target.matches('.sd-field__control :where(input, select, textarea)')) validate(e.target);
    }, true);

    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') validate(e.target);
    });

    form.addEventListener('submit', function (e) {
      var controls = form.querySelectorAll('.sd-field__control input, .sd-field__control select, .sd-field__control textarea');
      var firstBad = null;
      each(controls, function (c) {
        if (!validate(c) && !firstBad) firstBad = c;
      });
      if (firstBad) {
        e.preventDefault();
        firstBad.focus();
      }
    });
  }

  

  var SUPPORTS_FIELD_SIZING =
    typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content');

  function grow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  function wireAutogrow(textarea) {
    if (textarea[WIRED]) return;
    textarea[WIRED] = true;
    var control = textarea.closest('.sd-field__control');
    if (control) control.style.height = 'auto';
    if (SUPPORTS_FIELD_SIZING) {
      textarea.style.fieldSizing = 'content';
      return;
    }
    grow(textarea);
    textarea.addEventListener('input', function () { grow(textarea); });
  }

  

  
  function wireColor(input) {
    if (input[WIRED]) return;
    input[WIRED] = true;
    var control = input.closest('.sd-field__control');
    var out = control && control.querySelector('output');
    if (!out) return;
    var show = function () { out.value = input.value.toUpperCase(); };
    input.addEventListener('input', show);
    input.addEventListener('change', show);
  }

  

  
  function wireStepper(button) {
    if (button[WIRED]) return;
    button[WIRED] = true;
    var control = button.closest('.sd-field__control');
    var input = control && control.querySelector('input[type="number"]');
    if (!input) return;

    button.addEventListener('mousedown', function (e) { e.preventDefault(); });
    button.addEventListener('click', function (e) {
      if (input.disabled || input.readOnly) return;
      var box = button.getBoundingClientRect();
      var up = (e.clientY - box.top) < box.height / 2;
      try {
        if (up) input.stepUp(); else input.stepDown();
      } catch (err) {
        return;   
      }
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  

  
  

  var SELECT_MENU = '.sd-select-menu';
  var SELECT_MENU_FACE = '.sd-select-menu__face';
  var SELECT_MENU_OPTION = '.sd-select-menu-options';
  var SELECT_MENU_OPTION_INPUT = '.sd-select-menu-options__input';
  var SELECT_MENU_OPTION_LABEL = '.sd-select-menu-options__label';
  var SELECT_MENU_SEARCH = '.sd-select-menu__search-input';
  var SELECT_MENU_OPENED_WITH = '__sdSelectMenuOpenedWith';
  var DISMISS_WIRED = '__sdSelectMenuDismissWired';

  
  function selectMenuSteps(details) {
    return Array.prototype.filter.call(details.querySelectorAll(SELECT_MENU_OPTION_INPUT), function (input) {
      var option = input.closest(SELECT_MENU_OPTION);
      return !input.disabled && !(option && option.hidden);
    });
  }

  function selectMenuChecked(details) {
    return details.querySelector(SELECT_MENU_OPTION_INPUT + ':checked');
  }

  
  function selectMenuCheck(input) {
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  
  function selectMenuSyncFace(details) {
    var face = details.querySelector(SELECT_MENU_FACE);
    var input = selectMenuChecked(details);
    var option = input && input.closest(SELECT_MENU_OPTION);
    var text = option && option.querySelector(SELECT_MENU_OPTION_LABEL);
    if (face && text) face.textContent = text.textContent;
  }

  function selectMenuSyncExpanded(details) {
    var face = details.querySelector(SELECT_MENU_FACE);
    if (face) face.setAttribute('aria-expanded', details.hasAttribute('open') ? 'true' : 'false');
  }

  
  function selectMenuRemember(details) {
    if (details[SELECT_MENU_OPENED_WITH] === undefined) {
      details[SELECT_MENU_OPENED_WITH] = selectMenuChecked(details);
    }
  }

  function selectMenuClose(details) {
    details[SELECT_MENU_OPENED_WITH] = undefined;
    if (!details.hasAttribute('open')) return;
    details.removeAttribute('open');
    selectMenuSyncExpanded(details);
  }

  
  function selectMenuCommit(details, refocus) {
    selectMenuSyncFace(details);
    selectMenuClose(details);
    var face = details.querySelector(SELECT_MENU_FACE);
    if (refocus && face) face.focus();
  }

  
  function selectMenuRevert(details) {
    var was = details[SELECT_MENU_OPENED_WITH];
    if (was && details.contains(was)) selectMenuCheck(was);
    selectMenuCommit(details, true);
  }

  
  function selectMenuFocusChecked(details) {
    var steps = selectMenuSteps(details);
    var input = selectMenuChecked(details);
    if (!input || steps.indexOf(input) === -1) input = steps[0];
    if (input) input.focus();
  }

  
  function selectMenuFilter(details, query) {
    var q = (query || '').trim().toLowerCase();
    each(details.querySelectorAll(SELECT_MENU_OPTION), function (option) {
      var text = option.querySelector(SELECT_MENU_OPTION_LABEL);
      var hit = !q || (text && text.textContent.toLowerCase().indexOf(q) !== -1);
      if (hit) option.removeAttribute('hidden');
      else option.setAttribute('hidden', '');
    });
  }

  var SELECT_MENU_STEP = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

  function wireSelectMenu(details) {
    if (details[WIRED]) return;
    details[WIRED] = true;
    var face = details.querySelector(SELECT_MENU_FACE);
    selectMenuSyncExpanded(details);

    
    details.addEventListener('toggle', function () {
      selectMenuSyncExpanded(details);
      if (details.hasAttribute('open')) selectMenuRemember(details);
      else { selectMenuSyncFace(details); details[SELECT_MENU_OPENED_WITH] = undefined; }
    });

    
    details.addEventListener('click', function (e) {
      if (!e.target.matches(SELECT_MENU_OPTION_INPUT)) return;
      selectMenuCommit(details, true);
    });

    details.addEventListener('keydown', function (e) {
      var open = details.hasAttribute('open');

      if (e.key === 'Escape') {
        if (!open || e.defaultPrevented) return;
        e.preventDefault();
        selectMenuRevert(details);
        return;
      }

      
      if (e.target === face && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        if (!open) {
          selectMenuRemember(details);
          details.setAttribute('open', '');
          selectMenuSyncExpanded(details);
        }
        selectMenuFocusChecked(details);
        return;
      }

      if (!e.target.matches(SELECT_MENU_OPTION_INPUT)) return;

      
      var step = SELECT_MENU_STEP[e.key];
      if (step || e.key === 'Home' || e.key === 'End') {
        var steps = selectMenuSteps(details);
        if (!steps.length) return;
        e.preventDefault();
        var i = steps.indexOf(e.target);
        var next = e.key === 'Home' ? steps[0]
          : e.key === 'End' ? steps[steps.length - 1]
          : steps[(i + step + steps.length) % steps.length];
        selectMenuCheck(next);
        next.focus();
        return;
      }

      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectMenuCheck(e.target);
        selectMenuCommit(details, true);
      }
    });

    
    details.addEventListener('focusout', function (e) {
      if (!details.hasAttribute('open')) return;
      var to = e.relatedTarget;
      if (to && !details.contains(to)) selectMenuCommit(details, false);
    });

    var search = details.querySelector(SELECT_MENU_SEARCH);
    if (search) {
      search.addEventListener('input', function () { selectMenuFilter(details, search.value); });
    }
  }

  
  function wireSelectMenuDismiss(doc) {
    if (doc[DISMISS_WIRED]) return;
    doc[DISMISS_WIRED] = true;
    doc.addEventListener('pointerdown', function (e) {
      each(doc.querySelectorAll(SELECT_MENU + '[open]'), function (details) {
        if (!details.contains(e.target)) selectMenuCommit(details, false);
      });
    });
  }

  

  
  

  var TOOLBAR = '.sd-toolbar';
  var TB_WIRED = '__sdToolbarWired';
  var TB_CONTROL = 'button, summary, a[href], input, select, textarea';

  
  function onToolbarItself(el, bar) {
    var box = el.closest('details');
    if (!box || !bar.contains(box)) return true;
    if (el.tagName !== 'SUMMARY' || el.parentElement !== box) return false;
    var outer = box.parentElement ? box.parentElement.closest('details') : null;
    return !outer || !bar.contains(outer);
  }

  
  function toolbarItems(bar) {
    return Array.prototype.filter.call(bar.querySelectorAll(TB_CONTROL), function (el) {
      return !el.disabled && onToolbarItself(el, bar);
    });
  }

  function typesText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName !== 'INPUT') return false;
    return !/^(button|checkbox|radio|submit|reset|image|color|range)$/.test(el.type);
  }

  function wireToolbar(bar) {
    if (!bar || bar[TB_WIRED]) return;
    bar[TB_WIRED] = true;

    var items = toolbarItems(bar);
    if (items.length) rove(items, items[0]);

    bar.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var list = toolbarItems(bar);
      var i = list.indexOf(e.target);
      if (i < 0 || typesText(e.target)) return;
      var at = rovingStep(list.length, i, e.key, 'horizontal');
      if (at < 0) return;
      e.preventDefault();
      rove(list, list[at]);
      list[at].focus();
    });

    
    bar.addEventListener('focusin', function (e) {
      var list = toolbarItems(bar);
      if (list.indexOf(e.target) >= 0) rove(list, e.target);
    });
  }

  

  
  

  var TOOLBAR_MENU = '.sd-toolbar-menu';
  var TM_TRIGGER = '.sd-toolbar-menu__trigger';
  var TM_SURFACE = '.sd-toolbar-menu__surface';
  var TM_WIRED = '__sdToolbarMenuWired';
  var TM_OPENED = '__sdToolbarMenuOpened';

  
  var TM_FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), ' +
    'select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

  function toolbarMenuOf(node) {
    return closestOf(node, TOOLBAR_MENU);
  }

  function toolbarMenuTrigger(menu) {
    return menu && menu.querySelector ? menu.querySelector(TM_TRIGGER) : null;
  }

  
  function openToolbarMenus(doc) {
    if (!doc || !doc.querySelectorAll) return [];
    return Array.prototype.filter.call(
      doc.querySelectorAll(TOOLBAR_MENU + '[open]'),
      function (menu) { return menu[TM_OPENED] === true; }
    );
  }

  
  function closeToolbarMenu(menu, refocus) {
    if (!menu || !menu.hasAttribute || !menu.hasAttribute('open')) return false;
    menu.removeAttribute('open');
    menu[TM_OPENED] = false;
    var trigger = refocus ? toolbarMenuTrigger(menu) : null;
    if (trigger && trigger.focus) trigger.focus();
    return true;
  }

  
  function closeToolbarMenus(doc, keep, refocus) {
    var active = doc && doc.activeElement;
    var loose = !active || active === doc.body || active === doc.documentElement;
    var closed = [];
    openToolbarMenus(doc).forEach(function (menu) {
      if (menu === keep) return;
      var held = refocus && (loose || (menu.contains && menu.contains(active)));
      if (closeToolbarMenu(menu, held)) closed.push(menu);
    });
    return closed;
  }

  function toolbarMenuClick(e) {
    var doc = docOf(e.target);
    closeToolbarMenus(doc, toolbarMenuOf(e.target), false);
  }

  function toolbarMenuKeydown(e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    
    if (e.defaultPrevented) return;
    var doc = docOf(e.target);
    
    if (closeToolbarMenus(doc, null, true).length) e.preventDefault();
  }

  
  function focusedVisibly(node) {
    if (!node || !node.matches) return false;
    try { return node.matches(':focus-visible'); } catch (err) { return false; }
  }

  
  function focusWhenDrawn(el, tries, from) {
    if (!el || !el.focus) return;
    var doc = el.ownerDocument;
    if (from === undefined) from = doc.activeElement;
    else if (doc.activeElement !== from) return;
    el.focus();
    if (doc.activeElement === el) return;
    tries = tries === undefined ? 4 : tries;
    var win = doc.defaultView;
    if (tries > 0 && win && win.requestAnimationFrame) {
      win.requestAnimationFrame(function () { focusWhenDrawn(el, tries - 1, from); });
    }
  }

  function toolbarMenuToggle(e) {
    var menu = e.target;
    if (!menu || !menu.classList || !menu.classList.contains('sd-toolbar-menu')) return;
    if (!menu.hasAttribute('open')) { menu[TM_OPENED] = false; return; }
    menu[TM_OPENED] = true;
    if (!focusedVisibly(toolbarMenuTrigger(menu))) return;
    var surface = menu.querySelector(TM_SURFACE);
    focusWhenDrawn(surface && surface.querySelector(TM_FOCUSABLE));
  }

  function typesIntoText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName !== 'INPUT') return false;
    return !/^(button|checkbox|radio|submit|reset|image|color|range)$/.test(el.type);
  }

  
  function surfaceControls(surface) {
    return Array.prototype.filter.call(surface.querySelectorAll(TM_FOCUSABLE), function (el) {
      return el.getClientRects().length > 0;
    });
  }

  function toolbarMenuArrows(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var target = e.target;
    if (!target || !target.closest) return;

    
    var trigger = target.closest(TM_TRIGGER);
    if (trigger) {
      if (e.key !== 'ArrowDown') return;
      var menu = toolbarMenuOf(trigger);
      if (!menu) return;
      e.preventDefault();
      if (!menu.hasAttribute('open')) {
        menu.open = true;
        menu[TM_OPENED] = true;
      }
      var inside = menu.querySelector(TM_SURFACE);
      focusWhenDrawn(inside ? surfaceControls(inside)[0] : null);
      return;
    }

    var surface = target.closest(TM_SURFACE);
    if (!surface || typesIntoText(target) || target.closest('[role="menu"]')) return;
    
    var list = surfaceControls(surface).filter(function (el) { return !typesIntoText(el); });
    var at = rovingStep(list.length, list.indexOf(target), e.key, 'both');
    if (at < 0) return;
    e.preventDefault();
    list[at].focus();
  }

  
  function toolbarMenuFocusin(e) {
    closeToolbarMenus(e.target.ownerDocument || document, toolbarMenuOf(e.target), false);
  }

  function wireToolbarMenus(doc) {
    if (!doc || doc[TM_WIRED] || !doc.addEventListener) return;
    doc[TM_WIRED] = true;
    doc.addEventListener('click', toolbarMenuClick);
    doc.addEventListener('keydown', toolbarMenuKeydown);
    doc.addEventListener('keydown', toolbarMenuArrows);
    doc.addEventListener('focusin', toolbarMenuFocusin);
    doc.addEventListener('toggle', toolbarMenuToggle, true);
  }

  

  
  

  
  var DOC_STACK = '.sd-editor-canvas__documents';
  var SHEET = '.sd-editor-document';

  
  var FLOWED = 'data-sd-flowed';

  var FLOW_WIRED = '__sdFlowWired';

  
  var FLOW_GUARD = 500;

  
  var FLOW_SLACK = 1;

  function isSheet(el) {
    return !!(el && el.matches && el.matches(SHEET));
  }

  function isFlowed(el) {
    return isSheet(el) && el.hasAttribute(FLOWED);
  }

  
  function isFlowingSheet(el) {
    return isSheet(el) && el.getAttribute('data-sd-doc') === 'flowing';
  }

  
  function authorSheets(stack) {
    var out = [];
    for (var n = stack.firstElementChild; n; n = n.nextElementSibling) {
      if (isFlowingSheet(n) && !isFlowed(n)) out.push(n);
    }
    return out;
  }

  
  function collapseFlow(sheet) {
    var next = sheet.nextElementSibling;
    while (isFlowed(next)) {
      var after = next.nextElementSibling;
      while (next.firstChild) sheet.appendChild(next.firstChild);
      next.parentNode.removeChild(next);
      next = after;
    }
  }

  
  var NOT_COPIED = ['id', 'data-sd-skip-target', 'tabindex', 'data-sd-dropping'];

  function addSheet(after) {
    var sheet = after.cloneNode(false);
    NOT_COPIED.forEach(function (name) { sheet.removeAttribute(name); });
    sheet.setAttribute(FLOWED, '');
    after.parentNode.insertBefore(sheet, after.nextSibling);
    return sheet;
  }

  
  function pageHeightOf(sheet) {
    var win = sheet.ownerDocument.defaultView;
    var h = parseFloat(win.getComputedStyle(sheet).minHeight);
    return Number.isFinite(h) && h > 0 ? h : sheet.offsetHeight;
  }

  
  function overflowOf(sheet) {
    return sheet.offsetHeight - pageHeightOf(sheet);
  }

  
  var HEADING = /^H[1-6]$/;

  
  function keepHeadingWithNext(sheet) {
    var next = sheet.nextElementSibling;
    if (!isFlowed(next)) return;
    var guard = 0;
    while (guard++ < FLOW_GUARD
           && sheet.children.length > 1
           && HEADING.test(sheet.lastElementChild.tagName)) {
      next.insertBefore(sheet.lastElementChild, next.firstChild);
    }
  }

  
  function flowSheet(sheet) {
    var cur = sheet;
    var guard = 0;
    while (guard++ < FLOW_GUARD) {
      if (overflowOf(cur) <= FLOW_SLACK) {
        
        keepHeadingWithNext(cur);
        
        if (isFlowed(cur.nextElementSibling)) { cur = cur.nextElementSibling; continue; }
        return;
      }
      
      if (cur.children.length < 2) return;
      var next = isFlowed(cur.nextElementSibling) ? cur.nextElementSibling : addSheet(cur);
      next.insertBefore(cur.lastElementChild, next.firstChild);
    }
  }

  
  function flowStack(stack) {
    var doc = stack.ownerDocument;
    var had = doc.activeElement;
    var sheets = authorSheets(stack);
    var i;
    for (i = 0; i < sheets.length; i++) collapseFlow(sheets[i]);
    for (i = 0; i < sheets.length; i++) flowSheet(sheets[i]);
    if (had && had !== doc.activeElement && had.focus && stack.contains(had)) {
      had.focus({ preventScroll: true });
    }
  }

  
  function stackOverflows(stack) {
    for (var n = stack.firstElementChild; n; n = n.nextElementSibling) {
      if (isFlowingSheet(n) && n.children.length > 1 && overflowOf(n) > FLOW_SLACK) return true;
    }
    return false;
  }

  
  function wireDocumentFlow(stack) {
    wireDocumentScale(stack);
    if (stack[FLOW_WIRED]) { flowStack(stack); return; }
    stack[FLOW_WIRED] = true;

    flowStack(stack);

    var doc = stack.ownerDocument;
    var win = doc.defaultView;
    if (win && typeof win.MutationObserver === 'function') {
      var queued = false;
      var check = function () {
        queued = false;
        if (gestureLive()) { afterGesture(check); return; }
        if (stackOverflows(stack)) flowStack(stack);
      };
      new win.MutationObserver(function () {
        if (queued) return;
        queued = true;
        (win.requestAnimationFrame || win.setTimeout)(check);
      }).observe(stack, { childList: true, subtree: true, characterData: true });
    }

    if (doc && doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function') {
      doc.fonts.ready.then(function () { flowStack(stack); });
    }
  }

  
  

  var SCALE_VAR = '--sd-doc-scale';
  var SCALE_WIRED = '__sdScaleWired';
  var SCALE_NOW = '__sdScale';
  var SCALE_MODE = '__sdScaleMode';
  var FIT_MAX = 1;
  var FIT_MIN = 0.5;

  
  function fitScale(room, page) {
    if (!(page > 0) || !Number.isFinite(room)) return 1;
    return Math.max(FIT_MIN, Math.min(FIT_MAX, room / page));
  }

  
  function parseZoom(value) {
    if (value === 'fit') return 'fit';
    var n = parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : 'fit';
  }

  function firstSheet(stack) {
    for (var n = stack.firstElementChild; n; n = n.nextElementSibling) {
      if (isSheet(n)) return n;
    }
    return null;
  }

  
  function roomOf(stack) {
    var cs = stack.ownerDocument.defaultView.getComputedStyle(stack);
    return stack.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  }

  function zoomControlOf(stack) {
    var canvas = stack.closest ? stack.closest('.sd-editor-canvas') : null;
    return canvas ? canvas.querySelector('[data-sd-zoom]') : null;
  }

  
  function paintZoom(stack, fit) {
    var control = zoomControlOf(stack);
    if (!control) return;
    var opt = control.querySelector('option[value="fit"]');
    if (opt) opt.textContent = 'Fit (' + Math.round(fit * 100) + '%)';
  }

  
  function setScale(stack, s) {
    var old = stack[SCALE_NOW] || 1;
    if (Math.abs(old - s) < 0.0005 && stack[SCALE_NOW]) return;

    
    var top = stack.getBoundingClientRect().top;
    var anchor = null;
    var within = 0;
    for (var n = stack.firstElementChild; n; n = n.nextElementSibling) {
      if (!isSheet(n)) continue;
      var r = n.getBoundingClientRect();
      if (!anchor || r.top <= top) { anchor = n; within = (top - r.top) / old; }
      if (r.top > top) break;
    }
    var left = stack.scrollLeft / old;

    stack[SCALE_NOW] = s;
    stack.style.setProperty(SCALE_VAR, String(s));

    
    if (anchor && within >= 0) {
      var now = anchor.getBoundingClientRect().top;
      stack.scrollTop += (now - top) + within * s;
    }
    if (left) stack.scrollLeft = left * s;

    
    rescaled(stack);
  }

  
  function fitStack(stack) {
    if (!stack.isConnected) return;
    if (gestureLive()) {
      if (!stack.__sdFitQueued) {
        stack.__sdFitQueued = true;
        afterGesture(function () { stack.__sdFitQueued = false; fitStack(stack); });
      }
      return;
    }
    var sheet = firstSheet(stack);
    if (!sheet) return;
    var fit = fitScale(roomOf(stack), sheet.offsetWidth);
    paintZoom(stack, fit);
    var mode = stack[SCALE_MODE] || 'fit';
    setScale(stack, mode === 'fit' ? fit : mode);
  }

  function wireDocumentScale(stack) {
    if (stack[SCALE_WIRED]) { fitStack(stack); return; }
    stack[SCALE_WIRED] = true;

    var control = zoomControlOf(stack);
    if (control) {
      control.addEventListener('change', function () {
        stack[SCALE_MODE] = parseZoom(control.value);
        fitStack(stack);
      });
      stack[SCALE_MODE] = parseZoom(control.value);
    }

    fitStack(stack);

    var win = stack.ownerDocument.defaultView;
    if (win && typeof win.ResizeObserver === 'function') {
      new win.ResizeObserver(function () { fitStack(stack); }).observe(stack);
    }
  }

  

  
  

  var SIDE = '.sd-editor-shell__side';
  var SIDE_STATE = 'data-sd-side';

  
  function sideOf(el) {
    return el && el.closest ? el.closest(SIDE) : null;
  }

  
  function showSide(el, open, back) {
    var side = sideOf(el);
    if (!side) return false;
    afterGesture(function () { setSide(side, open, back); });
    return true;
  }

  
  function sideOpen(side) {
    return side.getAttribute(SIDE_STATE) !== 'closed';
  }

  
  function writeSideNow(side, state) {
    side.style.transition = 'none';
    side.setAttribute(SIDE_STATE, state);
    void side.offsetWidth;
    side.style.transition = '';
    if (!side.getAttribute('style')) side.removeAttribute('style');
  }

  
  function sideBeside(side) {
    var row = side.parentElement;
    if (!row || !row.ownerDocument.defaultView) return false;
    return row.ownerDocument.defaultView.getComputedStyle(row).display !== 'grid';
  }

  function setSide(side, open, back) {
    if (sideOpen(side) === open && side.hasAttribute(SIDE_STATE)) return;
    var doc = side.ownerDocument;
    var had = doc.activeElement;
    if (open) {
      
      writeSideNow(side, 'open');
      if (sideBeside(side)) {
        writeSideNow(side, 'closed');
        side.setAttribute(SIDE_STATE, 'open');
      }
    } else {
      if (sideBeside(side)) side.setAttribute(SIDE_STATE, 'closed');
      else writeSideNow(side, 'closed');
      if (had && side.contains(had) && back && back.focus) {
        back.focus({ preventScroll: true });
      }
    }
  }

  
  function settleSide(side) {
    var panel = side.matches(PROPS_PANEL) ? side : side.querySelector(PROPS_PANEL);
    if (!panel) return;
    var want = panel.hasAttribute('data-sd-selection') ? 'open' : 'closed';
    if (side.getAttribute(SIDE_STATE) !== want) writeSideNow(side, want);
  }

  function settleSides(root) {
    if (root.matches && root.matches(SIDE)) settleSide(root);
    each(root.querySelectorAll(SIDE), settleSide);
  }

  

  
  

  var PANEL = '.sd-insert-panel';
  var ROW = '.sd-objects-menu-item';
  var FOLDER_EMPTY = 'sd-insert-panel__folder-empty';

  
  var RAIL_BUTTON = 'button[data-sd-open]';
  var FILTER_CHIP = '[data-sd-filter]';
  var SECTION_HEADER = '.sd-insert-panel__group > [aria-expanded]';
  var SEARCH_INPUT = 'input[type="search"]';

  
  function insertPanelMatch(label, type, query, filter) {
    var q = String(query == null ? '' : query).trim().toLowerCase();
    if (q && String(label == null ? '' : label).toLowerCase().indexOf(q) === -1) return false;
    if (filter && filter !== 'all' && String(type || '') !== filter) return false;
    return true;
  }

  function panelState(panel) {
    if (!panel.__sdPanel) panel.__sdPanel = { query: '', filter: 'all' };
    return panel.__sdPanel;
  }

  function railButtons(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll(RAIL_BUTTON));
  }

  function regionOf(panel) {
    return panel.querySelector('.sd-insert-panel__panel');
  }

  

  
  function openInsertPanel(panel, name) {
    if (!panel || !name) return;
    var template = panel.querySelector('template[data-sd-pane="' + name + '"]');
    var region = regionOf(panel);
    if (!template || !region) return;

    if (panel.getAttribute('data-sd-panel') === name) return;

    var state = panelState(panel);
    state.query = '';
    state.filter = 'all';
    state.filterLabel = '';

    disarmWithin(region);
    region.replaceChildren(template.content.cloneNode(true));
    panel.setAttribute('data-sd-panel', name);

    railButtons(panel).forEach(function (button) {
      var mine = button.getAttribute('data-sd-open') === name;
      button.setAttribute('aria-pressed', mine ? 'true' : 'false');
      button.tabIndex = mine ? 0 : -1;
    });

    wirePane(panel, region);
  }

  
  function closeInsertPanel(panel) {
    if (!panel) return;
    var region = regionOf(panel);
    if (region) { disarmWithin(region); region.replaceChildren(); }
    panel.removeAttribute('data-sd-panel');

    var buttons = railButtons(panel);
    buttons.forEach(function (button, i) {
      button.setAttribute('aria-pressed', 'false');
      button.tabIndex = i === 0 ? 0 : -1;
    });
  }

  

  
  function applyFilter(panel, speak) {
    var region = regionOf(panel);
    if (!region) return;
    var state = panelState(panel);
    var anyVisible = false;

    each(region.querySelectorAll(ROW), function (row) {
      var label = row.querySelector('.sd-objects-menu-item__label');
      var keep = insertPanelMatch(
        label ? label.textContent : '',
        row.getAttribute('data-sd-type'),
        state.query,
        state.filter
      );
      var carrier = row.closest('.sd-insert-panel__row') || row;
      carrier.hidden = !keep;
      if (keep) anyVisible = true;
    });

    
    var notes = [];
    each(
      region.querySelectorAll('.sd-insert-panel__group'),
      function (group) {
        var list = group.querySelector('.sd-insert-panel__list');
        var rows = group.querySelectorAll(ROW);
        var alive = Array.prototype.some.call(rows, function (row) {
          var carrier = row.closest('.sd-insert-panel__row') || row;
          return !carrier.hidden;
        });
        var inFolder = !!(list && list.__sdTrail && list.__sdTrail.length);
        var note = folderNote(panel, list, inFolder && rows.length > 0 && !alive);
        if (note) notes.push(note);
        if (!rows.length) return;
        group.hidden = !alive && !inFolder;
      }
    );

    
    var empty = region.querySelector('.sd-insert-panel__empty');
    if (empty) empty.hidden = anyVisible || notes.length > 0;

    if (speak) {
      notes.forEach(function (n) {
        if (n.fresh) announce(panel.ownerDocument, n.said);
      });
    }
  }

  
  function insertPanelFolderEmpty(here, query, filter, filterLabel) {
    var q = String(query == null ? '' : query).trim();
    var parts = [];
    if (q) parts.push('\u201C' + q + '\u201D');
    if (filter && filter !== 'all') parts.push('the ' + (filterLabel || filter) + ' filter');
    if (!parts.length) return null;
    return 'Nothing in ' + here + ' matches ' + parts.join(' and ') + '.';
  }

  
  function folderNote(panel, list, show) {
    if (!list) return null;
    var note = list.previousElementSibling;
    if (note && !note.classList.contains(FOLDER_EMPTY)) note = null;
    var wasShown = !!note && !note.hidden;

    var state = panelState(panel);
    var said = show ? insertPanelFolderEmpty(list.__sdHere || '', state.query, state.filter, state.filterLabel) : null;
    if (!said) {
      if (note) note.hidden = true;
      return null;
    }
    if (!note) {
      note = panel.ownerDocument.createElement('p');
      note.className = FOLDER_EMPTY;
      list.parentNode.insertBefore(note, list);
    }
    note.textContent = said;
    note.hidden = false;
    return { said: said, fresh: !wasShown };
  }

  

  function toggleSection(header) {
    var open = header.getAttribute('aria-expanded') !== 'true';
    header.setAttribute('aria-expanded', open ? 'true' : 'false');
    var id = header.getAttribute('aria-controls');
    var list = id && header.ownerDocument.getElementById(id);
    if (list) foldSection(list, open);
  }

  
  var FOLD_PROPS = ['height', 'paddingTop', 'paddingBottom', 'borderBottomWidth'];

  function foldBox(el) {
    var cs = getComputedStyle(el);
    var box = {};
    FOLD_PROPS.forEach(function (p) { box[p] = cs[p]; });
    return box;
  }

  function motionMs(value) {
    var n = parseFloat(value);
    if (!n) return 0;
    return /ms\s*$/.test(value) ? n : n * 1000;
  }

  function foldSection(list, open) {
    var running = list.__sdFold;
    
    var from = running ? foldBox(list) : null;
    if (running) { running.cancel(); list.__sdFold = null; }

    list.hidden = false;
    var cs = getComputedStyle(list);
    var ms = motionMs(cs.getPropertyValue('--sd-duration-slow'));
    if (!ms || typeof list.animate !== 'function') {
      list.style.overflow = '';
      if (!list.getAttribute('style')) list.removeAttribute('style');
      list.hidden = !open;
      return;
    }

    var full = foldBox(list);
    var none = {};
    FOLD_PROPS.forEach(function (p) { none[p] = '0px'; });
    var easing = cs.getPropertyValue(open ? '--sd-easing-out' : '--sd-easing-in').trim() || 'ease';

    list.style.overflow = 'clip';
    var fold = list.animate([from || (open ? none : full), open ? full : none],
                            { duration: ms, easing: easing, fill: 'forwards' });
    list.__sdFold = fold;
    fold.onfinish = function () {
      if (!open) list.hidden = true;
      list.style.overflow = '';
      if (!list.getAttribute('style')) list.removeAttribute('style');
      fold.cancel();
      list.__sdFold = null;
    };
  }

  

  function listOfRow(row) {
    return row.closest('.sd-insert-panel__list');
  }

  function crumbsOf(list) {
    var group = list && list.closest('.sd-insert-panel__group');
    return group ? group.querySelector('.sd-insert-panel__crumbs') : null;
  }

  
  function trailOf(list, crumbs) {
    if (!list.__sdTrail) {
      list.__sdTrail = [];
      list.__sdHere = (crumbs && crumbs.getAttribute('data-sd-root')) || '';
    }
    return list.__sdTrail;
  }

  
  function drillInto(panel, list, id, label, from) {
    var template = panel.querySelector('template[data-sd-folder="' + id + '"]');
    if (!template || !list) return;

    var crumbs = crumbsOf(list);
    var trail = trailOf(list, crumbs);
    var rows = Array.prototype.slice.call(list.querySelectorAll(ROW));
    trail.push({ label: list.__sdHere, html: list.innerHTML, row: rows.indexOf(from) });
    list.__sdHere = label;

    disarmWithin(list);
    list.replaceChildren(template.content.cloneNode(true));
    renderCrumbs(panel, list);
    applyFilter(panel);
    landAfterDrill(panel, list, visibleRows(list)[0] || null);
  }

  
  function drillBackTo(panel, list, depth) {
    if (!list || !list.__sdTrail || depth >= list.__sdTrail.length) return;
    var entry = list.__sdTrail[depth];
    list.__sdTrail.length = depth;
    list.__sdHere = entry.label;
    disarmWithin(list);
    list.innerHTML = entry.html;
    renderCrumbs(panel, list);
    applyFilter(panel);
    var back = entry.row >= 0 ? list.querySelectorAll(ROW)[entry.row] : null;
    landAfterDrill(panel, list, back && drawn(back, panel) ? back : (visibleRows(list)[0] || null));
  }

  
  function drawn(el, panel) {
    if (!el || !el.isConnected) return false;
    var hidden = el.closest('[hidden]');
    return !hidden || !panel.contains(hidden);
  }

  function visibleRows(list) {
    var panel = list.closest(PANEL);
    return Array.prototype.filter.call(list.querySelectorAll(ROW), function (row) {
      return drawn(row, panel);
    });
  }

  function landAfterDrill(panel, list, row) {
    var group = list.closest('.sd-insert-panel__group');
    var open = panel.getAttribute('data-sd-panel');
    var candidates = [
      row,
      group && group.querySelector(SECTION_HEADER),
      panel.querySelector(SEARCH_INPUT),
      open && panel.querySelector(RAIL_BUTTON + '[data-sd-open="' + open + '"]')
    ];
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el || !drawn(el, panel)) continue;
      el.focus();
      if (el.ownerDocument.activeElement === el) break;
    }

    
    var n = Array.prototype.filter.call(list.querySelectorAll(ROW), function (r) {
      var carrier = r.closest('.sd-insert-panel__row') || r;
      return !carrier.hidden;
    }).length;
    var note = list.previousElementSibling;
    var said = note && note.classList.contains(FOLDER_EMPTY) && !note.hidden
      ? note.textContent
      : (list.__sdHere || '') + ' — ' +
        (n === 0 ? 'nothing here matches the search or filter'
                 : n + (n === 1 ? ' item' : ' items') + (list.hidden ? ', section folded' : ''));
    announce(panel.ownerDocument, said);
  }

  
  function renderCrumbs(panel, list) {
    var crumbs = crumbsOf(list);
    if (!crumbs) return;

    var doc = panel.ownerDocument;
    var trail = trailOf(list, crumbs);
    crumbs.replaceChildren();

    
    crumbs.hidden = trail.length === 0;
    if (crumbs.hidden) return;

    var labels = trail.map(function (e) { return e.label; }).concat([list.__sdHere]);

    labels.forEach(function (label, i) {
      var last = i === labels.length - 1;
      var crumb = doc.createElement(last ? 'span' : 'button');
      if (!last) crumb.type = 'button';
      crumb.className = 'sd-insert-panel__crumb';
      crumb.setAttribute('data-sd-crumb-index', String(i));
      if (last) crumb.setAttribute('aria-current', 'location');

      if (i === 0) {
        crumb.setAttribute('aria-label', label);
        crumb.appendChild(icon(doc, 'home-02', 'sd-insert-panel__crumb-icon'));
      } else {
        crumb.appendChild(doc.createTextNode(label));
      }
      if (!last) crumb.appendChild(icon(doc, 'chevron-right', 'sd-insert-panel__crumb-icon'));
      crumbs.appendChild(crumb);
    });
  }

  

  

  
  function wirePane(panel, region) {
    
    each(
      region.querySelectorAll(SECTION_HEADER),
      function (header) {
        var group = header.closest('.sd-insert-panel__group');
        var list = group && group.querySelector('.sd-insert-panel__list');
        if (!list) return;
        if (!list.id) list.id = uid('sd-section');
        header.setAttribute('aria-controls', list.id);
        if (!header.hasAttribute('aria-expanded')) {
          header.setAttribute('aria-expanded', list.hidden ? 'false' : 'true');
        }
        list.hidden = header.getAttribute('aria-expanded') !== 'true';
      }
    );

    each(
      region.querySelectorAll('.sd-insert-panel__list'),
      function (list) { renderCrumbs(panel, list); }
    );

    applyFilter(panel);
  }

  
  function openInsertPanelAround(node) {
    var panel = closestOf(node, PANEL);
    return panel && panel.getAttribute('data-sd-panel') ? panel : null;
  }

  
  function escapeInsertPanel(panel) {
    var open = panel && panel.getAttribute('data-sd-panel');
    if (!open) return false;
    var button = panel.querySelector(RAIL_BUTTON + '[data-sd-open="' + open + '"]');
    closeInsertPanel(panel);
    if (button) button.focus();
    return true;
  }

  
  function wireInsertPanel(panel) {
    if (panel[WIRED]) return;
    panel[WIRED] = true;

    
    if (panel.ownerDocument.body) layerFor(panel.ownerDocument);

    panel.addEventListener('click', function (e) {
      var rail = e.target.closest(RAIL_BUTTON);
      if (rail && panel.contains(rail)) {
        var name = rail.getAttribute('data-sd-open');
        if (panel.getAttribute('data-sd-panel') === name) closeInsertPanel(panel);
        else openInsertPanel(panel, name);
        rail.focus();
        return;
      }

      var header = e.target.closest(SECTION_HEADER);
      if (header && panel.contains(header)) { toggleSection(header); return; }

      var chip = e.target.closest(FILTER_CHIP);
      if (chip && panel.contains(chip)) {
        var value = chip.getAttribute('data-sd-filter') || 'all';
        var state = panelState(panel);
        state.filter = value;
        state.filterLabel = chip.getAttribute('aria-label') || chip.textContent.trim();
        each(
          panel.querySelectorAll(FILTER_CHIP),
          function (c) {
            c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
          }
        );
        applyFilter(panel, true);
        return;
      }

      var crumb = e.target.closest('.sd-insert-panel__crumb');
      if (crumb && panel.contains(crumb)) {
        if (crumb.hasAttribute('aria-current')) return;
        var group = crumb.closest('.sd-insert-panel__group');
        var target = group && group.querySelector('.sd-insert-panel__list');
        drillBackTo(panel, target, Number(crumb.getAttribute('data-sd-crumb-index')));
        return;
      }

      var row = e.target.closest(ROW);
      if (row && panel.contains(row)) {
        if (row.getAttribute('aria-disabled') === 'true') return;
        var folder = row.getAttribute('data-sd-folder');
        if (!folder) return;
        var label = row.querySelector('.sd-objects-menu-item__label');
        drillInto(panel, listOfRow(row), folder, label ? label.textContent : folder, row);
      }
    });

    panel.addEventListener('input', function (e) {
      var input = e.target.closest(SEARCH_INPUT);
      if (!input || !panel.contains(input)) return;
      panelState(panel).query = input.value;
      applyFilter(panel, true);
    });

    
    panel.addEventListener('keydown', function (e) {
      var rail = e.target.closest(RAIL_BUTTON);
      if (!rail || !panel.contains(rail)) return;

      
      var buttons = railButtons(panel);
      var at = rovingStep(buttons.length, buttons.indexOf(rail), e.key, 'both');
      if (at < 0) return;

      e.preventDefault();
      rove(buttons, buttons[at]);
      buttons[at].focus();
    });

    
    var buttons = railButtons(panel);
    buttons.forEach(function (button) {
      if (!button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', 'false');
    });
    rove(buttons, buttons[0]);

    var start = panel.getAttribute('data-sd-open');
    if (start) openInsertPanel(panel, start);
  }

  

  
  

  var SIGNER_PICKER = '.sd-signer-picker';
  var SIGNER_PICKER_CONTROL = '.sd-signer-picker__control';
  var SIGNER_PICKER_FACE = '.sd-signer-picker__face';
  var SIGNER_PICKER_NAME = '.sd-signer-picker__name';
  var SIGNER_PICKER_MARK = '.sd-signer-picker__mark';
  var SIGNER_PICKER_FILTER_INPUT = '.sd-signer-picker__filter-input';
  var SIGNER_PICKER_FILTER_CLEAR = '.sd-signer-picker__filter-clear';
  var SIGNER_PICKER_NOTE_CLEAR = '.sd-signer-picker__note-clear';
  var SIGNER_OPTION = '.sd-signer-picker-option';
  var SIGNER_OPTION_INPUT = '.sd-signer-picker-option__input';
  var SIGNER_OPTION_NAME = '.sd-signer-picker-option__name';
  var SIGNER_OPTION_MARK = '.sd-signer-picker-option__mark';
  var SIGNER_OPTION_ISOLATE = '.sd-signer-picker-option__isolate';
  var SIGNER_PICKER_HUE = /^sd-signer--\d$/;
  var SIGNER_PICKER_WIRED = '__sdSignerPickerWired';
  var SIGNER_PICKER_OPENED_WITH = '__sdSignerPickerOpenedWith';
  var SIGNER_PICKER_STEP = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

  function signerPickerSyncExpanded(control) {
    var face = control && control.querySelector(SIGNER_PICKER_FACE);
    if (face) face.setAttribute('aria-expanded', control.hasAttribute('open') ? 'true' : 'false');
  }

  function signerPickerClose(control) {
    if (!control) return;
    control[SIGNER_PICKER_OPENED_WITH] = undefined;
    if (!control.hasAttribute('open')) return;
    control.removeAttribute('open');
    signerPickerSyncExpanded(control);
  }

  function signerPickerChecked(picker) {
    return picker.querySelector(SIGNER_OPTION_INPUT + ':checked');
  }

  
  function signerPickerSteps(picker) {
    return Array.prototype.filter.call(picker.querySelectorAll(SIGNER_OPTION_INPUT), function (input) {
      var option = input.closest(SIGNER_OPTION);
      return !input.disabled && !(option && option.hidden);
    });
  }

  
  function signerPickerCheck(input) {
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  
  function signerPickerRemember(picker, control) {
    if (control[SIGNER_PICKER_OPENED_WITH] === undefined) {
      control[SIGNER_PICKER_OPENED_WITH] = signerPickerChecked(picker);
    }
  }

  
  function signerPickerHueOf(picker, option) {
    var source = option.closest('.sd-signer');
    if (!source || source === picker) return null;
    var hue = null;
    each(source.classList, function (cls) {
      if (SIGNER_PICKER_HUE.test(cls)) hue = cls;
    });
    return hue;
  }

  
  function signerPickerPaint(picker, hue) {
    Array.prototype.slice.call(picker.classList).forEach(function (cls) {
      if (SIGNER_PICKER_HUE.test(cls)) picker.classList.remove(cls);
    });
    if (hue) picker.classList.add(hue);
  }

  
  function signerPickerIsolate(picker, button) {
    var wanted = button && button.getAttribute('aria-pressed') !== 'true' ? button : null;
    each(
      picker.querySelectorAll(SIGNER_OPTION_ISOLATE),
      function (b) { b.setAttribute('aria-pressed', String(b === wanted)); }
    );
    return wanted;
  }

  
  function signerPickerFilter(picker, text) {
    var want = (text || '').trim().toLowerCase();
    each(
      picker.querySelectorAll(SIGNER_OPTION),
      function (option) {
        var name = option.querySelector(SIGNER_OPTION_NAME);
        var hit = !want || (name && name.textContent.toLowerCase().indexOf(want) !== -1);
        if (hit) option.removeAttribute('hidden');
        else option.setAttribute('hidden', '');
      }
    );
  }

  
  function signerPickerSyncFace(picker) {
    var input = signerPickerChecked(picker);
    var option = input && input.closest(SIGNER_OPTION);
    if (!option) return;
    var name = picker.querySelector(SIGNER_PICKER_NAME);
    var mark = picker.querySelector(SIGNER_PICKER_MARK);
    var text = option.querySelector(SIGNER_OPTION_NAME);
    var numeral = option.querySelector(SIGNER_OPTION_MARK);
    if (name && text) name.textContent = text.textContent;
    
    if (mark && numeral) mark.textContent = numeral.textContent;
    signerPickerPaint(picker, signerPickerHueOf(picker, option));
  }

  
  function signerPickerCommit(picker, refocus) {
    if (!picker) return;
    signerPickerSyncFace(picker);
    signerPickerClose(picker.querySelector(SIGNER_PICKER_CONTROL));
    var face = picker.querySelector(SIGNER_PICKER_FACE);
    if (refocus && face) face.focus();
  }

  
  function wireSignerPickers(doc) {
    if (!doc || doc[SIGNER_PICKER_WIRED]) return;
    doc[SIGNER_PICKER_WIRED] = true;

    
    doc.addEventListener('toggle', function (e) {
      var control = e.target;
      if (!control.matches || !control.matches(SIGNER_PICKER_CONTROL)) return;
      var picker = control.closest(SIGNER_PICKER);
      signerPickerSyncExpanded(control);
      if (!picker) return;
      if (control.hasAttribute('open')) signerPickerRemember(picker, control);
      else { signerPickerSyncFace(picker); control[SIGNER_PICKER_OPENED_WITH] = undefined; }
    }, true);

    
    doc.addEventListener('keydown', function (e) {
      if (!e.target.closest) return;
      var picker = e.target.closest(SIGNER_PICKER);
      var control = picker && picker.querySelector(SIGNER_PICKER_CONTROL);
      if (!control) return;
      var open = control.hasAttribute('open');

      
      if (e.target.matches(SIGNER_PICKER_FACE) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        if (!open) {
          signerPickerRemember(picker, control);
          control.setAttribute('open', '');
          signerPickerSyncExpanded(control);
        }
        var steps = signerPickerSteps(picker);
        var at = signerPickerChecked(picker);
        if (!at || steps.indexOf(at) === -1) at = steps[0];
        if (at) at.focus();
        return;
      }

      if (!e.target.matches(SIGNER_OPTION_INPUT)) return;

      
      var step = SIGNER_PICKER_STEP[e.key];
      if (step || e.key === 'Home' || e.key === 'End') {
        var list = signerPickerSteps(picker);
        if (!list.length) return;
        e.preventDefault();
        var i = list.indexOf(e.target);
        var next = e.key === 'Home' ? list[0]
          : e.key === 'End' ? list[list.length - 1]
          : list[(i + step + list.length) % list.length];
        signerPickerCheck(next);
        next.focus();
        return;
      }

      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        signerPickerCheck(e.target);
        signerPickerCommit(picker, true);
      }
    });

    
    doc.addEventListener('focusout', function (e) {
      if (!e.target.closest) return;
      var control = e.target.closest(SIGNER_PICKER_CONTROL);
      if (!control || !control.hasAttribute('open')) return;
      var to = e.relatedTarget;
      if (to && !control.contains(to)) signerPickerCommit(control.closest(SIGNER_PICKER), false);
    });

    doc.addEventListener('click', function (e) {
      if (!e.target.closest) return;

      
      if (e.target.matches && e.target.matches(SIGNER_OPTION_INPUT)) {
        var chosen = e.target.closest(SIGNER_PICKER);
        if (chosen) signerPickerCommit(chosen, true);
        return;
      }

      
      var isolate = e.target.closest(SIGNER_OPTION_ISOLATE);
      if (isolate) {
        var owner = isolate.closest(SIGNER_PICKER);
        if (!owner) return;
        signerPickerIsolate(owner, isolate);
        signerPickerClose(owner.querySelector(SIGNER_PICKER_CONTROL));
        var back = owner.querySelector(SIGNER_PICKER_FACE);
        if (back) back.focus();
        return;
      }

      
      var noteClear = e.target.closest(SIGNER_PICKER_NOTE_CLEAR);
      if (noteClear) {
        var noted = noteClear.closest(SIGNER_PICKER);
        if (noted) signerPickerIsolate(noted, null);
        return;
      }

      
      var searchClear = e.target.closest(SIGNER_PICKER_FILTER_CLEAR);
      if (searchClear) {
        var searched = searchClear.closest(SIGNER_PICKER);
        if (!searched) return;
        var box = searched.querySelector(SIGNER_PICKER_FILTER_INPUT);
        if (box) { box.value = ''; box.focus(); }
        signerPickerFilter(searched, '');
      }
    });

    doc.addEventListener('input', function (e) {
      if (!e.target.matches || !e.target.matches(SIGNER_PICKER_FILTER_INPUT)) return;
      var picker = e.target.closest(SIGNER_PICKER);
      if (picker) signerPickerFilter(picker, e.target.value);
    });

    
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || e.defaultPrevented || !e.target.closest) return;
      var picker = e.target.closest(SIGNER_PICKER);
      var control = picker && picker.querySelector(SIGNER_PICKER_CONTROL);
      if (!control || !control.hasAttribute('open')) return;
      e.preventDefault();
      
      var was = control[SIGNER_PICKER_OPENED_WITH];
      if (was && control.contains(was)) signerPickerCheck(was);
      signerPickerCommit(picker, true);
    }, true);

    
    doc.addEventListener('pointerdown', function (e) {
      each(
        doc.querySelectorAll(SIGNER_PICKER_CONTROL + '[open]'),
        function (control) {
          if (!control.contains(e.target)) signerPickerCommit(control.closest(SIGNER_PICKER), false);
        }
      );
    });
  }

  

  
  

  var PILL_TABS = '.sd-pill-tabs[role="tablist"]';
  var PT_WIRED = '__sdPillTabsWired';

  function pillTabs(list) {
    return Array.prototype.filter.call(list.querySelectorAll('.sd-pill-tabs__item[role="tab"]'), function (tab) {
      return !tab.disabled;
    });
  }

  
  function selectedPillTab(tabs) {
    for (var k = 0; k < tabs.length; k++) {
      if (tabs[k].getAttribute('aria-selected') === 'true') return tabs[k];
    }
    return tabs[0] || null;
  }

  function wirePillTabs(list) {
    if (!list || list[PT_WIRED]) return;
    list[PT_WIRED] = true;

    var tabs = pillTabs(list);
    if (tabs.length) rove(tabs, selectedPillTab(tabs));

    list.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var tab = e.target.closest ? e.target.closest('.sd-pill-tabs__item') : null;
      if (!tab) return;
      var all = pillTabs(list);
      var at = rovingStep(all.length, all.indexOf(tab), e.key, 'horizontal');
      if (at < 0) return;
      e.preventDefault();
      rove(all, all[at]);
      all[at].focus();
    });

    list.addEventListener('focusout', function (e) {
      if (e.relatedTarget && list.contains(e.relatedTarget)) return;
      var all = pillTabs(list);
      if (all.length) rove(all, selectedPillTab(all));
    });
  }

  

  
  

  var LABEL_BAR = '.sd-field-label-bar';

  
  var BAR_PAGE = '[data-sd-doc]';

  
  var BAR_PLACEMENTS = ['bottom-left', 'top-left', 'bottom-right', 'top-right'];

  var BAR_WIRED = '__sdBarWired';
  var BAR_EDGE = '__sdBarEdge';
  var BAR_SIDE = '__sdBarSide';
  var BAR_WATCH = '__sdBarWatch';
  var BAR_WATCHED = '__sdBarWatched';

  function placementOf(bar) {
    for (var i = 0; i < BAR_PLACEMENTS.length; i++) {
      if (bar.classList.contains('sd-field-label-bar--' + BAR_PLACEMENTS[i])) return BAR_PLACEMENTS[i];
    }
    return null;
  }

  
  function pinBar(bar, side) {
    var edge = bar[BAR_EDGE];
    bar.classList.remove('sd-field-label-bar--' + edge + '-' + (side === 'left' ? 'right' : 'left'));
    bar.classList.add('sd-field-label-bar--' + edge + '-' + side);
  }

  
  function placeBar(bar) {
    
    if (bar[BAR_EDGE]) pinBar(bar, bar[BAR_SIDE]);
    bar.style.maxWidth = '';

    var page = closestOf(bar, BAR_PAGE);
    watchPage(bar, page);
    var anchor = bar.offsetParent;
    if (!page || !anchor || !bar[BAR_EDGE] || !page.contains(anchor)) return;

    var pr = page.getBoundingClientRect();
    var ar = anchor.getBoundingClientRect();
    
    var want = bar.getBoundingClientRect().width;

    var room = { left: pr.right - ar.left, right: ar.right - pr.left };
    var mine = bar[BAR_SIDE];
    var other = mine === 'left' ? 'right' : 'left';

    
    if (room[mine] >= want) return;
    if (room[other] >= want) { pinBar(bar, other); return; }

    
    var side = room.left >= room.right ? 'left' : 'right';
    pinBar(bar, side);
    
    bar.style.maxWidth = Math.max(0, room[side] / drawnScale(bar)) + 'px';
  }

  
  function replaceBarsIn(stack) {
    Array.prototype.forEach.call(stack.querySelectorAll(LABEL_BAR), function (bar) {
      if (bar[BAR_WIRED]) placeBar(bar);
    });
  }

  
  function watchPage(bar, page) {
    var ro = bar[BAR_WATCH];
    if (!ro || page === bar[BAR_WATCHED]) return;
    if (bar[BAR_WATCHED]) ro.unobserve(bar[BAR_WATCHED]);
    bar[BAR_WATCHED] = page || null;
    if (page) ro.observe(page);
  }

  
  function wireLabelBar(bar) {
    if (bar[BAR_WIRED]) { placeBar(bar); return; }
    bar[BAR_WIRED] = true;

    
    var placement = placementOf(bar);
    if (placement) {
      bar[BAR_EDGE] = placement.slice(0, placement.lastIndexOf('-'));
      bar[BAR_SIDE] = placement.slice(placement.lastIndexOf('-') + 1);
    }

    if (typeof ResizeObserver === 'function') {
      bar[BAR_WATCH] = new ResizeObserver(function () { placeBar(bar); });
    }

    placeBar(bar);

    var doc = bar.ownerDocument;
    if (doc && doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function') {
      doc.fonts.ready.then(function () { placeBar(bar); });
    }
  }

  

  
  

  
  var PLACED = '.sd-field-object--placed, .sd-token--placed';
  var RIG = '.sd-selection-rig';
  var HANDLE = '[data-sd-handle]';
  var FIXED_PAGE = '[data-sd-doc="fixed"]';

  
  var MIN_BOX = 24;

  
  var HANDLE_REACH = 8;

  
  var MOVE_COARSE = 8;
  var MOVE_FINE = 1;

  
  var GEOM_PROPS = { x: 'left', y: 'top', w: 'width', h: 'height' };

  

  
  function geomOf(obj) {
    var s = obj.style;
    var read = function (v) {
      var n = parseFloat(v);
      return Number.isFinite(n) ? Math.round(n) : null;
    };
    var box = { x: read(s.left), y: read(s.top), w: read(s.width), h: read(s.height) };
    if (box.x !== null && box.y !== null && box.w !== null && box.h !== null) return box;

    if (box.x === null) box.x = Math.round(obj.offsetLeft || 0);
    if (box.y === null) box.y = Math.round(obj.offsetTop || 0);
    if (box.w === null) box.w = Math.round(obj.offsetWidth || 0);
    if (box.h === null) box.h = Math.round(obj.offsetHeight || 0);
    return box;
  }

  
  function containerOf(obj) {
    return obj.offsetParent || null;
  }

  function boundsOf(obj) {
    var host = containerOf(obj);
    if (!host) return null;
    return { width: host.clientWidth, height: host.clientHeight };
  }

  
  function clampBox(box, bounds) {
    var w = Math.round(box.w);
    var h = Math.round(box.h);
    var x = Math.round(box.x);
    var y = Math.round(box.y);
    if (bounds) {
      x = Math.max(0, Math.min(x, Math.round(bounds.width - w)));
      y = Math.max(0, Math.min(y, Math.round(bounds.height - h)));
    } else {
      x = Math.max(0, x);
      y = Math.max(0, y);
    }
    return { x: x, y: y, w: w, h: h };
  }

  
  function sizeBox(box, bounds) {
    var w = Math.max(MIN_BOX, Math.round(box.w));
    var h = Math.max(MIN_BOX, Math.round(box.h));
    if (bounds) {
      w = Math.min(w, Math.max(MIN_BOX, Math.round(bounds.width)));
      h = Math.min(h, Math.max(MIN_BOX, Math.round(bounds.height)));
    }
    return { x: box.x, y: box.y, w: w, h: h };
  }

  
  function isSquare(obj) {
    return obj.classList.contains('sd-field-object--checkbox');
  }

  
  function squareBox(box) {
    var side = Math.round((box.w + box.h) / 2);
    return { x: box.x, y: box.y, w: side, h: side };
  }

  
  function writePos(obj, box) {
    obj.style.left = box.x + 'px';
    obj.style.top = box.y + 'px';
    return box;
  }

  
  function writeBox(obj, box) {
    writePos(obj, box);
    obj.style.width = box.w + 'px';
    obj.style.height = box.h + 'px';
    return box;
  }

  
  function applyGeom(obj, prop, value) {
    if (!GEOM_PROPS[prop]) return null;
    var n = parseFloat(value);
    if (!Number.isFinite(n)) return null;

    var box = geomOf(obj);
    var bounds = boundsOf(obj);

    if (prop === 'x' || prop === 'y') {
      box[prop] = Math.round(n);
      return writePos(obj, clampBox(box, bounds));
    }

    
    var capped = sizeBox({ x: box.x, y: box.y, w: n, h: n }, bounds);
    if (isSquare(obj)) {
      box.w = box.h = prop === 'w' ? capped.w : capped.h;
    } else {
      box[prop] = prop === 'w' ? capped.w : capped.h;
    }
    return writeBox(obj, clampBox(box, bounds));
  }

  function isGeomProp(prop) {
    return Object.prototype.hasOwnProperty.call(GEOM_PROPS, prop);
  }

  

  
  function rigFor(obj) {
    var page = obj.closest(FIXED_PAGE);
    return page ? page.querySelector(RIG) : null;
  }

  
  function rigTuck(box, bounds, reach) {
    if (!bounds) return { top: 0, right: 0, bottom: 0, left: 0 };
    var most = Number.isFinite(reach) && reach > 0 ? reach : HANDLE_REACH;
    var pull = function (gap) {
      if (!Number.isFinite(gap)) return 0;
      return Math.max(0, Math.min(most, most - gap));
    };
    return {
      top: pull(box.y),
      right: pull(bounds.width - (box.x + box.w)),
      bottom: pull(bounds.height - (box.y + box.h)),
      left: pull(box.x)
    };
  }

  
  function placeRig(obj, mode, box, bounds, scale) {
    if (!obj) return null;
    var rig = rigFor(obj);
    if (!rig) return null;

    if (!box) box = geomOf(obj);
    if (bounds === undefined) bounds = boundsOf(obj);
    if (!scale) scale = drawnScale(obj.closest(FIXED_PAGE));
    rig.__sdRigOn = obj;
    rig.hidden = false;
    rig.style.left = box.x + 'px';
    rig.style.top = box.y + 'px';
    rig.style.width = box.w + 'px';
    rig.style.height = box.h + 'px';
    rig.style.right = 'auto';
    rig.style.bottom = 'auto';

    
    var tuck = rigTuck(box, bounds, HANDLE_REACH / scale);
    rig.style.setProperty('--sd-rig-tuck-top', tuck.top + 'px');
    rig.style.setProperty('--sd-rig-tuck-right', tuck.right + 'px');
    rig.style.setProperty('--sd-rig-tuck-bottom', tuck.bottom + 'px');
    rig.style.setProperty('--sd-rig-tuck-left', tuck.left + 'px');

    var badge = rig.querySelector('.sd-selection-rig__badge');
    if (badge) badge.textContent = box.w + ' × ' + box.h;

    if (mode === 'resize') rig.setAttribute('data-sd-rig', 'resize');
    else rig.removeAttribute('data-sd-rig');

    
    if (bounds && box.y + box.h + 26 / scale > bounds.height) {
      rig.setAttribute('data-sd-badge', 'inside');
    } else {
      rig.removeAttribute('data-sd-badge');
    }
    return rig;
  }

  
  function hideRigs(doc) {
    each(doc.querySelectorAll(RIG), function (rig) {
      if (!rig.__sdRigOn) return;
      rig.__sdRigOn = null;
      rig.hidden = true;
      rig.removeAttribute('data-sd-rig');
      rig.removeAttribute('data-sd-badge');
    });
  }

  
  function syncRig(obj, doc) {
    doc = doc || docOf(obj);
    hideRigs(doc);
    if (!obj || !obj.matches || !obj.matches(PLACED)) return null;
    if (!obj.closest(FIXED_PAGE) || !inEditor(obj)) return null;
    return placeRig(obj, null);
  }

  

  
  var placedDrag = null;

  
  var gestureQueue = [];

  function gestureLive() {
    return !!(drag || placedDrag);
  }

  function afterGesture(fn) {
    if (!gestureLive()) { fn(); return; }
    gestureQueue.push(fn);
  }

  function gestureEnded() {
    if (gestureLive()) return;
    var run = gestureQueue;
    gestureQueue = [];
    run.forEach(function (fn) { fn(); });
  }

  
  function drawnScale(el) {
    if (!el || !el.offsetWidth) return 1;
    var s = el.getBoundingClientRect().width / el.offsetWidth;
    return Number.isFinite(s) && s > 0 ? s : 1;
  }

  
  function rescaled(stack) {
    Array.prototype.forEach.call(stack.querySelectorAll(RIG), function (rig) {
      if (rig.__sdRigOn && stack.contains(rig.__sdRigOn)) placeRig(rig.__sdRigOn, null);
    });
    if (armed && stack.contains(armed.target)) drawMark(stack.ownerDocument, markFromArmed());
    replaceBarsIn(stack);
  }

  
  var placedPress = false;

  
  function cornerOf(name) {
    return {
      west: name === 'tl' || name === 'bl',
      north: name === 'tl' || name === 'tr'
    };
  }

  function objectUnder(e) {
    var handle = closestOf(e.target, HANDLE);
    if (handle) {
      var rig = handle.closest(RIG);
      return { obj: rig && rig.__sdRigOn, corner: handle.getAttribute('data-sd-handle') };
    }
    return { obj: closestOf(e.target, PLACED), corner: null };
  }

  
  function onPlacedDown(e) {
    if (e.button !== 0) return;
    if (placedDrag) {
      
      if (e.pointerId !== placedDrag.pointerId) return;
      onPlacedUp();
    }
    var found = objectUnder(e);
    var obj = found.obj;
    if (!obj || !inEditor(obj) || !obj.closest(FIXED_PAGE)) return;

    
    e.preventDefault();
    placedPress = true;

    
    placedDrag = {
      obj: obj,
      corner: found.corner,
      x0: e.clientX,
      y0: e.clientY,
      from: geomOf(obj),
      bounds: boundsOf(obj),
      
      scale: drawnScale(obj.closest(FIXED_PAGE)),
      
      square: isSquare(obj),
      moved: false,
      pointerId: e.pointerId,
      grip: (found.corner && e.target.closest(HANDLE)) || obj
    };

    
    if (!found.corner) selectObject(obj);

    
    if (!found.corner && (obj.tabIndex >= 0 || obj.hasAttribute('tabindex'))) {
      obj.focus({ preventScroll: true });
    }

    var doc = obj.ownerDocument;
    try { placedDrag.grip.setPointerCapture(e.pointerId); } catch (err) {  }
    placedDrag.grip.addEventListener('lostpointercapture', onPlacedEnd);
    doc.addEventListener('pointermove', onPlacedMove);
    doc.addEventListener('pointerup', onPlacedEnd);
    doc.addEventListener('pointercancel', onPlacedEnd);
  }

  
  function boxFromDrag(drag, dx, dy) {
    var from = drag.from;
    if (!drag.corner) return { x: from.x + dx, y: from.y + dy, w: from.w, h: from.h };

    var edge = cornerOf(drag.corner);
    var asked = {
      x: from.x,
      y: from.y,
      w: edge.west ? from.w - dx : from.w + dx,
      h: edge.north ? from.h - dy : from.h + dy
    };
    var box = sizeBox(asked, drag.bounds);
    if (drag.square) box = sizeBox(squareBox(box), drag.bounds);

    
    return {
      x: edge.west ? from.x + (from.w - box.w) : from.x,
      y: edge.north ? from.y + (from.h - box.h) : from.y,
      w: box.w,
      h: box.h
    };
  }

  function onPlacedMove(e) {
    if (!placedDrag) return;
    var fate = pointerFate(placedDrag.pointerId, e);
    if (fate === 'other') return;
    if (fate === 'released') { onPlacedUp(); return; }
    var drag = placedDrag;
    var box = clampBox(boxFromDrag(drag, (e.clientX - drag.x0) / drag.scale,
      (e.clientY - drag.y0) / drag.scale), drag.bounds);

    if (!drag.moved) {
      drag.moved = true;
      drag.obj.setAttribute('data-sd-dragging', '');
    }
    
    if (drag.corner) writeBox(drag.obj, box);
    else writePos(drag.obj, box);

    
    placeRig(drag.obj, drag.corner ? 'resize' : null, box, drag.bounds, drag.scale);
    
    paintGeometry(drag.obj, box);
  }

  
  function onPlacedEnd(e) {
    if (!placedDrag || pointerFate(placedDrag.pointerId, e) === 'other') return;
    onPlacedUp();
  }

  function onPlacedUp() {
    var drag = placedDrag;
    placedDrag = null;
    if (!drag) return;
    var doc = drag.obj.ownerDocument;
    doc.removeEventListener('pointermove', onPlacedMove);
    doc.removeEventListener('pointerup', onPlacedEnd);
    doc.removeEventListener('pointercancel', onPlacedEnd);
    drag.grip.removeEventListener('lostpointercapture', onPlacedEnd);
    drag.obj.removeAttribute('data-sd-dragging');
    placeRig(drag.obj, null);
    if (drag.moved) announceBox(drag.obj, drag.corner ? 'resized' : 'moved');
    gestureEnded();
  }

  

  
  function nudgeBox(box, key, amount, resize) {
    var out = { x: box.x, y: box.y, w: box.w, h: box.h };
    if (key === 'ArrowLeft') { if (resize) out.w -= amount; else out.x -= amount; }
    else if (key === 'ArrowRight') { if (resize) out.w += amount; else out.x += amount; }
    else if (key === 'ArrowUp') { if (resize) out.h -= amount; else out.y -= amount; }
    else if (key === 'ArrowDown') { if (resize) out.h += amount; else out.y += amount; }
    else return null;
    return out;
  }

  function announceBox(obj, verb) {
    var box = geomOf(obj);
    announce(obj.ownerDocument, objectName(obj) + ' ' + verb + ' — ' +
      box.w + ' by ' + box.h + ', at ' + box.x + ', ' + box.y);
  }

  function onPlacedKey(e) {
    if (!e.key || e.key.indexOf('Arrow') !== 0) return;
    var obj = closestOf(e.target, PLACED);
    if (!obj || !inEditor(obj) || !obj.closest(FIXED_PAGE)) return;
    
    if (armed || drag || placedDrag) return;

    var asked = nudgeBox(geomOf(obj), e.key, e.shiftKey ? MOVE_FINE : MOVE_COARSE, e.altKey);
    if (!asked) return;
    e.preventDefault();
    if (e.altKey && isSquare(obj)) asked = squareBox(asked);
    writeBox(obj, clampBox(asked, boundsOf(obj)));
    placeRig(obj, null);
    paintGeometry(obj);
    announceBox(obj, e.altKey ? 'resized' : 'moved');
  }

  

  var PLACED_WIRED = '__sdPlacedWired';

  function wirePlaced(doc) {
    if (doc[PLACED_WIRED]) return;
    doc[PLACED_WIRED] = true;
    doc.addEventListener('pointerdown', onPlacedDown);
    doc.addEventListener('keydown', onPlacedKey);
  }

  

  
  

  var DRAG_SRC = '[data-sd-drag]';

  
  var INNER_CONTROL = 'input, textarea, select, button, a[href], summary, [tabindex], ' +
    '[contenteditable]:not([contenteditable="false"])';
  var DROP_TARGET = '[data-sd-drop]';

  
  var DEFAULT_PLACED_SIZE = { w: 180, h: 36 };

  
  var NUDGE_COARSE = 8;
  var NUDGE_FINE = 1;

  
  var GHOST_OFFSET = 14;

  
  var DEFAULT_BLOCK_SEL = ':scope > *';

  

  
  function insertionBand(lineHeight) {
    var line = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 20;
    return Math.min(8, Math.max(4, line * 0.3));
  }

  
  function dropModeFor(state) {
    if (!state) return 'block';
    if (state.flow === 'block') return 'block';
    if (!state.textBlock) return 'block';
    if (state.nearTop || state.nearBottom) return 'block';
    return 'inline';
  }

  
  function parseInsertSize(text) {
    var m = /^\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*$/i.exec(text || '');
    if (!m) return { w: DEFAULT_PLACED_SIZE.w, h: DEFAULT_PLACED_SIZE.h };
    return { w: Math.round(Number(m[1])), h: Math.round(Number(m[2])) };
  }

  
  function placementFor(px, py, size, bounds) {
    var w = size.w;
    var h = size.h;
    var x = Math.round(px - w / 2);
    var y = Math.round(py - h / 2);
    x = Math.max(0, Math.min(x, Math.round(bounds.width - w)));
    y = Math.max(0, Math.min(y, Math.round(bounds.height - h)));
    return { x: x, y: y, w: w, h: h };
  }

  
  function nudgePlacement(point, key, fine) {
    var step = fine ? NUDGE_FINE : NUDGE_COARSE;
    var x = point.x;
    var y = point.y;
    if (key === 'ArrowLeft') x -= step;
    else if (key === 'ArrowRight') x += step;
    else if (key === 'ArrowUp') y -= step;
    else if (key === 'ArrowDown') y += step;
    else return null;
    return { x: x, y: y };
  }

  

  function specOf(source) {
    if (!source) return null;
    var label = source.getAttribute('data-sd-drag-label');
    if (!label) label = (source.textContent || '').replace(/\s+/g, ' ').trim();
    return {
      source: source,
      template: source.getAttribute('data-sd-drag') || '',
      label: label || 'Item',
      flow: source.getAttribute('data-sd-drag-flow') === 'block' ? 'block' : 'any',
      size: parseInsertSize(source.getAttribute('data-sd-drag-size')),
      into: source.getAttribute('data-sd-drag-into') || ''
    };
  }

  
  function templateFor(name, doc) {
    var all = doc.querySelectorAll('template[data-sd-insert]');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-sd-insert') === name) return all[i];
    }
    return null;
  }

  
  function docTypeOf(target) {
    var own = target.getAttribute('data-sd-drop');
    if (own === 'fixed' || own === 'flowing') return own;
    var ctx = target.closest('[data-sd-doc]');
    if (!ctx) return null;
    var kind = ctx.getAttribute('data-sd-doc');
    return kind === 'fixed' || kind === 'flowing' ? kind : null;
  }

  
  function inEditor(el) {
    var ctx = el.closest('[data-sd-mode]');
    return !ctx || ctx.getAttribute('data-sd-mode') === 'editor';
  }

  
  function acceptsInsert(target) {
    return inEditor(target) && docTypeOf(target) !== null;
  }

  
  function undeclaredTarget(doc) {
    var all = doc.querySelectorAll(DROP_TARGET);
    for (var i = 0; i < all.length; i++) {
      if (inEditor(all[i]) && docTypeOf(all[i]) === null) return all[i];
    }
    return null;
  }

  function blockTagOf(target) {
    return target.getAttribute('data-sd-drop-block-tag') || 'p';
  }

  
  function flowBlocks(target) {
    var sel = target.getAttribute('data-sd-drop-blocks') || DEFAULT_BLOCK_SEL;
    var found;
    try {
      found = target.querySelectorAll(sel);
    } catch (e) {
      found = target.querySelectorAll(DEFAULT_BLOCK_SEL);
    }
    
    return Array.prototype.filter.call(found, function (el) {
      return el.getClientRects().length > 0;
    });
  }

  
  function isTextBlock(el) {
    if (!el || el.getAttribute('data-sd-drop-inline') === 'false') return false;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    }
    return false;
  }

  function caretFromPoint(doc, x, y) {
    if (doc.caretPositionFromPoint) {
      var p = doc.caretPositionFromPoint(x, y);
      if (!p) return null;
      return { node: p.offsetNode, offset: p.offset };
    }
    if (doc.caretRangeFromPoint) {
      var r = doc.caretRangeFromPoint(x, y);
      if (!r) return null;
      return { node: r.startContainer, offset: r.startOffset };
    }
    return null;
  }

  

  var LAYER = '__sdInsertionLayer';

  
  function layerFor(doc) {
    if (doc[LAYER] && doc.contains(doc[LAYER].root)) return doc[LAYER];

    var root = doc.querySelector('.sd-insertion');
    if (!root) {
      root = doc.createElement('div');
      root.className = 'sd-insertion';
      doc.body.appendChild(root);
    }

    function part(cls, hide) {
      var el = root.querySelector('.' + cls);
      if (!el) {
        el = doc.createElement('div');
        el.className = cls;
        root.appendChild(el);
      }
      if (hide) {
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
      }
      return el;
    }

    var live = part('sd-insertion__live', false);
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');

    doc[LAYER] = {
      root: root,
      ghost: part('sd-insertion__ghost', true),
      caret: part('sd-insertion__caret', true),
      rule: part('sd-insertion__rule', true),
      box: part('sd-insertion__box', true),
      live: live,
      said: ''
    };
    return doc[LAYER];
  }

  
  function announce(doc, message) {
    var layer = layerFor(doc);
    if (layer.said === message) return;
    layer.said = message;
    layer.live.textContent = message;
  }

  function hideMarks(doc) {
    var layer = layerFor(doc);
    layer.caret.hidden = layer.rule.hidden = layer.box.hidden = true;
    layer.ghost.style.height = '';
  }

  function pageBox(rect, doc) {
    var win = doc.defaultView;
    return { left: rect.left + win.scrollX, top: rect.top + win.scrollY };
  }

  
  function dropBox(target) {
    var rect = target.getBoundingClientRect();
    var cs = target.ownerDocument.defaultView.getComputedStyle(target);
    var scale = drawnScale(target);
    return {
      left: rect.left + (parseFloat(cs.borderLeftWidth) || 0) * scale,
      top: rect.top + (parseFloat(cs.borderTopWidth) || 0) * scale,
      width: target.clientWidth,
      height: target.clientHeight,
      scale: scale
    };
  }

  
  function drawMark(doc, mark) {
    paintMark(doc, measureMark(doc, mark));
  }

  
  function measureMark(doc, mark) {
    if (!mark) return null;
    var win = doc.defaultView;

    if (mark.mode === 'place') {
      
      var pad = dropBox(mark.target);
      var origin = pageBox(pad, doc);
      return {
        part: 'box',
        left: origin.left + mark.x * pad.scale,
        top: origin.top + mark.y * pad.scale,
        width: mark.w * pad.scale,
        height: mark.h * pad.scale
      };
    }

    if (mark.mode === 'inline') {
      var range = doc.createRange();
      range.setStart(mark.node, mark.offset);
      range.setEnd(mark.node, mark.offset);
      var r = range.getBoundingClientRect();
      var scale = drawnScale(mark.target);
      
      var h = r.height ||
        (parseFloat(win.getComputedStyle(mark.node.parentElement).lineHeight) || 20) * scale;
      var at = pageBox(r, doc);
      
      return { part: 'caret', left: at.left, top: at.top, height: h, ghost: h / scale };
    }

    var ref = mark.ref ? mark.ref.getBoundingClientRect() : mark.target.getBoundingClientRect();
    var edge = pageBox(ref, doc);
    var y = mark.ref
      ? (mark.before ? ref.top : ref.bottom)
      : ref.top;
    return { part: 'rule', left: edge.left, top: y + win.scrollY - 1, width: ref.width };
  }

  
  function paintMark(doc, at) {
    var layer = layerFor(doc);
    hideMarks(doc);
    if (!at) return;

    if (at.part === 'box') {
      layer.box.style.left = at.left + 'px';
      layer.box.style.top = at.top + 'px';
      layer.box.style.width = at.width + 'px';
      layer.box.style.height = at.height + 'px';
      layer.box.hidden = false;
      return;
    }

    if (at.part === 'caret') {
      layer.caret.style.left = at.left + 'px';
      layer.caret.style.top = at.top + 'px';
      layer.caret.style.height = at.height + 'px';
      layer.caret.hidden = false;
      
      layer.ghost.style.height = (at.ghost || at.height) + 'px';
      return;
    }

    layer.rule.style.left = at.left + 'px';
    layer.rule.style.top = at.top + 'px';
    layer.rule.style.width = at.width + 'px';
    layer.rule.hidden = false;
  }

  

  
  function resolveDrop(doc, x, y, spec) {
    var over = doc.elementFromPoint(x, y);
    var target = closestOf(over, DROP_TARGET);
    if (!target || !acceptsInsert(target)) return null;

    
    if (docTypeOf(target) === 'fixed') {
      var pad = dropBox(target);
      var at = placementFor((x - pad.left) / pad.scale, (y - pad.top) / pad.scale, spec.size, pad);
      return { mode: 'place', target: target, x: at.x, y: at.y, w: at.w, h: at.h };
    }

    
    var blocks = flowBlocks(target);
    if (!blocks.length) return { mode: 'block', target: target, ref: null, before: true };

    var inside = null;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i].getBoundingClientRect();
      if (y >= b.top && y <= b.bottom && x >= b.left && x <= b.right) inside = blocks[i];
    }

    if (inside) {
      var ir = inside.getBoundingClientRect();
      
      var band = insertionBand(
        parseFloat(doc.defaultView.getComputedStyle(inside).lineHeight)
      ) * drawnScale(target);
      var nearTop = y - ir.top <= band;
      var nearBottom = ir.bottom - y <= band;
      var text = isTextBlock(inside);

      if (dropModeFor({ flow: spec.flow, textBlock: text, nearTop: nearTop, nearBottom: nearBottom }) === 'inline') {
        var c = caretFromPoint(doc, x, y);
        if (c && c.node.nodeType === 3 && target.contains(c.node)) {
          return { mode: 'inline', target: target, node: c.node, offset: c.offset };
        }
        
        return { mode: 'block', target: target, ref: inside, before: y < ir.top + ir.height / 2 };
      }
      return {
        mode: 'block',
        target: target,
        ref: inside,
        before: nearTop || (!nearBottom && y < ir.top + ir.height / 2)
      };
    }

    
    var ref = blocks[0];
    var before = true;
    for (var j = 0; j < blocks.length; j++) {
      if (y >= blocks[j].getBoundingClientRect().top) { ref = blocks[j]; before = false; }
    }
    return { mode: 'block', target: target, ref: ref, before: before };
  }

  

  function shortText(el) {
    var t = (el && el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 40 ? t.slice(0, 40) + '…' : t;
  }

  
  function markPhrase(mark) {
    if (!mark) return 'not a valid place for that';
    if (mark.mode === 'place') return 'page position ' + mark.x + ', ' + mark.y;
    if (mark.mode === 'inline') {
      var text = mark.node.nodeValue || '';
      var before = (text.slice(0, mark.offset).match(/(\S+)\s*$/) || [, ''])[1];
      var after = (text.slice(mark.offset).match(/^\s*(\S+)/) || [, ''])[1];
      if (before && after) return 'inline, between “' + before + '” and “' + after + '”';
      if (before) return 'inline, after “' + before + '”';
      if (after) return 'inline, before “' + after + '”';
      return 'inline in the text';
    }
    if (!mark.ref) return 'as the document’s first block';
    return 'a new block ' + (mark.before ? 'before' : 'after') + ' “' + shortText(mark.ref) + '”';
  }

  
  function describeMark(mark, spec) {
    return spec.label + ' — ' + markPhrase(mark);
  }

  

  
  function insertAt(mark, spec) {
    if (!mark) return null;
    var target = mark.target;
    var doc = target.ownerDocument;

    var template = templateFor(spec.template, doc);
    if (!template) {
      announce(doc, 'Nothing inserted — no template named “' + spec.template + '”');
      return null;
    }
    var el = template.content.cloneNode(true).firstElementChild;
    if (!el) {
      announce(doc, 'Nothing inserted — the template “' + spec.template + '” is empty');
      return null;
    }

    if (mark.mode === 'place') {
      
      el.style.position = 'absolute';
      el.style.left = mark.x + 'px';
      el.style.top = mark.y + 'px';
      el.style.width = mark.w + 'px';
      el.style.height = mark.h + 'px';
      target.appendChild(el);
    } else if (mark.mode === 'inline') {
      var tail = mark.node.splitText(mark.offset);
      mark.node.parentNode.insertBefore(el, tail);
    } else {
      
      var holder = el;
      if (spec.flow !== 'block') {
        holder = doc.createElement(blockTagOf(target));
        holder.appendChild(el);
      }
      if (mark.ref) mark.ref.parentNode.insertBefore(holder, mark.before ? mark.ref : mark.ref.nextSibling);
      else target.appendChild(holder);
    }

    announce(doc, spec.label + ' inserted ' + (
      mark.mode === 'place' ? 'on the page at ' + mark.x + ', ' + mark.y
        : mark.mode === 'inline' ? 'inline in the text'
        : 'as a new block'));
    return el;
  }

  
  function commitInsert(mark, spec) {
    var el = insertAt(mark, spec);
    if (!el) return null;
    mark.target.dispatchEvent(new CustomEvent('sd-insert', {
      bubbles: true,
      detail: { element: el, mode: mark.mode, source: spec.source, template: spec.template }
    }));
    return el;
  }

  

  var drag = null;    
  var armed = null;   

  function showGhost(doc, spec, target) {
    var layer = layerFor(doc);
    var template = templateFor(spec.template, doc);
    layer.ghost.replaceChildren();
    if (template) layer.ghost.appendChild(template.content.cloneNode(true));
    else layer.ghost.textContent = spec.label;
    if (target) showGhostContext(doc, target);
  }

  
  function showGhostContext(doc, target) {
    var layer = layerFor(doc);
    var doctx = target.closest('[data-sd-doc]');
    var modectx = target.closest('[data-sd-mode]');
    if (doctx) layer.ghost.setAttribute('data-sd-doc', doctx.getAttribute('data-sd-doc'));
    if (modectx) layer.ghost.setAttribute('data-sd-mode', modectx.getAttribute('data-sd-mode'));
  }

  
  function moveGhost(doc, x, y, scroll) {
    var layer = layerFor(doc);
    var win = doc.defaultView;
    scroll = scroll || { x: win.scrollX, y: win.scrollY };
    layer.ghost.style.left = (x + scroll.x + GHOST_OFFSET) + 'px';
    layer.ghost.style.top = (y + scroll.y + GHOST_OFFSET) + 'px';
  }

  
  function regionsFor(spec, doc) {
    var pool = [];
    if (spec && spec.into) {
      var wanted;
      try {
        wanted = doc.querySelectorAll(spec.into);
      } catch (e) {
        wanted = [];
      }
      for (var w = 0; w < wanted.length; w++) {
        if (wanted[w].matches(DROP_TARGET) && acceptsInsert(wanted[w])) pool.push(wanted[w]);
      }
    }
    if (pool.length) return pool;
    var all = doc.querySelectorAll(DROP_TARGET);
    for (var i = 0; i < all.length; i++) {
      if (acceptsInsert(all[i])) pool.push(all[i]);
    }
    return pool;
  }

  var lastRegion = null;   

  function noteRegion(el) {
    var region = closestOf(el, DROP_TARGET);
    if (region && acceptsInsert(region)) lastRegion = region;
  }

  function targetFor(spec, doc) {
    var pool = regionsFor(spec, doc);
    if (lastRegion && pool.indexOf(lastRegion) >= 0) return lastRegion;
    return pool[0] || null;
  }

  
  function startDrag(source, e) {
    var spec = specOf(source);
    if (!spec) return;
    disarm();
    var doc = source.ownerDocument;
    var scroll = { x: doc.defaultView.scrollX, y: doc.defaultView.scrollY };
    drag = { spec: spec, moved: false, mark: null, pointerId: e.pointerId, grip: source };
    showGhost(doc, spec, targetFor(spec, doc));
    moveGhost(doc, e.clientX, e.clientY, scroll);
    try { source.setPointerCapture(e.pointerId); } catch (err) {  }
    source.addEventListener('lostpointercapture', onDragLost);
    doc.addEventListener('pointermove', onDragMove);
    doc.addEventListener('pointerup', endDrag);
    doc.addEventListener('pointercancel', onDragCancel);
  }

  
  function pointerFate(pointerId, e) {
    if (!e) return 'other';
    if (e.pointerId !== undefined && e.pointerId !== pointerId) return 'other';
    if (e.type === 'pointermove' && e.buttons === 0) return 'released';
    return 'ours';
  }

  
  function ofDrag(e) {
    return !!drag && pointerFate(drag.pointerId, e) !== 'other';
  }

  function unwireDrag(doc, d) {
    doc.removeEventListener('pointermove', onDragMove);
    doc.removeEventListener('pointerup', endDrag);
    doc.removeEventListener('pointercancel', onDragCancel);
    if (d && d.grip) d.grip.removeEventListener('lostpointercapture', onDragLost);
  }

  function onDragMove(e) {
    if (!ofDrag(e)) return;
    if (pointerFate(drag.pointerId, e) === 'released') { cancelInsert(); return; }
    var doc = docOf(e.target);
    var win = doc.defaultView;

    
    var scroll = { x: win.scrollX, y: win.scrollY };
    var mark = resolveDrop(doc, e.clientX, e.clientY, drag.spec);
    var at = measureMark(doc, mark);

    var layer = layerFor(doc);
    if (!drag.moved) {
      drag.moved = true;
      layer.ghost.hidden = false;
      announce(doc, 'Dragging ' + drag.spec.label);
    }
    drag.mark = mark;
    moveGhost(doc, e.clientX, e.clientY, scroll);
    if (mark) layer.ghost.removeAttribute('data-sd-refused');
    else layer.ghost.setAttribute('data-sd-refused', '');
    if (mark) showGhostContext(doc, mark.target);
    paintMark(doc, at);
    announce(doc, describeMark(mark, drag.spec));
  }

  function onDragCancel(e) {
    if (ofDrag(e)) cancelInsert();
  }

  
  function onDragLost(e) {
    if (ofDrag(e)) cancelInsert();
  }

  function endDrag(e) {
    if (e && !ofDrag(e)) return;
    var doc = docOf(e && e.target);
    var d = drag;
    unwireDrag(doc, d);
    drag = null;
    teardownChrome(doc);
    if (d) {
      
      if (!d.moved) arm(d.spec.source);
      else if (d.mark) commitInsert(d.mark, d.spec);
      else announce(doc, 'Not a valid place for that — nothing was inserted');
    }
    
    gestureEnded();
  }

  function teardownChrome(doc) {
    var layer = layerFor(doc);
    layer.ghost.hidden = true;
    layer.ghost.removeAttribute('data-sd-refused');
    hideMarks(doc);
  }

  

  
  function stopsFor(target, spec) {
    var blocks = flowBlocks(target);
    var stops = [];
    if (!blocks.length) return [{ mode: 'block', target: target, ref: null, before: true }];

    blocks.forEach(function (block, i) {
      stops.push({ mode: 'block', target: target, ref: block, before: true });
      if (spec.flow !== 'block' && isTextBlock(block)) {
        var walker = target.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
          var text = node.nodeValue;
          var re = /\S+/g;
          var m;
          while ((m = re.exec(text))) {
            stops.push({ mode: 'inline', target: target, node: node, offset: m.index + m[0].length });
          }
        }
      }
      if (i === blocks.length - 1) {
        stops.push({ mode: 'block', target: target, ref: block, before: false });
      }
    });
    return stops;
  }

  function markFromArmed() {
    if (!armed) return null;
    if (armed.point) {
      var at = placementFor(armed.point.x, armed.point.y, armed.spec.size,
        dropBox(armed.target));
      armed.mark = { mode: 'place', target: armed.target, x: at.x, y: at.y, w: at.w, h: at.h };
    } else {
      armed.mark = armed.stops[armed.index] || null;
    }
    return armed.mark;
  }

  function refreshArmed(doc, lead) {
    var mark = markFromArmed();
    revealMark(mark);
    drawMark(doc, mark);
    announce(doc, (lead || '') + describeMark(mark, armed.spec));
  }

  
  function revealMark(mark) {
    if (!mark || mark.mode === 'place') return;
    var el = mark.mode === 'inline' ? mark.node.parentElement : (mark.ref || mark.target);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  
  function steerInto(target, where) {
    var old = armed.target;
    if (old && old !== target) {
      old.removeAttribute('data-sd-dropping');
      if (armed.lent) old.removeAttribute('tabindex');
    }
    if (old !== target) {
      armed.target = target;
      armed.lent = !target.hasAttribute('tabindex');
      target.setAttribute('data-sd-dropping', '');
      if (armed.lent) target.setAttribute('tabindex', '-1');
    }

    if (docTypeOf(target) === 'fixed') {
      
      var r = dropBox(target);
      var x = where && armed.point ? armed.point.x : Math.round(r.width / 2);
      var y = where === 'start' ? 0 : where === 'end' ? 1e6 : Math.round(r.height / 2);
      armed.point = { x: x, y: y };
      armed.stops = null;
    } else {
      armed.point = null;
      armed.stops = stopsFor(target, armed.spec);
      armed.index = where === 'end' ? armed.stops.length - 1 : 0;
    }
  }

  
  function crossRegion(doc, dir) {
    var kind = docTypeOf(armed.target);
    var pool = regionsFor(armed.spec, doc).filter(function (r) {
      return r === armed.target || (docTypeOf(r) === kind && r.getClientRects().length > 0);
    });
    var next = pool[pool.indexOf(armed.target) + dir];
    if (!next) return false;
    steerInto(next, dir > 0 ? 'start' : 'end');
    
    next.focus({ preventScroll: true });
    if (docTypeOf(next) === 'fixed') next.scrollIntoView({ block: dir > 0 ? 'start' : 'end' });
    refreshArmed(doc, 'In ' + regionName(next, dir) + ' — ');
    return true;
  }

  
  function regionName(region, dir) {
    var label = region.getAttribute('aria-label');
    if (label) return label;
    var first = region.firstElementChild;
    if (first && /^H[1-6]$/.test(first.tagName)) return '“' + shortText(first) + '”';
    return dir > 0 ? 'the next sheet' : 'the sheet before';
  }

  
  function arm(source) {
    var spec = specOf(source);
    if (!spec) return;
    var doc = source.ownerDocument;

    if (armed && armed.spec.source === source) { disarm(); announce(doc, 'Insertion cancelled'); return; }
    disarm();

    var target = targetFor(spec, doc);
    if (!target) {
      var undeclared = undeclaredTarget(doc);
      announce(doc, undeclared
        ? 'Nowhere to insert ' + spec.label + ' — the document on this page has not said ' +
          'whether it is a fixed page or a flowing one, and the two take a drop differently. ' +
          'Give it kind="fixed" or kind="flowing".'
        : 'Nowhere to insert ' + spec.label + ' — this page has no drop target');
      return;
    }

    armed = { spec: spec, target: null, stops: null, index: 0, point: null, mark: null, lent: false };
    source.setAttribute('data-sd-armed', '');
    steerInto(target, null);

    target.focus();
    var mark = markFromArmed();
    revealMark(mark);
    drawMark(doc, mark);

    
    announce(doc, spec.label + ' armed — ' + markPhrase(mark) + '. ' + (
      armed.point
        ? 'Arrow keys move it, hold Shift for single pixels, Enter places it, Escape cancels.'
        : 'Arrow keys move the insertion point, up and down by block, Enter places it, Escape cancels.'
    ));
  }

  function disarm() {
    if (!armed) return;
    var doc = armed.spec.source.ownerDocument;
    armed.spec.source.removeAttribute('data-sd-armed');
    armed.target.removeAttribute('data-sd-dropping');
    if (armed.lent) armed.target.removeAttribute('tabindex');
    armed = null;
    hideMarks(doc);
  }

  
  function dropArm(doc) {
    if (!armed) return;
    disarm();
    announce(doc, 'Insertion cancelled');
  }

  
  
  function inArm(el) {
    if (!armed || !el) return false;
    if (el === armed.spec.source || armed.target.contains(el)) return true;
    var region = closestOf(el, DROP_TARGET);
    return !!region && acceptsInsert(region);
  }

  function disarmWithin(root) {
    if (!armed || !root || !root.contains(armed.spec.source)) return;
    dropArm(docOf(root));
  }

  
  function cancelInsert() {
    var doc = document;
    if (armed) doc = armed.spec.source.ownerDocument;
    else if (drag) doc = drag.spec.source.ownerDocument;
    var back = armed ? armed.spec.source : (drag ? drag.spec.source : null);

    if (drag) {
      var d = drag;
      drag = null;
      unwireDrag(doc, d);
    }
    disarm();
    teardownChrome(doc);
    announce(doc, 'Insertion cancelled');
    if (back && back.focus) back.focus();
    gestureEnded();
  }

  function placeArmed() {
    if (!armed) return;
    var doc = armed.target.ownerDocument;
    var spec = armed.spec;
    var mark = markFromArmed();
    var source = spec.source;
    disarm();
    var el = mark ? commitInsert(mark, spec) : null;
    if (!el) { announce(doc, 'Not a valid place for that — nothing was inserted'); }
    
    if (el && (el.tabIndex >= 0 || el.hasAttribute('tabindex'))) el.focus();
    else if (source && source.focus) source.focus();
  }

  var STEER = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Home: 1, End: 1 };

  function steerArmed(e) {
    var doc = armed.target.ownerDocument;

    if (armed.point) {
      var moved = nudgePlacement(armed.point, e.key, e.shiftKey);
      if (!moved) {
        if (e.key === 'Home') moved = { x: 0, y: armed.point.y };
        else if (e.key === 'End') moved = { x: 1e6, y: armed.point.y };
        else return false;
      }
      e.preventDefault();
      
      var was = armed.mark;
      var vertical = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (vertical && was && was.target === armed.target &&
          atEdge(was, vertical) && crossRegion(doc, vertical)) return true;
      armed.point = moved;
      refreshArmed(doc);
      
      armed.point = { x: armed.mark.x + armed.mark.w / 2, y: armed.mark.y + armed.mark.h / 2 };
      return true;
    }

    var i = armed.index;
    var n = armed.stops.length;
    if (e.key === 'ArrowRight') i = Math.min(n - 1, i + 1);
    else if (e.key === 'ArrowLeft') i = Math.max(0, i - 1);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else if (e.key === 'ArrowDown') i = nextBlockStop(armed.stops, i, 1);
    else if (e.key === 'ArrowUp') i = nextBlockStop(armed.stops, i, -1);
    else return false;

    e.preventDefault();
    
    var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
      : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
    if (dir && i === armed.index && crossRegion(doc, dir)) return true;
    armed.index = i;
    refreshArmed(doc);
    return true;
  }

  
  function atEdge(mark, dir) {
    if (dir < 0) return mark.y <= 0;
    return mark.y >= Math.round(dropBox(mark.target).height - mark.h);
  }

  
  function nextBlockStop(stops, from, dir) {
    for (var i = from + dir; i >= 0 && i < stops.length; i += dir) {
      if (stops[i].mode === 'block') return i;
    }
    return dir > 0 ? stops.length - 1 : 0;
  }

  

  
  function wireInsertion(doc) {
    if (doc[WIRED]) return;
    doc[WIRED] = true;

    doc.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var source = e.target.closest(DRAG_SRC);
      if (!source) return;
      
      var control = e.target.closest(INNER_CONTROL);
      if (control && control !== source && source.contains(control)) return;
      e.preventDefault();          
      startDrag(source, e);
    });

    
    doc.addEventListener('pointermove', function (e) {
      if (!armed || drag) return;
      var mark = resolveDrop(doc, e.clientX, e.clientY, armed.spec);
      if (!mark) return;
      armed.mark = mark;
      if (mark.mode === 'place') armed.point = { x: mark.x + mark.w / 2, y: mark.y + mark.h / 2 };
      drawMark(doc, mark);
      announce(doc, describeMark(mark, armed.spec));
    });

    
    doc.addEventListener('click', function (e) {
      if (!armed) return;
      if (e.target.closest(DRAG_SRC) === armed.spec.source) return;
      var target = e.target.closest(DROP_TARGET);
      if (!target) { dropArm(doc); return; }
      e.preventDefault();
      e.stopPropagation();
      var mark = resolveDrop(doc, e.clientX, e.clientY, armed.spec);
      if (mark) armed.mark = mark;
      if (mark && mark.mode === 'place') armed.point = { x: mark.x + mark.w / 2, y: mark.y + mark.h / 2 };
      else if (mark) { armed.stops = [mark]; armed.index = 0; armed.point = null; }
      placeArmed();
    }, true);

    
    doc.addEventListener('focusin', function (e) {
      if (armed && !pressing && !inArm(e.target)) dropArm(doc);
    });

    
    doc.addEventListener('focusin', function (e) { noteRegion(e.target); });
    doc.addEventListener('pointerdown', function (e) { noteRegion(e.target); }, true);

    
    var pressing = false;
    doc.addEventListener('pointerdown', function () { pressing = true; }, true);
    doc.addEventListener('click', function () { pressing = false; }, true);
    doc.addEventListener('keydown', function () { pressing = false; }, true);

    
    doc.addEventListener('keydown', function (e) {
      var source = closestOf(e.target, DRAG_SRC);
      
      var control = source ? e.target.closest(INNER_CONTROL) : null;
      if (control && control !== source && source.contains(control)) source = null;
      if (source && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        arm(source);
        return;
      }

      
      if (!armed || !inArm(e.target)) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); placeArmed(); return; }
      if (STEER[e.key]) steerArmed(e);
    });
  }

  

  
  

  var OBJECT = '[data-sd-object]';

  
  var FIELD = '[data-sd-object="Field"]';

  var PROPS_PANEL = '[data-sd-properties]';
  var SELECTED = 'data-sd-selected';

  
  var PROP_NAME = /^[a-z][a-z0-9-]*$/;

  
  function selectionOf(doc) {
    if (!doc.__sdSelected) doc.__sdSelected = { el: null };
    return doc.__sdSelected;
  }

  
  function inputOf(el) {
    if (!el) return null;
    if (el.matches('input, select, textarea')) return el;
    return el.querySelector('input, select, textarea');
  }

  

  
  function radioGroup(holder, input) {
    if (!holder || !holder.querySelectorAll) return [];
    var all = holder.querySelectorAll('input[type="radio"]');
    var name = input && input.name;
    var out = [];
    for (var i = 0; i < all.length; i++) {
      if (!name || all[i].name === name) out.push(all[i]);
    }
    return out;
  }

  
  
  function radioValue(input) {
    var written = input.getAttribute('value');
    return written == null ? '' : written;
  }

  function chosenRadio(radios, value) {
    if (!radios || !radios.length) return null;
    var i;
    if (value != null) {
      for (i = 0; i < radios.length; i++) if (radioValue(radios[i]) === value) return radios[i];
    }
    for (i = 0; i < radios.length; i++) if (radios[i].defaultChecked) return radios[i];
    return radios[0];
  }

  
  function slotFor(obj, prop) {
    var all = obj.querySelectorAll('[data-sd-slot]');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-sd-slot') === prop) return all[i];
    }
    return null;
  }

  
  function slotText(slot) {
    return slot.querySelector('[data-sd-slot-text]') || slot;
  }

  
  function objectName(obj) {
    var label = obj.getAttribute('data-sd-label');
    if (label) return label;
    var text = (obj.textContent || '').replace(/\s+/g, ' ').trim();
    return text || obj.getAttribute('data-sd-object') || 'Object';
  }

  
  function accessibleName(obj) {
    return objectName(obj) + (obj.hasAttribute('data-sd-required') ? ', required' : '');
  }

  
  function nameObject(obj) {
    if (!obj || !obj.hasAttribute || !obj.hasAttribute('aria-label')) return null;
    obj.setAttribute('aria-label', accessibleName(obj));
    return obj;
  }

  function objectKind(obj) {
    return obj.getAttribute('data-sd-object') || 'Object';
  }

  
  function objectType(obj) {
    return obj.getAttribute('data-sd-object-type') || null;
  }

  
  function typeLabel(type) {
    var text = String(type == null ? '' : type).replace(/-+/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }

  

  
  function panelScope(panel) {
    var sel = panel.getAttribute('data-sd-properties');
    if (!sel) return null;
    var found;
    try {
      found = panel.ownerDocument.querySelectorAll(sel);
    } catch (e) {
      found = [];
    }
    return found.length ? found : null;
  }

  function panelTakes(panel, obj) {
    var scope = panelScope(panel);
    if (!scope) return true;
    for (var i = 0; i < scope.length; i++) if (scope[i].contains(obj)) return true;
    return false;
  }

  function panelsFor(doc, obj) {
    return Array.prototype.filter.call(doc.querySelectorAll(PROPS_PANEL), function (panel) {
      return !obj || panelTakes(panel, obj);
    });
  }

  

  
  var NATIVE_PROPS = {
    'default-state': { attr: 'aria-checked', on: 'selected', off: 'normal', set: 'true', clear: 'false' }
  };

  function nativeProp(prop) {
    return Object.prototype.hasOwnProperty.call(NATIVE_PROPS, prop) ? NATIVE_PROPS[prop] : null;
  }

  
  function propValue(obj, prop) {
    var n = nativeProp(prop);
    if (!n) return obj.getAttribute('data-sd-' + prop);
    return obj.getAttribute(n.attr) === n.set ? n.on : n.off;
  }

  
  function propOn(obj, prop) {
    var n = nativeProp(prop);
    if (!n) return obj.hasAttribute('data-sd-' + prop);
    return obj.getAttribute(n.attr) === n.set;
  }

  
  function applyProp(obj, prop, value) {
    if (!obj || !PROP_NAME.test(prop)) return null;
    var attr = 'data-sd-' + prop;

    
    if (isGeomProp(prop)) {
      if (applyGeom(obj, prop, value) === null) return null;
      obj.dispatchEvent(new CustomEvent('sd-property-change', {
        bubbles: true,
        detail: { object: obj, property: prop, value: value }
      }));
      return obj;
    }

    
    var native = nativeProp(prop);
    if (native) {
      obj.setAttribute(native.attr, String(value) === native.on ? native.set : native.clear);
    } else if (value === true || value === false) {
      if (value) obj.setAttribute(attr, '');
      else obj.removeAttribute(attr);
    } else {
      var text = String(value == null ? '' : value).trim();
      if (text) obj.setAttribute(attr, text);
      else obj.removeAttribute(attr);
      var slot = slotFor(obj, prop);
      if (slot) slotText(slot).textContent = text;
    }

    
    nameObject(obj);

    obj.dispatchEvent(new CustomEvent('sd-property-change', {
      bubbles: true,
      detail: { object: obj, property: prop, value: value }
    }));
    refreshCounts(obj.ownerDocument);
    return obj;
  }

  
  function requiredObjects(root) {
    root = root || document;
    return Array.prototype.slice.call(root.querySelectorAll(FIELD + '[data-sd-required]'));
  }

  
  function countScopes(out, doc) {
    var panel = out.closest(PROPS_PANEL);
    var scoped = panel && panelScope(panel);
    if (scoped) return Array.prototype.slice.call(scoped);
    return [out.closest('[data-sd-doc]') || doc];
  }

  function refreshCounts(doc) {
    each(doc.querySelectorAll('[data-sd-count]'), function (out) {
      var what = out.getAttribute('data-sd-count');
      var n = 0;
      countScopes(out, doc).forEach(function (scope) {
        n += what === 'required'
          ? requiredObjects(scope).length
          : scope.querySelectorAll(FIELD).length;
      });
      out.textContent = String(n);
    });
  }

  

  
  
  
  function geometryKind(obj) {
    var doc = obj && obj.closest && obj.closest('[data-sd-doc]');
    return doc && doc.getAttribute('data-sd-doc') === 'fixed' ? 'placed' : 'inline';
  }

  
  function paintGeometry(obj, box) {
    if (!obj || !obj.ownerDocument) return;
    box = box || geomOf(obj);
    panelsFor(obj.ownerDocument, obj).forEach(function (panel) {
      each(panel.querySelectorAll('[data-sd-prop]'), function (holder) {
        var prop = holder.getAttribute('data-sd-prop');
        if (!isGeomProp(prop)) return;
        var input = inputOf(holder);
        if (input) input.value = String(box[prop]);
      });
    });
  }

  
  
  function paintAxis(panel, forAttr, value) {
    each(panel.querySelectorAll('[' + forAttr + ']'), function (block) {
      var wanted = (block.getAttribute(forAttr) || '').trim().split(/\s+/);
      if (!value || wanted.indexOf(value) < 0) block.setAttribute('data-sd-off', '');
    });
  }

  
  function paintBlocks(panel, obj) {
    each(
      panel.querySelectorAll('[data-sd-for-kind], [data-sd-for-type]'),
      function (block) { block.removeAttribute('data-sd-off'); }
    );
    paintAxis(panel, 'data-sd-for-kind', obj ? objectKind(obj) : null);
    paintAxis(panel, 'data-sd-for-type', obj ? objectType(obj) : null);
  }

  function paintPanel(panel, obj) {
    if (!obj) {
      
      panel.removeAttribute('data-sd-selection');
      return;
    }
    panel.setAttribute('data-sd-selection', '');

    paintBlocks(panel, obj);

    each(panel.querySelectorAll('[data-sd-panel-slot]'), function (out) {
      var which = out.getAttribute('data-sd-panel-slot');
      
      if (which === 'type' || which === 'kind') out.textContent = typeLabel(objectType(obj)) || objectKind(obj);
      else if (which === 'name') out.textContent = objectName(obj);
    });

    each(panel.querySelectorAll('[data-sd-prop]'), function (holder) {
      var prop = holder.getAttribute('data-sd-prop');
      var input = inputOf(holder);
      if (!input || !PROP_NAME.test(prop)) return;
      if (input.type === 'radio') {
        
        var group = radioGroup(holder, input);
        var chosen = chosenRadio(group, propValue(obj, prop));
        for (var i = 0; i < group.length; i++) group[i].checked = group[i] === chosen;
      } else if (input.type === 'checkbox') {
        input.checked = propOn(obj, prop);
      } else {
        input.value = propValue(obj, prop) || '';
      }
    });

    
    var placement = geometryKind(obj);
    each(panel.querySelectorAll('[data-sd-geom]'), function (block) {
      block.setAttribute('data-sd-geometry', placement);
    });

    
    if (placement !== 'inline') paintGeometry(obj);
  }

  

  
  function selectObject(obj, doc) {
    doc = doc || docOf(obj);
    var state = selectionOf(doc);

    
    if (state.el && !doc.contains(state.el)) state.el = null;
    if (obj && (!obj.matches || !obj.matches(OBJECT) || !inEditor(obj))) return null;
    if (state.el === (obj || null)) return state.el;

    var was = state.el;
    if (state.el) state.el.removeAttribute(SELECTED);
    state.el = obj || null;

    if (obj) obj.setAttribute(SELECTED, '');

    
    var took = panelsFor(doc, obj);
    took.forEach(function (panel) { paintPanel(panel, obj); });
    
    if (obj) {
      each(doc.querySelectorAll(PROPS_PANEL), function (panel) {
        if (!panelTakes(panel, obj)) paintPanel(panel, null);
      });
    }

    
    each(doc.querySelectorAll(PROPS_PANEL), function (panel) {
      showSide(panel, panel.hasAttribute('data-sd-selection'), was);
    });

    refreshCounts(doc);

    
    syncRig(obj, doc);

    if (obj) {
      
      announce(doc, describeSelection(objectName(obj), objectKind(obj), took.length));
    } else {
      announce(doc, 'Properties closed');
    }
    return obj || null;
  }

  
  function deselectObject(doc) {
    selectObject(null, doc || document);
    return null;
  }

  
  function selectedObject(doc) {
    return selectionOf(doc || document).el;
  }

  

  
  
  function describeSelection(name, kind, panels) {
    return name + ' selected — ' + String(kind).toLowerCase() + '. ' +
      (panels > 0 ? 'Its settings are open.' : 'There are no settings for it here.') +
      ' Escape deselects.';
  }

  function describeWrite(prop, value, name) {
    var label = prop.replace(/-/g, ' ');
    if (value === true) return name + ': ' + label + ' on';
    if (value === false) return name + ': ' + label + ' off';
    var text = String(value == null ? '' : value).trim();
    return text ? name + ': ' + label + ' is now “' + text + '”'
                : name + ': ' + label + ' cleared';
  }

  

  var SELECT_WIRED = '__sdSelectionWired';

  
  function readControl(holder, input) {
    if (input.type === 'radio') {
      var group = radioGroup(holder, input);
      for (var i = 0; i < group.length; i++) if (group[i].checked) return radioValue(group[i]);
      return '';
    }
    if (input.type === 'checkbox') return input.checked;
    return input.value;
  }

  
  function writeFromControl(doc, e) {
    var holder = closestOf(e.target, '[data-sd-prop]');
    if (!holder) return null;
    var panel = holder.closest(PROPS_PANEL);
    if (!panel) return null;
    var obj = selectionOf(doc).el;
    if (!obj || !doc.contains(obj) || !panelTakes(panel, obj)) return null;
    var input = inputOf(e.target) || inputOf(holder);
    if (!input) return null;
    var prop = holder.getAttribute('data-sd-prop');
    var value = readControl(holder, input);
    applyProp(obj, prop, value);
    return { obj: obj, prop: prop, value: value };
  }

  
  function escapeSelection(doc) {
    var was = selectionOf(doc).el;
    if (!was) return false;
    selectObject(null, doc);
    if (was.focus) was.focus();
    return true;
  }

  function wireSelection(doc) {
    if (doc[SELECT_WIRED]) return;
    doc[SELECT_WIRED] = true;

    doc.addEventListener('click', function (e) {
      
      if (placedPress) { placedPress = false; return; }

      
      if (e.target.closest('[data-sd-panel-close]')) {
        escapeSelection(doc);
        return;
      }

      
      if (e.target.closest(PROPS_PANEL)) return;

      var obj = e.target.closest(OBJECT);
      if (obj && inEditor(obj)) {
        selectObject(obj);
        
        if (obj.tabIndex >= 0 || obj.hasAttribute('tabindex')) obj.focus();
        return;
      }
      if (obj) return;              

      
      var docCtx = e.target.closest('[data-sd-doc], [data-sd-drop]');
      if (docCtx && inEditor(docCtx) && selectionOf(doc).el) selectObject(null, doc);
    });

    doc.addEventListener('input', function (e) { writeFromControl(doc, e); });

    doc.addEventListener('change', function (e) {
      var wrote = writeFromControl(doc, e);
      if (!wrote) return;

      
      if (isGeomProp(wrote.prop)) {
        paintGeometry(wrote.obj);
        announceBox(wrote.obj, 'is now');
        return;
      }
      announce(doc, describeWrite(wrote.prop, wrote.value, objectName(wrote.obj)));
    });

    
    doc.addEventListener('keydown', function (e) {
      var obj = closestOf(e.target, OBJECT);
      if (!obj || !inEditor(obj)) return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        selectObject(obj);
        return;
      }
      
      if (e.key === ' ' && obj.getAttribute('role') === 'button') {
        e.preventDefault();
        selectObject(obj);
      }
    });

    
    doc.addEventListener('sd-insert', function (e) {
      var el = e.detail && e.detail.element;
      if (el && el.matches && el.matches(OBJECT)) selectObject(el);
    });
  }

  

  

  

  var HELP_ICON = '.sd-help-icon';
  var HELP_BUTTON = '.sd-help-icon__button';
  var HELP_BUBBLE = '.sd-popover';
  var HELP_DISMISSED = 'data-sd-dismissed';
  var HELP_ICONS_WIRED = '__sdHelpIconsWired';

  
  function linkHelpIcon(icon) {
    var button = icon.querySelector(HELP_BUTTON);
    var bubble = icon.querySelector(HELP_BUBBLE);
    if (!button || !bubble) return;
    if (!bubble.id) bubble.id = uid('sd-help');
    addToken(button, 'aria-describedby', bubble.id);
  }

  
  function helpBubbleShowing(icon) {
    if (icon.hasAttribute(HELP_DISMISSED) || !icon.querySelector(HELP_BUBBLE)) return false;
    var button = icon.querySelector(HELP_BUTTON);
    if (icon.matches(':hover')) return true;
    if (!button) return false;
    var doc = icon.ownerDocument;
    var focused = doc && doc.activeElement === button;
    if (focused && icon.hasAttribute('data-sd-open-at-rest')) return true;
    try { return button.matches(':focus-visible'); } catch (err) { return focused; }
  }

  
  function dismissHelpIcons(doc, target) {
    var icons = Array.prototype.slice.call(doc.querySelectorAll(HELP_ICON + ':hover'));
    var own = closestOf(target, HELP_ICON);
    if (own && icons.indexOf(own) === -1) icons.push(own);
    var hid = 0;
    icons.forEach(function (icon) {
      if (!helpBubbleShowing(icon)) return;
      icon.setAttribute(HELP_DISMISSED, '');
      hid++;
    });
    return hid;
  }

  

  

  var HELP_SHIFT = '--sd-help-shift';
  var HELP_ARROW = '.sd-popover__arrow';
  var HELP_PLACEMENT = /(^|\s)sd-popover--(bottom-center|bottom-left|bottom-right|top-center|left|right)(\s|$)/;
  var HELP_SIDE_BUBBLE = /(^|\s)sd-popover--(left|right)(\s|$)/;
  var HELP_PREFERRED_PLACEMENT = 'data-sd-help-preferred-placement';

  function helpBubblePlacement(preferred, width, icon, box) {
    var rightFits = icon.right + 10 + width <= box.right;
    var leftFits = icon.left - 10 - width >= box.left;
    if (preferred === 'left') return rightFits ? 'left' : leftFits ? 'right' : 'top-center';
    if (preferred === 'right') return leftFits ? 'right' : rightFits ? 'left' : 'top-center';
    return preferred;
  }

  function setHelpBubblePlacement(bubble, placement) {
    bubble.className = bubble.className.replace(HELP_PLACEMENT, '$1sd-popover--' + placement);
  }

  function preferredHelpBubblePlacement(bubble) {
    var preferred = bubble.getAttribute(HELP_PREFERRED_PLACEMENT);
    if (preferred) return preferred;
    var match = String(bubble.className).match(HELP_PLACEMENT);
    preferred = match ? match[2] : '';
    if (preferred) bubble.setAttribute(HELP_PREFERRED_PLACEMENT, preferred);
    return preferred;
  }

  
  function helpBubbleShift(left, width, box, point, inset) {
    var seen = box.seen || box;
    if (point !== null && (point < seen.left || point > seen.right)) return 0;
    var dx = 0;
    if (left < box.left) dx = box.left - left;
    else if (left + width > box.right) dx = Math.max(box.right - (left + width), box.left - left);
    if (point !== null) {
      var at = point - left;
      dx = Math.min(Math.max(dx, at - (width - inset)), at - inset);
    }
    
    return (dx < 0 ? -1 : 1) * Math.ceil(Math.abs(dx) * 64 - 1e-6) / 64 || 0;
  }

  
  function helpBubbleRoom(box) {
    return Math.floor(box.right - box.left - 1 / 64);
  }

  
  function helpClipSpan(rect, borderLeft, borderRight, clientWidth, rtl) {
    var bar = (rect.right - rect.left - borderLeft - borderRight) - clientWidth;
    bar = bar < 1 ? 0 : Math.ceil(bar);
    return {
      left: rect.left + borderLeft + (rtl ? bar : 0),
      right: rect.right - borderRight - (rtl ? 0 : bar)
    };
  }

  
  function helpBubbleBox(icon, view) {
    var doc = icon.ownerDocument;
    var gutter = parseFloat(view.getComputedStyle(doc.documentElement).getPropertyValue('--sd-space-16')) || 0;
    var seen = { left: 0, right: doc.documentElement.clientWidth };
    for (var el = icon.parentElement; el && el !== doc.body && el !== doc.documentElement; el = el.parentElement) {
      var cs = view.getComputedStyle(el);
      if (cs.overflowX === 'visible') continue;
      var span = helpClipSpan(el.getBoundingClientRect(),
        parseFloat(cs.borderLeftWidth) || 0, parseFloat(cs.borderRightWidth) || 0,
        el.clientWidth, cs.direction === 'rtl');
      seen.left = Math.max(seen.left, span.left);
      seen.right = Math.min(seen.right, span.right);
    }
    return {
      left: Math.max(seen.left, gutter),
      right: Math.min(seen.right, doc.documentElement.clientWidth - gutter),
      seen: seen
    };
  }

  
  function placeHelpBubble(icon) {
    var doc = icon.ownerDocument;
    var view = doc && doc.defaultView;
    var bubble = icon.querySelector(HELP_BUBBLE);
    if (!view || !bubble) return;
    if (view.getComputedStyle(bubble).display === 'none') return;
    var box = helpBubbleBox(icon, view);
    var preferred = preferredHelpBubblePlacement(bubble);
    if (preferred) setHelpBubblePlacement(bubble, preferred);
    if (HELP_SIDE_BUBBLE.test(bubble.className)) {
      var sideIcon = icon.getBoundingClientRect();
      var placement = helpBubblePlacement(preferred, bubble.getBoundingClientRect().width, sideIcon, box);
      if (placement !== preferred) setHelpBubblePlacement(bubble, placement);
    }
    
    bubble.style.removeProperty('max-width');
    var room = helpBubbleRoom(box);
    if (room > 0 && bubble.getBoundingClientRect().width > room) bubble.style.maxWidth = room + 'px';
    var was = parseFloat(bubble.style.getPropertyValue(HELP_SHIFT)) || 0;
    var r = bubble.getBoundingClientRect();
    var point = null;
    var inset = 0;
    var arrow = bubble.querySelector(HELP_ARROW);
    if (arrow) {
      var i = icon.getBoundingClientRect();
      var content = arrow.previousElementSibling || bubble;
      point = i.left + i.width / 2;
      inset = arrow.offsetWidth / 2 + (parseFloat(view.getComputedStyle(content).borderTopLeftRadius) || 0);
    }
    var dx = helpBubbleShift(r.left - was, r.width, box, point, inset);
    if (Math.abs(dx - was) < 0.01) return;
    if (dx) bubble.style.setProperty(HELP_SHIFT, dx + 'px');
    else bubble.style.removeProperty(HELP_SHIFT);
  }

  function placeHelpBubbles(doc) {
    each(doc.querySelectorAll(HELP_ICON), placeHelpBubble);
  }

  function wireHelpIcons(doc) {
    if (!doc || doc[HELP_ICONS_WIRED]) return;
    doc[HELP_ICONS_WIRED] = true;

    
    doc.addEventListener('pointerover', function (e) {
      var icon = closestOf(e.target, HELP_ICON);
      if (icon) placeHelpBubble(icon);
    });
    doc.addEventListener('focusin', function (e) {
      var icon = closestOf(e.target, HELP_ICON);
      if (icon) placeHelpBubble(icon);
    });
    var view = doc.defaultView;
    if (view) view.addEventListener('resize', function () { placeHelpBubbles(doc); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { placeHelpBubbles(doc); });

    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      
      if (e.defaultPrevented || browserClosesOnEscape(doc)) return;
      if (!dismissHelpIcons(doc, e.target)) return;
      e.preventDefault();
    }, true);

    
    doc.addEventListener('focusout', function (e) {
      var icon = closestOf(e.target, HELP_ICON);
      if (!icon || !icon.hasAttribute(HELP_DISMISSED)) return;
      if (e.relatedTarget && icon.contains(e.relatedTarget)) return;
      if (!icon.matches(':hover')) icon.removeAttribute(HELP_DISMISSED);
    });
    doc.addEventListener('mouseout', function (e) {
      var icon = closestOf(e.target, HELP_ICON);
      if (!icon || !icon.hasAttribute(HELP_DISMISSED)) return;
      if (e.relatedTarget && icon.contains(e.relatedTarget)) return;
      if (!icon.contains(doc.activeElement)) icon.removeAttribute(HELP_DISMISSED);
    });

    
    doc.addEventListener('focusin', function (e) {
      var icon = closestOf(e.target, HELP_ICON);
      if (icon) linkHelpIcon(icon);
    });
  }

  

  

  

  var BREADCRUMB_STEP = '.sd-breadcrumb-step';
  var BREADCRUMB_ITEM = '.sd-breadcrumb-step__item';
  var BREADCRUMB_LINK = '.sd-breadcrumb-step__link';
  var BREADCRUMB_LABEL = '.sd-breadcrumb-step__label';
  var BREADCRUMB_VALUE = '.sd-breadcrumb-step__value';
  var BREADCRUMB_SHORT = '.sd-breadcrumb-step__short';
  var BREADCRUMB_ID = 'sd-breadcrumb-step--account-id';
  var BREADCRUMB_OBJECT = 'sd-breadcrumb-step--object';
  var BREADCRUMB_TRUNCATED = 'data-sd-truncated';
  var BREADCRUMB_SHORTENED = 'data-sd-shortened';
  var BREADCRUMB_DISMISSED = 'data-sd-dismissed';
  var BREADCRUMB_TABSTOP = '__sdBreadcrumbTabStop';
  var BREADCRUMB_WIRED = '__sdBreadcrumbsWired';

  
  var BREADCRUMB_ID_PROVIDERS = ['google-sheets'];

  
  function shortenAccountId(id) {
    var value = String(id || '').trim();
    if (/^\d+$/.test(value)) {
      return value.length > 5 ? '…' + value.slice(-4) : value;
    }
    return value.length > 7 ? value.slice(0, 4) + '…' + value.slice(-2) : value;
  }

  
  function shortensAccountIds(provider) {
    return BREADCRUMB_ID_PROVIDERS.indexOf(provider) !== -1;
  }

  
  function breadcrumbProvider(step) {
    var list = step.parentElement;
    var own = list && list.querySelector('[data-sd-provider]');
    return own ? own.getAttribute('data-sd-provider') : '';
  }

  
  function markBreadcrumbTruncated(step, cut) {
    var link = step.querySelector(BREADCRUMB_LINK);
    if (cut) step.setAttribute(BREADCRUMB_TRUNCATED, '');
    else step.removeAttribute(BREADCRUMB_TRUNCATED);
    if (!link || link.tagName === 'A') return;
    if (cut && !link.hasAttribute('tabindex')) {
      link.setAttribute('tabindex', '0');
      link[BREADCRUMB_TABSTOP] = true;
    } else if (!cut && link[BREADCRUMB_TABSTOP]) {
      link.removeAttribute('tabindex');
      link[BREADCRUMB_TABSTOP] = false;
    }
  }

  
  function shortenBreadcrumbId(step) {
    var value = step.querySelector(BREADCRUMB_VALUE);
    var short = step.querySelector(BREADCRUMB_SHORT);
    if (!value || !short) return;
    var whole = value.textContent.trim();
    var cut = shortensAccountIds(breadcrumbProvider(step)) ? shortenAccountId(whole) : whole;
    if (cut !== whole) {
      short.textContent = cut;
      step.setAttribute(BREADCRUMB_SHORTENED, '');
    } else {
      short.textContent = '';
      step.removeAttribute(BREADCRUMB_SHORTENED);
    }
    markBreadcrumbTruncated(step, cut !== whole);
  }

  
  function measureBreadcrumbObject(step) {
    var label = step.querySelector(BREADCRUMB_LABEL);
    if (!label) return;
    markBreadcrumbTruncated(step, label.scrollWidth > label.clientWidth + 0.5);
  }

  
  function wireBreadcrumbStep(step) {
    if (step.classList.contains(BREADCRUMB_ID)) shortenBreadcrumbId(step);
    if (!step.classList.contains(BREADCRUMB_OBJECT)) return;
    measureBreadcrumbObject(step);
    if (step.__sdBreadcrumbObserved) return;
    var view = step.ownerDocument && step.ownerDocument.defaultView;
    if (!view || !view.ResizeObserver) return;
    step.__sdBreadcrumbObserved = true;
    new view.ResizeObserver(function () { measureBreadcrumbObject(step); })
      .observe(step.querySelector(BREADCRUMB_LABEL) || step);
  }

  
  function breadcrumbBubbleShowing(step) {
    if (!step.hasAttribute(BREADCRUMB_TRUNCATED) || step.hasAttribute(BREADCRUMB_DISMISSED)) return false;
    var item = step.querySelector(BREADCRUMB_ITEM);
    var link = step.querySelector(BREADCRUMB_LINK);
    if (item && item.matches(':hover')) return true;
    if (!link) return false;
    var doc = step.ownerDocument;
    var focused = doc && doc.activeElement === link;
    if (focused && step.hasAttribute('data-sd-open-at-rest')) return true;
    try { return link.matches(':focus-visible'); } catch (err) { return focused; }
  }

  
  function placeBreadcrumbBubble(step) {
    var item = step.querySelector(BREADCRUMB_ITEM);
    if (item && step.hasAttribute(BREADCRUMB_TRUNCATED)) placeHelpBubble(item);
  }

  
  function placeBreadcrumbBubblesAtRest(root) {
    each(root.querySelectorAll(BREADCRUMB_STEP + '[data-sd-open-at-rest]'), placeBreadcrumbBubble);
  }

  function rewireBreadcrumbs(doc) {
    each(doc.querySelectorAll(BREADCRUMB_STEP), wireBreadcrumbStep);
    placeBreadcrumbBubblesAtRest(doc);
  }

  function wireBreadcrumbs(doc) {
    if (!doc || doc[BREADCRUMB_WIRED]) return;
    doc[BREADCRUMB_WIRED] = true;

    doc.addEventListener('pointerover', function (e) {
      var step = closestOf(e.target, BREADCRUMB_STEP);
      if (step) placeBreadcrumbBubble(step);
    });
    doc.addEventListener('focusin', function (e) {
      var step = closestOf(e.target, BREADCRUMB_STEP);
      if (step) placeBreadcrumbBubble(step);
    });
    
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { rewireBreadcrumbs(doc); });
    var view = doc.defaultView;
    if (view) view.addEventListener('resize', function () { placeBreadcrumbBubblesAtRest(doc); });

    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (e.defaultPrevented || browserClosesOnEscape(doc)) return;
      var steps = Array.prototype.slice.call(doc.querySelectorAll(BREADCRUMB_STEP));
      var hid = 0;
      steps.forEach(function (step) {
        var own = step.contains(e.target);
        if (!own && !step.matches(':hover')) return;
        if (!breadcrumbBubbleShowing(step)) return;
        step.setAttribute(BREADCRUMB_DISMISSED, '');
        hid++;
      });
      if (hid) e.preventDefault();
    }, true);

    
    doc.addEventListener('focusout', function (e) {
      var step = closestOf(e.target, BREADCRUMB_STEP);
      if (!step || !step.hasAttribute(BREADCRUMB_DISMISSED)) return;
      if (e.relatedTarget && step.contains(e.relatedTarget)) return;
      if (!step.matches(':hover')) step.removeAttribute(BREADCRUMB_DISMISSED);
    });
    doc.addEventListener('mouseout', function (e) {
      var step = closestOf(e.target, BREADCRUMB_STEP);
      if (!step || !step.hasAttribute(BREADCRUMB_DISMISSED)) return;
      if (e.relatedTarget && step.contains(e.relatedTarget)) return;
      if (!step.contains(doc.activeElement)) step.removeAttribute(BREADCRUMB_DISMISSED);
    });
  }

  

  
  

  
  var MENU = '[role="menu"]';
  var MENU_ITEM = '[role="menuitem"]';
  var MENU_WIRED = '__sdMenuWired';

  function menuItems(menu) {
    return Array.prototype.filter.call(menu.querySelectorAll(MENU_ITEM), function (b) {
      return !b.disabled;
    });
  }

  
  function openPopoverOf(menu) {
    var pop = menu && menu.closest ? menu.closest('[popover]') : null;
    if (!pop) return null;
    try { return pop.matches(':popover-open') ? pop : null; } catch (err) { return null; }
  }

  
  function popoverInvoker(pop) {
    if (!pop || !pop.id || !pop.ownerDocument) return null;
    return pop.ownerDocument.querySelector('[popovertarget="' + pop.id + '"]');
  }

  function menuKeydown(e) {
    var menu = closestOf(e.target, MENU);
    if (!menu) return;

    
    if (e.key === 'Tab') {
      var pop = openPopoverOf(menu);
      if (!pop) return;
      var invoker = popoverInvoker(pop);
      pop.hidePopover();
      if (invoker && invoker.focus && pop.ownerDocument.activeElement !== invoker) invoker.focus();
      if (e.shiftKey && invoker) e.preventDefault();
      return;
    }

    var list = menuItems(menu);
    var at = rovingStep(list.length, list.indexOf(e.target.closest(MENU_ITEM)), e.key, 'vertical');
    if (at < 0) return;
    e.preventDefault();
    rove(list, list[at]);
    list[at].focus();
  }

  
  function menuFocusin(e) {
    var item = closestOf(e.target, MENU_ITEM);
    var menu = item ? item.closest(MENU) : null;
    if (menu) rove(menuItems(menu), item);
  }

  
  function roveMenus(root) {
    each(root.querySelectorAll(MENU), function (menu) {
      var list = menuItems(menu);
      if (list.length) rove(list, list[0]);
    });
  }

  function menuClick(e) {
    var item = closestOf(e.target, MENU_ITEM);
    if (!item || item.disabled) return;
    var pop = item.closest('[popover]');
    if (pop && pop.matches(':popover-open')) pop.hidePopover();
  }

  
  function menuToggle(e) {
    if (e.newState !== 'open') return;
    if (!e.target || !e.target.hasAttribute || !e.target.hasAttribute('popover')) return;
    var menu = e.target && e.target.querySelector ? e.target.querySelector(MENU) : null;
    if (!menu) return;
    var first = menuItems(menu)[0];
    if (first) first.focus();
  }

  function wireMenus(doc) {
    if (!doc || doc[MENU_WIRED]) return;
    doc[MENU_WIRED] = true;
    doc.addEventListener('keydown', menuKeydown);
    doc.addEventListener('focusin', menuFocusin);
    doc.addEventListener('click', menuClick);
    doc.addEventListener('toggle', menuToggle, true);
  }

  
  function openMenusAtRest(root) {
    each(root.querySelectorAll('[popover][data-sd-open-at-rest]'), function (pop) {
      if (!pop.querySelector(MENU) || !pop.showPopover) return;
      if (!pop.matches(':popover-open')) {
        try { pop.showPopover(); } catch (err) {  }
      }
    });
  }

  

  

  var CHIP_LIST = '.sd-text-chips';
  var CHIP_ITEMS = '.sd-text-chips__list';
  var CHIP_INPUT = '.sd-text-chips__input';
  var CHIP_TEMPLATE = 'template[data-sd-chip]';
  var CHIP_VALUE = '[data-sd-chip-value]';

  

  
  function chipOf(items, node) {
    while (node && node.parentNode !== items) node = node.parentNode;
    return node || null;
  }

  
  function removeOf(chip) {
    return chip && chip.querySelector ? chip.querySelector('button') : null;
  }

  
  function wireChipList(list) {
    if (list[WIRED]) return;
    list[WIRED] = true;

    list.addEventListener('click', function (e) {
      var items = list.querySelector(CHIP_ITEMS);
      var button = closestOf(e.target, 'button');
      if (!items || !button || !items.contains(button) || button.disabled) return;
      var chip = chipOf(items, button);
      if (!chip) return;

      var go = chip.dispatchEvent(new CustomEvent('sd:remove', { bubbles: true, cancelable: true }));
      if (!go) return;

      
      var next = removeOf(chip.nextElementSibling) ||
        removeOf(chip.previousElementSibling) ||
        list.querySelector(CHIP_INPUT) || emptyListTarget(list);
      chip.remove();
      if (next) next.focus();
    });

    
    var input = list.querySelector(CHIP_INPUT);
    if (input) wireChipInput(list, input);
  }

  function emptyListTarget(list) {
    var items = list.querySelector(CHIP_ITEMS);
    if (!items) return null;
    if (!items.hasAttribute('tabindex')) items.setAttribute('tabindex', '-1');
    return items;
  }

  

  
  function wireChipInput(list, input) {
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      addChip(list, input);
    });
  }

  
  function addChip(list, input) {
    var value = input.value.trim();
    if (!value) return;
    
    input.value = value;
    if (input.checkValidity && !input.checkValidity()) {
      if (input.reportValidity) input.reportValidity();
      return;
    }

    var go = list.dispatchEvent(new CustomEvent('sd:add', {
      bubbles: true, cancelable: true, detail: { value: value }
    }));
    if (!go) return;

    var items = list.querySelector(CHIP_ITEMS);
    var chip = buildChip(list, value);
    if (!items || !chip) return;
    items.appendChild(chip);
    
    input.value = '';
  }

  
  function buildChip(list, value) {
    var template = list.querySelector(CHIP_TEMPLATE);
    var blank = template && template.content.firstElementChild;
    if (!blank) return null;
    var chip = blank.cloneNode(true);
    var slot = chip.querySelector(CHIP_VALUE);
    if (slot) {
      slot.textContent = value;
      slot.removeAttribute('data-sd-chip-value');
    }
    var remove = removeOf(chip);
    if (remove) remove.setAttribute('aria-label', 'Remove ' + value);
    return chip;
  }

  

  

  

  var MODAL = 'dialog.sd-modal';
  var MODAL_OPEN = 'data-sd-modal-open';
  var MODAL_CLOSE = 'data-sd-modal-close';
  var MODAL_WIRED = '__sdModalWired';
  var MODAL_TRIGGER = '__sdModalTrigger';

  
  function modalReturnTarget(trigger) {
    if (!trigger || !trigger.isConnected) return null;
    var pop = trigger.closest('[popover]');
    var open = false;
    try { open = !!pop && pop.matches(':popover-open'); } catch (err) { open = false; }
    if (pop && !open && pop.id) {
      var doc = trigger.ownerDocument;
      var invokers = doc.querySelectorAll('[popovertarget]');
      for (var i = 0; i < invokers.length; i++) {
        if (invokers[i].getAttribute('popovertarget') === pop.id) return invokers[i];
      }
    }
    return trigger;
  }

  function modalClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;

    var closer = t.closest('[' + MODAL_CLOSE + ']');
    var inside = closer && closer.closest(MODAL);
    if (inside && !closer.disabled) {
      inside.close(closer.getAttribute(MODAL_CLOSE) || '');
      return;
    }

    var trigger = t.closest('[' + MODAL_OPEN + ']');
    if (!trigger || trigger.disabled) return;
    var doc = trigger.ownerDocument;
    var dialog = doc.getElementById(trigger.getAttribute(MODAL_OPEN));
    if (!dialog || !dialog.matches(MODAL) || dialog.open || !dialog.showModal) return;
    e.preventDefault();
    dialog[MODAL_TRIGGER] = trigger;
    dialog.returnValue = '';
    dialog.showModal();
  }

  
  function modalClosed(e) {
    var dialog = e.target;
    if (!dialog || !dialog.matches || !dialog.matches(MODAL)) return;
    var trigger = dialog[MODAL_TRIGGER];
    dialog[MODAL_TRIGGER] = null;
    var doc = dialog.ownerDocument;
    var active = doc.activeElement;
    if (active && active !== doc.body && !dialog.contains(active)) return;
    var target = modalReturnTarget(trigger);
    if (target && target.focus) target.focus();
  }

  function wireModals(doc) {
    if (!doc || doc[MODAL_WIRED] || !doc.addEventListener) return;
    doc[MODAL_WIRED] = true;
    doc.addEventListener('click', modalClick);
    doc.addEventListener('close', modalClosed, true);
  }

  
  function openModalsAtRest(root) {
    each(root.querySelectorAll(MODAL + '[data-sd-open-at-rest]'), function (dialog) {
      if (dialog.open || !dialog.showModal || !dialog.isConnected) return;
      try { dialog.showModal(); } catch (err) {  }
    });
  }

  

  

  

  var POP_OUT = '.sd-pop-out';
  var POP_OUT_ATTR = 'data-sd-pop-out';
  var POP_OUT_OWNER = '.sd-panel, .sd-properties-panel';
  var POP_OUT_WIRED = '__sdPopOutsWired';
  var POP_OUT_TRIGGER = '__sdPopOutTrigger';

  
  function popOutPlacement(row, owner, size, view, gap, gutter) {
    owner = owner || row;
    var x = owner.left - gap - size.width;
    var beside = x >= gutter;
    var y = row.top;
    if (!beside) {
      x = owner.left + gutter;
      y = row.bottom + gap;
      
      if (y + size.height > view.height - gutter && row.top - gap - size.height >= gutter) {
        y = row.top - gap - size.height;
      }
    }
    x = Math.max(gutter, Math.min(x, view.width - gutter - size.width));
    y = Math.max(gutter, Math.min(y, view.height - gutter - size.height));
    return { x: Math.round(x), y: Math.round(y), beside: beside };
  }

  function popOutOpen(pop) {
    try { return pop.matches(':popover-open'); } catch (err) { return false; }
  }

  
  function popOutTrigger(pop) {
    var t = pop[POP_OUT_TRIGGER];
    if (t && t.isConnected) return t;
    if (!pop.id) return null;
    var all = pop.ownerDocument.querySelectorAll('[' + POP_OUT_ATTR + ']');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute(POP_OUT_ATTR) === pop.id) return all[i];
    }
    return null;
  }

  
  function linkPopOutTrigger(trigger) {
    var doc = trigger.ownerDocument;
    var pop = doc.getElementById(trigger.getAttribute(POP_OUT_ATTR));
    if (!pop || !pop.matches(POP_OUT) || !pop.hasAttribute('popover')) return;
    trigger.setAttribute('popovertarget', pop.id);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', popOutOpen(pop) ? 'true' : 'false');
  }

  function linkPopOutTriggers(root) {
    each(root.querySelectorAll('[' + POP_OUT_ATTR + ']'), linkPopOutTrigger);
  }

  
  function placePopOut(pop) {
    var doc = pop.ownerDocument;
    var view = doc.defaultView;
    var trigger = popOutTrigger(pop);
    if (!view || !trigger || !popOutOpen(pop)) return;
    var css = view.getComputedStyle(doc.documentElement);
    var gap = parseFloat(css.getPropertyValue('--sd-space-8')) || 0;
    var gutter = parseFloat(css.getPropertyValue('--sd-space-16')) || 0;
    var owner = trigger.closest(POP_OUT_OWNER);
    var r = pop.getBoundingClientRect();
    var at = popOutPlacement(
      trigger.getBoundingClientRect(),
      owner ? owner.getBoundingClientRect() : null,
      { width: r.width, height: r.height },
      { width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight },
      gap, gutter);
    pop.style.setProperty('--sd-pop-out-x', at.x + 'px');
    pop.style.setProperty('--sd-pop-out-y', at.y + 'px');
  }

  
  function popOutFirstControl(pop) {
    var c = pop.querySelector('.sd-pop-out__body input:not([type="hidden"]):not([disabled]), ' +
      '.sd-pop-out__body select:not([disabled]), .sd-pop-out__body textarea:not([disabled]), ' +
      '.sd-pop-out__body summary, .sd-pop-out__body [tabindex="0"]');
    return c || pop;
  }

  
  function closePopOut(pop) {
    var trigger = popOutTrigger(pop);
    try { pop.hidePopover(); } catch (err) {  }
    if (trigger && trigger.focus) trigger.focus();
  }

  
  function isPopOutClose(button, pop) {
    return !!button && button.getAttribute('aria-label') === 'Close ' + pop.getAttribute('aria-label');
  }

  function popOutClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var trigger = t.closest('[' + POP_OUT_ATTR + ']');
    if (trigger) {
      if (!trigger.hasAttribute('popovertarget')) linkPopOutTrigger(trigger);
      var target = trigger.ownerDocument.getElementById(trigger.getAttribute(POP_OUT_ATTR));
      if (target) target[POP_OUT_TRIGGER] = trigger;
      return;
    }
    var pop = t.closest(POP_OUT);
    if (!pop || !pop.hasAttribute('popover')) return;
    var button = t.closest('button');
    if (isPopOutClose(button, pop)) closePopOut(pop);
  }

  
  function popOutBeforeToggle(e) {
    var pop = e.target;
    if (!pop || !pop.matches || !pop.matches(POP_OUT)) return;
    var trigger = popOutTrigger(pop);
    var opening = e.newState === 'open';
    if (trigger) trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (!opening) return;
    
    var view = pop.ownerDocument.defaultView;
    var raf = view && view.requestAnimationFrame ? view.requestAnimationFrame.bind(view) : function (f) { f(); };
    raf(function () {
      placePopOut(pop);
      var first = popOutFirstControl(pop);
      if (first === pop && !pop.hasAttribute('tabindex')) pop.setAttribute('tabindex', '-1');
      if (first && first.focus) first.focus({ preventScroll: true });
    });
  }

  function popOutKeydown(e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (e.defaultPrevented) return;
    var doc = docOf(e.target);
    var open = null;
    try { open = doc.querySelector(POP_OUT + '[popover]:popover-open'); } catch (err) { open = null; }
    if (!open) return;
    e.preventDefault();
    closePopOut(open);
  }

  function placeOpenPopOuts(doc) {
    var open = [];
    try { open = doc.querySelectorAll(POP_OUT + '[popover]:popover-open'); } catch (err) { return; }
    each(open, placePopOut);
  }

  function wirePopOuts(doc) {
    if (!doc || doc[POP_OUT_WIRED] || !doc.addEventListener) return;
    doc[POP_OUT_WIRED] = true;
    doc.addEventListener('click', popOutClick, true);
    doc.addEventListener('beforetoggle', popOutBeforeToggle, true);
    doc.addEventListener('keydown', popOutKeydown);
    doc.addEventListener('scroll', function () { placeOpenPopOuts(doc); }, true);
    var view = doc.defaultView;
    if (view) view.addEventListener('resize', function () { placeOpenPopOuts(doc); });
  }

  

  
  

  var SEARCH_FILTER = '.sd-search-filter';
  var SF_BUTTON = '.sd-search-filter__button';
  var SF_WIRED = '__sdSearchFilterWired';
  var SF_OPENED = '__sdSearchFilterOpened';

  
  function openSearchFilters(doc) {
    return Array.prototype.filter.call(doc.querySelectorAll(SEARCH_FILTER + '[open]'), function (f) {
      return f[SF_OPENED] === true;
    });
  }

  function closeSearchFilter(filter, refocus) {
    filter.removeAttribute('open');
    filter[SF_OPENED] = false;
    var button = refocus ? filter.querySelector(SF_BUTTON) : null;
    if (button && button.focus) button.focus();
  }

  function searchFilterToggle(e) {
    var f = e.target;
    if (!f || !f.classList || !f.classList.contains('sd-search-filter')) return;
    f[SF_OPENED] = f.hasAttribute('open');
  }

  function searchFilterPointerdown(e) {
    var doc = (e.target && e.target.ownerDocument) || document;
    openSearchFilters(doc).forEach(function (f) {
      if (!f.contains(e.target)) closeSearchFilter(f, false);
    });
  }

  function searchFilterKeydown(e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (e.defaultPrevented) return;
    var doc = (e.target && e.target.ownerDocument) || document;
    var active = doc.activeElement;
    var loose = !active || active === doc.body || active === doc.documentElement;
    var closed = false;
    openSearchFilters(doc).forEach(function (f) {
      closeSearchFilter(f, loose || f.contains(active));
      closed = true;
    });
    if (closed) e.preventDefault();
  }

  function wireSearchFilters(doc) {
    if (!doc || doc[SF_WIRED] || !doc.addEventListener) return;
    doc[SF_WIRED] = true;
    doc.addEventListener('toggle', searchFilterToggle, true);
    doc.addEventListener('pointerdown', searchFilterPointerdown);
    doc.addEventListener('keydown', searchFilterKeydown);
  }

  

  
  

  
  function escapeOwner(s) {
    if (!s || s.claimed) return null;
    if (s.dragging) return 'drag';
    if (s.inPane) return 'pane';
    if (s.armed) return 'insertion';
    if (s.selected) return 'selection';
    return null;
  }

  
  function browserClosesOnEscape(doc) {
    try {
      return !!doc.querySelector('[popover]:not([popover="manual"]):popover-open, dialog:modal');
    } catch (err) {
      return false;
    }
  }

  function escapeKeydown(e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var doc = docOf(e.target);
    var panel = openInsertPanelAround(e.target);
    var owner = escapeOwner({
      claimed: e.defaultPrevented || browserClosesOnEscape(doc),
      dragging: !!drag,
      inPane: !!panel,
      armed: !!armed,
      selected: !!selectionOf(doc).el
    });
    if (!owner) return;
    e.preventDefault();
    if (owner === 'pane') escapeInsertPanel(panel);
    else if (owner === 'selection') escapeSelection(doc);
    else cancelInsert();
  }

  var ESCAPE_WIRED = '__sdEscapeWired';

  
  function wireEscape(doc) {
    if (!doc || doc[ESCAPE_WIRED] || !doc.addEventListener) return;
    doc[ESCAPE_WIRED] = true;
    doc.addEventListener('keydown', escapeKeydown);
  }

  

  
  function init(root) {
    root = root || document;
    if (!root.querySelectorAll) return;

    syncIndeterminate(root);

    each(
      root.querySelectorAll(FIELD_CONTROLS),
      wireDescription
    );

    each(root.querySelectorAll('form[data-sd-validate]'), wireForm);
    each(root.querySelectorAll('textarea[data-autogrow]'), wireAutogrow);
    each(root.querySelectorAll(FIELD_COLOR), wireColor);
    each(root.querySelectorAll(FIELD_STEPPER), wireStepper);
    each(root.querySelectorAll(CHIP_LIST), wireChipList);
    each(root.querySelectorAll(PANEL), wireInsertPanel);
    each(root.querySelectorAll(SELECT_MENU), wireSelectMenu);

    
    Array.prototype.forEach.call(root.querySelectorAll(TOOLBAR), wireToolbar);
    Array.prototype.forEach.call(root.querySelectorAll(PILL_TABS), wirePillTabs);

    
    each(root.querySelectorAll(DOC_STACK), wireDocumentFlow);

    
    each(root.querySelectorAll(LABEL_BAR), wireLabelBar);

    
    wireMenus(root.ownerDocument || root);
    roveMenus(root);
    openMenusAtRest(root);

    
    wireToolbarMenus(root.ownerDocument || root);

    
    var doc = root.ownerDocument || root;
    if (doc.body && doc.querySelector(SELECT_MENU)) wireSelectMenuDismiss(doc);
    
    if (doc.body) wireSignerPickers(doc);
    
    if (doc.body) wireSearchFilters(doc);
    
    each(root.querySelectorAll(HELP_ICON), linkHelpIcon);
    if (doc.body) wireHelpIcons(doc);
    
    each(root.querySelectorAll(HELP_ICON), placeHelpBubble);
    
    each(root.querySelectorAll(BREADCRUMB_STEP), wireBreadcrumbStep);
    if (doc.body) wireBreadcrumbs(doc);
    placeBreadcrumbBubblesAtRest(root);
    
    if (doc.body) wireModals(doc);
    
    linkPopOutTriggers(root);
    if (doc.body) wirePopOuts(doc);
    
    openModalsAtRest(root);
    if (doc.body && doc.querySelector(DRAG_SRC + ', ' + DROP_TARGET)) {
      layerFor(doc);
      wireInsertion(doc);
    }

    
    if (doc.body && doc.querySelector(OBJECT + ', ' + PROPS_PANEL)) {
      layerFor(doc);
      wireSelection(doc);
      
      var already = doc.querySelector(OBJECT + '[' + SELECTED + ']');
      each(doc.querySelectorAll(PROPS_PANEL), function (panel) {
        if (already && panelTakes(panel, already)) {
          paintPanel(panel, already);
          return;
        }
        
        if (!panel.hasAttribute('data-sd-selection')) paintPanel(panel, null);
      });
      if (already) selectionOf(doc).el = already;
      refreshCounts(doc);
      
      if (already) syncRig(already, doc);
    }

    
    settleSides(root);

    
    if (doc.body) wirePlaced(doc);

    
    wireEscape(doc);
  }

  var SDForms = {
    init: init,
    validate: validate,
    setError: setError,
    clearError: clearError,
    setIndeterminate: setIndeterminate,

    
    closeToolbarMenu: closeToolbarMenu,
    closeToolbarMenus: closeToolbarMenus,
    openToolbarMenus: openToolbarMenus,
    openInsertPanel: openInsertPanel,
    closeInsertPanel: closeInsertPanel,
    insertPanelMatch: insertPanelMatch,

    
    armInsert: arm,
    cancelInsert: cancelInsert,

    
    escapeOwner: escapeOwner,
    
    popOutPlacement: popOutPlacement,

    
    rovingStep: rovingStep,
    dropModeFor: dropModeFor,
    insertionBand: insertionBand,
    parseInsertSize: parseInsertSize,
    placementFor: placementFor,
    nudgePlacement: nudgePlacement,

    
    pointerFate: pointerFate,

    
    fitScale: fitScale,
    parseZoom: parseZoom,
    gestureLive: gestureLive,
    afterGesture: afterGesture,

    
    showSide: showSide,

    
    selectObject: selectObject,
    deselectObject: deselectObject,
    selectedObject: selectedObject,
    applyProp: applyProp,
    requiredObjects: requiredObjects,
    describeWrite: describeWrite,

    
    objectName: objectName,
    accessibleName: accessibleName,
    nameObject: nameObject,

    
    describeSelection: describeSelection,

    
    readControl: readControl,
    chosenRadio: chosenRadio,

    
    objectType: objectType,
    typeLabel: typeLabel,
    paintBlocks: paintBlocks,

    
    geomOf: geomOf,
    clampBox: clampBox,
    sizeBox: sizeBox,
    squareBox: squareBox,
    applyGeom: applyGeom,
    boxFromDrag: boxFromDrag,
    nudgeBox: nudgeBox,

    
    flowDocuments: flowStack,

    
    rigTuck: rigTuck,

    
    dismissHelpIcons: dismissHelpIcons,
    helpBubbleShowing: helpBubbleShowing,
    linkHelpIcon: linkHelpIcon,

    
    modalReturnTarget: modalReturnTarget,

    
    helpBubbleShift: helpBubbleShift,
    helpClipSpan: helpClipSpan,
    helpBubbleRoom: helpBubbleRoom,
    helpBubblePlacement: helpBubblePlacement,

    
    shortenAccountId: shortenAccountId,
    shortensAccountIds: shortensAccountIds
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SDForms;
  global.SDForms = SDForms;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { init(document); });
    } else {
      init(document);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
