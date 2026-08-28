# TaskmasterPro

## API y chat de audio

La aplicación usa una API Node para compartir usuarios, tareas y mensajes entre equipos.

1. En una terminal, ejecuta `npm run api`.
2. En otra terminal, ejecuta `npm start`.
3. Para usarla desde otra computadora, publica la carpeta `server` en un equipo accesible por red y configura `globalThis.__TASKMASTER_API__` con su URL `/api` antes de cargar Angular.

La API guarda sus datos en `server/data/database.json` y los audios en `server/data/uploads`. El navegador solicitará permiso para el micrófono al pulsar `Audio` en una conversación.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
