"use client";

import { useState, useEffect } from 'react';
import { Download, File, Image, Video, Music, FileText, AlertCircle } from 'lucide-react';
import { xmtpAttachmentService, type RemoteAttachmentData, type AttachmentData } from '@/services/xmtp-attachment';
import { cloudinaryUpload } from '@/services/cloudinary-upload';
import { useXMTP } from '@/contexts/XMTPContext';

interface AttachmentDisplayProps {
  remoteAttachment: RemoteAttachmentData;
  className?: string;
}

export function AttachmentDisplay({ remoteAttachment, className = '' }: AttachmentDisplayProps) {
  const { client } = useXMTP();
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAttachment();

    // Cleanup object URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (attachment?.blobUrl) {
        URL.revokeObjectURL(attachment.blobUrl);
      }
    };
  }, [remoteAttachment, client]);

  const loadAttachment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have encryption metadata
      const hasEncryption = remoteAttachment.secret &&
                           remoteAttachment.salt &&
                           remoteAttachment.nonce;

      if (!hasEncryption) {
        // No encryption metadata - just show the URL directly (fallback)
        const url = remoteAttachment.url;
        if (remoteAttachment.filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          setPreviewUrl(url);
        }
        setAttachment({
          filename: remoteAttachment.filename,
          mimeType: getMimeTypeFromFilename(remoteAttachment.filename),
          data: new Uint8Array(0), // Empty data for fallback case
          size: remoteAttachment.contentLength,
        });
        return;
      }

      // Load and decrypt the attachment using the XMTP service
      if (!client) {
        throw new Error('XMTP client not available');
      }

      const decryptedAttachment = await xmtpAttachmentService.loadRemoteAttachment(
        remoteAttachment,
        client
      );

      // Create a blob URL for preview
      const blob = new Blob([decryptedAttachment.data as BlobPart], {
        type: decryptedAttachment.mimeType
      });
      const blobUrl = URL.createObjectURL(blob);

      // Set preview URL for images
      if (decryptedAttachment.mimeType.startsWith('image/')) {
        setPreviewUrl(blobUrl);
      }

      // Create attachment object for display
      setAttachment({
        filename: decryptedAttachment.filename,
        mimeType: decryptedAttachment.mimeType,
        size: decryptedAttachment.data.byteLength,
        data: decryptedAttachment.data, // Store for download
        blobUrl, // Store for cleanup
      });

    } catch (err) {
      console.error('Failed to load attachment:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attachment');
    } finally {
      setLoading(false);
    }
  };

  const getMimeTypeFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'json': 'application/json',
      'csv': 'text/csv',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (attachment?.data) {
      // Download the decrypted file
      const blob = new Blob([attachment.data as BlobPart], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Fallback - open the URL directly
      window.open(remoteAttachment.url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={`p-3 bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-sm text-gray-400">Loading attachment...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 bg-red-900/20 border border-red-700 rounded-lg ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div className="text-sm text-red-400">Failed to load attachment</div>
        </div>
      </div>
    );
  }

  if (!attachment) {
    return null;
  }

  return (
    <div className={`p-3 bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Image Preview */}
      {previewUrl && attachment.mimeType.startsWith('image/') && (
        <div className="mb-3">
          <img
            src={previewUrl}
            alt={attachment.filename}
            className="max-w-full max-h-48 rounded object-cover"
            onError={() => setPreviewUrl(null)}
          />
        </div>
      )}

      {/* File Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 text-gray-400">
            {getFileIcon(attachment.mimeType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {attachment.filename}
            </div>
            <div className="text-xs text-gray-400">
              {attachment.size ? formatFileSize(attachment.size) : 'Unknown size'}
            </div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="flex-shrink-0 p-2 hover:bg-gray-700 rounded transition-colors"
          title="Download attachment"
        >
          <Download className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
