const path = require("node:path");
const express = require("express");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");

const app = express();
const PORT = 3000;

// 1. Datos iniciales en memoria (4 reservas propias requeridas)
const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

let reservas = [
  {
    id: 1,
    estudiante: "Lucas Benitez",
    email: "lucas@ejemplo.com",
    sala: "Sala Norte",
    fecha: "2026-10-15",
    turno: "Mañana",
    personas: 3,
  },
  {
    id: 2,
    estudiante: "Mariana Costa",
    email: "mariana@ejemplo.com",
    sala: "Sala Sur",
    fecha: "2026-10-16",
    turno: "Tarde",
    personas: 2,
  },
  {
    id: 3,
    estudiante: "Julian Gomez",
    email: "julian@ejemplo.com",
    sala: "Sala Multimedia",
    fecha: "2026-10-17",
    turno: "Noche",
    personas: 5,
  },
  {
    id: 4,
    estudiante: "Sofia Perez",
    email: "sofia@ejemplo.com",
    sala: "Sala Norte",
    fecha: "2026-10-18",
    turno: "Tarde",
    personas: 4,
  },
];

let contadorSolicitudes = 0;

// 2. Middlewares globales de nivel aplicación
app.use(morgan("dev"));

// Identificador único consecutivo BIB-0001
function identificarSolicitud(req, res, next) {
  contadorSolicitudes += 1;
  res.locals.solicitudId = `BIB-${String(contadorSolicitudes).padStart(4, "0")}`;
  next();
}
app.use(identificarSolicitud);

// Medidor de duración no bloqueante
function medirDuracion(req, res, next) {
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const fin = process.hrtime.bigint();
    const duracionMs = Number(fin - inicio) / 1000000;
    console.log(
      `[${res.locals.solicitudId}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duracionMs.toFixed(2)} ms`
    );
  });
  next();
}
app.use(medirDuracion);

// Configuración de plantillas EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Archivos estáticos y procesadores de cuerpo
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 3. Rutas principales fuera del router
app.get("/", (req, res) => {
  res.render("inicio", { titulo: "Inicio - Reserva de Salas" });
});

app.get("/estado", (req, res) => {
  res.json({
    servicio: "activo",
    reservas: reservas.length,
    solicitudId: res.locals.solicitudId,
  });
});

// 4. Middlewares de validación y creación
function validarReserva(req, res, next) {
  const { estudiante, email, sala, fecha, turno, personas } = req.body;

  const estudianteLimpio = String(estudiante || "").trim();
  const emailLimpio = String(email || "").trim();
  const salaLimpia = String(sala || "").trim();
  const fechaLimpia = String(fecha || "").trim();
  const turnoLimpio = String(turno || "").trim();
  const personasNum = Number(personas);

  const personasValidas =
    Number.isInteger(personasNum) && personasNum >= 1 && personasNum <= 6;
  const emailValido = emailLimpio.includes("@");
  const salaValida = salasPermitidas.includes(salaLimpia);
  const turnoValido = turnosPermitidos.includes(turnoLimpio);

  if (
    !estudianteLimpio ||
    !fechaLimpia ||
    !emailValido ||
    !salaValida ||
    !turnoValido ||
    !personasValidas
  ) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva Reserva",
      error: "Por favor revisá los campos. Debe ser un correo válido, sala/turno permitidos y entre 1 y 6 personas.",
      valores: req.body,
      salasPermitidas,
      turnosPermitidos,
    });
  }

  req.reservaValidada = {
    estudiante: estudianteLimpio,
    email: emailLimpio,
    sala: salaLimpia,
    fecha: fechaLimpia,
    turno: turnoLimpio,
    personas: personasNum,
  };

  next();
}

function crearReserva(req, res) {
  const nuevoId =
    reservas.length > 0 ? Math.max(...reservas.map((r) => r.id)) + 1 : 1;

  const nueva = {
    id: nuevoId,
    ...req.reservaValidada,
  };

  reservas.push(nueva);
  res.redirect("/reservas");
}

// 5. Router de reservas
const reservasRouter = express.Router();

// Middleware de área: solo impacta en /reservas
function prepararAreaReservas(req, res, next) {
  res.locals.seccion = "Reservas de salas";
  next();
}
reservasRouter.use(prepararAreaReservas);

// Listado de reservas
reservasRouter.get("/", (req, res) => {
  res.render("reservas/lista", {
    titulo: "Listado de Reservas",
    reservas,
  });
});

// Formulario de reserva (antes del parámetro :id)
reservasRouter.get("/nueva", (req, res) => {
  res.render("reservas/nueva", {
    titulo: "Nueva Reserva",
    error: null,
    valores: {},
    salasPermitidas,
    turnosPermitidos,
  });
});

// Detalle individual por ID
reservasRouter.get("/:id", (req, res) => {
  const idBuscado = Number(req.params.id);
  const reserva = reservas.find((r) => r.id === idBuscado);

  if (!reserva) {
    return res.status(404).render("no-encontrado", {
      titulo: "Reserva no encontrada",
      mensaje: "No se encontró ninguna reserva con ese número identificador.",
    });
  }

  res.render("reservas/detalle", {
    titulo: `Detalle de Reserva #${reserva.id}`,
    reserva,
  });
});

// Pipeline del POST
reservasRouter.post("/", validarReserva, crearReserva);

// Montaje del router en /reservas
app.use("/reservas", reservasRouter);

// 6. Middleware final para manejar 404
app.use((req, res) => {
  res.status(404).render("no-encontrado", {
    titulo: "Página no encontrada",
    mensaje: "La página o recurso que buscás no existe.",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});