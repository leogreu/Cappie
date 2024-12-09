import { Router } from "@vaadin/router";

export const routes: {
    path: string;
    component: string;
    icon?: string;
}[] = [
    {
        path: "/",
        component: "app-index"
    },
    {
        path: "/home",
        component: "app-home",
        icon: "house"
    },
    {
        path: "/history",
        component: "app-history",
        icon: "rectangle-vertical-history"
    },
    {
        path: "/about",
        component: "app-about",
        icon: "circle-question"
    }
];

export const init = () => {
    const sidebar = document.querySelector("app-sidebar");
    new Router(document.body).setRoutes(
        routes.map(route => ({
            ...route,
            action: () => {
                if (sidebar) sidebar.route = route.path;
            }
        }))
    );
};
