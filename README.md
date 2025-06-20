# 📡 Radar + Object Detection with TensorFlow.js

This project combines a radar-style canvas visualization with real-time object detection using TensorFlow.js and the COCO-SSD model. It works directly in the browser using the device camera.

## 🔍 Features

- 🎯 Real-time object detection using **COCO-SSD**
- 🧠 Option to **filter for people only**
- 🗣️ Voice output using **Speech Synthesis API**
- 🎛️ Control panel to pause detection, mute/unmute voice, and toggle filters
- 📡 Radar canvas that simulates motion detection with red blips
- 📷 Hidden camera feed for a clean UI
- ✅ Fully offline support possible with local model files

## 📦 Installation

### Option 1: Run Online

Just open `index.html` in your browser with internet access (uses CDN for models).

### Option 2: Offline Setup

1. Download the `COCO-SSD` model and save it in a `models/coco-ssd/` folder:
   - [`model.json`](https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v1/model.json)
   - Binary weight `.bin` file (linked from above `.json`)

2. Place both `tf.min.js` and `coco-ssd.min.js` in your project folder.

3. Update the script tags in `index.html`:
   ```html
   <script src="tf.min.js"></script>
   <script src="coco-ssd.min.js"></script>
   
4. Update `main.js` to load the model locally.
```model = await cocoSsd.load({ modelUrl: 'models/coco-ssd/model.json'});```

## project structure for offline project
``
├── index.html
├── main.js
├── style.css
├── tf.min.js                # (optional - offline only)
├── coco-ssd.min.js          # (optional - offline only)
└── models/
    └── coco-ssd/
        ├── model.json
        └── group1-shard1of1.bin
