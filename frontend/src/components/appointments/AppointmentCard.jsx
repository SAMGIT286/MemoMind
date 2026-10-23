import { CalendarDays, Clock3, MapPin, MoreVertical } from "lucide-react";

export default function AppointmentCard({ appointment }) {
  const date = new Date(`${appointment.date}T12:00:00`);
  return (
    <div className="appointment-card">
      <div className="date-block">
        <span>{date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</span>
        <strong>{date.getDate()}</strong>
      </div>
      <div className="appointment-main">
        <div className="appointment-title-row"><h3>{appointment.title}</h3><button className="icon-btn"><MoreVertical size={17} /></button></div>
        <p>{appointment.doctorName} · {appointment.specialization}</p>
        <div className="appointment-meta"><span><Clock3 size={13} /> {appointment.time}</span><span><MapPin size={13} /> {appointment.location}</span></div>
      </div>
      <span className="upcoming-label">Upcoming</span>
    </div>
  );
}
