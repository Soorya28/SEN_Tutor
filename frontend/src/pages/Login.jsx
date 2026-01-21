import { useState } from "react";
import api from "../services/api";
import Learning from "./Learning";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState(null);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      if (response.data.session_token) {
        setSessionToken(response.data.session_token);
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("Login failed");
    }
  };

  if (sessionToken) {
    return <Learning sessionToken={sessionToken} />;
  }

  return (
    <div style={{ padding: "40px" }}>
      <h2>Student Login</h2>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleLogin}>Login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Login;
