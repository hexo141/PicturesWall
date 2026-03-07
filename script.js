// 配置
const CONFIG = {
    imageDir: './image/',
    supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
    maxImages: 1000, // 最大尝试查找的图片数量
    cardsPerView: 7 // 每次显示的卡片数
};

// 状态
let allImages = [];
let currentIndex = 0;

// DOM 元素
const cardsContainer = document.getElementById('cardsContainer');
const imageViewer = document.getElementById('imageViewer');
const viewerImage = document.getElementById('viewerImage');
const closeViewer = document.getElementById('closeViewer');
const searchBtn = document.getElementById('searchBtn');
const searchBox = document.getElementById('searchBox');
const searchInput = document.getElementById('searchInput');
const searchSubmit = document.getElementById('searchSubmit');
const toast = document.getElementById('toast');
const loading = document.getElementById('loading');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// 显示提示
function showToast(message, duration = 2000) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// 检查图片是否存在
async function checkImageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

// 扫描图片目录 - 使用多线程
async function scanImages() {
    loading.style.display = 'block';
    allImages = [];

    const numWorkers = 4; // 使用4个Worker
    const rangeSize = Math.ceil(CONFIG.maxImages / numWorkers);
    const workers = [];
    let completedWorkers = 0;

    for (let w = 0; w < numWorkers; w++) {
        const start = w * rangeSize + 1;
        const end = Math.min((w + 1) * rangeSize, CONFIG.maxImages);

        const worker = new Worker('worker.js');
        workers.push(worker);

        worker.postMessage({
            start: start,
            end: end,
            imageDir: CONFIG.imageDir,
            supportedFormats: CONFIG.supportedFormats
        });

        worker.onmessage = function(e) {
            if (e.data.type === 'found') {
                // 找到图片，添加到列表并立即渲染
                allImages.push(e.data.imageData);
                renderCards(); // 立即更新显示
            } else if (e.data.type === 'done') {
                completedWorkers++;
                if (completedWorkers === numWorkers) {
                    // 所有Worker完成
                    loading.style.display = 'none';
                    if (allImages.length === 0) {
                        showToast('未找到图片，请确保 image/ 目录下有图片文件');
                    } else {
                        showToast(`扫描完成，共找到 ${allImages.length} 张图片`);
                    }
                }
            }
        };

        worker.onerror = function(error) {
            console.error('Worker error:', error);
        };
    }
}

// 创建卡片
function createCard(imageData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = imageData.id;
    card.dataset.url = imageData.url;

    const img = document.createElement('img');
    img.src = imageData.url;
    img.alt = `图片 ${imageData.id}`;
    img.loading = 'lazy';

    const number = document.createElement('div');
    number.className = 'card-number';
    number.textContent = imageData.id;

    card.appendChild(img);
    card.appendChild(number);

    // 悬停放大（CSS 已处理）

    // 双击查看原图
    card.addEventListener('dblclick', () => {
        openImageViewer(imageData.url);
    });

    // 单击也可以添加提示
    card.addEventListener('click', () => {
        // 可以添加单击效果
    });

    return card;
}

// 渲染卡片
function renderCards() {
    cardsContainer.innerHTML = '';
    
    // 随机打乱图片顺序
    const shuffled = [...allImages].sort(() => Math.random() - 0.5);
    
    // 取前 N 张显示
    const displayImages = shuffled.slice(0, CONFIG.cardsPerView);
    
    displayImages.forEach(imageData => {
        const card = createCard(imageData);
        cardsContainer.appendChild(card);
    });
}

// 打开原图查看器
function openImageViewer(url) {
    viewerImage.src = url;
    imageViewer.classList.add('active');
}

// 关闭原图查看器
function closeImageViewer() {
    imageViewer.classList.remove('active');
    setTimeout(() => {
        viewerImage.src = '';
    }, 300);
}

// 搜索图片
async function searchImage(number) {
    const num = parseInt(number);
    if (isNaN(num) || num <= 0) {
        showToast('请输入有效的数字编号');
        return;
    }

    loading.style.display = 'block';

    for (const format of CONFIG.supportedFormats) {
        const filename = `${num}.${format}`;
        const url = CONFIG.imageDir + filename;
        
        if (await checkImageExists(url)) {
            loading.style.display = 'none';
            openImageViewer(url);
            showToast(`找到图片：${filename}`);
            return;
        }
    }

    loading.style.display = 'none';
    showToast(`未找到编号为 ${num} 的图片`);
}

// 滑动卡片容器
function scrollCards(direction) {
    const scrollAmount = 300;
    cardsContainer.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

// 事件监听
closeViewer.addEventListener('click', closeImageViewer);
imageViewer.addEventListener('click', (e) => {
    if (e.target === imageViewer) {
        closeImageViewer();
    }
});

searchBtn.addEventListener('click', () => {
    searchBox.classList.toggle('active');
    if (searchBox.classList.contains('active')) {
        searchInput.focus();
    }
});

searchSubmit.addEventListener('click', () => {
    const value = searchInput.value.trim();
    if (value) {
        searchImage(value);
        searchBox.classList.remove('active');
        searchInput.value = '';
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchSubmit.click();
    }
});

// 点击搜索框外部关闭
document.addEventListener('click', (e) => {
    if (!searchBox.contains(e.target) && !searchBtn.contains(e.target)) {
        searchBox.classList.remove('active');
    }
});

// 导航按钮
prevBtn.addEventListener('click', () => scrollCards(-1));
nextBtn.addEventListener('click', () => scrollCards(1));

// 键盘导航
document.addEventListener('keydown', (e) => {
    if (imageViewer.classList.contains('active')) {
        if (e.key === 'Escape') {
            closeImageViewer();
        }
        return;
    }

    switch(e.key) {
        case 'ArrowLeft':
            scrollCards(-1);
            break;
        case 'ArrowRight':
            scrollCards(1);
            break;
        case 'Escape':
            searchBox.classList.remove('active');
            break;
    }
});

// 触摸滑动支持
let touchStartX = 0;
let touchEndX = 0;

cardsContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

cardsContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) {
        scrollCards(diff > 0 ? 1 : -1);
    }
});

// 初始化
async function init() {
    scanImages(); // 启动多线程扫描
}

// 启动
init();