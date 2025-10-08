document.addEventListener('DOMContentLoaded', () => {
    
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // --- Particle Logic ---
    const particlesContainer = document.getElementById('particles-container');
    if (particlesContainer) { for (let i = 0; i < 30; i++) createDriftingParticle(); }
    function createDriftingParticle(){ const p=document.createElement('div');p.className='particle';const s=Math.random()*2+1;p.style.width=`${s}px`;p.style.height=`${s}px`;resetParticle(p);particlesContainer.appendChild(p);animateParticle(p); }
    function resetParticle(p){ const pos={x:Math.random()*100,y:Math.random()*100};p.style.left=`${pos.x}%`;p.style.top=`${pos.y}%`;p.style.opacity='0';return pos; }
    function animateParticle(p){ const pos=resetParticle(p);const d=Math.random()*20+15,t=Math.random()*10;setTimeout(()=>{p.style.transition=`all ${d}s linear`;p.style.opacity=Math.random()*.15;p.style.left=`${pos.x+(Math.random()*10-5)}%`;p.style.top=`${pos.y-Math.random()*20}%`;setTimeout(()=>animateParticle(p),d*1e3);},t*1e3); }
    document.addEventListener('mousemove',(e)=>{ const p=document.createElement('div');p.className='particle';const s=Math.random()*2.5+1;p.style.width=`${s}px`;p.style.height=`${s}px`;p.style.left=`${e.clientX/window.innerWidth*100}%`;p.style.top=`${e.clientY/window.innerHeight*100}%`;p.style.opacity='0.6';particlesContainer.appendChild(p);setTimeout(()=>{p.style.transition='all 1.5s ease-out';p.style.opacity='0';setTimeout(()=>p.remove(),1500)},10);});

    // --- Reusable Typewriter Function ---
    function typewriterEffect(element, words, period = 3000) {
        let i = 0, j = 0, isDeleting = false;
        function type() {
            if (!element) return;
            const currentWord = words[i];
            if (isDeleting) {
                element.textContent = currentWord.substring(0, j - 1); j--;
                if (j === 0) { isDeleting = false; i = (i + 1) % words.length; }
            } else {
                element.textContent = currentWord.substring(0, j + 1); j++;
                if (j === currentWord.length) { isDeleting = true; }
            }
            const typeSpeed = isDeleting ? 100 : 200;
            setTimeout(type, j === currentWord.length ? period : typeSpeed);
        }
        type();
    }
    
    // --- Initialize All Typewriters ---
    const mainTitleElement = document.getElementById('main-title');
    const quoteElement = document.getElementById('quote-container');
    const remindersTitleElement = document.getElementById('reminders-title');

    typewriterEffect(mainTitleElement, ["My Tasks", "Stay Organized", "Seize the Day"]);
    typewriterEffect(quoteElement, ["\"The only way to do great work is to love what you do.\"", "\"Believe you can and you're halfway there.\"", "\"The future belongs to those who believe in the beauty of their dreams.\""]);
    if (remindersTitleElement) { remindersTitleElement.textContent = "Saved Reminders"; } // Static title, no typewriter

    // --- To-Do App Logic ---
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    const taskTitleInput = document.getElementById('task-title');
    const taskCategoryInput = document.getElementById('task-category');
    const taskDeadlineInput = document.getElementById('task-deadline');
    const taskPriorityInput = document.getElementById('task-priority');
    const toastContainer = document.getElementById('toast-container');
    const reminderList = document.getElementById('reminder-list');
    
    let lastDeletedTask = null;
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    const saveTasks = () => localStorage.setItem('tasks', JSON.stringify(tasks));
    const renderAll = () => { renderTasks(); renderReminders(); };

    const renderTasks = () => {
        if (!taskList) return;
        taskList.innerHTML = '';
        if (tasks.length === 0) { taskList.innerHTML = `<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 2rem 0;">No tasks yet. Add one to get started!</p>`; return; }
        tasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
            const deadlineFormatted = task.deadline ? new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'No Deadline';
            taskItem.innerHTML = `<div class="task-details"><span class="task-title">${task.title}</span><div class="task-meta"><span><i class="fas fa-tag"></i> ${task.category || 'General'}</span><span><i class="fas fa-clock"></i> ${deadlineFormatted}</span></div></div><div class="task-actions"><button class="complete-btn" title="Mark as Done"><i class="fas fa-check"></i></button><button class="delete-btn" title="Delete Task"><i class="fas fa-trash"></i></button></div>`;
            taskList.appendChild(taskItem);
            taskItem.querySelector('.complete-btn').addEventListener('click', () => { tasks[index].completed = !tasks[index].completed; saveTasks(); renderAll(); });
            taskItem.querySelector('.delete-btn').addEventListener('click', () => { lastDeletedTask = { task: { ...tasks[index] }, index }; tasks.splice(index, 1); saveTasks(); renderAll(); showUndoToast(); });
        });
    };

    const renderReminders = () => {
        if (!reminderList) return;
        const tasksWithDeadlines = tasks.filter(t => t.deadline);
        reminderList.innerHTML = '';
        if (tasksWithDeadlines.length === 0) { reminderList.innerHTML = `<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 1rem 0;">No reminders set.</p>`; return; }
        tasksWithDeadlines.forEach(task => {
            const originalIndex = tasks.findIndex(t => t === task);
            const reminderItem = document.createElement('div');
            reminderItem.className = `reminder-item ${task.completed ? 'completed' : ''}`;
            reminderItem.innerHTML = `<div class="reminder-details"><span class="reminder-title">${task.title}</span></div><div class="reminder-actions"><input class="reminder-input" type="datetime-local" value="${task.deadline}"><button class="update-btn" title="Update Deadline">Update</button></div>`;
            reminderList.appendChild(reminderItem);
            reminderItem.querySelector('.update-btn').addEventListener('click', () => {
                const newDeadline = reminderItem.querySelector('.reminder-input').value;
                if (originalIndex !== -1) { tasks[originalIndex].deadline = newDeadline; saveTasks(); renderAll(); scheduleReminder(tasks[originalIndex]); alert('Reminder updated!'); }
            });
        });
    };

    const showUndoToast = () => {
        const toast = document.createElement('div'); toast.className = 'toast';
        toast.innerHTML = `<span>Task deleted.</span><button class="btn">Undo</button>`;
        toastContainer.innerHTML = ''; toastContainer.appendChild(toast);
        toast.querySelector('.btn').addEventListener('click', () => { if(lastDeletedTask){ tasks.splice(lastDeletedTask.index, 0, lastDeletedTask.task); saveTasks(); renderAll(); lastDeletedTask = null; toast.remove(); }});
        setTimeout(() => toast.remove(), 5000);
    };
    
    async function scheduleReminder(task) {
        if (!task.deadline || task.completed) return;
        const timeout = new Date(task.deadline).getTime() - new Date().getTime();
        if (timeout > 0) {
            await delay(timeout);
            const currentTask = tasks.find(t => t === task);
            if (currentTask && !currentTask.completed) { alert(`Reminder: Your task "${task.title}" is due now!`); }
        }
    }

    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTask = { title: taskTitleInput.value.trim(), category: taskCategoryInput.value.trim(), deadline: taskDeadlineInput.value, priority: taskPriorityInput.value, completed: false };
            if (newTask.title) {
                tasks.unshift(newTask); saveTasks(); renderAll();
                if (newTask.deadline) scheduleReminder(newTask);
                taskForm.reset(); taskTitleInput.focus();
            }
        });
    }

    tasks.forEach(scheduleReminder);
    renderAll();
});
