// src/app/api/messages/route.js
import { messages } from "../_data";

export async function POST(req) {
  try {
    const { sender, recipient, ciphertext, iv, encryptedAESKey } = await req.json();
    // Basic validation
    if (!sender || !recipient) {
      return new Response(JSON.stringify({ error: "Missing sender/recipient" }), { status: 400 });
    }
    messages.push({ sender, recipient, ciphertext, iv, encryptedAESKey });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function GET() {
  return new Response(JSON.stringify(messages), { status: 200 });
}
