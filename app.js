document.addEventListener("DOMContentLoaded", () => {
  
  // --- TAB SWITCHING LOGIC --- //
  const btnHome = document.getElementById('btn-home');
  const btnTasks = document.getElementById('btn-tasks');
  const btnCalendar = document.getElementById('btn-calendar'); 
  const btnProfile = document.getElementById('btn-profile');

  const viewHome = document.getElementById('view-home');
  const viewTasks = document.getElementById('view-tasks');
  const viewCalendar = document.getElementById('view-calendar'); 
  const viewProfile = document.getElementById('view-profile');

  function switchTab(activeBtn, activeView) {
    viewHome.classList.add('hidden');
    viewTasks.classList.add('hidden');
    viewCalendar.classList.add('hidden');
    viewProfile.classList.add('hidden');

    [btnHome, btnTasks, btnCalendar, btnProfile].forEach(btn => {
      btn.classList.remove('text-[#5A4C40]');
      btn.classList.add('text-[#BBAEA0]');
    });

    activeView.classList.remove('hidden');
    activeBtn.classList.remove('text-[#BBAEA0]');
    activeBtn.classList.add('text-[#5A4C40]');
  }

  btnHome.addEventListener('click', () => switchTab(btnHome, viewHome));
  btnTasks.addEventListener('click', () => switchTab(btnTasks, viewTasks));
  btnCalendar.addEventListener('click', () => switchTab(btnCalendar, viewCalendar));
  btnProfile.addEventListener('click', () => switchTab(btnProfile, viewProfile));

  // --- CLOUD DATA STORAGE --- //
  let myTasks = []; 

  async function loadTasksFromCloud() {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        myTasks = await response.json(); 
        renderCalendar(currentMonth, currentYear); 
      }
    } catch (error) {
      console.error("Could not load tasks from cloud:", error);
    }
  }

  loadTasksFromCloud();


  // --- MODAL LOGIC --- //
  const taskModal = document.getElementById('task-modal');
  const dayViewModal = document.getElementById('day-view-modal'); 
  const taskModalTitle = document.getElementById('task-modal-title'); // NEW
  
  const btnAddTask = document.getElementById('btn-add-task');
  const btnCancelTask = document.getElementById('btn-cancel-task');
  const btnCloseDayView = document.getElementById('btn-close-day-view');
  const btnOpenAddTask = document.getElementById('btn-open-add-task');
  
  const taskForm = document.getElementById('task-form');
  const taskIdInput = document.getElementById('task-id'); // NEW
  const taskDateInput = document.getElementById('task-date');
  const taskSystemInput = document.getElementById('task-system');
  const taskTitleInput = document.getElementById('task-title');

  function formatDateForInput(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // Floating + button logic (For Creating)
  btnAddTask.addEventListener('click', () => {
    const today = new Date();
    taskForm.reset(); // Clear old data
    taskIdInput.value = ""; // Clear ID so we know it's a new task
    taskModalTitle.textContent = "Add New Task";
    taskDateInput.value = formatDateForInput(today.getFullYear(), today.getMonth(), today.getDate());
    taskModal.classList.remove('hidden');
  });

  // Clicking "+ Add Task" from inside the Day View modal
  btnOpenAddTask.addEventListener('click', () => {
    const currentDateVal = taskDateInput.value; // Remember the date we were looking at
    dayViewModal.classList.add('hidden');
    taskForm.reset();
    taskIdInput.value = "";
    taskModalTitle.textContent = "Add New Task";
    taskDateInput.value = currentDateVal;
    taskModal.classList.remove('hidden');
  });

  // Close buttons
  btnCancelTask.addEventListener('click', () => {
    taskModal.classList.add('hidden');
    taskForm.reset(); 
  });

  btnCloseDayView.addEventListener('click', () => {
    dayViewModal.classList.add('hidden');
  });

  // Global functions to handle Edit/Delete from dynamically generated HTML
  window.deleteTask = async function(id) {
    if(!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        dayViewModal.classList.add('hidden');
        loadTasksFromCloud(); // Refresh the data!
      }
    } catch (err) {
      alert("Failed to delete task.");
    }
  }

  window.editTask = function(id) {
    // Find the task in our local memory
    const taskToEdit = myTasks.find(t => t.id === id);
    if(!taskToEdit) return;

    // Fill the form with the task's existing data
    taskIdInput.value = taskToEdit.id;
    taskDateInput.value = taskToEdit.task_date;
    taskSystemInput.value = taskToEdit.system_name;
    taskTitleInput.value = taskToEdit.task_title;
    
    // Switch the UI to "Edit Mode"
    taskModalTitle.textContent = "Edit Task";
    dayViewModal.classList.add('hidden');
    taskModal.classList.remove('hidden');
  }

  // Handle saving a task (Smart enough to know Create vs Update)
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const submitBtn = document.getElementById('btn-save-task');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Saving...";

    const isUpdating = taskIdInput.value !== ""; // Do we have an ID?
    
    const taskData = {
      task_date: taskDateInput.value,
      system_name: taskSystemInput.value,
      task_title: taskTitleInput.value
    };

    if (isUpdating) {
      taskData.id = taskIdInput.value; // Attach the ID for the database
    }

    try {
      const response = await fetch('/api/tasks', {
        method: isUpdating ? 'PUT' : 'POST', // Use PUT if updating, POST if creating
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        taskModal.classList.add('hidden');
        taskForm.reset();
        loadTasksFromCloud(); // Force a fresh sync from the cloud!
      } else {
        alert("Error saving to database.");
      }
    } catch (error) {
      alert("Network error. Could not reach the cloud.");
    } finally {
      submitBtn.textContent = originalText;
    }
  });


  // --- CALENDAR LOGIC --- //
  const monthYearDisplay = document.getElementById('calendar-month-year');
  const calendarGrid = document.getElementById('calendar-grid');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');

  let currentDate = new Date();
  let currentMonth = currentDate.getMonth(); 
  let currentYear = currentDate.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function renderCalendar(month, year) {
    calendarGrid.innerHTML = ""; 
    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.textContent = day;
      dayCell.classList.add('py-2', 'm-0.5', 'rounded-full', 'cursor-pointer', 'transition');

      const dateString = formatDateForInput(year, month, day);
      const dayTasks = myTasks.filter(t => t.task_date === dateString);

      const today = new Date();
      if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayCell.classList.add('bg-[#5A4C40]', 'text-white', 'shadow-md'); 
      } else if (dayTasks.length > 0) {
        dayCell.classList.add('bg-[#E8EDDF]', 'text-[#5A4C40]', 'font-bold', 'border', 'border-[#9A8C7E]');
      } else {
        dayCell.classList.add('hover:bg-[#EAE4D9]'); 
      }

      // Click logic for days 
      dayCell.addEventListener('click', () => {
        document.getElementById('day-view-title').textContent = `Tasks for ${monthNames[month]} ${day}`;
        const tasksContainer = document.getElementById('day-view-tasks');
        tasksContainer.innerHTML = ''; 
        
        if (dayTasks.length > 0) {
          dayTasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = "bg-[#F4F1EA] rounded-[16px] p-4 border-l-4 border-[#5A4C40] flex justify-between items-center";
            // Note: We added an Edit (✏️) and Delete (🗑️) button here!
            taskCard.innerHTML = `
              <div>
                <h4 class="font-bold text-[#3E342B] text-sm">${task.task_title}</h4>
                <p class="text-xs text-[#9A8C7E] mt-1 uppercase tracking-wider">${task.system_name}</p>
              </div>
              <div class="flex gap-3 text-lg">
                <button onclick="editTask(${task.id})" class="text-[#9A8C7E] hover:text-[#5A4C40] transition">✏️</button>
                <button onclick="deleteTask(${task.id})" class="text-[#9A8C7E] hover:text-red-500 transition">🗑️</button>
              </div>
            `;
            tasksContainer.appendChild(taskCard);
          });
        } else {
          const emptyState = document.createElement('div');
          emptyState.className = "text-center py-6";
          emptyState.innerHTML = `
            <div class="text-3xl mb-2 opacity-50">✨</div>
            <p class="text-[#9A8C7E] text-sm font-medium">Nothing scheduled for today.</p>
          `;
          tasksContainer.appendChild(emptyState);
        }
        
        taskDateInput.value = dateString;
        dayViewModal.classList.remove('hidden');
      });

      calendarGrid.appendChild(dayCell);
    }
  }

  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentYear > currentDate.getFullYear() + 3) { currentMonth = 11; currentYear--; return; }
    renderCalendar(currentMonth, currentYear);
  });
});
