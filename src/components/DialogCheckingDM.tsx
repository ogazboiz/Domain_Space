"use client";

interface DialogCheckingDMProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAddress?: string;
  onDMCreated: (dmId: string, userAddress: string) => void;
}

const DialogCheckingDM: React.FC<DialogCheckingDMProps> = ({
  open,
  onOpenChange,
  userAddress,
  onDMCreated,
}) => {

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-6 text-center max-w-md mx-4">
        <div className="space-y-4">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-white text-xl font-bold mb-2">Messaging Coming Soon</h3>
          <p className="text-gray-400 mb-4">
            Direct messaging features are under development.
          </p>
          <button
            onClick={() => onOpenChange(false)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogCheckingDM;