document.addEventListener("DOMContentLoaded", () => {
  
  // --- TAB SWITCHING LOGIC --- //
  const btnHome = document.getElementById('btn-home');
  const btnTasks = document.getElementById('btn-tasks');
  const btnCalendar = document.getElementById('btn-calendar'); // New button
  const btnProfile = document.getElementById('btn-profile');

  const viewHome = document.getElementById('view-home');
  const viewTasks = document.getElementById('view-tasks');
  const viewCalendar = document.getElementById('view-calendar'); // New view
  const viewProfile = document.getElementById('view-profile');

  function switchTab(activeBtn, activeView) {
    // Hide ALL views
    viewHome.classList.add('hidden');
    viewTasks.classList.add('hidden');
    viewCalendar.classList.add('hidden');
    viewProfile.classList.add('hidden');

    // Reset ALL buttons to light tan
    [btnHome, btnTasks, btnCalendar, btnProfile].forEach(btn => {
      btn.classList.remove('text-[#5A4C40]');
      btn.classList.add('text-[#BBAEA0]');
    });

    // Show active view and highlight active button
    activeView.classList.remove('hidden');
    activeBtn.classList.remove('text-[#BBAEA0]');
    activeBtn.classList.add('text-[#5A4C40]');
  }

  btnHome.addEventListener('click', () => switchTab(btnHome, viewHome));
  btnTasks.addEventListener('click', () => switchTab(btnTasks, viewTasks));
  btnCalendar.addEventListener('click', () => switchTab(btnCalendar, viewCalendar));
  btnProfile.addEventListener('click', () => switchTab(btnProfile, viewProfile));


  // --- CALENDAR LOGIC --- //
  const monthYearDisplay = document.getElementById('calendar-month-year');
  const calendarGrid = document.getElementById('calendar-grid');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');

  let currentDate = new Date();
  let currentMonth = currentDate.getMonth(); // 0-11
  let currentYear = currentDate.getFullYear();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function renderCalendar(month, year) {
    calendarGrid.innerHTML = ""; // Clear existing days
    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

    // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(year, month, 1).getDay();
    // Get the total number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Create blank spaces for days before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      calendarGrid.appendChild(emptyCell);
    }

    // Create the actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.textContent = day;
      dayCell.classList.add('py-2', 'm-0.5', 'rounded-full', 'cursor-pointer', 'transition');

      // Check if it's "Today"
      const today = new Date();
      if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayCell.classList.add('bg-[#5A4C40]', 'text-white', 'shadow-md');
      } else {
        dayCell.classList.add('hover:bg-[#EAE4D9]');
      }

      // Add a click event to each day (to eventually load events)
      dayCell.addEventListener('click', () => {
        console.log(`Clicked on ${monthNames[month]} ${day}, ${year}`);
        // Visual feedback for clicking a day
        document.querySelectorAll('#calendar-grid div').forEach(d => d.classList.remove('ring-2', 'ring-[#9A8C7E]'));
        dayCell.classList.add('ring-2', 'ring-[#9A8C7E]');
      });

      calendarGrid.appendChild(dayCell);
    }
  }

  // Handle Next/Prev Button Clicks
  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    // Limit to +3 years (optional restriction you mentioned)
    if (currentYear > currentDate.getFullYear() + 3) {
      currentMonth = 11;
      currentYear--;
      return; 
    }
    renderCalendar(currentMonth, currentYear);
  });

  // Render the initial calendar on load
  renderCalendar(currentMonth, currentYear);

});
