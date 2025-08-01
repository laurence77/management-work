/**
 * Image Upload Zone Component with Drag & Drop
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Camera,
  FileImage,
  Loader2
} from 'lucide-react';
import { useImageUpload, UseImageUploadOptions } from '@/hooks/useImageUpload';
import { OptimizedImage } from '@/components/image/OptimizedImage';
import { cn } from '@/lib/utils';

interface ImageUploadZoneProps extends UseImageUploadOptions {
  className?: string;
  variant?: 'default' | 'compact' | 'grid';
  showPreviews?: boolean;
  showProgress?: boolean;
  showMetadata?: boolean;
  allowReorder?: boolean;
  placeholder?: React.ReactNode;
  onImagesChange?: (images: any[]) => void;
}

export function ImageUploadZone({
  className,
  variant = 'default',
  showPreviews = true,
  showProgress = true,
  showMetadata = false,
  allowReorder = false,
  placeholder,
  onImagesChange,
  ...uploadOptions
}: ImageUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    progress,
    error,
    uploaded,
    uploadFromInput,
    uploadFromDrop,
    cancelUpload,
    clearUploaded,
    getInputProps,
    getDropZoneProps
  } = useImageUpload({
    ...uploadOptions,
    onUploadComplete: (results) => {
      uploadOptions.onUploadComplete?.(results);
      onImagesChange?.(results);
    }
  });

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    uploadFromDrop(e);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (index: number) => {
    const newUploaded = uploaded.filter((_, i) => i !== index);
    onImagesChange?.(newUploaded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getCompressionText = (image: any) => {
    const savings = formatFileSize(image.originalSize - image.compressedSize);
    const percent = image.compressionRatio.toFixed(1);
    return `${savings} saved (${percent}%)`;
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          <input
            {...getInputProps()}
            ref={fileInputRef}
            className="hidden"
            onChange={uploadFromInput}
          />

          <div className="flex items-center justify-center space-x-2">
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span className="text-sm">
              {isUploading ? 'Uploading...' : 'Click or drag images here'}
            </span>
          </div>

          {showProgress && isUploading && (
            <Progress value={progress} className="mt-2" />
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploaded.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploaded.map((image, index) => (
              <div key={index} className="relative">
                <OptimizedImage
                  src={image.url}
                  alt={`Upload ${index + 1}`}
                  width={60}
                  height={60}
                  className="rounded-lg object-cover"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid variant
  if (variant === 'grid') {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardContent className="p-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
                isUploading && 'pointer-events-none opacity-50'
              )}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleFileSelect}
            >
              <input
                {...getInputProps()}
                ref={fileInputRef}
                className="hidden"
                onChange={uploadFromInput}
              />

              <div className="flex flex-col items-center space-y-4">
                {isUploading ? (
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                ) : (
                  <Camera className="h-12 w-12 text-gray-400" />
                )}

                <div>
                  <p className="text-lg font-medium">
                    {isUploading ? 'Processing images...' : 'Upload images'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Drag and drop or click to select files
                  </p>
                </div>

                {showProgress && isUploading && (
                  <div className="w-full max-w-xs">
                    <Progress value={progress} />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {progress.toFixed(0)}% complete
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploaded.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploaded.map((image, index) => (
              <ImagePreviewCard
                key={index}
                image={image}
                index={index}
                showMetadata={showMetadata}
                onRemove={() => handleRemoveImage(index)}
                getCompressionText={getCompressionText}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
              isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
              isUploading && 'pointer-events-none opacity-50'
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileSelect}
          >
            <input
              {...getInputProps()}
              ref={fileInputRef}
              className="hidden"
              onChange={uploadFromInput}
            />

            {placeholder || (
              <div className="flex flex-col items-center space-y-4">
                {isUploading ? (
                  <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                ) : (
                  <div className="relative">
                    <FileImage className="h-16 w-16 text-gray-400" />
                    <Upload className="h-6 w-6 absolute -bottom-1 -right-1 bg-white text-blue-500 rounded-full border-2 border-white" />
                  </div>
                )}

                <div>
                  <p className="text-xl font-medium">
                    {isUploading ? 'Processing your images...' : 'Upload your images'}
                  </p>
                  <p className="text-gray-500 mt-2">
                    Drag and drop your files here, or{' '}
                    <span className="text-blue-500 underline">browse</span> to choose files
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Supports JPEG, PNG, WebP up to {uploadOptions.maxFileSize ? formatFileSize(uploadOptions.maxFileSize) : '10MB'}
                  </p>
                </div>

                {showProgress && isUploading && (
                  <div className="w-full max-w-md">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>{progress.toFixed(0)}% complete</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelUpload();
                        }}
                        className="h-auto p-0 text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploaded.length > 0 && showPreviews && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Uploaded Images ({uploaded.length})
              </h3>
              <Button variant="outline" size="sm" onClick={clearUploaded}>
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploaded.map((image, index) => (
                <ImagePreviewCard
                  key={index}
                  image={image}
                  index={index}
                  showMetadata={showMetadata}
                  onRemove={() => handleRemoveImage(index)}
                  getCompressionText={getCompressionText}
                  formatFileSize={formatFileSize}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Image preview card component
interface ImagePreviewCardProps {
  image: any;
  index: number;
  showMetadata: boolean;
  onRemove: () => void;
  getCompressionText: (image: any) => string;
  formatFileSize: (bytes: number) => string;
}

function ImagePreviewCard({
  image,
  index,
  showMetadata,
  onRemove,
  getCompressionText,
  formatFileSize
}: ImagePreviewCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <OptimizedImage
            src={image.url}
            alt={`Upload ${index + 1}`}
            width={300}
            height={200}
            className="w-full h-48 object-cover"
          />
          
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 h-8 w-8 rounded-full p-0"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="bg-black/50 text-white">
              <CheckCircle className="h-3 w-3 mr-1" />
              Optimized
            </Badge>
          </div>
        </div>

        {showMetadata && (
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Dimensions:</span>
              <span>{image.width} × {image.height}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Size:</span>
              <span>{formatFileSize(image.compressedSize)}</span>
            </div>
            
            {image.compressionRatio > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Savings:</span>
                <span className="text-green-600">
                  {getCompressionText(image)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Format:</span>
              <span className="uppercase">{image.format}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}