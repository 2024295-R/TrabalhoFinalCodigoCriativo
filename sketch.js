const QUERY = "running person";
const ROWS = 10;
const RATIO = 8 / 9;
const CONF = 0.5;

const BONES = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

let imgs = [];
let poses = [];
let cols = 0;
let cellW = 0;
let cellH = 0;
let loaded = false;
let detected = 0;
let queue = Promise.resolve();

async function setup() {
  createCanvas(windowWidth, windowHeight);
  noLoop();
  computeGrid();

  const needed = ROWS * cols;
  const modelP = loadPoseModel();

  const addImage = (img) => {
    if (imgs.length >= needed) return;
    const i = imgs.length;
    imgs.push(img);
    poses.push([]);
    redraw();
    queue = queue.then(async () => {
      poses[i] = await detectPoses(await modelP, img);
      detected++;
      redraw();
    });
  };
  const pages = Array.from(
    { length: min(7, ceil(needed / 20) + 1) },
    (_, n) => n + 1
  );
  await Promise.all(pages.map((page) => loadPage(QUERY, page, addImage)));
  loaded = true;
  redraw();
}

function loadPoseModel() {
  return new Promise((resolve) => {
    const m = ml5.bodyPose(
      "MoveNet",
      {
        modelType: "MULTIPOSE_LIGHTNING",
        enableSmoothing: false,
        minPoseScore: 0.2,
      },
      () => resolve(m)
    );
  });
}

function detectPoses(model, img) {
  return new Promise((resolve) => model.detect(img, resolve));
}

function computeGrid() {
  cellH = windowHeight / ROWS;
  cols = max(1, round(windowWidth / (cellH * RATIO)));
  cellW = windowWidth / cols;
}

async function loadPage(query, page, onImage) {
  const url =
    "https://api.openverse.org/v1/images/?q=" +
    encodeURIComponent(query) +
    "&aspect_ratio=tall&page_size=20&page=" +
    page;
  let results = [];
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    results = (await res.json()).results;
  } catch (e) {
    console.error(e);
    return;
  }
  await Promise.allSettled(
    results.map((r) => loadImage(r.thumbnail || r.url).then(onImage))
  );
}

function draw() {
  background(0, 56, 10);
  const total = ROWS * cols;
  if (imgs.length === 0) {
    fill(255, 192, 0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(20);
    text("loading...", width / 2, height / 2);
    return;
  }
  for (let i = 0; i < total; i++) {
    if (!loaded && i >= imgs.length) break;
    const k = i % imgs.length;
    const img = imgs[k];
    const x = floor(i / ROWS) * cellW;
    const y = (i % ROWS) * cellH;
    for (const person of poses[k])
      drawStickman(person, img, x, y, cellW, cellH);
  }
  if (detected < imgs.length || !loaded) {
    noStroke();
    fill(255, 192, 0);
    textAlign(LEFT, BOTTOM);
    textSize(12);
    text(
      `photos ${imgs.length}/${total} · analysed ${detected}`,
      8,
      height - 6
    );
  }
}

function toCell(kp, img, x, y, w, h) {
  const s = max(w / img.width, h / img.height);
  const sx = (img.width - w / s) / 2;
  const sy = (img.height - h / s) / 2;
  return createVector(x + (kp.x - sx) * s, y + (kp.y - sy) * s);
}

function drawStickman(person, img, x, y, w, h) {
  const pts = {};
  for (const kp of person.keypoints) {
    if (kp.confidence >= CONF) pts[kp.name] = toCell(kp, img, x, y, w, h);
  }
  stroke(255);
  strokeWeight(max(2, w * 0.02));
  strokeCap(ROUND);
  noFill();
  for (const [a, b] of BONES) {
    if (pts[a] && pts[b]) line(pts[a].x, pts[a].y, pts[b].x, pts[b].y);
  }
  const ls = pts.left_shoulder,
    rs = pts.right_shoulder;
  const lh = pts.left_hip,
    rh = pts.right_hip;
  let neck = null;
  if (ls && rs) neck = p5.Vector.lerp(ls, rs, 0.5);
  if (neck && lh && rh) {
    const pelvis = p5.Vector.lerp(lh, rh, 0.5);
    line(neck.x, neck.y, pelvis.x, pelvis.y);
  }
  const nose = pts.nose;
  const eyes =
    pts.left_eye && pts.right_eye
      ? p5.Vector.lerp(pts.left_eye, pts.right_eye, 0.5)
      : null;
  const center = nose || eyes;
  if (center) {
    let r;
    if (pts.left_ear && pts.right_ear)
      r = pts.left_ear.dist(pts.right_ear) * 0.6;
    else if (pts.left_eye && pts.right_eye)
      r = pts.left_eye.dist(pts.right_eye) * 1.5;
    else if (ls && rs) r = ls.dist(rs) * 0.3;
    else r = w * 0.05;
    circle(center.x, center.y, r * 2);
    if (neck) line(center.x, center.y + r, neck.x, neck.y);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeGrid();
  redraw();
}