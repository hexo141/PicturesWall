import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 初始化场景、相机、渲染器 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122); // 深色背景，突出图片

// 背景星空（点状星星，用于增加深度感，不影响图片展示）
function addStarField(count = 400) {
    const group = new THREE.Group();
    const radius = 50;

    // 基础星星（较多、较暗）
    const baseGeom = new THREE.BufferGeometry();
    const basePositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = radius * (0.4 + 0.6 * Math.random());
        basePositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        basePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        basePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    baseGeom.setAttribute('position', new THREE.BufferAttribute(basePositions, 3));

    const baseMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
    });
    const baseStars = new THREE.Points(baseGeom, baseMat);
    group.add(baseStars);

    // 亮星（少量、更大、更亮）
    const brightCount = Math.max(20, Math.floor(count * 0.08));
    const brightGeom = new THREE.BufferGeometry();
    const brightPositions = new Float32Array(brightCount * 3);
    for (let i = 0; i < brightCount; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = radius * (0.4 + 0.6 * Math.random());
        brightPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        brightPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        brightPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    brightGeom.setAttribute('position', new THREE.BufferAttribute(brightPositions, 3));

    const brightMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.24,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
    });
    const brightStars = new THREE.Points(brightGeom, brightMat);
    group.add(brightStars);

    // 随机初始旋转，避免每次都同一个视角
    group.rotation.y = Math.random() * Math.PI * 2;

    scene.add(group);
    return group;
}

const starField = addStarField(600);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 18); // 初始视角略微俯视
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制过高pixel ratio以防性能问题
document.body.appendChild(renderer.domElement);

// 提示文本（左下角）
const infoEl = document.querySelector('.info');

// --- 轨道控制器 (自由调整视角) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;      // 启用惯性
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = true;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI / 2; // 限制垂直角度，避免钻到地下
// 调整最大放大（靠近）距离，数值越小可放得越近
controls.minDistance = 2;
// 调整最大缩小（拉远）距离，数值越大画面越远
controls.maxDistance = 80;

// --- 添加一些环境光或点光源不是必须的 (因为使用基础材质)，但为了其他材质可扩展，加一点柔和的环境光，不影响图片本身亮度
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);
// 加一点背光，使图片边缘有微弱立体感 (可选)
const light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(1, 2, 1);
scene.add(light);

// --- 核心：遍历图片并构建环绕墙 ---
// 配置参数
const MAX_INDEX = 24;                // 最大索引，从1开始尝试到24 (可根据实际图片数量调整)
const EXTENSIONS = ['jpg', 'png'];    // 尝试的扩展名顺序，优先jpg
const RADIUS = 9;                     // 环绕半径
const BASE_WIDTH = 2.2;                // 每张图片的基础宽度（将根据宽高比调整高度）

// 图片容器：存放加载成功的信息
let imagesInfo = [];

// 工具函数：加载单张图片返回Promise
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`加载失败: ${url}`));
        img.src = url;
        // 跨域属性（如果图片在同域，不需要；如果不同域，根据需要设置，这里假设同域）
        // img.crossOrigin = 'Anonymous'; // 如果图片在别的域且需要CORS，可以取消注释
    });
}

// 异步探测所有图片：遍历索引，尝试扩展名，返回成功图片的信息数组（按索引排序）
async function discoverImages() {
    console.log('开始探测图片...');
    NProgress.start();

    const results = [];
    let consecutiveMisses = 0;

    for (let i = 1; i <= MAX_INDEX; i++) {
        // 如果连续 15 个索引都没有图片，则认为后续也没有，提前停止扫描
        if (consecutiveMisses >= 15) {
            console.log('连续 15 个索引均未找到图片，提前停止扫描。');
            break;
        }

        const urlBase = `image/${i}`;
        let found = null;

        for (const ext of EXTENSIONS) {
            const url = `${urlBase}.${ext}`;
            try {
                const img = await loadImage(url);
                console.log(`✅ 找到图片: ${url} (${img.width}x${img.height})`);
                found = { index: i, url, img, width: img.width, height: img.height };
                break;
            } catch (e) {
                // 尝试下一个扩展名
            }
        }

        if (found) {
            consecutiveMisses = 0;
            results.push(found);
            addImageToWall(found);
        } else {
            consecutiveMisses += 1;
            console.warn(`❌ 索引 ${i} 无有效图片 (jpg/png 均尝试失败)`);
        }

        // 更新界面中的扫描状态
        if (infoEl) {
            const pct = Math.round((i / MAX_INDEX) * 100);
            infoEl.textContent = `扫描中：${i}/${MAX_INDEX} (${pct}%) - 已加载 ${results.length} 张图片`;
        }

        // 更新进度条（即便提前结束，也能显示已扫描进度）
        NProgress.set(i / MAX_INDEX);
    }

    NProgress.done();

    if (infoEl) {
        infoEl.textContent = `双击图片查看原图 | Github:hexo141`;
    }

    console.log(`共探测到 ${results.length} 张图片`, results.map(v => v.url));
    return results;
}

// --- 图片墙相关：增量添加 + 入场动画 ---
const wallGroup = new THREE.Group();
scene.add(wallGroup);

const animatingMeshes = [];

function layoutWall() {
    const total = wallGroup.children.length;
    if (total === 0) return;

    const circumference = 2 * Math.PI * RADIUS;
    const maxPerRing = Math.max(4, Math.floor(circumference / (BASE_WIDTH * 1.2)));
    const rings = Math.ceil(total / maxPerRing);

    wallGroup.children.forEach((mesh, idx) => {
        const ringIndex = Math.floor(idx / maxPerRing);
        const indexInRing = idx % maxPerRing;
        const ringCount = Math.min(maxPerRing, total - ringIndex * maxPerRing);

        const ringRadius = RADIUS + ringIndex * (BASE_WIDTH * 1.3);
        const ringHeight = (ringIndex - (rings - 1) / 2) * (BASE_WIDTH * 1.3);

        const angle = (indexInRing / ringCount) * Math.PI * 2;
        const x = ringRadius * Math.sin(angle);
        const z = ringRadius * Math.cos(angle);

        mesh.position.set(x, ringHeight, z);
        mesh.lookAt(0, ringHeight, 0);
    });

    console.log('图片墙已布局，共', total, '张图片，分成', rings, '个环');
}

function addImageToWall(info) {
    const { url, img } = info;
    const aspect = img.width / img.height;
    const planeWidth = BASE_WIDTH;
    const planeHeight = BASE_WIDTH / aspect;

    const texture = new THREE.CanvasTexture(img);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
    });

    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(0.001, 0.001, 0.001);
    mesh.userData = { url, index: info.index };

    wallGroup.add(mesh);
    layoutWall();

    animatingMeshes.push({ mesh, start: performance.now(), duration: 450 });
}

// --- 启动探测并构建 ---
discoverImages().then(images => {
    if (images.length === 0) {
        console.error('未找到任何图片，请确认 image/ 目录下存在命名如 1.jpg, 2.png 的文件');
    }
}).catch(err => {
    console.error('探测过程出错:', err);
});

// --- 双击/双击触摸事件：原图预览 ---
// 将逻辑抽成函数，以便支持鼠标双击和触屏双击（双击/双击弹出）
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function openOriginalImageByEvent(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const objects = [];
    scene.traverse(obj => {
        if (obj.isMesh && obj.userData && obj.userData.url) {
            objects.push(obj);
        }
    });

    const intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const url = hitMesh.userData.url;
        if (url) {
            window.open(url, '_blank');
        }
    }
}

// 通过自定义双击判定来减少误触（非目标区域/拖拽导致的误触）
// 支持鼠标和触摸（pointer events），并要求两次点击位置与时间都足够接近
let lastClickTime = 0;
let lastClickX = 0;
let lastClickY = 0;
let pointerDownX = 0;
let pointerDownY = 0;
let pointerDownTime = 0;
const MAX_MOVE_PX = 12;      // 允许的最大移动距离（避免拖拽误触）
const MAX_DOUBLE_MS = 360;   // 双击最大间隔
const MAX_DOUBLE_DIST_PX = 48; // 双击时两次点击间距

renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    pointerDownTime = performance.now();
}, { capture: true });

renderer.domElement.addEventListener('pointerup', (event) => {
    const upTime = performance.now();
    const moveDist = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
    const duration = upTime - pointerDownTime;

    // 仅在点击（非拖拽）且按下时间合理时，才视为一次有效点击
    if (moveDist > MAX_MOVE_PX || duration > 500) {
        return;
    }

    // 双击判定：两次有效点击之间的时间和位置必须接近
    const sinceLast = upTime - lastClickTime;
    const lastDist = Math.hypot(event.clientX - lastClickX, event.clientY - lastClickY);
    if (sinceLast <= MAX_DOUBLE_MS && lastDist <= MAX_DOUBLE_DIST_PX) {
        openOriginalImageByEvent(event.clientX, event.clientY);
        lastClickTime = 0; // 重置，避免三连击触发
    } else {
        lastClickTime = upTime;
        lastClickX = event.clientX;
        lastClickY = event.clientY;
    }
}, { capture: true });

// --- 动画循环 ---
function animate() {
    requestAnimationFrame(animate);

    // 更新控制器 (如果启用阻尼或自动旋转)
    controls.update();

    // 让背景星空缓慢旋转，增加深度感
    if (starField) {
        starField.rotation.y += 0.0003;
        starField.rotation.x += 0.00005;
    }

    // 处理入场动画：刚添加的图片从0~1放大
    const now = performance.now();
    for (let i = animatingMeshes.length - 1; i >= 0; i--) {
        const entry = animatingMeshes[i];
        const t = Math.min(1, (now - entry.start) / entry.duration);
        // ease-out cubic
        const scale = 1 - Math.pow(1 - t, 3);
        entry.mesh.scale.set(scale, scale, scale);
        if (t >= 1) {
            animatingMeshes.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}
animate();

// --- 窗口大小自适应 ---
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 可选：加一个很淡的雾，增加深度感，但不影响图片显示 (不加)
// scene.fog = new THREE.Fog(0x111122, 10, 30);

// 控制台提示
console.log('环绕式图片墙已启动，双击任意图片在新标签页预览原图');
