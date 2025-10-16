// script.js (corrected: category dropdown support, robust completed styling, themes, routing)
document.addEventListener("DOMContentLoaded", () => {
  // Helpers
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // State
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let viewMyDayOnly = false;
  let sortMode = localStorage.getItem("sortMode") || "created-desc";
  let lastDeletedTask = null;

  // Elements
  const particlesContainer = $("#particles-container");
  const mainTitle = $("#main-title");
  const quoteEl = $("#quote-container");
  const taskForm = $("#task-form");
  const taskList = $("#task-list");
  const sortSelect = $("#sort-select");
  const themeSelect = $("#theme-select");
  const btnMyDay = $("#btn-myday");
  const btnAll = $("#btn-all");
  const toastContainer = $("#toast-container");
  const titleInput = $("#task-title");
  const categoryInput = $("#task-category");
  const deadlineInput = $("#task-deadline");
  const priorityInput = $("#task-priority");
  const repeatInput = $("#task-repeat");
  const plannedUpcoming = $("#planned-upcoming");
  const plannedReminders = $("#planned-reminders");
  const settingsTheme = $("#settings-theme");
  const btnExport = $("#btn-export");
  const btnClear = $("#btn-clear");
  const inputImport = $("#input-import");
  const exportArea = $("#export-area");

  // THEMES
  const themeMap = {
    dark:  "bg-gradient-to-br from-[#0f172a] to-[#0b0f1a]",
    light: "bg-gradient-to-br from-[#f6f7fb] to-[#c8d8ff]",
  };
  function removeClasses(body, classes){ classes.split(" ").forEach(c=>body.classList.remove(c)); }
  function addClasses(body, classes){ classes.split(" ").forEach(c=>body.classList.add(c)); }
  function clearThemeClasses(){ const b=document.body; Object.values(themeMap).forEach(cls=>removeClasses(b,cls)); }
  function prefersDark(){ return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function effectiveTheme(name){ return name==="auto" ? (prefersDark()?"dark":"light") : name; }
  function applyTheme(name){
    clearThemeClasses();
    addClasses(document.body, themeMap[effectiveTheme(name)]);
    localStorage.setItem("theme", name);
    if (settingsTheme) settingsTheme.value = name;
    if (themeSelect) themeSelect.value = name;
  }
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  media?.addEventListener?.("change", () => { if ((localStorage.getItem("theme")||"auto")==="auto") applyTheme("auto"); });
  applyTheme(localStorage.getItem("theme") || "auto");
  document.addEventListener("change", (e)=>{ if (e.target.id==="theme-select"||e.target.id==="settings-theme") applyTheme(e.target.value); });

  // Particles
  if (particlesContainer){ for (let i=0;i<30;i++) spawnParticle(); }
  function spawnParticle(){
    const p=document.createElement("div"); p.className="particle";
    const s=Math.random()*2+1; p.style.width=`${s}px`; p.style.height=`${s}px`;
    reset(p); particlesContainer.appendChild(p); animate(p);
  }
  function reset(p){ const pos={x:Math.random()*100,y:Math.random()*100}; p.style.left=`${pos.x}%`; p.style.top=`${pos.y}%`; p.style.opacity="0"; return pos; }
  function animate(p){ const pos=reset(p); const d=Math.random()*20+15,t=Math.random()*10;
    setTimeout(()=>{ p.style.transition=`all ${d}s linear`; p.style.opacity=Math.random()*0.15; p.style.left=`${pos.x+(Math.random()*10-5)}%`; p.style.top=`${pos.y-Math.random()*20}%`; setTimeout(()=>animate(p),d*1000); }, t*1000);
  }
  document.addEventListener("mousemove",(e)=>{ if(!particlesContainer) return; const p=document.createElement("div"); p.className="particle"; const s=Math.random()*2.5+1; p.style.width=`${s}px`; p.style.height=`${s}px`; p.style.left=`${(e.clientX/innerWidth)*100}%`; p.style.top=`${(e.clientY/innerHeight)*100}%`; p.style.opacity="0.6"; particlesContainer.appendChild(p); setTimeout(()=>{ p.style.transition="all 1.5s ease-out"; p.style.opacity="0"; setTimeout(()=>p.remove(),1500); },10); });

  // Typewriter
  function typewriterEffect(el, words, period=3000){
    if (!el) return; let i=0,j=0,del=false;
    (function type(){ const w=words[i];
      if(del){ el.textContent=w.substring(0,j-1); j--; if(j===0){ del=false; i=(i+1)%words.length; } }
      else   { el.textContent=w.substring(0,j+1); j++; if(j===w.length) del=true; }
      setTimeout(type, j===words[i].length?period:del?100:200);
    })();
  }
  typewriterEffect(mainTitle, ["My Tasks","Stay Organized","Seize the Day"]);
  typewriterEffect(quoteEl, [
    '"The only way to do great work is to love what you do."',
    '"Believe you can and you\'re halfway there."',
    '"The future belongs to those who believe in the beauty of their dreams."',
  ]);

  // Routing
  const routes = { "#/tasks":"#page-tasks", "#/planned":"#page-planned", "#/settings":"#page-settings" };
  function showRoute(hash){
    Object.values(routes).forEach(sel=>$(sel)?.classList.add("hidden"));
    const sel = routes[hash] || "#page-tasks";
    $(sel)?.classList.remove("hidden");
    highlightNav(hash);
    if (sel==="#page-tasks") renderTasks();
    if (sel==="#page-planned") renderPlanned();
    if (sel==="#page-settings") initSettings();
  }
  function highlightNav(hash){ $$(".nav-link").forEach(a=>a.classList.remove("bg-white/15","text-[1.1rem]")); const active=document.querySelector(`a[href="${hash}"]`); if (active) active.classList.add("bg-white/15"); }
  addEventListener("hashchange",()=>showRoute(location.hash));
  if (!location.hash) location.hash="#/tasks";
  showRoute(location.hash);

  // Data helpers
  const saveTasks = () => localStorage.setItem("tasks", JSON.stringify(tasks));
  function priorityWeight(p){ return p==="high"?3 : p==="medium"?2 : p==="low"?1 : 0; }

  // Render tasks
  function renderTasks(){
    if (!taskList) return;
    taskList.innerHTML = "";

    let list = [...tasks];
    if (viewMyDayOnly) list = list.filter(t => t.myDay && !t.completed);

    list.sort((a,b)=>{
      if (sortMode==="star") return (b.star|0)-(a.star|0);
      if (sortMode==="priority") return priorityWeight(b.priority)-priorityWeight(a.priority);
      if (sortMode==="due-asc") return new Date(a.deadline||0)-new Date(b.deadline||0);
      if (sortMode==="due-desc") return new Date(b.deadline||0)-new Date(a.deadline||0);
      if (sortMode==="created-asc") return new Date(a.createdAt||0)-new Date(b.createdAt||0);
      if (sortMode==="created-desc") return new Date(b.createdAt||0)-new Date(a.createdAt||0);
      if (sortMode==="alpha-asc") return (a.title||"").localeCompare(b.title||"");
      if (sortMode==="alpha-desc") return (b.title||"").localeCompare(a.title||"");
      return 0;
    });

    list.forEach(task=>{
      const index = tasks.findIndex(t=>t===task);
      const border = task.priority==="high" ? "task-item priority-high"
                    : task.priority==="medium" ? "task-item priority-medium"
                    : "task-item priority-low";
      const done = task.completed ? "completed" : "";
      const deadlineStr = task.deadline
        ? new Date(task.deadline).toLocaleDateString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})
        : "No Deadline";

      const el = document.createElement("div");
      el.className = `${border} ${done}`;
      el.innerHTML = `
        <div class="task-details">
          <span class="task-title">${task.title}</span>
          <div class="task-meta">
            <span><i class="fas fa-tag"></i> ${task.category || "General"}</span>
            <span><i class="fas fa-clock"></i> ${deadlineStr}</span>
            ${task.myDay ? '<span><i class="fas fa-sun"></i> My Day</span>' : ""}
            ${task.repeat && task.repeat!=="none" ? `<span><i class="fas fa-sync-alt"></i> ${task.repeat}</span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button class="star-btn" title="Star">${task.star?'<i class="fas fa-star"></i>':'<i class="far fa-star"></i>'}</button>
          <button class="myday-btn" title="Toggle My Day"><i class="fas fa-sun"></i></button>
          <button class="complete-btn" title="Mark as Done"><i class="fas fa-check"></i></button>
          <button class="delete-btn" title="Delete Task"><i class="fas fa-trash"></i></button>
        </div>
      `;

      el.querySelector(".star-btn").onclick = () => {
        tasks[index].star = !tasks[index].star; saveTasks(); renderTasks();
      };
      el.querySelector(".myday-btn").onclick = () => {
        tasks[index].myDay = !tasks[index].myDay; saveTasks(); renderTasks();
      };
      el.querySelector(".complete-btn").onclick = () => {
        const t = tasks[index];
        t.completed = !t.completed;

        // Create next occurrence if needed
        if (t.completed && t.repeat && t.repeat!=="none" && t.deadline) {
          const next = nextOccurrence(new Date(t.deadline), t.repeat);
          if (next) tasks.unshift({
            ...t,
            completed: false,
            myDay: false,
            createdAt: new Date().toISOString(),
            deadline: next.toISOString(),
          });
        }
        saveTasks();
        renderTasks();
      };
      el.querySelector(".delete-btn").onclick = () => {
        lastDeletedTask = { task: { ...tasks[index] }, index };
        tasks.splice(index, 1); saveTasks(); renderTasks(); showUndoToast();
      };

      taskList.appendChild(el);
    });

    if (list.length===0) taskList.innerHTML = `<p style="text-align:center;color:rgba(255,255,255,.5);padding:1.5rem 0;">No tasks to show</p>`;
  }

  // Recurrence
  function nextOccurrence(date, mode){
    const d=new Date(date);
    if (mode==="daily") d.setDate(d.getDate()+1);
    else if (mode==="weekdays"){ do d.setDate(d.getDate()+1); while([0,6].includes(d.getDay())); }
    else if (mode==="weekly") d.setDate(d.getDate()+7);
    else if (mode==="monthly") d.setMonth(d.getMonth()+1);
    else return null;
    return d;
  }

  // Planned
  function renderPlanned(){
    if (!plannedUpcoming || !plannedReminders) return;
    const now = new Date();
    const in7 = new Date(now); in7.setDate(now.getDate()+7);

    const up = tasks
      .filter(t => t.deadline && new Date(t.deadline)>=now && new Date(t.deadline)<=in7)
      .sort((a,b)=> new Date(a.deadline)-new Date(b.deadline));

    const rem = tasks
      .filter(t => t.deadline)
      .sort((a,b)=> new Date(a.deadline)-new Date(b.deadline));

    plannedUpcoming.innerHTML =
      up.map(t=>`<div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
        <span>${t.title}</span>
        <span class="text-sm opacity-70">${new Date(t.deadline).toLocaleString()}</span>
      </div>`).join("") || `<p class="opacity-60">Nothing upcoming within a week.</p>`;

    plannedReminders.innerHTML =
      rem.map(t=>`<div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
        <span>${t.title}</span>
        <span class="text-sm opacity-70">${new Date(t.deadline).toLocaleString()}</span>
      </div>`).join("") || `<p class="opacity-60">No reminders available.</p>`;
  }

  // Settings
  function initSettings(){
    const stored = localStorage.getItem("theme") || "auto";
    if (settingsTheme) settingsTheme.value = stored;

    btnExport.onclick = () => {
      exportArea.value = JSON.stringify(tasks, null, 2);
      exportArea.focus(); exportArea.select();
    };
    btnClear.onclick = () => {
      if (confirm("Clear all tasks?")) {
        tasks = [];
        localStorage.setItem("tasks", JSON.stringify(tasks));
        exportArea.value = "";
        alert("All tasks cleared.");
      }
    };
    inputImport.onchange = async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!Array.isArray(data)) throw 0;
        tasks = data;
        localStorage.setItem("tasks", JSON.stringify(tasks));
        alert("Import successful.");
      } catch {
        alert("Invalid JSON file.");
      }
    };
  }

  // Toast
  function showUndoToast(){
    const toast=document.createElement("div"); toast.className="toast";
    toast.innerHTML = `<span>Task deleted.</span><button class="btn">Undo</button>`;
    toastContainer.innerHTML=""; toastContainer.appendChild(toast);
    toast.querySelector(".btn").onclick = () => {
      if (lastDeletedTask) {
        tasks.splice(lastDeletedTask.index, 0, lastDeletedTask.task);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks(); lastDeletedTask=null; toast.remove();
      }
    };
    setTimeout(()=>toast.remove(),5000);
  }

  // Reminders (alert)
  async function scheduleReminder(task){
    if (!task.deadline || task.completed) return;
    const timeout = new Date(task.deadline).getTime() - Date.now();
    if (timeout > 0) {
      await new Promise(r=>setTimeout(r, timeout));
      const current = tasks.find(t=>t===task);
      if (current && !current.completed) alert(`Reminder: Your task "${task.title}" is due now!`);
    }
  }

  // Events
  if (sortSelect) sortSelect.value = sortMode;
  sortSelect?.addEventListener("change",(e)=>{ sortMode=e.target.value; localStorage.setItem("sortMode",sortMode); renderTasks(); });
  btnMyDay?.addEventListener("click",()=>{ viewMyDayOnly=true; renderTasks(); });
  btnAll?.addEventListener("click",()=>{ viewMyDayOnly=false; renderTasks(); });

  titleInput?.addEventListener("keydown",(e)=>{ if (e.key==="Enter"){ e.preventDefault(); document.getElementById("task-submit")?.click(); } });

  taskForm?.addEventListener("submit",(e)=>{
    e.preventDefault();

    // Category from dropdown; allow custom when "Other"
    let categoryVal = (categoryInput.value || "").trim();
    if (categoryVal === "Other") {
      const custom = prompt("Enter custom category:");
      categoryVal = custom ? custom.trim() : "";
    }

    const newTask = {
      title: titleInput.value.trim(),
      category: categoryVal === "" || categoryVal === "Select category" ? "" : categoryVal,
      deadline: deadlineInput.value,
      priority: priorityInput.value,
      repeat: repeatInput?.value || "none",
      star: false,
      myDay: false,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    if (!newTask.title) return;

    tasks.unshift(newTask);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    if (newTask.deadline) scheduleReminder(newTask);
    taskForm.reset(); titleInput.focus(); renderTasks();
  });

  // Initialize
  tasks.forEach(scheduleReminder);
  renderTasks();
});
