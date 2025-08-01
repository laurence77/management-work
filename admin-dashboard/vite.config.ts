import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { splitVendorChunkPlugin } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Disable React refresh to prevent reloading
      fastRefresh: false
    }),
    splitVendorChunkPlugin()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    host: '127.0.0.1',
    hmr: false,  // Completely disable HMR to stop reloading
    // Alternative: use manual refresh only
    watch: null,  // Disable file watching completely
    strictPort: true,
    open: false
  },
  build: {
    outDir: 'dist',
    target: ['es2020', 'chrome90', 'safari13'],
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Admin-specific UI components
          'admin-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-switch',
            '@radix-ui/react-separator'
          ],
          
          // Dashboard components
          'dashboard': [
            'recharts',
            'lucide-react'
          ],
          
          // Form handling
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Data management
          'data': ['@tanstack/react-query'],
          
          // Utilities
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns']
        },
        
        // Optimized file naming
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        dead_code: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true
      },
      mangle: {
        safari10: true
      }
    },
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,
    
    // Source maps
    sourcemap: mode === 'production' ? 'hidden' : true,
    
    // Compression reporting
    reportCompressedSize: true
  },
  
  // CSS optimizations
  css: {
    devSourcemap: mode === 'development',
    modules: {
      localsConvention: 'camelCase'
    }
  },
  
  // Dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select'
    ],
    exclude: [
      'recharts' // Load charts on demand
    ]
  },
  
  // Preview server config
  preview: {
    port: 3001,
    host: true,
    strictPort: true
  }
}))