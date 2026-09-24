import { ref } from "vue";
import { customerService } from "@/services/customerService";
import type { Customer, CustomerForm } from "@/types/customer";
import type { UserData } from "@/types/user";

const emptyForm = (): CustomerForm => ({
  company_name: "",
  tax_number: "",
  trade_name: "",
  email: "",
  phone: "",
  address: "",
  department: "",
  province: "",
  district: "",
  contact: {
    name: "",
    position: "",
    email: "",
    phone: "",
  },
  create_user: false,
  user: {
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  },
  assigned_user: null,
});

const customerToForm = (customer: Customer): CustomerForm => {
  const primaryContact = customer.contacts?.find(
    (contact) => contact.is_primary,
  );

  return {
    company_name: customer.company_name,
    tax_number: customer.tax_number,
    trade_name: customer.trade_name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    department: customer.department,
    province: customer.province,
    district: customer.district,
    contact: {
      name: primaryContact?.name ?? "",
      position: primaryContact?.position ?? "",
      email: primaryContact?.email ?? "",
      phone: primaryContact?.phone ?? "",
    },
    assigned_user: customer.users?.[0]
      ? {
          id: customer.users[0].id,
          name: customer.users[0].name,
          email: customer.users[0].email,
          phone: customer.users[0].phone,
          is_active: customer.users[0].is_active,
        }
      : null,
  };
};

export function useCustomer() {
  const loading = ref(false);
  const saving = ref(false);
  const validationErrors = ref<Record<string, string[]>>({});

  const snackbar = ref(false);
  const snackbarMessage = ref("");
  const snackbarColor = ref<"success" | "error">("success");

  const showSnackbar = (
    message: string,
    color: "success" | "error" = "success",
  ) => {
    snackbarMessage.value = message;
    snackbarColor.value = color;
    snackbar.value = true;
  };

  const customerId = ref<number | null>(null);
  const form = ref<CustomerForm>(emptyForm());

  const userData = useCookie<UserData | null>("userData");

  /**
   * Carga la empresa asignada al usuario autenticado.
   * Se utiliza para CUSTOMER_USER.
   */
  const loadCustomer = () => {
    loading.value = true;

    try {
      const user = userData.value;

      if (!user) {
        customerId.value = null;
        form.value = emptyForm();

        return;
      }

      customerId.value = user.customer_id;

      if (!user.customer_id || !user.customer) {
        form.value = emptyForm();

        return;
      }

      const customer = user.customer;

      form.value = customerToForm(customer);
    } catch (error) {
      console.error(error);

      showSnackbar("No se pudieron cargar los datos de la empresa.", "error");
    } finally {
      loading.value = false;
    }
  };

  /**
   * Carga la empresa que consulte el rol admin, commercial
   */

  const loadCustomerById = async (id: number) => {
    loading.value = true;

    try {
      const response = await customerService.getCustomer(id);

      const customer = response.customer;

      customerId.value = customer.id;

      form.value = customerToForm(customer);
    } catch (error: any) {
      console.error(error);

      showSnackbar(
        error?.data?.message ||
          "No se pudieron cargar los datos de la empresa.",
        "error",
      );

      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Crea una nueva empresa.
   * Utilizado por ADMIN y COMMERCIAL.
   */
  const createCustomer = async () => {
    validationErrors.value = {};
    saving.value = true;

    try {
      const response = await customerService.createCustomer(form.value);

      customerId.value = response.customer.id;

      showSnackbar("Empresa registrada correctamente.", "success");

      return response.customer;
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      validationErrors.value = error?.data?.errors ?? {};

      if (status === 422) {
        throw error;
      }

      showSnackbar(
        "No se pudo actualizar la empresa. Verifica tu conexión e inténtalo nuevamente.",
        "error",
      );

      throw error;
    } finally {
      saving.value = false;
    }
  };

  /**
   * Actualiza una empresa existente.
   * Utilizado por ADMIN y COMMERCIAL.
   */
  const updateCustomer = async (id: number) => {
    validationErrors.value = {};
    saving.value = true;

    try {
      const response = await customerService.updateCustomer(id, form.value);

      customerId.value = response.customer.id;

      showSnackbar("Empresa actualizada correctamente.", "success");

      return response.customer;
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      validationErrors.value = error?.data?.errors ?? {};

      if (status === 422) {
        throw error;
      }

      showSnackbar(
        "No se pudo registrar la empresa. Verifica tu conexión e inténtalo nuevamente.",
        "error",
      );
      throw error;
    } finally {
      saving.value = false;
    }
  };

  /**
   * Restablece el formulario.
   *
   * Para el flujo actual del CUSTOMER_USER,
   * vuelve a cargar la empresa asignada.
   */
  const resetForm = () => {
    form.value = emptyForm();
  };

  return {
    loading,
    saving,
    snackbar,
    snackbarMessage,
    snackbarColor,
    validationErrors,
    customerId,
    form,
    loadCustomer,
    loadCustomerById,
    createCustomer,
    updateCustomer,
    resetForm,
  };
}
