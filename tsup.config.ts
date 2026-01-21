import { defineConfig } from 'tsup';

/**
 * tsup Configuration for Claude Code Dynamic Terminal UI
 *
 * Bundles the application into a single distributable artifact using esbuild.
 * Configuration optimized for:
 * - Single-file distribution
 * - Node.js CLI execution
 * - Source maps for debugging
 * - External dependencies that should not be bundled
 */
export default defineConfig({
  // Entry point for the CLI application
  entry: ['src/index.tsx'],

  // Output format - ESM for Node.js
  format: ['esm'],

  // Output directory for bundled files
  outDir: 'dist',

  // Generate TypeScript declarations
  dts: true,

  // Generate source maps for debugging
  sourcemap: true,

  // Clean the output directory before building
  clean: true,

  // Target Node.js 18+ (matches engines in package.json)
  target: 'node18',

  // Bundle all dependencies into single file
  // Except for native modules and problematic packages
  noExternal: [/.*/],

  // External packages that should NOT be bundled
  // (native modules, large runtime dependencies)
  external: [
    // Native modules
    'fsevents',
    // Yoga has native bindings
    'yoga-layout',
  ],

  // Enable tree shaking for smaller bundle
  treeshake: true,

  // Minify production builds
  minify: process.env.NODE_ENV === 'production',

  // Add shebang for CLI execution
  banner: {
    js: '#!/usr/bin/env node',
  },

  // Platform configuration
  platform: 'node',

  // Splitting disabled for single-file output
  splitting: false,

  // esbuild options
  esbuildOptions(options) {
    // JSX configuration for React
    options.jsx = 'automatic';

    // Keep names for better error messages
    options.keepNames = true;

    // Define environment variables
    options.define = {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    };
  },

  // Callback when build completes
  onSuccess: async () => {
    console.log('Build completed successfully!');
  },
});
