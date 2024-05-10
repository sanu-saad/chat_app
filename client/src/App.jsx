import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import WebSocket from "isomorphic-ws";

const App = () => {
  const [roomName, setRoomName] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef(null);

  const joinRoom = async () => {
    const response = await axios.post("http://localhost:5000/join", {
      roomName,
      userName,
    });
    const newUserId = response.data.userId;

    setUserId(newUserId);

    // Initialize WebSocket connection after joining
    wsRef.current = new WebSocket(`ws://localhost:5000`);

    wsRef.current.onopen = () => {
      wsRef.current.send(
        JSON.stringify({
          roomName,
          userId: newUserId,
          action: "join",
          content: userName,
        })
      );
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.message) {
        setMessages((prevMessages) => [...prevMessages, data.message]);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };
  };

  const sendMessage = async () => {
    if (wsRef.current && newMessage.trim() !== "") {
      wsRef.current.send(
        JSON.stringify({
          roomName,
          userId,
          action: "send",
          content: newMessage.trim(),
        })
      );

      setNewMessage("");
    }
  };

  //leave room
  const leaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setUserId(null);
    setMessages([]);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Real-Time Chat App</h1>
      <p>Using class-based architecture.Without directly using Socket.io</p>
      <div className="mt-4">
        <input
          type="text"
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="border p-2 mr-2 rounded mb-2"
        />
        <input
          type="text"
          placeholder="Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="border p-2 mr-2 rounded"
        />
        <button
          onClick={joinRoom}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Join Room
        </button>
      </div>
      {userId && (
        <div className="mt-4">
          <button
            onClick={leaveRoom}
            className="bg-red-500 text-white px-2 py-2 rounded hover:bg-red-600"
          >
            Leave Room
          </button>

          <div
            className="border p-4 bg-gray-800 text-white rounded"
            style={{ height: "300px", overflowY: "scroll" }}
          >
            {messages.map((msg, index) => (
              <div key={index} className="mb-2">
                {msg}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="border p-2 rounded"
            />
            <button
              onClick={sendMessage}
              className="bg-green-500 text-white px-4 py-2 ml-2 rounded hover:bg-green-600"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
