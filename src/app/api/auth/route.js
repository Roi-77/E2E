// src/app/api/auth/route.js
import { users } from "../_data";

export async function POST(req) {
  try {
    const { username, password, publicKey } = await req.json();

    if (!username || !password || !publicKey) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    // Simple register-if-not-exists behavior for demo
    if (!users[username]) {
      users[username] = { password, publicKey };
    }

    // Validate credentials
    if (users[username].password !== password) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
    }

    // Return a simple success (token omitted for brevity)
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
