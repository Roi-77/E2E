// src/app/page.js
"use client";
import { useState } from "react";
import { generateKeyPair } from "../lib/crypto";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin() {
    setStatus("Generating keys...");
    // Generate RSA key pair
    const keyPair = await generateKeyPair();

    // Export public key (spki) and private key (jwk)
    const publicSpki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicBase64 = btoa(String.fromCharCode(...new Uint8Array(publicSpki)));

    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Send username/password/publicKey to server (register/login)
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, publicKey: publicBase64 }),
    });

    const data = await res.json();
    if (res.ok) {
      // Store private key JWK in sessionStorage (client-only)
      sessionStorage.setItem("privateKeyJwk", JSON.stringify(privateJwk));
      localStorage.setItem("username", username);
      setStatus("Logged in. Redirecting to chat...");
      // Navigate to chat
      window.location.href = "/chat";
    } else {
      setStatus(data.error || "Login failed");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Secure Chat — Login / Register</h1>
        <input className="w-full p-2 border rounded mb-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="w-full p-2 border rounded mb-4" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-2 rounded">Login / Register</button>
        <p className="mt-3 text-sm text-gray-600">{status}</p>
      </div>
    </div>
  );
}
