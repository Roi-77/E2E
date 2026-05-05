"use client";
import { useState, useEffect, useRef } from "react";
import {
  generateAESKey,
  encryptMessage,
  decryptMessage,
  encryptAESKey,
  decryptAESKey,
} from "../../lib/crypto";

export default function ChatPage() {
  const [users, setUsers] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationKeys, setConversationKeys] = useState({});
  const [privateKey, setPrivateKey] = useState(null);

  const intervalRef = useRef(null);

  const me =
    typeof window !== "undefined"
      ? localStorage.getItem("username")
      : null;

  useEffect(() => {
    async function init() {
      try {
        // ✅ Load private key
        const stored = sessionStorage.getItem("privateKeyJwk");
        if (stored) {
          const jwk = JSON.parse(stored);
          const pk = await crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["decrypt"]
          );
          setPrivateKey(pk);
        }

        await fetchUsers();
        await fetchMessages();

        // ✅ FIX: proper interval cleanup
        intervalRef.current = setInterval(fetchMessages, 2500);
      } catch (err) {
        console.error(err);
      }
    }

    init();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;

      const data = await res.json();
      setUsers(Object.keys(data));
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  }

  async function fetchMessages() {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;

      const data = await res.json();

      const decrypted = await Promise.all(
        data.map(async (msg) => {
          if (msg.sender !== me && msg.recipient !== me) return null;

          const partner =
            msg.sender === me ? msg.recipient : msg.sender;

          let key = conversationKeys[partner];

          // ✅ FIX: decrypt AES key only once
          if (!key && msg.encryptedAESKey && privateKey) {
            try {
              const encryptedKeyBytes = Uint8Array.from(
                atob(msg.encryptedAESKey),
                (c) => c.charCodeAt(0)
              ).buffer;

              key = await decryptAESKey(encryptedKeyBytes, privateKey);

              setConversationKeys((prev) => {
                if (prev[partner]) return prev;
                return { ...prev, [partner]: key };
              });
            } catch {
              return { ...msg, text: "[Key decryption failed]" };
            }
          }

          if (!key) {
            return {
              ...msg,
              text: msg.encryptedAESKey
                ? "[Waiting for key]"
                : "[No key]",
            };
          }

          if (!msg.ciphertext) {
            return {
              ...msg,
              text: "[Conversation key established]",
            };
          }

          try {
            const iv = Uint8Array.from(
              atob(msg.iv),
              (c) => c.charCodeAt(0)
            );

            const text = await decryptMessage(
              msg.ciphertext,
              iv,
              key
            );

            return { ...msg, text };
          } catch {
            return { ...msg, text: "[Decryption failed]" };
          }
        })
      );

      setMessages(decrypted.filter(Boolean));
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }

  async function startConversation(user) {
    if (user === me) return;

    try {
      const res = await fetch("/api/users");
      const data = await res.json();

      const recipientEntry = data[user];

      if (!recipientEntry?.publicKey) {
        alert("Recipient public key not found");
        return;
      }

      const pubBytes = Uint8Array.from(
        atob(recipientEntry.publicKey),
        (c) => c.charCodeAt(0)
      ).buffer;

      const recipientPublicKey = await crypto.subtle.importKey(
        "spki",
        pubBytes,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
      );

      const aesKey = await generateAESKey();

      setConversationKeys((prev) => ({
        ...prev,
        [user]: aesKey,
      }));

      const encryptedAESKeyBuffer = await encryptAESKey(
        aesKey,
        recipientPublicKey
      );

      // ✅ FIX: safer base64 encoding
      const encryptedAESKeyBase64 = btoa(
        String.fromCharCode(
          ...new Uint8Array(encryptedAESKeyBuffer)
        )
      );

      await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: me,
          recipient: user,
          ciphertext: "",
          iv: "",
          encryptedAESKey: encryptedAESKeyBase64,
        }),
      });

      setRecipient(user);

      setTimeout(fetchMessages, 300);
    } catch (err) {
      console.error("Start conversation error:", err);
    }
  }

  async function sendMessage() {
    if (!recipient) return alert("Select a recipient");

    const key = conversationKeys[recipient];

    if (!key) {
      return alert(
        "No conversation key. Start conversation first."
      );
    }

    if (!input.trim()) return;

    try {
      const { ciphertext, iv } = await encryptMessage(
        input,
        key
      );

      const ivBase64 = btoa(
        String.fromCharCode(...iv)
      );

      await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: me,
          recipient,
          ciphertext,
          iv: ivBase64,
        }),
      });

      setInput("");
      fetchMessages();
    } catch (err) {
      console.error("Send message error:", err);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 border-r p-4 bg-white">
        <h2 className="font-bold mb-3">Users</h2>

        {users.map((u) => (
          <button
            key={u}
            onClick={() => startConversation(u)}
            className={`block w-full text-left p-2 rounded ${
              recipient === u
                ? "bg-blue-100"
                : "hover:bg-gray-100"
            }`}
          >
            {u === me ? `${u} (you)` : u}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-3">
          {messages
            .filter(
              (m) =>
                m.sender === recipient ||
                m.recipient === recipient
            )
            .map((msg, i) => (
              <div
                key={i}
                className={`max-w-md p-3 rounded ${
                  msg.sender === me
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-200 text-black mr-auto"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {msg.sender} → {msg.recipient}
                </div>
                <div>{msg.text}</div>
              </div>
            ))}
        </div>

        <div className="mt-4 flex">
          <input
            className="flex-1 p-2 border rounded"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              recipient
                ? `Message ${recipient}`
                : "Select a user"
            }
          />

          <button
            onClick={sendMessage}
            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}