/* ==========================================================================
   MAC 2026 - CANCELAMENTO DE RUÍDO EM FONES DE OUVIDO
   Motor de Processamento de Áudio, Captação via Microfone e Osciloscópio Canvas
   ========================================================================== */

// --- Estado Global da Aplicação ---
let currentMode = 'mic'; // 'mic' ou 'math'
let audioContext = null;
let micStream = null;
let micSource = null;
let analyserMic = null;
let isMicActive = false;

// --- Configuração das Variáveis Matemáticas ---
let mathParams = {
  a: 0.0,    // Deslocamento vertical (Offset)
  b: 1.0,    // Amplitude
  c: 2.0,    // Frequência angular
  d: 3.14    // Deslocamento de fase (π radianos)
};

// --- Referências de Elementos do DOM ---
const canvas = document.getElementById('oscilloscope');
const ctx = canvas.getContext('2d');
const micToggleBtn = document.getElementById('mic-toggle-btn');
const micStatusDot = document.getElementById('mic-status-dot');
const micStatusText = document.getElementById('mic-status-text');
const micLevelBar = document.getElementById('mic-level-bar');
const resultLevelBar = document.getElementById('result-level-bar');

// --- Inicialização ao Carregar a Página ---
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(drawOscilloscope);
});

// Ajusta o tamanho real do Canvas de acordo com a tela
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth - 30;
  canvas.height = 320;
}

// Alternar entre os Modos (Microfone Real vs Simulador Matemático)
function switchMode(mode) {
  currentMode = mode;
  
  // Atualizar botões
  document.getElementById('btn-tab-mic').classList.toggle('active', mode === 'mic');
  document.getElementById('btn-tab-math').classList.toggle('active', mode === 'math');
  
  // Atualizar painéis
  document.getElementById('panel-mic').classList.toggle('active-panel', mode === 'mic');
  document.getElementById('panel-math').classList.toggle('active-panel', mode === 'math');
}

// --- CONTROLE DE CAPTAÇÃO DO MICROFONE EXTERNO ---
async function toggleMicrophone() {
  if (isMicActive) {
    stopMicrophone();
  } else {
    await startMicrophone();
  }
}

async function startMicrophone() {
  try {
    // Solicita permissão ao microfone do usuário
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false, // Desativa recursos automáticos para receber o ruído puro
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    // Cria o contexto de áudio da Web Audio API
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micSource = audioContext.createMediaStreamSource(micStream);
    
    // Configura o analisador de frequência/onda
    analyserMic = audioContext.createAnalyser();
    analyserMic.fftSize = 2048;
    
    micSource.connect(analyserMic);

    // Atualizar UI para Estado Ativo
    isMicActive = true;
    micToggleBtn.textContent = 'Desligar Microfone';
    micToggleBtn.style.backgroundColor = '#d32f2f';
    micStatusDot.className = 'dot online';
    micStatusText.textContent = 'Microfone Captação Ativa';

  } catch (err) {
    alert('Não foi possível acessar o microfone externo: ' + err.message);
    console.error('Erro no acesso ao microfone:', err);
  }
}

function stopMicrophone() {
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  
  isMicActive = false;
  micToggleBtn.textContent = 'Activar Microfone Externo';
  micToggleBtn.style.backgroundColor = 'rgb(232, 127, 36)';
  micStatusDot.className = 'dot offline';
  micStatusText.textContent = 'Microfone Desligado';
  micLevelBar.style.width = '0%';
  resultLevelBar.style.width = '0%';
}

// --- ATUALIZAÇÃO DOS SLIDERS MATEMÁTICOS ---
function updateMathParams() {
  mathParams.a = parseFloat(document.getElementById('slider-a').value);
  mathParams.b = parseFloat(document.getElementById('slider-b').value);
  mathParams.c = parseFloat(document.getElementById('slider-c').value);
  mathParams.d = parseFloat(document.getElementById('slider-d').value);

  document.getElementById('val-a').textContent = mathParams.a.toFixed(1);
  document.getElementById('val-b').textContent = mathParams.b.toFixed(1);
  document.getElementById('val-c').textContent = mathParams.c.toFixed(1);
  
  let dText = mathParams.d.toFixed(2);
  if (Math.abs(mathParams.d - 3.14) < 0.1) dText += ' (π rad)';
  else if (Math.abs(mathParams.d - 6.28) < 0.1) dText += ' (2π rad)';
  else if (Math.abs(mathParams.d - 1.57) < 0.1) dText += ' (π/2 rad)';
  document.getElementById('val-d').textContent = dText;
}

// Configurações Pré-definidas para o Simulador
function setPreset(type) {
  if (type === 'anc') {
    // Inversão perfeita (ANC)
    document.getElementById('slider-d').value = 3.14;
  } else if (type === 'constructive') {
    // Fase idêntica
    document.getElementById('slider-d').value = 0.0;
  } else if (type === 'cos') {
    // Diferença de noventa graus
    document.getElementById('slider-d').value = 1.57;
  }
  updateMathParams();
}

// --- DESENHO EM TEMPO REAL NO OSCILOSCÓPIO (CANVAS) ---
function drawOscilloscope() {
  requestAnimationFrame(drawOscilloscope);

  const width = canvas.width;
  const height = canvas.height;
  const centerY = height / 2;

  // Limpar tela com fundo escuro de alta precisão
  ctx.fillStyle = '#111418';
  ctx.fillRect(0, 0, width, height);

  // Desenhar Grade do Osciloscópio
  drawGrid(width, height, centerY);

  if (currentMode === 'mic' && isMicActive && analyserMic) {
    // --- DESENHO BASEADO NO MICROFONE REAL ---
    const bufferLength = analyserMic.fftSize;
    const timeData = new Float32Array(bufferLength);
    analyserMic.getFloatTimeDomainData(timeData);

    // Calcular nível RMS de áudio para as barras
    let sumSq = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSq += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sumSq / bufferLength);
    micLevelBar.style.width = Math.min(100, rms * 400) + '%';
    resultLevelBar.style.width = Math.min(100, rms * 15) + '%'; // Residual insignificante (simulando cancelamento)

    // 1. Onda Captada pelo Microfone (Ruído Externo) - Laranja
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgb(232, 127, 36)';
    ctx.beginPath();
    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i];
      const y = centerY + (v * (height / 2.5));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }
    ctx.stroke();

    // 2. Onda Anti-Ruído Processada (Fase Invertida: g(x) = -f(x)) - Roxo
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(162, 144, 183)';
    ctx.beginPath();
    x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = -timeData[i]; // Inversão perfeita calculada pelo DSP
      const y = centerY + (v * (height / 2.5));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }
    ctx.stroke();

    // 3. Som Resultante Pós-Interferência (Soma = 0) - Amarelo Ouro
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgb(255, 200, 30)';
    ctx.beginPath();
    x = 0;

    for (let i = 0; i < bufferLength; i++) {
      // Simulação da soma destrutiva no ouvido
      const vResult = timeData[i] + (-timeData[i]); 
      const y = centerY + (vResult * (height / 2.5));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }
    ctx.stroke();

  } else {
    // --- DESENHO BASEADO NO SIMULADOR MATEMÁTICO TRIGNOMÉTRICO ---
    const time = Date.now() * 0.003; // Animação do tempo
    const scaleY = 50;

    // 1. Onda do Ruído: f(x) = a + b * sin(cx + t)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgb(232, 127, 36)';
    ctx.beginPath();

    for (let px = 0; px < width; px++) {
      const xVal = (px / width) * 4 * Math.PI;
      const yVal = mathParams.a + mathParams.b * Math.sin(mathParams.c * xVal + time);
      const canvasY = centerY - (yVal * scaleY);

      if (px === 0) ctx.moveTo(px, canvasY);
      else ctx.lineTo(px, canvasY);
    }
    ctx.stroke();

    // 2. Onda Anti-Ruído: g(x) = a + b * sin(cx + d + t)
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(162, 144, 183)';
    ctx.beginPath();

    for (let px = 0; px < width; px++) {
      const xVal = (px / width) * 4 * Math.PI;
      const yVal = mathParams.a + mathParams.b * Math.sin(mathParams.c * xVal + mathParams.d + time);
      const canvasY = centerY - (yVal * scaleY);

      if (px === 0) ctx.moveTo(px, canvasY);
      else ctx.lineTo(px, canvasY);
    }
    ctx.stroke();

    // 3. Resultante: f(x) + g(x)
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgb(255, 200, 30)';
    ctx.beginPath();

    for (let px = 0; px < width; px++) {
      const xVal = (px / width) * 4 * Math.PI;
      const fX = mathParams.a + mathParams.b * Math.sin(mathParams.c * xVal + time);
      const gX = mathParams.a + mathParams.b * Math.sin(mathParams.c * xVal + mathParams.d + time);
      const sumY = fX + gX;
      const canvasY = centerY - (sumY * scaleY);

      if (px === 0) ctx.moveTo(px, canvasY);
      else ctx.lineTo(px, canvasY);
    }
    ctx.stroke();
  }
}

// Grade do Osciloscópio
function drawGrid(w, h, centerY) {
  ctx.strokeStyle = '#222933';
  ctx.lineWidth = 1;

  // Linhas Horizontais
  for (let y = 0; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Linhas Verticais
  for (let x = 0; x < w; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Eixo Central
  ctx.strokeStyle = '#445166';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(w, centerY);
  ctx.stroke();
}