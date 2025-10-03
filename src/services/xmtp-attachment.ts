"use client";

import {
  AttachmentCodec,
  RemoteAttachmentCodec,
  ContentTypeRemoteAttachment,
  type RemoteAttachment,
} from '@xmtp/content-type-remote-attachment';
import { cloudinaryUpload } from './cloudinary-upload';

export interface AttachmentData {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}

export interface RemoteAttachmentData {
  url: string;
  contentDigest: string;
  salt: Uint8Array;
  nonce: Uint8Array;
  secret: Uint8Array;
  scheme: string;
  filename: string;
  contentLength: number;
}

export class XMTPAttachmentService {
  private attachmentCodec: AttachmentCodec;
  private remoteAttachmentCodec: RemoteAttachmentCodec;

  constructor() {
    this.attachmentCodec = new AttachmentCodec();
    this.remoteAttachmentCodec = new RemoteAttachmentCodec();
  }

  /**
   * Convert File to AttachmentData
   */
  async fileToAttachmentData(file: File): Promise<AttachmentData> {
    const data = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });

    return {
      filename: file.name,
      mimeType: file.type,
      data,
    };
  }

  /**
   * Create and upload a remote attachment
   */
  async createRemoteAttachment(file: File): Promise<RemoteAttachmentData> {
    try {
      // Step 1: Read file as ArrayBuffer
      const data = await new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
          } else {
            reject(new Error('Failed to read file as ArrayBuffer'));
          }
        };
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsArrayBuffer(file);
      });

      // Step 2: Create attachment object
      const attachment = {
        filename: file.name,
        mimeType: file.type,
        data,
      };

      // Step 3: Encrypt the attachment
      const encryptedEncoded = await RemoteAttachmentCodec.encodeEncrypted(
        attachment,
        this.attachmentCodec
      );

      // Step 4: Upload encrypted data to Cloudinary
      const encryptedBlob = new Blob([encryptedEncoded.payload], {
        type: 'application/octet-stream'
      });
      const url = await cloudinaryUpload.uploadFile(encryptedBlob, {
        folder: 'xmtp-attachments',
        resource_type: 'raw'
      });

      // Step 5: Create remote attachment with encryption metadata
      const remoteAttachment: RemoteAttachmentData = {
        url,
        contentDigest: encryptedEncoded.digest,
        salt: encryptedEncoded.salt,
        nonce: encryptedEncoded.nonce,
        secret: encryptedEncoded.secret,
        scheme: 'https://',
        filename: file.name,
        contentLength: data.byteLength,
      };

      return remoteAttachment;
    } catch (error) {
      console.error('Failed to create remote attachment:', error);
      throw new Error(`Failed to create remote attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and decrypt a remote attachment
   */
  async loadRemoteAttachment(remoteAttachment: RemoteAttachmentData, client: any): Promise<AttachmentData> {
    try {
      // Create RemoteAttachment object for loading
      const remoteAttachmentObj: RemoteAttachment = {
        url: remoteAttachment.url,
        contentDigest: remoteAttachment.contentDigest,
        salt: remoteAttachment.salt,
        nonce: remoteAttachment.nonce,
        secret: remoteAttachment.secret,
        scheme: remoteAttachment.scheme as 'https://',
        filename: remoteAttachment.filename,
        contentLength: remoteAttachment.contentLength,
      };

      // Load and decrypt the attachment using static method
      const attachment = await RemoteAttachmentCodec.load(
        remoteAttachmentObj,
        client
      ) as AttachmentData;

      return attachment;
    } catch (error) {
      console.error('Failed to load remote attachment:', error);
      throw new Error(`Failed to load remote attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get content type for remote attachments
   */
  getRemoteAttachmentContentType() {
    return ContentTypeRemoteAttachment;
  }

  /**
   * Check if a file type is supported
   */
  isSupportedFileType(mimeType: string): boolean {
    const supportedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Videos
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      // Documents
      'application/pdf',
      'text/plain',
      'application/json',
      'text/csv',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    return supportedTypes.includes(mimeType);
  }

  /**
   * Get file size limit (100MB for remote attachments)
   */
  getMaxFileSize(): number {
    return 100 * 1024 * 1024; // 100MB
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    if (!this.isSupportedFileType(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not supported`,
      };
    }

    if (file.size > this.getMaxFileSize()) {
      return {
        isValid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds the limit of ${this.getMaxFileSize() / 1024 / 1024}MB`,
      };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const xmtpAttachmentService = new XMTPAttachmentService();
