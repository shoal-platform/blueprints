import { useState } from "react";
import shoalLogo from "./assets/shoal-logo.svg";
import "./App.css";

const BASE_URL =
  import.meta.env.VITE_HELLO_WORLD_SERVICE ?? "http://localhost:8080";

type Status = "idle" | "loading" | "success" | "error";

function App() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState<string | null>(null);

  const url = `${BASE_URL}/hello?name=${encodeURIComponent(name)}`;

  async function handleSend() {
    setStatus("loading");
    try {
      const res = await fetch(url);
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
      setStatus("success");
    } catch (e) {
      setOutput(String(e));
      setStatus("error");
    }
  }

  const outputText =
    output ?? (status === "loading" ? "Fetching…" : "No response yet");

  return (
    <div id="center">
      <img src={shoalLogo} alt="Shoal" className="logo" />

      <div className="card">
        <div className="form">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} disabled={status === "loading"}>
            {status === "loading" ? <span className="btn-spinner" /> : "Send"}
          </button>
        </div>

        <code className="url-preview">{url}</code>

        <pre className={`response-box ${status}`}>{outputText}</pre>
      </div>
    </div>
  );
}

export default App;
