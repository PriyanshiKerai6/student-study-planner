const $ = (selector) => document.querySelector(selector);
const taskList = $("#taskList");
const dialog = $("#taskDialog");
const taskForm = $("#taskForm");
const toast = $("#toast");
let tasks = JSON.parse(localStorage.getItem("studyflowTasks") || "[]");
let focusMinutes = Number(localStorage.getItem("studyflowFocusMinutes") || 0);
let filter = "all";
let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;
let toastTimeout;

function saveTasks() {
  localStorage.setItem("studyflowTasks", JSON.stringify(tasks));
  renderTasks();
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2400);
}
function formatDue(date) {
  if (!date) return "No due date";
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function renderTasks() {
  const visible = tasks.filter(t => filter === "all" || (filter === "active" ? !t.completed : t.completed));
  $("#navTaskCount").textContent = tasks.filter(t => !t.completed).length;
  $("#taskHeadingCount").textContent = tasks.length;
  $("#completedStat").textContent = tasks.filter(t => t.completed).length;
  const complete = tasks.length ? Math.round(tasks.filter(t => t.completed).length / tasks.length * 100) : 0;
  $("#taskProgress").style.width = `${complete}%`;
  $("#taskProgressText").textContent = tasks.length ? `${complete}% of your tasks completed` : "Let's get started!";
  $("#focusStat").textContent = focusMinutes;
  taskList.innerHTML = "";
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<span>✧</span><strong>${filter === "completed" ? "Nothing completed yet" : filter === "active" ? "You're all caught up!" : "Your plan starts here"}</strong><p>${filter === "all" ? "Add your first task to get organized." : "Add or update tasks to see them here."}</p>`;
    taskList.appendChild(empty);
    return;
  }
  visible.forEach(task => {
    const item = document.createElement("div");
    item.className = `task-item ${task.completed ? "is-complete" : ""}`;
    const check = document.createElement("input");
    check.type = "checkbox"; check.className = "task-check"; check.checked = task.completed;
    check.setAttribute("aria-label", `Mark ${task.title} complete`);
    check.addEventListener("change", () => {
      task.completed = check.checked; saveTasks();
      showToast(task.completed ? "Task completed. Great work!" : "Task moved back to to-do.");
    });
    const main = document.createElement("div"); main.className = "task-main";
    const title = document.createElement("strong"); title.textContent = task.title;
    const meta = document.createElement("small"); meta.textContent = `${task.subject} · ${formatDue(task.due)}`;
    main.append(title, meta);
    const priority = document.createElement("span"); priority.className = `priority ${task.priority}`; priority.textContent = task.priority;
    const del = document.createElement("button"); del.className = "delete-task"; del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label", `Delete ${task.title}`);
    del.addEventListener("click", () => { tasks = tasks.filter(t => t.id !== task.id); saveTasks(); showToast("Task deleted."); });
    item.append(check, main, priority, del); taskList.appendChild(item);
  });
}
function openDialog() {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  $("#taskTitle").focus();
}
function closeDialog() { dialog.close ? dialog.close() : dialog.removeAttribute("open"); }
["#addTaskTop", "#addTaskBottom"].forEach(id => $(id).addEventListener("click", openDialog));
$("#closeDialog").addEventListener("click", closeDialog);
$("#cancelDialog").addEventListener("click", closeDialog);
taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) { $("#taskTitle").focus(); return; }
  tasks.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, subject: $("#taskSubject").value, priority: $("#taskPriority").value, due: $("#taskDue").value, completed: false });
  saveTasks(); taskForm.reset(); closeDialog(); showToast("Your new task has been added.");
});
document.querySelectorAll(".filter-chip").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
  button.classList.add("active"); filter = button.dataset.filter; renderTasks();
}));
$("#viewAllTasks").addEventListener("click", () => {
  filter = "all";
  document.querySelectorAll(".filter-chip").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
  renderTasks(); $("#tasks").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("studyflowDark", dark ? "1" : "0");
  $("#themeButton").textContent = dark ? "☾" : "☼";
});
if (localStorage.getItem("studyflowDark") === "1") { document.body.classList.add("dark"); $("#themeButton").textContent = "☾"; }
$("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  link.classList.add("active"); $("#sidebar").classList.remove("open");
}));
$("#profileButton").addEventListener("click", () => showToast("Welcome to your StudyFlow workspace!"));

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const seconds = (timerSeconds % 60).toString().padStart(2, "0");
  $("#timerDisplay").textContent = `${minutes}:${seconds}`;
  const degrees = (1 - timerSeconds / (25 * 60)) * 360;
  $("#timerRing").style.background = `conic-gradient(#7865e8 ${degrees}deg, #e8e4ff ${degrees}deg 360deg)`;
}
$("#startTimer").addEventListener("click", () => {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false; $("#startTimer").innerHTML = "▶ Resume focus"; return;
  }
  timerRunning = true; $("#startTimer").innerHTML = "Ⅱ Pause";
  timerInterval = setInterval(() => {
    timerSeconds--; updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval); timerRunning = false; focusMinutes += 25;
      localStorage.setItem("studyflowFocusMinutes", focusMinutes); renderTasks();
      timerSeconds = 25 * 60; updateTimerDisplay(); $("#startTimer").innerHTML = "▶ Start focus";
      showToast("Focus session complete! Take a 5-minute break.");
    }
  }, 1000);
});
$("#resetTimer").addEventListener("click", () => {
  clearInterval(timerInterval); timerRunning = false; timerSeconds = 25 * 60;
  $("#startTimer").innerHTML = "▶ Start focus"; updateTimerDisplay(); showToast("Focus timer reset.");
});
const now = new Date();
$("#dateLabel").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
renderTasks();
updateTimerDisplay();
