const path = require("node:path");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");

const app = express();
const PORT = 3000;

// 1. Datos iniciales en memoria (originales, dominio: salas de estudio)
let reservas = [
  {
    id: 1,
    responsable: "Mariana Costa",
    email: "mcosta@universidad.edu.ar",
    sala: "Sala Grupal B",
    personas: 4,
    horario: "10:00 a 12:00",
    motivo: "Preparación para examen final de Algoritmos",
  },
  {
    id: 2,
    responsable: "Esteban Quiroga",
    email: "equiroga@estudiantes.edu.ar",
    sala: "Sala Silenciosa A",
    personas: 1,
    horario: "12:30 a 14:30",
    motivo: "Lectura individual de tesis de grado",
  },
  {
    id: 3,
    responsable: "Sofia Mendez",
    email: "smendez@universidad.edu.ar",
    sala: "Sala Multimedia C",
    personas: 3,
    horario: "15:00 a 17:00",
    motivo: "Edición de video y presentación de proyecto final",
  },
];

let numeroDeSolicitud = 0;

// Configuración de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// -------------------------------------------------------------
// PIPELINE DE MIDDLEWARES A NIVEL DE APLICACIÓN
// -------------------------------------------------------------

// A. Morgan (logger de terceros)
app.use(morgan("dev"));

// B. Identificador de solicitud personalizado (asigna res.locals.solicitudId)
function identificarSolicitud(req, res, next) {
  numeroDeSolicitud += 1;
  res.locals.solicitudId = `SOL-${String(numeroDeSolicitud).padStart(4, "0")}`;
  next();
}
app.use(identificarSolicitud);

// C. Medición de duración personalizada (escucha res.on('finish'))
function medirDuracion(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on("finish", () => {
    const fin = process.hrtime.bigint();
    const milisegundos = Number(fin - inicio) / 1_000_000;
    console.log(
      `[${res.locals.solicitudId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${milisegundos.toFixed(2)} ms`
    );
  });

  next();
}
app.use(medirDuracion);

// D. Archivos estáticos
app.use(express.static(path.join(__dirname, "..", "public")));

// E. Parseo del cuerpo de formularios
app.use(express.urlencoded({ extended: false }));

// Ruta de portada
app.get("/", (req, res) => {
  res.render("inicio", { titulo: "Inicio" });
});

// -------------------------------------------------------------
// ROUTER DE RESERVAS (express.Router montado bajo /reservas)
// -------------------------------------------------------------
const reservasRouter = express.Router();

// Middleware de validación extraído fuera del handler final de creación
function validarReserva(req, res, next) {
  const { responsable, email, sala, personas, horario, motivo } = req.body;
  const personasNum = Number(personas);

  // Validación de campos vacíos
  if (!responsable?.trim() || !email?.trim() || !sala?.trim() || !horario?.trim() || !motivo?.trim()) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva Reserva",
      error: "Todos los campos son obligatorios.",
      valores: req.body,
    });
  }

  // Validación de email: debe contener '@'
  if (!email.includes("@")) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva Reserva",
      error: "El correo electrónico debe ser válido y contener un '@'.",
      valores: req.body,
    });
  }

  // Validación de personas: entre 1 y 6 inclusive (0 o 7 rechazan con 400)
  if (Number.isNaN(personasNum) || personasNum < 1 || personasNum > 6) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva Reserva",
      error: "La cantidad de personas debe ser un número entre 1 y 6.",
      valores: req.body,
    });
  }

  // Si todo es válido, continúa al siguiente middleware (handler de creación)
  next();
}

// Rutas dentro del Router
reservasRouter.get("/", (req, res) => {
  res.render("reservas/lista", {
    titulo: "Listado de Reservas",
    reservas,
  });
});

reservasRouter.get("/nueva", (req, res) => {
  res.render("reservas/nueva", {
    titulo: "Nueva Reserva",
    error: null,
    valores: {},
  });
});

reservasRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const reserva = reservas.find((r) => r.id === id);

  if (!reserva) {
    return res.status(404).render("no-encontrado", {
      titulo: "Reserva no encontrada",
      mensaje: "No se encontró ninguna reserva asociada a ese identificador.",
    });
  }

  res.render("reservas/detalle", {
    titulo: `Reserva #${reserva.id}`,
    reserva,
  });
});

// Alta en memoria usando el middleware de validación previo
reservasRouter.post("/", validarReserva, (req, res) => {
  const { responsable, email, sala, personas, horario, motivo } = req.body;
  const nuevoId = reservas.length > 0 ? Math.max(...reservas.map((r) => r.id)) + 1 : 1;

  const nueva = {
    id: nuevoId,
    responsable: responsable.trim(),
    email: email.trim(),
    sala: sala.trim(),
    personas: Number(personas),
    horario: horario.trim(),
    motivo: motivo.trim(),
  };

  reservas.push(nueva);
  res.redirect("/reservas");
});

// Montaje del Router bajo el prefijo /reservas
app.use("/reservas", reservasRouter);

// -------------------------------------------------------------
// MIDDLEWARE FINAL 404
// -------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render("no-encontrado", {
    titulo: "Página no encontrada",
    mensaje: "La dirección solicitada no existe.",
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});