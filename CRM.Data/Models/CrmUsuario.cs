using System.Collections.Generic;

namespace CRM.Data.Models
{
    public class CrmUsuario
    {
        public int nUsuario { get; set; }
        public string cUsuario { get; set; } = string.Empty;
        public string cNombre { get; set; } = string.Empty;
        public char cEstado { get; set; } = 'A';
        public string? cPasswordHash { get; set; }
        public string cRol { get; set; } = "Asesor";

        // Relación: Un usuario puede tener varias conversaciones asignadas
        public ICollection<Conversacion> ConversacionesAsignadas { get; set; } = new List<Conversacion>();
    }
}