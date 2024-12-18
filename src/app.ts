import * as router from "utils/router.ts";
import { ComposedImage } from "./models/composed-image.ts";

// Import all components to be used without import
import.meta.glob("./components/**/*.ts", { eager: true });

const init = async () => {
    // For users with existing images, navigate to /home on startup
    if (location.pathname === "/" && await ComposedImage.where().first()) {
        history.replaceState(null, String(), "/home");
    }

    // Initialize router
    await router.init();
};

init();
