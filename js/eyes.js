document.addEventListener('mousemove', (e) => {
  const eyes = document.querySelector('.tee__eyes');
  if (!eyes) return;

  const rect = eyes.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let dx = e.clientX - centerX;
  let dy = e.clientY - centerY;

  const maxRadius = 12; // максимальное смещение глаз

  // ограничиваем движение по кругу
  const distance = Math.sqrt(dx*dx + dy*dy);
  if (distance > maxRadius) {
    const scale = maxRadius / distance;
    dx *= scale;
    dy *= scale;
  }

  eyes.style.transform = `translate(${dx}px, ${dy}px)`;
});
