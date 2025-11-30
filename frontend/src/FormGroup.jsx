import React, { useState } from 'react';

const FormGroup = ({ label, type, value, onChange, onBlur, placeholder, id, required, icon, children }) => {
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-group">
      <label htmlFor={id}>
        {icon && <i className={icon}></i>} {label}
      </label>
      <div className={isPassword ? 'input-with-toggle' : ''}>
        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
        />
        {isPassword && (
          <button
            type="button"
            className="password-toggle-text"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

export default FormGroup;