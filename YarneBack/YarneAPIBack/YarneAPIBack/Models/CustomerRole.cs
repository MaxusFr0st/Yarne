using System;
using System.Collections.Generic;

namespace YarneAPIBack.Models;

public partial class CustomerRole
{
    public int CustomerId { get; set; }

    public int RoleId { get; set; }

    public DateTime AssignedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual Role Role { get; set; } = null!;
}
