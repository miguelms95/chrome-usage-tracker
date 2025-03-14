chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getHistory") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        chrome.history.search(
            {
                text: "", // Empty string returns all history
                startTime: oneWeekAgo.getTime(),
                maxResults: 10000 // Adjust as needed
            },
            (historyItems) => {
                sendResponse({ history: historyItems });
            }
        );
        return true; // Indicates async response
    }
});