const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)
  || ('ontouchstart' in window && window.innerWidth < 1024);

export class Controls {
  private keys = new Set<string>();
  private touchDir = { x: 0, z: 0 };
  private touchActive = false;

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    if (isMobile) {
      this.setupMobileJoystick();
    }
  }

  private setupMobileJoystick() {
    const zone = document.getElementById('joystick-zone')!;
    const base = document.getElementById('joystick-base')!;
    const thumb = document.getElementById('joystick-thumb')!;

    // Force-show joystick zone via JS — CSS media queries can fail on
    // Samsung devices (S-Pen reports hover:hover / pointer:fine)
    zone.style.display = 'block';

    // Center of joystick in screen coords (top/left with translate(-50%,-50%))
    const baseX = 100;
    const getBaseY = () => window.innerHeight - 130;

    const positionAt = (el: HTMLElement, x: number, y: number) => {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.bottom = 'auto';
    };

    // Show base and thumb at fixed position
    base.style.display = 'block';
    positionAt(base, baseX, getBaseY());
    thumb.style.display = 'block';
    positionAt(thumb, baseX, getBaseY());

    const maxDist = 55;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touchActive = true;
      this.handleTouch(e.touches[0], baseX, getBaseY(), maxDist, thumb);
    });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.touchActive) return;
      this.handleTouch(e.touches[0], baseX, getBaseY(), maxDist, thumb);
    });

    const endTouch = () => {
      this.touchActive = false;
      this.touchDir.x = 0;
      this.touchDir.z = 0;
      positionAt(thumb, baseX, getBaseY());
    };

    zone.addEventListener('touchend', endTouch);
    zone.addEventListener('touchcancel', endTouch);
  }

  private handleTouch(
    touch: Touch,
    baseX: number,
    baseY: number,
    maxDist: number,
    thumb: HTMLElement,
  ) {
    const dx = touch.clientX - baseX;
    const dy = touch.clientY - baseY;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * dist;
    const clampedY = Math.sin(angle) * dist;

    thumb.style.left = (baseX + clampedX) + 'px';
    thumb.style.top = (baseY + clampedY) + 'px';

    this.touchDir.x = clampedX / maxDist;
    this.touchDir.z = clampedY / maxDist;
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
