import { useState } from "react";
import api from "../services/api";
import EmotionCamera from "../components/EmotionCamera";

function Learning({ sessionToken }) {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("topic"); // topic | learning
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);

  const [content, setContent] = useState("");
  const [partNumber, setPartNumber] = useState(0);
  const [totalParts, setTotalParts] = useState(0);
  const [status, setStatus] = useState("");
  const [isLastPart, setIsLastPart] = useState(false);

  // 🆕 MCQ STATE
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState({});
  const [selectedOption, setSelectedOption] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captureTrigger, setCaptureTrigger] = useState(false);

  const startOrNext = async () => {
    // 🔁 If lesson finished and user clicks "Next Topic"
    if (mode === "learning" && isLastPart) {
      resetToTopic();
      return;
    }

    setLoading(true);
    setError("");
    setCaptureTrigger(false);
    setSelectedOption(""); // 🆕 reset MCQ selection

    try {
      const payload = { session_token: sessionToken };

      if (mode === "topic") {
        if (!topic.trim()) {
          setError("Please enter a topic");
          setLoading(false);
          return;
        }
        payload.topic = topic;
      }

      const res = await api.post("/learning/start", payload);

      setMode("learning");
      setContent(res.data.content);
      setStatus(res.data.status);
      setPartNumber(res.data.part_number);
      setTotalParts(res.data.total_parts);
      setIsLastPart(res.data.part_number === res.data.total_parts);

      // 🆕 MCQ FROM BACKEND
      setQuestion(res.data.question || "");
      setOptions(res.data.options || {});
      setAwaitingAnswer(true);

    } catch {
      setError("Failed to load lesson");
    } finally {
      setLoading(false);
      setTimeout(() => setCaptureTrigger(true), 25000);
    }
  };

  // 🆕 SUBMIT ANSWER
  const submitAnswer = async () => {
    if (!selectedOption) {
      setError("Please select an option");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/learning/answer", {
        session_token: sessionToken,
        selected_option: selectedOption,
      });

      setAwaitingAnswer(false);
      // Backend decides → fetch next explanation
      await startOrNext();
    } catch {
      setError("Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  const resetToTopic = () => {
    setMode("topic");
    setTopic("");
    setContent("");
    setStatus("");
    setPartNumber(0);
    setTotalParts(0);
    setIsLastPart(false);
    setQuestion("");      // 🆕
    setOptions({});       // 🆕
    setSelectedOption(""); // 🆕
    setAwaitingAnswer(false);
  };

  return (
    /* 🔒 FORCE LIGHT THEME */
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        color: "#111",
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h2>Adaptive Learning</h2>

      <EmotionCamera
        sessionToken={sessionToken}
        captureTrigger={captureTrigger}
      />

      {/* ---------- TOPIC INPUT ---------- */}
      {mode === "topic" && (
        <>
          <p><strong>What would you like to learn?</strong></p>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Fractions, Photosynthesis"
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "16px",
              color: "#111",
              background: "#fff",
              border: "1px solid #ccc",
            }}
          />
          <br /><br />
          <button onClick={startOrNext}>
            Start Learning
          </button>

        </>
      )}

      {/* ---------- LEARNING MODE ---------- */}
      {mode === "learning" && (
        <>



          {status === "re_explaining_same_part" && (
            <p style={{ color: "#b45309", marginTop: "15px" }}>
              😕 This part was a bit difficult. Let me explain it again more simply.
            </p>
          )}

          {status === "moving_to_next_part" && (
            <p style={{ color: "#047857", marginTop: "15px" }}>
              🙂 Good effort! Let’s continue.
            </p>
          )}

          <p style={{ fontWeight: "bold", marginTop: "10px" }}>
            Part {partNumber} of {totalParts}
          </p>

          {/* Explanation */}
          <div
            style={{
              background: "#ffffff",
              color: "#111",
              padding: "24px",
              borderRadius: "10px",
              marginTop: "15px",
              fontSize: "18px",
              lineHeight: "1.7",
              border: "1px solid #ddd",
            }}
          >
            {content}
          </div>

          {/* 🆕 MCQ SECTION */}
          {question && (
            <div
              style={{
                background: "#eef2ff",
                padding: "20px",
                borderRadius: "10px",
                marginTop: "20px",
              }}
            >
              <p><strong>{question}</strong></p>

              {Object.entries(options).map(([key, value]) => (
                <div key={key} style={{ marginTop: "8px" }}>
                  <label>
                    <input
                      type="radio"
                      name="mcq"
                      value={key}
                      checked={selectedOption === key}
                      onChange={() => setSelectedOption(key)}
                    />
                    {" "} {key}) {value}
                  </label>
                </div>
              ))}

              <br />
              <button onClick={submitAnswer}>
                Submit Answer
              </button>
            </div>
          )}
        </>
      )}

      {loading && <p>Preparing explanation...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Learning;
