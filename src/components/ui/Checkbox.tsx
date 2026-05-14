import React from 'react';

interface CheckboxProps {
    id?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, checked, onChange, label, disabled }) => {
    // Generate a random ID if not provided, to ensure input-label association works
    const checkboxId = id || `cbx-46-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="checkbox-wrapper-46">
            <input
                type="checkbox"
                id={checkboxId}
                className="inp-cbx"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
            <label htmlFor={checkboxId} className="cbx">
                <span>
                    <svg viewBox="0 0 12 10" height="10px" width="12px">
                        <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                    </svg>
                </span>
                {label && <span>{label}</span>}
            </label>
        </div>
    );
};

export default Checkbox;
