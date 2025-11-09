//  Configurá tus claves de Supabase
const SUPABASE_URL = 'https://hrvrigzzyxuookjolfid.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydnJpZ3p6eXh1b29ram9sZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzQwNzYsImV4cCI6MjA3Nzc1MDA3Nn0.Iy8hJqJbuau9YrF8AqVDmmmLSWLGaPM74hwvmA_9ruo";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioActual = null;

async function entrar() {
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) return alert("Ingresá un nombre");

  // Buscar usuario
  let { data: user } = await db
    .from('usuarios')
    .select('*')
    .eq('nombre', nombre)
    .single();

  // Si no existe, crear
  if (!user) {
    const { data, error } = await db
      .from('usuarios')
      .insert([{ nombre, saldo: 0 }])
      .select()
      .single();
    if (error) return alert("Error creando usuario");
    user = data;
  }

  usuarioActual = user.nombre;
  localStorage.setItem('usuario', usuarioActual);
  mostrarPanel();
}

async function mostrarPanel() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  document.getElementById('usuario').innerText = `Usuario: ${usuarioActual}`;
  await actualizarSaldo();
  await cargarHistorial();
}

async function actualizarSaldo() {
  const { data } = await db
    .from('usuarios')
    .select('saldo')
    .eq('nombre', usuarioActual)
    .single();
  document.getElementById('saldo').innerText = data.saldo;
}

async function transferir() {
  const receptor = document.getElementById('receptor').value.trim();
  const monto = Number(document.getElementById('monto').value);
  if (!receptor || monto <= 0) return alert("Datos inválidos");

  const { data: emisor } = await db
    .from('usuarios').select('*').eq('nombre', usuarioActual).single();
  const { data: rec } = await db
    .from('usuarios').select('*').eq('nombre', receptor).single();

  if (!rec) return alert("El receptor no existe");
  if (emisor.saldo < monto) return alert("Saldo insuficiente");

  await db.from('usuarios')
    .update({ saldo: emisor.saldo - monto })
    .eq('nombre', usuarioActual);
  await db.from('usuarios')
    .update({ saldo: rec.saldo + monto })
    .eq('nombre', receptor);

  await db.from('transacciones')
    .insert([{ 
      emisor: usuarioActual, 
      receptor, 
      monto,
      tipo: 'transferencia'
    }]);

  alert("Transferencia exitosa ✅");
  document.getElementById('receptor').value = '';
  document.getElementById('monto').value = '';
  await actualizarSaldo();
  await cargarHistorial();
}
async function depositar() {
  const montoDeposito = Number(document.getElementById('montoDeposito').value);
  if (isNaN(montoDeposito) || montoDeposito <= 0) return alert('Ingresá un monto válido');

  const { data: user, error } = await db
    .from('usuarios').select('*').eq('nombre', usuarioActual).single();
  if (error || !user) return alert('Usuario no encontrado');

  // Actualizar solo al usuario actual (filtrar por nombre)
  await db.from('usuarios')
    .update({ saldo: user.saldo + montoDeposito })
    .eq('nombre', usuarioActual);

  // Registrar el depósito en la tabla de transacciones
  await db.from('transacciones')
    .insert([{ 
      emisor: usuarioActual, 
      receptor: usuarioActual, 
      monto: montoDeposito,
      tipo: 'deposito'
    }]);

  document.getElementById('montoDeposito').value = '';
  await actualizarSaldo();
  await cargarHistorial();
  alert('Depósito realizado ✅');
}

async function cargarHistorial() {
  const { data } = await db
    .from('transacciones')
    .select('*')
    .or('emisor.eq.' + usuarioActual + ',receptor.eq.' + usuarioActual)
    .order('fecha', { ascending: false });

  const h = data.map(t => {
    if (t.tipo === 'deposito') {
      return `<p>Deposito de: $${t.monto} realizado</p>`;
    }
    const esEmisor = t.emisor === usuarioActual;
    const tipo = esEmisor ? 'enviado' : 'recibido';
    const otroUsuario = esEmisor ? t.receptor : t.emisor;
    return `<p>${tipo}: $${t.monto} ${esEmisor ? 'a' : 'de'} ${otroUsuario}</p>`;
  }).join('');
  document.getElementById('historial').innerHTML = h || "Sin movimientos";
}

function salir() {
  localStorage.removeItem('usuario');
  usuarioActual = null;
  document.getElementById('panel').style.display = 'none';
  document.getElementById('login').style.display = 'block';
}

// Restaurar sesión
const guardado = localStorage.getItem('usuario');
if (guardado) { usuarioActual = guardado; mostrarPanel(); }
