export class Controls {
  private keys = new Set<string>();
  private touchDir = { x: 0, z: 0 };
  private touchActive = false;

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    this.setupTouch();
  }

  private setupTouch() {
    const zone = document.getElementById('joystick-zone')!;
    const base = document.getElementById('joystick-base')!;
    const thumb = document.getElementById('joystick-thumb')!;

    let startX = 0;
    let startY = 0;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      base.style.display = 'block';
      thumb.style.display = 'block';
      base.style.left = startX + 'px';
      base.style.top = startY + 'px';
      thumb.style.left = startX + 'px';
      thumb.style.top = startY + 'px';
      this.touchActive = true;
    });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.touchActive) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const maxDist = 50;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * dist;
      const clampedY = Math.sin(angle) * dist;
      thumb.style.left = startX + clampedX + 'px';
      thumb.style.top = startY + clampedY + 'px';
      this.touchDir.x = clampedX / maxDist;
      this.touchDir.z = clampedY / maxDist;
    });

    const endTouch = () => {
      this.touchActive = false;
      this.touchDir.x = 0;
      this.touchDir.z = 0;
      base.style.display = 'none';
      thumb.style.display = 'none';
    };

    zone.addEventListener('touchend', endTouch);
    zone.addEventListener('touchcancel', endTouch);
  }

  getDirection(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) z -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) z += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;

    if (x !== 0 || z !== 0) {
      const len = Math.sqrt(x * x + z * z);
      x /= len;
      z /= len;
    }

    if (this.touchActive) {
      x = this.touchDir.x;
      z = this.touchDir.z;
    }

    return { x, z };
  }
}
