/**
 * AppShell Tests (UOW-0304)
 *
 * Tests for AppShell layout component.
 */

import { describe, it, expect } from 'vitest';
import { calculateLayoutDimensions, type LayoutDimensions } from './AppShell.js';

describe('AppShell', () => {
  describe('calculateLayoutDimensions', () => {
    it('should calculate basic dimensions', () => {
      const dims = calculateLayoutDimensions(100, 40, {
        showSidebar: false,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.terminalWidth).toBe(100);
      expect(dims.terminalHeight).toBe(40);
      expect(dims.mainWidth).toBe(100);
      expect(dims.sidebarWidth).toBe(0);
      expect(dims.contentHeight).toBe(38); // 40 - 1 - 1
    });

    it('should calculate with sidebar', () => {
      const dims = calculateLayoutDimensions(100, 40, {
        showSidebar: true,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.mainWidth).toBe(70);
      expect(dims.sidebarWidth).toBe(30);
    });

    it('should limit sidebar to 40% of terminal width', () => {
      const dims = calculateLayoutDimensions(60, 40, {
        showSidebar: true,
        sidebarWidth: 50, // Would be more than 40%
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.sidebarWidth).toBe(24); // 40% of 60
      expect(dims.mainWidth).toBe(36);
    });

    it('should use percentage width when provided', () => {
      const dims = calculateLayoutDimensions(100, 40, {
        showSidebar: true,
        sidebarWidth: 30,
        sidebarWidthPercent: 25,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.sidebarWidth).toBe(25);
      expect(dims.mainWidth).toBe(75);
    });

    it('should handle custom header/status heights', () => {
      const dims = calculateLayoutDimensions(100, 40, {
        showSidebar: false,
        sidebarWidth: 30,
        headerHeight: 3,
        statusBarHeight: 2,
      });

      expect(dims.contentHeight).toBe(35); // 40 - 3 - 2
      expect(dims.headerHeight).toBe(3);
      expect(dims.statusBarHeight).toBe(2);
    });

    it('should return zero sidebar when showSidebar is false', () => {
      const dims = calculateLayoutDimensions(100, 40, {
        showSidebar: false,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.sidebarWidth).toBe(0);
      expect(dims.mainWidth).toBe(100);
    });

    it('should handle small terminal sizes', () => {
      const dims = calculateLayoutDimensions(40, 10, {
        showSidebar: true,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      // Sidebar should be limited to 40% = 16
      expect(dims.sidebarWidth).toBe(16);
      expect(dims.mainWidth).toBe(24);
      expect(dims.contentHeight).toBe(8);
    });

    it('should handle edge case of very small terminal', () => {
      const dims = calculateLayoutDimensions(20, 5, {
        showSidebar: true,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.terminalWidth).toBe(20);
      expect(dims.terminalHeight).toBe(5);
      expect(dims.contentHeight).toBe(3);
    });
  });

  describe('layout slots', () => {
    it('should have all dimension properties', () => {
      const dims: LayoutDimensions = calculateLayoutDimensions(100, 40, {
        showSidebar: true,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims).toHaveProperty('terminalWidth');
      expect(dims).toHaveProperty('terminalHeight');
      expect(dims).toHaveProperty('mainWidth');
      expect(dims).toHaveProperty('sidebarWidth');
      expect(dims).toHaveProperty('contentHeight');
      expect(dims).toHaveProperty('headerHeight');
      expect(dims).toHaveProperty('statusBarHeight');
    });

    it('should maintain consistent total width', () => {
      const dims = calculateLayoutDimensions(100, 40, {
        showSidebar: true,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.mainWidth + dims.sidebarWidth).toBe(dims.terminalWidth);
    });

    it('should maintain consistent total height', () => {
      const dims = calculateLayoutDimensions(100, 40, {
        showSidebar: false,
        sidebarWidth: 30,
        headerHeight: 2,
        statusBarHeight: 3,
      });

      expect(dims.contentHeight + dims.headerHeight + dims.statusBarHeight).toBe(dims.terminalHeight);
    });
  });

  describe('responsive behavior', () => {
    it('should scale sidebar proportionally with percentage', () => {
      const small = calculateLayoutDimensions(80, 24, {
        showSidebar: true,
        sidebarWidth: 30,
        sidebarWidthPercent: 25,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      const large = calculateLayoutDimensions(160, 48, {
        showSidebar: true,
        sidebarWidth: 30,
        sidebarWidthPercent: 25,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(small.sidebarWidth).toBe(20); // 25% of 80
      expect(large.sidebarWidth).toBe(40); // 25% of 160
    });

    it('should use fixed width when no percentage given', () => {
      const dims = calculateLayoutDimensions(200, 50, {
        showSidebar: true,
        sidebarWidth: 30,
        headerHeight: 1,
        statusBarHeight: 1,
      });

      expect(dims.sidebarWidth).toBe(30);
    });
  });
});
