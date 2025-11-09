self.onmessage = function(e) {
    const { imageData, width, height } = e.data;
    const inputPixels = imageData.data;
    const outputPixels = new Uint8ClampedArray(inputPixels.length);
    
    // إنشاء نسخة احتياطية من البيانات الأصلية
    const rawPixels = new Uint8ClampedArray(inputPixels);

    // مصفوفة المرشح (Kernel) لزيادة الحدة (أقوى بكثير)
    const sharpenKernel = [
        -1, -1, -1,
        -1, 9, -1,
        -1, -1, -1
    ];
    const kernelSize = 3;
    const kernelRadius = 1;

    // تطبيق التباين أولاً
    const contrast = 1.25; 
    const adjustment = 128 * (1 - contrast);
    for (let i = 0; i < inputPixels.length; i += 4) {
        inputPixels[i] = rawPixels[i] * contrast + adjustment;
        inputPixels[i + 1] = rawPixels[i + 1] * contrast + adjustment;
        inputPixels[i + 2] = rawPixels[i + 2] * contrast + adjustment;
    }
    
    // تطبيق المرشح (Convolution) مع إرسال التقدم
    for (let y = kernelRadius; y < height - kernelRadius; y++) {
        if (y % 50 === 0) {
            self.postMessage({ type: 'progress', percent: Math.round((y / height) * 100) });
        }
        
        for (let x = kernelRadius; x < width - kernelRadius; x++) {
            let r = 0, g = 0, b = 0;

            for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
                for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
                    const weight = sharpenKernel[(ky + kernelRadius) * kernelSize + (kx + kernelRadius)];
                    const idx = ((y + ky) * width + (x + kx)) * 4;

                    r += inputPixels[idx] * weight;
                    g += inputPixels[idx + 1] * weight;
                    b += inputPixels[idx + 2] * weight;
                }
            }
            
            const outputIdx = (y * width + x) * 4;
            outputPixels[outputIdx] = Math.min(255, Math.max(0, r));
            outputPixels[outputIdx + 1] = Math.min(255, Math.max(0, g));
            outputPixels[outputIdx + 2] = Math.min(255, Math.max(0, b));
            outputPixels[outputIdx + 3] = 255; 
        }
    }
    
    // إرسال النتيجة النهائية
    self.postMessage({ type: 'result', data: outputPixels.buffer, width, height }, [outputPixels.buffer]);
};
