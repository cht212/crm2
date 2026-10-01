import Shepherd from "shepherd.js";
import "@core/scss/template/libs/shepherd.scss";

const QUOTE_TOUR_STORAGE_KEY = "quote-request-tour-completed";

export const useQuoteRequestTour = () => {
  const start = () => {
    Shepherd.activeTour?.cancel();

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        classes: "quote-request-tour",
        scrollTo: {
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        },
      },
    });

    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const sidePlacement = (desktopPlacement: "left" | "right") =>
      isMobile ? "bottom" : desktopPlacement;
    const verticalPlacement = (desktopPlacement: "top" | "bottom") =>
      isMobile ? "top" : desktopPlacement;

    const nextButton = {
      text: "Siguiente",
      action: tour.next,
    };

    const backButton = {
      text: "Atrás",
      action: tour.back,
      classes: "shepherd-button-secondary",
    };

    tour.addStep({
      id: "quote-company",
      title: "1. Tu empresa",
      text: "Esta es la empresa vinculada a tu cuenta. La solicitud se registrará a nombre de esta empresa.",
      attachTo: {
        element: "[data-quote-tour='company']",
        on: sidePlacement("right"),
      },
      buttons: [nextButton],
    });

    tour.addStep({
      id: "quote-subject",
      title: "2. Describe tu solicitud",
      text: "Escribe un asunto claro y agrega observaciones que ayuden a entender lo que necesitas cotizar.",
      attachTo: {
        element: "[data-quote-tour='request-info']",
        on: sidePlacement("left"),
      },
      buttons: [backButton, nextButton],
    });

    tour.addStep({
      id: "quote-products",
      title: "3. Agrega productos",
      text: "Presiona “Agregar producto” para añadir productos. Completa sus medidas, cantidad, acabado y características.",
      attachTo: {
        element: "[data-quote-tour='products']",
        on: verticalPlacement("top"),
      },
      buttons: [backButton, nextButton],
    });

    tour.addStep({
      id: "quote-attachments",
      title: "4. Adjunta documentos",
      text: "Agrega planos, medidas o documentos de referencia para revisar tu solicitud con mayor precisión.",
      attachTo: {
        element: "[data-quote-tour='attachments']",
        on: verticalPlacement("top"),
      },
      buttons: [backButton, nextButton],
    });

    tour.addStep({
      id: "quote-submit",
      title: "5. Envía la solicitud",
      text: "Revisa la información y presiona “Guardar”. La cotización quedará como borrador y podrás editarla antes de enviarla a revisión desde la lista.",
      attachTo: {
        element: "[data-quote-tour='submit']",
        on: verticalPlacement("bottom"),
      },
      buttons: [
        backButton,
        {
          text: "Finalizar",
          action: tour.complete,
        },
      ],
    });

    tour.on("complete", () => {
      localStorage.setItem(QUOTE_TOUR_STORAGE_KEY, "true");
    });

    tour.start();
  };

  return {
    start,
  };
};
