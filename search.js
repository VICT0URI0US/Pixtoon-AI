const { tavily } = require("@tavily/core");

const tvly = tavily({
  apiKey: "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"
});

async function shouldSearchWeb(message) {
  console.log("CHECKING SEARCH FOR:", message);

  const msg = message.trim().toLowerCase();

  const simple = [
    "hi", "hello", "hey",
    "good morning", "good afternoon", "good evening",
    "how are you", "thanks", "thank you",
    "bye", "goodbye"
  ];

  if (simple.includes(msg)) {
    return false;
  }

  const check = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      stream: false,
      prompt: `Can this question be answered accurately without current internet information?

Question: "${message}"

Reply ONLY with YES or NO.`
    })
  });

  const data = await check.json();
  return data.response.trim().toUpperCase().includes("NO");
}

async function searchInternet(query) {
  const result = await tvly.search(query, {
    searchDepth: "basic",
    maxResults: 5
  });

  const text = result.results
    .map(r => r.content)
    .filter(Boolean)
    .join("\n\n")
    .replace(/Your browser doesn't support HTML5 audio/gi, "")
    .replace(/{{.*?}}/g, "")
    .slice(0, 4000);

  const scoreMatch = text.match(/[A-Z][a-zA-Z]+ \d+[-–]\d+ [A-Z][a-zA-Z]+/);

  if (scoreMatch) {
    return {
      foundDirectAnswer: true,
      answer: `The latest score/result I found is: ${scoreMatch[0]}.`,
      raw: text
    };
  }

  return {
    foundDirectAnswer: false,
    answer: null,
    raw: text
  };
}

module.exports = {
  shouldSearchWeb,
  searchInternet
};