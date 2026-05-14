import React from 'react';

interface CloseButtonProps {
    onClick: () => void;
    className?: string;
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClick, className = '' }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`close-btn-wrapper outline-none focus:outline-none ${className}`}
            aria-label="Close"
        >
            <div className="close-btn-bg">
                <div className="close-btn-inner">
                    ✖️
                </div>
            </div>
        </button>
    );
};

export default CloseButton;
