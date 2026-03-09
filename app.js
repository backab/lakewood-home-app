document.addEventListener("DOMContentLoaded", () => {
  
  // --- TAB SWITCHING LOGIC (Unchanged) --- //
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


  // --- MODAL LOGIC (NEW!) --- //
  const taskModal = document.getElementById('task-modal');
  const btnAddTask = document.getElementById('btn-add-task');
  const btnCancelTask = document.getElementById('btn-cancel-task');
  const taskForm = document.getElementById('task-form');
  const taskDateInput = document.getElementById('task-date');

  // Helper function to format a date to YYYY-MM-DD for the HTML input
  function formatDateForInput(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // Open modal when the floating "+" button is clicked
  btnAddTask.addEventListener('click', () => {
    // Default to today's date
    const today = new Date();
    taskDateInput.value = formatDateForInput(today.getFullYear(), today.getMonth(), today.getDate());
    taskModal.classList.remove('hidden');
  });

  // Close modal when "Cancel" is clicked
  btnCancelTask.addEventListener('click', () => {
    taskModal.classList.add('hidden');
    taskForm.reset(); // Clear the form
  });

  // Handle Form Submission (Saving to database)
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the page from reloading

    const newTask = {
      task_date: document.getElementById('task-date').value,
      system_name: document.getElementById('task-system').value,
      task_title: document.getElementById('task-title').value
    };

    console.log("Saving this to the database:", newTask);

    try {
      // Send the data to our Cloudflare backend API
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });

      if (response.ok) {
        alert("Task saved to the cloud!");
        taskModal.classList.add('hidden');
        taskForm.reset();
        // In the future, we will refresh the calendar data here!
      } else {
        alert("There was an error saving the task.");
      }
    } catch (error) {
      console.error("Error connecting to database:", error);
      alert("Make sure your backend API is deployed!");
    }
  });


  // --- CALENDAR LOGIC (Updated to open modal) --- //
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

      const today = new Date();
      if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayCell.classList.add('bg-[#5A4C40]', 'text-white', 'shadow-md');
      } else {
        dayCell.classList.add('hover:bg-[#EAE4D9]');
      }

      // NEW: When a user clicks a specific day, open the modal for that date!
      dayCell.addEventListener('click', () => {
        taskDateInput.value = formatDateForInput(year, month, day);
        taskModal.classList.remove('hidden');
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
