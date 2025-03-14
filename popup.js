document.addEventListener("DOMContentLoaded", () => {
    const prevWeekBtn = document.getElementById("prev-week");
    const nextWeekBtn = document.getElementById("next-week");
    const weekLabel = document.getElementById("week-label");
    let weekOffset = 0;

    function updateWeek() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

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
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    history.forEach((item) => {
        const visitTime = new Date(item.lastVisitTime);
        const daysSinceStart = Math.floor((visitTime - startDate) / (1000 * 60 * 60 * 24));
        const day = days[daysSinceStart] || "Unknown";
        const minutes = visitTime.getHours() * 60 + visitTime.getMinutes();
        const interval = Math.floor(minutes / 15);

        if (!weeklyData[day]) weeklyData[day] = {};
        weeklyData[day][interval] = (weeklyData[day][interval] || 0) + 1;
    });

    return weeklyData;
}

function renderHeatmap(data) {
    const calendarDiv = document.getElementById("calendar");
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

    for (let interval = 0; interval < 96; interval++) {
        const hour = Math.floor(interval / 4);
        const minute = (interval % 4) * 15;
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
    days.forEach((day) => {
        const intervals = Object.keys(data[day] || {}).map(Number).sort((a, b) => a - b);
        if (intervals.length > 0) {
            const startTime = intervalToTime(intervals[0]);
            const endTime = intervalToTime(intervals[intervals.length - 1]);
            workHours[day] = { start: startTime, end: endTime };
            console.log(`${day}: Usage started at ${startTime}, ended at ${endTime}`);
        }
    });
}

function intervalToTime(interval) {
    const hour = Math.floor(interval / 4);
    const minute = (interval % 4) * 15;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}