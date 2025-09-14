"use client";

import { Name } from "@/types/doma";

interface MessagingModalProps {
  domain: Name | null;
  isOpen: boolean;
  onClose: () => void;
}

const MessagingModal = ({ domain, isOpen, onClose }: MessagingModalProps) => {
  if (!isOpen || !domain) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4"
        style={{
          border: '1px solid',
          borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(255, 255, 255, 0.2) 67.21%)',
          borderImageSlice: 1
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#EEEFFF29' }}
            >
              <span className="text-white text-sm font-bold">
                {domain.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{domain.name}</h3>
              <p className="text-gray-400 text-sm">Domain Owner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Coming Soon Message */}
        <div className="text-center py-8">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-white text-xl font-bold mb-2">Messaging Coming Soon</h3>
          <p className="text-gray-400 mb-4">Direct messaging with domain owners will be available soon.</p>
          <button
            onClick={onClose}
            className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagingModal;
