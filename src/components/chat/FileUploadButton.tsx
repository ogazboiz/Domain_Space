"use client";

import { useRef, useState } from 'react';
import { Paperclip, X, Image, File, Video, Music, FileText } from 'lucide-react';
import { xmtpAttachmentService, type RemoteAttachmentData } from '@/services/xmtp-attachment';
import { toast } from 'sonner';

interface FileUploadButtonProps {
  onFileSelect: (remoteAttachment: RemoteAttachmentData) => void;
  disabled?: boolean;
  className?: string;
}

interface FilePreview {
  file: File;
  preview?: string;
  uploading: boolean;
  error?: string;
}

export function FileUploadButton({ onFileSelect, disabled, className = '' }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = xmtpAttachmentService.validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const filePreview: FilePreview = {
      file,
      uploading: true,
    };

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview({
          ...filePreview,
          preview: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(filePreview);
    }

    try {
      // Create remote attachment
      const remoteAttachment = await xmtpAttachmentService.createRemoteAttachment(file);
      
      // Update preview to show success
      setPreview(prev => prev ? { ...prev, uploading: false } : null);
      
      // Call the callback
      onFileSelect(remoteAttachment);
      
      // Clear preview after a short delay
      setTimeout(() => setPreview(null), 1000);
      
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      setPreview(prev => prev ? { 
        ...prev, 
        uploading: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      } : null);
      
      toast.error('Failed to upload file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.txt,.json,.csv,.zip,.rar,.7z"
      />
      
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
        title="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* File Preview */}
      {preview && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-lg min-w-[200px] max-w-[300px]">
          <div className="flex items-start space-x-3">
            {/* File Icon/Preview */}
            <div className="flex-shrink-0">
              {preview.preview ? (
                <img
                  src={preview.preview}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                  {getFileIcon(preview.file.type)}
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {preview.file.name}
              </div>
              <div className="text-xs text-gray-400">
                {formatFileSize(preview.file.size)}
              </div>
              
              {/* Upload Status */}
              {preview.uploading && (
                <div className="mt-1 flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-400">Uploading...</span>
                </div>
              )}
              
              {preview.error && (
                <div className="mt-1 text-xs text-red-400">
                  {preview.error}
                </div>
              )}
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              className="flex-shrink-0 p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
