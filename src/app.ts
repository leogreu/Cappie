import { Router } from "@vaadin/router";

// Import all components to be used without import
import.meta.glob("./components/**/*.ts", { eager: true });

// Initialize routing
new Router(document.body).setRoutes([
    { path: "/", component: "app-index" },
    { path: "/home", component: "app-home" },
    { path: "/about", component: "app-about" }
]);
