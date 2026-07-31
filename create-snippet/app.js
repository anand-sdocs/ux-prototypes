/**
 * Templates home page: "+ Add" split button -> "Create new" flyout ->
 * "New Template" / "New Snippet". Choosing "New Snippet" lands on the
 * snippet editor (editor.html) in create-mode.
 */
function initTemplatesHome() {
  const btnAddMain = document.getElementById("btn-add-main");
  const btnAddCaret = document.getElementById("btn-add-caret");
  const addDropdown = document.getElementById("add-dropdown");
  const itemCreateNew = document.getElementById("item-create-new");
  const createFlyout = document.getElementById("create-flyout");
  const itemNewTemplate = document.getElementById("item-new-template");
  const itemNewSnippet = document.getElementById("item-new-snippet");

  function toggleAddDropdown() {
    addDropdown.classList.toggle("open");
    if (!addDropdown.classList.contains("open")) createFlyout.classList.remove("open");
  }

  btnAddMain.addEventListener("click", (e) => { e.stopPropagation(); toggleAddDropdown(); });
  btnAddCaret.addEventListener("click", (e) => { e.stopPropagation(); toggleAddDropdown(); });

  itemCreateNew.addEventListener("mouseenter", () => createFlyout.classList.add("open"));
  itemCreateNew.addEventListener("click", (e) => {
    e.stopPropagation();
    createFlyout.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    addDropdown.classList.remove("open");
    createFlyout.classList.remove("open");
  });
  addDropdown.addEventListener("click", (e) => e.stopPropagation());

  itemNewTemplate.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "editor.html?type=template&new=1";
  });

  itemNewSnippet.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "editor.html?type=snippet&new=1";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTemplatesHome);
} else {
  initTemplatesHome();
}
