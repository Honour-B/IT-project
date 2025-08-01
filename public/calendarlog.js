// const logModal = new bootstrap.Modal(document.getElementById('logModal'));

    // window.openModal= function (elem) {
    //   const date = elem.dataset.date;
    //    const rawLog = elem.dataset.log;
    //     let log = {};

    //     try {
    //       log = JSON.parse(rawLog);
    //       } catch (e) {
    //       console.error("Invalid log JSON", rawLog);
    //       }


    //   document.getElementById('modalDate').textContent = "Log for " + date;
    //   document.getElementById('logDate').value = log.date || date;
    //   document.getElementById('logText').value = log.log_text|| '';
    //   document.getElementById('logId').value = typeof log.log_id === 'number' ? log.log_id : '';
    //   // logModal.show();
    // }

    //  const modalEl = document.getElementById('logModal');
    //  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    //  modalInstance.show();
  
    // // Attach click handler to all day boxes
    // document.querySelectorAll('.day-box').forEach(box => {
    //   box.addEventListener('click', function (e) {
    //     e.stopPropagation(); // Prevent modal from closing immediately
    //     openModal(this);
    //   });
    // });


    function openModal(elem) {
  const date = elem.dataset.date;
  const rawLog = elem.dataset.log;

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time

  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

  // Access only today and current week's past dates
  const isAccessible = selectedDate <= today && selectedDate >= startOfWeek;

  if (!isAccessible) {
    alert("You can only access logs for today and earlier days of this week.");
    return;
  }

  let log = {};
  try {
    log = JSON.parse(rawLog);
  } catch (e) {
    console.error("Invalid log JSON", rawLog);
  }

  document.getElementById('modalDate').textContent = "Log for " + date;
  document.getElementById('logDate').value = log.date || date;
  document.getElementById('logText').value = log.log_text || '';
  document.getElementById('logId').value = typeof log.log_id === 'number' ? log.log_id : '';
  logModal.show();
}
