
import React from 'react';

interface MagicButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'accent';
}

const MagicButton: React.FC<MagicButtonProps> = ({ 
  onClick, 
  children, 
  className = "", 
  disabled = false,
  variant = 'primary' 
}) => {
  const variants = {
    primary: 'bg-yellow-400 hover:bg-yellow-300 text-yellow-900 border-b-4 border-yellow-600',
    secondary: 'bg-blue-400 hover:bg-blue-300 text-white border-b-4 border-blue-600',
    accent: 'bg-pink-400 hover:bg-pink-300 text-white border-b-4 border-pink-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-8 py-3 rounded-full font-bold text-lg 
        transition-all duration-200 active:translate-y-1 active:border-b-0
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default MagicButton;
