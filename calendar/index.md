---
title: Calendar
layout: default
nav_order: 2
---

# Calendar

- If you would like to view this calendar outside of the course website, please click below.

[Open in Google Calendar](https://calendar.google.com/calendar/u/0/embed?src=c_03b061bc3f178e6739adbc98a970660b53f1319878f602c92649bacfef737ee5@group.calendar.google.com&ctz=America/Los_Angeles){: .btn .btn-outline .fs-3 } 
- For adding this calendar to your personal Google Calendar, please click below.

[Add to your personal calendar](https://calendar.google.com/calendar/u/0?cid=Y18wM2IwNjFiYzNmMTc4ZTY3MzlhZGJjOThhOTcwNjYwYjUzZjEzMTk4NzhmNjAyYzkyNjQ5YmFjZmVmNzM3ZWU1QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20){: .btn .btn-outline .fs-3 }

<!-- 
the following keyboard shortcuts are available for use on this page:

<div id="calendarShortcuts" style="display: flex; justify-content: space-between; flex-wrap: wrap; margin: 20px 0; gap: 10px;">
  <span class="shortcut"><kbd aria-label="Left Arrow" title="Left Arrow" style="margin-right: 0.2em;">←</kbd> Jump to Previous Period</span>
  <span class="shortcut"><kbd aria-label="Right Arrow" title="Right Arrow" style="margin-right: 0.2em;">→</kbd> Jump to Next Period</span>
  <span class="shortcut"><kbd style="margin-right: 0.2em;">t</kbd> Jump to Today</span>
  <span class="shortcut"><kbd style="margin-right: 0.2em;">d</kbd> Switch to Day View</span>
  <span class="shortcut"><kbd style="margin-right: 0.2em;">w</kbd> Switch to Week View</span>
</div>
-->

<!-- 
Use the following toggles to customize your calendar view. If you'd like to hide a category of events, click on the respective button to do so. The calendar will immediately update to reflect your selection. To reenable that category, click again!
-->
<div id="calendarControls" style="margin: 20px 0;">
  <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 15px;">
    <button class="btn btn-outline-primary active" data-category="llab" aria-label="Toggle LLAB">LLAB</button>
    <button class="btn btn-outline-primary active" data-category="spt" aria-label="Toggle SPT">SPT</button>
    <button class="btn btn-outline-primary active" data-category="ipt" aria-label="Toggle IPT">IPT</button>
    <button class="btn btn-outline-primary active" data-category="events" aria-label="Toggle Events">Events</button>
    <button class="btn btn-outline-primary active" data-category="deadlines" aria-label="Toggle Deadlines">Deadlines</button>
    <button class="btn btn-outline-primary active" data-category="flag-duty" aria-label="Toggle Flag Duty">Flag Duty</button>
    <button class="btn btn-outline-primary active" data-category="ball-ceremony" aria-label="Toggle Ball Ceremony">Ball Ceremony</button>
    <button class="btn btn-outline-primary active" data-category="graduation-ceremony" aria-label="Toggle Graduation Ceremony">Graduation Ceremony</button>
  </div>
</div>

<div id="calendarContainer" style="margin: 20px 0; width: 100%; max-width: 100%;">
  <iframe src="https://calendar.google.com/calendar/u/0/embed?src=c_03b061bc3f178e6739adbc98a970660b53f1319878f602c92649bacfef737ee5@group.calendar.google.com&ctz=America/Los_Angeles&mode=WEEK&height=800&wkst=1&bgcolor=%23ffffff&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0" style="border: 0; width: 100%; height: 800px; min-height: 600px;" frameborder="0" scrolling="no"></iframe>
</div>

<style>
  #calendarContainer {
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .main-content {
    max-width: 100% !important;
  }

  #calendarContainer {
    --event-background: #B4C6E0;
    --event-foreground: rgba(29, 29, 29, 0.95);
    --event-border-color: #084298;
    --event-border-width: 1px;
    --event-popover-bg: #fff;
    --event-popover-border: #000;
    --event-popover-color: #000;
    --event-popover-link-color: #3B18D8;
    --calendar-today-color: #DD3333;
    --calendar-today-bg-color: rgba(81, 92, 230, 0.05);
    --calendar-day-color: inherit;
    --calendar-day-hover-color: #DD3333;
    --calendar-day-hover-bg-color: inherit;
    --calendar-button-base: #f7f7f7;
    --calendar-button-text: #3818D8;
    --calendar-button-focus-ring: rgba(0,0,255,0.25);
    --calendar-button-hover: rgba(59, 24, 216, 0.7);
    --calendar-button-text-hover: #FFFFFF;
    --calendar-button-active: #3818D8;
    --calendar-button-text-active: #FFFFFF;
  }

  .fc {
    font-family: inherit;
    background: white;
  }

  .fc-toolbar {
    margin-bottom: 1em;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }

  .fc-toolbar-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 1rem;
  }

  .fc-button-group {
    display: flex;
    gap: 0.25rem;
  }

  .fc-button {
    background-color: var(--calendar-button-base);
    color: var(--calendar-button-text);
    border: 1px solid #ddd;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .fc-button:hover {
    background-color: var(--calendar-button-hover);
    color: var(--calendar-button-text-hover);
  }

  .fc-button:focus {
    outline: 2px solid var(--calendar-button-focus-ring);
    outline-offset: 2px;
  }

  .fc-button-active {
    background-color: var(--calendar-button-active);
    color: var(--calendar-button-text-active);
  }

  .fc-today-button {
    background-color: var(--calendar-button-base);
    color: var(--calendar-button-text);
    margin: 0 0.5rem;
  }

  .fc-day-today {
    background-color: var(--calendar-today-bg-color) !important;
  }

  .fc-day-today .fc-col-header-cell-cushion,
  .fc-day-today .fc-timegrid-col-frame {
    color: var(--calendar-today-color);
  }

  .fc-col-header-cell {
    padding: 0.5rem;
    font-weight: 600;
  }

  .fc-timegrid-slot {
    height: 60px;
    border-top: 1px solid #e0e0e0;
  }

  .fc-timegrid-slot-label {
    padding: 0.25rem;
    font-size: 0.875rem;
    color: #666;
  }

  .fc-timegrid-now-indicator-line {
    border-color: #DD3333;
    border-width: 2px;
    border-style: dashed;
  }

  .fc-timegrid-now-indicator-arrow {
    border-color: #DD3333;
  }

  .event-llab {
    background-color: #BDF1FC !important;
    border-color: #108DA6 !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .event-spt {
    background-color: #C0E1D2 !important;
    border-color: #1E6142 !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .event-ipt {
    background-color: #EAB59E !important;
    border-color: #B43600 !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .event-events {
    background-color: #EBC8EB !important;
    border-color: #873179 !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .event-deadlines {
    background-color: #F4EFC3 !important;
    border-color: #B4B11C !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .event-flag-duty {
    background-color: #ECD9C9 !important;
    border-color: #8D5C32 !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .event-ball-ceremony {
    background-color: #D4A5FF !important;
    border-color: #7B2CBF !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .event-graduation-ceremony {
    background-color: #FFD89B !important;
    border-color: #D97706 !important;
    border-width: 1px !important;
    color: rgba(29, 29, 29, 0.95) !important;
  }

  .fc-event {
    border-width: var(--event-border-width);
    border-style: solid;
    padding: 4px 6px;
    margin: 1px 0;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .fc-event:hover {
    opacity: 0.9;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .fc-timegrid-col-events {
    margin: 0;
  }

  .fc-timegrid-event {
    margin: 1px 2px;
  }

  #calendarControls .btn {
    padding: 8px 16px;
    border-radius: 5px;
    font-weight: 500;
    transition: all 0.2s;
  }

  #calendarControls .btn.active {
    background-color: #93c5fd;
    color: #1e40af;
    border-color: #93c5fd;
  }

  #calendarControls .btn:not(.active) {
    background-color: #dbeafe;
    color: #1e40af;
    border-color: #dbeafe;
    opacity: 0.6;
  }
</style>

<script>
  document.querySelectorAll('#calendarControls button').forEach(button => {
    button.addEventListener('click', function() {
      this.classList.toggle('active');
    });
  });
</script>
