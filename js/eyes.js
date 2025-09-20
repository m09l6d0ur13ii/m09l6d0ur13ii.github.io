document.addEventListener('mousemove', e => {
    const tee = document.querySelector('.tee');
    if (!tee) return;

    const eyes = tee.querySelector('.tee__eyes');
    if (!eyes) return;

    const rect = tee.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    const maxMove = 4; // макс смещение глаз
    const moveX = Math.max(-maxMove, Math.min(maxMove, dx * 0.05));
    const moveY = Math.max(-maxMove, Math.min(maxMove, dy * 0.05));

    eyes.style.transform = `translate(${moveX}px, ${moveY}px)`;
});
