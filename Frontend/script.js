// =====================================================
// 1. CONFIGURATION
// =====================================================

const API_URL = "http://127.0.0.1:8000";

// Input elements
const messageInput = document.getElementById("message");
const submitButton = document.getElementById("submit");
const statusText = document.getElementById("status");

// AI response elements
const responsePanel = document.getElementById("ai-response-panel");
const aiResponse = document.getElementById("ai-response");

// Classification elements
const analysisPanel = document.getElementById("analysis-panel");
const intentValue = document.getElementById("intent-value");
const riskValue = document.getElementById("risk-value");
const priorityValue = document.getElementById("priority-value");
const actionValue = document.getElementById("action-value");
const summaryValue = document.getElementById("summary-value");

// JSON elements
const result = document.getElementById("result");
const copyButton = document.getElementById("copy");


// =====================================================
// 2. CHECK REQUIRED HTML ELEMENTS
// =====================================================

const requiredElements = {
    messageInput,
    submitButton,
    statusText,
    responsePanel,
    aiResponse,
    analysisPanel,
    intentValue,
    riskValue,
    priorityValue,
    actionValue,
    summaryValue,
    result,
    copyButton
};

const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

if (missingElements.length > 0) {
    console.error(
        "Missing HTML elements:",
        missingElements.join(", ")
    );
}


// =====================================================
// 3. EXAMPLE MESSAGE BUTTONS
// =====================================================

document.querySelectorAll(".example").forEach((button) => {
    button.addEventListener("click", () => {
        messageInput.value = button.dataset.message || "";
        messageInput.focus();

        statusText.textContent = "Example message selected.";
        statusText.className = "status";
    });
});


// =====================================================
// 4. SAFE MARKDOWN RENDERER
// Supports headings, bold, italic, lists, paragraphs,
// inline code and line breaks.
// Does not insert AI-generated HTML directly.
// =====================================================

function renderMarkdown(markdown) {
    aiResponse.replaceChildren();

    if (typeof markdown !== "string" || !markdown.trim()) {
        const paragraph = document.createElement("p");
        paragraph.textContent = "No response was returned.";
        aiResponse.appendChild(paragraph);
        return;
    }

    const lines = markdown.replace(/\r\n/g, "\n").split("\n");

    let currentList = null;
    let currentListType = null;

    function appendInlineText(parent, text) {
        // Parse a limited set of Markdown inline features.
        // All text is inserted as text nodes, not HTML.
        const pattern =
            /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parent.appendChild(
                    document.createTextNode(
                        text.slice(lastIndex, match.index)
                    )
                );
            }

            const token = match[0];
            let element;

            if (token.startsWith("**") || token.startsWith("__")) {
                element = document.createElement("strong");
                element.textContent = token.slice(2, -2);
            } else if (token.startsWith("*") || token.startsWith("_")) {
                element = document.createElement("em");
                element.textContent = token.slice(1, -1);
            } else {
                element = document.createElement("code");
                element.textContent = token.slice(1, -1);
            }

            parent.appendChild(element);
            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            parent.appendChild(
                document.createTextNode(text.slice(lastIndex))
            );
        }
    }

    function closeList() {
        currentList = null;
        currentListType = null;
    }

    for (const originalLine of lines) {
        const line = originalLine.trim();

        // Blank lines separate Markdown blocks.
        if (!line) {
            closeList();
            continue;
        }

        // Headings: #, ##, ###
        const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

        if (headingMatch) {
            closeList();

            const headingLevel = headingMatch[1].length + 1;
            const heading = document.createElement(`h${headingLevel}`);

            appendInlineText(heading, headingMatch[2]);
            aiResponse.appendChild(heading);
            continue;
        }

        // Ordered list: 1. Item
        const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);

        // Unordered list: - Item or * Item
        const unorderedMatch = line.match(/^[-*]\s+(.+)$/);

        if (orderedMatch || unorderedMatch) {
            const listType = orderedMatch ? "ol" : "ul";
            const itemText = orderedMatch
                ? orderedMatch[1]
                : unorderedMatch[1];

            if (!currentList || currentListType !== listType) {
                closeList();

                currentList = document.createElement(listType);
                currentListType = listType;

                aiResponse.appendChild(currentList);
            }

            const item = document.createElement("li");
            appendInlineText(item, itemText);
            currentList.appendChild(item);

            continue;
        }

        // Normal paragraph
        closeList();

        const paragraph = document.createElement("p");
        appendInlineText(paragraph, line);

        aiResponse.appendChild(paragraph);
    }
}


// =====================================================
// 5. DISPLAY CLASSIFICATION RESULTS
// =====================================================

function displayAnalysis(data) {
    intentValue.textContent = data.intent ?? "Unknown";
    riskValue.textContent = data.risk_profile ?? "Unknown";
    priorityValue.textContent = data.priority ?? "Unknown";

    actionValue.textContent =
        typeof data.requires_action === "boolean"
            ? (data.requires_action ? "Yes" : "No")
            : "Unknown";

    summaryValue.textContent =
        data.summary ?? "No summary available.";

    analysisPanel.hidden = false;
}


// =====================================================
// 6. DISPLAY THE COMPLETE JSON RESPONSE
// =====================================================

function displayJSON(data) {
    result.replaceChildren();

    const code = document.createElement("code");
    code.textContent = JSON.stringify(data, null, 2);

    result.appendChild(code);
}


// =====================================================
// 7. ANALYZE MESSAGE
// =====================================================

async function analyzeMessage() {
    const message = messageInput.value.trim();

    if (!message) {
        statusText.textContent = "Please enter a message first.";
        statusText.className = "status error";
        messageInput.focus();
        return;
    }

    if (message.length > 5000) {
        statusText.textContent =
            "Your message must contain no more than 5000 characters.";
        statusText.className = "status error";
        return;
    }

    // Reset previous results.
    responsePanel.hidden = true;
    analysisPanel.hidden = true;

    result.replaceChildren();

    const placeholder = document.createElement("code");
    placeholder.textContent = "Processing your message...";
    result.appendChild(placeholder);

    copyButton.disabled = true;
    submitButton.disabled = true;
    submitButton.textContent = "Analyzing...";
    statusText.textContent =
        "Sending your message to the AI backend...";

    statusText.className = "status";

    try {
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });

        // Handle invalid JSON or non-JSON server responses.
        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                `The server returned an invalid response (HTTP ${response.status}).`
            );
        }

        if (!response.ok) {
            const detail =
                typeof data.detail === "string"
                    ? data.detail
                    : JSON.stringify(data.detail ?? data);

            throw new Error(
                `Request failed (${response.status}): ${detail}`
            );
        }

        // Confirm that the backend returned the expected data.
        if (
            typeof data !== "object" ||
            data === null ||
            typeof data.intent !== "string"
        ) {
            throw new Error(
                "The backend response is missing required classification data."
            );
        }

        // Show the formatted AI response.
        renderMarkdown(data.response || "");

        responsePanel.hidden = false;

        // Show intent, risk, priority and summary.
        displayAnalysis(data);

        // Keep the complete JSON available for developers.
        displayJSON(data);

        copyButton.disabled = false;

        statusText.textContent =
            "Success! AI response generated and classification validated.";

        statusText.className = "status success";

    } catch (error) {
        console.error("Analysis error:", error);

        statusText.textContent =
            error.message ||
            "Something went wrong while analyzing your message.";

        statusText.className = "status error";

        result.replaceChildren();

        const errorCode = document.createElement("code");
        errorCode.textContent = error.message;
        result.appendChild(errorCode);

    } finally {
        submitButton.disabled = false;

        submitButton.innerHTML =
            'Analyze message <span aria-hidden="true">→</span>';
    }
}


// =====================================================
// 8. ANALYZE BUTTON EVENT
// =====================================================

submitButton.addEventListener("click", analyzeMessage);


// =====================================================
// 9. SUBMIT USING CTRL + ENTER
// =====================================================

messageInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();

        if (!submitButton.disabled) {
            analyzeMessage();
        }
    }
});


// =====================================================
// 10. COPY JSON TO CLIPBOARD
// =====================================================

copyButton.addEventListener("click", async () => {
    if (copyButton.disabled) {
        return;
    }

    const jsonText = result.textContent;

    try {
        await navigator.clipboard.writeText(jsonText);

        statusText.textContent =
            "Complete JSON response copied to clipboard.";

        statusText.className = "status success";

    } catch (error) {
        console.error("Clipboard error:", error);

        statusText.textContent =
            "Could not access the clipboard. Select and copy the JSON manually.";

        statusText.className = "status error";
    }
});