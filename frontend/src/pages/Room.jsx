import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { getSocket } from "../lib/socket.js";
import DoodlePad from "../components/DoodlePad.jsx";
import Countdown from "../components/Countdown.jsx";

export default function Room() {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [online, setOnline] = useState([]);
  const socketRef = useRef(null);

  const [invite, setInvite] = useState(null);

  useEffect(() => {
    api
      .myRoom()
      .then(async ({ room }) => {
        setRoom(room);
        if (!room) {
          const { invite } = await api.pendingInvite();
          setInvite(invite);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!room) return;

    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();
    socket.emit("room:join", { roomId: room.id });

    socket.on("presence:update", ({ online }) => setOnline(online));
    socket.on("countdown:update", ({ target }) =>
      setRoom((r) => ({ ...r, countdown_target: target }))
    );

    return () => {
      socket.off("presence:update");
      socket.off("countdown:update");
      socket.disconnect();
    };
  }, [room?.id]);

  const [joinError, setJoinError] = useState(null);

  async function handleCreateRoom(e) {
    e.preventDefault();
    await api.createRoom(inviteEmail);
    const { room } = await api.myRoom();
    setRoom(room);
  }

  async function handleJoinOpen() {
    setJoinError(null);
    try {
      await api.joinOpenRoom();
      const { room } = await api.myRoom();
      setRoom(room);
    } catch (err) {
      setJoinError(err.message);
    }
  }

  async function handleAcceptInvite() {
    await api.acceptInvite(invite.roomId);
    const { room } = await api.myRoom();
    setRoom(room);
    setInvite(null);
  }

  function setCountdown(isoString) {
    socketRef.current?.emit("countdown:set", { roomId: room.id, target: isoString });
  }

  if (loading) return <Centered>loading your room…</Centered>;

  if (!room) {
    return (
      <Centered>
        {invite && (
          <div
            style={{
              background: "var(--color-mint)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <p>
              <strong>{invite.ownerName || invite.ownerEmail}</strong> invited you to their room.
            </p>
            <button onClick={handleAcceptInvite}>Accept invite</button>
          </div>
        )}

        <h2 className="heading">Invite someone to your room</h2>
        <form onSubmit={handleCreateRoom} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input
            placeholder="their email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button type="submit">Create room</button>
        </form>
        <p style={{ margin: "20px 0 8px" }}>— or, for testing —</p>
        <button onClick={handleJoinOpen}>Join an open room</button>
        {joinError && <p style={{ color: "crimson" }}>{joinError}</p>}
      </Centered>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-cream)", padding: 24 }}>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center" }}
      >
        <h1 className="heading" style={{ color: "var(--color-plum)" }}>
          Faraway
        </h1>
        <p style={{ opacity: 0.7 }}>
          {online.length > 1 ? "you're both here 💛" : "waiting for them to show up…"}
        </p>
      </motion.header>

      <Countdown target={room.countdown_target} onSetTarget={setCountdown} />

      <div
        style={{
          maxWidth: 640,
          margin: "32px auto",
          background: "var(--color-blush)",
          borderRadius: 20,
          padding: 16,
        }}
      >
        <h3 className="heading">doodle pad</h3>
        <DoodlePad roomId={room.id} socket={socketRef.current} />
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        background: "var(--color-cream)",
      }}
    >
      <div>{children}</div>
    </div>
  );
}
