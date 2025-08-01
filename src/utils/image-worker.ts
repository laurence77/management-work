/**
 * Web Worker for Image Processing
 */

// Types for worker communication
interface ImageProcessingMessage {
  id: string;
  type: 'optimize' | 'resize' | 'compress';
  data: {
    imageData: ImageData;
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: string;
    };
  };
}

interface ImageProcessingResult {
  id: string;
  success: boolean;
  data?: {
    imageData: ImageData;
    width: number;
    height: number;
    originalSize: number;
    compressedSize: number;
  };
  error?: string;
}

// Worker context
declare const self: DedicatedWorkerGlobalScope;

class ImageWorker {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  constructor() {
    this.canvas = new OffscreenCanvas(1, 1);
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Process image optimization request
   */
  async processImage(message: ImageProcessingMessage): Promise<ImageProcessingResult> {
    try {
      const { id, type, data } = message;
      const { imageData, options } = data;

      switch (type) {
        case 'optimize':
          return await this.optimizeImage(id, imageData, options);
        case 'resize':
          return await this.resizeImage(id, imageData, options);
        case 'compress':
          return await this.compressImage(id, imageData, options);
        default:
          throw new Error(`Unknown processing type: ${type}`);
      }
    } catch (error) {
      return {
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Optimize image with multiple techniques
   */
  private async optimizeImage(
    id: string,
    imageData: ImageData,
    options: any
  ): Promise<ImageProcessingResult> {
    const { width: originalWidth, height: originalHeight } = imageData;
    const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;

    // Calculate new dimensions
    const { width, height } = this.calculateDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    );

    // Resize canvas
    this.canvas.width = width;
    this.canvas.height = height;

    // Create temporary canvas for source image
    const sourceCanvas = new OffscreenCanvas(originalWidth, originalHeight);
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.putImageData(imageData, 0, 0);

    // High-quality resize
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight, 0, 0, width, height);

    // Apply optimizations
    const optimizedImageData = this.ctx.getImageData(0, 0, width, height);
    
    // Apply noise reduction if image is significantly downsized
    const downsizeRatio = (originalWidth * originalHeight) / (width * height);
    if (downsizeRatio > 4) {
      this.applyNoiseReduction(optimizedImageData);
    }

    // Apply sharpening for small images
    if (width < 400 || height < 400) {
      this.applySharpen(optimizedImageData);
    }

    return {
      id,
      success: true,
      data: {
        imageData: optimizedImageData,
        width,
        height,
        originalSize: originalWidth * originalHeight * 4,
        compressedSize: width * height * 4
      }
    };
  }

  /**
   * Resize image maintaining aspect ratio
   */
  private async resizeImage(
    id: string,
    imageData: ImageData,
    options: any
  ): Promise<ImageProcessingResult> {
    const { width: originalWidth, height: originalHeight } = imageData;
    const { maxWidth, maxHeight } = options;

    const { width, height } = this.calculateDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    );

    this.canvas.width = width;
    this.canvas.height = height;

    const sourceCanvas = new OffscreenCanvas(originalWidth, originalHeight);
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.putImageData(imageData, 0, 0);

    // Use bicubic interpolation for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(sourceCanvas, 0, 0, width, height);

    const resizedImageData = this.ctx.getImageData(0, 0, width, height);

    return {
      id,
      success: true,
      data: {
        imageData: resizedImageData,
        width,
        height,
        originalSize: originalWidth * originalHeight * 4,
        compressedSize: width * height * 4
      }
    };
  }

  /**
   * Compress image by reducing quality
   */
  private async compressImage(
    id: string,
    imageData: ImageData,
    options: any
  ): Promise<ImageProcessingResult> {
    const { width, height } = imageData;
    const { quality = 0.8 } = options;

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.putImageData(imageData, 0, 0);

    // Apply compression-specific optimizations
    const compressedImageData = this.ctx.getImageData(0, 0, width, height);
    
    // Reduce color depth for high compression
    if (quality < 0.6) {
      this.reduceColorDepth(compressedImageData, quality);
    }

    // Apply dithering for low quality images
    if (quality < 0.4) {
      this.applyDithering(compressedImageData);
    }

    return {
      id,
      success: true,
      data: {
        imageData: compressedImageData,
        width,
        height,
        originalSize: width * height * 4,
        compressedSize: width * height * 4
      }
    };
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } {
    if (!maxWidth && !maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    let width = originalWidth;
    let height = originalHeight;

    if (maxWidth && width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Apply noise reduction filter
   */
  private applyNoiseReduction(imageData: ImageData): void {
    const { data, width, height } = imageData;
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    const kernelSum = 16;

    const originalData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[ky + 1][kx + 1];
            
            r += originalData[idx] * weight;
            g += originalData[idx + 1] * weight;
            b += originalData[idx + 2] * weight;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / kernelSum;
        data[idx + 1] = g / kernelSum;
        data[idx + 2] = b / kernelSum;
      }
    }
  }

  /**
   * Apply sharpening filter
   */
  private applySharpen(imageData: ImageData): void {
    const { data, width, height } = imageData;
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ];

    const originalData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[ky + 1][kx + 1];
            
            r += originalData[idx] * weight;
            g += originalData[idx + 1] * weight;
            b += originalData[idx + 2] * weight;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.max(0, Math.min(255, r));
        data[idx + 1] = Math.max(0, Math.min(255, g));
        data[idx + 2] = Math.max(0, Math.min(255, b));
      }
    }
  }

  /**
   * Reduce color depth for compression
   */
  private reduceColorDepth(imageData: ImageData, quality: number): void {
    const { data } = imageData;
    const levels = Math.max(2, Math.floor(256 * quality));
    const step = 256 / levels;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(data[i] / step) * step;         // R
      data[i + 1] = Math.floor(data[i + 1] / step) * step; // G
      data[i + 2] = Math.floor(data[i + 2] / step) * step; // B
    }
  }

  /**
   * Apply Floyd-Steinberg dithering
   */
  private applyDithering(imageData: ImageData): void {
    const { data, width, height } = imageData;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        for (let channel = 0; channel < 3; channel++) {
          const oldPixel = data[idx + channel];
          const newPixel = oldPixel < 128 ? 0 : 255;
          data[idx + channel] = newPixel;
          
          const error = oldPixel - newPixel;
          
          // Distribute error to neighboring pixels
          if (x + 1 < width) {
            data[idx + 4 + channel] += error * 7 / 16;
          }
          if (y + 1 < height) {
            if (x > 0) {
              data[((y + 1) * width + (x - 1)) * 4 + channel] += error * 3 / 16;
            }
            data[((y + 1) * width + x) * 4 + channel] += error * 5 / 16;
            if (x + 1 < width) {
              data[((y + 1) * width + (x + 1)) * 4 + channel] += error * 1 / 16;
            }
          }
        }
      }
    }
  }
}

// Initialize worker
const imageWorker = new ImageWorker();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<ImageProcessingMessage>) => {
  const result = await imageWorker.processImage(event.data);
  self.postMessage(result);
};

// Export for TypeScript
export {};