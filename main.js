
    const video = document.getElementById('video');
    const radar = document.getElementById('radar');
    const ctx = radar.getContext('2d');
    const statusDiv = document.getElementById('status');
    const detectedListDiv = document.getElementById('detected-list');
    const overlay = document.getElementById('overlay');
    const overlayCtx = overlay.getContext('2d');
    

    const width = radar.width;
    const height = radar.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radarRadius = 185;

    let model;
    let detections = [];
    let blips = [];
    let sweepAngle = 0;
    let voiceEnabled = true;
    let detectionEnabled = true;
    let filterClass = null;

    const BLIP_LIFESPAN = 120; // frames (~2 seconds at 30fps)
    const SWEEP_SPEED = 0.05; // radians per frame (faster sweep)

    // Setup camera (hidden)
    async function setupCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      video.srcObject = stream;
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });
    };
    
    //Voice
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}
    
  function toggleDetection() {
    detectionEnabled = !detectionEnabled;
    speak(detectionEnabled ? 'Detection started' : 'Detection paused');
    document.querySelector('#controls button:nth-child(1)').textContent =
      detectionEnabled ? 'Pause Detection' : 'Start Detection';
  }
  
  function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    speak(voiceEnabled ? 'Voice enabled' : 'Voice muted');
    document.querySelector('#controls button:nth-child(2)').textContent =
      voiceEnabled ? 'Mute' : 'Unmute';
  }
  
  function filterPeople() {
    filterClass = 'person';
    speak('Filtering for people only');
  }
  
  function clearFilter() {
    filterClass = null;
    speak('Showing all detected objects');
  }
  
  
    // Map detection bbox center to radar coordinates
    function bboxCenterToRadar(x, y, w, h) {
      const cx = x + w / 2;
      const cy = y + h / 2;

      // Normalize relative to video size (center 0,0)
      const normX = (cx / video.videoWidth) * 2 - 1;  // -1 to 1
      const normY = (cy / video.videoHeight) * 2 - 1; // -1 to 1

      // Clamp distance within unit circle
      const dist = Math.min(Math.sqrt(normX * normX + normY * normY), 1);

      // Scale to radar radius
      return {
        x: normX * radarRadius,
        y: normY * radarRadius,
        dist,
      };
    }
    

    function updateBlips() {
      detections.forEach(det => {
        if (det.score < 0.5) return;
    
    const { x, y, width, height } = {
      x: det.bbox[0],
      y: det.bbox[1],
      width: det.bbox[2],
      height: det.bbox[3]
    };
    const radarPos = bboxCenterToRadar(x, y, width, height);
    
    // Find existing close blip
    const existing = blips.find(b => Math.hypot(b.x - radarPos.x, b.y - radarPos.y) < 10);
    
    if (existing) {
      existing.hit = false; // reactivate if detected again
    } else {
      blips.push({
        x: radarPos.x,
        y: radarPos.y,
        angle: Math.atan2(radarPos.y, radarPos.x),
        hit: false
      });
    }
  });
}
    

    // Draw radar background + sweep
    function drawRadar() {
      ctx.clearRect(0, 0, width, height);

      // Radar background gradient
      const bg = ctx.createRadialGradient(centerX, centerY, radarRadius * 0.6, centerX, centerY, radarRadius);
      bg.addColorStop(0, '#004400aa');
      bg.addColorStop(1, '#001100ff');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
      ctx.fill();

      // Glow border
      ctx.strokeStyle = '#00ff00cc';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ff00cc';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Range rings
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#00ff0055';
      for (let r = radarRadius / 5; r < radarRadius; r += radarRadius / 5) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cross lines
      ctx.beginPath();
      ctx.moveTo(centerX - radarRadius, centerY);
      ctx.lineTo(centerX + radarRadius, centerY);
      ctx.moveTo(centerX, centerY - radarRadius);
      ctx.lineTo(centerX, centerY + radarRadius);
      ctx.stroke();

      // Rotating sweep
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(sweepAngle);
      const sweepGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
      sweepGradient.addColorStop(0, 'rgba(0,255,0,0.5)');
      sweepGradient.addColorStop(1, 'rgba(0,255,0,0)');
      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radarRadius, -0.04, 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw red blips with fade
    function drawBlips() {
  const sweepRange = 0.08; // Adjust for detection thickness

  blips.forEach((blip) => {
    const angle = Math.atan2(blip.y, blip.x); // [-PI, PI]
    const normalizedBlipAngle = (angle + 2 * Math.PI) % (2 * Math.PI);
    const normalizedSweep = (sweepAngle + 2 * Math.PI) % (2 * Math.PI);

    // Check if sweep is passing over the blip (within tolerance)
    const angleDiff = Math.abs(normalizedSweep - normalizedBlipAngle);
    const near = angleDiff < sweepRange || (2 * Math.PI - angleDiff) < sweepRange;

    if (near) blip.hit = true;

    if (!blip.hit) {
      ctx.shadowColor = `rgba(255, 0, 0, 1)`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(255, 0, 0, 1)`;
      ctx.beginPath();
      ctx.arc(centerX + blip.x, centerY + blip.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 100, 100, 1)`;
      ctx.beginPath();
      ctx.arc(centerX + blip.x, centerY + blip.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Remove blips the sweep has passed
  blips = blips.filter(b => !b.hit);
}


function drawDetections() {
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  detections.forEach(pred => {
    if (pred.score > 0.5) {
      const [x, y, width, height] = pred.bbox;

      // Scale from video size to canvas size
      const scaleX = overlay.width / video.videoWidth;
      const scaleY = overlay.height / video.videoHeight;

      overlayCtx.strokeStyle = 'lime';
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

      overlayCtx.fillStyle = 'lime';
      overlayCtx.font = '12px monospace';
      overlayCtx.fillText(
        `${pred.class} ${(pred.score * 100).toFixed(1)}%`,
        x * scaleX,
        (y * scaleY) > 12 ? (y * scaleY - 2) : (y * scaleY + 14)
      );
    }
  });
};

    // Separate animation loop for sweep and drawing
    function animationLoop() {
      sweepAngle += SWEEP_SPEED;
      if (sweepAngle > Math.PI * 2) sweepAngle -= Math.PI * 2;

      drawRadar();
      drawBlips();
      drawDetections();

      requestAnimationFrame(animationLoop);
    }


function startDetectionLoop() {
  setInterval(async () => {
    if (!model || !detectionEnabled) return;

    const rawDetections = await model.detect(video);
    
    // Apply filter (only 'person' if set)
    detections = filterClass
      ? rawDetections.filter(d => d.class === filterClass && d.score > 0.5)
      : rawDetections.filter(d => d.score > 0.5);
      
      drawDetections();

    // Update UI list
    const objectTextList = detections
      .map((d, i) => `${i + 1}. ${d.class} (${(d.score * 100).toFixed(1)}%)`)
      .join('\n');
    statusDiv.textContent = `Detected: ${detections.length} objects`;
    detectedListDiv.textContent = objectTextList;

    // Speech output
    if (voiceEnabled) {
      const classCounts = {};
      detections.forEach(det => {
        classCounts[det.class] = (classCounts[det.class] || 0) + 1;
      });

      for (const objClass in classCounts) {
        const count = classCounts[objClass];
        const label = count > 1 ? `${count} ${objClass}s` : `${count} ${objClass}`;
        speak(`${label} detected`);
      }
    }

    // Pass only filtered detections to blip system
    updateBlips();
  }, 2500);
};


    async function main() {
      await setupCamera();

      statusDiv.textContent = "Loading model...";
      model = await cocoSsd.load();
      statusDiv.textContent = "Model loaded, starting detection...";

      animationLoop();
      startDetectionLoop();
      updateBlips();
  
  
    }

    main();