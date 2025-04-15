import { createWorker, PSM } from 'tesseract.js';

export async function preprocessImage(imageFile: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        img.onload = () => {
            // Set canvas dimensions to match image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Convert to grayscale and adjust contrast
            for (let i = 0; i < data.length; i += 4) {
                // Convert to grayscale using luminance formula
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                
                // Adjust contrast (increase by 1.5x)
                const contrast = 1.5;
                const adjusted = ((gray - 128) * contrast) + 128;
                
                // Apply thresholding
                const threshold = 128;
                const final = adjusted > threshold ? 255 : 0;
                
                // Set RGB values
                data[i] = final;     // R
                data[i + 1] = final; // G
                data[i + 2] = final; // B
                // Alpha channel remains unchanged
            }

            // Put the processed image data back
            ctx.putImageData(imageData, 0, 0);

            // Convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            }, 'image/jpeg', 0.9);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        // Create object URL from file
        img.src = URL.createObjectURL(imageFile);
    });
}

export async function extractTextFromImage(imageBlob: Blob): Promise<string> {
    const worker = await createWorker('eng');
    
    try {
        // Set OCR parameters for better text recognition
        await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;()/-',
            tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Assume uniform block of text
            tessedit_ocr_engine_mode: '3' // Legacy + LSTM mode
        });

        const { data: { text } } = await worker.recognize(imageBlob);
        return text;
    } finally {
        await worker.terminate();
    }
} 