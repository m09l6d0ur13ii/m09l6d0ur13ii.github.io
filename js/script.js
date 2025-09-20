const overlay = document.getElementById('overlay');
const video = document.querySelector('video.bg');
const music = document.getElementById('bgMusic');
const muteBtn = document.getElementById('muteBtn');

function startExperience() {
  overlay.style.display = 'none';
  document.body.classList.add('loaded');
  video.play();
  music.play();
  muteBtn.style.display = 'flex';
}

overlay.addEventListener('click', startExperience);
document.addEventListener('keydown', (e) => { if(e.key === "Enter") startExperience(); });

muteBtn.addEventListener('click', ()=>{
  music.muted = !music.muted;
  muteBtn.textContent = music.muted ? '🔇' : '🔊';
});

// Эффект печати в title
const base = "m09l6d0ur13ii";
let i = 0;
function typeTitle(){
  if(i<=base.length){
    document.title = "@" + base.slice(0,i);
    i++;
  }else{
    i=0;
  }
  setTimeout(typeTitle,500);
}
typeTitle();
