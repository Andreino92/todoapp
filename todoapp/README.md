# To-Do List — Despliegue Automatizado con Docker (Java + SQL Server)

## Stack utilizado
- **Frontend:** SPA en HTML/CSS/JS puro (CRUD + filtro en tiempo real)
- **Backend:** Java 17 + Spring Boot 3 (API REST)
- **Base de datos:** SQL Server 2022 (contenedor oficial de Microsoft)
- **Servidor web / reverse proxy:** Nginx
- **Contenedores:** Docker + Docker Compose
- **CI/CD:** GitHub Actions con **runner autohospedado** en tu propia PC
  (push a `main` → se reconstruyen y reinician los contenedores solos,
  sin tocar nada a mano)

> Nota: esta es la variante que el docente autorizó como alternativa al
> TP original (que pedía un VPS). Acá **toda la infraestructura vive en
> contenedores Docker corriendo en tu propia máquina**, que cumple el rol
> de "servidor". No se contrata ningún VPS.

---

## 1. Arquitectura

```
                 Tu PC (actua como "servidor")
                 +--------------------------------------+
                 |                                        |
   Navegador --> |  [Puerto 80]                           |
                 |      |                                  |
                 |  +-----------+                          |
                 |  |   Nginx   |  <- sirve el frontend     |
                 |  | (reverse  |     y hace proxy de       |
                 |  |  proxy)   |     /api/ al backend       |
                 |  +-----+-----+                          |
                 |        |                                |
                 |  [red interna docker: todo_net]          |
                 |        |                                |
                 |  +-----v-----+          +-------------+ |
                 |  |  Backend  |  JDBC    | SQL Server  | |
                 |  | Spring    +--------->| (contenedor)| |
                 |  | Boot :8080|  :1433   | DB: tododb  | |
                 |  +-----------+          +-------------+ |
                 |                                        |
                 |  [GitHub Actions self-hosted runner]     |
                 |  escuchando pushes a "main" ------------>|-- reconstruye
                 +--------------------------------------+   contenedores
```

Los tres servicios (Nginx, backend, SQL Server) corren como contenedores
Docker dentro de una única red (`todo_net`), orquestados por
`docker-compose.yml`. Nginx es el único servicio que expone un puerto
hacia tu red local (80). El backend y la base de datos solo son
alcanzables dentro de la red interna de Docker.

El "deploy automático" lo logra un **runner de GitHub Actions instalado en
tu propia PC**: es un pequeño programa que queda escuchando; cuando hacés
`git push` a `main`, GitHub le avisa y el runner ejecuta
`docker compose up -d --build` localmente. Es la forma correcta de tener
CI/CD real sin depender de un servidor pago.

---

## 2. Estructura del repositorio

```
todoapp/
├── backend/                 # API Java Spring Boot
│   ├── src/...
│   ├── pom.xml
│   └── Dockerfile
├── frontend/                 # SPA (index.html, app.js, style.css)
├── nginx/default.conf        # config del reverse proxy
├── backup/backup.sh          # script de respaldo de la DB
├── docker-compose.yml
├── .env.example
├── setup-db.sh                # crea la base de datos (primera vez)
└── .github/workflows/deploy.yml   # pipeline CI/CD (self-hosted runner)
```

---

## 3. Endpoints de la API

| Método | Ruta                     | Descripción                     |
|--------|--------------------------|----------------------------------|
| GET    | /api/tasks               | Lista todas las tareas          |
| GET    | /api/tasks?q=texto       | Filtra por título/descripción   |
| POST   | /api/tasks                | Crea una tarea                  |
| PUT    | /api/tasks/{id}          | Actualiza una tarea              |
| PATCH  | /api/tasks/{id}/toggle   | Marca/desmarca como completada  |
| DELETE | /api/tasks/{id}          | Elimina una tarea                |

---

## 4. Plan de respaldo (backup) de la base de datos

`backup/backup.sh` genera un `.bak` completo de la base `tododb` dentro del
contenedor de SQL Server y lo copia al host (tu PC), en `backup/files/`.
Se conservan los últimos 7 días automáticamente (rotación simple con
`find -mtime +7`).

Se programa con el **Programador de Tareas de Windows** o `cron` (si tu PC
es Linux/Mac) para correr todos los días — ver Paso 6 más abajo.

## 5. Seguridad

- SQL Server no se accede con usuario/contraseña por defecto: la
  contraseña del usuario `sa` se define en tu archivo `.env` (no se sube
  al repo, está en `.gitignore`).
- El puerto `1433` (SQL Server) solo hace falta publicarlo si querés
  conectarte con una herramienta como Azure Data Studio desde tu propia
  PC; si no lo necesitás, se puede quitar del `docker-compose.yml` para
  que la base solo sea alcanzable dentro de la red interna de Docker.
- Nginx es el único punto de entrada expuesto (puerto 80).
- El firewall de tu sistema operativo (Firewall de Windows o `ufw` en
  Linux) solo necesita permitir el puerto 80 (y opcionalmente 1433 si lo
  usás para administración).

---

## 6. Pipeline CI/CD (GitHub Actions con runner autohospedado)

Archivo: `.github/workflows/deploy.yml`

1. Se dispara con cada `push` a la rama `main`.
2. GitHub le avisa al runner que instalaste en tu PC (ver Paso 5 abajo).
3. El runner, que corre en tu máquina, ejecuta:
   - `git checkout` automático de la última versión del código.
   - `docker compose up -d --build` → reconstruye solo lo que cambió y
     reinicia los contenedores necesarios.
   - `docker image prune -f` → limpia imágenes viejas.

No requiere SSH ni registro de imágenes (Docker Hub/GHCR): todo pasa
localmente en tu equipo, que es exactamente el enfoque "todo en Docker"
que pidió el docente.

---

# GUÍA PASO A PASO — Lo que tenés que hacer vos

El código ya está completo. Esto es lo que falta correr en tu máquina
(no lo puedo ejecutar yo porque necesita tu Docker y tu cuenta de GitHub).

### Paso 1 — Instalar Docker
Instalá **Docker Desktop** (Windows/Mac) o `docker` + `docker compose`
(Linux). Verificá:
```bash
docker --version
docker compose version
```
Asigná al menos 4 GB de RAM a Docker Desktop (Settings → Resources), porque
SQL Server los necesita.

### Paso 2 — Subir el proyecto a GitHub
```bash
cd todoapp
git init
git add .
git commit -m "Proyecto inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/todoapp.git
git push -u origin main
```

### Paso 3 — Configurar variables de entorno
```bash
cp .env.example .env
```
Editá `.env` y cambiá `DB_PASSWORD` por una contraseña fuerte (mínimo 8
caracteres, con mayúscula, minúscula, número y símbolo — lo exige SQL
Server).

### Paso 4 — Primer levantado y creación de la base
```bash
docker compose up -d --build
chmod +x setup-db.sh backup/backup.sh   # en Windows con Git Bash tambien funciona
./setup-db.sh
```
Esperá a que los 3 contenedores estén arriba:
```bash
docker compose ps
```
Entrá en el navegador a `http://localhost` y probá crear, listar, editar,
completar, filtrar y borrar tareas. Si eso funciona, ya tenés el CRUD
completo cumplido.

### Paso 5 — Configurar el runner de GitHub Actions (esto es lo que te da el CI/CD automático)
1. En tu repo de GitHub: **Settings → Actions → Runners → New self-hosted
   runner**.
2. Elegí tu sistema operativo (Windows/Linux/Mac) y seguí los comandos que
   GitHub te muestra ahí mismo, algo como:
   ```bash
   # se descarga y configura (los comandos exactos te los da GitHub,
   # incluyen un token unico para tu repo)
   ./config.sh --url https://github.com/TU_USUARIO/todoapp --token TOKEN_QUE_TE_DA_GITHUB
   ./run.sh
   ```
3. Dejá esa ventana/proceso corriendo (o instalalo como servicio con
   `./svc.sh install && ./svc.sh start` para que arranque solo con tu PC).
4. En la pestaña **Actions → Runners** de tu repo, deberías ver tu runner
   en estado "Idle" (verde).

Ese runner es un proceso liviano que queda escuchando: cuando hacés push,
GitHub Actions le manda el trabajo del `deploy.yml` y él ejecuta
`docker compose up -d --build` directamente en tu máquina.

### Paso 6 — Backups automáticos
**Windows:** Programador de Tareas → Crear tarea básica → Diaria → Acción:
ejecutar `backup\backup.sh` con Git Bash (`"C:\Program Files\Git\bin\bash.exe" backup/backup.sh`).

**Linux/Mac:**
```bash
crontab -e
```
Agregá (corre todos los días a las 3 AM):
```
0 3 * * * /ruta/completa/a/todoapp/backup/backup.sh >> /ruta/completa/a/todoapp/backup/backup.log 2>&1
```

### Paso 7 — Probar el pipeline completo
Hacé un cambio cualquiera (por ejemplo, un texto en `frontend/index.html`):
```bash
git add .
git commit -m "test deploy automatico"
git push origin main
```
Andá a la pestaña **Actions** de tu repo en GitHub y mirá cómo el runner
(tu PC) ejecuta el workflow solo. Si todo salió bien, en unos segundos el
cambio se ve reflejado en `http://localhost` sin que hayas tocado nada a
mano — eso es lo que te van a evaluar como "CI/CD automatizado".

---

## Checklist final para la rúbrica

- [x] Infraestructura: Docker Compose con Nginx + Spring Boot + SQL Server
- [x] CRUD completo (insertar, listar, actualizar, eliminar)
- [x] Filtro en tiempo real (client-side, sin recargar)
- [x] CI/CD con GitHub Actions (push a `main` → deploy automático vía
      runner autohospedado, sin intervención manual)
- [x] Seguridad: credenciales en `.env`, un solo puerto expuesto (Nginx)
- [x] Backup automatizado de la base de datos (tarea programada + script)
- [ ] Vos: instalar Docker, configurar el runner y completar los pasos 1 a 7
- [ ] Vos: capturas de pantalla / bitácora real de tu instalación para el informe
