import * as router from "utils/router.ts";

// Import all components to be used without import
import.meta.glob("./components/**/*.ts", { eager: true });

// Initialize router
router.init();
