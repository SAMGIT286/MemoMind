import { Check, Clock3, MoreVertical, Pill } from "lucide-react";

export default function MedicineCard({ medicine, onTaken }) {
  return (
    <div className="medicine-card">
      <div className={`medicine-icon ${medicine.status === "taken" ? "taken" : ""}`}><Pill size={20} /></div>
      <div className="medicine-main">
        <div className="medicine-title-row">
          <h3>{medicine.name}</h3>
          <button className="icon-btn"><MoreVertical size={17} /></button>
        </div>
        <p>{medicine.dosage} · {medicine.frequency}</p>
        <div className="medicine-meta"><Clock3 size={14} /> {medicine.time}</div>
      </div>
      <div className="medicine-status">
        {medicine.status === "taken" ? (
          <span className="status-pill success"><Check size={13} /> Taken at {medicine.takenAt}</span>
        ) : (
          <button className="mini-btn" onClick={() => onTaken(medicine.id)}>Mark as Taken</button>
        )}
      </div>
    </div>
  );
}
