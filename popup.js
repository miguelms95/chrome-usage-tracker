document.addEventListener("DOMContentLoaded", () => {
    const prevWeekBtn = document.getElementById("prev-week");
    const nextWeekBtn = document.getElementById("next-week");
    const weekLabel = document.getElementById("week-label");
    const intervalSelect = document.getElementById("interval-select");
    let weekOffset = 0;
    let currentInterval = "hourly";

    function updateWeek() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
        startOfWeek.setHours(0, 0, 0, 0); // Midnight Monday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999); // End of Sunday

        weekLabel.textContent = `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
        fetchHistory(startOfWeek, endOfWeek);
    }

    prevWeekBtn.addEventListener("click", () => {
        weekOffset--;
        updateWeek();
    });
    nextWeekBtn.addEventListener("click", () => {
        weekOffset++;
        updateWeek();
    });
    intervalSelect.addEventListener("change", () => {
        currentInterval = intervalSelect.value;
        updateWeek();
    });

    updateWeek();
});

function fetchHistory(startDate, endDate) {
    chrome.history.search(
        {
            text: "",
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
            maxResults: 10000
        },
        (historyItems) => {
            const weeklyData = processHistory(historyItems, startDate);
            renderHeatmap(weeklyData);
            analyzeActivityHours(weeklyData);
        }
    );
}

function processHistory(history, startDate) {
    const weeklyData = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // For getDay() mapping

    history.forEach((item) => {
        const visitTime = new Date(item.lastVisitTime);
        const dayIndex = visitTime.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const day = days[dayIndex]; // Direct mapping to day name
        const minutes = visitTime.getHours() * 60 + visitTime.getMinutes();
        const intervalSize = document.getElementById("interval-select").value === "15min" ? 15 : 60;
        const interval = Math.floor(minutes / intervalSize);

        // Debug log
        if (visitTime.toDateString() === new Date().toDateString()) {
            console.log(`Today (${visitTime.toLocaleString()}) mapped to: ${day}`);
        }

        if (!weeklyData[day]) weeklyData[day] = {};
        weeklyData[day][interval] = (weeklyData[day][interval] || 0) + 1;
    });

    return weeklyData;
}

function renderHeatmap(data) {
    const calendarDiv = document.getElementById("calendar");
    const intervalSize = document.getElementById("interval-select").value === "15min" ? 15 : 60;
    const intervalsPerDay = 1440 / intervalSize;

    let html = `
    <div class="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Mon</th>
            <th>Tue</th>
            <th>Wed</th>
            <th>Thu</th>
            <th>Fri</th>
            <th>Sat</th>
            <th>Sun</th>
          </tr>
        </thead>
        <tbody>
  `;

    let maxVisits = 0;
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    days.forEach((day) => {
        for (let interval in data[day]) {
            maxVisits = Math.max(maxVisits, data[day][interval]);
        }
    });

    for (let interval = 0; interval < intervalsPerDay; interval++) {
        const hour = Math.floor((interval * intervalSize) / 60);
        const minute = (interval * intervalSize) % 60;
        const timeLabel = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        html += `<tr><td>${timeLabel}</td>`;
        days.forEach((day) => {
            const visits = data[day]?.[interval] || 0;
            const intensity = maxVisits > 0 ? Math.min(Math.floor((visits / maxVisits) * 9), 9) : 0;
            const bgClass = visits > 0 ? `bg-blue-${(intensity + 1) * 100}` : "bg-gray-50";
            html += `<td class="${bgClass}">${visits > 0 ? visits : ''}</td>`;
        });
        html += "</tr>";
    }

    html += "</tbody></table></div>";
    calendarDiv.innerHTML = html;
}

function analyzeActivityHours(data) {
    const workHours = {};
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const intervalSize = document.getElementById("interval-select").value === "15min" ? 15 : 60;

    days.forEach((day) => {
        const intervals = Object.keys(data[day] || {}).map(Number).sort((a, b) => a - b);
        if (intervals.length > 0) {
            const startTime = intervalToTime(intervals[0], intervalSize);
            const endTime = intervalToTime(intervals[intervals.length - 1], intervalSize);
            workHours[day] = { start: startTime, end: endTime };
            console.log(`${day}: Usage started at ${startTime}, ended at ${endTime}`);
        }
    });
}

function intervalToTime(interval, intervalSize) {
    const totalMinutes = interval * intervalSize;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}