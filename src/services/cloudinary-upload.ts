"use client";

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  bytes: number;
}

interface UploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: string;
}

export class CloudinaryUploadService {
  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    this.uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
    
    if (!this.cloudName || !this.uploadPreset) {
      throw new Error('Cloudinary configuration missing. Please check your environment variables.');
    }
  }

  /**
   * Upload a file to Cloudinary
   */
  async uploadFile(
    file: File | Blob,
    options: UploadOptions = {}
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    if (options.folder) {
      formData.append('folder', options.folder);
    }

    if (options.public_id) {
      formData.append('public_id', options.public_id);
    }

    // Determine resource type
    const resourceType = options.resource_type || 'auto';

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result: CloudinaryUploadResponse = await response.json();
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload encrypted attachment data for XMTP
   */
  async uploadEncryptedAttachment(
    encryptedData: Uint8Array,
    filename: string
  ): Promise<string> {
    const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
    
    const result = await this.uploadFile(blob, {
      folder: 'xmtp-attachments',
      public_id: `attachment_${Date.now()}_${filename}`,
      resource_type: 'raw'
    });

    return result.secure_url;
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(
    publicId: string,
    width?: number,
    height?: number,
    quality: number = 80
  ): string {
    let transformation = `q_${quality},f_auto`;
    
    if (width) {
      transformation += `,w_${width}`;
    }
    
    if (height) {
      transformation += `,h_${height}`;
    }

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformation}/${publicId}`;
  }

  /**
   * Get thumbnail URL for images
   */
  getThumbnailUrl(publicId: string, size: number = 200): string {
    return this.getOptimizedImageUrl(publicId, size, size, 70);
  }
}

// Export singleton instance
export const cloudinaryUpload = new CloudinaryUploadService();
