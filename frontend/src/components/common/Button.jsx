export default function Button({ children, variant = "primary", type = "button", ...props }) {
  return (
    <button type={type} className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}
