import type {
  Customer,
  CustomerForm,
  CustomerListResponse,
} from "@/types/customer";
import { $api } from "@/utils/api";

export const customerService = {
  async getCustomers() {
    return await $api<CustomerListResponse>("customers", {
      query: { itemsPerPage: 100, is_active: true },
    });
  },

  async getCustomer(customerId: number) {
    return await $api<{ customer: Customer }>(`customers/${customerId}`);
  },

  async createCustomer(data: CustomerForm) {
    return await $api<{ customer: Customer }>("customers", {
      method: "POST",
      body: data,
    });
  },

  async updateCustomer(customerId: number, data: CustomerForm) {
    return await $api<{ customer: Customer }>(`customers/${customerId}`, {
      method: "PUT",
      body: data,
    });
  },
};
