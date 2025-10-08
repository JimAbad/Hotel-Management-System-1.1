import React from 'react';

const FormGroup = ({ label, type, value, onChange, id, required, icon, children }) => {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {icon && <i className={icon}></i>} {label}:
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        required={required}
      />
      {children}
    </div>
  );
};

export default FormGroup;