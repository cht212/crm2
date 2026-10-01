import type {
  Customer,
  CustomerForm,
  CustomerListResponse,
} from "@/types/customer";
import { $api } from "@/utils/api";

export const customerService = {
  async getCustomers(page = 1, itemsPerPage = 10, search = "") {
    return await $api<CustomerListResponse>("customers", {
      query: { page, itemsPerPage, is_active: true, q: search.trim() || undefined },
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
