const STORAGE_KEY = "orbit_state_v1";
// Presets are now stored in IndexedDB (see db.js)
// Migration from localStorage is handled in migration.js
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
  notes: "",
  currentStatus: "invisible",
  showFullTodoList: false,
  showCompletedTodos: true,
  splitSizes: {
    main: [76, 24],
    calendarTodo: [60, 40],
    rightColumn: [30, 34, 36]
  }
};

const elements = {};
let state = null; // Will be loaded asynchronously
let notesTimer = null;
let currentCalendarWeek = null; // Stores the start date of the currently viewed week (Sunday)

async function loadState() {
  try {
    // Try to get state from IndexedDB first (use db.* namespace)
    if (typeof window.dbGetState === "function") {
      try {
        const savedState = await window.dbGetState();
        if (savedState) {
          const loaded = { ...defaultState, ...savedState };
          // Ensure currentStatus exists
          if (!loaded.currentStatus) {
            loaded.currentStatus = "invisible";
          }
          // Ensure splitSizes exists and has all required keys
          if (!loaded.splitSizes) {
            loaded.splitSizes = { ...defaultState.splitSizes };
          } else {
            loaded.splitSizes = {
              ...defaultState.splitSizes,
              ...loaded.splitSizes
            };
          }
          return loaded;
        }
      } catch (e) {
        console.error("Error loading state from IndexedDB:", e);
      }
    }
    
    // Fallback to localStorage if IndexedDB not available or no data
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
    const parsed = JSON.parse(raw);
        const loaded = { ...defaultState, ...parsed };
        // Ensure currentStatus exists
        if (!loaded.currentStatus) {
          loaded.currentStatus = "invisible";
        }
        // Ensure splitSizes exists and has all required keys
        if (!loaded.splitSizes) {
          loaded.splitSizes = { ...defaultState.splitSizes };
        } else {
          loaded.splitSizes = {
            ...defaultState.splitSizes,
            ...loaded.splitSizes
          };
        }
        return loaded;
      }
    } catch (e) {
      console.error("Error loading state from localStorage:", e);
    }
    
    // Return default state if nothing found
    return { ...defaultState };
  } catch (error) {
    console.error("Error loading state:", error);
    return { ...defaultState };
  }
}

async function saveState() {
  try {
    // Save to IndexedDB if available (use db.* namespace)
    if (typeof window.dbSaveState === "function") {
      await window.dbSaveState(state);
    } else {
      // Fallback to localStorage if IndexedDB not available
      try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        if (error.name === "QuotaExceededError") {
          console.error("localStorage quota exceeded. Please use IndexedDB.");
          alert("Storage quota exceeded. Please refresh the page to enable IndexedDB.");
          throw error;
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("Error saving state:", error);
    // Don't throw - allow app to continue functioning
    // Error is already logged
  }
}

async function init() {
  try {
    // Initialize migrations from localStorage to IndexedDB
    // This must run before loading state or any preset operations
    if (typeof initPresetMigration === "function") {
      await initPresetMigration();
    }
    
    // Load state from IndexedDB (or localStorage fallback)
    state = await loadState();
    
    // Ensure state is not null - use default if something went wrong
    if (!state) {
      console.warn("State is null, using default state");
      state = { ...defaultState };
    }
    
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
    updateFileInputLabel();
  applyTheme(state.theme);
  updateClock();
  renderAll();
  setInterval(updateClock, 1000);
  setInterval(() => {
    renderEvents();
      renderTomorrowEvents();
    renderInsights();
    renderMetrics();
  }, 60000);
  } catch (error) {
    console.error("Error during initialization:", error);
    // Fallback: use default state if initialization fails
    if (!state) {
      state = { ...defaultState };
      try {
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
        updateFileInputLabel();
        applyTheme(state.theme);
        updateClock();
        renderAll();
      } catch (fallbackError) {
        console.error("Error in fallback initialization:", fallbackError);
      }
    }
  }
}

function cacheElements() {
  elements.themeSelect = document.getElementById("theme-select");
  elements.todayDate = document.getElementById("today-date");
  elements.liveClock = document.getElementById("live-clock");
  elements.eventForm = document.getElementById("event-form");
  elements.eventId = document.getElementById("event-id");
  elements.eventOccurrenceDate = document.getElementById("event-occurrence-date");
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
  elements.customRepeatDays = document.getElementById("custom-repeat-days");
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
  elements.tomorrowEventList = document.getElementById("tomorrow-event-list");
  elements.tomorrowEventCount = document.getElementById("tomorrow-event-count");
  elements.tomorrowSubtitle = document.getElementById("tomorrow-subtitle");
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
  elements.toggleFullListBtn = document.getElementById("toggle-full-list-btn");
  elements.toggleCompletedBtn = document.getElementById("toggle-completed-btn");
  elements.statusForm = document.getElementById("status-form");
  elements.statusLabel = document.getElementById("status-label");
  elements.statusColor = document.getElementById("status-color");
  elements.statusImage = document.getElementById("status-image");
  elements.statusDisplay = document.getElementById("status-display");
  elements.statusSelector = document.getElementById("status-selector");
  elements.addStatusBtn = document.getElementById("add-status-btn");
  elements.editStatusBtn = document.getElementById("edit-status-btn");
  elements.statusModal = document.getElementById("status-modal");
  elements.statusModalClose = document.getElementById("status-modal-close");
  elements.statusFormCancel = document.getElementById("status-form-cancel");
  elements.statusEditId = document.getElementById("status-edit-id");
  elements.statusModalTitle = document.getElementById("status-modal-title");
  elements.statusFormSubmit = document.getElementById("status-form-submit");
  elements.statusFormSubmitText = document.getElementById("status-form-submit-text");
  elements.statusEditModal = document.getElementById("status-edit-modal");
  elements.statusEditModalClose = document.getElementById("status-edit-modal-close");
  elements.statusEditModalCloseBtn = document.getElementById("status-edit-modal-close-btn");
  elements.statusEditList = document.getElementById("status-edit-list");
  elements.addEventBtn = document.getElementById("add-event-btn");
  elements.viewCalendarBtn = document.getElementById("view-calendar-btn");
  elements.calendarViewModal = document.getElementById("calendar-view-modal");
  elements.calendarViewModalClose = document.getElementById("calendar-view-modal-close");
  elements.calendarWeekGrid = document.getElementById("calendar-week-grid");
  elements.calendarPrevWeek = document.getElementById("calendar-prev-week");
  elements.calendarNextWeek = document.getElementById("calendar-next-week");
  elements.calendarTodayBtn = document.getElementById("calendar-today-btn");
  elements.calendarViewWeekLabel = document.getElementById("calendar-view-week-label");
  elements.eventModal = document.getElementById("event-modal");
  elements.eventModalClose = document.getElementById("event-modal-close");
  elements.eventModalTitle = document.getElementById("event-modal-title");
  elements.eventFormSubmitText = document.getElementById("event-form-submit-text");
  elements.eventDelete = document.getElementById("event-delete");
  elements.confirmModal = document.getElementById("confirm-modal");
  elements.confirmModalClose = document.getElementById("confirm-modal-close");
  elements.confirmModalCancel = document.getElementById("confirm-modal-cancel");
  elements.confirmModalConfirm = document.getElementById("confirm-modal-confirm");
  elements.confirmModalTitle = document.getElementById("confirm-modal-title");
  elements.confirmModalMessage = document.getElementById("confirm-modal-message");
  elements.confirmModalConfirmText = document.getElementById("confirm-modal-confirm-text");
  elements.confirmRecurringOptions = document.getElementById("confirm-recurring-options");
  elements.addTodoBtn = document.getElementById("add-todo-btn");
  elements.todoModal = document.getElementById("todo-modal");
  elements.todoModalClose = document.getElementById("todo-modal-close");
  elements.todoModalTitle = document.getElementById("todo-modal-title");
  elements.todoFormSubmitText = document.getElementById("todo-form-submit-text");
  elements.urgentEvents = document.getElementById("urgent-events");
  elements.dueSoon = document.getElementById("due-soon");
  elements.insightSummary = document.getElementById("insight-summary");
  elements.notesInput = document.getElementById("notes-input");
  elements.notesSummary = document.getElementById("notes-summary");
  elements.metricEvents = document.getElementById("metric-events");
  elements.metricTasks = document.getElementById("metric-tasks");
  elements.metricOverdue = document.getElementById("metric-overdue");
  elements.loadSample = document.getElementById("load-sample");
  elements.resetData = document.getElementById("reset-data");
  elements.settingsMenuButton = document.getElementById("settings-menu-button");
  elements.settingsMenuDropdown = document.getElementById("settings-menu-dropdown");
  elements.savePresetBtn = document.getElementById("save-preset");
  elements.loadPresetBtn = document.getElementById("load-preset");
  elements.savePresetModal = document.getElementById("save-preset-modal");
  elements.savePresetModalClose = document.getElementById("save-preset-modal-close");
  elements.savePresetCancel = document.getElementById("save-preset-cancel");
  elements.savePresetConfirm = document.getElementById("save-preset-confirm");
  elements.presetNameInput = document.getElementById("preset-name-input");
  elements.loadPresetModal = document.getElementById("load-preset-modal");
  elements.loadPresetModalClose = document.getElementById("load-preset-modal-close");
  elements.loadPresetCancel = document.getElementById("load-preset-cancel");
  elements.presetList = document.getElementById("preset-list");
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
  
  // Ensure splitSizes exists in state
  if (!state.splitSizes) {
    state.splitSizes = { ...defaultState.splitSizes };
  }
  
  // Main horizontal split between left section and right column
  const mainSplit = Split([".left-section", "#right-column"], {
    sizes: state.splitSizes.main || [76, 24],
    minSize: [400, 320],
    gutterSize: 12,
    gutter: (index, direction) => {
      const gutter = document.createElement("div");
      gutter.className = `gutter gutter-${direction}`;
      return gutter;
    },
    onDrag: () => {
      document.body.style.cursor = "col-resize";
    },
    onDragEnd: () => {
      document.body.style.cursor = "";
      if (mainSplit) {
        state.splitSizes.main = mainSplit.getSizes();
        saveState();
      }
    }
  });
  
  // Horizontal split for calendar and todo columns
  const calendarTodoSplit = Split(["#calendar-column", "#todo-column"], {
    sizes: state.splitSizes.calendarTodo || [60, 40],
    minSize: 280,
    gutterSize: 12,
    gutter: (index, direction) => {
      const gutter = document.createElement("div");
      gutter.className = `gutter gutter-${direction}`;
      return gutter;
    },
    onDrag: () => {
      document.body.style.cursor = "col-resize";
    },
    onDragEnd: () => {
      document.body.style.cursor = "";
      if (calendarTodoSplit) {
        state.splitSizes.calendarTodo = calendarTodoSplit.getSizes();
        saveState();
      }
    }
  });
  
  // Vertical split for right column panels
  // Wait a bit to ensure DOM is ready and other splits are initialized
  setTimeout(() => {
    const statusPanel = document.getElementById("status-panel");
    const insightsPanel = document.getElementById("insights-panel");
    const notesPanel = document.getElementById("notes-panel");
    const rightColumn = document.getElementById("right-column");
    
    if (statusPanel && insightsPanel && notesPanel && rightColumn) {
      // Ensure right column has proper height and setup
      rightColumn.style.height = "100%";
      rightColumn.style.display = "flex";
      rightColumn.style.flexDirection = "column";
      rightColumn.style.gap = "0";
      
      // Remove conflicting flex properties from panels before Split.js initializes
      [statusPanel, insightsPanel, notesPanel].forEach(panel => {
        panel.style.flex = "0 0 auto";
        panel.style.flexShrink = "0";
        panel.style.minHeight = "160px";
        panel.style.height = "auto";
        panel.style.overflow = "hidden";
      });
      
      const verticalSplit = Split(["#status-panel", "#insights-panel", "#notes-panel"], {
    direction: "vertical",
        sizes: state.splitSizes.rightColumn || [30, 34, 36],
    minSize: 160,
        gutterSize: 12,
        snapOffset: 0,
        expandToMin: false,
        gutter: (index, direction) => {
          const gutter = document.createElement("div");
          gutter.className = `gutter gutter-${direction}`;
          gutter.style.display = "block";
          gutter.style.visibility = "visible";
          gutter.style.flexShrink = "0";
          gutter.style.position = "relative";
          gutter.style.zIndex = "20";
          return gutter;
        },
        onDrag: () => {
          document.body.style.cursor = "row-resize";
        },
        onDragEnd: () => {
          document.body.style.cursor = "";
          if (verticalSplit) {
            state.splitSizes.rightColumn = verticalSplit.getSizes();
            saveState();
          }
        },
        onDragStart: () => {
          // Ensure panels don't have flex interfering during drag
          [statusPanel, insightsPanel, notesPanel].forEach(panel => {
            panel.style.flex = "0 0 auto";
            panel.style.flexShrink = "0";
          });
        }
      });
      
      // Force update to ensure gutters are visible and functional
      if (verticalSplit) {
        setTimeout(() => {
          const gutters = rightColumn.querySelectorAll(".gutter.gutter-vertical");
          gutters.forEach(gutter => {
            gutter.style.display = "block";
            gutter.style.visibility = "visible";
            gutter.style.opacity = "1";
            gutter.style.pointerEvents = "auto";
            gutter.style.cursor = "row-resize";
          });
        }, 100);
      }
    }
  }, 300);
  
  // Ensure all gutters are visible
  setTimeout(() => {
    const gutters = document.querySelectorAll(".gutter");
    gutters.forEach(gutter => {
      gutter.style.display = "block";
      gutter.style.visibility = "visible";
    });
  }, 100);
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
    renderTomorrowEvents();
    renderInsights();
    renderMetrics();
    closeEventModal();
  });

  elements.eventClear.addEventListener("click", clearEventForm);
  
  // Event delete button handler
  if (elements.eventDelete) {
    elements.eventDelete.addEventListener("click", () => {
      const eventId = elements.eventId.value;
      if (!eventId) return;
      const event = state.events.find(e => e.id === eventId);
      if (!event) return;
      
      // Get the occurrence date (the specific date being edited/deleted)
      // This is set when opening the modal from a specific occurrence
      const occurrenceDate = elements.eventOccurrenceDate.value;
      // Fallback to event date field if occurrence date not set
      const eventDate = occurrenceDate || elements.eventDate.value || event.date;
      const isRecurring = event.repeat && event.repeat !== "None";
      
      openConfirmModal({
        title: "Delete event",
        message: isRecurring 
          ? `Delete "${event.title}"?` 
          : `Are you sure you want to delete "${event.title}"?`,
        showRecurringOptions: isRecurring,
        confirmText: "Delete",
        onConfirm: (deleteOption) => {
          if (isRecurring && deleteOption === "single") {
            // Add this date to excluded dates
            const eventIndex = state.events.findIndex(e => e.id === eventId);
            if (eventIndex >= 0) {
              if (!state.events[eventIndex].excludedDates) {
                state.events[eventIndex].excludedDates = [];
              }
              if (!state.events[eventIndex].excludedDates.includes(eventDate)) {
                state.events[eventIndex].excludedDates.push(eventDate);
              }
            }
          } else {
            // Delete all occurrences
            state.events = state.events.filter((item) => item.id !== eventId);
          }
          saveState();
          closeEventModal();
          renderEvents();
          renderTomorrowEvents();
          renderInsights();
          renderMetrics();
        }
      });
    });
  }
  
  // Confirmation modal handlers
  if (elements.confirmModalClose) {
    elements.confirmModalClose.addEventListener("click", closeConfirmModal);
  }
  
  if (elements.confirmModalCancel) {
    elements.confirmModalCancel.addEventListener("click", closeConfirmModal);
  }
  
  if (elements.confirmModalConfirm) {
    elements.confirmModalConfirm.addEventListener("click", () => {
      if (confirmModalCallback) {
        // Get selected delete option if recurring options are shown
        let deleteOption = "all";
        if (elements.confirmRecurringOptions && elements.confirmRecurringOptions.style.display !== "none") {
          const selected = elements.confirmRecurringOptions.querySelector('input[name="delete-option"]:checked');
          if (selected) {
            deleteOption = selected.value;
          }
        }
        confirmModalCallback(deleteOption);
      }
      closeConfirmModal();
    });
  }
  
  if (elements.confirmModal) {
    const overlay = elements.confirmModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeConfirmModal);
    }
  }
  
  elements.eventAllDay.addEventListener("change", () => {
    const disabled = elements.eventAllDay.checked;
    elements.eventStart.disabled = disabled;
    elements.eventEnd.disabled = disabled;
  });

  // Handle custom repeat days
  if (elements.eventRepeat) {
    elements.eventRepeat.addEventListener("change", () => {
      if (elements.customRepeatDays) {
        elements.customRepeatDays.style.display = elements.eventRepeat.value === "Custom" ? "block" : "none";
        if (elements.eventRepeat.value !== "Custom") {
          clearCustomRepeatDays();
        }
      }
    });
  }

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
    closeTodoModal();
  });

  elements.todoClear.addEventListener("click", clearTodoForm);

  elements.statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const label = elements.statusLabel.value.trim();
    if (!label) return;
    
    try {
    const imageData = await readFile(elements.statusImage.files[0]);
      const editId = elements.statusEditId.value;
      
      if (editId) {
        // Edit existing status
        const index = state.statuses.findIndex(s => s.id === editId);
        if (index >= 0) {
          state.statuses[index] = {
            ...state.statuses[index],
            label,
            color: elements.statusColor.value,
            image: imageData || state.statuses[index].image
          };
        }
    } else {
      // Add new status
    state.statuses.unshift({
      id: createId(),
      label,
      color: elements.statusColor.value,
      image: imageData || "",
      createdAt: new Date().toISOString()
    });
    }
      
    await saveState();
    elements.statusForm.reset();
      elements.statusEditId.value = "";
      updateFileInputLabel();
      closeStatusModal();
      renderStatusSelector();
      renderStatusDisplay();
      if (elements.statusEditList) {
        renderStatusEditList();
        bindStatusEditListEvents();
      }
    } catch (error) {
      console.error("Error saving status:", error);
      alert("Error saving status. Please try again.");
    }
  });

  // Update file input label when file is selected
  if (elements.statusImage) {
    elements.statusImage.addEventListener("change", (event) => {
      updateFileInputLabel();
    });
  }

  // Status modal controls
  if (elements.addStatusBtn) {
    elements.addStatusBtn.addEventListener("click", () => openStatusModal(false));
  }

  if (elements.editStatusBtn) {
    elements.editStatusBtn.addEventListener("click", openStatusEditModal);
  }

  if (elements.statusModalClose) {
    elements.statusModalClose.addEventListener("click", closeStatusModal);
  }

  if (elements.statusFormCancel) {
    elements.statusFormCancel.addEventListener("click", closeStatusModal);
  }

  // Close modal on overlay click
  if (elements.statusModal) {
    const overlay = elements.statusModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeStatusModal);
    }
  }

  if (elements.statusEditModalClose) {
    elements.statusEditModalClose.addEventListener("click", closeStatusEditModal);
  }

  if (elements.statusEditModalCloseBtn) {
    elements.statusEditModalCloseBtn.addEventListener("click", closeStatusEditModal);
  }

  if (elements.statusEditModal) {
    const overlay = elements.statusEditModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeStatusEditModal);
    }
  }

  // Status selector change
  if (elements.statusSelector) {
    elements.statusSelector.addEventListener("change", (event) => {
      state.currentStatus = event.target.value;
      saveState();
      renderStatusSelector();
      renderStatusDisplay();
    });
  }

  // Event modal handlers
  if (elements.addEventBtn) {
    elements.addEventBtn.addEventListener("click", () => {
      openEventModal();
    });
  }

  if (elements.eventModalClose) {
    elements.eventModalClose.addEventListener("click", closeEventModal);
  }

  if (elements.eventModal) {
    const overlay = elements.eventModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeEventModal);
    }
  }

  // Calendar view handlers
  if (elements.viewCalendarBtn) {
    elements.viewCalendarBtn.addEventListener("click", () => {
      openCalendarViewModal();
    });
  }

  if (elements.calendarViewModalClose) {
    elements.calendarViewModalClose.addEventListener("click", closeCalendarViewModal);
  }

  if (elements.calendarViewModal) {
    const overlay = elements.calendarViewModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeCalendarViewModal);
    }
  }

  if (elements.calendarPrevWeek) {
    elements.calendarPrevWeek.addEventListener("click", () => {
      navigateCalendarWeek(-1);
    });
  }

  if (elements.calendarNextWeek) {
    elements.calendarNextWeek.addEventListener("click", () => {
      navigateCalendarWeek(1);
    });
  }

  if (elements.calendarTodayBtn) {
    elements.calendarTodayBtn.addEventListener("click", () => {
      goToCurrentWeek();
    });
  }

  // Calendar event and todo click handlers (using event delegation)
  if (elements.calendarWeekGrid) {
    elements.calendarWeekGrid.addEventListener("click", (event) => {
      const eventItem = event.target.closest(".calendar-event-item");
      if (eventItem) {
        const eventId = eventItem.dataset.eventId;
        const occurrenceDate = eventItem.dataset.date;
        if (eventId) {
          // Close calendar view modal
          closeCalendarViewModal();
          // Small delay to allow calendar modal to close smoothly
          setTimeout(() => {
            // Open event edit modal with the occurrence date
            fillEventForm(eventId, occurrenceDate);
          }, 150);
        }
        return;
      }
      
      // Handle todo clicks
      const todoItem = event.target.closest(".calendar-todo-item");
      if (todoItem) {
        const todoId = todoItem.dataset.todoId;
        if (todoId) {
          // Close calendar view modal
          closeCalendarViewModal();
          // Small delay to allow calendar modal to close smoothly
          setTimeout(() => {
            // Open todo edit modal
            fillTodoForm(todoId);
          }, 150);
        }
      }
    });
  }

  // Todo modal handlers
  if (elements.addTodoBtn) {
    elements.addTodoBtn.addEventListener("click", () => {
      openTodoModal();
    });
  }

  if (elements.todoModalClose) {
    elements.todoModalClose.addEventListener("click", closeTodoModal);
  }

  if (elements.todoModal) {
    const overlay = elements.todoModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeTodoModal);
    }
  }

  // Toggle full list button
  if (elements.toggleFullListBtn) {
    elements.toggleFullListBtn.addEventListener("click", () => {
      state.showFullTodoList = !state.showFullTodoList;
      saveState();
      renderTodos();
    });
  }

  // Toggle completed tasks button
  if (elements.toggleCompletedBtn) {
    elements.toggleCompletedBtn.addEventListener("click", () => {
      state.showCompletedTodos = !state.showCompletedTodos;
      saveState();
      renderTodos();
    });
  }
}

function bindLists() {
  // Helper function to handle event card clicks (edit/delete)
  const handleEventClick = (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    const card = event.target.closest(".event-card");
    if (!card) return;
    const id = card.dataset.id;
    if (action === "edit-event") {
      // Get the date this event is being displayed for
      const occurrenceDate = card.dataset.date || null;
      fillEventForm(id, occurrenceDate);
    }
    if (action === "delete-event") {
      const event = state.events.find(e => e.id === id);
      if (!event) return;
      
      const isRecurring = event.repeat && event.repeat !== "None";
      
      openConfirmModal({
        title: "Delete event",
        message: isRecurring 
          ? `Delete "${event.title}"?` 
          : `Are you sure you want to delete "${event.title}"?`,
        showRecurringOptions: isRecurring,
        confirmText: "Delete",
        onConfirm: (deleteOption) => {
          if (isRecurring && deleteOption === "single") {
            // Get the date this event is being displayed for
            const eventDate = card.dataset.date || getTodayISO();
            // Add this date to excluded dates
            const eventIndex = state.events.findIndex(e => e.id === id);
            if (eventIndex >= 0) {
              if (!state.events[eventIndex].excludedDates) {
                state.events[eventIndex].excludedDates = [];
              }
              if (!state.events[eventIndex].excludedDates.includes(eventDate)) {
                state.events[eventIndex].excludedDates.push(eventDate);
              }
            }
          } else {
            // Delete all occurrences
      state.events = state.events.filter((item) => item.id !== id);
          }
      saveState();
      renderEvents();
          renderTomorrowEvents();
      renderInsights();
      renderMetrics();
    }
  });
    }
  };

  // Helper function to handle event card hover (tooltip)
  const handleEventHover = {
    pointerover: (event) => {
      const card = event.target.closest(".event-card");
      if (!card) return;
      const eventData = state.events.find((item) => item.id === card.dataset.id);
      if (!eventData) return;
      elements.tooltip.innerHTML = buildEventTooltip(eventData);
      elements.tooltip.classList.add("visible");
      positionTooltip(event);
    },
    pointermove: (event) => {
      if (!elements.tooltip.classList.contains("visible")) return;
      positionTooltip(event);
    },
    pointerout: (event) => {
      const related = event.relatedTarget;
      if (related && related.closest && related.closest(".event-card")) {
        return;
      }
      elements.tooltip.classList.remove("visible");
    },
    pointerleave: () => {
      elements.tooltip.classList.remove("visible");
    }
  };

  // Helper for todo toggle button hover (tooltip)
  const handleTodoToggleHover = {
    pointerover: (event) => {
      if (!elements.tooltip) return;
      const fullBtn = event.target.closest(".toggle-full-list-btn");
      const completedBtn = event.target.closest(".toggle-completed-btn");
      let html = "";

      if (fullBtn) {
        html = buildTodoToggleTooltip("full", state.showFullTodoList);
      } else if (completedBtn) {
        html = buildTodoToggleTooltip("completed", state.showCompletedTodos);
      } else {
        return;
      }

      elements.tooltip.innerHTML = html;
      elements.tooltip.classList.add("visible");
      positionTooltip(event);
    },
    pointermove: (event) => {
      if (!elements.tooltip || !elements.tooltip.classList.contains("visible")) return;
      positionTooltip(event);
    },
    pointerout: (event) => {
      const related = event.relatedTarget;
      if (
        related &&
        related.closest &&
        (related.closest(".toggle-full-list-btn") || related.closest(".toggle-completed-btn"))
      ) {
        return;
      }
      if (elements.tooltip) {
        elements.tooltip.classList.remove("visible");
      }
    },
    pointerleave: () => {
      if (elements.tooltip) {
        elements.tooltip.classList.remove("visible");
      }
    }
  };

  // Bind handlers to today's event list
  elements.eventList.addEventListener("click", handleEventClick);
  elements.eventList.addEventListener("pointerover", handleEventHover.pointerover);
  elements.eventList.addEventListener("pointermove", handleEventHover.pointermove);
  elements.eventList.addEventListener("pointerout", handleEventHover.pointerout);
  elements.eventList.addEventListener("pointerleave", handleEventHover.pointerleave);

  // Bind handlers to tomorrow's event list
  if (elements.tomorrowEventList) {
    elements.tomorrowEventList.addEventListener("click", handleEventClick);
    elements.tomorrowEventList.addEventListener("pointerover", handleEventHover.pointerover);
    elements.tomorrowEventList.addEventListener("pointermove", handleEventHover.pointermove);
    elements.tomorrowEventList.addEventListener("pointerout", handleEventHover.pointerout);
    elements.tomorrowEventList.addEventListener("pointerleave", handleEventHover.pointerleave);
  }

  // Bind tooltip handlers to todo toggle buttons (header)
  const todoHeader =
    elements.todoList &&
    elements.todoList.closest(".list-card") &&
    elements.todoList.closest(".list-card").querySelector(".list-header");
  if (todoHeader) {
    todoHeader.addEventListener("pointerover", handleTodoToggleHover.pointerover);
    todoHeader.addEventListener("pointermove", handleTodoToggleHover.pointermove);
    todoHeader.addEventListener("pointerout", handleTodoToggleHover.pointerout);
    todoHeader.addEventListener("pointerleave", handleTodoToggleHover.pointerleave);
  }

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
      const todo = state.todos.find(t => t.id === id);
      if (!todo) return;
      
      openConfirmModal({
        title: "Delete task",
        message: `Are you sure you want to delete "${todo.title}"?`,
        showRecurringOptions: false,
        confirmText: "Delete",
        onConfirm: () => {
      state.todos = state.todos.filter((item) => item.id !== id);
      saveState();
      renderTodos();
      renderInsights();
      renderMetrics();
    }
  });
    }
  });
}

function bindControls() {
  // Settings menu toggle
  if (elements.settingsMenuButton) {
    elements.settingsMenuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (elements.settingsMenuDropdown) {
        elements.settingsMenuDropdown.classList.toggle("visible");
      }
    });
  }

  // Close settings menu when clicking outside
  document.addEventListener("click", (e) => {
    if (elements.settingsMenuDropdown && 
        elements.settingsMenuButton &&
        !elements.settingsMenuButton.contains(e.target) &&
        !elements.settingsMenuDropdown.contains(e.target)) {
      elements.settingsMenuDropdown.classList.remove("visible");
    }
  });

  // Load sample day with confirmation
  if (elements.loadSample) {
  elements.loadSample.addEventListener("click", () => {
      openConfirmModal({
        title: "Load sample day",
        message: "This will overwrite all current data. Are you sure?",
        showRecurringOptions: false,
        confirmText: "Load sample",
        onConfirm: () => {
    const sample = getSampleData();
    state = { ...state, ...sample };
    saveState();
    renderAll();
          if (elements.settingsMenuDropdown) {
            elements.settingsMenuDropdown.classList.remove("visible");
          }
        }
  });
    });
  }

  // Reset data with confirmation
  if (elements.resetData) {
  elements.resetData.addEventListener("click", () => {
      openConfirmModal({
        title: "Reset all data",
        message: "Are you sure you want to reset all data for this dashboard? This cannot be undone.",
        showRecurringOptions: false,
        confirmText: "Reset",
        onConfirm: () => {
          state = { ...defaultState, theme: state.theme, currentStatus: "invisible" };
    saveState();
    clearEventForm();
    clearTodoForm();
    elements.notesInput.value = "";
    renderAll();
          if (elements.settingsMenuDropdown) {
            elements.settingsMenuDropdown.classList.remove("visible");
          }
        }
      });
    });
  }

  // Save preset handlers
  if (elements.savePresetBtn) {
    elements.savePresetBtn.addEventListener("click", () => {
      openSavePresetModal();
      if (elements.settingsMenuDropdown) {
        elements.settingsMenuDropdown.classList.remove("visible");
      }
    });
  }

  if (elements.savePresetModalClose) {
    elements.savePresetModalClose.addEventListener("click", closeSavePresetModal);
  }

  if (elements.savePresetCancel) {
    elements.savePresetCancel.addEventListener("click", closeSavePresetModal);
  }

  if (elements.savePresetConfirm) {
    elements.savePresetConfirm.addEventListener("click", () => {
      const presetName = elements.presetNameInput.value.trim();
      if (!presetName) {
        elements.presetNameInput.focus();
        return;
      }
      savePreset(presetName);
      // Modal will close automatically after success feedback
    });
  }

  // Allow Enter key to save preset
  if (elements.presetNameInput) {
    elements.presetNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const presetName = elements.presetNameInput.value.trim();
        if (presetName) {
          savePreset(presetName);
          // Modal will close automatically after success feedback
        }
      }
    });
  }

  if (elements.savePresetModal) {
    const overlay = elements.savePresetModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeSavePresetModal);
    }
  }

  // Load preset handlers
  if (elements.loadPresetBtn) {
    elements.loadPresetBtn.addEventListener("click", () => {
      openLoadPresetModal();
      if (elements.settingsMenuDropdown) {
        elements.settingsMenuDropdown.classList.remove("visible");
      }
    });
  }

  if (elements.loadPresetModalClose) {
    elements.loadPresetModalClose.addEventListener("click", closeLoadPresetModal);
  }

  if (elements.loadPresetCancel) {
    elements.loadPresetCancel.addEventListener("click", closeLoadPresetModal);
  }

  if (elements.loadPresetModal) {
    const overlay = elements.loadPresetModal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeLoadPresetModal);
    }
  }
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
  renderTomorrowEvents();
  renderTodos();
  renderStatusSelector();
  renderStatusDisplay();
  renderInsights();
  renderMetrics();
  if (elements.statusEditList && elements.statusEditModal?.classList.contains("visible")) {
    renderStatusEditList();
  }
}

function renderEvents() {
  const today = getTodayISO();
  const list = elements.eventList;
  const scroll = list.scrollTop;
  const todaysEvents = state.events
    .filter((item) => shouldEventAppearOnDate(item, today))
    .sort(sortEventsByTime);
  if (!todaysEvents.length) {
    list.innerHTML = `<div class="empty-state">No events yet. Add one above.</div>`;
  } else {
    list.innerHTML = todaysEvents.map((event) => buildEventCard(event, today)).join("");
  }
  list.scrollTop = scroll;
  elements.eventCount.textContent = `${todaysEvents.length} event${todaysEvents.length === 1 ? "" : "s"}`;
  const runningCount = todaysEvents.filter((item) => getEventStatus(item, today).status === "running").length;
  elements.eventSubtitle.textContent =
    runningCount > 0 ? `${runningCount} in progress right now` : "No live events right now";
  elements.calendarSummary.textContent = todaysEvents.length
    ? `${todaysEvents.length} today · ${runningCount} live`
    : "No events";
}

function renderTomorrowEvents() {
  const tomorrow = getTomorrowISO();
  if (!elements.tomorrowEventList) return;
  
  const list = elements.tomorrowEventList;
  const scroll = list.scrollTop;
  const tomorrowEvents = state.events
    .filter((item) => shouldEventAppearOnDate(item, tomorrow))
    .sort(sortEventsByTime);
  
  if (!tomorrowEvents.length) {
    list.innerHTML = `<div class="empty-state">No events scheduled for tomorrow.</div>`;
  } else {
    list.innerHTML = tomorrowEvents.map((event) => buildEventCard(event, tomorrow)).join("");
  }
  list.scrollTop = scroll;
  
  if (elements.tomorrowEventCount) {
    elements.tomorrowEventCount.textContent = `${tomorrowEvents.length} event${tomorrowEvents.length === 1 ? "" : "s"}`;
  }
  
  if (elements.tomorrowSubtitle) {
    const urgentCount = tomorrowEvents.filter((item) => item.priority === "urgent").length;
    const importantCount = tomorrowEvents.filter((item) => item.priority === "important").length;
    
    if (urgentCount > 0) {
      elements.tomorrowSubtitle.textContent = `${urgentCount} urgent event${urgentCount === 1 ? "" : "s"}`;
    } else if (importantCount > 0) {
      elements.tomorrowSubtitle.textContent = `${importantCount} important event${importantCount === 1 ? "" : "s"}`;
    } else {
      elements.tomorrowSubtitle.textContent = "";
    }
  }
}

function renderTodos() {
  const list = elements.todoList;
  const scroll = list.scrollTop;
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  
  // Ensure due-soon tasks are marked as urgent (due tomorrow, today, or overdue)
  state.todos.forEach(todo => ensureOverdueUrgency(todo));
  if (state.todos.some(todo => !todo.completed && todo.dueDate && todo.dueDate <= tomorrow && todo.priority !== "urgent")) {
    saveState(); // Save if we updated any priorities
  }
  
  // Filter and process todos
  let filteredTodos = state.todos.filter((todo) => {
    // Remove completed tasks that have passed their deadline (unless showCompletedTodos is true)
    if (todo.completed && todo.dueDate) {
      const dueDate = new Date(todo.dueDate + "T00:00:00");
      const todayDate = new Date(today + "T00:00:00");
      if (dueDate < todayDate) {
        return false; // Remove completed tasks past deadline
      }
    }
    
    // Filter out completed tasks if showCompletedTodos is false
    if (todo.completed && !state.showCompletedTodos) {
      return false;
    }
    
    return true;
  });
  
  // Filter out tasks that haven't started yet (unless showFullList is enabled)
  if (!state.showFullTodoList) {
    filteredTodos = filteredTodos.filter((todo) => {
      if (todo.completed) return true; // Always show completed tasks (if enabled)
      if (todo.startDate && todo.startDate > today) {
        return false; // Hide not-started tasks
      }
      return true;
    });
  }
  
  // Sort todos: by priority first, then by end date, with completed at bottom
  const sortedTodos = filteredTodos.sort((a, b) => {
    // Completed tasks go to bottom
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // If both completed, sort by due date (newest first)
    if (a.completed && b.completed) {
      const dateA = a.dueDate || a.startDate || "";
      const dateB = b.dueDate || b.startDate || "";
      return dateB.localeCompare(dateA);
    }
    
    // Priority order: urgent > important > normal
    const priorityOrder = { urgent: 0, important: 1, normal: 2 };
    const priorityA = priorityOrder[a.priority] ?? 2;
    const priorityB = priorityOrder[b.priority] ?? 2;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Same priority: sort by due date (earliest first)
    const dateA = a.dueDate || a.startDate || "9999-12-31";
    const dateB = b.dueDate || b.startDate || "9999-12-31";
    return dateA.localeCompare(dateB);
  });
  
  if (!sortedTodos.length) {
    list.innerHTML = `<div class="empty-state">${state.showFullTodoList ? "No tasks." : "Add tasks with start and due dates."}</div>`;
  } else {
    list.innerHTML = sortedTodos.map((todo) => buildTodoCard(todo)).join("");
  }
  list.scrollTop = scroll;
  
  const activeTodos = sortedTodos.filter((todo) => !todo.completed);
  const overdueCount = sortedTodos.filter((todo) => {
    const status = getTodoStatus(todo);
    return status.status === "overdue";
  }).length;
  
  elements.todoCount.textContent = `${activeTodos.length} task${activeTodos.length === 1 ? "" : "s"}`;
  elements.todoSummary.textContent = activeTodos.length
    ? `${activeTodos.length} tasks${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`
    : "No tasks";
  
  // Update toggle button states
  if (elements.toggleFullListBtn) {
    elements.toggleFullListBtn.classList.toggle("active", state.showFullTodoList);
  }
  if (elements.toggleCompletedBtn) {
    elements.toggleCompletedBtn.classList.toggle("active", state.showCompletedTodos);
  }
}

function renderStatusSelector() {
  if (!elements.statusSelector) return;
  
  const currentValue = state.currentStatus || "invisible";
  const options = ['<option value="invisible" style="color: var(--muted);">Invisible</option>'];
  
  state.statuses.forEach((status) => {
    options.push(
      `<option value="${status.id}" style="color:${status.color}">${escapeHtml(status.label)}</option>`
    );
  });
  
  elements.statusSelector.innerHTML = options.join("");
  elements.statusSelector.value = currentValue;
  
  // Update selector border color to match selected status
  if (currentValue !== "invisible") {
    const selectedStatus = state.statuses.find(s => s.id === currentValue);
    if (selectedStatus) {
      elements.statusSelector.style.borderColor = selectedStatus.color;
  } else {
      elements.statusSelector.style.borderColor = "rgba(255, 255, 255, 0.1)";
    }
  } else {
    elements.statusSelector.style.borderColor = "rgba(255, 255, 255, 0.1)";
  }
}

function renderStatusDisplay() {
  if (!elements.statusDisplay) return;
  
  const currentStatusId = state.currentStatus || "invisible";
  
  if (currentStatusId === "invisible") {
    elements.statusDisplay.innerHTML = "";
    elements.statusDisplay.style.display = "none";
    return;
  }
  
  const status = state.statuses.find((s) => s.id === currentStatusId);
  if (!status) {
    state.currentStatus = "invisible";
    saveState();
    renderStatusDisplay();
    return;
  }
  
  // Only show image if it exists
  if (status.image) {
    elements.statusDisplay.innerHTML = `
      <div class="status-display-content">
        <div class="status-display-image">
          <img src="${status.image}" alt="${escapeHtml(status.label)}" class="status-display-img" />
        </div>
      </div>
    `;
    elements.statusDisplay.style.display = "flex";
  } else {
    elements.statusDisplay.innerHTML = "";
    elements.statusDisplay.style.display = "none";
  }
}

function openStatusModal(isEdit = false, statusId = null) {
  if (!elements.statusModal) return;
  
  if (isEdit && statusId) {
    const status = state.statuses.find(s => s.id === statusId);
    if (status) {
      elements.statusEditId.value = status.id;
      elements.statusLabel.value = status.label;
      elements.statusColor.value = status.color;
      elements.statusModalTitle.textContent = "Edit status";
      elements.statusFormSubmitText.textContent = "Save changes";
      elements.statusFormSubmit.querySelector("i").className = "fa-solid fa-check";
    }
  } else {
    elements.statusEditId.value = "";
    elements.statusModalTitle.textContent = "Add new status";
    elements.statusFormSubmitText.textContent = "Add status";
    elements.statusFormSubmit.querySelector("i").className = "fa-solid fa-plus";
  }
  
  elements.statusModal.classList.add("visible");
  elements.statusModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeStatusModal() {
  if (!elements.statusModal) return;
  elements.statusModal.classList.remove("visible");
  elements.statusModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  elements.statusForm.reset();
  elements.statusEditId.value = "";
  updateFileInputLabel();
}

function openStatusEditModal() {
  if (!elements.statusEditModal) return;
  renderStatusEditList();
  bindStatusEditListEvents();
  elements.statusEditModal.classList.add("visible");
  elements.statusEditModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeStatusEditModal() {
  if (!elements.statusEditModal) return;
  elements.statusEditModal.classList.remove("visible");
  elements.statusEditModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderStatusEditList() {
  if (!elements.statusEditList) return;
  
  // Create array with Invisible status first, then all other statuses
  const allStatuses = [
    { id: "invisible", label: "Invisible", color: "var(--muted)", image: "", isInvisible: true }
  ].concat(state.statuses);
  
  elements.statusEditList.innerHTML = allStatuses.map((status, index) => {
    const isInvisible = status.isInvisible || status.id === "invisible";
    const imagePreview = status.image 
      ? `<img src="${status.image}" alt="${escapeHtml(status.label)}" class="status-edit-image-preview" />`
      : '<div class="status-edit-image-preview-empty">No image</div>';
    
    const canMoveUp = index > 0;
    const canMoveDown = !isInvisible && index < allStatuses.length - 1;
    const canDelete = !isInvisible;
    const canEdit = !isInvisible;
    
        return `
      <div class="status-edit-item ${isInvisible ? 'status-edit-item-invisible' : ''}" data-id="${status.id}">
        <div class="status-edit-item-handle">
          <i class="fa-solid fa-grip-vertical"></i>
        </div>
        <div class="status-edit-item-content">
          <div class="status-edit-item-header">
            <div class="status-edit-item-info">
              <div class="status-edit-item-label" style="color: ${isInvisible ? 'var(--muted)' : status.color}">
                ${escapeHtml(status.label)}
              </div>
              <div class="status-edit-item-color" style="background: ${isInvisible ? 'var(--muted)' : status.color}"></div>
            </div>
            <div class="status-edit-item-actions">
              ${canEdit ? `
                <button class="icon-button" data-action="edit-status" data-id="${status.id}" title="Edit">
                  <i class="fa-solid fa-pen"></i>
              </button>
              ` : ''}
              ${canDelete ? `
                <button class="icon-button danger" data-action="delete-status" data-id="${status.id}" title="Delete">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
          ${status.image ? `
            <div class="status-edit-item-image">
              ${imagePreview}
            </div>
          ` : ''}
        </div>
        <div class="status-edit-item-reorder">
          ${canMoveUp ? `
            <button class="icon-button small" data-action="move-up" data-id="${status.id}" title="Move up">
              <i class="fa-solid fa-chevron-up"></i>
            </button>
          ` : '<div class="status-edit-spacer"></div>'}
          ${canMoveDown ? `
            <button class="icon-button small" data-action="move-down" data-id="${status.id}" title="Move down">
              <i class="fa-solid fa-chevron-down"></i>
            </button>
          ` : '<div class="status-edit-spacer"></div>'}
        </div>
          </div>
        `;
  }).join("");
}

// Use event delegation with a single listener
let statusEditListHandler = null;

function bindStatusEditListEvents() {
  if (!elements.statusEditList) return;
  
  // Remove old listener if it exists
  if (statusEditListHandler) {
    elements.statusEditList.removeEventListener("click", statusEditListHandler);
  }
  
  // Create new handler
  statusEditListHandler = (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    
    const action = button.dataset.action;
    const id = button.dataset.id;
    
    if (action === "edit-status") {
      closeStatusEditModal();
      openStatusModal(true, id);
    } else if (action === "delete-status") {
      const status = state.statuses.find(s => s.id === id);
      if (status) {
        openConfirmModal({
          title: "Delete status",
          message: `Are you sure you want to delete "${status.label}"?`,
          showRecurringOptions: false,
          confirmText: "Delete",
          onConfirm: () => {
            state.statuses = state.statuses.filter(s => s.id !== id);
            if (state.currentStatus === id) {
              state.currentStatus = "invisible";
            }
            saveState();
            renderStatusSelector();
            renderStatusDisplay();
            renderStatusEditList();
            bindStatusEditListEvents();
          }
        });
      }
    } else if (action === "move-up") {
      const index = state.statuses.findIndex(s => s.id === id);
      if (index > 0) {
        [state.statuses[index - 1], state.statuses[index]] = [state.statuses[index], state.statuses[index - 1]];
        saveState();
        renderStatusEditList();
        bindStatusEditListEvents();
      }
    } else if (action === "move-down") {
      const index = state.statuses.findIndex(s => s.id === id);
      if (index >= 0 && index < state.statuses.length - 1) {
        [state.statuses[index], state.statuses[index + 1]] = [state.statuses[index + 1], state.statuses[index]];
        saveState();
        renderStatusEditList();
        bindStatusEditListEvents();
      }
    }
  };
  
  // Add new listener
  elements.statusEditList.addEventListener("click", statusEditListHandler);
}

function renderInsights() {
  const today = getTodayISO();
  const todayDate = new Date(today + "T00:00:00");
  const rangeEnd = new Date(todayDate);
  rangeEnd.setDate(rangeEnd.getDate() + INSIGHT_RANGE_DAYS);
  
  const upcomingEvents = state.events.filter((event) => {
    if (event.priority === "normal") return false;
    
    // Check if event occurs on original date or any date within range (for repeating events)
    let checkDate = new Date(todayDate);
    for (let i = 0; i <= INSIGHT_RANGE_DAYS; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (shouldEventAppearOnDate(event, dateStr)) {
        return true;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return false;
  });
  const upcomingTodos = state.todos.filter((todo) => {
    if (todo.completed) return false;
    if (!todo.dueDate) return false;
    return isWithinDays(todo.dueDate, today, INSIGHT_RANGE_DAYS);
  });
  // For insights, show the next occurrence of each event
  const eventsWithNextDate = upcomingEvents.map((event) => {
    let checkDate = new Date(todayDate);
    let nextDate = null;
    for (let i = 0; i <= INSIGHT_RANGE_DAYS && !nextDate; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (shouldEventAppearOnDate(event, dateStr)) {
        nextDate = dateStr;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return { ...event, nextDate: nextDate || event.date };
  }).filter(e => {
    if (!e.nextDate) return false;
    // Check if the event has already completed (for today's events, check if end time has passed)
    const eventStatus = getEventStatus(e, e.nextDate);
    return eventStatus.status !== "completed";
  });
  
  elements.urgentEvents.innerHTML = eventsWithNextDate.length
    ? eventsWithNextDate
        .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
        .map((event) => buildInsightItem(event.title, event.nextDate, event.startTime))
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
  const todaysEvents = state.events.filter((event) => shouldEventAppearOnDate(event, today));
  
  // Count incomplete in-progress tasks (past start date or no start date)
  const inProgressTasks = state.todos.filter((todo) => {
    if (todo.completed) return false;
    // Task is in-progress if it has no start date OR start date is today or in the past
    if (!todo.startDate) return true;
    return todo.startDate <= today;
    }).length;
  
  // Count overdue tasks
  const overdueTasks = state.todos.filter((todo) => {
    if (todo.completed) return false;
    return todo.dueDate && todo.dueDate < today;
  }).length;
  
  elements.metricEvents.textContent = todaysEvents.length;
  elements.metricTasks.textContent = inProgressTasks;
  elements.metricOverdue.textContent = overdueTasks;
  
  // Add visual styling to overdue metric when there are overdue tasks
  const overdueMetric = elements.metricOverdue.closest('.metric');
  if (overdueMetric) {
    if (overdueTasks > 0) {
      overdueMetric.classList.add('overdue-active');
    } else {
      overdueMetric.classList.remove('overdue-active');
    }
  }
}

function buildEventCard(event, dateString = null) {
  // Use the occurrence date (dateString) for status calculation, not the original event date
  const status = getEventStatus(event, dateString);
  const timeLabel = event.allDay
    ? "All day"
    : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
  const safeLocation = escapeHtml(event.location || "");
  const safeGuests = escapeHtml(event.guests || "");
  const safeCalendar = escapeHtml(event.calendar || "Calendar");
  const safeVisibility = escapeHtml(event.visibility || "Default");
  const safeReminder = escapeHtml(event.reminder || "None");
  let safeRepeat = escapeHtml(event.repeat || "None");
  if (event.repeat === "Custom" && event.repeatDays && event.repeatDays.length > 0) {
    safeRepeat = `Custom (${event.repeatDays.join(", ")})`;
  }
  // Store the date this event is being displayed for (for single occurrence deletion)
  const dateAttr = dateString ? ` data-date="${dateString}"` : "";
  return `
    <div class="event-card ${event.priority} ${status.status}" data-id="${event.id}"${dateAttr} style="border-left-color:${event.color}">
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
    </div>
  `;
}

function buildTodoCard(todo) {
  const status = getTodoStatus(todo);
  const link = safeUrl(todo.link);
  const titleContent = escapeHtml(todo.title);
  const titleElement = link 
    ? `<a href="${link}" target="_blank" rel="noreferrer" class="todo-title-link">${titleContent}</a>`
    : `<div class="todo-title">${titleContent}</div>`;
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
      ${titleElement}
      ${todo.notes ? `<div class="todo-meta">${escapeHtml(todo.notes)}</div>` : ""}
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

// Tooltip content for todo toggle buttons
function buildTodoToggleTooltip(kind, isActive) {
  if (kind === "full") {
    const title = "Full task list";
    const mode = isActive ? "Showing all tasks" : "Showing active tasks only";
    const detail = isActive
      ? "Includes future tasks that haven't started yet."
      : "Hides tasks that haven't started yet.";
    return `
      <div class="tooltip-title">${title}</div>
      <div class="tooltip-grid">
        <div><i class="fa-solid fa-list"></i> ${mode}</div>
        <div>${detail}</div>
      </div>
    `;
  }
  if (kind === "completed") {
    const title = "Completed tasks";
    const mode = isActive ? "Completed tasks visible" : "Completed tasks hidden";
    const detail = isActive
      ? "Shows tasks you've already completed (until their deadline passes)."
      : "Hides completed tasks to keep the list focused.";
    return `
      <div class="tooltip-title">${title}</div>
      <div class="tooltip-grid">
        <div><i class="fa-solid fa-check-double"></i> ${mode}</div>
        <div>${detail}</div>
      </div>
    `;
  }
  return "";
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
    repeatDays: elements.eventRepeat.value === "Custom" ? getCustomRepeatDays() : null,
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
  if (elements.eventOccurrenceDate) {
    elements.eventOccurrenceDate.value = "";
  }
  elements.eventStart.value = "";
  elements.eventEnd.value = "";
  elements.eventColor.value = colorPalette[0];
  elements.eventStart.disabled = false;
  elements.eventEnd.disabled = false;
  if (elements.customRepeatDays) {
    elements.customRepeatDays.style.display = "none";
    clearCustomRepeatDays();
  }
}

function getCustomRepeatDays() {
  if (!elements.customRepeatDays) return [];
  const checkboxes = elements.customRepeatDays.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.dataset.day);
}

function setCustomRepeatDays(days) {
  if (!elements.customRepeatDays) return;
  const checkboxes = elements.customRepeatDays.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = days.includes(cb.dataset.day);
  });
}

function clearCustomRepeatDays() {
  if (!elements.customRepeatDays) return;
  const checkboxes = elements.customRepeatDays.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = false;
  });
}

function clearTodoForm() {
  elements.todoForm.reset();
  elements.todoId.value = "";
}

function fillEventForm(id, occurrenceDate = null) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  elements.eventId.value = event.id;
  elements.eventTitle.value = event.title;
  elements.eventDate.value = event.date;
  // Store the occurrence date if provided (for recurring events)
  if (elements.eventOccurrenceDate) {
    elements.eventOccurrenceDate.value = occurrenceDate || "";
  }
  elements.eventStart.value = event.startTime;
  elements.eventEnd.value = event.endTime;
  elements.eventAllDay.checked = event.allDay;
  elements.eventPriority.value = event.priority;
  elements.eventCalendar.value = event.calendar;
  elements.eventVisibility.value = event.visibility;
  elements.eventReminder.value = event.reminder;
  elements.eventRepeat.value = event.repeat || "None";
  if (elements.customRepeatDays) {
    elements.customRepeatDays.style.display = event.repeat === "Custom" ? "block" : "none";
    if (event.repeat === "Custom" && event.repeatDays) {
      setCustomRepeatDays(event.repeatDays);
    } else {
      clearCustomRepeatDays();
    }
  }
  elements.eventLocation.value = event.location;
  elements.eventLink.value = event.link;
  elements.eventGuests.value = event.guests;
  elements.eventDescription.value = event.description;
  elements.eventColor.value = event.color;
  elements.eventStart.disabled = event.allDay;
  elements.eventEnd.disabled = event.allDay;
  openEventModal(true);
}

function openEventModal(isEdit = false) {
  if (!elements.eventModal) return;
  
  if (isEdit) {
    if (elements.eventModalTitle) elements.eventModalTitle.textContent = "Edit event";
    if (elements.eventFormSubmitText) elements.eventFormSubmitText.textContent = "Save changes";
    if (elements.eventDelete) elements.eventDelete.style.display = "flex";
  } else {
    if (elements.eventModalTitle) elements.eventModalTitle.textContent = "Create event";
    if (elements.eventFormSubmitText) elements.eventFormSubmitText.textContent = "Save event";
    if (elements.eventDelete) elements.eventDelete.style.display = "none";
    clearEventForm();
  }
  
  elements.eventModal.classList.add("visible");
  elements.eventModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeEventModal() {
  if (!elements.eventModal) return;
  elements.eventModal.classList.remove("visible");
  elements.eventModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Confirmation Modal Functions
let confirmModalCallback = null;

function openConfirmModal(options) {
  if (!elements.confirmModal) return;
  
  const { title, message, showRecurringOptions, confirmText, onConfirm } = options;
  
  if (elements.confirmModalTitle) elements.confirmModalTitle.textContent = title || "Confirm action";
  if (elements.confirmModalMessage) elements.confirmModalMessage.textContent = message || "Are you sure?";
  if (elements.confirmModalConfirmText) elements.confirmModalConfirmText.textContent = confirmText || "Confirm";
  
  // Show/hide recurring options
  if (elements.confirmRecurringOptions) {
    elements.confirmRecurringOptions.style.display = showRecurringOptions ? "block" : "none";
    if (showRecurringOptions) {
      // Reset to "single" option
      const radios = elements.confirmRecurringOptions.querySelectorAll('input[type="radio"]');
      if (radios[0]) radios[0].checked = true;
    }
  }
  
  confirmModalCallback = onConfirm;
  
  elements.confirmModal.classList.add("visible");
  elements.confirmModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeConfirmModal() {
  if (!elements.confirmModal) return;
  elements.confirmModal.classList.remove("visible");
  elements.confirmModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  confirmModalCallback = null;
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
  openTodoModal(true);
}

function openTodoModal(isEdit = false) {
  if (!elements.todoModal) return;
  
  if (isEdit) {
    if (elements.todoModalTitle) elements.todoModalTitle.textContent = "Edit task";
    if (elements.todoFormSubmitText) elements.todoFormSubmitText.textContent = "Save changes";
  } else {
    if (elements.todoModalTitle) elements.todoModalTitle.textContent = "Add task";
    if (elements.todoFormSubmitText) elements.todoFormSubmitText.textContent = "Save task";
    clearTodoForm();
  }
  
  elements.todoModal.classList.add("visible");
  elements.todoModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeTodoModal() {
  if (!elements.todoModal) return;
  elements.todoModal.classList.remove("visible");
  elements.todoModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
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

function getEventStatus(event, occurrenceDate = null) {
  const now = new Date();
  const today = getTodayISO();
  // For recurring events, use the occurrence date (the specific date being displayed)
  // For non-recurring events, use the original event date
  const eventDate = occurrenceDate || event.date || today;
  
  if (eventDate < today) {
    return { status: "completed", label: "Completed" };
  }
  if (eventDate > today) {
    return { status: "upcoming", label: "Upcoming" };
  }
  // Only check time-based status if the event is today
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

// Mark overdue incomplete tasks as urgent
function ensureOverdueUrgency(todo) {
  if (!todo.completed && todo.dueDate) {
    const today = getTodayISO();
    const tomorrow = getTomorrowISO();
    // Mark tasks as urgent if due date is tomorrow, today, or overdue
    if (todo.dueDate <= tomorrow && todo.priority !== "urgent") {
      todo.priority = "urgent";
    }
  }
  return todo;
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

function sortCalendarEvents(events) {
  const priorityOrder = { urgent: 0, important: 1, normal: 2 };
  
  return events.sort((a, b) => {
    // 1. Sort by all-day status: all-day events first
    if (a.allDay !== b.allDay) {
      return a.allDay ? -1 : 1; // allDay: true comes first
    }
    
    // 2. Sort by priority: urgent > important > normal
    // const priorityA = priorityOrder[a.priority] ?? 2;
    // const priorityB = priorityOrder[b.priority] ?? 2;
    // if (priorityA !== priorityB) {
    //   return priorityA - priorityB;
    // }
    
    // 3. Sort by start time (only for timed events)
    if (!a.allDay && !b.allDay) {
      const startA = timeToMinutes(a.startTime || "00:00");
      const startB = timeToMinutes(b.startTime || "00:00");
      if (startA !== startB) {
        return startA - startB;
      }
      
      // 4. Sort by end time if start times are equal
      const endA = timeToMinutes(a.endTime || "23:59");
      const endB = timeToMinutes(b.endTime || "23:59");
      return endA - endB;
    }
    
    // For all-day events or if times are equal, maintain original order
    return 0;
  });
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

function getTomorrowISO() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const offset = tomorrow.getTimezoneOffset() * 60000;
  return new Date(tomorrow.getTime() - offset).toISOString().slice(0, 10);
}

function getWeekStartDate(date = null) {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day; // Get Sunday of current week
  const sunday = new Date(d.setDate(diff));
  const offset = sunday.getTimezoneOffset() * 60000;
  return new Date(sunday.getTime() - offset).toISOString().slice(0, 10);
}

function getWeekDates(weekStart) {
  const start = new Date(weekStart + "T00:00:00");
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const offset = date.getTimezoneOffset() * 60000;
    dates.push(new Date(date.getTime() - offset).toISOString().slice(0, 10));
  }
  return dates;
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  const endDay = end.getDate();
  const year = start.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function openCalendarViewModal() {
  if (!elements.calendarViewModal) return;
  
  // Initialize to current week if not set
  if (!currentCalendarWeek) {
    currentCalendarWeek = getWeekStartDate();
  }
  
  renderCalendarWeek();
  
  elements.calendarViewModal.classList.add("visible");
  elements.calendarViewModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCalendarViewModal() {
  if (!elements.calendarViewModal) return;
  elements.calendarViewModal.classList.remove("visible");
  elements.calendarViewModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function navigateCalendarWeek(weeks) {
  if (!currentCalendarWeek) {
    currentCalendarWeek = getWeekStartDate();
  }
  const current = new Date(currentCalendarWeek + "T00:00:00");
  current.setDate(current.getDate() + (weeks * 7));
  const offset = current.getTimezoneOffset() * 60000;
  currentCalendarWeek = new Date(current.getTime() - offset).toISOString().slice(0, 10);
  renderCalendarWeek();
}

function goToCurrentWeek() {
  currentCalendarWeek = getWeekStartDate();
  renderCalendarWeek();
}

function renderCalendarWeek() {
  if (!elements.calendarWeekGrid || !currentCalendarWeek) return;
  
  const weekDates = getWeekDates(currentCalendarWeek);
  const today = getTodayISO();
  
  // Update week label
  if (elements.calendarViewWeekLabel) {
    elements.calendarViewWeekLabel.textContent = formatWeekRange(currentCalendarWeek);
  }
  
  // Get all events for this week, sorted properly
  const weekEvents = weekDates.map(date => {
    const dayEvents = state.events.filter(event => shouldEventAppearOnDate(event, date));
    return sortCalendarEvents(dayEvents);
  });
  
  // Get all todos that appear on days in this week
  const weekTodos = weekDates.map(date => {
    return state.todos.filter(todo => {
      if (todo.completed) return false;
      // Todo appears on a date if:
      // - The date is between startDate and dueDate (inclusive)
      // - Or if no startDate, appears from dueDate onwards
      // - Or if no dates, doesn't appear in calendar
      if (!todo.startDate && !todo.dueDate) return false;
      
      const checkDate = new Date(date + "T00:00:00");
      let startDate = null;
      let dueDate = null;
      
      if (todo.startDate) {
        startDate = new Date(todo.startDate + "T00:00:00");
      }
      if (todo.dueDate) {
        dueDate = new Date(todo.dueDate + "T00:00:00");
      }
      
      // If date is before start date, don't show
      if (startDate && checkDate < startDate) return false;
      
      // If date is after due date, don't show
      if (dueDate && checkDate > dueDate) return false;
      
      // Show if date is within range or on boundary dates
      return true;
    });
  });
  
  // Day names
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Render calendar grid
  const calendarHTML = weekDates.map((date, index) => {
    const isToday = date === today;
    const dateObj = new Date(date + "T00:00:00");
    const dayName = dayNames[index];
    const dayAbbrName = dayAbbr[index];
    const dayNum = dateObj.getDate();
    const monthName = dateObj.toLocaleDateString(undefined, { month: "short" });
    const events = weekEvents[index];
    const todos = weekTodos[index];
    
    let eventsHTML = "";
    if (events.length === 0 && todos.length === 0) {
      eventsHTML = '<div class="calendar-empty-day">No events or tasks</div>';
    } else {
      eventsHTML = events.map(event => buildCalendarEventCard(event, date)).join("");
    }
    
    let todosHTML = "";
    if (todos.length > 0) {
      todosHTML = '<div class="calendar-todos-section"><div class="calendar-todos-label">Tasks</div>' +
        todos.map(todo => buildCalendarTodoCard(todo, date)).join("") +
        '</div>';
    }
    
    return `<div class="calendar-day-column ${isToday ? "today" : ""}">
        <div class="calendar-day-header">
          <div class="calendar-day-name">${dayAbbrName}</div>
          <div class="calendar-day-number">${dayNum}</div>
          ${index === 0 ? `<div class="calendar-day-month">${monthName}</div>` : ""}
        </div>
        <div class="calendar-day-events">
          ${eventsHTML}
        </div>
        ${todosHTML}
      </div>`;
  }).join("");
  
  elements.calendarWeekGrid.innerHTML = calendarHTML;
}

function buildCalendarEventCard(event, date) {
  // Use the occurrence date for status calculation
  const status = getEventStatus(event, date);
  let timeLabel = "All day";
  if (!event.allDay && event.startTime && event.endTime) {
    timeLabel = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
  }
  
  let locationHTML = "";
  if (event.location) {
    locationHTML = `<div class="calendar-event-meta"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location)}</div>`;
  }
  
  return `<div class="calendar-event-item ${event.priority || "normal"} ${status.status}" data-event-id="${event.id}" data-date="${date}" style="border-left-color:${event.color || "#6c7bff"}">
      <div class="calendar-event-time">${timeLabel}</div>
      <div class="calendar-event-title">${escapeHtml(event.title)}</div>
      ${locationHTML}
    </div>`;
}

function buildCalendarTodoCard(todo, date) {
  const status = getTodoStatus(todo);
  const checkDate = new Date(date + "T00:00:00");
  let startDate = null;
  let dueDate = null;
  
  if (todo.startDate) {
    startDate = new Date(todo.startDate + "T00:00:00");
  }
  if (todo.dueDate) {
    dueDate = new Date(todo.dueDate + "T00:00:00");
  }
  
  const isStartDate = startDate && checkDate.getTime() === startDate.getTime();
  const isDueDate = dueDate && checkDate.getTime() === dueDate.getTime();
  const isOverdue = status.status === "overdue";
  
  // Priority-based border color
  let borderColor = "#8b8b9a"; // Default gray
  if (todo.priority === "urgent") {
    borderColor = "#f43f5e"; // Red
  } else if (todo.priority === "important") {
    borderColor = "#f59e0b"; // Amber
  }
  
  let markersHTML = "";
  if (isStartDate && isDueDate) {
    markersHTML = '<div class="calendar-todo-markers"><span class="calendar-todo-marker start-end" title="Starts & Due">●</span></div>';
  } else if (isStartDate) {
    markersHTML = '<div class="calendar-todo-markers"><span class="calendar-todo-marker start" title="Starts">▶</span></div>';
  } else if (isDueDate) {
    markersHTML = '<div class="calendar-todo-markers"><span class="calendar-todo-marker end" title="Due">●</span></div>';
  } else {
    markersHTML = '<div class="calendar-todo-markers"><span class="calendar-todo-marker ongoing" title="Ongoing">━</span></div>';
  }
  
  const overdueClass = isOverdue ? " overdue" : "";
  const completedClass = todo.completed ? " completed" : "";
  
  return `<div class="calendar-todo-item ${todo.priority || "normal"}${overdueClass}${completedClass}" data-todo-id="${todo.id}" style="border-left-color:${borderColor}">
      ${markersHTML}
      <div class="calendar-todo-content">
        <div class="calendar-todo-title">${escapeHtml(todo.title)}</div>
        ${isDueDate && !todo.completed ? `<div class="calendar-todo-due-badge">Due today</div>` : ""}
        ${isOverdue ? `<div class="calendar-todo-overdue-badge">Overdue</div>` : ""}
      </div>
    </div>`;
}

function shouldEventAppearOnDate(event, dateString) {
  // Check if this date is excluded (single occurrence deletion)
  if (event.excludedDates && Array.isArray(event.excludedDates) && event.excludedDates.includes(dateString)) {
    return false;
  }
  
  // If no repeat, check exact date match
  if (!event.repeat || event.repeat === "None") {
    return event.date === dateString;
  }

  const eventDate = new Date(event.date + "T00:00:00");
  const checkDate = new Date(dateString + "T00:00:00");
  
  // Event must not be in the future (can't appear before it's created)
  if (checkDate < eventDate) {
    return false;
  }

  // Handle different repeat patterns
  switch (event.repeat) {
    case "Daily":
      // Show every day from the event date onwards
      return true;

    case "Weekly":
      // Show on the same day of the week as the original event
      return eventDate.getDay() === checkDate.getDay();

    case "Monthly":
      // Show on the same day of the month
      return eventDate.getDate() === checkDate.getDate();

    case "Custom":
      // Show only on selected days of the week
      if (!event.repeatDays || event.repeatDays.length === 0) {
        return false;
      }
      const dayNameMap = {
        "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
      };
      const todayDayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][checkDate.getDay()];
      return event.repeatDays.includes(todayDayName);

    default:
      return event.date === dateString;
  }
}

function getDayOfWeekName(dayIndex) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayIndex];
}

function updateFileInputLabel() {
  const fileInput = elements.statusImage;
  const label = document.getElementById("status-image-label");
  if (!fileInput || !label) return;
  
  if (fileInput.files && fileInput.files.length > 0) {
    const fileName = fileInput.files[0].name;
    label.classList.add("has-file");
    label.querySelector("span").textContent = fileName.length > 20 ? fileName.substring(0, 20) + "..." : fileName;
  } else {
    label.classList.remove("has-file");
    label.querySelector("span").textContent = "Choose image...";
  }
}

// Preset Management Functions (now using IndexedDB via db.js)
// Use the db.* namespace functions from db.js to avoid recursion
// db.js exposes functions as window.dbGetPresets, window.dbSavePreset, etc.

async function getPresets() {
  try {
    // Use IndexedDB function from db.js (use db.* namespace to avoid recursion)
    if (window.dbGetPresets && typeof window.dbGetPresets === "function") {
      return await window.dbGetPresets();
    }
    
    // Fallback to localStorage if IndexedDB not available
    try {
      const raw = localStorage.getItem("orbit_presets_v1");
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  } catch (error) {
    console.error("Error loading presets:", error);
    return {};
  }
}

async function savePreset(name) {
  try {
    // Create a complete snapshot of the current state
    const presetData = {
      name: name,
      savedAt: new Date().toISOString(),
      state: {
        events: state.events,
        todos: state.todos,
        statuses: state.statuses,
        notes: state.notes,
        currentStatus: state.currentStatus,
        splitSizes: state.splitSizes,
        showFullTodoList: state.showFullTodoList,
        showCompletedTodos: state.showCompletedTodos,
        theme: state.theme
      }
    };
    
    // Use IndexedDB function from db.js (use db.* namespace to avoid recursion)
    if (window.dbSavePreset && typeof window.dbSavePreset === "function") {
      await window.dbSavePreset(name, presetData);
    } else {
      throw new Error("IndexedDB functions not available");
    }
    
    // Show success feedback
    if (elements.savePresetConfirm) {
      const confirmBtn = elements.savePresetConfirm;
      const originalHTML = confirmBtn.innerHTML;
      const originalBackground = confirmBtn.style.background;
      confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Saved!</span>';
      confirmBtn.style.background = "#22c55e";
      setTimeout(() => {
        confirmBtn.innerHTML = originalHTML;
        confirmBtn.style.background = originalBackground;
        closeSavePresetModal();
      }, 1500);
    } else {
      closeSavePresetModal();
    }
    
    // Refresh preset list if load modal is open
    if (elements.loadPresetModal && elements.loadPresetModal.classList.contains("visible")) {
      await renderPresetList();
    }
  } catch (error) {
    console.error("Error saving preset:", error);
    
    // Show error feedback in the modal instead of browser alert
    if (elements.savePresetConfirm) {
      const confirmBtn = elements.savePresetConfirm;
      const originalHTML = confirmBtn.innerHTML;
      const originalBackground = confirmBtn.style.background;
      confirmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> <span>Failed!</span>';
      confirmBtn.style.background = "#ef4444";
      confirmBtn.disabled = true;
      
      setTimeout(() => {
        confirmBtn.innerHTML = originalHTML;
        confirmBtn.style.background = originalBackground;
        confirmBtn.disabled = false;
      }, 3000);
    } else {
      alert("Failed to save preset. Please try again.");
    }
  }
}

async function loadPreset(name) {
  try {
    let preset = null;
    
    // Use IndexedDB function from db.js (use db.* namespace to avoid recursion)
    if (window.dbGetPreset && typeof window.dbGetPreset === "function") {
      preset = await window.dbGetPreset(name);
    } else {
      const presets = await getPresets();
      preset = presets[name];
    }
    
    if (!preset || !preset.state) {
      alert("Preset not found or corrupted.");
      return;
    }
    
    // Restore state
    state = {
      ...defaultState,
      ...preset.state,
      theme: state.theme // Preserve current theme
    };
    
  await saveState();
  clearEventForm();
  clearTodoForm();
  if (elements.notesInput) {
    elements.notesInput.value = state.notes || "";
  }
  renderAll();
  closeLoadPresetModal();
  } catch (error) {
    console.error("Error loading preset:", error);
    alert("Failed to load preset. Please try again.");
  }
}

async function deletePreset(name) {
  try {
    // Use IndexedDB function from db.js (use db.* namespace to avoid recursion)
    if (window.dbDeletePreset && typeof window.dbDeletePreset === "function") {
      await window.dbDeletePreset(name);
    } else {
      throw new Error("IndexedDB functions not available");
    }
    await renderPresetList();
  } catch (error) {
    console.error("Error deleting preset:", error);
    alert("Failed to delete preset. Please try again.");
  }
}

function openSavePresetModal() {
  if (!elements.savePresetModal) {
    console.error("Save preset modal element not found");
    return;
  }
  if (elements.presetNameInput) {
    elements.presetNameInput.value = "";
    elements.presetNameInput.focus();
  }
  elements.savePresetModal.classList.add("visible");
  elements.savePresetModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSavePresetModal() {
  if (!elements.savePresetModal) return;
  elements.savePresetModal.classList.remove("visible");
  elements.savePresetModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (elements.presetNameInput) {
    elements.presetNameInput.value = "";
  }
}

async function openLoadPresetModal() {
  if (!elements.loadPresetModal) {
    console.error("Load preset modal element not found");
    return;
  }
  await renderPresetList();
  elements.loadPresetModal.classList.add("visible");
  elements.loadPresetModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLoadPresetModal() {
  if (!elements.loadPresetModal) return;
  elements.loadPresetModal.classList.remove("visible");
  elements.loadPresetModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function renderPresetList() {
  if (!elements.presetList) return;
  
  const presets = await getPresets();
  const presetNames = Object.keys(presets).sort((a, b) => {
    const dateA = new Date(presets[a].savedAt || 0);
    const dateB = new Date(presets[b].savedAt || 0);
    return dateB - dateA; // Most recent first
  });
  
  if (presetNames.length === 0) {
    elements.presetList.innerHTML = '<div class="empty-state">No saved workspaces</div>';
    return;
  }
  
  elements.presetList.innerHTML = presetNames.map(name => {
    const preset = presets[name];
    const savedDate = preset.savedAt ? new Date(preset.savedAt) : new Date();
    const dateStr = savedDate.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const eventCount = preset.state?.events?.length || 0;
    const todoCount = preset.state?.todos?.length || 0;
    const statusCount = preset.state?.statuses?.length || 0;
    
    return `
      <div class="preset-item">
        <div class="preset-item-content">
          <div class="preset-item-header">
            <div class="preset-item-name">${escapeHtml(name)}</div>
            <div class="preset-item-date">${dateStr}</div>
          </div>
          <div class="preset-item-stats">
            <span><i class="fa-solid fa-calendar"></i> ${eventCount} events</span>
            <span><i class="fa-solid fa-list-check"></i> ${todoCount} tasks</span>
            <span><i class="fa-solid fa-palette"></i> ${statusCount} statuses</span>
          </div>
        </div>
        <div class="preset-item-actions">
          <button class="icon-button" data-preset-action="load" data-preset-name="${escapeHtml(name)}" title="Load">
            <i class="fa-solid fa-folder-open"></i>
          </button>
          <button class="icon-button danger" data-preset-action="delete" data-preset-name="${escapeHtml(name)}" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");
  
  // Bind event listeners for preset actions
  elements.presetList.querySelectorAll("[data-preset-action]").forEach(button => {
    button.addEventListener("click", (e) => {
      const action = button.dataset.presetAction;
      const presetName = button.dataset.presetName;
      
      if (action === "load") {
        // Close the load preset modal before showing confirmation
        closeLoadPresetModal();
        openConfirmModal({
          title: "Load workspace",
          message: `Load "${presetName}"? This will overwrite your current workspace.`,
          showRecurringOptions: false,
          confirmText: "Load",
          onConfirm: () => {
            loadPreset(presetName);
          }
        });
      } else if (action === "delete") {
        // Close the load preset modal before showing confirmation
        closeLoadPresetModal();
        openConfirmModal({
          title: "Delete workspace",
          message: `Are you sure you want to delete "${presetName}"?`,
          showRecurringOptions: false,
          confirmText: "Delete",
          onConfirm: () => {
            deletePreset(presetName);
          }
        });
      }
    });
  });
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
        calendar: "Holiday",
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
