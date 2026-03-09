// Wait for the HTML document to fully load before running the script
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Grab our buttons from the HTML using their IDs
  const btnHome = document.getElementById('btn-home');
  const btnTasks = document.getElementById('btn-tasks');
  const btnProfile = document.getElementById('btn-profile');

  // 2. Grab our views (screens) from the HTML using their IDs
  const viewHome = document.getElementById('view-home');
  const viewTasks = document.getElementById('view-tasks');
  const viewProfile = document.getElementById('view-profile');

  // 3. Create a helper function to switch tabs
  function switchTab(activeBtn, activeView) {
    // Hide ALL views by adding the Tailwind 'hidden' class
    viewHome.classList.add('hidden');
    viewTasks.classList.add('hidden');
    viewProfile.classList.add('hidden');

    // Reset ALL buttons to gray (unselected state)
    [btnHome, btnTasks, btnProfile].forEach(btn => {
      btn.classList.remove('text-white');
      btn.classList.add('text-gray-400');
    });

    // Show the view we clicked on by removing 'hidden'
    activeView.classList.remove('hidden');

    // Make the button we clicked on bright white
    activeBtn.classList.remove('text-gray-400');
    activeBtn.classList.add('text-white');
  }

  // 4. Attach click listeners to the buttons
  btnHome.addEventListener('click', () => {
    switchTab(btnHome, viewHome);
  });

  btnTasks.addEventListener('click', () => {
    switchTab(btnTasks, viewTasks);
  });

  btnProfile.addEventListener('click', () => {
    switchTab(btnProfile, viewProfile);
  });

});