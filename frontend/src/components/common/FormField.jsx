export default function FormField({ label, required, children, hint }) {
  return (
    <label className="form-field">
      <span className="field-label">{label} {required && <b>*</b>}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
