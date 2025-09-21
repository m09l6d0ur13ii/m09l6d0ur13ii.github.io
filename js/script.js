const music = document.getElementById('bgMusic');
const muteBtn = document.getElementById('muteBtn');
const soundIcon = document.getElementById('soundIcon');
const tee = document.querySelector('.tee');
const links = document.querySelectorAll('.links a');

let happyTimeout = null;

// Hover на ссылки — глаза surprise
links.forEach(link => {
  link.addEventListener('mouseenter', () => {
    tee.dataset.previousEyes = tee.dataset.eyes || 'normal';
    tee.dataset.eyes = 'surprise';
  });

  link.addEventListener('mouseleave', () => {
    tee.dataset.eyes = tee.dataset.previousEyes || 'normal';
    delete tee.dataset.previousEyes;
  });
});

// Клик на тишку — глаза happy на 1 секунду
tee.addEventListener('click', () => {
  if (!tee.dataset.previousEyes) {
    tee.dataset.previousEyes = tee.dataset.eyes || 'normal';
  }

  tee.dataset.eyes = 'happy';

  if (happyTimeout) clearTimeout(happyTimeout);

  happyTimeout = setTimeout(() => {
    tee.dataset.eyes = tee.dataset.previousEyes || 'normal';
    delete tee.dataset.previousEyes;
    happyTimeout = null;
  }, 1000);
});

// Детектор вращения мышки вокруг тишки (3 оборота за 2 секунды -> dead)
let lastAngle = null;
let revolutions = 0;
let startTime = null;
let lastQuadrant = null;

document.addEventListener('mousemove', e => {
  const rect = tee.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = e.clientX - centerX;
  const dy = e.clientY - centerY;
  const angle = Math.atan2(dy, dx);

  const quadrant = Math.floor(((angle + Math.PI) / (Math.PI / 2))) % 4;

  if (lastQuadrant !== null) {
    let diff = quadrant - lastQuadrant;
    if (Math.abs(diff) === 3) diff = diff > 0 ? -1 : 1; // переход через границу
    revolutions += diff;
  }

  lastQuadrant = quadrant;

  if (!startTime) startTime = Date.now();
  const elapsed = Date.now() - startTime;

  if (elapsed > 2000) {
    revolutions = 0;
    startTime = Date.now();
  }

  if (Math.abs(revolutions) >= 12) {
    tee.dataset.eyes = 'dead';
    setTimeout(() => {
      tee.dataset.eyes = tee.dataset.previousEyes || 'normal';
    }, 1000);

    revolutions = 0;
    startTime = null;
    lastQuadrant = null;
  }
});

// Музыка и кнопка
music.muted = true;

muteBtn.addEventListener('click', () => {
  music.muted = !music.muted;
  if (!music.muted) music.play();
  soundIcon.src = music.muted ? "images/svg/soundoff.svg" : "images/svg/soundon.svg";
});

// Анимация title
const base = "m09l6d0ur13ii";
let i = 0;
function typeTitle() {
  if (i <= base.length) {
    document.title = "@" + base.slice(0, i);
    i++;
  } else {
    i = 0;
  }
  setTimeout(typeTitle, 500);
}
typeTitle();

// Автозапуск видео
const video = document.querySelector('video.bg');
video.play();
