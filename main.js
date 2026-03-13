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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 提示文本（左下角）
const infoEl = document.querySelector('.info');

// --- 轨道控制器 (自由调整视角) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = true;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 2;
controls.maxDistance = 80;

// --- 灯光（非必须，但保留以支持可能添加的其他材质）---
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);
const light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(1, 2, 1);
scene.add(light);

<<<<<<< HEAD
// --- 图片墙相关：容器 + 动画列表 ---
=======
// --- 核心：遍历图片并构建环绕墙 ---
// 配置参数
const MAX_INDEX = 24;                // 最大索引，从1开始尝试到24 (可根据实际图片数量调整)
const EXTENSIONS = ['jpg', 'png','jpeg'];    // 尝试的扩展名顺序，优先jpg
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
>>>>>>> f83dbaa70e4135eba7944aedcaad1a783de14d48
const wallGroup = new THREE.Group();
scene.add(wallGroup);

const animatingMeshes = [];  // 用于入场动画的网格列表

// 布局函数：根据当前所有图片重新排列（环绕多环）
function layoutWall() {
    const children = wallGroup.children;
    const total = children.length;
    if (total === 0) return;

    const BASE_WIDTH = 2.2;                // 图片基础宽度
    const RADIUS = 9;                       // 基础环绕半径

    const circumference = 2 * Math.PI * RADIUS;
    const maxPerRing = Math.max(4, Math.floor(circumference / (BASE_WIDTH * 1.2)));
    const rings = Math.ceil(total / maxPerRing);

    children.forEach((mesh, idx) => {
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
}

// 根据图片信息创建网格（不自动添加到场景）
function createImageMesh(info) {
    const { img } = info;
    const BASE_WIDTH = 2.2;
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
    mesh.scale.set(0.001, 0.001, 0.001);       // 初始极小，用于入场动画
    mesh.userData = { url: info.url, index: info.index };
    return mesh;
}

// 加载单张图片，返回 Promise<HTMLImageElement>
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`加载失败: ${url}`));
        img.src = url;
    });
}

// --- 核心：从 PicturesList.txt 读取图片路径，加载所有图片，构建墙体 ---
async function discoverImages() {
    console.log('开始读取图片列表...');
    NProgress.start();

    // 1. 获取图片列表文件
    let listText;
    try {
        const response = await fetch('/PicturesList.txt');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        listText = await response.text();
    } catch (err) {
        console.error('无法读取 PicturesList.txt:', err);
        infoEl.textContent = '错误：未找到图片列表文件';
        NProgress.done();
        return [];
    }

    // 2. 解析每行（过滤空行和注释行）
    const lines = listText.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    if (lines.length === 0) {
        console.warn('图片列表为空');
        infoEl.textContent = '图片列表为空';
        NProgress.done();
        return [];
    }

    // 3. 逐个加载图片（显示进度）
    const loadedImages = [];
    for (let i = 0; i < lines.length; i++) {
        const rawPath = lines[i];
        // 构造完整 URL：如果路径不以 '/' 开头，则添加 'image/' 前缀（可根据实际调整）
        let fullUrl = rawPath;
        if (!rawPath.startsWith('/') && !rawPath.startsWith('http')) {
            // 默认放在 image/ 目录下，用户也可以写完整相对路径如 'sub/1.jpg'
            fullUrl = 'image/' + rawPath;
        }

        try {
            const img = await loadImage(fullUrl);
            console.log(`✅ 加载成功: ${fullUrl} (${img.width}x${img.height})`);
            loadedImages.push({
                index: i,                // 可保留索引用于排序
                url: fullUrl,
                img: img,
                width: img.width,
                height: img.height
            });
        } catch (e) {
            console.warn(`❌ 加载失败: ${fullUrl}`);
        }

        // 更新进度显示
        const pct = Math.round(((i + 1) / lines.length) * 100);
        infoEl.textContent = `加载中：${i + 1}/${lines.length} (${pct}%) - 成功 ${loadedImages.length} 张`;
        NProgress.set((i + 1) / lines.length);
    }

    NProgress.done();
    infoEl.textContent = `双击图片查看原图 | Github:hexo141`;
    console.log(`共成功加载 ${loadedImages.length} 张图片`);

    // 4. 所有图片加载完成后，构建墙体并调整摄像机
    if (loadedImages.length > 0) {
        buildWall(loadedImages);
    } else {
        console.error('没有可显示的图片');
    }

    return loadedImages;
}

// 使用加载好的图片信息构建墙体，并居中摄像机
function buildWall(images) {
    // 为每张图片创建网格并加入墙体
    images.forEach(info => {
        const mesh = createImageMesh(info);
        wallGroup.add(mesh);
        animatingMeshes.push({ mesh, start: performance.now(), duration: 450 });
    });

    // 执行布局
    layoutWall();

    // 计算墙体包围盒，调整摄像机目标
    const box = new THREE.Box3().setFromObject(wallGroup);
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);

    // 保持摄像机相对于原目标(0,0,0)的偏移不变，使摄像机跟随中心移动
    // 原位置 (0,2,18) 相对于 (0,0,0) 的偏移量为 (0,2,18)
    camera.position.copy(center.clone().add(new THREE.Vector3(0, 2, 18)));

    // 可选：调整最近/最远距离以适应新中心
    // controls.minDistance = box.getSize(new THREE.Vector3()).length() * 0.5;
    // controls.maxDistance = box.getSize(new THREE.Vector3()).length() * 3;

    console.log('墙体构建完成，中心点：', center);
}

// 启动加载流程
discoverImages().catch(err => {
    console.error('探测过程出错:', err);
});

// --- 双击/触摸事件：原图预览 ---
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

// 自定义双击判定（减少拖拽误触）
let lastClickTime = 0;
let lastClickX = 0;
let lastClickY = 0;
let pointerDownX = 0;
let pointerDownY = 0;
let pointerDownTime = 0;
const MAX_MOVE_PX = 12;
const MAX_DOUBLE_MS = 360;
const MAX_DOUBLE_DIST_PX = 48;

renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    pointerDownTime = performance.now();
}, { capture: true });

renderer.domElement.addEventListener('pointerup', (event) => {
    const upTime = performance.now();
    const moveDist = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
    const duration = upTime - pointerDownTime;

    if (moveDist > MAX_MOVE_PX || duration > 500) return;

    const sinceLast = upTime - lastClickTime;
    const lastDist = Math.hypot(event.clientX - lastClickX, event.clientY - lastClickY);
    if (sinceLast <= MAX_DOUBLE_MS && lastDist <= MAX_DOUBLE_DIST_PX) {
        openOriginalImageByEvent(event.clientX, event.clientY);
        lastClickTime = 0;
    } else {
        lastClickTime = upTime;
        lastClickX = event.clientX;
        lastClickY = event.clientY;
    }
}, { capture: true });

// --- 动画循环 ---
function animate() {
    requestAnimationFrame(animate);

    controls.update();

    // 星空缓慢旋转
    if (starField) {
        starField.rotation.y += 0.0003;
        starField.rotation.x += 0.00005;
    }

    // 入场动画：缩放从0到1
    const now = performance.now();
    for (let i = animatingMeshes.length - 1; i >= 0; i--) {
        const entry = animatingMeshes[i];
        const t = Math.min(1, (now - entry.start) / entry.duration);
        const scale = 1 - Math.pow(1 - t, 3);  // ease-out cubic
        entry.mesh.scale.set(scale, scale, scale);
        if (t >= 1) {
            animatingMeshes.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}
animate();

// --- 窗口自适应 ---
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

console.log('环绕式图片墙已启动（使用 PicturesList.txt）');