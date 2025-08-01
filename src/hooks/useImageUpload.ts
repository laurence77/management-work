/**
 * React Hook for Image Upload with Optimization
 */

import { useState, useCallback, useRef } from 'react';
import { imageOptimizer, OptimizedImage, ImageOptimizationOptions } from '@/utils/image-optimization';

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploaded: OptimizedImage[];
}

export interface UseImageUploadOptions {
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  autoOptimize?: boolean;
  optimizationOptions?: ImageOptimizationOptions;
  uploadEndpoint?: string;
  onUploadStart?: (files: File[]) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (results: OptimizedImage[]) => void;
  onUploadError?: (error: Error) => void;
  generateVariants?: boolean;
  variantBreakpoints?: { name: string; width: number; quality?: number }[];
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    maxFiles = 10,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    autoOptimize = true,
    optimizationOptions = {},
    uploadEndpoint = '/api/upload/images',
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    generateVariants = false,
    variantBreakpoints = [
      { name: 'thumbnail', width: 150, quality: 0.7 },
      { name: 'small', width: 400, quality: 0.8 },
      { name: 'medium', width: 800, quality: 0.85 },
      { name: 'large', width: 1200, quality: 0.9 }
    ]
  } = options;

  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploaded: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Validate files before upload
   */
  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { valid, errors };
    }

    files.forEach((file, index) => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`File ${index + 1}: Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        errors.push(`File ${index + 1}: File too large. Maximum size: ${maxSizeMB}MB`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [maxFiles, maxFileSize, acceptedTypes]);

  /**
   * Optimize images before upload
   */
  const optimizeImages = useCallback(async (files: File[]): Promise<OptimizedImage[]> => {
    const optimized: OptimizedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        let result: OptimizedImage;
        
        if (generateVariants) {
          // Create responsive variants
          const variants = await imageOptimizer.createResponsiveVariants(file, variantBreakpoints);
          // Use the largest variant as the main image
          const largestVariant = Object.values(variants).reduce((largest, current) => 
            current.width > largest.width ? current : largest
          );
          result = largestVariant;
        } else {
          // Single optimized image
          result = await imageOptimizer.optimizeImage(file, optimizationOptions);
        }

        optimized.push(result);
        
        // Update progress
        const progress = ((i + 1) / files.length) * 50; // 50% for optimization
        setState(prev => ({ ...prev, progress }));
        onUploadProgress?.(progress);
      } catch (error) {
        console.error(`Failed to optimize image ${i + 1}:`, error);
        throw new Error(`Failed to optimize image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return optimized;
  }, [autoOptimize, optimizationOptions, generateVariants, variantBreakpoints, onUploadProgress]);

  /**
   * Upload optimized images to server
   */
  const uploadToServer = useCallback(async (images: OptimizedImage[]): Promise<OptimizedImage[]> => {
    const results: OptimizedImage[] = [];
    abortControllerRef.current = new AbortController();

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        const formData = new FormData();
        formData.append('image', image.blob, `optimized-${i}.${image.format}`);
        formData.append('originalSize', image.originalSize.toString());
        formData.append('compressedSize', image.compressedSize.toString());
        formData.append('compressionRatio', image.compressionRatio.toString());
        formData.append('width', image.width.toString());
        formData.append('height', image.height.toString());
        formData.append('format', image.format);

        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const uploadResult = await response.json();
        
        results.push({
          ...image,
          url: uploadResult.url || image.url, // Use server URL if provided
          ...uploadResult // Merge any additional server response data
        });

        // Update progress
        const progress = 50 + ((i + 1) / images.length) * 50; // 50-100% for upload
        setState(prev => ({ ...prev, progress }));
        onUploadProgress?.(progress);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Upload cancelled');
        }
        console.error(`Failed to upload image ${i + 1}:`, error);
        throw new Error(`Failed to upload image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }, [uploadEndpoint, onUploadProgress]);

  /**
   * Main upload function
   */
  const uploadImages = useCallback(async (files: File[]) => {
    // Reset state
    setState({
      isUploading: true,
      progress: 0,
      error: null,
      uploaded: []
    });

    try {
      onUploadStart?.(files);

      // Validate files
      const { valid, errors } = validateFiles(files);
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      let imagesToUpload: OptimizedImage[];

      if (autoOptimize) {
        // Optimize images
        imagesToUpload = await optimizeImages(valid);
      } else {
        // Convert files to OptimizedImage format without optimization
        imagesToUpload = await Promise.all(
          valid.map(async (file) => ({
            blob: file,
            url: URL.createObjectURL(file),
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            width: 0, // Would need to load image to get dimensions
            height: 0,
            format: file.type.split('/')[1]
          }))
        );
      }

      // Upload to server
      const uploaded = await uploadToServer(imagesToUpload);

      setState({
        isUploading: false,
        progress: 100,
        error: null,
        uploaded
      });

      onUploadComplete?.(uploaded);
      return uploaded;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
        uploaded: []
      });

      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, [
    validateFiles,
    optimizeImages,
    uploadToServer,
    autoOptimize,
    onUploadStart,
    onUploadComplete,
    onUploadError
  ]);

  /**
   * Upload from file input
   */
  const uploadFromInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      uploadImages(files);
    }
  }, [uploadImages]);

  /**
   * Upload from drag and drop
   */
  const uploadFromDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      uploadImages(imageFiles);
    }
  }, [uploadImages]);

  /**
   * Cancel upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      uploaded: []
    });
  }, []);

  /**
   * Clear uploaded images
   */
  const clearUploaded = useCallback(() => {
    // Revoke object URLs to free memory
    state.uploaded.forEach(image => {
      if (image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }
    });

    setState(prev => ({ ...prev, uploaded: [], error: null }));
  }, [state.uploaded]);

  /**
   * Get file input props
   */
  const getInputProps = useCallback(() => ({
    type: 'file',
    multiple: maxFiles > 1,
    accept: acceptedTypes.join(','),
    onChange: uploadFromInput
  }), [maxFiles, acceptedTypes, uploadFromInput]);

  /**
   * Get drop zone props
   */
  const getDropZoneProps = useCallback(() => ({
    onDrop: uploadFromDrop,
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragEnter: (e: React.DragEvent) => e.preventDefault()
  }), [uploadFromDrop]);

  return {
    // State
    ...state,
    
    // Actions
    uploadImages,
    uploadFromInput,
    uploadFromDrop,
    cancelUpload,
    clearUploaded,
    
    // Helpers
    getInputProps,
    getDropZoneProps,
    validateFiles
  };
}

// Hook for batch image processing
export function useBatchImageProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OptimizedImage[]>([]);

  const processImages = useCallback(async (
    files: File[],
    options: ImageOptimizationOptions = {}
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const processed: OptimizedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const optimized = await imageOptimizer.optimizeImage(files[i], options);
        processed.push(optimized);
        
        const progressPercent = ((i + 1) / files.length) * 100;
        setProgress(progressPercent);
      }

      setResults(processed);
      return processed;
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processInParallel = useCallback(async (
    files: File[],
    options: ImageOptimizationOptions = {},
    batchSize: number = 4
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const results = await imageOptimizer.optimizeImages(files, options);
      setResults(results);
      setProgress(100);
      return results;
    } catch (error) {
      console.error('Parallel processing failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    progress,
    results,
    processImages,
    processInParallel
  };
}