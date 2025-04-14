export const pages = {
  'App.tsx': `import { useState } from 'react';
import { AccessibleModal } from './AccessibleModal';
import { setupDarkMode } from './lib/utils';
import { useEffect } from 'react';

export default function App() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Setup dark mode handling
    useEffect(() => setupDarkMode(), []);

    return (
        <div className="min-h-screen flex flex-col justify-center items-center gap-4 dark:bg-[#18191c] p-4">
            <div className="text-center mb-6">
                <h1 className="text-xl font-bold mb-2">Focus Trapping Example</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Open the modal and try tabbing through it - focus will stay within the modal</p>
            </div>
            
            <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
                Open Modal
            </button>
            
            <AccessibleModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
            
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-md max-w-md">
                <h2 className="font-bold mb-2">Try this:</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Click "Open Modal" to launch the dialog</li>
                    <li>Press Tab repeatedly to navigate within the modal</li>
                    <li>Notice how focus cycles within the modal boundaries</li>
                    <li>Press Escape to close the modal</li>
                </ol>
            </div>
        </div>
    );
}`,
  'AccessibleModal.tsx': `import { useRef, useEffect } from 'react';
import { useFocusTrap } from '@c15t/react';

export function AccessibleModal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  
  // Enable focus trapping when the modal is open
  useFocusTrap(isOpen, modalRef);
  
  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div 
        ref={modalRef} 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative z-10"
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <h2 className="text-xl font-bold mb-4">Focus Trapped Modal</h2>
        
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          This modal demonstrates focus trapping using the useFocusTrap hook. 
          Try tabbing through the interactive elements - you'll notice that focus 
          stays within the modal until it's closed.
        </p>
        
        <div className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Text input" 
            className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600" 
          />
          
          <select className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600">
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </select>
          
          <div className="flex gap-2">
            <input type="checkbox" id="check" />
            <label htmlFor="check">Checkbox</label>
          </div>
          
          <div className="flex justify-between mt-4">
            <button 
              className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={onClose}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}`,

  'lib/utils.ts': `export function setupDarkMode() {
  // Check for dark mode preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Apply dark mode if preferred
  if (prefersDark) {
    document.documentElement.classList.add('dark');
  }
}`,
};
