const hideToast = () => {
  const el = document.querySelector(".toast");
  if (el) el.remove();
};

const showToast = (type, msg, time = 5) => {
  hideToast();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerText = msg;

  document.body.appendChild(toast);

  setTimeout(hideToast, time * 1000);
};