import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCNdCZZ3ZHnAb4N9wMJpt4Mrn5-DKBvuFE",
    authDomain: "padres-vida.firebaseapp.com",
    projectId: "padres-vida",
    storageBucket: "padres-vida.firebasestorage.app",
    messagingSenderId: "358254237263",
    appId: "1:358254237263:web:f8f9ef3114ccc6c5fa7c3a",
    measurementId: "G-64HFVNPCRM"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Generar event_id para deduplicación Pixel + CAPI
function generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}
// 🔹 Funciones auxiliares para Meta cookies

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

function getFbcFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get("fbclid");
    if (fbclid) {
        const timestamp = Date.now();
        return `fb.1.${Math.floor(timestamp / 1000)}.${fbclid}`;
    }
    return null;
}


async function guardarSolicitudCotizacion(formData) {
    try {
        const eventId = generateEventId();
        // Obtener IP pública
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        const ip = ipData.ip;

        // Obtener user agent
        const userAgent = navigator.userAgent;

        // Obtener datos de Facebook cookies
        const fbp = getCookie("_fbp") || null;
        const fbc = getFbcFromUrl() || getCookie("_fbc") || null;

        const solicitud = {
            name: formData.nombre,
            fechaNacimiento: formData.fechaNacimiento,
            phone: formData.whatsapp,
            email: formData.email,
            ingresoMensual: parseFloat(formData.ingresoMensual),
            numeroHijos: formData.numeroHijos,
            ip,
            user_agent: userAgent,
            fbp,
            fbc,
            eventId,
            timestamp: serverTimestamp()
        }

        // Guardar en Firestore
        const docRef = await addDoc(collection(db, "solicitudes_cotizacion"), solicitud);

        console.log("✅ Solicitud enviada correctamente. Documento creado:", docRef.id);
        
        
        // Tracking de Meta Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead', {
                value: parseFloat(formData.ingresoMensual),
                currency: "COP",
                ingreso_mensual: parseFloat(formData.ingresoMensual),
                numero_hijos: formData.numeroHijos
            }, {
                eventID: eventId
            });
        }

        return true;
    } catch (error) {
        console.error("❌ Error al guardar la solicitud:", error);
        return false;
    }
}

// Manejo del formulario
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mainForm');
    const successMessage = document.getElementById('successMessage');

    // Formatear ingreso mensual como moneda
    const ingresoInput = document.getElementById('ingresoMensual');
    
    function formatNumber(value) {
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    function formatInputCurrency(input) {
        let value = input.value.replace(/\D/g, '');
        if (value) {
            input.value = formatNumber(parseInt(value));
        }
    }

    ingresoInput.addEventListener('input', function() {
        formatInputCurrency(this);
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Obtener datos del formulario
        const ingresoValue = document.getElementById('ingresoMensual').value.replace(/\D/g, '');
        
        const formData = {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            whatsapp: document.getElementById('whatsapp').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            numeroHijos: document.getElementById('numeroHijos').value,
            ingresoMensual: ingresoValue
        };

        // Validar que todos los campos estén completos
        if (!formData.nombre || !formData.email || !formData.whatsapp || 
            !formData.fechaNacimiento || !formData.numeroHijos || !formData.ingresoMensual) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }

        // Deshabilitar el botón de envío
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = 'Enviando...';

        // Guardar la solicitud
        const success = await guardarSolicitudCotizacion(formData);

        if (success) {
            // Ocultar formulario y mostrar mensaje de éxito
            form.style.display = 'none';
            successMessage.style.display = 'block';
            
            // Actualizar el nombre en el mensaje de éxito
            document.getElementById('nombreUsuario').textContent = formData.nombre.split(' ')[0];

            // Scroll al mensaje de éxito
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert('Hubo un error al enviar tu solicitud. Por favor intenta nuevamente.');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });

    // Validación en tiempo real del email
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', function() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.value && !emailRegex.test(this.value)) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '';
        }
    });

    // Validación del número de WhatsApp (solo números)
    const whatsappInput = document.getElementById('whatsapp');
    whatsappInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
    });
});