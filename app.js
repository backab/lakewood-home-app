document.addEventListener("DOMContentLoaded", () => {
  
  // --- UTILITY: SAFE LISTENER --- //
  function attachListener(id, eventType, callback) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(eventType, callback);
    }
  }

  // --- TAB SWITCHING & GEAR ICON --- //
  const tabs = ['home', 'systems', 'tasks', 'calendar', 'profile'];
  window.switchTab = function(activeTab) {
    tabs.forEach(tab => {
      document.getElementById(`view-${tab}`).classList.add('hidden');
      document.getElementById(`btn-${tab}`).classList.remove('text-ochre');
      document.getElementById(`btn-${tab}`).classList.add('text-textmuted');
    });
    document.getElementById(`view-${activeTab}`).classList.remove('hidden');
    document.getElementById(`btn-${activeTab}`).classList.remove('text-textmuted');
    document.getElementById(`btn-${activeTab}`).classList.add('text-ochre');
  };
  
  tabs.forEach(tab => attachListener(`btn-${tab}`, 'click', () => switchTab(tab)));
  attachListener('btn-header-settings', 'click', () => switchTab('profile'));

  // --- DATA STORAGE & SYNC --- //
  let myTasks = []; 
  let mySystems = [];
  let myTodos = [];

  async function loadDataFromCloud() {
    try {
      const [tasksRes, sysRes, settingsRes, todosRes] = await Promise.all([
        fetch('/api/tasks'), fetch('/api/systems'), fetch('/api/settings'), fetch('/api/todos')
      ]);
      if (tasksRes.ok) myTasks = await tasksRes.json();
      if (sysRes.ok) mySystems = await sysRes.json();
      if (todosRes.ok) myTodos = await todosRes.json();
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if(settings.home_image) document.getElementById('main-home-image').src = settings.home_image;
        if(settings.home_title) document.getElementById('home-title').textContent = settings.home_title;
        if(settings.home_subtitle) document.getElementById('home-subtitle').textContent = settings.home_subtitle;
        if(settings.home_title) document.getElementById('set-title').value = settings.home_title;
        if(settings.home_subtitle) document.getElementById('set-subtitle').value = settings.home_subtitle;
      }
      
      renderCalendar(currentMonth, currentYear); 
      renderSystems('home-systems-carousel'); 
      renderSystems('tab-systems-carousel');  
      populateSystemDropdown();
      renderHomeTasks();
      renderTodoList();
    } catch (error) { console.error("Cloud sync failed:", error); }
  }
  loadDataFromCloud();

  // --- RECURRENCE MATH ENGINE --- //
  function getExpandedTasks() {
    let expanded = [];
    myTasks.forEach(task => {
      expanded.push(task); 
      if (task.recurrence && task.recurrence !== 'none') {
        let currDate = new Date(task.task_date);
        for (let i = 0; i < 36; i++) {
          if (task.recurrence === 'weekly') currDate.setDate(currDate.getDate() + 7);
          else if (task.recurrence === 'monthly') currDate.setMonth(currDate.getMonth() + 1);
          else if (task.recurrence === 'semi-annual') currDate.setMonth(currDate.getMonth() + 6);
          else if (task.recurrence === 'annual') currDate.setFullYear(currDate.getFullYear() + 1);
          if (currDate.getFullYear() > new Date().getFullYear() + 3) break;
          expanded.push({ ...task, task_date: currDate.toISOString().split('T')[0], is_virtual: true });
        }
      }
    });
    return expanded;
  }

  // --- ACTIONS --- //
  window.pushBackTask = async function(id, daysToAdd) {
    if (!daysToAdd) return; 
    const task = myTasks.find(t => t.id === id);
    if(!task) return;
    let d = new Date(task.task_date);
    d.setDate(d.getDate() + parseInt(daysToAdd));
    const newDateStr = d.toISOString().split('T')[0];

    try {
      await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'push_back', id: id, new_date: newDateStr }) });
      document.getElementById('day-view-modal').classList.add('hidden'); 
      loadDataFromCloud(); 
    } catch(e) { alert("Failed to push task back."); }
  }

  window.acknowledgeTask = async function(id) {
    try {
      await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'acknowledge', id: id }) });
      document.getElementById('day-view-modal').classList.add('hidden');
      loadDataFromCloud();
    } catch(e) { alert("Failed to acknowledge task."); }
  }

  window.deleteTask = async function(id) {
    if(confirm("Delete task?")) { 
      await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' }); 
      document.getElementById('day-view-modal').classList.add('hidden'); 
      loadDataFromCloud(); 
    }
  }
  
  window.editTask = function(id) {
    const t = myTasks.find(x => x.id === id);
    if(!t) return;
    document.getElementById('task-id').value = t.id;
    document.getElementById('task-date').value = t.task_date;
    document.getElementById('task-system').value = t.system_name;
    document.getElementById('task-title').value = t.task_title;
    document.getElementById('task-recurrence').value = t.recurrence || 'none';
    document.getElementById('task-show-todo').checked = t.show_in_todo ? true : false;
    document.getElementById('task-modal-title').textContent = "Edit Task";
    document.getElementById('day-view-modal').classList.add('hidden'); 
    document.getElementById('task-modal').classList.remove('hidden');
  }

  // --- RENDERING VIEWS --- //

  function renderHomeTasks() {
    const container = document.getElementById('home-upcoming-tasks');
    if(!container) return;
    container.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];
    let allUpcoming = getExpandedTasks().filter(t => t.task_date >= todayStr && !t.acknowledged);
    allUpcoming.sort((a, b) => new Date(a.task_date) - new Date(b.task_date));
    const nextThree = allUpcoming.slice(0, 3);

    if (nextThree.length === 0) {
      container.innerHTML = `<p class="text-sm text-textmuted italic">All caught up!</p>`;
      return;
    }

    nextThree.forEach(task => {
      // PRETTY UPDATE: Border is now dustyblue!
      const actionUI = task.is_virtual ? '' : `
        <div class="border-t border-black/5 mt-3 pt-4 flex justify-between items-center">
          <select onchange="pushBackTask(${task.id}, this.value); this.value='';" class="text-xs font-bold text-textmuted bg-oatmeal rounded-lg px-3 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-ochre/30 transition">
            <option value="">Push back...</option><option value="1">1 Day</option><option value="3">3 Days</option><option value="5">5 Days</option><option value="7">1 Week</option>
          </select>
          <button onclick="acknowledgeTask(${task.id})" class="w-9 h-9 flex items-center justify-center bg-ochre/10 text-ochre rounded-full hover:bg-ochre hover:text-white transition shadow-sm" title="Acknowledge & Mute">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
          </button>
        </div>`;
      container.innerHTML += `
        <div class="bg-white rounded-[24px] p-5 flex flex-col border-l-4 border-dustyblue shadow-soft transition hover:shadow-lg">
          <div class="flex-1 cursor-pointer" onclick="editTask(${task.id})">
            <h4 class="font-serif font-bold text-textmain text-lg">${task.task_title}</h4>
            <p class="text-xs text-textmuted mt-1 font-medium">${task.task_date} • ${task.system_name}</p>
          </div>
          ${actionUI}
        </div>`;
    });
  }

  let currentlyViewedSystem = null; 
  function renderSystems(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    mySystems.forEach(sys => {
      const card = document.createElement('div');
      card.className = "snap-center shrink-0 w-[85%] sm:w-[300px] bg-white rounded-[32px] p-2 shadow-soft border border-black/5 cursor-pointer";
      const taskCount = myTasks.filter(t => t.system_name === sys.name).length;
      card.innerHTML = `
        <div class="h-48 rounded-[24px] overflow-hidden relative mb-4">
          <img src="${sys.image_url}" class="w-full h-full object-cover bg-black/5" />
          <div class="absolute inset-0 bg-gradient-to-t from-textmain/60 to-transparent"></div>
        </div>
        <div class="px-4 pb-4">
          <h3 class="text-xl font-serif font-bold text-textmain truncate">${sys.name}</h3>
          <p class="text-sm text-textmuted mt-1 font-medium">${taskCount} Scheduled Tasks</p>
        </div>
      `;
      card.addEventListener('click', () => {
        currentlyViewedSystem = sys; 
        document.getElementById('detail-img').src = sys.image_url;
        document.getElementById('detail-name').textContent = sys.name;
        document.getElementById('detail-desc').textContent = sys.description;
        const linkBtn = document.getElementById('detail-link');
        if (sys.doc_link) { linkBtn.href = sys.doc_link; linkBtn.classList.remove('hidden'); } 
        else linkBtn.classList.add('hidden');
        document.getElementById('system-detail-modal').classList.remove('hidden');
      });
      container.appendChild(card);
    });
  }

  function populateSystemDropdown() {
    const dropdown = document.getElementById('task-system');
    if(!dropdown) return;
    dropdown.innerHTML = '<option value="General">General Home</option>';
    mySystems.forEach(sys => dropdown.innerHTML += `<option value="${sys.name}">${sys.name}</option>`);
  }

  // --- UNDO TO-DO LOGIC --- //
  let lastCompletedTodo = null; 

  window.completeTodo = async function(id, type) {
    lastCompletedTodo = { id, type };
    const undoContainer = document.getElementById('undo-container');
    if (undoContainer) undoContainer.classList.remove('hidden');

    if (type === 'manual') {
      await fetch('/api/todos', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: id, is_completed: 1}) });
    } else {
      const t = myTasks.find(task => task.id == id);
      if (t) {
        t.show_in_todo = false;
        await fetch('/api/tasks', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(t) });
      }
    }
    loadDataFromCloud();
  }

  function renderTodoList() {
    const list = document.getElementById('todo-list');
    if(!list) return;
    list.innerHTML = '';
    let count = 0;
    myTasks.filter(t => t.show_in_todo).forEach(task => {
      count++;
      list.innerHTML += `
        <div class="flex items-center gap-4 bg-sage text-white p-5 rounded-2xl shadow-soft mb-3 cursor-pointer hover:opacity-90 transition" onclick="completeTodo(${task.id}, 'calendar')">
          <div class="w-6 h-6 rounded-full border-2 border-white flex-shrink-0 flex items-center justify-center"></div>
          <div><span class="font-bold font-serif text-base block">${task.task_title}</span><span class="text-xs opacity-80 uppercase tracking-widest">${task.task_date}</span></div>
        </div>`;
    });
    myTodos.forEach(todo => {
      count++;
      list.innerHTML += `
        <div class="flex items-center gap-4 bg-white text-textmain p-5 rounded-[20px] shadow-soft mb-3 cursor-pointer hover:opacity-90 transition" onclick="completeTodo(${todo.id}, 'manual')">
          <div class="w-6 h-6 rounded-full border-2 border-textmuted/40 flex-shrink-0"></div><span class="font-bold font-serif text-base block">${todo.text}</span>
        </div>`;
    });
    if(count === 0) list.innerHTML = `<p class="text-center text-sm text-textmuted py-8">No open to-dos. Great job!</p>`;
  }

  // --- CALENDAR RENDERING --- //
  const calendarGrid = document.getElementById('calendar-grid');
  let currentMonth = new Date().getMonth(); let currentYear = new Date().getFullYear();
  
  function renderCalendar(month, year) {
    if(!calendarGrid) return;
    calendarGrid.innerHTML = ""; 
    document.getElementById('calendar-month-year').textContent = `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month]} ${year}`;
    const allTasks = getExpandedTasks();
    for (let i = 0; i < new Date(year, month, 1).getDay(); i++) calendarGrid.appendChild(document.createElement('div'));

    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const cell = document.createElement('div');
      cell.textContent = day;
      cell.classList.add('py-2.5', 'm-0.5', 'rounded-full', 'cursor-pointer', 'transition');
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = allTasks.filter(t => t.task_date === dateStr);

      if (day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) {
         cell.classList.add('bg-ochre', 'text-white', 'shadow-sm'); 
      }
      else if (dayTasks.length > 0) {
         cell.classList.add('bg-dustyblue/10', 'text-textmain', 'font-bold', 'border', 'border-dustyblue/30');
      }
      else {
         cell.classList.add('hover:bg-black/5'); 
      }

      cell.addEventListener('click', () => {
        document.getElementById('day-view-title').textContent = `${dateStr}`;
        const container = document.getElementById('day-view-tasks');
        
        container.innerHTML = dayTasks.length ? dayTasks.map(t => `
          <div class="bg-oatmeal rounded-[20px] p-5 border-l-4 border-dustyblue flex flex-col gap-3">
            <div class="flex justify-between items-center">
              <div><h4 class="font-serif font-bold text-textmain text-lg">${t.task_title}</h4><p class="text-xs text-textmuted mt-1 font-medium">${t.system_name}</p></div>
              ${t.is_virtual ? '' : `<div class="flex gap-4"><button onclick="editTask(${t.id})" class="text-textmuted hover:text-ochre text-lg transition">✏️</button><button onclick="deleteTask(${t.id})" class="text-textmuted hover:text-terracotta text-lg transition">🗑️</button></div>`}
            </div>
            ${t.is_virtual ? '' : `
            <div class="border-t border-black/5 pt-4 flex justify-between items-center">
              <select onchange="pushBackTask(${t.id}, this.value); this.value='';" class="text-xs font-bold text-textmuted bg-white shadow-sm rounded-lg px-3 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-ochre/30 transition">
                <option value="">Push back...</option><option value="1">1 Day</option><option value="3">3 Days</option><option value="5">5 Days</option><option value="7">1 Week</option>
              </select>
              ${t.acknowledged ? 
                `<span class="text-xs font-bold text-sage italic flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Acknowledged</span>` : 
                `<button onclick="acknowledgeTask(${t.id})" class="w-8 h-8 flex items-center justify-center bg-white text-ochre shadow-sm rounded-full hover:bg-ochre hover:text-white transition" title="Acknowledge & Mute"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></button>`
              }
            </div>`}
          </div>`).join('') : `<p class="text-center text-textmuted py-6 italic">Nothing scheduled.</p>`;
        document.getElementById('task-date').value = dateStr;
        document.getElementById('day-view-modal').classList.remove('hidden');
      });
      calendarGrid.appendChild(cell);
    }
  }

  // --- EVENT LISTENERS FOR BUTTONS AND FORMS --- //
  
  attachListener('prev-month', 'click', () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} renderCalendar(currentMonth, currentYear); });
  attachListener('next-month', 'click', () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} renderCalendar(currentMonth, currentYear); });

  attachListener('btn-add-task', 'click', () => {
    document.getElementById('task-id').value = '';
    document.getElementById('task-form').reset();
    document.getElementById('task-modal-title').textContent = "Add New Task";
    document.getElementById('task-modal').classList.remove('hidden');
  });

  attachListener('btn-add-system', 'click', () => {
    document.getElementById('system-form').reset();
    document.getElementById('sys-id').value = "";
    document.getElementById('sys-existing-image').value = "";
    document.getElementById('sys-modal-title').textContent = "Add Home System";
    
    const delBtn = document.getElementById('btn-delete-sys');
    if (delBtn) delBtn.classList.add('hidden');
    
    document.getElementById('system-form-modal').classList.remove('hidden');
  });

  attachListener('btn-undo-todo', 'click', async () => {
    if (!lastCompletedTodo) return;
    const { id, type } = lastCompletedTodo;
    if (type === 'manual') {
      await fetch('/api/todos', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: id, is_completed: 0}) });
    } else {
      const t = myTasks.find(task => task.id == id);
      if (t) {
        t.show_in_todo = true;
        await fetch('/api/tasks', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(t) });
      }
    }
    lastCompletedTodo = null;
    document.getElementById('undo-container').classList.add('hidden');
    loadDataFromCloud();
  });

  attachListener('btn-delete-sys', 'click', async (e) => {
    e.preventDefault(); 
    if(!confirm("Are you sure you want to delete this system?")) return;
    const id = document.getElementById('sys-id').value;
    await fetch(`/api/systems?id=${id}`, { method: 'DELETE' });
    document.getElementById('system-form-modal').classList.add('hidden');
    loadDataFromCloud();
  });

  attachListener('btn-edit-sys-detail', 'click', () => {
    document.getElementById('system-detail-modal').classList.add('hidden');
    document.getElementById('sys-modal-title').textContent = "Edit System";
    document.getElementById('sys-id').value = currentlyViewedSystem.id;
    document.getElementById('sys-existing-image').value = currentlyViewedSystem.image_url;
    document.getElementById('sys-name').value = currentlyViewedSystem.name;
    document.getElementById('sys-desc').value = currentlyViewedSystem.description;
    document.getElementById('sys-link').value = currentlyViewedSystem.doc_link || '';
    
    const delBtn = document.getElementById('btn-delete-sys');
    if (delBtn) delBtn.classList.remove('hidden');
    
    document.getElementById('system-form-modal').classList.remove('hidden');
  });

  attachListener('todo-form', 'submit', async(e) => {
    e.preventDefault();
    const input = document.getElementById('todo-input');
    await fetch('/api/todos', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text: input.value}) });
    input.value = '';
    loadDataFromCloud();
  });

  attachListener('settings-form', 'submit', async(e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Syncing...";
    const formData = new FormData();
    formData.append('title', document.getElementById('set-title').value);
    formData.append('subtitle', document.getElementById('set-subtitle').value);
    const fileInput = document.getElementById('home-img-upload');
    if(fileInput.files[0]) formData.append('image', fileInput.files[0]);
    await fetch('/api/settings', { method: 'POST', body: formData });
    btn.textContent = "Sync to Cloud";
    loadDataFromCloud();
  });

  attachListener('task-form', 'submit', async (e) => {
    e.preventDefault(); 
    const id = document.getElementById('task-id').value;
    const taskData = {
      task_date: document.getElementById('task-date').value,
      system_name: document.getElementById('task-system').value,
      task_title: document.getElementById('task-title').value,
      recurrence: document.getElementById('task-recurrence').value,
      show_in_todo: document.getElementById('task-show-todo').checked
    };
    if (id) taskData.id = id;
    await fetch('/api/tasks', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
    document.getElementById('task-modal').classList.add('hidden');
    loadDataFromCloud(); 
  });

  attachListener('system-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = "Saving...";
    const formData = new FormData();
    formData.append('id', document.getElementById('sys-id').value);
    formData.append('existing_image_url', document.getElementById('sys-existing-image').value);
    formData.append('name', document.getElementById('sys-name').value);
    formData.append('description', document.getElementById('sys-desc').value);
    formData.append('doc_link', document.getElementById('sys-link').value);
    const file = document.getElementById('sys-image').files[0];
    if (file) formData.append('image', file);
    await fetch('/api/systems', { method: 'POST', body: formData });
    document.getElementById('system-form-modal').classList.add('hidden');
    btn.textContent = "Save";
    loadDataFromCloud();
  });

});
