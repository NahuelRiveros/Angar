import {
  Dumbbell, HeartPulse, Target, UserCheck, LineChart, Activity, Trophy,
  MapPin, Instagram, Phone, Mail, MessageCircle, Clock, Users, ShieldCheck, Star,
  Package, Truck,
} from "lucide-react";

// Íconos que se pueden nombrar en la configuración (ej. HOME_CONTACTOS del pie de página):
// solo los de esta lista; un nombre desconocido muestra una estrella.
export const ICONOS_HOME = {
  Dumbbell, HeartPulse, Target, UserCheck, LineChart, Activity, Trophy,
  MapPin, Instagram, Phone, Mail, MessageCircle, Clock, Users, ShieldCheck, Star,
  Package, Truck,
};


/** Componente de ícono para un nombre de la configuración — Star si no se reconoce. */
export function iconoHome(nombre) {
  return ICONOS_HOME[nombre] ?? Star;
}
