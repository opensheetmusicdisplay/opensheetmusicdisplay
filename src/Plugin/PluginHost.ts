import { LinkedList } from "typescript-collections";

import { IPlugin, IEventSource } from "./";

/**
 * Holds a collection of OSMD plugins and makes sure plugins get registered and
 * unregistered properly and are not being added multiple times.
 */
export class PluginHost {

    private registeredPlugins: LinkedList<IPlugin>;
    private eventSource: IEventSource;

    constructor(eventSource: IEventSource) {
        this.registeredPlugins = new LinkedList<IPlugin>();
        this.eventSource = eventSource;
    }

    public registerPlugin(plugin: IPlugin): void {
        if (!this.registeredPlugins.contains(plugin, this.pluginsEqual)) {
            this.registeredPlugins.add(plugin);
            plugin.registerEvents(this.eventSource);
        } else {
            throw("Plugin already registered.");
        }
    }

    public unregisterPlugin(plugin: IPlugin): void {
        this.registeredPlugins.remove(plugin, this.pluginsEqual);
        plugin.unregisterEvents(this.eventSource);
    }

    private pluginsEqual(pluginA: IPlugin, pluginB: IPlugin): boolean {
        return pluginA.getIdentifier() === pluginB.getIdentifier();
    }

}
