# Docker

Docker permite separar la aplicación que desarrollamos de la infraestructura que poseemos, acelerando el proceso de desarrollo y despliegue en producción.


Básicamente, podemos empaquetar y ejecutar aplicaciones en un ambiente aislado llamado "contenedor".

## Portabilidad
Los contenedores son muy portables, se pueden ejecutar en una PC, VMs, nube o en una combinación de estas opciones.

## Liviano y Veloz
Una VM es un sistema operativo entero con su propio kernel, drivers, programas y aplicaciones.

A diferencia de estas, los contenedores comparten el mismo sistema operativo del host, administrando eficientemente los recursos disponibles.

Esta misma característica permite un arranque mucho más veloz (no hay que arrancar ningún sistema operativo desde cero).

Todo esto permite una mayor densidad de contenedores por host, es decir, más aplicaciones corriendo en un mismo lugar.

## Contenedor
Un contenedor integra lo necesario (archivos, dependencias, configuración, etc.) para que la aplicación pueda ejecutarse, sin necesidad de instalar dependencias en el host del código.

## Imagen
Una imagen es una plantilla con instrucciones para crear un contenedor.

El Dockerfile es un archivo de texto en el cual definimos los pasos necesarios para crear una imagen y ejecutarla.

Las imágenes son livianas y rápidas debido a su infraestructura de capas. Cada paso definido en el Dockerfile crea una capa en la imagen. Cuando hacemos cambios y reconstruimos esta imagen, solo se reconstruyen aquellas capas que sufrieron cambios.

Los contenedores son, en esencia, instancias de una imagen.

## docker-compose.yml
Una buena práctica es que cada contenedor que creamos haga una sola cosa y la haga bien. "docker compose" nos permite construir varios contenedores sin desviarnos de esta buena práctica.

docker-compose.yml es un archivo de texto en el cual definimos los contenedores a crear y sus configuraciones.

## Docker Desktop
Docker Desktop es la aplicación que nos permite utilizar todas las funciones de Docker de manera sencilla.

Descargar: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe?utm_source=docker&utm_medium=webreferral&utm_campaign=docs-driven-download-win-amd64

Sigan las instrucciones y, una vez finalizada la instalación, deben iniciar Docker Desktop para poder ejecutar todos los comandos CLI correctamente.


## Dockerfile paso a paso

```dockerfile
FROM node:20

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY server/package.json /usr/src/app/

RUN npm install

COPY . /usr/src/app/

EXPOSE 3000

CMD ["node", "server/index.js"]
```

- **FROM node:20**: Indica la imagen base que se usará, en este caso Node.js versión 20.
- **RUN mkdir -p /usr/src/app**: Crea el directorio donde "vivirá" la aplicación dentro del contenedor.
- **WORKDIR /usr/src/app**: Establece el directorio de trabajo para las siguientes instrucciones.
- **COPY server/package.json /usr/src/app/**: Copia el archivo `package.json` al contenedor para instalar dependencias.
- **RUN npm install**: Instala las dependencias definidas en `package.json`.
- **COPY . /usr/src/app/**: Copia el resto de los archivos del proyecto al contenedor.
- **EXPOSE 3000**: Expone el puerto 3000 para que la aplicación sea accesible desde fuera del contenedor.
- **CMD ["node", "server/index.js"]**: Define el comando por defecto que se ejecutará al iniciar el contenedor.

### Comandos CLI para construir y ejecutar la imagen

1. **Construir la imagen:**
   ```bash
   docker build -t nombre-de-tu-imagen .
   ```
   Esto crea una imagen llamada `nombre-de-tu-imagen` usando el Dockerfile en el directorio actual.

2. **Ejecutar un contenedor:**
   ```bash
   docker run -p 3000:3000 nombre-de-tu-imagen
   ```
   Esto inicia un contenedor basado en la imagen creada y mapea el puerto 3000 del host al contenedor.

---

## docker-compose.yml paso a paso

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - .:/app
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
    networks:
      - network
  
  postgres:
    image: postgres:latest
    ports:
      - "5432:5432"
    volumes:
      - postgres_db:/var/lib/postgresql/data
    env_file:
      - .env
    networks:
      - network

volumes:
  postgres_db:
    driver: local

networks:
  network:
    driver: bridge
```

- **services:** Define los servicios (contenedores) que se van a crear.
  - **web:** Servicio principal de la aplicación.
    - **build:** Indica cómo construir la imagen (contexto y Dockerfile).
    - **ports:** Mapea el puerto 3000 del host al contenedor.
    - **volumes:** Sincroniza el código local con el contenedor para desarrollo.
    - **environment:** Variables de entorno para el contenedor.
    - **depends_on:** Indica que este servicio depende de que el servicio `postgres` esté listo.
    - **networks:** Red a la que pertenece el servicio.
  - **postgres:** Servicio de base de datos PostgreSQL.
    - **image:** Imagen oficial de PostgreSQL.
    - **ports:** Mapea el puerto 5432 del host al contenedor.
    - **volumes:** Persiste los datos de la base de datos en el host.
    - **env_file:** Archivo con variables de entorno para la base de datos.
    - **networks:** Red a la que pertenece el servicio.
- **volumes:** Define volúmenes persistentes para los datos de la base de datos.
- **networks:** Define la red interna que conecta los servicios.

### Comandos CLI para levantar y administrar los servicios


1. **Levantar los servicios:**
   ```bash
   docker compose up
   ```
   Esto construye (si es necesario) y levanta todos los servicios definidos en el archivo `docker-compose.yml`.

2. **Levantar los servicios y forzar la reconstrucción de las imágenes:**
   ```bash
   docker compose up --build
   ```
   Esto fuerza la reconstrucción de las imágenes antes de levantar los servicios, útil si cambiaste el Dockerfile o dependencias.

3. **Levantar los servicios en segundo plano:**
   ```bash
   docker compose up -d
   ```
   Esto ejecuta los servicios en modo "detached" (segundo plano).

4. **Detener los servicios:**
   ```bash
   docker compose down
   ```
   Esto detiene y elimina los contenedores, redes y volúmenes definidos (los volúmenes persistentes no se eliminan a menos que se indique explícitamente).

---

