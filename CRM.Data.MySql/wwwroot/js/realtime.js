// Actualizaciones en tiempo real mediante Server-Sent Events (SSE).

let crmRealtimeSource = null;
let crmRealtimeTimer = null;
let crmRealtimePending = false;
let crmRealtimeLastRefresh = 0;

function programarActualizacionTiempoReal() {
    if (document.visibilityState !== "visible") {
        crmRealtimePending = true;
        return;
    }

    const esperaMinima = moduloActual === "marketing" ? 10000 : 1200;
    const espera = Math.max(700, esperaMinima - (Date.now() - crmRealtimeLastRefresh));
    clearTimeout(crmRealtimeTimer);
    crmRealtimeTimer = setTimeout(async () => {
        crmRealtimePending = false;
        crmRealtimeLastRefresh = Date.now();
        const vista = document.getElementById("moduleView");

        try {
            if (moduloActual === "dashboard" && vista && typeof cargarModuloDashboard === "function") {
                await cargarModuloDashboard(vista);
            } else if (moduloActual === "marketing" && vista && typeof cargarModuloMarketing === "function") {
                await cargarModuloMarketing(vista);
            } else if (moduloActual === "inbox" && typeof actualizarCRM === "function") {
                await actualizarCRM();
            }
        } catch (error) {
            if (error?.name !== "AbortError") {
                console.warn("No se pudo aplicar la actualización en tiempo real.", error);
            }
        }
    }, espera);
}

function iniciarActualizacionesTiempoReal() {
    if (!window.EventSource || crmRealtimeSource) return;

    crmRealtimeSource = new EventSource("/api/realtime/events", { withCredentials: true });
    crmRealtimeSource.addEventListener("changed", programarActualizacionTiempoReal);
    crmRealtimeSource.onerror = () => {
        // EventSource reintenta automáticamente; el polling queda como respaldo.
        estado && (estado.textContent = "Reconectando actualizaciones...");
    };
    crmRealtimeSource.addEventListener("connected", () => {
        estado && (estado.textContent = "API conectada · tiempo real");
    });
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && crmRealtimePending) {
        programarActualizacionTiempoReal();
    }
});

window.addEventListener("beforeunload", () => crmRealtimeSource?.close());
