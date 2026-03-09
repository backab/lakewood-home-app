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

  // --- LOCAL DATA STORAGE (NEW!) --- //
  // We will store tasks here temporarily so you can see the UI working immediately
  let myTasks = []; 

  // --- MODAL LOGIC --- //
  const taskModal = document.getElementById('task-modal');
  const dayViewModal = document.getElementById('day-view-modal'); // NEW Modal
  
  const btnAddTask = document.getElementById('btn-add-task');
  const btnCancelTask = document.getElementById('btn-cancel-task');
  const btnCloseDayView = document.getElementById('btn-close-day-view');
  const btnOpenAddTask = document.getElementById('btn-open-add-task');
  
  const taskForm = document.getElementById('task-form');
  const taskDateInput = document.getElementById('task-date');

  function formatDateForInput(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // Floating + button logic
  btnAddTask.addEventListener('click', () => {
    const today = new Date();
    taskDateInput.value = formatDateForInput(today.getFullYear(), today.getMonth(), today.getDate());
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

  // Clicking "+ Add Task" from inside the Day View modal
  btnOpenAddTask.addEventListener('click', () => {
    dayViewModal.classList.add('hidden');
    taskModal.classList.remove('hidden');
  });

  // Handle saving a task
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const newTask = {
      task_date: document.getElementById('task-date').value,
      system_name: document.getElementById('task-system').value,
      task_title: document.getElementById('task-title').value
    };

    // 1. SAVE LOCALLY & REDRAW CALENDAR (This creates the highlight instantly!)
    myTasks.push(newTask);
    renderCalendar(currentMonth, currentYear); 
    
    // Close modal and reset form
    taskModal.classList.add('hidden');
    taskForm.reset();

    // 2. SEND TO DATABASE (Will fail gracefully until we set up the backend)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
    } catch (error) {
      console.log("Task saved locally. Database connection pending.");
    }
  });


  // --- CALENDAR LOGIC (Updated for Highlights & Popups) --- //
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

      // NEW: Check if this specific date has any tasks saved
      const dateString = formatDateForInput(year, month, day);
      const dayTasks = myTasks.filter(t => t.task_date === dateString);

      const today = new Date();
      if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayCell.classList.add('bg-[#5A4C40]', 'text-white', 'shadow-md'); // Today's Date
      } else if (dayTasks.length > 0) {
        // HIGHLIGHT DATE: It has tasks! (Light earthy green with a border)
        dayCell.classList.add('bg-[#E8EDDF]', 'text-[#5A4C40]', 'font-bold', 'border', 'border-[#9A8C7E]');
      } else {
        dayCell.classList.add('hover:bg-[#EAE4D9]'); // Normal Date
      }

      // NEW: Click logic for days
      dayCell.addEventListener('click', () => {
        if (dayTasks.length > 0) {
          // If there are tasks, show the Day View modal
          document.getElementById('day-view-title').textContent = `Tasks for ${monthNames[month]} ${day}`;
          
          const tasksContainer = document.getElementById('day-view-tasks');
          tasksContainer.innerHTML = ''; // Clear previous
          
          // Build the visual cards for each task on this day
          dayTasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = "bg-[#F4F1EA] rounded-[16px] p-4 border-l-4 border-[#5A4C40]";
            taskCard.innerHTML = `
              <h4 class="font-bold text-[#3E342B] text-sm">${task.task_title}</h4>
              <p class="text-xs text-[#9A8C7E] mt-1 uppercase tracking-wider">${task.system_name}</p>
            `;
            tasksContainer.appendChild(taskCard);
          });
          
          // Pre-fill the add task date just in case they click "+ Add Task" from here
          taskDateInput.value = dateString;
          dayViewModal.classList.remove('hidden');
          
        } else {
          // If no tasks, jump straight to adding a new one
          taskDateInput.value = dateString;
          taskModal.classList.remove('hidden');
        }
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

  renderCalendar(currentMonth, currentYear);
});
