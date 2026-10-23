import { BriefcaseBusiness, HeartHandshake, ShieldAlert, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function RoleBadge({ role = "elderly" }) {
  const { t } = useAuth();

  const configs = {
    elderly: {
      label: t?.roleElderly || "Elderly Person",
      icon: UserRound,
      className: "role-badge role-elderly",
    },
    young_professional: {
      label: t?.roleYp || "Young Professional",
      icon: BriefcaseBusiness,
      className: "role-badge role-yp",
    },
    caregiver: {
      label: t?.roleCaregiver || "Caregiver",
      icon: HeartHandshake,
      className: "role-badge role-caregiver",
    },
    emergency_contact: {
      label: t?.roleEmergency || "Emergency Contact",
      icon: ShieldAlert,
      className: "role-badge role-emergency",
    },
  };

  const config = configs[role] || configs.elderly;
  const Icon = config.icon;

  return (
    <span className={config.className}>
      <Icon size={12} />
      <span>{config.label}</span>
    </span>
  );
}
