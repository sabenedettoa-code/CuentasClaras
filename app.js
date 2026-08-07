import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- CONFIGURACIÓN DE EMAILJS ---
const EMAILJS_PUBLIC_KEY = "e_uovUaQx61cm7X24"; 
const EMAILJS_SERVICE_ID = "service_v89l5mz"; 
const EMAILJS_TEMPLATE_ID = "template_qiaonxj"; 

if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtECy4MkyBnzYG_ZtIGDLl_75Yedo66NM",
  authDomain: "gastoshogarapp-1bbae.firebaseapp.com",
  projectId: "gastoshogarapp-1bbae",
  storageBucket: "gastoshogarapp-1bbae.firebasestorage.app",
  messagingSenderId: "1040938444301",
  appId: "1:1040938444301:web:e5563e8662aa950551d744",
  measurementId: "G-JMS3FCFM4L"
};

const VERCEL_APP_URL = "https://appcuentasclaras.vercel.app";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Elementos DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnSubmit = document.getElementById('btn-submit');
const btnToggle = document.getElementById('btn-toggle');
const btnGoogle = document.getElementById('btn-google');
const btnLogout = document.getElementById('btn-logout');
const authTitle = document.getElementById('auth-title');
const toggleText = document.getElementById('toggle-text');
const authMessage = document.getElementById('auth-message');

const welcomeUserTitle = document.getElementById('welcome-user-title');
const btnInstallPwa = document.getElementById('btn-install-pwa');

const modalTutorial = document.getElementById('modal-tutorial');
const btnTutorial = document.getElementById('btn-tutorial');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnEntendido = document.getElementById('btn-entendido');

const modalPrivacy = document.getElementById('modal-privacy');
const btnPrivacyAuth = document.getElementById('btn-privacy-auth');
const btnPrivacyApp = document.getElementById('btn-privacy-app');
const btnClosePrivacy = document.getElementById('btn-close-privacy');
const btnEntendidoPrivacy = document.getElementById('btn-entendido-privacy');

// Elementos del Modal de Pago
const modalPago = document.getElementById('modal-pago');
const formPago = document.getElementById('form-pago');
const btnClosePago = document.getElementById('btn-close-pago');
const btnOmitirPago = document.getElementById('btn-omitir-pago');
const inputPagoDeEmail = document.getElementById('pago-de-email');
const inputPagoParaEmail = document.getElementById('pago-para-email');
const inputPagoTituloGasto = document.getElementById('pago-titulo-gasto');
const inputPagoMontoCuota = document.getElementById('pago-monto-cuota');
const inputPagoNotiId = document.getElementById('pago-noti-id');
const linkComprobantePago = document.getElementById('link-comprobante-pago');

const modalConfirm = document.getElementById('modal-confirm');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmIcon = document.getElementById('confirm-icon');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const btnConfirmAccept = document.getElementById('btn-confirm-accept');

const selectGrupos = document.getElementById('select-grupos');
const sinHogarBox = document.getElementById('sin-hogar-box');
const conHogarBox = document.getElementById('con-hogar-box');
const btnCrearHogar = document.getElementById('btn-crear-hogar');
const btnUnirseHogar = document.getElementById('btn-unirse-hogar');
const btnCompartir = document.getElementById('btn-compartir');
const nombreHogarInput = document.getElementById('nombre-hogar-input');
const codigoUnirseInput = document.getElementById('codigo-unirse-input');

const btnRenombrarGrupo = document.getElementById('btn-renombrar-grupo');
const btnEliminarGrupo = document.getElementById('btn-eliminar-grupo');

const balanceSection = document.getElementById('balance-section');
const gastoSection = document.getElementById('gasto-section');
const historialSection = document.getElementById('historial-section');
const balanceDisplay = document.getElementById('balance-display');
const btnSaldar = document.getElementById('btn-saldar');
const gastoForm = document.getElementById('gasto-form');
const listaGastos = document.getElementById('lista-gastos');

const tipoGastoSelect = document.getElementById('tipo-gasto');
const grupoCorreoDeudor = document.getElementById('grupo-correo-deudor');

let currentUser = null;
let currentHogar = null;
let listaMisGrupos = [];
let isLogin = true;
let unsubscribeGastos = null;
let unsubscribeHogar = null;
let deferredPrompt = null;

function formatearCLP(monto) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(monto);
}

// PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstallPwa.classList.remove('hidden');
});

btnInstallPwa.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      btnInstallPwa.classList.add('hidden');
    }
    deferredPrompt = null;
  }
});

// VENTANA FLOTANTE DE CONFIRMACIÓN
function mostrarConfirmacion({ titulo, mensaje, icono = '⚠️', textoBoton = 'Confirmar' }) {
  return new Promise((resolve) => {
    confirmTitle.textContent = titulo;
    confirmMessage.textContent = mensaje;
    confirmIcon.textContent = icono;
    btnConfirmAccept.textContent = textoBoton;

    modalConfirm.classList.remove('hidden');

    const handleAccept = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modalConfirm.classList.add('hidden');
      btnConfirmAccept.removeEventListener('click', handleAccept);
      btnConfirmCancel.removeEventListener('click', handleCancel);
    };

    btnConfirmAccept.addEventListener('click', handleAccept);
    btnConfirmCancel.addEventListener('click', handleCancel);
  });
}

// MODALES
btnTutorial.addEventListener('click', () => modalTutorial.classList.remove('hidden'));
btnCloseModal.addEventListener('click', () => modalTutorial.classList.add('hidden'));
btnEntendido.addEventListener('click', () => modalTutorial.classList.add('hidden'));

btnPrivacyAuth.addEventListener('click', () => modalPrivacy.classList.remove('hidden'));
btnPrivacyApp.addEventListener('click', () => modalPrivacy.classList.remove('hidden'));
btnClosePrivacy.addEventListener('click', () => modalPrivacy.classList.add('hidden'));
btnEntendidoPrivacy.addEventListener('click', () => modalPrivacy.classList.add('hidden'));

btnClosePago.addEventListener('click', () => modalPago.classList.add('hidden'));

tipoGastoSelect.addEventListener('change', (e) => {
  if (e.target.value === 'personal') {
    grupoCorreoDeudor.classList.add('hidden');
  } else {
    grupoCorreoDeudor.classList.remove('hidden');
  }
});

// AUTENTICACIÓN
btnToggle.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'CuentasClaras' : 'Crear Cuenta';
  btnSubmit.textContent = isLogin ? 'Entrar' : 'Registrarse';
  toggleText.textContent = isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
  btnToggle.textContent = isLogin ? 'Registrarse' : 'Iniciar Sesión';
  authMessage.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  mostrarMensaje('Procesando...', 'info');

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    mostrarMensaje(traducirError(error.code), 'error');
  }
});

btnGoogle.addEventListener('click', async () => {
  mostrarMensaje('Conectando con Google...', 'info');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Usuario autenticado con Google:', result.user);
  } catch (error) {
    console.error('Error al iniciar sesión con Google:', error);
    if (error.code === 'auth/unauthorized-domain') {
      mostrarMensaje('Error: Dominio no autorizado. Agrega appcuentasclaras.vercel.app en Firebase Auth.', 'error');
    } else if (error.code === 'auth/popup-closed-by-user') {
      mostrarMensaje('La ventana de inicio de sesión fue cerrada.', 'info');
    } else {
      mostrarMensaje(`Error con Google: ${error.message}`, 'error');
    }
  }
});

btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    
    const nombreUsuario = user.displayName || user.email.split('@')[0];
    welcomeUserTitle.textContent = `¡Bienvenido/a de nuevo, ${nombreUsuario}!`;

    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    escucharNotificaciones(user.email);
    await cargarGruposUsuario();
  } else {
    if (unsubscribeGastos) unsubscribeGastos();
    if (unsubscribeHogar) unsubscribeHogar();
    currentUser = null;
    currentHogar = null;
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

// NOTIFICACIONES EN TIEMPO REAL CON BOTÓN PARA ADJUNTAR PAGO
function escucharNotificaciones(userEmail) {
  const q = query(
    collection(db, 'notificaciones'), 
    where('paraEmail', '==', userEmail),
    where('leida', '==', false)
  );

  onSnapshot(q, (snapshot) => {
    const notiSection = document.getElementById('notificaciones-section');
    const notiContainer = document.getElementById('lista-notificaciones');
    
    if (snapshot.empty) {
      notiSection.classList.add('hidden');
      return;
    }

    notiSection.classList.remove('hidden');
    notiContainer.innerHTML = '';

    snapshot.forEach((documento) => {
      const noti = documento.data();
      const div = document.createElement('div');
      div.className = 'gasto-item';
      div.style.borderLeft = '4px solid #10b981';
      div.innerHTML = `
        <div>
          <strong>📩 Nuevo gasto asignado</strong>
          <p style="font-size: 0.85rem; color: #9ca3af;">${noti.mensaje}</p>
          <button class="btn-noti-check" 
                  data-id="${documento.id}"
                  data-de="${noti.deEmail}"
                  data-monto="${noti.montoCuota || 0}"
                  data-titulo="${noti.mensaje}">
            ✓ Marcar como enterado / Enviar Pago
          </button>
        </div>
        <div style="color: #ef4444; font-weight: bold;">
          Debes: ${formatearCLP(noti.montoCuota || 0)}
        </div>
      `;
      notiContainer.appendChild(div);
    });

    // Abrir modal de comprobante de pago al hacer clic
    document.querySelectorAll('.btn-noti-check').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const notiId = e.target.dataset.id;
        const deEmail = e.target.dataset.de;
        const monto = e.target.dataset.monto;
        const titulo = e.target.dataset.titulo;

        inputPagoNotiId.value = notiId;
        inputPagoParaEmail.value = deEmail;
        inputPagoMontoCuota.value = monto;
        inputPagoTituloGasto.value = titulo;

        linkComprobantePago.value = '';
        modalPago.classList.remove('hidden');
      });
    });
  });
}

// OMITIR PAGO (Solo marcar leída)
btnOmitirPago.addEventListener('click', async () => {
  const notiId = inputPagoNotiId.value;
  if (notiId) {
    await updateDoc(doc(db, 'notificaciones', notiId), { leida: true });
  }
  modalPago.classList.add('hidden');
});

// FORMULARIO DE ENVÍO DE COMPROBANTE DE PAGO
formPago.addEventListener('submit', async (e) => {
  e.preventDefault();

  const notiId = inputPagoNotiId.value;
  const paraEmail = inputPagoParaEmail.value;
  const monto = parseFloat(inputPagoMontoCuota.value);
  const titulo = inputPagoTituloGasto.value;
  const linkComprobante = linkComprobantePago.value.trim();

  try {
    // 1. Marcar notificación previa como leída
    if (notiId) {
      await updateDoc(doc(db, 'notificaciones', notiId), { leida: true });
    }

    // 2. Crear notificación INTERNA para la persona que cobró
    await addDoc(collection(db, 'notificaciones'), {
      paraEmail: paraEmail,
      deEmail: currentUser.email,
      mensaje: `💸 ${currentUser.email.split('@')[0]} te ha transferido su cuota para "${titulo}". Comprobante: ${linkComprobante}`,
      montoCuota: 0,
      leida: false,
      fecha: new Date().toISOString()
    });

    // 3. Enviar CORREO REAL mediante EmailJS a la persona que cobró
    if (typeof emailjs !== "undefined") {
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          to_email: paraEmail,
          from_name: currentUser.email.split('@')[0],
          from_email: currentUser.email,
          titulo: `Pago de: ${titulo}`,
          categoria: "Transferencia Recibida",
          monto_cuota: `${formatearCLP(monto)} (Comprobante: ${linkComprobante})`
        });
      } catch (errEmail) {
        console.error("Error al enviar correo de confirmación de pago:", errEmail);
      }
    }

    modalPago.classList.add('hidden');
    alert('¡Comprobante de transferencia enviado con éxito!');
  } catch (error) {
    console.error('Error al procesar pago:', error);
  }
});

// GESTIÓN Y ADMINISTRACIÓN DE GRUPOS
function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function cargarGruposUsuario() {
  const q = query(collection(db, 'hogares'), where('integrantes', 'array-contains', currentUser.uid));
  const snapshot = await getDocs(q);

  listaMisGrupos = [];
  selectGrupos.innerHTML = '';

  if (snapshot.empty) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "-- No tienes grupos aún --";
    selectGrupos.appendChild(opt);
    
    conHogarBox.classList.add('hidden');
    balanceSection.classList.add('hidden');
    gastoSection.classList.add('hidden');
    historialSection.classList.add('hidden');
    return;
  }

  snapshot.forEach(documento => {
    listaMisGrupos.push({ id: documento.id, ...documento.data() });
  });

  listaMisGrupos.forEach((grupo) => {
    const opt = document.createElement('option');
    opt.value = grupo.id;
    opt.textContent = `📁 ${grupo.nombre}`;
    selectGrupos.appendChild(opt);
  });

  seleccionarGrupoActivo(listaMisGrupos[0].id);
}

selectGrupos.addEventListener('change', (e) => {
  if (e.target.value) {
    seleccionarGrupoActivo(e.target.value);
  }
});

function seleccionarGrupoActivo(grupoId) {
  currentHogar = listaMisGrupos.find(g => g.id === grupoId);
  if (!currentHogar) return;

  conHogarBox.classList.remove('hidden');
  balanceSection.classList.remove('hidden');
  gastoSection.classList.remove('hidden');
  historialSection.classList.remove('hidden');

  if (unsubscribeHogar) unsubscribeHogar();
  unsubscribeHogar = onSnapshot(doc(db, 'hogares', currentHogar.id), (docSnap) => {
    if (docSnap.exists()) {
      currentHogar = { id: docSnap.id, ...docSnap.data() };
      document.getElementById('codigo-hogar-display').textContent = currentHogar.codigo;
      document.getElementById('integrantes-count').textContent = currentHogar.integrantes ? currentHogar.integrantes.length : 1;
      escucharGastosEnTiempoReal();
    }
  });
}

btnRenombrarGrupo.addEventListener('click', async () => {
  if (!currentHogar) return;

  const nuevoNombre = prompt(`Ingresa el nuevo nombre para "${currentHogar.nombre}":`, currentHogar.nombre);
  if (nuevoNombre && nuevoNombre.trim() !== '' && nuevoNombre !== currentHogar.nombre) {
    await updateDoc(doc(db, 'hogares', currentHogar.id), {
      nombre: nuevoNombre.trim()
    });
    await cargarGruposUsuario();
    seleccionarGrupoActivo(currentHogar.id);
  }
});

btnEliminarGrupo.addEventListener('click', async () => {
  if (!currentHogar) return;

  const confirmado = await mostrarConfirmacion({
    titulo: `¿Eliminar el grupo "${currentHogar.nombre}"?`,
    mensaje: 'Se borrarán el grupo y todos los gastos registrados en él. Esta acción es irreversible.',
    icono: '🗑️',
    textoBoton: 'Eliminar Grupo'
  });

  if (confirmado) {
    const qGastos = query(collection(db, 'gastos'), where('hogarId', '==', currentHogar.id));
    const snapshotGastos = await getDocs(qGastos);
    snapshotGastos.forEach(async (documento) => {
      await deleteDoc(doc(db, 'gastos', documento.id));
    });

    await deleteDoc(doc(db, 'hogares', currentHogar.id));
    await cargarGruposUsuario();
  }
});

btnCrearHogar.addEventListener('click', async () => {
  const nombre = nombreHogarInput.value.trim();
  if (!nombre) return;

  const codigo = generarCodigo();

  try {
    const docRef = await addDoc(collection(db, 'hogares'), {
      nombre: nombre,
      codigo: codigo,
      integrantes: [currentUser.uid]
    });

    nombreHogarInput.value = '';
    await cargarGruposUsuario();
    seleccionarGrupoActivo(docRef.id);
  } catch (error) {
    console.error('Error al crear grupo:', error);
  }
});

btnUnirseHogar.addEventListener('click', async () => {
  const codigo = codigoUnirseInput.value.trim().toUpperCase();
  if (!codigo) return;

  try {
    const q = query(collection(db, 'hogares'), where('codigo', '==', codigo));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const hogarDoc = snapshot.docs[0];
    const data = hogarDoc.data();

    if (!data.integrantes.includes(currentUser.uid)) {
      data.integrantes.push(currentUser.uid);
      await updateDoc(doc(db, 'hogares', hogarDoc.id), { integrantes: data.integrantes });
    }

    codigoUnirseInput.value = '';
    await cargarGruposUsuario();
    seleccionarGrupoActivo(hogarDoc.id);
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
  }
});

btnCompartir.addEventListener('click', async () => {
  if (!currentHogar) return;

  const textoCompartir = `¡Únete a mi grupo "${currentHogar.nombre}" en CuentasClaras para compartir gastos! Ingresa a ${VERCEL_APP_URL} y usa el código: ${currentHogar.codigo}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'CuentasClaras', text: textoCompartir, url: VERCEL_APP_URL });
    } catch (err) {
      console.log('Compartir cancelado:', err);
    }
  } else {
    navigator.clipboard.writeText(textoCompartir);
  }
});

// REGISTRO Y REPARTO DE GASTOS
gastoForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentHogar) return;

  const titulo = document.getElementById('titulo').value.trim();
  const categoria = document.getElementById('categoria').value;
  const monto = parseFloat(document.getElementById('monto').value);
  const tipoGasto = document.getElementById('tipo-gasto').value;
  const correosRaw = document.getElementById('correo-deudor').value.trim();
  const enlace = document.getElementById('enlace').value.trim();

  const esCompartido = tipoGasto === 'compartido';

  let correosLista = [];
  if (esCompartido && correosRaw) {
    correosLista = correosRaw
      .split(',')
      .map(c => c.trim().toLowerCase())
      .filter(c => c.length > 0 && c !== currentUser.email);
  }

  const numIntegrantesGroup = Math.max(2, (currentHogar.integrantes ? currentHogar.integrantes.length : 2));
  const totalPersonasDividiendo = correosLista.length > 0 ? (1 + correosLista.length) : numIntegrantesGroup;
  const cuotaPorPersona = monto / totalPersonasDividiendo;

  try {
    await addDoc(collection(db, 'gastos'), {
      hogarId: currentHogar.id,
      titulo: titulo,
      categoria: categoria,
      monto: monto,
      esCompartido: esCompartido,
      compartidoConEmails: correosLista,
      enlaceComprobante: enlace,
      pagadoPor: currentUser.uid,
      pagadoPorEmail: currentUser.email,
      pagadoPorNombre: currentUser.email.split('@')[0],
      fecha: new Date().toISOString()
    });

    if (esCompartido && correosLista.length > 0) {
      for (const correoDestino of correosLista) {
        
        await addDoc(collection(db, 'notificaciones'), {
          paraEmail: correoDestino,
          deEmail: currentUser.email,
          mensaje: `${currentUser.email.split('@')[0]} te ha añadido al gasto "${titulo}" (${categoria}) en CuentasClaras (${VERCEL_APP_URL}).`,
          montoCuota: cuotaPorPersona,
          leida: false,
          fecha: new Date().toISOString()
        });

        if (typeof emailjs !== "undefined") {
          try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
              to_email: correoDestino,
              from_name: currentUser.email.split('@')[0],
              from_email: currentUser.email,
              titulo: titulo,
              categoria: categoria,
              monto_cuota: formatearCLP(cuotaPorPersona)
            });
          } catch (errEmail) {
            console.error("Error al enviar correo con EmailJS:", errEmail);
          }
        }
      }
    }

    gastoForm.reset();
  } catch (error) {
    console.error('Error al guardar gasto:', error);
  }
});

function escucharGastosEnTiempoReal() {
  if (unsubscribeGastos) unsubscribeGastos();

  const q = query(collection(db, 'gastos'), where('hogarId', '==', currentHogar.id));

  unsubscribeGastos = onSnapshot(q, (snapshot) => {
    let totalCompartido = 0;
    let pagadoPorMiCompartido = 0;

    listaGastos.innerHTML = '';

    snapshot.forEach((documento) => {
      const gasto = documento.data();

      if (gasto.esCompartido) {
        totalCompartido += gasto.monto;
        if (gasto.pagadoPor === currentUser.uid) {
          pagadoPorMiCompartido += gasto.monto;
        }
      }

      const tagClase = gasto.esCompartido ? 'tag-compartido' : 'tag-personal';
      const tagTexto = gasto.esCompartido ? 'Compartido' : 'Personal';

      const li = document.createElement('li');
      li.className = 'gasto-item';
      li.innerHTML = `
        <div>
          <strong>${gasto.categoria} - ${gasto.titulo}</strong>
          <span class="gasto-tag ${tagClase}">${tagTexto}</span>
          <br><small>Pagado por: ${gasto.pagadoPorNombre}</small>
          ${gasto.enlaceComprobante ? `<br><a href="${gasto.enlaceComprobante}" target="_blank" class="gasto-link">📄 Ver Comprobante</a>` : ''}
        </div>
        <div class="gasto-actions">
          <strong>${formatearCLP(gasto.monto)}</strong>
          ${gasto.pagadoPor === currentUser.uid ? `<button class="btn-delete" data-id="${documento.id}" title="Eliminar gasto">🗑️</button>` : ''}
        </div>
      `;
      listaGastos.appendChild(li);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const confirmado = await mostrarConfirmacion({
          titulo: '¿Eliminar este gasto?',
          mensaje: 'El registro se borrará del historial y afectará el cálculo del balance.',
          icono: '🗑️',
          textoBoton: 'Eliminar'
        });

        if (confirmado) {
          const gastoId = e.target.dataset.id;
          await deleteDoc(doc(db, 'gastos', gastoId));
        }
      });
    });

    const numIntegrantesGroup = Math.max(2, (currentHogar.integrantes ? currentHogar.integrantes.length : 2));
    const cuotaPorPersona = totalCompartido / numIntegrantesGroup;
    const miDiferencia = pagadoPorMiCompartido - cuotaPorPersona;

    if (miDiferencia > 0) {
      balanceDisplay.innerHTML = `<span style="color: #10b981;">A tu favor en "${currentHogar.nombre}": ${formatearCLP(miDiferencia)}</span>`;
      btnSaldar.classList.remove('hidden');
    } else if (miDiferencia < 0) {
      balanceDisplay.innerHTML = `<span style="color: #ef4444;">Debes en "${currentHogar.nombre}": ${formatearCLP(Math.abs(miDiferencia))}</span>`;
      btnSaldar.classList.remove('hidden');
    } else {
      balanceDisplay.innerHTML = `<span>¡Cuentas al día en "${currentHogar.nombre}"! No hay deudas pendientes.</span>`;
      btnSaldar.classList.add('hidden');
    }
  });
}

btnSaldar.addEventListener('click', async () => {
  const confirmado = await mostrarConfirmacion({
    titulo: '¿Saldar cuentas del grupo?',
    mensaje: `Confirmas que ya se realizó el pago. Las cuentas de "${currentHogar.nombre}" volverán a cero.`,
    icono: '✅',
    textoBoton: 'Saldar Cuentas'
  });

  if (confirmado) {
    const q = query(collection(db, 'gastos'), where('hogarId', '==', currentHogar.id));
    const snapshot = await getDocs(q);

    snapshot.forEach(async (documento) => {
      const gasto = documento.data();
      if (gasto.esCompartido) {
        await updateDoc(doc(db, 'gastos', documento.id), { esCompartido: false });
      }
    });
  }
});

function mostrarMensaje(texto, tipo) {
  authMessage.textContent = texto;
  authMessage.className = `message ${tipo}`;
}

function traducirError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'El correo ya está registrado.';
    case 'auth/invalid-credential': return 'Credenciales incorrectas.';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    default: return `Error: ${code}`;
  }
}