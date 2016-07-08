import { IEventSource } from "./";

/**
 * A plugin for OSMD.
 */
export interface IPlugin {
	/**
	 * Returns a unique description for this OSMD plugin. Will be used to distinguish 
	 * between plugins.
	 */
    getIdentifier(): string;

	/**
	 * Will be called after this plugin was added to an OSMD instance. Plugins can
	 * subscribe to events on the given `IEventSource`.
	 */
    registerEvents(eventSource: IEventSource): void;

	/**
	 * Will be called after this plugin has been removed from an OSMD instance. Plugins
	 * must clean up their subscriptions to the given `IEventSource`.
	 */
    unregisterEvents(eventSource: IEventSource): void;
}
