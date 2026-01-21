/**
 * ComponentRegistry Tests (UOW-0801)
 *
 * Tests for the UI Component Registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import {
  ComponentRegistry,
  createComponentRegistry,
  BaseComponentProps,
  FallbackComponentProps,
  ComponentSpec,
} from './ComponentRegistry.js';

// Mock components for testing
const MockButton: React.FC<BaseComponentProps & { label?: string }> = () => null;
MockButton.displayName = 'MockButton';

const MockList: React.FC<BaseComponentProps & { items?: string[] }> = () => null;
MockList.displayName = 'MockList';

const MockContainer: React.FC<BaseComponentProps & { direction?: string }> = () => null;
MockContainer.displayName = 'MockContainer';

const CustomFallback: React.FC<FallbackComponentProps> = () => null;
CustomFallback.displayName = 'CustomFallback';

describe('ComponentRegistry', () => {
  beforeEach(() => {
    // Clear the registry before each test
    ComponentRegistry.clear();
  });

  describe('register', () => {
    it('should register a component', () => {
      ComponentRegistry.register('Button', MockButton);
      expect(ComponentRegistry.has('Button')).toBe(true);
    });

    it('should overwrite existing component on re-registration', () => {
      const MockButton2: React.FC<BaseComponentProps> = () => null;
      MockButton2.displayName = 'MockButton2';

      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.register('Button', MockButton2);

      const retrieved = ComponentRegistry.get('Button');
      expect(retrieved).toBe(MockButton2);
    });
  });

  describe('registerAll', () => {
    it('should register multiple components at once', () => {
      ComponentRegistry.registerAll({
        Button: MockButton,
        List: MockList,
        Container: MockContainer,
      });

      expect(ComponentRegistry.has('Button')).toBe(true);
      expect(ComponentRegistry.has('List')).toBe(true);
      expect(ComponentRegistry.has('Container')).toBe(true);
    });
  });

  describe('registerAlias', () => {
    it('should register an alias for a component', () => {
      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.registerAlias('Btn', 'Button');

      expect(ComponentRegistry.has('Btn')).toBe(true);
      expect(ComponentRegistry.get('Btn')).toBe(MockButton);
    });

    it('should return false for alias pointing to non-existent type', () => {
      ComponentRegistry.registerAlias('Btn', 'NonExistent');
      expect(ComponentRegistry.has('Btn')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister a component', () => {
      ComponentRegistry.register('Button', MockButton);
      expect(ComponentRegistry.has('Button')).toBe(true);

      const result = ComponentRegistry.unregister('Button');
      expect(result).toBe(true);
      expect(ComponentRegistry.has('Button')).toBe(false);
    });

    it('should return false when unregistering non-existent component', () => {
      const result = ComponentRegistry.unregister('NonExistent');
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return registered component', () => {
      ComponentRegistry.register('Button', MockButton);
      const component = ComponentRegistry.get('Button');
      expect(component).toBe(MockButton);
    });

    it('should return undefined for unregistered component', () => {
      const component = ComponentRegistry.get('NonExistent');
      expect(component).toBeUndefined();
    });

    it('should resolve aliases', () => {
      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.registerAlias('Btn', 'Button');

      const component = ComponentRegistry.get('Btn');
      expect(component).toBe(MockButton);
    });
  });

  describe('getOrFallback', () => {
    it('should return registered component', () => {
      ComponentRegistry.register('Button', MockButton);
      const component = ComponentRegistry.getOrFallback('Button');
      expect(component).toBe(MockButton);
    });

    it('should return fallback component for unregistered type', () => {
      const component = ComponentRegistry.getOrFallback('NonExistent');
      expect(component).toBeDefined();
      // The fallback is wrapped, so we just check it exists
    });

    it('should use custom fallback when set', () => {
      ComponentRegistry.setFallback(CustomFallback);
      const fallback = ComponentRegistry.getFallback();
      expect(fallback).toBe(CustomFallback);
    });
  });

  describe('has', () => {
    it('should return true for registered component', () => {
      ComponentRegistry.register('Button', MockButton);
      expect(ComponentRegistry.has('Button')).toBe(true);
    });

    it('should return false for unregistered component', () => {
      expect(ComponentRegistry.has('NonExistent')).toBe(false);
    });

    it('should return true for valid alias', () => {
      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.registerAlias('Btn', 'Button');
      expect(ComponentRegistry.has('Btn')).toBe(true);
    });
  });

  describe('getTypes', () => {
    it('should return all registered types', () => {
      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.register('List', MockList);
      ComponentRegistry.register('Container', MockContainer);

      const types = ComponentRegistry.getTypes();
      expect(types).toContain('Button');
      expect(types).toContain('List');
      expect(types).toContain('Container');
      expect(types.length).toBe(3);
    });

    it('should return empty array when no components registered', () => {
      const types = ComponentRegistry.getTypes();
      expect(types).toEqual([]);
    });
  });

  describe('getAliases', () => {
    it('should return all registered aliases', () => {
      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.registerAlias('Btn', 'Button');
      ComponentRegistry.registerAlias('B', 'Button');

      const aliases = ComponentRegistry.getAliases();
      expect(aliases.get('Btn')).toBe('Button');
      expect(aliases.get('B')).toBe('Button');
      expect(aliases.size).toBe(2);
    });
  });

  describe('setFallback / getFallback / resetFallback', () => {
    it('should set and get custom fallback', () => {
      ComponentRegistry.setFallback(CustomFallback);
      expect(ComponentRegistry.getFallback()).toBe(CustomFallback);
    });

    it('should reset fallback to default', () => {
      ComponentRegistry.setFallback(CustomFallback);
      ComponentRegistry.resetFallback();

      // After reset, fallback should not be CustomFallback
      expect(ComponentRegistry.getFallback()).not.toBe(CustomFallback);
    });
  });

  describe('clear', () => {
    it('should clear all registered components', () => {
      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.register('List', MockList);
      ComponentRegistry.registerAlias('Btn', 'Button');

      ComponentRegistry.clear();

      expect(ComponentRegistry.has('Button')).toBe(false);
      expect(ComponentRegistry.has('List')).toBe(false);
      expect(ComponentRegistry.has('Btn')).toBe(false);
      expect(ComponentRegistry.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return the number of registered components', () => {
      expect(ComponentRegistry.size).toBe(0);

      ComponentRegistry.register('Button', MockButton);
      expect(ComponentRegistry.size).toBe(1);

      ComponentRegistry.register('List', MockList);
      expect(ComponentRegistry.size).toBe(2);
    });
  });

  describe('render', () => {
    it('should render a component from spec', () => {
      ComponentRegistry.register('Button', MockButton);

      const spec: ComponentSpec = {
        id: 'btn-1',
        type: 'Button',
        label: 'Click me',
      };

      const element = ComponentRegistry.render(spec);
      expect(element).toBeDefined();
      expect(element.type).toBe(MockButton);
      expect(element.props.id).toBe('btn-1');
      expect(element.props.label).toBe('Click me');
    });

    it('should use fallback for unknown type', () => {
      const spec: ComponentSpec = {
        id: 'unknown-1',
        type: 'UnknownType',
      };

      const element = ComponentRegistry.render(spec);
      expect(element).toBeDefined();
    });
  });

  describe('renderAll', () => {
    it('should render multiple components from specs', () => {
      ComponentRegistry.register('Button', MockButton);
      ComponentRegistry.register('List', MockList);

      const specs: ComponentSpec[] = [
        { id: 'btn-1', type: 'Button', label: 'Button 1' },
        { id: 'list-1', type: 'List', items: ['a', 'b'] },
      ];

      const elements = ComponentRegistry.renderAll(specs);
      expect(elements.length).toBe(2);
      expect(elements[0]?.type).toBe(MockButton);
      expect(elements[1]?.type).toBe(MockList);
    });
  });
});

describe('createComponentRegistry', () => {
  it('should create an isolated registry', () => {
    const registry1 = createComponentRegistry();
    const registry2 = createComponentRegistry();

    registry1.register('Button', MockButton);

    expect(registry1.has('Button')).toBe(true);
    expect(registry2.has('Button')).toBe(false);
  });

  it('should be independent from the global registry', () => {
    ComponentRegistry.register('List', MockList);
    const isolatedRegistry = createComponentRegistry();

    expect(ComponentRegistry.has('List')).toBe(true);
    expect(isolatedRegistry.has('List')).toBe(false);
  });
});
