import { joinRoom as trysteroJoinRoom, Room } from 'trystero/nostr';

// Message types
export type BallState = {
  t: 'b';
  x: number; y: number; z: number;
  r: number;
  qx: number; qy: number; qz: number; qw: number;
  vx: number; vz: number;
};

export type CollectEvent = {
  t: 'c';
  id: number;
  by: 'host' | 'guest';
};

export type NPCState = {
  t: 'n';
  npcs: { x: number; y: number; z: number; ry: number }[];
};

export type GameStart = {
  t: 's';
};

type Callbacks = {
  onPeerJoin?: () => void;
  onPeerLeave?: () => void;
  onBallState?: (state: BallState) => void;
  onCollectEvent?: (event: CollectEvent) => void;
  onNPCState?: (state: NPCState) => void;
  onGameStart?: () => void;
};

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class Network {
  private room: Room | null = null;
  private callbacks: Callbacks = {};
  private sendBallFn: ((state: BallState) => void) | null = null;
  private sendCollectFn: ((event: CollectEvent) => void) | null = null;
  private sendNPCFn: ((state: NPCState) => void) | null = null;
  private sendStartFn: ((msg: GameStart) => void) | null = null;

  isHost = false;
  connected = false;
  roomCode = '';

  onPeerJoin(cb: () => void) { this.callbacks.onPeerJoin = cb; }
  onPeerLeave(cb: () => void) { this.callbacks.onPeerLeave = cb; }
  onBallState(cb: (state: BallState) => void) { this.callbacks.onBallState = cb; }
  onCollectEvent(cb: (event: CollectEvent) => void) { this.callbacks.onCollectEvent = cb; }
  onNPCState(cb: (state: NPCState) => void) { this.callbacks.onNPCState = cb; }
  onGameStart(cb: () => void) { this.callbacks.onGameStart = cb; }

  createRoom(): string {
    this.isHost = true;
    this.roomCode = generateRoomCode();
    this.joinInternal(this.roomCode);
    return this.roomCode;
  }

  joinRoom(code: string) {
    this.isHost = false;
    this.roomCode = code.toUpperCase();
    this.joinInternal(this.roomCode);
  }

  private joinInternal(code: string) {
    const appId = 'snowball-kill-you-mp';
    this.room = trysteroJoinRoom({ appId }, `room-${code}`);

    this.room.onPeerJoin(() => {
      this.connected = true;
      this.callbacks.onPeerJoin?.();
    });

    this.room.onPeerLeave(() => {
      this.connected = false;
      this.callbacks.onPeerLeave?.();
    });

    // Set up data channels using makeAction
    const [sendBall, onBall] = this.room.makeAction<BallState>('ball');
    this.sendBallFn = (state) => sendBall(state);
    onBall((data) => this.callbacks.onBallState?.(data));

    const [sendCollect, onCollect] = this.room.makeAction<CollectEvent>('collect');
    this.sendCollectFn = (event) => sendCollect(event);
    onCollect((data) => this.callbacks.onCollectEvent?.(data));

    const [sendNPC, onNPC] = this.room.makeAction<NPCState>('npc');
    this.sendNPCFn = (state) => sendNPC(state);
    onNPC((data) => this.callbacks.onNPCState?.(data));

    const [sendStart, onStart] = this.room.makeAction<GameStart>('start');
    this.sendStartFn = (msg) => sendStart(msg);
    onStart(() => this.callbacks.onGameStart?.());
  }

  sendBallState(state: BallState) {
    this.sendBallFn?.(state);
  }

  sendCollectEvent(event: CollectEvent) {
    this.sendCollectFn?.(event);
  }

  sendNPCState(state: NPCState) {
    this.sendNPCFn?.(state);
  }

  sendGameStart() {
    this.sendStartFn?.({ t: 's' });
  }

  leave() {
    this.room?.leave();
    this.room = null;
    this.connected = false;
  }
}
