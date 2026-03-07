// worker.js - 用于多线程扫描图片
self.onmessage = async function(e) {
    const { start, end, imageDir, supportedFormats } = e.data;

    for (let i = start; i <= end; i++) {
        for (const format of supportedFormats) {
            const filename = `${i}.${format}`;
            const url = imageDir + filename;

            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    // 找到图片，发送给主线程
                    self.postMessage({
                        type: 'found',
                        imageData: {
                            id: i,
                            filename: filename,
                            url: url
                        }
                    });
                    break; // 找到后跳过其他格式
                }
            } catch (error) {
                // 忽略错误，继续
            }
        }

        // 检查是否需要停止
        if (self.terminated) break;
    }

    // 扫描完成
    self.postMessage({ type: 'done' });
};