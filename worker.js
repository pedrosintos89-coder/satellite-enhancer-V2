// دمج الألوان وحساب متوسط الألوان لـ *جميع* الصور الأرضية
function getAverageColorFromBuffers(groundBuffers) {
    let r = 0, g = 0, b = 0;
    let totalPixelCount = 0;

    for (const buffer of groundBuffers) {
        const pixels = new Uint8ClampedArray(buffer);
        
        for (let i = 0; i < pixels.length; i += 4) {
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
        }
        totalPixelCount += pixels.length / 4;
    }

    if (totalPixelCount === 0) return { r: 0, g: 0, b: 0 };
    
    return {
        r: Math.round(r / totalPixelCount),
        g: Math.round(g / totalPixelCount),
        b: Math.round(b / totalPixelCount)
    };
}

self.onmessage = function(e) {
    const { satImageData, groundBuffers, width, height } = e.data;
    const satPixels = satImageData.data;
    const outputPixels = new Uint8ClampedArray(satPixels.length);
    
    // 1. حساب متوسط ألوان جميع الصور الأرضية (المصدر الحقيقي المرجعي)
    const avgGroundColor = getAverageColorFromBuffers(groundBuffers);

    // 2. تطبيق مرشح الحدة (Kernel أقل قوة)
    // هذا الكيرنل أقل عدوانية ويقلل الضوضاء
    const sharpenKernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    const kernelSize = 3;
    const kernelRadius = 1;

    // 3. تطبيق المعالجة (Convolution)
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

                    r += satPixels[idx] * weight;
                    g += satPixels[idx + 1] * weight;
                    b += satPixels[idx + 2] * weight;
                }
            }
            
            const outputIdx = (y * width + x) * 4;

            // 4. دمج الألوان (تصحيح الألوان باستخدام المتوسط الموزون)
            // تخفيض قوة دمج الألوان إلى 0.2 للحفاظ على الألوان الأصلية
            const colorBlendFactor = 0.2; 
            
            outputPixels[outputIdx] = Math.min(255, Math.max(0, 
                r * (1 - colorBlendFactor) + avgGroundColor.r * colorBlendFactor
            ));
            outputPixels[outputIdx + 1] = Math.min(255, Math.max(0, 
                g * (1 - colorBlendFactor) + avgGroundColor.g * colorBlendFactor
            ));
            outputPixels[outputIdx + 2] = Math.min(255, Math.max(0, 
                b * (1 - colorBlendFactor) + avgGroundColor.b * colorBlendFactor
            ));
            outputPixels[outputIdx + 3] = 255; 
        }
    }
    
    // إرسال النتيجة النهائية
    self.postMessage({ type: 'result', data: outputPixels.buffer, width, height }, [outputPixels.buffer]);
};
