/**
 * UI Component Registry (UOW-0801)
 *
 * Provides a registry for declarative UI components keyed by type string.
 * Supports registration, lookup, and fallback for unknown component types.
 */

import React from 'react';

/**
 * Base props that all declarative components receive
 */
export interface BaseComponentProps {
  /** Unique component ID */
  id: string;
  /** Whether component is visible */
  visible?: boolean;
  /** Whether component has focus */
  focused?: boolean;
  /** Children components (for containers) */
  children?: React.ReactNode;
}

/**
 * Component spec from the declarative schema
 */
export interface ComponentSpec {
  id: string;
  type: string;
  visible?: boolean;
  focused?: boolean;
  [key: string]: unknown;
}

/**
 * React component type that can be registered
 */
export type RegisteredComponent<P = Record<string, unknown>> = React.ComponentType<P & BaseComponentProps>;

/**
 * Fallback component props
 */
export interface FallbackComponentProps extends BaseComponentProps {
  type: string;
  spec: ComponentSpec;
}

/**
 * Default fallback component for unknown types
 */
const DefaultFallbackComponent: React.FC<FallbackComponentProps> = ({ type, id }) => {
  // Use React.createElement to avoid JSX in .ts file
  return React.createElement(
    'span',
    { style: { color: 'gray' } },
    `[Unknown component: ${type} (id: ${id})]`
  );
};

/**
 * ComponentRegistry - Singleton registry for declarative UI components
 */
class ComponentRegistryClass {
  private components: Map<string, RegisteredComponent<Record<string, unknown>>> = new Map();
  private fallbackComponent: React.ComponentType<FallbackComponentProps> = DefaultFallbackComponent;
  private aliases: Map<string, string> = new Map();

  /**
   * Register a component for a given type
   *
   * @param type - The component type string (e.g., 'Button', 'List', 'Container')
   * @param component - The React component to register
   */
  register<P extends Record<string, unknown>>(type: string, component: RegisteredComponent<P>): void {
    this.components.set(type, component as RegisteredComponent<Record<string, unknown>>);
  }

  /**
   * Register multiple components at once
   *
   * @param components - Object mapping type strings to components
   */
  registerAll(components: Record<string, RegisteredComponent<Record<string, unknown>>>): void {
    for (const [type, component] of Object.entries(components)) {
      this.register(type, component);
    }
  }

  /**
   * Register an alias for a component type
   *
   * @param alias - The alias string
   * @param targetType - The target component type
   */
  registerAlias(alias: string, targetType: string): void {
    this.aliases.set(alias, targetType);
  }

  /**
   * Unregister a component type
   *
   * @param type - The component type to unregister
   * @returns true if the component was unregistered, false if it wasn't registered
   */
  unregister(type: string): boolean {
    return this.components.delete(type);
  }

  /**
   * Get a component by type
   *
   * @param type - The component type to look up
   * @returns The registered component or undefined
   */
  get(type: string): RegisteredComponent<Record<string, unknown>> | undefined {
    // Check for direct registration
    let component = this.components.get(type);
    if (component) {
      return component;
    }

    // Check for alias
    const aliasTarget = this.aliases.get(type);
    if (aliasTarget) {
      component = this.components.get(aliasTarget);
      if (component) {
        return component;
      }
    }

    return undefined;
  }

  /**
   * Get a component by type, falling back to the fallback component if not found
   *
   * @param type - The component type to look up
   * @returns The registered component or the fallback component
   */
  getOrFallback(type: string): RegisteredComponent<Record<string, unknown>> {
    const component = this.get(type);
    if (component) {
      return component;
    }

    // Return a wrapper that passes the type to the fallback
    const fallback = this.fallbackComponent;
    const FallbackWrapper: React.FC<Record<string, unknown> & BaseComponentProps> = (props) => {
      return React.createElement(fallback, {
        ...props,
        type,
        spec: props as unknown as ComponentSpec,
      });
    };
    FallbackWrapper.displayName = `Fallback(${type})`;

    return FallbackWrapper;
  }

  /**
   * Check if a component type is registered
   *
   * @param type - The component type to check
   * @returns true if the type is registered or aliased
   */
  has(type: string): boolean {
    if (this.components.has(type)) {
      return true;
    }
    const aliasTarget = this.aliases.get(type);
    if (aliasTarget && this.components.has(aliasTarget)) {
      return true;
    }
    return false;
  }

  /**
   * Get all registered component types
   *
   * @returns Array of registered type strings
   */
  getTypes(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get all registered aliases
   *
   * @returns Map of alias to target type
   */
  getAliases(): Map<string, string> {
    return new Map(this.aliases);
  }

  /**
   * Set a custom fallback component
   *
   * @param component - The fallback component to use for unknown types
   */
  setFallback(component: React.ComponentType<FallbackComponentProps>): void {
    this.fallbackComponent = component;
  }

  /**
   * Get the current fallback component
   *
   * @returns The fallback component
   */
  getFallback(): React.ComponentType<FallbackComponentProps> {
    return this.fallbackComponent;
  }

  /**
   * Reset the fallback component to the default
   */
  resetFallback(): void {
    this.fallbackComponent = DefaultFallbackComponent;
  }

  /**
   * Clear all registered components
   */
  clear(): void {
    this.components.clear();
    this.aliases.clear();
  }

  /**
   * Get the number of registered components
   */
  get size(): number {
    return this.components.size;
  }

  /**
   * Render a component from a spec
   *
   * @param spec - The component specification
   * @param extraProps - Additional props to pass to the component
   * @returns React element
   */
  render(spec: ComponentSpec, extraProps?: Record<string, unknown>): React.ReactElement {
    const Component = this.getOrFallback(spec.type);
    const { type: _type, ...restSpec } = spec;

    return React.createElement(Component, {
      ...restSpec,
      ...extraProps,
    } as Record<string, unknown> & BaseComponentProps);
  }

  /**
   * Render multiple components from specs
   *
   * @param specs - Array of component specifications
   * @param extraProps - Additional props to pass to each component
   * @returns Array of React elements
   */
  renderAll(specs: ComponentSpec[], extraProps?: Record<string, unknown>): React.ReactElement[] {
    return specs.map((spec) => this.render(spec, { ...extraProps, key: spec.id }));
  }
}

/**
 * Singleton instance of the component registry
 */
export const ComponentRegistry = new ComponentRegistryClass();

/**
 * Hook for accessing the component registry in React components
 */
export function useComponentRegistry(): ComponentRegistryClass {
  return ComponentRegistry;
}

/**
 * Decorator/HOC for auto-registering a component
 *
 * @param type - The component type string
 * @returns A function that wraps and registers the component
 */
export function registerComponent<P extends Record<string, unknown>>(type: string) {
  return (component: RegisteredComponent<P>): RegisteredComponent<P> => {
    ComponentRegistry.register(type, component);
    return component;
  };
}

/**
 * Create a new isolated registry (useful for testing)
 */
export function createComponentRegistry(): ComponentRegistryClass {
  return new ComponentRegistryClass();
}

/**
 * Helper type for extracting props from a registered component
 */
export type ComponentProps<T extends string> = T extends keyof RegisteredComponentMap
  ? React.ComponentProps<RegisteredComponentMap[T]>
  : Record<string, unknown>;

/**
 * Type-safe component map (extend this interface in other files)
 */
export interface RegisteredComponentMap {
  // This interface can be augmented by other modules
  [key: string]: RegisteredComponent<Record<string, unknown>>;
}
