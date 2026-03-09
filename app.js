document.addEventListener("DOMContentLoaded", () => {
  
  // --- TAB SWITCHING --- //
  const tabs = ['home', 'systems', 'tasks', 'calendar', 'profile'];
  function switchTab(activeTab) {
    tabs.forEach(tab => {
      document.getElementById(`view-${tab}`).classList.add('hidden');
      document.getElementById(`btn-${tab}`).classList.remove('text-[#5A4C40]');
      document.getElementById(`btn-${tab}`).classList.add('text-[#BBAEA0]');
    });
    document.getElementById(`view-${activeTab}`).classList.remove('hidden');
    document.getElementById(`btn-${activeTab}`).classList.remove('text-[#BBAEA0]');
    document.getElementById(`btn-${activeTab}`).classList.add('text-[#5A4C40]');
  }
  tabs.forEach(tab => document.getElementById(`btn-${tab}`).addEventListener('click', () => switchTab(tab)));

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
        if(settings.url) document.getElementById('main-home-image').src = settings.url;
      }
      
      renderCalendar(currentMonth, currentYear); 
      renderSystems('home-systems-carousel'); // Homepage carousel
      renderSystems('tab-systems-carousel');  // Tab carousel
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

  // --- RENDERING LOGIC --- //

  // 1. Homepage 3 Upcoming Tasks
  function renderHomeTasks() {
    const container = document.getElementById('home-upcoming-tasks');
    container.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];
    
    let allUpcoming = getExpandedTasks().filter(t => t.task_date >= todayStr);
    allUpcoming.sort((a, b) => new Date(a.task_date) - new Date(b.task_date));
    const nextThree = allUpcoming.slice(0, 3);

    if (nextThree.length === 0) {
      container.innerHTML = `<p class="text-sm text-[#9A8C7E] italic">All caught up!</p>`;
      return;
    }

    nextThree.forEach(task => {
      container.innerHTML += `
        <div class="bg-white rounded-[20px] p-4 flex gap-4 items-center border-l-4 border-[#5A4C40] shadow-sm">
          <div class="flex-1">
            <h4 class="font-bold text-[#3E342B] text-sm">${task.task_title}</h4>
            <p class="text-xs text-[#9A8C7E] mt-0.5">${task.task_date} • ${task.system_name}</p>
          </div>
        </div>`;
    });
  }

  // 2. Systems Carousel (Reusable for Home and Systems Tab)
  let currentlyViewedSystem = null; // Track this for editing

  function renderSystems(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (mySystems.length === 0) return;

    mySystems.forEach(sys => {
      const card = document.createElement('div');
      card.className = "snap-center shrink-0 w-[85%] sm:w-[300px] bg-white rounded-[32px] p-2 shadow-sm border border-[#EAE4D9] cursor-pointer";
      const taskCount = myTasks.filter(t => t.system_name === sys.name).length;
      card.innerHTML = `
        <div class="h-48 rounded-[24px] overflow-hidden relative mb-4">
          <img src="${sys.image_url}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#3E342B]/60 to-transparent"></div>
        </div>
        <div class="px-4 pb-4">
          <h3 class="text-xl font-bold text-[#3E342B] truncate">${sys.name}</h3>
          <p class="text-sm text-[#9A8C7E] mt-1 font-medium">${taskCount} Scheduled Tasks</p>
        </div>
      `;
      card.addEventListener('click', () => {
        currentlyViewedSystem = sys; // Save state for edit button
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
    dropdown.innerHTML = '<option value="General">General Home</option>';
    mySystems.forEach(sys => dropdown.innerHTML += `<option value="${sys.name}">${sys.name}</option>`);
  }

  // 3. To-Do List Rendering (Combines Manual + Calendar To-Dos)
  window.completeTodo = async function(id, type) {
    if (type === 'manual') {
      await fetch('/api/todos', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
    } else {
      // It's a calendar task. Set show_in_todo to false!
      const t = myTasks.find(task => task.id == id);
      t.show_in_todo = false;
      await fetch('/api/tasks', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(t) });
    }
    loadDataFromCloud();
  }

  function renderTodoList() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    let count = 0;

    // A. Render Scheduled Calendar Tasks (Darker brown)
    myTasks.filter(t => t.show_in_todo).forEach(task => {
      count++;
      list.innerHTML += `
        <div class="flex items-center gap-4 bg-[#BBAEA0] text-white p-4 rounded-2xl shadow-sm mb-3 cursor-pointer hover:opacity-90 transition" onclick="completeTodo(${task.id}, 'calendar')">
          <div class="w-6 h-6 rounded-full border-2 border-white flex-shrink-0 flex items-center justify-center"></div>
          <div>
            <span class="font-bold text-sm block">${task.task_title}</span>
            <span class="text-xs opacity-80 uppercase tracking-widest">${task.task_date}</span>
          </div>
        </div>`;
    });

    // B. Render Manual To-Dos (Lighter brown)
    myTodos.forEach(todo => {
      count++;
      list.innerHTML += `
        <div class="flex items-center gap-4 bg-[#EAE4D9] text-[#5A4C40] p-4 rounded-[20px] shadow-sm mb-3 cursor-pointer hover:opacity-90 transition" onclick="completeTodo(${todo.id}, 'manual')">
          <div class="w-6 h-6 rounded-full border-2 border-[#9A8C7E] flex-shrink-0 flex items-center justify-center"></div>
          <span class="font-bold text-sm block">${todo.text}</span>
        </div>`;
    });

    if(count === 0) list.innerHTML = `<p class="text-center text-sm text-[#9A8C7E] py-8">No open to-dos. Great job!</p>`;
  }

  // --- FORM HANDLERS --- //

  // Add Manual To-Do
  document.getElementById('todo-form').addEventListener('submit', async(e) => {
    e.preventDefault();
    const input = document.getElementById('todo-input');
    await fetch('/api/todos', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text: input.value}) });
    input.value = '';
    loadDataFromCloud();
  });

  // Upload Profile Image
  document.getElementById('settings-form').addEventListener('submit', async(e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Syncing...";
    const formData = new FormData();
    formData.append('image', document.getElementById('home-img-upload').files[0]);
    await fetch('/api/settings', { method: 'POST', body: formData });
    btn.textContent = "Sync to Cloud";
    loadDataFromCloud();
  });

  // Task Save
  document.getElementById('task-form').addEventListener('submit', async (e) => {
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

  // Edit System Detail
  document.getElementById('btn-edit-sys-detail').addEventListener('click', () => {
    document.getElementById('system-detail-modal').classList.add('hidden');
    document.getElementById('sys-modal-title').textContent = "Edit System";
    document.getElementById('sys-id').value = currentlyViewedSystem.id;
    document.getElementById('sys-existing-image').value = currentlyViewedSystem.image_url;
    document.getElementById('sys-name').value = currentlyViewedSystem.name;
    document.getElementById('sys-desc').value = currentlyViewedSystem.description;
    document.getElementById('sys-link').value = currentlyViewedSystem.doc_link || '';
    document.getElementById('system-form-modal').classList.remove('hidden');
  });

  // System Save
  document.getElementById('btn-add-system').addEventListener('click', () => {
    document.getElementById('system-form').reset();
    document.getElementById('sys-id').value = "";
    document.getElementById('sys-existing-image').value = "";
    document.getElementById('sys-modal-title').textContent = "Add Home System";
    document.getElementById('system-form-modal').classList.remove('hidden');
  });

  document.getElementById('system-form').addEventListener('submit', async (e) => {
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


  // --- CALENDAR RENDERING --- //
  const calendarGrid = document.getElementById('calendar-grid');
  let currentMonth = new Date().getMonth(); let currentYear = new Date().getFullYear();
  
  function renderCalendar(month, year) {
    calendarGrid.innerHTML = ""; 
    document.getElementById('calendar-month-year').textContent = `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month]} ${year}`;
    const allTasks = getExpandedTasks();
    for (let i = 0; i < new Date(year, month, 1).getDay(); i++) calendarGrid.appendChild(document.createElement('div'));

    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const cell = document.createElement('div');
      cell.textContent = day;
      cell.classList.add('py-2', 'm-0.5', 'rounded-full', 'cursor-pointer');
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = allTasks.filter(t => t.task_date === dateStr);

      if (day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) cell.classList.add('bg-[#5A4C40]', 'text-white'); 
      else if (dayTasks.length > 0) cell.classList.add('bg-[#E8EDDF]', 'text-[#5A4C40]', 'font-bold', 'border', 'border-[#9A8C7E]');
      else cell.classList.add('hover:bg-[#EAE4D9]'); 

      cell.addEventListener('click', () => {
        document.getElementById('day-view-title').textContent = `${dateStr}`;
        const container = document.getElementById('day-view-tasks');
        container.innerHTML = dayTasks.length ? dayTasks.map(t => `
          <div class="bg-[#F4F1EA] rounded-[16px] p-4 border-l-4 border-[#5A4C40] flex justify-between">
            <div><h4 class="font-bold text-[#3E342B] text-sm">${t.task_title}</h4><p class="text-xs text-[#9A8C7E] mt-1">${t.system_name}</p></div>
            ${t.is_virtual ? '' : `<div class="flex gap-3"><button onclick="editTask(${t.id})" class="text-[#9A8C7E]">✏️</button><button onclick="deleteTask(${t.id})" class="text-[#9A8C7E]">🗑️</button></div>`}
          </div>`).join('') : `<p class="text-center text-[#9A8C7E] py-4">Nothing scheduled.</p>`;
        document.getElementById('task-date').value = dateStr;
        document.getElementById('day-view-modal').classList.remove('hidden');
      });
      calendarGrid.appendChild(cell);
    }
  }

  document.getElementById('prev-month').addEventListener('click', () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} renderCalendar(currentMonth, currentYear); });
  document.getElementById('next-month').addEventListener('click', () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} renderCalendar(currentMonth, currentYear); });

  window.deleteTask = async function(id) {
    if(confirm("Delete task?")) { await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' }); document.getElementById('day-view-modal').classList.add('hidden'); loadDataFromCloud(); }
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
});
