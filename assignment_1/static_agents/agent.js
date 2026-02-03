class StaticAgent {
  // position to target
  x;
  y;
  z = 0;

  // original position
  ox;
  oy;

  // rotation
  rx = 0;
  ry = 0;
  rz = 0;

  // rotation direction
  rotationDirection;
  rotationSpeed;

  color = 'white';

  colorLocked = false;

  constructor(x, y, color) {
    // starting position
    this.x = x;
    this.y = y;

    this.ox = x;
    this.oy = y;

    this.color = color;

    this.rotationDirection = random(1) > 0.5 ? 1 : -1;
    this.rotationSpeed = random(1, 75);
  }

  update() {
    if (this.colorLocked) return;
    this.color = this.color == 'white' ? 'black' : 'white';
  }

  draw(buffer) {
    buffer.push();
    buffer.strokeWeight(1);
    buffer.noStroke();
    buffer.fill(this.color);
    buffer.translate(this.x + random(-1, 1), this.y + random(-1, 1), this.z);
    this.rz += 0.01 * this.rotationDirection * this.rotationSpeed;
    buffer.rotateZ(this.rz);
    buffer.triangle(-10, 10, 10, 10, 0, -10);
    buffer.pop();
  }

  moveTo(x, y, t) {
    gsap.to(this, {
      x: x,
      y: y,
      duration: t,
      ease: "power2.inOut"
    });
  }

  forceBlack() {
    this.color = 'black';
    this.colorLocked = true;
  }
}
