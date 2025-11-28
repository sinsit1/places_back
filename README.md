# Spottica – Backend

Este repositorio contiene el **backend de Spottica**, una API REST desarrollada con **Node.js**, **Express** y **MongoDB Atlas**.  
Proporciona los endpoints necesarios para gestionar usuarios, roles, autenticación, lugares, filtros y comunicación con el frontend.

---

## 🚀 Características principales

- API REST completa para gestionar lugares.
- Sistema de usuarios con roles (admin / usuario).
- Autenticación mediante **JWT**.
- Conexión a **MongoDB Atlas**.
- Middleware de autorización.
- Validaciones y control de errores.
- Arquitectura modular organizada en controladores, rutas y modelos.

---

## 🛠️ Tecnologías utilizadas

- Node.js  
- Express  
- MongoDB + Mongoose  
- JSON Web Tokens (JWT)  
- Dotenv  
- CORS  
- Railway (deploy)  
- Render (primer intento de deploy, descartado)

---

## 📂 Estructura del proyecto

```
/src
  /controllers
  /models
  /routes
  /middlewares
  /config
  server.js
.env (no incluido)
```

---

## ⚙️ Requisitos previos

Antes de instalar este backend, asegúrate de tener:

- Node.js (recomendado 18+) → https://nodejs.org  
- Una base de datos en MongoDB Atlas  
- Claves JWT y variables de entorno configuradas

---

## 📥 Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/tuusuario/spottica-backend.git
```

2. Entrar en la carpeta del backend:

```bash
cd spottica-backend
```

3. Instalar dependencias:

```bash
npm install
```

---

## 🔑 Configuración de variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
PORT=3000
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>/nombreDB
JWT_SECRET=clave-super-secreta
```

Si usas Railway, configura estas variables directamente en el panel.

---

## 🚀 Ejecutar en local

Iniciar el servidor:

```bash
npm run dev
```

Por defecto se ejecutará en:

```
http://localhost:3000
```

---

## 📡 Endpoints principales

### 🔐 Autenticación
- POST `/api/auth/register`
- POST `/api/auth/login`

### 🗺️ Lugares
- GET `/api/lugares`
- POST `/api/lugares`
- PUT `/api/lugares/:id`
- DELETE `/api/lugares/:id`

### 👤 Usuarios
- GET `/api/usuarios` *(solo admin)*

---

## 🔄 CORS

El backend permite la conexión desde el frontend mediante configuración dinámica de CORS basada en entornos.

Si tienes problemas, revisa:

```
VITE_API_URL en el frontend
orígenes permitidos en el backend
```

---

## 🐞 Problemas comunes y soluciones

### ❌ Error de conexión a MongoDB
- Revisa el `MONGO_URI`
- Comprueba que tu IP está permitida en Atlas

### ❌ CORS bloquea peticiones
- Asegúrate de que el frontend usa la URL correcta
- Ajusta los orígenes permitidos en CORS

### ❌ JWT inválido
- Comprueba el `JWT_SECRET`  
- Asegúrate de que el token no está expirado

### ❌ Error en producción (Render tarda 1 minuto en despertar)
- Render entra en modo "sleep"  
- Solución: migrado a Railway

---

## 🧪 Scripts del proyecto

| Comando | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor en modo desarrollo |
| `npm start` | Inicia el servidor en modo producción |
| `npm install` | Instala las dependencias |

---

## 📜 Licencia

Proyecto desarrollado como parte del módulo de **Desarrollo Web en Entorno Servidor** y como proyecto final académico.  
Uso libre para fines educativos.

