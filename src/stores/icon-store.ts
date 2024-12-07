const ICONS_URL = "https://openedc-icons.obs.eu-de.otc.t-systems.com";

export class IconStore {
    protected static icons: Record<string, Promise<string>> = {};

    static getIcon(name: string): Promise<string> {
        // Icons are wrapped in promises, so that no icon is loaded twice (even with concurrent requests)
        return (this.icons[name] ??= this.fetchIcon(name));
    }

    static async fetchIcon(name: string): Promise<string> {
        // Split the icon name in its type and base name (e.g., circle-check-solid in solid and circle-check)
        const iconType = name.substring(name.lastIndexOf("-") + 1, name.length);
        const iconName = name.substring(0, name.lastIndexOf("-"));

        // Fetch the icon and parse it
        // TODO: Add config or .env to remove absolute path and use relative, local icons
        const response = await fetch(`${ICONS_URL}/${iconType}/${iconName}.svg`);
        const icon = response.ok ? new DOMParser().parseFromString(await response.text(), "image/svg+xml") : null;

        // Since svg icons come without the fill="currentColor" attribute, add it to the icon
        icon?.querySelectorAll("path").forEach(path => path.setAttribute("fill", "currentColor"));
        return icon ? new XMLSerializer().serializeToString(icon) : this.getIcon("circle-question-regular");
    }
}
