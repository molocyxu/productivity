const STORAGE_KEY = "orbit_state_v1";
const INSIGHT_RANGE_DAYS = 7;

const themeOptions = [
  { value: "aurora", label: "Aurora" },
  { value: "midnight", label: "Midnight" },
  { value: "solar", label: "Solar" },
  { value: "mono", label: "Mono" }
];

const colorPalette = [
  "#6c7bff",
  "#31d0f0",
  "#f97316",
  "#22c55e",
  "#f43f5e",
  "#a855f7",
  "#facc15",
  "#14b8a6"
];

const defaultState = {
  theme: "aurora",
  events: [],
  todos: [],
  statuses: [],
  notes: ""
};

const elements = {};
let state = loadState();
let notesTimer = null;

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...defaultState };
  }
  try {
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (error) {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function init() {
  cacheElements();
  initThemeSelect();
  initColorPalette();
  initSplitPanels();
  bindForms();
  bindLists();
  bindControls();
  initNotes();
  clearEventForm();
  clearTodoForm();
  applyTheme(state.theme);
  updateClock();
  renderAll();
  setInterval(updateClock, 1000);
  setInterval(() => {
    renderEvents();
    renderInsights();
    renderMetrics();
  }, 60000);
}

function cacheElements() {
  elements.themeSelect = document.getElementById("theme-select");
  elements.todayDate = document.getElementById("today-date");
  elements.liveClock = document.getElementById("live-clock");
  elements.eventForm = document.getElementById("event-form");
  elements.eventId = document.getElementById("event-id");
  elements.eventTitle = document.getElementById("event-title");
  elements.eventDate = document.getElementById("event-date");
  elements.eventStart = document.getElementById("event-start");
  elements.eventEnd = document.getElementById("event-end");
  elements.eventAllDay = document.getElementById("event-allday");
  elements.eventPriority = document.getElementById("event-priority");
  elements.eventCalendar = document.getElementById("event-calendar");
  elements.eventVisibility = document.getElementById("event-visibility");
  elements.eventReminder = document.getElementById("event-reminder");
  elements.eventRepeat = document.getElementById("event-repeat");
  elements.eventLocation = document.getElementById("event-location");
  elements.eventLink = document.getElementById("event-link");
  elements.eventGuests = document.getElementById("event-guests");
  elements.eventDescription = document.getElementById("event-description");
  elements.eventColor = document.getElementById("event-color");
  elements.eventColorPalette = document.getElementById("event-color-palette");
  elements.eventList = document.getElementById("event-list");
  elements.eventCount = document.getElementById("event-count");
  elements.eventSubtitle = document.getElementById("event-subtitle");
  elements.eventClear = document.getElementById("event-clear");
  elements.calendarSummary = document.getElementById("calendar-summary");
  elements.todoForm = document.getElementById("todo-form");
  elements.todoId = document.getElementById("todo-id");
  elements.todoTitle = document.getElementById("todo-title");
  elements.todoStart = document.getElementById("todo-start");
  elements.todoDue = document.getElementById("todo-due");
  elements.todoLink = document.getElementById("todo-link");
  elements.todoPriority = document.getElementById("todo-priority");
  elements.todoNotes = document.getElementById("todo-notes");
  elements.todoClear = document.getElementById("todo-clear");
  elements.todoList = document.getElementById("todo-list");
  elements.todoCount = document.getElementById("todo-count");
  elements.todoSummary = document.getElementById("todo-summary");
  elements.statusForm = document.getElementById("status-form");
  elements.statusLabel = document.getElementById("status-label");
  elements.statusColor = document.getElementById("status-color");
  elements.statusImage = document.getElementById("status-image");
  elements.statusList = document.getElementById("status-list");
  elements.statusSummary = document.getElementById("status-summary");
  elements.urgentEvents = document.getElementById("urgent-events");
  elements.dueSoon = document.getElementById("due-soon");
  elements.insightSummary = document.getElementById("insight-summary");
  elements.notesInput = document.getElementById("notes-input");
  elements.notesSummary = document.getElementById("notes-summary");
  elements.metricEvents = document.getElementById("metric-events");
  elements.metricTasks = document.getElementById("metric-tasks");
  elements.metricFocus = document.getElementById("metric-focus");
  elements.loadSample = document.getElementById("load-sample");
  elements.resetData = document.getElementById("reset-data");
  elements.tooltip = document.getElementById("hover-tooltip");
}

function initThemeSelect() {
  elements.themeSelect.innerHTML = themeOptions
    .map((theme) => `<option value="${theme.value}">${theme.label}</option>`)
    .join("");
  elements.themeSelect.value = state.theme;
  elements.themeSelect.addEventListener("change", () => {
    state.theme = elements.themeSelect.value;
    applyTheme(state.theme);
    saveState();
  });
}

function initColorPalette() {
  elements.eventColorPalette.innerHTML = colorPalette
    .map((color) => `<button class="color-chip" type="button" data-color="${color}" style="background:${color}"></button>`)
    .join("");
  elements.eventColorPalette.addEventListener("click", (event) => {
    const chip = event.target.closest(".color-chip");
    if (!chip) return;
    elements.eventColor.value = chip.dataset.color;
  });
}

function initSplitPanels() {
  if (typeof Split !== "function") return;
  Split(["#calendar-column", "#todo-column", "#right-column"], {
    sizes: [46, 32, 22],
    minSize: 280,
    gutterSize: 12
  });
  Split(["#status-panel", "#insights-panel", "#notes-panel"], {
    direction: "vertical",
    sizes: [30, 34, 36],
    minSize: 160,
    gutterSize: 12
  });
}

function bindForms() {
  elements.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = getEventFormData();
    if (!payload) return;
    const existingIndex = state.events.findIndex((item) => item.id === payload.id);
    if (existingIndex >= 0) {
      state.events[existingIndex] = payload;
    } else {
      state.events.unshift(payload);
    }
    saveState();
    clearEventForm();
    renderEvents();
    renderInsights();
    renderMetrics();
  });

  elements.eventClear.addEventListener("click", clearEventForm);
  elements.eventAllDay.addEventListener("change", () => {
    const disabled = elements.eventAllDay.checked;
    elements.eventStart.disabled = disabled;
    elements.eventEnd.disabled = disabled;
  });

  elements.todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = getTodoFormData();
    if (!payload) return;
    const existingIndex = state.todos.findIndex((item) => item.id === payload.id);
    if (existingIndex >= 0) {
      state.todos[existingIndex] = payload;
    } else {
      state.todos.unshift(payload);
    }
    saveState();
    clearTodoForm();
    renderTodos();
    renderInsights();
    renderMetrics();
  });

  elements.todoClear.addEventListener("click", clearTodoForm);

  elements.statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const label = elements.statusLabel.value.trim();
    if (!label) return;
    const imageData = await readFile(elements.statusImage.files[0]);
    state.statuses.unshift({
      id: createId(),
      label,
      color: elements.statusColor.value,
      image: imageData || "",
      createdAt: new Date().toISOString()
    });
    saveState();
    elements.statusForm.reset();
    renderStatuses();
  });
}

function bindLists() {
  elements.eventList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    const card = event.target.closest(".event-card");
    if (!card) return;
    const id = card.dataset.id;
    if (action === "edit-event") {
      fillEventForm(id);
    }
    if (action === "delete-event") {
      state.events = state.events.filter((item) => item.id !== id);
      saveState();
      renderEvents();
      renderInsights();
      renderMetrics();
    }
  });

  elements.todoList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    const card = event.target.closest(".todo-card");
    if (!card) return;
    const id = card.dataset.id;
    if (action === "toggle-todo") {
      toggleTodo(id);
    }
    if (action === "edit-todo") {
      fillTodoForm(id);
    }
    if (action === "delete-todo") {
      state.todos = state.todos.filter((item) => item.id !== id);
      saveState();
      renderTodos();
      renderInsights();
      renderMetrics();
    }
  });

  elements.statusList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const id = actionButton.dataset.id;
    state.statuses = state.statuses.filter((item) => item.id !== id);
    saveState();
    renderStatuses();
  });

  elements.eventList.addEventListener("pointerover", (event) => {
    const card = event.target.closest(".event-card");
    if (!card) return;
    const eventData = state.events.find((item) => item.id === card.dataset.id);
    if (!eventData) return;
    elements.tooltip.innerHTML = buildEventTooltip(eventData);
    elements.tooltip.classList.add("visible");
    positionTooltip(event);
  });

  elements.eventList.addEventListener("pointermove", (event) => {
    if (!elements.tooltip.classList.contains("visible")) return;
    positionTooltip(event);
  });

  elements.eventList.addEventListener("pointerout", (event) => {
    const related = event.relatedTarget;
    if (related && related.closest && related.closest(".event-card")) {
      return;
    }
    elements.tooltip.classList.remove("visible");
  });

  elements.eventList.addEventListener("pointerleave", () => {
    elements.tooltip.classList.remove("visible");
  });
}

function bindControls() {
  elements.loadSample.addEventListener("click", () => {
    const sample = getSampleData();
    state = { ...state, ...sample };
    saveState();
    renderAll();
  });

  elements.resetData.addEventListener("click", () => {
    const confirmed = window.confirm("Reset all data for this dashboard?");
    if (!confirmed) return;
    state = { ...defaultState, theme: state.theme };
    saveState();
    clearEventForm();
    clearTodoForm();
    elements.notesInput.value = "";
    renderAll();
  });
}

function initNotes() {
  elements.notesInput.value = state.notes || "";
  elements.notesInput.addEventListener("input", () => {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => {
      state.notes = elements.notesInput.value;
      saveState();
      elements.notesSummary.textContent = `Saved at ${formatClockTime(new Date())}`;
    }, 400);
  });
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  elements.themeSelect.value = theme;
}

function updateClock() {
  const now = new Date();
  elements.todayDate.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  elements.liveClock.textContent = formatClockTime(now);
}

function renderAll() {
  renderEvents();
  renderTodos();
  renderStatuses();
  renderInsights();
  renderMetrics();
}

function renderEvents() {
  const today = getTodayISO();
  const list = elements.eventList;
  const scroll = list.scrollTop;
  const todaysEvents = state.events
    .filter((item) => item.date === today)
    .sort(sortEventsByTime);
  if (!todaysEvents.length) {
    list.innerHTML = `<div class="empty-state">No events yet. Add one above.</div>`;
  } else {
    list.innerHTML = todaysEvents.map((event) => buildEventCard(event)).join("");
  }
  list.scrollTop = scroll;
  elements.eventCount.textContent = `${todaysEvents.length} event${todaysEvents.length === 1 ? "" : "s"}`;
  const runningCount = todaysEvents.filter((item) => getEventStatus(item).status === "running").length;
  elements.eventSubtitle.textContent =
    runningCount > 0 ? `${runningCount} in progress right now` : "No live events right now";
  elements.calendarSummary.textContent = todaysEvents.length
    ? `${todaysEvents.length} today · ${runningCount} live`
    : "No events";
}

function renderTodos() {
  const list = elements.todoList;
  const scroll = list.scrollTop;
  const sortedTodos = [...state.todos].sort(sortTodosByDate);
  if (!sortedTodos.length) {
    list.innerHTML = `<div class="empty-state">Add tasks with start and due dates.</div>`;
  } else {
    list.innerHTML = sortedTodos.map((todo) => buildTodoCard(todo)).join("");
  }
  list.scrollTop = scroll;
  elements.todoCount.textContent = `${sortedTodos.length} task${sortedTodos.length === 1 ? "" : "s"}`;
  const overdueCount = sortedTodos.filter((todo) => getTodoStatus(todo).status === "overdue").length;
  elements.todoSummary.textContent = sortedTodos.length
    ? `${sortedTodos.length} tasks · ${overdueCount} overdue`
    : "No tasks";
}

function renderStatuses() {
  const list = elements.statusList;
  if (!state.statuses.length) {
    list.innerHTML = `<div class="empty-state">Add a status to get started.</div>`;
  } else {
    list.innerHTML = state.statuses
      .map((status) => {
        const imageMarkup = status.image
          ? `<img src="${status.image}" alt="${escapeHtml(status.label)} image" />`
          : "";
        return `
          <div class="status-card" style="border-color:${status.color}">
            <div class="status-header">
              <span class="status-label">${escapeHtml(status.label)}</span>
              <button class="icon-button" data-action="delete-status" data-id="${status.id}" title="Remove">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <span class="badge" style="color:${status.color}">Active status</span>
            ${imageMarkup}
          </div>
        `;
      })
      .join("");
  }
  elements.statusSummary.textContent = state.statuses.length
    ? `${state.statuses.length} saved`
    : "No statuses";
}

function renderInsights() {
  const today = getTodayISO();
  const upcomingEvents = state.events.filter((event) => {
    if (event.priority === "normal") return false;
    return isWithinDays(event.date, today, INSIGHT_RANGE_DAYS);
  });
  const upcomingTodos = state.todos.filter((todo) => {
    if (todo.completed) return false;
    if (!todo.dueDate) return false;
    return isWithinDays(todo.dueDate, today, INSIGHT_RANGE_DAYS);
  });
  elements.urgentEvents.innerHTML = upcomingEvents.length
    ? upcomingEvents
        .sort(sortEventsByDate)
        .map((event) => buildInsightItem(event.title, event.date, event.startTime))
        .join("")
    : `<div class="empty-state">No urgent events in the next ${INSIGHT_RANGE_DAYS} days.</div>`;
  elements.dueSoon.innerHTML = upcomingTodos.length
    ? upcomingTodos
        .sort(sortTodosByDate)
        .map((todo) => buildInsightItem(todo.title, todo.dueDate, null))
        .join("")
    : `<div class="empty-state">No due dates within ${INSIGHT_RANGE_DAYS} days.</div>`;
  const totalInsights = upcomingEvents.length + upcomingTodos.length;
  elements.insightSummary.textContent = totalInsights
    ? `${totalInsights} items soon`
    : "No upcoming items";
}

function renderMetrics() {
  const today = getTodayISO();
  const todaysEvents = state.events.filter((event) => event.date === today);
  const focusCount =
    todaysEvents.filter((event) => event.priority !== "normal").length +
    state.todos.filter((todo) => {
      const status = getTodoStatus(todo).status;
      return status === "overdue" || status === "active";
    }).length;
  elements.metricEvents.textContent = todaysEvents.length;
  elements.metricTasks.textContent = state.todos.length;
  elements.metricFocus.textContent = focusCount;
}

function buildEventCard(event) {
  const status = getEventStatus(event);
  const timeLabel = event.allDay
    ? "All day"
    : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
  const safeLocation = escapeHtml(event.location || "");
  const safeGuests = escapeHtml(event.guests || "");
  const safeCalendar = escapeHtml(event.calendar || "Calendar");
  const safeVisibility = escapeHtml(event.visibility || "Default");
  const safeReminder = escapeHtml(event.reminder || "None");
  const safeRepeat = escapeHtml(event.repeat || "None");
  return `
    <div class="event-card ${event.priority} ${status.status}" data-id="${event.id}" style="border-left-color:${event.color}">
      <div class="event-top">
        <span>${timeLabel}</span>
        <div class="event-actions">
          <button class="icon-button" data-action="edit-event" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="icon-button" data-action="delete-event" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="event-title">${escapeHtml(event.title)}</div>
      <div class="event-meta">
        ${safeLocation ? `<span><i class="fa-solid fa-location-dot"></i> ${safeLocation}</span>` : ""}
        ${safeGuests ? `<span><i class="fa-solid fa-user-group"></i> ${safeGuests}</span>` : ""}
      </div>
      <div class="event-meta">
        <span class="badge">${safeCalendar}</span>
        <span class="badge">${safeVisibility}</span>
        <span class="badge">${safeReminder}</span>
        <span class="badge">${safeRepeat}</span>
      </div>
      <span class="status-pill">${status.label}</span>
    </div>
  `;
}

function buildTodoCard(todo) {
  const status = getTodoStatus(todo);
  const link = safeUrl(todo.link);
  return `
    <div class="todo-card ${todo.completed ? "completed" : ""} ${todo.priority}" data-id="${todo.id}">
      <div class="todo-top">
        <span>${formatDateRange(todo.startDate, todo.dueDate)}</span>
        <div class="todo-actions">
          <button class="icon-button" data-action="toggle-todo" title="Complete">
            <i class="fa-solid ${todo.completed ? "fa-rotate-left" : "fa-check"}"></i>
          </button>
          <button class="icon-button" data-action="edit-todo" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="icon-button" data-action="delete-todo" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="todo-title">${escapeHtml(todo.title)}</div>
      ${todo.notes ? `<div class="todo-meta">${escapeHtml(todo.notes)}</div>` : ""}
      ${link ? `<a class="badge" href="${link}" target="_blank" rel="noreferrer">Open link</a>` : ""}
      <span class="badge">${escapeHtml(todo.priority)}</span>
      <div class="todo-status">${status.label}</div>
    </div>
  `;
}

function buildInsightItem(title, date, time) {
  return `
    <div class="insight-item">
      <strong>${escapeHtml(title)}</strong>
      <span>${formatInsightDate(date, time)}</span>
    </div>
  `;
}

function buildEventTooltip(event) {
  const status = getEventStatus(event);
  const link = safeUrl(event.link);
  const timeLabel = event.allDay
    ? "All day"
    : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
  return `
    <div class="tooltip-title">${escapeHtml(event.title)}</div>
    <div class="tooltip-grid">
      <div><i class="fa-solid fa-clock"></i> ${timeLabel}</div>
      <div><i class="fa-solid fa-bolt"></i> ${status.label}</div>
      ${event.location ? `<div><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location)}</div>` : ""}
      ${event.guests ? `<div><i class="fa-solid fa-user-group"></i> ${escapeHtml(event.guests)}</div>` : ""}
      ${event.calendar ? `<div><i class="fa-solid fa-layer-group"></i> ${escapeHtml(event.calendar)}</div>` : ""}
      ${event.visibility ? `<div><i class="fa-solid fa-eye"></i> ${escapeHtml(event.visibility)}</div>` : ""}
      ${event.reminder ? `<div><i class="fa-solid fa-bell"></i> ${escapeHtml(event.reminder)}</div>` : ""}
      ${event.repeat ? `<div><i class="fa-solid fa-rotate"></i> ${escapeHtml(event.repeat)}</div>` : ""}
      ${link ? `<div><i class="fa-solid fa-link"></i> ${link}</div>` : ""}
      ${event.description ? `<div>${escapeHtml(event.description)}</div>` : ""}
    </div>
  `;
}

function getEventFormData() {
  const title = elements.eventTitle.value.trim();
  if (!title) return null;
  const date = elements.eventDate.value || getTodayISO();
  let startTime = elements.eventStart.value || formatTimeInput(new Date());
  let endTime = elements.eventEnd.value || addMinutesToTime(startTime, 60);
  const allDay = elements.eventAllDay.checked;
  if (allDay) {
    startTime = "00:00";
    endTime = "23:59";
  } else if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    endTime = addMinutesToTime(startTime, 60);
  }
  return {
    id: elements.eventId.value || createId(),
    title,
    date,
    startTime,
    endTime,
    allDay,
    priority: elements.eventPriority.value,
    calendar: elements.eventCalendar.value,
    visibility: elements.eventVisibility.value,
    reminder: elements.eventReminder.value,
    repeat: elements.eventRepeat.value,
    location: elements.eventLocation.value.trim(),
    link: elements.eventLink.value.trim(),
    guests: elements.eventGuests.value.trim(),
    description: elements.eventDescription.value.trim(),
    color: elements.eventColor.value
  };
}

function getTodoFormData() {
  const title = elements.todoTitle.value.trim();
  if (!title) return null;
  const existing = state.todos.find((item) => item.id === elements.todoId.value);
  return {
    id: elements.todoId.value || createId(),
    title,
    startDate: elements.todoStart.value,
    dueDate: elements.todoDue.value,
    link: elements.todoLink.value.trim(),
    priority: elements.todoPriority.value,
    notes: elements.todoNotes.value.trim(),
    completed: existing ? existing.completed : false
  };
}

function clearEventForm() {
  elements.eventForm.reset();
  elements.eventId.value = "";
  elements.eventDate.value = getTodayISO();
  elements.eventStart.value = "";
  elements.eventEnd.value = "";
  elements.eventColor.value = colorPalette[0];
  elements.eventStart.disabled = false;
  elements.eventEnd.disabled = false;
}

function clearTodoForm() {
  elements.todoForm.reset();
  elements.todoId.value = "";
}

function fillEventForm(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  elements.eventId.value = event.id;
  elements.eventTitle.value = event.title;
  elements.eventDate.value = event.date;
  elements.eventStart.value = event.startTime;
  elements.eventEnd.value = event.endTime;
  elements.eventAllDay.checked = event.allDay;
  elements.eventPriority.value = event.priority;
  elements.eventCalendar.value = event.calendar;
  elements.eventVisibility.value = event.visibility;
  elements.eventReminder.value = event.reminder;
  elements.eventRepeat.value = event.repeat;
  elements.eventLocation.value = event.location;
  elements.eventLink.value = event.link;
  elements.eventGuests.value = event.guests;
  elements.eventDescription.value = event.description;
  elements.eventColor.value = event.color;
  elements.eventStart.disabled = event.allDay;
  elements.eventEnd.disabled = event.allDay;
}

function fillTodoForm(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  elements.todoId.value = todo.id;
  elements.todoTitle.value = todo.title;
  elements.todoStart.value = todo.startDate;
  elements.todoDue.value = todo.dueDate;
  elements.todoLink.value = todo.link;
  elements.todoPriority.value = todo.priority;
  elements.todoNotes.value = todo.notes;
}

function toggleTodo(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  saveState();
  renderTodos();
  renderInsights();
  renderMetrics();
}

function getEventStatus(event) {
  const now = new Date();
  const today = getTodayISO();
  const eventDate = event.date || today;
  if (eventDate < today) {
    return { status: "completed", label: "Completed" };
  }
  if (eventDate > today) {
    return { status: "upcoming", label: "Upcoming" };
  }
  const start = event.allDay
    ? new Date(`${eventDate}T00:00:00`)
    : new Date(`${eventDate}T${event.startTime}`);
  const end = event.allDay
    ? new Date(`${eventDate}T23:59:59`)
    : new Date(`${eventDate}T${event.endTime}`);
  if (now >= start && now <= end) {
    return { status: "running", label: "Live now" };
  }
  if (now > end) {
    return { status: "completed", label: "Completed" };
  }
  return { status: "upcoming", label: "Upcoming" };
}

function getTodoStatus(todo) {
  if (todo.completed) {
    return { status: "completed", label: "Completed" };
  }
  const today = getTodayISO();
  if (todo.dueDate && todo.dueDate < today) {
    return { status: "overdue", label: "Overdue" };
  }
  if (todo.startDate && todo.startDate > today) {
    return { status: "upcoming", label: "Starts soon" };
  }
  return { status: "active", label: "In progress" };
}

function formatDateRange(start, due) {
  if (start && due) {
    return `${formatShortDate(start)} - ${formatShortDate(due)}`;
  }
  if (start) {
    return `Starts ${formatShortDate(start)}`;
  }
  if (due) {
    return `Due ${formatShortDate(due)}`;
  }
  return "No dates";
}

function formatInsightDate(date, time) {
  const day = formatRelativeDate(date);
  if (time) {
    return `${day} · ${formatTime(time)}`;
  }
  return day;
}

function formatClockTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTimeInput(date) {
  return date.toTimeString().slice(0, 5);
}

function formatTime(time) {
  if (!time) return "--:--";
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatShortDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatRelativeDate(dateStr) {
  const today = new Date(`${getTodayISO()}T00:00:00`);
  const date = new Date(`${dateStr}T00:00:00`);
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function addMinutesToTime(time, minutesToAdd) {
  const total = timeToMinutes(time) + minutesToAdd;
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(time) {
  if (!time) return 0;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function sortEventsByTime(a, b) {
  return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
}

function sortEventsByDate(a, b) {
  if (a.date === b.date) {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  }
  return a.date.localeCompare(b.date);
}

function sortTodosByDate(a, b) {
  const dateA = a.dueDate || a.startDate || "";
  const dateB = b.dueDate || b.startDate || "";
  return dateA.localeCompare(dateB);
}

function isWithinDays(targetDate, startDate, range) {
  if (!targetDate) return false;
  const start = new Date(`${startDate}T00:00:00`);
  const target = new Date(`${targetDate}T00:00:00`);
  const diff = Math.round((target - start) / 86400000);
  return diff >= 0 && diff <= range;
}

function positionTooltip(event) {
  const tooltip = elements.tooltip;
  const padding = 16;
  const rect = tooltip.getBoundingClientRect();
  let x = event.clientX + 18;
  let y = event.clientY + 18;
  if (x + rect.width > window.innerWidth - padding) {
    x = window.innerWidth - rect.width - padding;
  }
  if (y + rect.height > window.innerHeight - padding) {
    y = window.innerHeight - rect.height - padding;
  }
  tooltip.style.transform = `translate(${x}px, ${y}px)`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return "";
  } catch (error) {
    return "";
  }
}

function readFile(file) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function getSampleData() {
  const today = getTodayISO();
  return {
    events: [
      {
        id: createId(),
        title: "Product sprint review",
        date: today,
        startTime: "09:30",
        endTime: "10:30",
        allDay: false,
        priority: "important",
        calendar: "Work",
        visibility: "Private",
        reminder: "15 minutes",
        repeat: "Weekly",
        location: "Studio 4B",
        link: "https://meet.google.com/",
        guests: "Product team",
        description: "Review sprint wins, risks, and dependencies.",
        color: "#6c7bff"
      },
      {
        id: createId(),
        title: "Design lab",
        date: today,
        startTime: "11:00",
        endTime: "13:00",
        allDay: false,
        priority: "urgent",
        calendar: "Focus",
        visibility: "Default",
        reminder: "30 minutes",
        repeat: "None",
        location: "Innovation hub",
        link: "",
        guests: "UX core",
        description: "Finalize high-fidelity flows and review prototypes.",
        color: "#f97316"
      },
      {
        id: createId(),
        title: "Deep work",
        date: today,
        startTime: "14:30",
        endTime: "17:00",
        allDay: false,
        priority: "normal",
        calendar: "Personal",
        visibility: "Private",
        reminder: "None",
        repeat: "None",
        location: "Focus room",
        link: "",
        guests: "",
        description: "Dedicated time for strategic planning.",
        color: "#22c55e"
      }
    ],
    todos: [
      {
        id: createId(),
        title: "Finalize research outline",
        startDate: today,
        dueDate: addDays(today, 2),
        link: "https://example.com/brief",
        priority: "important",
        notes: "Compile citations and key insights.",
        completed: false
      },
      {
        id: createId(),
        title: "Prep pitch deck",
        startDate: addDays(today, 1),
        dueDate: addDays(today, 4),
        link: "",
        priority: "urgent",
        notes: "Draft slides and collect visuals.",
        completed: false
      }
    ],
    statuses: [
      {
        id: createId(),
        label: "Focused",
        color: "#22c55e",
        image: "",
        createdAt: new Date().toISOString()
      },
      {
        id: createId(),
        label: "In a meeting",
        color: "#f97316",
        image: "",
        createdAt: new Date().toISOString()
      }
    ],
    notes: "Review top three outcomes before lunch."
  };
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

document.addEventListener("DOMContentLoaded", init);
