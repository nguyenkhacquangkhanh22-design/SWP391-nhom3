import { useState, type InputHTMLAttributes } from "react";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function PasswordInput({
  label,
  id,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-control">
        <input id={inputId} type={visible ? "text" : "password"} {...props} />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </div>
    </div>
  );
}
