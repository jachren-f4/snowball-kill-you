# Multiplayer: 2-Player Online Co-op

2-player P2P multiplayer using WebRTC via [Trystero](https://github.com/nicedoc/trystero) (Nostr strategy). No server needed — works on GitHub Pages as-is.

## How It Works

1. Host clicks **Create Room** → gets a 4-character room code
2. Guest enters the code and clicks **Join**
3. Trystero connects the two peers via WebRTC data channels
4. Host taps to start → both players begin simultaneously

## Architecture

**Roles:** Host (creates room, authoritative NPC AI) / Guest (joins room, receives NPC state)

**What gets synced:**

| Data | Direction | Frequency |
|------|-----------|-----------|
| Ball position, rotation, radius, velocity | Both → Both | Every frame (~60fps) |
| Collectible collected (id + who) | Collector → Other | On event |
| NPC positions/rotations | Host → Guest | ~10fps |
| Game start signal | Host → Guest | Once |

**NOT synced** (player-local): camera, controls, trail particles, wobble animation.

## Files

| File | Role |
|------|------|
| `src/Network.ts` | Trystero wrapper — room create/join, `makeAction()` channels for ball/collect/NPC/start |
| `src/RemoteBall.ts` | Visual-only snowball — lerp interpolation toward network state, item attachment |
| `src/Game.ts` | Multiplayer game loop integration, UI handlers, collision authority |
| `src/NPC.ts` | `setNetworkPosition()` for guest-mode sync, `getNetworkState()` for host broadcast |
| `index.html` | Room create/join UI on start screen |

## Network Messages

```typescript
BallState    { t:'b', x,y,z, r, qx,qy,qz,qw, vx,vz }  // position, radius, quaternion, velocity
CollectEvent { t:'c', id, by:'host'|'guest' }             // collectible index + who got it
NPCState     { t:'n', npcs:[{x,y,z,ry},...] }             // NPC positions from host
GameStart    { t:'s' }                                     // host signals game start
```

## Collision Authority

Each player checks collisions locally. On collect, a `CollectEvent` is sent to the remote peer. If both grab the same item simultaneously, the remote event reparents the mesh (Three.js auto-removes from previous parent), so the last event received wins visually.

## Dependencies

- `trystero` — P2P WebRTC with decentralized signaling (Nostr relays, no server config)

## Known Limitations

- 2 players max (P2P, not designed for more)
- No reconnection — if a peer disconnects, the remote ball is destroyed
- Ball radius can desync slightly in same-item race conditions (both players grow locally)
- Signaling depends on public Nostr relays — connection time varies (typically 2-10s)
