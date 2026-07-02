const canvas = document.getElementById("heroCanvas");
const context = canvas.getContext("2d");
const object = document.querySelector(".hero__object");
const pointer = { x: 0.5, y: 0.5 };

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawRibbon(time) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  context.clearRect(0, 0, width, height);
  context.save();
  context.globalCompositeOperation = "lighter";

  const originX = width * 0.67;
  const originY = height * 0.42;
  const count = width < 700 ? 72 : 118;

  for (let layer = 0; layer < 4; layer += 1) {
    context.beginPath();
    for (let index = 0; index <= count; index += 1) {
      const progress = index / count;
      const angle = progress * Math.PI * (4.5 + layer * 0.35) + time * (0.22 + layer * 0.015);
      const radius = 24 + progress * Math.min(width, height) * (0.31 + layer * 0.016);
      const pulse = Math.sin(time * 1.3 + progress * 9 + layer) * 8;
      const x = originX + Math.cos(angle) * (radius + pulse) * 1.25;
      const y = originY + Math.sin(angle) * (radius + pulse) * 0.36;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }

    const gradient = context.createLinearGradient(width * 0.42, 0, width * 0.96, height);
    gradient.addColorStop(0, `rgba(39, 93, 255, ${0.08 + layer * 0.015})`);
    gradient.addColorStop(0.48, `rgba(83, 218, 255, ${0.22 - layer * 0.02})`);
    gradient.addColorStop(0.74, `rgba(215, 255, 69, ${0.18 - layer * 0.02})`);
    gradient.addColorStop(1, "rgba(255, 118, 188, 0.05)");
    context.strokeStyle = gradient;
    context.lineWidth = 1.2 + layer * 0.65;
    context.stroke();
  }

  for (let index = 0; index < 62; index += 1) {
    const progress = index / 62;
    const angle = progress * Math.PI * 11 + time * 0.28;
    const radius = 38 + progress * Math.min(width, height) * 0.3;
    const x = originX + Math.cos(angle) * radius * 1.2;
    const y = originY + Math.sin(angle) * radius * 0.38;
    const size = 0.8 + (1 - progress) * 2.3;
    context.beginPath();
    context.fillStyle = index % 9 === 0 ? "rgba(215,255,69,.72)" : "rgba(62,137,255,.34)";
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function animate(milliseconds) {
  drawRibbon(milliseconds / 1000);
  requestAnimationFrame(animate);
}

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / window.innerWidth;
  pointer.y = event.clientY / window.innerHeight;
  const rotateY = (pointer.x - 0.5) * 9;
  const rotateX = (0.5 - pointer.y) * 7;
  object.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(animate);
