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

  tabs.forEach(tab => {
    document.getElementById(`btn-${tab}`).addEventListener('click', () => switchTab(tab));
  });

  // --- DATA STORAGE & SYNC --- //
  let myTasks = []; 
  let mySystems = [];

  async function loadDataFromCloud() {
    try {
      const [tasksRes, sysRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/systems')
      ]);
      
      if (tasksRes.ok) myTasks = await tasksRes.json();
      if (sysRes.ok) mySystems = await sysRes.json();
      
      renderCalendar(currentMonth, currentYear); 
      renderSystems();
      populateSystemDropdowns();
    } catch (error) { console.error("Cloud sync failed:", error); }
  }

  loadDataFromCloud();

  // --- RECURRENCE MATH ENGINE --- //
  // This cleverly calculates repeating dates up to 3 years in advance without bloating the database
  function getExpandedTasks() {
    let expanded = [];
    myTasks.forEach(task => {
      expanded.push(task); // Add original task
      
      if (task.recurrence && task.recurrence !== 'none') {
        let currDate = new Date(task.task_date);
        
        for (let i = 0; i < 36; i++) { // Generate up to 36 instances
          if (task.recurrence === 'weekly') currDate.setDate(currDate.getDate() + 7);
          else if (task.recurrence === 'monthly') currDate.setMonth(currDate.getMonth() + 1);
          else if (task.recurrence === 'semi-annual') currDate.setMonth(currDate.getMonth() + 6);
          else if (task.recurrence === 'annual') currDate.setFullYear(currDate.getFullYear() + 1);
          
          // Stop calculating if it goes beyond 3 years
          if (currDate.getFullYear() > new Date().getFullYear() + 3) break;

          expanded.push({
            ...task,
            task_date: formatDateForInput(currDate.getFullYear(), currDate.getMonth(), currDate.getDate()),
            is_virtual: true // Marks it as an auto-generated repeat
          });
        }
      }
    });
    return expanded;
  }

  // --- MODALS & FORMS --- //
  function formatDateForInput(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // 1. Task Modal
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  
  document.getElementById('btn-add-task').addEventListener('click', () => {
    taskForm.reset();
    document.getElementById('task-id').value = "";
    document.getElementById('task-modal-title').textContent = "Add New Task";
    document.getElementById('task-date').value = formatDateForInput(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    taskModal.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-task').addEventListener('click', () => {
    taskModal.classList.add('hidden');
  });

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const submitBtn = document.getElementById('btn-save-task');
    submitBtn.textContent = "Saving...";

    const taskId = document.getElementById('task-id').value;
    const taskData = {
      task_date: document.getElementById('task-date').value,
      system_name: document.getElementById('task-system').value,
      task_title: document.getElementById('task-title').value,
      recurrence: document.getElementById('task-recurrence').value
    };

    if (taskId) taskData.id = taskId;

    try {
      await fetch('/api/tasks', {
        method: taskId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      taskModal.classList.add('hidden');
      loadDataFromCloud(); // Refresh everything!
    } catch (err) { alert("Failed to save."); }
    finally { submitBtn.textContent = "Save Task"; }
  });

  // 2. System Form Modal (Image Uploads!)
  const sysModal = document.getElementById('system-form-modal');
  const sysForm = document.getElementById('system-form');

  document.getElementById('btn-add-system').addEventListener('click', () => {
    sysForm.reset();
    sysModal.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-sys').addEventListener('click', () => {
    sysModal.classList.add('hidden');
  });

  sysForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = sysForm.querySelector('button[type="submit"]');
    btn.textContent = "Uploading...";

    const formData = new FormData();
    formData.append('name', document.getElementById('sys-name').value);
    formData.append('description', document.getElementById('sys-desc').value);
    formData.append('doc_link', document.getElementById('sys-link').value);
    
    const fileInput = document.getElementById('sys-image');
    if (fileInput.files[0]) formData.append('image', fileInput.files[0]);

    try {
      await fetch('/api/systems', { method: 'POST', body: formData });
      sysModal.classList.add('hidden');
      loadDataFromCloud();
    } catch (err) { alert("Upload failed."); }
    finally { btn.textContent = "Save"; }
  });

  // --- SYSTEMS RENDER LOGIC --- //
  function renderSystems() {
    const carousel = document.getElementById('systems-carousel');
    carousel.innerHTML = '';

    if (mySystems.length === 0) {
      carousel.innerHTML = `<p class="text-sm text-[#9A8C7E] px-4">No systems added yet. Click the + to create one!</p>`;
      return;
    }

    mySystems.forEach(sys => {
      const card = document.createElement('div');
      card.className = "snap-center shrink-0 w-[85%] sm:w-[300px] bg-white rounded-[32px] p-2 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-[#EAE4D9] cursor-pointer transition hover:-translate-y-1";
      
      // Calculate how many tasks exist for this system
      const upcomingCount = myTasks.filter(t => t.system_name === sys.name).length;

      card.innerHTML = `
        <div class="h-56 rounded-[24px] overflow-hidden relative mb-4">
          <img src="${sys.image_url}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#3E342B]/60 to-transparent"></div>
        </div>
        <div class="px-4 pb-4">
          <h3 class="text-xl font-bold text-[#3E342B] truncate">${sys.name}</h3>
          <p class="text-sm text-[#9A8C7E] mt-1 font-medium">${upcomingCount} Tasks Scheduled</p>
        </div>
      `;

      // Click to open the gorgeous Full-Screen Detail Modal
      card.addEventListener('click', () => openSystemDetail(sys));
      carousel.appendChild(card);
    });
  }

  function populateSystemDropdowns() {
    const dropdown = document.getElementById('task-system');
    dropdown.innerHTML = '<option value="General">General Home</option>'; // Default
    mySystems.forEach(sys => {
      dropdown.innerHTML += `<option value="${sys.name}">${sys.name}</option>`;
    });
  }

  function openSystemDetail(sys) {
    document.getElementById('detail-img').src = sys.image_url;
    document.getElementById('detail-name').textContent = sys.name;
    document.getElementById('detail-desc').textContent = sys.description;
    
    const linkBtn = document.getElementById('detail-link');
    if (sys.doc_link) {
      linkBtn.href = sys.doc_link;
      linkBtn.classList.remove('hidden');
    } else {
      linkBtn.classList.add('hidden');
    }

    // Logic for the "Next Scheduled Task" button
    document.getElementById('btn-jump-calendar').onclick = () => {
      document.getElementById('system-detail-modal').classList.add('hidden');
      switchTab('calendar'); // Jump to calendar tab!
    };

    document.getElementById('system-detail-modal').classList.remove('hidden');
  }

  document.getElementById('btn-close-sys-detail').addEventListener('click', () => {
    document.getElementById('system-detail-modal').classList.add('hidden');
  });


  // --- CALENDAR LOGIC (Now uses getExpandedTasks!) --- //
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYearDisplay = document.getElementById('calendar-month-year');
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth(); 
  let currentYear = currentDate.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function renderCalendar(month, year) {
    calendarGrid.innerHTML = ""; 
    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get ALL tasks, including the auto-generated recurring ones!
    const allTasks = getExpandedTasks();

    for (let i = 0; i < firstDay; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.textContent = day;
      dayCell.classList.add('py-2', 'm-0.5', 'rounded-full', 'cursor-pointer', 'transition');

      const dateString = formatDateForInput(year, month, day);
      const dayTasks = allTasks.filter(t => t.task_date === dateString);

      const today = new Date();
      if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayCell.classList.add('bg-[#5A4C40]', 'text-white', 'shadow-md'); 
      } else if (dayTasks.length > 0) {
        dayCell.classList.add('bg-[#E8EDDF]', 'text-[#5A4C40]', 'font-bold', 'border', 'border-[#9A8C7E]');
      } else {
        dayCell.classList.add('hover:bg-[#EAE4D9]'); 
      }

      // Day View Click Logic
      dayCell.addEventListener('click', () => {
        document.getElementById('day-view-title').textContent = `${monthNames[month]} ${day}`;
        const container = document.getElementById('day-view-tasks');
        container.innerHTML = ''; 
        
        if (dayTasks.length > 0) {
          dayTasks.forEach(task => {
            const isRepeat = task.is_virtual ? '<span class="text-[10px] bg-[#EAE4D9] px-2 py-0.5 rounded uppercase">Repeat</span>' : '';
            const actionBtns = task.is_virtual ? '' : `
              <div class="flex gap-3 text-lg">
                <button onclick="editTask(${task.id})" class="text-[#9A8C7E] hover:text-[#5A4C40]">✏️</button>
                <button onclick="deleteTask(${task.id})" class="text-[#9A8C7E] hover:text-red-500">🗑️</button>
              </div>`;

            container.innerHTML += `
              <div class="bg-[#F4F1EA] rounded-[16px] p-4 border-l-4 border-[#5A4C40] flex justify-between items-center">
                <div>
                  <h4 class="font-bold text-[#3E342B] text-sm flex items-center gap-2">${task.task_title} ${isRepeat}</h4>
                  <p class="text-xs text-[#9A8C7E] mt-1 uppercase tracking-wider">${task.system_name}</p>
                </div>
                ${actionBtns}
              </div>
            `;
          });
        } else {
          container.innerHTML = `<div class="text-center py-6"><p class="text-[#9A8C7E] text-sm font-medium">Nothing scheduled.</p></div>`;
        }
        
        document.getElementById('task-date').value = dateString;
        document.getElementById('day-view-modal').classList.remove('hidden');
      });

      calendarGrid.appendChild(dayCell);
    }
  }

  document.getElementById('btn-close-day-view').addEventListener('click', () => {
    document.getElementById('day-view-modal').classList.add('hidden');
  });

  document.getElementById('btn-open-add-task').addEventListener('click', () => {
    document.getElementById('day-view-modal').classList.add('hidden');
    document.getElementById('task-id').value = "";
    document.getElementById('task-form').reset();
    taskModal.classList.remove('hidden');
  });

  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });

  // Global Edit/Delete Hooks
  window.deleteTask = async function(id) {
    if(!confirm("Delete this task?")) return;
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    document.getElementById('day-view-modal').classList.add('hidden');
    loadDataFromCloud();
  }

  window.editTask = function(id) {
    const task = myTasks.find(t => t.id === id);
    if(!task) return;
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-date').value = task.task_date;
    document.getElementById('task-system').value = task.system_name;
    document.getElementById('task-title').value = task.task_title;
    document.getElementById('task-recurrence').value = task.recurrence || 'none';
    
    document.getElementById('task-modal-title').textContent = "Edit Task";
    document.getElementById('day-view-modal').classList.add('hidden');
    taskModal.classList.remove('hidden');
  }

});
