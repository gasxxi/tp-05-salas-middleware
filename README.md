# Trabajo práctico 05

## Descripción
En este trabajo práctico construí una aplicación con Express y EJS para gestionar reservas de salas de estudio en una biblioteca universitaria. El foco estuvo puesto en estructurar el pipeline de middleware: registrar peticiones con Morgan, identificar cada solicitud con un código único (SOL-0001), medir tiempos de respuesta de forma no bloqueante con process.hrtime.bigint(), organizar rutas en un express.Router montado bajo /reservas, desacoplar las validaciones en su propia función middleware y manejar páginas no encontradas con código 404 al final de la pila. Toda la información se administra exclusivamente en memoria.

## Instalación
Para descargar e instalar las dependencias (Express, EJS, express-ejs-layouts y Morgan):
```bash
npm install