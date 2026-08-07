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
  query, 
  where,
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Elementos del DOM
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

const sinHogarBox = document.getElementById('sin-hogar-box');
const conHogarBox = document.getElementById('con-hogar-box');
const btnCrearHogar = document.getElementById('btn-crear-hogar');
const btnUnirseHogar = document.getElementById('btn-unirse-hogar');
const btnCompartir = document.getElementById('btn-compartir');
const nombreHogarInput = document.getElementById('nombre-hogar-input');
const codigoUnirseInput = document.getElementById('codigo-unirse-input');

const balanceSection = document.getElementById('balance-section');
const gastoSection = document.getElementById('gasto-section');
const historialSection = document.getElementById('historial-section');
const balanceDisplay = document.getElementById('balance-display');
const gastoForm = document.getElementById('gasto-form');
const listaGastos = document.getElementById('lista-gastos');

const tipoGastoSelect = document.getElementById('tipo-gasto');
const grupoCorreoDeudor = document.getElementById('grupo-correo-deudor');

let currentUser = null;
let currentHogar = null;
let isLogin = true;

// Formateador de Pesos Chilenos (CLP)
function formatearCLP(monto) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(monto);
}

// Ocultar/Mostrar campo de correo según tipo de gasto
tipoGastoSelect.addEventListener('change', (e) => {
  if (e.target.value === 'personal') {
    grupoCorreoDeudor.classList.add('hidden');
  } else {
    grupoCorreoDeudor.classList.remove('hidden');
  }
});

// --- 1. AUTENTICACIÓN ---

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
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    mostrarMensaje(traducirError(error.code), 'error');
  }
});

btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    escucharNotificaciones(user.email);
    await verificarHogarUsuario();
  } else {
    currentUser = null;
    currentHogar = null;
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

// --- 2. NOTIFICACIONES EN TIEMPO REAL ---

function escucharNotificaciones(userEmail) {
  const q = query(
    collection(db, 'notificaciones'), 
    where('paraEmail', '==', userEmail)
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

    snapshot.forEach((doc) => {
      const noti = doc.data();
      const div = document.createElement('div');
      div.className = 'gasto-item';
      div.style.borderLeft = '4px solid #10b981';
      div.innerHTML = `
        <div>
          <strong>📩 Nuevo gasto asignado</strong>
          <p style="font-size: 0.85rem; color: #9ca3af;">${noti.mensaje}</p>
        </div>
        <div style="color: #ef4444; font-weight: bold;">
          Debes: ${formatearCLP(noti.montoCuota)}
        </div>
      `;
      notiContainer.appendChild(div);
    });
  });
}

// --- 3. GESTIÓN DEL GRUPO DE GASTOS ---

function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

btnCrearHogar.addEventListener('click', async () => {
  const nombre = nombreHogarInput.value.trim();
  if (!nombre) return alert('Ingresa un nombre para el grupo');

  const codigo = generarCodigo();

  try {
    const docRef = await addDoc(collection(db, 'hogares'), {
      nombre: nombre,
      codigo: codigo,
      integrantes: [currentUser.uid]
    });

    currentHogar = { id: docRef.id, nombre, codigo, integrantes: [currentUser.uid] };
    mostrarHogarActivo();
  } catch (error) {
    console.error('Error al crear grupo:', error);
  }
});

btnUnirseHogar.addEventListener('click', async () => {
  const codigo = codigoUnirseInput.value.trim().toUpperCase();
  if (!codigo) return alert('Ingresa un código');

  try {
    const q = query(collection(db, 'hogares'), where('codigo', '==', codigo));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return alert('Código no encontrado.');
    }

    const hogarDoc = snapshot.docs[0];
    const data = hogarDoc.data();

    currentHogar = { id: hogarDoc.id, ...data };
    mostrarHogarActivo();
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
  }
});

btnCompartir.addEventListener('click', async () => {
  if (!currentHogar) return;

  const textoCompartir = `¡Únete a mi grupo "${currentHogar.nombre}" en CuentasClaras para compartir gastos! Usa el código: ${currentHogar.codigo}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'CuentasClaras', text: textoCompartir });
    } catch (err) {
      console.log('Compartir cancelado:', err);
    }
  } else {
    navigator.clipboard.writeText(textoCompartir);
    alert('¡Mensaje copiado al portapapeles!');
  }
});

async function verificarHogarUsuario() {
  const q = query(collection(db, 'hogares'), where('integrantes', 'array-contains', currentUser.uid));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const hogarDoc = snapshot.docs[0];
    currentHogar = { id: hogarDoc.id, ...hogarDoc.data() };
    mostrarHogarActivo();
  } else {
    sinHogarBox.classList.remove('hidden');
    conHogarBox.classList.add('hidden');
    balanceSection.classList.add('hidden');
    gastoSection.classList.add('hidden');
    historialSection.classList.add('hidden');
  }
}

function mostrarHogarActivo() {
  sinHogarBox.classList.add('hidden');
  conHogarBox.classList.remove('hidden');
  balanceSection.classList.remove('hidden');
  gastoSection.classList.remove('hidden');
  historialSection.classList.remove('hidden');

  document.getElementById('nombre-hogar-display').textContent = currentHogar.nombre;
  document.getElementById('codigo-hogar-display').textContent = currentHogar.codigo;

  cargarGastosYCalcularBalance();
}

// --- 4. REGISTRO Y CÁLCULO DE DEUDAS ---

gastoForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const titulo = document.getElementById('titulo').value.trim();
  const categoria = document.getElementById('categoria').value;
  const monto = parseFloat(document.getElementById('monto').value);
  const tipoGasto = document.getElementById('tipo-gasto').value;
  const correoDeudor = document.getElementById('correo-deudor').value.trim();
  const enlace = document.getElementById('enlace').value.trim();

  const esCompartido = tipoGasto === 'compartido';

  try {
    await addDoc(collection(db, 'gastos'), {
      hogarId: currentHogar.id,
      titulo: titulo,
      categoria: categoria,
      monto: monto,
      esCompartido: esCompartido,
      compartidoConEmail: esCompartido ? correoDeudor : null,
      enlaceComprobante: enlace,
      pagadoPor: currentUser.uid,
      pagadoPorEmail: currentUser.email,
      pagadoPorNombre: currentUser.email.split('@')[0],
      fecha: new Date().toISOString()
    });

    if (esCompartido && correoDeudor) {
      const cuota = monto / 2;
      await addDoc(collection(db, 'notificaciones'), {
        paraEmail: correoDeudor,
        deEmail: currentUser.email,
        mensaje: `${currentUser.email.split('@')[0]} te ha añadido al gasto "${titulo}" (${categoria}) en CuentasClaras.`,
        montoCuota: cuota,
        fecha: new Date().toISOString()
      });
    }

    gastoForm.reset();
    cargarGastosYCalcularBalance();
    alert('¡Gasto registrado en CuentasClaras correctamente!');
  } catch (error) {
    console.error('Error al guardar gasto:', error);
  }
});

async function cargarGastosYCalcularBalance() {
  const q = query(collection(db, 'gastos'), where('hogarId', '==', currentHogar.id));
  const snapshot = await getDocs(q);

  let totalCompartido = 0;
  let pagadoPorMiCompartido = 0;

  listaGastos.innerHTML = '';

  snapshot.forEach((doc) => {
    const gasto = doc.data();

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
      <div><strong>${formatearCLP(gasto.monto)}</strong></div>
    `;
    listaGastos.appendChild(li);
  });

  const cuotaPorPersona = totalCompartido / 2;
  const miDiferencia = pagadoPorMiCompartido - cuotaPorPersona;

  if (miDiferencia > 0) {
    balanceDisplay.innerHTML = `<span style="color: #10b981;">Te deben: ${formatearCLP(miDiferencia)}</span>`;
  } else if (miDiferencia < 0) {
    balanceDisplay.innerHTML = `<span style="color: #ef4444;">Debes: ${formatearCLP(Math.abs(miDiferencia))}</span>`;
  } else {
    balanceDisplay.innerHTML = `<span>¡Cuentas al día! No hay deudas pendientes.</span>`;
  }
}

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