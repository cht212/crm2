import type { Customer } from "@/types/customer";

export interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  customer_id: number | null;
  is_active: boolean;
  customer: Customer | null;
  roles: string[];
  permissions: string[];
}
