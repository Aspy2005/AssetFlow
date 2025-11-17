# AssetFlow: Sistema de Gestión de Activos Empresariales

Este proyecto es un sistema de gestión de activos construido con **Angular**, diseñado para centralizar, clasificar y rastrear el estado de los recursos de una empresa (equipos, infraestructura, etc.). Ofrece una interfaz de usuario limpia y reactiva con un dashboard que muestra métricas clave en tiempo real.

## Características Principales

  * **Dashboard de Resumen:** Tarjetas de resumen dinámicas que muestran el **Total de Activos**, **Valor Total**, y distribución por estado (Activo, Mantenimiento, Baja).
  * **Filtros Reactivos:** Permite buscar y filtrar activos instantáneamente por **nombre**, **categoría** y **estado**.
  * **CRUD Completo:** Funcionalidad para **Crear, Leer, Actualizar y Eliminar** (CRUD) activos mediante formularios modales.
  * **Rastreo de Estado:** Seguimiento detallado del estado del activo (Activo, En Mantenimiento, Dado de Baja, En Reparación).
  * **Gestión de Categorías:** Los activos se asocian a categorías para una mejor organización.

## Tecnologías Utilizadas

  * **Frontend:** **Angular (v17+)**
  * **Lenguaje:** **TypeScript**
  * **Reactividad/Manejo de Estado:** **RxJS**
  * **Estilos:** **CSS Nativo / Flexbox / Grid** (sin framework de CSS externo)
  * **Backend/API:** Consumo de un **API RESTful** mediante Django

## Demo y Despliegue

| Tipo | Enlace |
| :--- | :--- |
| **Aplicación en Vivo (Demo)** | `[REEMPLAZAR con tu URL de Netlify/Vercel]` |
| **Repositorio (Código Fuente)** | `https://github.com/Aspy2005/AssetFlow/` |

## Instalación y Ejecución Local

Para ejecutar AssetFlow en tu entorno de desarrollo, sigue estos pasos:

### Prerrequisitos

Asegúrate de tener instalado **Node.js** y **Angular CLI**.

```bash
npm install -g @angular/cli
```

### 1\. Clonar el Repositorio

```bash
git clone [TU-ENLACE-GIT]
cd assetflow
```

### 2\. Instalar Dependencias

```bash
npm install
```

### 3\. Configurar la API (Opcional)

Si estás usando un backend real o una API simulada, asegúrate de que la URL de la API base esté configurada correctamente en el archivo de entorno (`environment.ts` o similar).

> **NOTA:** Este frontend asume que el backend está corriendo en `http://127.0.0.1:8000/api/v1/` (Ajustar según sea necesario).

### 4\. Ejecutar la Aplicación

Inicia el servidor de desarrollo de Angular:

```bash
ng serve
```

La aplicación estará disponible en tu navegador en `http://localhost:4200/`.

## Reflexión y Desafíos

El desarrollo de este proyecto presentó desafíos interesantes en el manejo del estado y la experiencia de usuario:

  * **Reactividad con RxJS:** El mayor reto fue sincronizar la data de la API con múltiples fuentes de **filtros de usuario (búsqueda, categoría, estado)** de forma eficiente. Esto se resolvió utilizando **`combineLatest` de RxJS** para garantizar que cada cambio de filtro dispare una nueva evaluación y actualización de la lista en la tabla y las tarjetas de resumen.
  * **Diseño de Tarjetas de Resumen:** Asegurar la consistencia visual y la correcta **alineación vertical** de los íconos grandes junto al texto de resumen. Esto se logró a través de la optimización de propiedades **CSS Flexbox** (`align-items: center;`) y ajustes finos de `font-size` y `line-height` para un diseño compacto y profesional.

-----

Creado por: **Luis Alejandro Martinez Marin**