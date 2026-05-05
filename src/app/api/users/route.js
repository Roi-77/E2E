// src/app/api/users/route.js
import { users } from "../_data";

export async function GET() {
  // Return the users object (username -> { publicKey })
  // For demo we return publicKey and omit password
  const safe = {};
  for (const [u, v] of Object.entries(users)) {
    safe[u] = { publicKey: v.publicKey };
  }
  return new Response(JSON.stringify(safe), { status: 200 });
}
